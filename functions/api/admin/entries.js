/**
 * Admin entry CRUD — /api/admin/entries
 * Protected by Clerk JWT verification.
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';
import { buildSuggestedEntryId, getEntryIdFamily, getEntryIdSuffixRegexes, normalizeEntryId, normalizeEntryPos } from '../../../src/lib/entryId.ts';
import { isDashMarkedSuffix } from '../../../src/lib/suffixMatching.ts';
import { buildSourceCitation } from '../../../src/lib/sourceMetadata.ts';
import { hydrateEntryRow, ENTRY_MORPHOLOGY_JOINS, ENTRY_MORPHOLOGY_SELECT } from '../../../src/lib/entryHydration.ts';
import { applyVerbMorphologyCompatibility, ensureVerbMorphologyTable, hasVerbMorphologyInput, syncVerbMorphology } from '../../../src/lib/verbMorphology.ts';
import { applyNounMorphologyCompatibility, ensureNounMorphologyTable, hasNounMorphologyInput, syncNounMorphology } from '../../../src/lib/nounMorphology.ts';
import { ensureAdjMorphologyTable, syncAdjMorphology } from '../../../src/lib/adjMorphology.ts';
import { applyParticipleMorphologyCompatibility, ensureParticipleMorphologyTable, hasParticipleMorphologyInput, syncParticipleMorphology } from '../../../src/lib/participleMorphology.ts';
import { ensureNumeralMorphologyTable, syncNumeralMorphology } from '../../../src/lib/numeralMorphology.ts';
import { ensureRelationshipsTable, syncEntryRelationships } from '../../../src/lib/entryRelationships.ts';
import { ensureTagsTables, syncEntryTags } from '../../../src/lib/entryTags.ts';
import { ensureStemsTable, syncStemMorphology } from '../../../src/lib/stemMorphology.ts';
import { ADJECTIVE_ENTRY_TOP_LEVEL_STRIP_FIELDS } from '../../../src/lib/adminSchema.ts';

// ── Auth guard ────────────────────────────────────────────────────────────────
async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    const url = new URL(request.url);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === '0.0.0.0' || url.hostname.startsWith('192.168.');
    console.log(`[AUTH] Verifying admin. Host: ${url.hostname}, isLocal: ${isLocal}`);
    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') {
        return true;
    }

    try {
        const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        if (!res.ok) return false;
        const data = await res.json();
        return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
    } catch (e) {
        return false;
    }
}

function now() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function uid() {
    return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 6);
}

/** Convert empty/undefined to null for DB consistency, and normalize strings */
function n(val) {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}

// ── CRUD Helpers ─────────────────────────────────────────────────────────────

async function syncAlternativeForms(client, entryId, body) {
    if (!Array.isArray(body.alternative_forms)) return;

    await client.execute({
        sql: "DELETE FROM alternative_forms WHERE entry_id = ?",
        args: [entryId]
    });

    for (let i = 0; i < body.alternative_forms.length; i++) {
        const alt = body.alternative_forms[i];
        if (!alt.headword) continue;

        let rowId = alt.id;
        if (rowId && !rowId.startsWith('alt_')) {
            rowId = `alt_${entryId}::${rowId}`;
        } else if (!rowId) {
            rowId = `alt_${entryId}::${uid()}`;
        }

        await client.execute({
            sql: `INSERT INTO alternative_forms (id, entry_id, headword, type, sort_order)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [rowId, entryId, alt.headword, alt.type || null, i]
        });
    }
}

async function renameEntryReferences(tx, oldId, newId) {
    const tablesToMove = [
        'subentries',
        'attestation_reliability',
        'dialect_variants',
        'entry_diminutives',
    ];
    for (const table of tablesToMove) {
        await tx.execute({
            sql: `UPDATE ${table} SET entry_id = ? WHERE entry_id = ?`,
            args: [newId, oldId]
        });
    }

    const tablesToReplace = [
        'phonetics',
        'alternative_forms',
        'entry_tags',
        'verb_morphology',
        'numeral_morphology',
        'adj_morphology',
        'noun_morphology',
        'participle_morphology',
    ];
    for (const table of tablesToReplace) {
        await tx.execute({
            sql: `DELETE FROM ${table} WHERE entry_id = ?`,
            args: [oldId]
        });
    }

    // Special cases
    await tx.execute({
        sql: "DELETE FROM entry_relationships WHERE entry_id = ?",
        args: [oldId]
    });
    await tx.execute({
        sql: "UPDATE entry_relationships SET target_entry_id = ? WHERE target_entry_id = ?",
        args: [newId, oldId]
    });
}

function normalizeDbBoolean(value) {
    return (value === true || value === 1 || value === '1') ? 1 : 0;
}

function buildEntryWriteRecord(body, entryColumns, entryPos) {
    const normalizedPos = normalizeEntryPos(entryPos || body.pos);
    const record = {};
    const blocklist = (normalizedPos === 'adjective' || normalizedPos === 'participle')
        ? ENTRY_ADJECTIVE_WRITE_BLOCKLIST
        : null;

    for (const col of entryColumns) {
        if (col === 'id' || col === 'created_at' || col === 'updated_at') continue;
        if (!ENTRY_WRITE_FIELD_ALLOWLIST.has(col)) continue;
        if (blocklist?.has(col)) continue;

        let includeCol = false;
        let val = body[col];

        if (col === 'is_loanword' || col === 'is_inflectable') {
            includeCol = true;
            val = normalizeDbBoolean(val);
        } else if (col === 'root_consonants') {
            includeCol = true;
            val = body._rootConsonants || body.root_consonants;
        } else if (Object.prototype.hasOwnProperty.call(body, col)) {
            includeCol = true;
        }

        if (!includeCol) continue;

        if (val && typeof val === 'object') {
            val = JSON.stringify(val);
        }

        record[col] = col === 'is_loanword' || col === 'is_inflectable' ? normalizeDbBoolean(val) : n(val);
    }

    return record;
}

async function upsertEntryRow(tx, body, entryColumns, entryId) {
    const record = buildEntryWriteRecord(body, entryColumns, body.pos);
    const writeColumns = Object.keys(record);
    const insertColumns = ['id', 'created_at', 'updated_at', ...writeColumns];
    const insertPlaceholders = insertColumns.map(() => '?').join(', ');
    const updateColumns = writeColumns.filter((col) => col !== 'id');
    const updateAssignments = updateColumns.map((col) => `${col} = excluded.${col}`);
    const updateSql = updateAssignments.length > 0
        ? `${updateAssignments.join(', ')}, updated_at = excluded.updated_at`
        : 'updated_at = excluded.updated_at';

    await tx.execute({
        sql: `
            INSERT INTO entries (${insertColumns.join(', ')})
            VALUES (${insertPlaceholders})
            ON CONFLICT(id) DO UPDATE SET ${updateSql}
        `,
        args: [entryId, now(), now(), ...writeColumns.map((col) => record[col])]
    });
}

async function persistEntryRecord(client, {
    body,
    entryColumns,
    entryPos,
    entryId,
    previousId = null,
}) {
    const tx = await client.transaction('write');
    try {
        const writeBody = { ...body, id: entryId, pos: entryPos || body.pos };

        await upsertEntryRow(tx, writeBody, entryColumns, entryId);

        if (entryPos === 'verb') await syncVerbMorphology(tx, entryId, writeBody);
        if (entryPos === 'noun' || entryPos === 'pronoun') await syncNounMorphology(tx, entryId, writeBody);
        if (entryPos === 'adjective' || entryPos === 'participle') await syncAdjMorphology(tx, entryId, writeBody);
        if (entryPos === 'participle') await syncParticipleMorphology(tx, entryId, writeBody);
        if (entryPos === 'numeral') await syncNumeralMorphology(tx, entryId, writeBody);

        await syncEntryRelationships(tx, entryId, writeBody);
        await syncEntryTags(tx, entryId, writeBody.tags);
        await syncStemMorphology(tx, writeBody.stem, writeBody);
        await syncAlternativeForms(tx, entryId, writeBody);

        if (Array.isArray(writeBody.phonetics)) {
            await tx.execute({ sql: 'DELETE FROM phonetics WHERE entry_id = ?', args: [entryId] });
            for (const ph of writeBody.phonetics) {
                if (!ph.ipa) continue;
                await tx.execute({
                    sql: `INSERT INTO phonetics (id, entry_id, ipa, dialect, notes) VALUES (?, ?, ?, ?, ?)`,
                    args: [uid(), entryId, ph.ipa, ph.dialect || 'Standard', ph.notes || null],
                });
            }
        }

        if (previousId && previousId !== entryId) {
            await renameEntryReferences(tx, previousId, entryId);
            await tx.execute({ sql: 'DELETE FROM entries WHERE id = ?', args: [previousId] });
        }

        await tx.commit();
        return { id: entryId, renamed: previousId && previousId !== entryId };
    } catch (error) {
        try {
            await tx.rollback();
        } catch {
            // Best effort rollback.
        }
        throw error;
    } finally {
        tx.close?.();
    }
}

const POS_ALIAS_GROUPS = {
    noun: ['noun', 'n'],
    verb: ['verb', 'v'],
    adjective: ['adjective', 'adj'],
    adverb: ['adverb', 'adv'],
    preposition: ['preposition', 'prep'],
    conjunction: ['conjunction', 'conj'],
    particle: ['particle', 'part'],
    article: ['article', 'art', 'det'],
    pronoun: ['pronoun', 'pron'],
    interrogative: ['interrogative', 'int', 'intg'],
    numeral: ['numeral', 'num'],
    interjection: ['interjection', 'intj'],
    participle: ['participle', 'ptcp'],
    verbal_noun: ['verbal_noun', 'verbal noun', 'vn'],
};

const POS_ALIAS_TO_CANONICAL = Object.entries(POS_ALIAS_GROUPS).reduce((acc, [canonical, aliases]) => {
    aliases.forEach((alias) => {
        const key = alias.toLowerCase().replace(/[-\s]+/g, '_').trim();
        acc[key] = canonical;
    });
    return acc;
}, {});

function resolvePosAliases(rawPos) {
    const cleaned = String(rawPos || '').toLowerCase().replace(/[-\s]+/g, '_').trim();
    if (!cleaned) return [];
    const canonical = POS_ALIAS_TO_CANONICAL[cleaned] || cleaned;
    return POS_ALIAS_GROUPS[canonical] || [canonical];
}

const ENTRY_WRITE_FIELD_ALLOWLIST = new Set([
    'headword',
    'pos',
    'gender',
    'root_consonants',
    'stem',
    'is_loanword',
    'source_language',
    'source_id',
    'source_citation',
    'source_title',
    'source_year',
    'source_page',
    'source_publisher',
    'source_display',
    'source_tooltip',
    'etymology_chain',
    'etymology_notes',
    'definitions',
    'usage_examples',
    'verb_class',
    'verb_transitivity',
    'verb_perfective_3sgm',
    'verb_imperfective_3sgm',
    'verb_verbal_noun',
    'verb_vowel_perf',
    'verb_vowel_impf',
    'verb_vowel_impv',
    'verb_active_ptcp',
    'verb_passive_ptcp',
    'verb_form',
    'verb_type',
    'verb_weak_class',
    'elative_form',
    'participle_type',
    'numeral_type',
    'form_attributive_short',
    'form_attributive_long',
    'numeral_ordinal',
    'numeral_adverbial',
    'numeral_fractional',
    'numeral_multiplier',
    'numeral_distributive',
    'cv_pattern',
    'morph_pattern',
    'sound_suffix',
    'zokk_morphology',
    'zokk_class',
    'zokk_is_hybrid',
    'zokk_agentive_suffix',
    'is_inflectable',
]);

const ENTRY_BOOLEAN_FIELDS = new Set(['is_loanword', 'is_inflectable']);
const ENTRY_ADJECTIVE_WRITE_BLOCKLIST = new Set(ADJECTIVE_ENTRY_TOP_LEVEL_STRIP_FIELDS);

// ── GET — list entries ────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const pos = url.searchParams.get('pos')?.trim() ?? '';

        const client = getDbClient(env);

        let sql = `SELECT e.id, e.headword, e.pos, e.is_loanword, e.source_language, e.created_at,
                         COALESCE(e.root_consonants, r.consonants) AS root_consonants,
                         json_extract(e.definitions, '$[0].text_en') AS text_en,
                         ${ENTRY_MORPHOLOGY_SELECT}
                  FROM entries e
                  LEFT JOIN root_pattern_forms rpf ON rpf.id = e.id
                  LEFT JOIN roots r ON r.id = rpf.root_id
                  ${ENTRY_MORPHOLOGY_JOINS}`;
        const args = [];
        const whereClauses = [];

        if (q) {
            whereClauses.push('(e.headword LIKE ? OR e.root_consonants = ? OR r.consonants = ?)');
            args.push(`%${q}%`, q, q);
        }
        if (pos) {
            const aliases = resolvePosAliases(pos);
            if (aliases.length > 0) {
                const placeholders = aliases.map(() => '?').join(', ');
                whereClauses.push(`LOWER(TRIM(e.pos)) IN (${placeholders})`);
                args.push(...aliases);
            }
        }

        if (whereClauses.length) sql += ' WHERE ' + whereClauses.join(' AND ');
        sql += ' ORDER BY e.headword ASC LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const countQuery = `SELECT COUNT(*) as total FROM entries e 
                           LEFT JOIN root_pattern_forms rpf ON rpf.id = e.id
                           LEFT JOIN roots r ON r.id = rpf.root_id
                           ${whereClauses.length ? ' WHERE ' + whereClauses.join(' AND ') : ''}`;
        const countArgs = whereClauses.length ? args.slice(0, -2) : [];

        const [res, countRes] = await Promise.all([
            client.execute({ sql, args }),
            client.execute({ sql: countQuery, args: countArgs }),
        ]);

        const entries = res.rows.map((row) => hydrateEntryRow(row));

        return json({
            entries,
            total: Number(countRes.rows[0]?.total ?? 0),
            limit, offset,
            _REWIRE_TEST: true
        });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

// ── POST — create entry ────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

        const body = await request.json();
        const client = getDbClient(env);

        let id = normalizeEntryId(body.id);
        if (!id) {
            id = buildSuggestedEntryId({
                headword: body.headword,
                pos: body.pos,
            });
        }

        const { headword, pos, tags, definitions, etymology_chain, etymology_notes, phonetics, ...otherFields } = body;
        if (!headword || !pos) return json({ error: 'headword and pos are required' }, 400);

        if (body.etymology_notes && typeof body.etymology_notes !== 'string') {
            body.etymology_notes = String(body.etymology_notes);
        }

        const entryPos = normalizeEntryPos(body.pos);

        // Schema/backfill helpers can issue DDL, which SQLite may auto-commit.
        // Run them before the transactional write block so a later rollback is valid.
        if (entryPos === 'verb') {
            await ensureVerbMorphologyTable(client);
        }
        if (entryPos === 'noun' || entryPos === 'pronoun') {
            await ensureNounMorphologyTable(client);
        }
        if (entryPos === 'adjective' || entryPos === 'participle') {
            await ensureAdjMorphologyTable(client);
        }
        if (entryPos === 'participle') {
            await ensureParticipleMorphologyTable(client);
        }
        if (entryPos === 'numeral') {
            await ensureNumeralMorphologyTable(client);
        }
        await ensureRelationshipsTable(client);
        await ensureTagsTables(client);
        await ensureStemsTable(client);

        const tableInfo = await client.execute("PRAGMA table_info(entries)");
        const columns = (tableInfo.rows || []).map(r => r.name);
        await persistEntryRecord(client, {
            body,
            entryColumns: columns,
            entryPos,
            entryId: id,
        });

        return json({ id, created: true }, 201);
    } catch (e) {
        console.error('API Error [POST]:', e);
        return json({ error: e.message }, 500);
    }
}

// ── PUT — update entry ────────────────────────────────────────────────────────
export async function onRequestPut({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

        const body = await request.json();
        const requestedId = normalizeEntryId(body.id);
        const originalId = normalizeEntryId(body.old_id);
        const id = originalId || requestedId;
        if (!id) return json({ error: 'id required' }, 400);

        const client = getDbClient(env);
        const shouldRename = !!requestedId && requestedId !== id;
        const entryPos = normalizeEntryPos(body.pos);
        const tableInfo = await client.execute("PRAGMA table_info(entries)");
        const columns = (tableInfo.rows || []).map(r => r.name);

        if (shouldRename) {
            const existing = await client.execute({
                sql: 'SELECT 1 FROM entries WHERE id = ? LIMIT 1',
                args: [requestedId],
            });
            if (existing.rows.length > 0) {
                return json({
                    error: 'Entry ID already exists. Choose a different ID or use Duplicate as New.',
                    code: 'ENTRY_ID_ALREADY_EXISTS',
                    current_id: id,
                    requested_id: requestedId,
                }, 409);
            }
        }

        // Schema/backfill helpers can issue DDL, which SQLite may auto-commit.
        // Run them before the transactional write block so a later rollback is valid.
        if (entryPos === 'verb') {
            await ensureVerbMorphologyTable(client);
        }
        if (entryPos === 'noun' || entryPos === 'pronoun') {
            await ensureNounMorphologyTable(client);
        }
        if (entryPos === 'adjective' || entryPos === 'participle') {
            await ensureAdjMorphologyTable(client);
        }
        if (entryPos === 'participle') {
            await ensureParticipleMorphologyTable(client);
        }
        if (entryPos === 'numeral') {
            await ensureNumeralMorphologyTable(client);
        }
        await ensureRelationshipsTable(client);
        await ensureTagsTables(client);
        await ensureStemsTable(client);

        console.log(`[PUT] Starting update for ${id}. Body keys:`, Object.keys(body));
        await persistEntryRecord(client, {
            body,
            entryColumns: columns,
            entryPos,
            entryId: requestedId || id,
            previousId: shouldRename ? id : null,
        });

        console.log(`[PUT] Update completed for ${requestedId || id}`);
        return json({ id: requestedId || id, updated: true, renamed: shouldRename });

    } catch (e) {
        console.error('API Error [PUT]:', e);
        if (e.stack) console.error(e.stack);
        return json({ error: e.message, stack: e.stack }, 500);
    }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const client = getDbClient(env);
        if (id) {
            await client.execute({ sql: 'DELETE FROM entries WHERE id = ?', args: [id] });
            return json({ id, deleted: true });
        }
        return json({ error: 'id required' }, 400);
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
