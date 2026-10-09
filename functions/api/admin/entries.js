/**
 * Admin entry CRUD — /api/admin/entries
 * Protected by Clerk JWT verification.
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';
import { buildSuggestedEntryId, getEntryIdFamily, getEntryIdSuffixRegexes, normalizeEntryId, normalizeEntryPos } from '../../../src/lib/entryId.ts';
import { isDashMarkedSuffix } from '../../../src/lib/suffixMatching.ts';
import { buildSourceCitation } from '../../../src/lib/sourceMetadata.ts';
import { logAdminRequest } from '../../lib/adminLogger.js';
import { invalidateEntryCache } from '../entry/[id].js';
import { applyVerbMorphologyCompatibility, ensureVerbMorphologyTable, hasVerbMorphologyInput, syncVerbMorphology } from '../../../src/lib/verbMorphology.ts';
import { applyNounMorphologyCompatibility, ensureNounMorphologyTable, hasNounMorphologyInput, syncNounMorphology } from '../../../src/lib/nounMorphology.ts';
import { ensureAdjMorphologyTable, syncAdjMorphology } from '../../../src/lib/adjMorphology.ts';
import { applyParticipleMorphologyCompatibility, ensureParticipleMorphologyTable, hasParticipleMorphologyInput, syncParticipleMorphology } from '../../../src/lib/participleMorphology.ts';
import { ensureNumeralMorphologyTable, syncNumeralMorphology } from '../../../src/lib/numeralMorphology.ts';
import { ensureRelationshipsTable, syncEntryRelationships, syncReciprocalNumeralRelatedRelationships } from '../../../src/lib/entryRelationships.ts';
import { ensureTagsTables, syncEntryTags } from '../../../src/lib/entryTags.ts';
import { ensureStemsTable, syncStemMorphology } from '../../../src/lib/stemMorphology.ts';
import { ADJECTIVE_ENTRY_TOP_LEVEL_STRIP_FIELDS } from '../../../src/lib/adminSchema.ts';

// ── Auth guard ────────────────────────────────────────────────────────────────
export async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    const url = new URL(request.url);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === '0.0.0.0' || url.hostname.startsWith('192.168.');
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

    // ── 1. Remove old forward rows for this entry ──────────────────────────
    await client.execute({
        sql: "DELETE FROM alternative_forms WHERE entry_id = ?",
        args: [entryId]
    });

    // ── 2. Remove stale reciprocal rows that pointed BACK at entryId ──────
    await client.execute({
        sql: "DELETE FROM alternative_forms WHERE target_entry_id = ?",
        args: [entryId]
    });
    // Backward compatibility for legacy reciprocal IDs
    await client.execute({
        sql: "DELETE FROM alternative_forms WHERE id LIKE ?",
        args: [`alt_%::${entryId}`]
    });

    const currentHeadwordRes = await client.execute({
        sql: "SELECT headword FROM entries WHERE id = ?",
        args: [entryId]
    });
    const currentHeadword = currentHeadwordRes.rows[0]?.headword || '';

    for (let i = 0; i < body.alternative_forms.length; i++) {
        const item = body.alternative_forms[i];
        if (!item) continue;

        const isObj = typeof item === 'object';
        const headword = String(isObj ? (item.headword || '') : item).trim();
        if (!headword) continue;

        const type = isObj ? (item.type || 'orthographic') : 'orthographic';
        const notes = isObj && item.notes ? String(item.notes).trim() : null;
        let targetEntryId = isObj ? (item.target_entry_id || null) : null;

        // If targetEntryId was not explicitly set, but item.id was a valid entry ID (and not an alt_* ID)
        if (!targetEntryId && isObj && item.has_lemma_entry && item.id && !item.id.startsWith('alt_')) {
            targetEntryId = String(item.id).trim();
        }

        // Verify targetEntryId if specified
        if (targetEntryId) {
            const check = await client.execute({
                sql: "SELECT id FROM entries WHERE id = ?",
                args: [targetEntryId]
            });
            if (check.rows.length === 0) {
                targetEntryId = null;
            }
        }

        // ── Forward row (entryId → alt) ──────────────────────────────────
        let rowId = isObj && item.id && String(item.id).startsWith(`alt_${entryId}::`)
            ? item.id
            : `alt_${entryId}::${targetEntryId || uid()}`;

        await client.execute({
            sql: `INSERT INTO alternative_forms (id, entry_id, headword, type, notes, target_entry_id, sort_order)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET headword = excluded.headword, type = excluded.type, notes = excluded.notes, target_entry_id = excluded.target_entry_id, sort_order = excluded.sort_order`,
            args: [rowId, entryId, headword, type, notes, targetEntryId, i]
        });

        // ── Reciprocal row: only if targetEntryId is a distinct real entry ─
        if (targetEntryId && targetEntryId !== entryId && currentHeadword) {
            const reciprocalId = `alt_${targetEntryId}::${entryId}`;
            await client.execute({
                sql: `INSERT INTO alternative_forms (id, entry_id, headword, type, notes, target_entry_id, sort_order)
                      VALUES (?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET headword = excluded.headword, type = excluded.type, notes = excluded.notes, target_entry_id = excluded.target_entry_id`,
                args: [reciprocalId, targetEntryId, currentHeadword, type, notes, entryId, 0]
            });
        }
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
    if (value === true || value === 1) return 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return ['1', 'true', 'yes', 'on'].includes(normalized) ? 1 : 0;
    }
    return 0;
}

function readInflectableFlag(body) {
    if (Object.prototype.hasOwnProperty.call(body, 'has_inflection')) return body.has_inflection;
    return body.is_inflectable;
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
            val = normalizeDbBoolean(col === 'is_inflectable' ? readInflectableFlag(body) : val);
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
        const normalizedEntryPos = normalizeEntryPos(entryPos || body.pos);
        const writeBody = { ...body, id: entryId, pos: normalizedEntryPos };

        if (body.arabic !== undefined) {
            const arabicVal = typeof body.arabic === 'string' ? body.arabic.trim() : '';
            let currentChain = [];
            if (body.etymology_chain) {
                try {
                    currentChain = typeof body.etymology_chain === 'string' ? JSON.parse(body.etymology_chain) : body.etymology_chain;
                    if (!Array.isArray(currentChain)) currentChain = [];
                } catch {
                    currentChain = [];
                }
            } else {
                const existing = await tx.execute({
                    sql: 'SELECT etymology_chain FROM entries WHERE id = ?',
                    args: [entryId],
                });
                if (existing.rows[0]?.etymology_chain) {
                    try {
                        currentChain = JSON.parse(existing.rows[0].etymology_chain);
                        if (!Array.isArray(currentChain)) currentChain = [];
                    } catch {
                        currentChain = [];
                    }
                }
            }

            const arabicIdx = currentChain.findIndex(
                (step) => step && (String(step.language || '').trim().toLowerCase() === 'arabic' || /[\u0600-\u06FF]/.test(step.term || ''))
            );

            if (arabicVal) {
                if (arabicIdx >= 0) {
                    currentChain[arabicIdx] = {
                        ...currentChain[arabicIdx],
                        language: 'Arabic',
                        term: arabicVal,
                    };
                } else {
                    currentChain.push({
                        relationship: 'From',
                        language: 'Arabic',
                        term: arabicVal,
                        definition: '',
                    });
                }
            } else if (arabicIdx >= 0) {
                currentChain.splice(arabicIdx, 1);
            }

            writeBody.etymology_chain = currentChain;
        }

        await upsertEntryRow(tx, writeBody, entryColumns, entryId);

        if (normalizedEntryPos === 'verb') await syncVerbMorphology(tx, entryId, writeBody);
        if (normalizedEntryPos === 'noun' || normalizedEntryPos === 'pronoun' || normalizedEntryPos === 'preposition') await syncNounMorphology(tx, entryId, writeBody);
        if (normalizedEntryPos === 'adjective' || normalizedEntryPos === 'participle') await syncAdjMorphology(tx, entryId, writeBody);
        if (normalizedEntryPos === 'participle') await syncParticipleMorphology(tx, entryId, writeBody);
        if (normalizedEntryPos === 'numeral') await syncNumeralMorphology(tx, entryId, writeBody);

        await syncEntryRelationships(tx, entryId, writeBody);
        await syncReciprocalNumeralRelatedRelationships(tx, entryId, writeBody);
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
export function buildLetterWhereClause(letter) {
    if (!letter || letter.toLowerCase() === 'all') return null;
    const target = letter.toLowerCase();
    const cleanExpr = "LTRIM(e.headword, '*''\"- ')";

    if (target === 'għ' || target === 'gh') {
        return {
            clause: `(${cleanExpr} LIKE 'għ%' OR ${cleanExpr} LIKE 'Għ%' OR ${cleanExpr} LIKE 'GĦ%' OR ${cleanExpr} LIKE 'gh%' OR ${cleanExpr} LIKE 'Gh%' OR ${cleanExpr} LIKE 'GH%')`,
            args: []
        };
    }
    if (target === 'ie') {
        return {
            clause: `(${cleanExpr} LIKE 'ie%' OR ${cleanExpr} LIKE 'Ie%' OR ${cleanExpr} LIKE 'IE%')`,
            args: []
        };
    }
    if (target === 'g') {
        return {
            clause: `((${cleanExpr} LIKE 'g%' OR ${cleanExpr} LIKE 'G%') AND NOT (${cleanExpr} LIKE 'għ%' OR ${cleanExpr} LIKE 'Għ%' OR ${cleanExpr} LIKE 'GĦ%' OR ${cleanExpr} LIKE 'gh%' OR ${cleanExpr} LIKE 'Gh%' OR ${cleanExpr} LIKE 'GH%') AND NOT (${cleanExpr} LIKE 'ġ%' OR ${cleanExpr} LIKE 'Ġ%'))`,
            args: []
        };
    }
    if (target === 'ġ') {
        return {
            clause: `(${cleanExpr} LIKE 'ġ%' OR ${cleanExpr} LIKE 'Ġ%')`,
            args: []
        };
    }
    if (target === 'i') {
        return {
            clause: `((${cleanExpr} LIKE 'i%' OR ${cleanExpr} LIKE 'I%' OR ${cleanExpr} LIKE 'ì%' OR ${cleanExpr} LIKE 'í%' OR ${cleanExpr} LIKE 'î%') AND NOT (${cleanExpr} LIKE 'ie%' OR ${cleanExpr} LIKE 'Ie%' OR ${cleanExpr} LIKE 'IE%'))`,
            args: []
        };
    }
    if (target === 'h') {
        return {
            clause: `((${cleanExpr} LIKE 'h%' OR ${cleanExpr} LIKE 'H%') AND NOT (${cleanExpr} LIKE 'ħ%' OR ${cleanExpr} LIKE 'Ħ%'))`,
            args: []
        };
    }
    if (target === 'ħ') {
        return {
            clause: `(${cleanExpr} LIKE 'ħ%' OR ${cleanExpr} LIKE 'Ħ%')`,
            args: []
        };
    }
    if (target === 'ż') {
        return {
            clause: `(${cleanExpr} LIKE 'ż%' OR ${cleanExpr} LIKE 'Ż%')`,
            args: []
        };
    }
    if (target === 'z') {
        return {
            clause: `((${cleanExpr} LIKE 'z%' OR ${cleanExpr} LIKE 'Z%') AND NOT (${cleanExpr} LIKE 'ż%' OR ${cleanExpr} LIKE 'Ż%'))`,
            args: []
        };
    }
    if (target === 'ċ' || target === 'c') {
        return {
            clause: `(${cleanExpr} LIKE 'ċ%' OR ${cleanExpr} LIKE 'Ċ%' OR ${cleanExpr} LIKE 'c%' OR ${cleanExpr} LIKE 'C%')`,
            args: []
        };
    }
    if (target === 'a') {
        return {
            clause: `(${cleanExpr} LIKE 'a%' OR ${cleanExpr} LIKE 'A%' OR ${cleanExpr} LIKE 'à%' OR ${cleanExpr} LIKE 'á%' OR ${cleanExpr} LIKE 'â%')`,
            args: []
        };
    }
    if (target === 'e') {
        return {
            clause: `(${cleanExpr} LIKE 'e%' OR ${cleanExpr} LIKE 'E%' OR ${cleanExpr} LIKE 'è%' OR ${cleanExpr} LIKE 'é%' OR ${cleanExpr} LIKE 'ê%')`,
            args: []
        };
    }
    if (target === 'o') {
        return {
            clause: `(${cleanExpr} LIKE 'o%' OR ${cleanExpr} LIKE 'O%' OR ${cleanExpr} LIKE 'ò%' OR ${cleanExpr} LIKE 'ó%' OR ${cleanExpr} LIKE 'ô%')`,
            args: []
        };
    }
    if (target === 'u') {
        return {
            clause: `(${cleanExpr} LIKE 'u%' OR ${cleanExpr} LIKE 'U%' OR ${cleanExpr} LIKE 'ù%' OR ${cleanExpr} LIKE 'ú%' OR ${cleanExpr} LIKE 'û%')`,
            args: []
        };
    }

    return {
        clause: `(${cleanExpr} LIKE ? OR ${cleanExpr} LIKE ?)`,
        args: [`${target.toLowerCase()}%`, `${target.toUpperCase()}%`]
    };
}

export function buildAdminListQuery({ q = '', pos = '', letter = '', limit = 50, offset = 0 } = {}) {
    let sql = `SELECT 
        e.id, 
        e.headword, 
        e.pos, 
        e.gender,
        e.is_loanword, 
        e.source_language, 
        e.created_at,
        e.root_consonants,
        e.stem,
        e.etymology_chain,
        e.definitions,
        json_extract(e.definitions, '$[0].text_en') AS text_en,
        COALESCE(
            json_extract(e.definitions, '$[0].text_mt'),
            json_extract(e.definitions, '$[1].text_mt'),
            json_extract(e.definitions, '$[2].text_mt')
        ) AS text_mt,
        vm.form AS verb_form,
        vm.class AS verb_class,
        vm.transitivity AS verb_transitivity,
        COALESCE((
            SELECT json_group_array(json_object('id', a.id, 'headword', a.headword, 'type', a.type))
            FROM alternative_forms a
            WHERE a.entry_id = e.id
        ), '[]') AS alternative_forms,
        COALESCE((
            SELECT json_group_array(t.name)
            FROM entry_tags et
            JOIN tags t ON et.tag_id = t.id
            WHERE et.entry_id = e.id
        ), '[]') AS tags
    FROM entries e
    LEFT JOIN verb_morphology vm ON vm.entry_id = e.id`;

    const args = [];
    const whereClauses = [];

    if (q) {
        whereClauses.push('(e.headword LIKE ? OR e.root_consonants = ?)');
        args.push(`%${q}%`, q);
    }
    if (letter) {
        const letterClause = buildLetterWhereClause(letter);
        if (letterClause) {
            whereClauses.push(letterClause.clause);
            args.push(...letterClause.args);
        }
    }
    if (pos) {
        const aliases = resolvePosAliases(pos);
        if (aliases.length > 0) {
            const placeholders = aliases.map(() => '?').join(', ');
            whereClauses.push(`LOWER(TRIM(e.pos)) IN (${placeholders})`);
            args.push(...aliases);
        }
    }

    if (whereClauses.length) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }
    sql += ' ORDER BY e.headword ASC LIMIT ? OFFSET ?';
    args.push(limit, offset);

    return { sql, args };
}

export function buildAdminCountQuery({ q = '', pos = '', letter = '' } = {}) {
    let sql = 'SELECT COUNT(*) as total FROM entries e';
    const args = [];
    const whereClauses = [];

    if (q) {
        whereClauses.push('(e.headword LIKE ? OR e.root_consonants = ?)');
        args.push(`%${q}%`, q);
    }
    if (letter) {
        const letterClause = buildLetterWhereClause(letter);
        if (letterClause) {
            whereClauses.push(letterClause.clause);
            args.push(...letterClause.args);
        }
    }
    if (pos) {
        const aliases = resolvePosAliases(pos);
        if (aliases.length > 0) {
            const placeholders = aliases.map(() => '?').join(', ');
            whereClauses.push(`LOWER(TRIM(e.pos)) IN (${placeholders})`);
            args.push(...aliases);
        }
    }

    if (whereClauses.length) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    return { sql, args };
}

// ── GET — list entries ────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    const startTime = performance.now();
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 100);
        const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const pos = url.searchParams.get('pos')?.trim() ?? '';
        const letter = url.searchParams.get('letter')?.trim() ?? '';
        const skipCount = url.searchParams.get('skipCount') === 'true' || url.searchParams.get('skip_count') === 'true';

        const client = getDbClient(env);

        const listQuery = buildAdminListQuery({ q, pos, letter, limit, offset });
        const countQuery = buildAdminCountQuery({ q, pos, letter });

        const queries = [client.execute(listQuery)];
        if (!skipCount) {
            queries.push(client.execute(countQuery));
        }

        const [res, countRes] = await Promise.all(queries);

        const entries = res.rows.map((row) => {
            let tags = [];
            if (row.tags) {
                try {
                    tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
                } catch {
                    tags = [];
                }
            }
            let alternative_forms = [];
            if (row.alternative_forms) {
                try {
                    alternative_forms = typeof row.alternative_forms === 'string' ? JSON.parse(row.alternative_forms) : row.alternative_forms;
                } catch {
                    alternative_forms = [];
                }
            }

            let etymology_chain = [];
            if (row.etymology_chain) {
                try {
                    etymology_chain = typeof row.etymology_chain === 'string' ? JSON.parse(row.etymology_chain) : row.etymology_chain;
                    if (!Array.isArray(etymology_chain)) etymology_chain = [];
                } catch {
                    etymology_chain = [];
                }
            }
            const arabicStep = Array.isArray(etymology_chain)
                ? etymology_chain.find((step) => step && (String(step.language || '').trim().toLowerCase() === 'arabic' || /[\u0600-\u06FF]/.test(step.term || '')))
                : null;
            const arabic = arabicStep?.term || undefined;

            let text_mt = row.text_mt || undefined;
            if (!text_mt && row.definitions) {
                try {
                    const defs = typeof row.definitions === 'string' ? JSON.parse(row.definitions) : row.definitions;
                    if (Array.isArray(defs)) {
                        const firstWithMt = defs.find((d) => d && (d.text_mt || d.definition_mt || d.gloss_mt || d.mt));
                        if (firstWithMt) {
                            text_mt = firstWithMt.text_mt || firstWithMt.definition_mt || firstWithMt.gloss_mt || firstWithMt.mt || undefined;
                        }
                    }
                } catch {
                    // Ignore JSON parse error
                }
            }

            return {
                id: row.id,
                headword: row.headword,
                pos: row.pos,
                gender: row.gender || undefined,
                is_loanword: Boolean(row.is_loanword),
                source_language: row.source_language || undefined,
                created_at: row.created_at,
                root_consonants: row.root_consonants || undefined,
                stem: row.stem || undefined,
                arabic,
                etymology_chain,
                text_en: row.text_en || undefined,
                text_mt,
                verb_form: row.verb_form || undefined,
                verb_class: row.verb_class || undefined,
                verb_transitivity: row.verb_transitivity || undefined,
                verb_morphology: (row.verb_class || row.verb_form) ? {
                    verb_class: row.verb_class,
                    form: row.verb_form,
                    transitivity: row.verb_transitivity,
                } : undefined,
                tags,
                alternative_forms,
            };
        });

        const total = countRes ? Number(countRes.rows[0]?.total ?? 0) : undefined;
        const durationMs = performance.now() - startTime;

        logAdminRequest({
            endpoint: '/api/admin/entries',
            method: 'GET',
            params: { q: q || undefined, pos: pos || undefined, letter: letter || undefined, limit, offset },
            durationMs,
            rowsCount: entries.length,
            total: total ?? null,
        });

        const headers = {
            'Server-Timing': `db;dur=${durationMs.toFixed(1)}`,
            'X-Execution-Time-Ms': durationMs.toFixed(1),
            'X-Rows-Count': String(entries.length),
        };

        return json({
            entries,
            total: total ?? 0,
            limit,
            offset,
            _REWIRE_TEST: true
        }, 200, headers);
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
        if (entryPos === 'noun' || entryPos === 'pronoun' || entryPos === 'preposition') {
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

        invalidateEntryCache(id);

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
        if (entryPos === 'noun' || entryPos === 'pronoun' || entryPos === 'preposition') {
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

        await persistEntryRecord(client, {
            body,
            entryColumns: columns,
            entryPos,
            entryId: requestedId || id,
            previousId: shouldRename ? id : null,
        });

        invalidateEntryCache(requestedId || id);
        if (shouldRename) invalidateEntryCache(id);

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

function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            ...extraHeaders,
        },
    });
}

// ── Batch Import / Upsert Helper ──────────────────────────────────────────────
export async function processEntryBatch(client, { entries = [], skipExisting = false } = {}) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return { ok: true, total: 0, inserted: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
    }

    // Ensure dependent tables once per batch
    await ensureVerbMorphologyTable(client);
    await ensureNounMorphologyTable(client);
    await ensureAdjMorphologyTable(client);
    await ensureParticipleMorphologyTable(client);
    await ensureNumeralMorphologyTable(client);
    await ensureRelationshipsTable(client);
    await ensureTagsTables(client);
    await ensureStemsTable(client);

    const tableInfo = await client.execute("PRAGMA table_info(entries)");
    const columns = (tableInfo.rows || []).map(r => r.name);

    // Collect candidate IDs and candidate headwords for single-query prefetch
    const candidateIds = entries.map(e => normalizeEntryId(e.id)).filter(Boolean);
    const candidateHeadwords = Array.from(new Set(entries.map(e => e.headword).filter(Boolean)));

    const existingById = new Map();
    const existingByHeadwordPos = new Map();

    if (candidateIds.length > 0 || candidateHeadwords.length > 0) {
        const whereClauses = [];
        const queryArgs = [];

        if (candidateIds.length > 0) {
            const placeholders = candidateIds.map(() => '?').join(', ');
            whereClauses.push(`id IN (${placeholders})`);
            queryArgs.push(...candidateIds);
        }

        if (candidateHeadwords.length > 0) {
            const placeholders = candidateHeadwords.map(() => '?').join(', ');
            whereClauses.push(`headword IN (${placeholders})`);
            queryArgs.push(...candidateHeadwords);
        }

        const findSql = `SELECT id, headword, pos FROM entries WHERE ${whereClauses.join(' OR ')}`;
        const existingRes = await client.execute({ sql: findSql, args: queryArgs });

        for (const row of (existingRes.rows || [])) {
            if (row.id) {
                existingById.set(row.id, row.id);
            }
            if (row.headword && row.pos) {
                const key = `${String(row.headword).toLowerCase().trim()}::${normalizeEntryPos(row.pos)}`;
                existingByHeadwordPos.set(key, row.id);
            }
        }
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];
    const details = [];

    for (let i = 0; i < entries.length; i++) {
        const body = entries[i];
        if (!body || !body.headword || !body.pos) {
            failed++;
            errors.push({ index: i, headword: body?.headword || '(unknown)', error: 'Missing headword or pos' });
            continue;
        }

        const normalizedPos = normalizeEntryPos(body.pos);
        const headwordKey = `${String(body.headword).toLowerCase().trim()}::${normalizedPos}`;
        const inputId = normalizeEntryId(body.id);

        const existingId = (inputId && existingById.get(inputId)) || existingByHeadwordPos.get(headwordKey) || null;

        if (existingId) {
            if (skipExisting) {
                skipped++;
                details.push({ id: existingId, headword: body.headword, pos: normalizedPos, action: 'skipped' });
                continue;
            }

            try {
                await persistEntryRecord(client, {
                    body,
                    entryColumns: columns,
                    entryPos: normalizedPos,
                    entryId: existingId,
                });
                invalidateEntryCache(existingId);
                updated++;
                details.push({ id: existingId, headword: body.headword, pos: normalizedPos, action: 'updated' });
            } catch (err) {
                failed++;
                errors.push({ index: i, headword: body.headword, error: err.message });
            }
        } else {
            const newId = inputId || buildSuggestedEntryId({ headword: body.headword, pos: normalizedPos });
            try {
                await persistEntryRecord(client, {
                    body,
                    entryColumns: columns,
                    entryPos: normalizedPos,
                    entryId: newId,
                });
                invalidateEntryCache(newId);
                inserted++;
                // Track newly inserted entry in memory map so duplicate records inside the same batch match properly
                existingById.set(newId, newId);
                existingByHeadwordPos.set(headwordKey, newId);
                details.push({ id: newId, headword: body.headword, pos: normalizedPos, action: 'inserted' });
            } catch (err) {
                failed++;
                errors.push({ index: i, headword: body.headword, error: err.message });
            }
        }
    }

    return {
        ok: true,
        total: entries.length,
        inserted,
        updated,
        skipped,
        failed,
        errors,
        details,
    };
}
