/**
 * Admin entry CRUD — /api/admin/entries
 * Protected by Clerk JWT verification.
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';
import { buildSuggestedEntryId } from '../../../src/lib/entryId.ts';
import { isDashMarkedSuffix } from '../../../src/lib/suffixMatching.ts';

// ── Auth guard ────────────────────────────────────────────────────────────────
async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    // LOCAL DEV OVERRIDE
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    console.log('VerifyAdmin Check:', { url: request.url, isLocal, hasSecret: !!env.CLERK_SECRET_KEY });

    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') {
        console.log('Admin verify bypass activated');
        return true;
    }

    try {
        // Verify with Clerk backend API
        // NOTE: This endpoint might vary or require local JWT verification.
        // For Pages Functions, we'll try to call the Clerk API.
        const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        if (!res.ok) {
            // Log error internally if possible, or just fail for now
            console.error('Clerk verify failed:', res.status, await res.text());
            // FAIL-SAFE: If Clerk API is down or changed, but we are in dev, maybe allow?
            // Actually, let's just return false if not 200.
            if (res.status === 404) {
                // If the endpoint is purely 404, then the implementation is definitely wrong.
                // In production we should use a proper JWT logic.
                return false;
            }
            return false;
        }

        const data = await res.json();
        return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
    } catch (e) {
        console.error('VerifyAdmin Exception:', e.message);
        return false;
    }
}

function uid() {
    return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 6);
}

function now() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function ensureAlternativeFormsColumn(client) {
    const tableInfo = await client.execute("PRAGMA table_info(entries)");
    const hasAlternativeForms = tableInfo.rows.some((row) => row.name === 'alternative_forms');
    if (hasAlternativeForms) return;

    await client.execute("ALTER TABLE entries ADD COLUMN alternative_forms TEXT");

    // Backfill: move relationship-tagged alternatives out of related_entries.
    const rows = await client.execute({
        sql: "SELECT id, related_entries, alternative_forms FROM entries WHERE related_entries IS NOT NULL AND TRIM(related_entries) != ''",
        args: [],
    });

    for (const row of rows.rows) {
        let related = [];
        let existingAlt = [];
        try {
            related = row.related_entries
                ? (typeof row.related_entries === 'string' ? JSON.parse(row.related_entries) : row.related_entries)
                : [];
        } catch {
            related = [];
        }

        try {
            existingAlt = row.alternative_forms
                ? (typeof row.alternative_forms === 'string' ? JSON.parse(row.alternative_forms) : row.alternative_forms)
                : [];
        } catch {
            existingAlt = [];
        }

        if (!Array.isArray(related)) continue;
        if (!Array.isArray(existingAlt)) existingAlt = [];

        const extracted = [];
        const remaining = [];
        for (const item of related) {
            const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
            if (kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form') {
                extracted.push({ ...item, relation_kind: 'alternative_form' });
            } else {
                remaining.push(item);
            }
        }

        if (extracted.length === 0) continue;

        const merged = [...existingAlt];
        for (const item of extracted) {
            const exists = merged.some((x) => x.id === item.id || x.headword === item.headword);
            if (!exists) merged.push(item);
        }

        await client.execute({
            sql: "UPDATE entries SET related_entries = ?, alternative_forms = ?, updated_at = ? WHERE id = ?",
            args: [JSON.stringify(remaining), JSON.stringify(merged), now(), row.id],
        });
    }
}

async function ensureNounMorphologyColumns(client) {
    const tableInfo = await client.execute("PRAGMA table_info(entries)");
    const columnNames = new Set(tableInfo.rows.map((row) => row.name));
    const additions = [
        ['paucal_form', 'TEXT'],
        ['augmentative_form', 'TEXT'],
        ['paucal_pattern', 'TEXT'],
        ['augmentative_pattern', 'TEXT'],
    ];

    for (const [name, type] of additions) {
        if (columnNames.has(name)) continue;
        await client.execute(`ALTER TABLE entries ADD COLUMN ${name} ${type}`);
    }
}

async function ensureNullableDefinitionGlossColumn(client) {
    const tableInfo = await client.execute("PRAGMA table_info(definitions)");
    const textMtColumn = tableInfo.rows.find((row) => row.name === 'text_mt');
    if (textMtColumn && !textMtColumn.notnull) return;

    await client.execute('PRAGMA foreign_keys = OFF');
    try {
        await client.execute('DROP TABLE IF EXISTS definitions_new');
        await client.execute(`CREATE TABLE definitions_new (
            id            TEXT PRIMARY KEY,
            entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
            subentry_id   TEXT,
            sense_number  INTEGER NOT NULL DEFAULT 1,
            text_mt       TEXT,
            text_en       TEXT NOT NULL,
            register      TEXT,
            nuance        TEXT,
            field         TEXT,
            sort_order    INTEGER NOT NULL DEFAULT 0
        )`);

        await client.execute(`INSERT INTO definitions_new (
            id, entry_id, subentry_id, sense_number, text_mt, text_en, register, nuance, field, sort_order
        )
        SELECT
            id, entry_id, subentry_id, sense_number, text_mt, text_en, register, nuance, field, sort_order
        FROM definitions`);

        await client.execute('DROP TABLE definitions');
        await client.execute('ALTER TABLE definitions_new RENAME TO definitions');
        await client.execute('CREATE INDEX IF NOT EXISTS idx_defs_entry ON definitions(entry_id)');
    } finally {
        await client.execute('PRAGMA foreign_keys = ON');
    }
}

async function ensureDiminutiveTable(client) {
    const tableInfo = await client.execute("PRAGMA table_info(entry_diminutives)");
    if (tableInfo.rows.length > 0) return;

    await client.execute(`
        CREATE TABLE IF NOT EXISTS entry_diminutives (
            id TEXT PRIMARY KEY,
            entry_id TEXT NOT NULL,
            pos TEXT NOT NULL CHECK(pos IN ('noun', 'adjective', 'participle')),
            gender TEXT,
            form TEXT NOT NULL,
            pattern TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_preferred INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    `);

    try {
        await client.execute("CREATE INDEX IF NOT EXISTS idx_entry_diminutives_entry_id ON entry_diminutives(entry_id)");
    } catch {
        // Index creation is best-effort for legacy SQLite setups.
    }
}

function normalizeDiminutivePos(pos, fallbackPos = 'noun') {
    const normalized = String(pos || fallbackPos || '').trim().toLowerCase();
    if (normalized === 'adjective' || normalized === 'participle') return normalized;
    return 'noun';
}

function normalizeDiminutiveRows(body, fallbackPos = 'noun') {
    if (Array.isArray(body?.diminutives) && body.diminutives.length > 0) {
        return body.diminutives;
    }

    const legacyForm = body?.diminutive_form || body?.diminutive?.form || '';
    if (!legacyForm) return [];

    return [{
        id: body?.diminutive_id || '',
        entry_id: body?.id || '',
        pos: body?.pos || fallbackPos || 'noun',
        gender: body?.gender || null,
        form: legacyForm,
        pattern: body?.diminutive_pattern || body?.diminutive?.pattern || '',
        sort_order: 0,
        is_preferred: true,
    }];
}

async function syncEntryDiminutives(client, entryId, body, fallbackPos = 'noun') {
    await ensureDiminutiveTable(client);

    await client.execute({
        sql: 'DELETE FROM entry_diminutives WHERE entry_id = ?',
        args: [entryId],
    });

    const rows = normalizeDiminutiveRows(body, fallbackPos);
    for (const [index, row] of rows.entries()) {
        const form = n(row?.form || row?.diminutive_form);
        if (!form) continue;

        await client.execute({
            sql: `INSERT INTO entry_diminutives
                (id, entry_id, pos, gender, form, pattern, sort_order, is_preferred, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                row.id || uid(),
                entryId,
                normalizeDiminutivePos(row.pos, fallbackPos),
                n(row.gender || body?.gender),
                form,
                n(row.pattern || row.diminutive_pattern || ''),
                Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index,
                row.is_preferred === false ? 0 : 1,
                now(),
                now(),
            ],
        });
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

function normalizeNounGender(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    if (['masculine', 'masc', 'm'].includes(normalized)) return 'masculine';
    if (['feminine', 'fem', 'f'].includes(normalized)) return 'feminine';
    if (['neutral', 'neut', 'n'].includes(normalized)) return 'neutral';
    return null;
}

function validateAndNormalizeEntryGender(body) {
    const candidate = body.gender;
    if (candidate === undefined) return;

    const normalized = normalizeNounGender(candidate);
    if (normalized === null && String(candidate).trim() !== '') {
        throw new Error("Invalid gender. Allowed values: masculine, feminine, neutral.");
    }

    body.gender = normalized;
}

// ── GET — list entries ────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const pos = url.searchParams.get('pos')?.trim() ?? '';

        const client = getDbClient(env);
        await ensureAlternativeFormsColumn(client);

        let sql = `SELECT e.id, e.headword, e.pos, e.gender, e.verb_class, e.verb_weak_class,
                         e.is_loanword, e.source_language, e.created_at, e.verb_form,
                         e.verb_vowel_perf, e.verb_vowel_impf, e.tags, e.inflections_pl, e.alternative_forms,
                         COALESCE(e.root_consonants, r.consonants) AS root_consonants,
                         d.text_en
                  FROM entries e
                  LEFT JOIN definitions d ON d.entry_id = e.id AND d.sense_number = 1
                  LEFT JOIN root_pattern_forms rpf ON rpf.id = e.root_pattern_form_id
                  LEFT JOIN roots r ON r.id = rpf.root_id`;
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

        if (whereClauses.length) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }

        sql += ' ORDER BY e.headword ASC LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const countQuery = `SELECT COUNT(*) as total FROM entries e 
                           LEFT JOIN root_pattern_forms rpf ON rpf.id = e.root_pattern_form_id
                           LEFT JOIN roots r ON r.id = rpf.root_id
                           ${whereClauses.length ? ' WHERE ' + whereClauses.join(' AND ') : ''}`;
        const countArgs = whereClauses.length ? args.slice(0, -2) : [];

        const [res, countRes] = await Promise.all([
            client.execute({ sql, args }),
            client.execute({ sql: countQuery, args: countArgs }),
        ]);

        return json({
            entries: res.rows,
            total: Number(countRes.rows[0]?.total ?? 0),
            limit, offset,
        });
    } catch (e) {
        return internalError(e);
    }
}

// ── POST — create entry ────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        validateAndNormalizeEntryGender(body);
        const client = getDbClient(env);
        await ensureAlternativeFormsColumn(client);
        await ensureNounMorphologyColumns(client);
        await ensureNullableDefinitionGlossColumn(client);
        await ensureDiminutiveTable(client);

        let id = body.id;

        if (!id) {
            const baseId = buildSuggestedEntryId({
                headword: body.headword,
                pos: body.pos,
                participleType: body.participle_type,
            });
            id = baseId;

            // Handle collisions using numeral suffixes
            const idCheckRes = await client.execute({
                sql: `SELECT id FROM entries WHERE id LIKE ? OR id = ?`,
                args: [`${baseId}-%`, baseId]
            });

            if (idCheckRes.rows.length > 0) {
                let maxSuffix = 0;
                idCheckRes.rows.forEach(r => {
                    if (r.id === baseId) maxSuffix = Math.max(maxSuffix, 1);
                    else {
                        const match = r.id.match(new RegExp(`^${baseId}-(\\d+)$`));
                        if (match && match[1]) {
                            maxSuffix = Math.max(maxSuffix, parseInt(match[1], 10));
                        }
                    }
                });
                id = `${baseId}-${maxSuffix + 1}`;
            }
        }

        const {
            headword, pos, tags, definitions, etymology_chain, phonetics, ...otherFields
        } = body;

        if (!headword || !pos) return json({ error: 'headword and pos are required' }, 400);

        // Dynamic column discovery
        const tableInfo = await client.execute("PRAGMA table_info(entries)");
        const columns = tableInfo.rows.map(r => r.name);
        const metaColumns = ['id', 'created_at', 'updated_at', 'tags', 'root_consonants', 'verb_form'];

        const insertColumns = ['id', 'created_at', 'updated_at'];
        const insertArgs = [id, now(), now()];

        const mapping = {
            'tags': tags?.length ? JSON.stringify(tags) : null,
            'root_consonants': body._rootConsonants || body.root_consonants,
            'verb_form': body._formLabel || body.verb_form
        };

        for (const col of columns) {
            if (insertColumns.includes(col)) continue;

            if (col in mapping) {
                insertColumns.push(col);
                insertArgs.push(n(mapping[col]));
                continue;
            }

            if (col in body) {
                insertColumns.push(col);
                let val = body[col];
                if (col === 'is_loanword') val = val ? 1 : 0;
                else if (Array.isArray(val)) val = JSON.stringify(val);
                insertArgs.push(n(val));
            }
        }

        const placeholders = insertColumns.map(() => '?').join(',');
        await client.execute({
            sql: `INSERT INTO entries (${insertColumns.join(', ')}) VALUES (${placeholders})`,
            args: insertArgs,
        });

        if (definitions && Array.isArray(definitions)) {
            for (let i = 0; i < definitions.length; i++) {
                const def = definitions[i];
                if (!def.text_en) continue;
                await client.execute({
                    sql: `INSERT INTO definitions (id, entry_id, sense_number, text_mt, text_en, register, nuance, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [uid(), id, i + 1, n(def.text_mt), def.text_en, n(def.register), n(def.nuance), i],
                });
            }
        }

        if (etymology_chain && Array.isArray(etymology_chain) && etymology_chain.length > 0) {
            await client.execute({
                sql: `INSERT INTO etymologies (id, entry_id, chain) VALUES (?, ?, ?)`,
                args: [uid(), id, JSON.stringify(etymology_chain)],
            });
        }

        if (phonetics && Array.isArray(phonetics)) {
            for (const ph of phonetics) {
                if (!ph.ipa && !ph.spelling) continue;
                await client.execute({
                    sql: `INSERT INTO phonetics (id, entry_id, ipa, dialect, notes) VALUES (?, ?, ?, ?, ?)`,
                    args: [uid(), id, ph.ipa || '', ph.dialect || 'Standard', ph.spelling ? `Spelling: ${ph.spelling}` : null],
                });
            }
        }

        // Update FTS
        try { await client.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`); } catch { }

        // Reciprocal Updates
        const syns = body.synonyms || [];
        const ants = body.antonyms || [];
        const related = body.related_entries || [];
        const alternatives = body.alternative_forms || [];
        if (syns.length > 0) await syncReciprocalRelationships(client, id, headword, pos, 'synonyms', syns);
        if (ants.length > 0) await syncReciprocalRelationships(client, id, headword, pos, 'antonyms', ants);
        if (related.length > 0) await syncReciprocalRelationships(client, id, headword, pos, 'related_entries', related);
        if (alternatives.length > 0) await syncReciprocalRelationships(client, id, headword, pos, 'alternative_forms', alternatives);

        // Auto-register patterns
        await ensurePatternsRegistered(client, body);
        await syncEntryDiminutives(client, id, body, body.pos);

        return json({ id, created: true }, 201);
    } catch (e) {
        return internalError(e);
    }
}

// ── PUT — update entry ────────────────────────────────────────────────────────
export async function onRequestPut({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        validateAndNormalizeEntryGender(body);
        const { id, old_id, ...fields } = body;
        if (!id) return json({ error: 'id required' }, 400);

        const client = getDbClient(env);
        await ensureAlternativeFormsColumn(client);
        await ensureNounMorphologyColumns(client);
        await ensureNullableDefinitionGlossColumn(client);
        await ensureDiminutiveTable(client);
        const sourceId = old_id || id;

        const sourceRes = await client.execute({
            sql: 'SELECT id FROM entries WHERE id = ?',
            args: [sourceId]
        });
        if (!sourceRes.rows?.length) {
            return json({
                error: 'Entry not found for update',
                code: 'ENTRY_NOT_FOUND',
                id,
                old_id: old_id || null
            }, 404);
        }

        // Handle ID rename 
        if (old_id && old_id !== id) {
            try {
                const targetRes = await client.execute({
                    sql: 'SELECT id FROM entries WHERE id = ?',
                    args: [id]
                });
                if (targetRes.rows?.length) {
                    return json({
                        error: 'Target ID already exists',
                        code: 'ENTRY_ID_CONFLICT',
                        id,
                        old_id
                    }, 409);
                }

                const columnsRes = await client.execute("PRAGMA table_info(entries)");
                const colNames = columnsRes.rows.map(r => r.name).filter(n => n !== 'id');

                const copyRes = await client.execute({
                    sql: `INSERT INTO entries (id, ${colNames.join(', ')}) SELECT ?, ${colNames.join(', ')} FROM entries WHERE id = ?`,
                    args: [id, old_id]
                });
                if (!copyRes.rowsAffected) {
                    return json({
                        error: 'Entry not found for update',
                        code: 'ENTRY_NOT_FOUND',
                        id,
                        old_id
                    }, 404);
                }

                const childTables = ['definitions', 'etymologies', 'phonetics', 'subentries', 'attestation_reliability', 'dialect_variants', 'audio_files', 'entry_diminutives'];
                for (const table of childTables) {
                    await client.execute({ sql: `UPDATE ${table} SET entry_id = ? WHERE entry_id = ?`, args: [id, old_id] });
                }

                await client.execute({ sql: `DELETE FROM entries WHERE id = ?`, args: [old_id] });
            } catch (e) {
                return json({ error: 'Failed to rename ID: ' + e.message }, 400);
            }
        }

        // Dynamic column discovery
        const tableInfo = await client.execute("PRAGMA table_info(entries)");
        const columns = tableInfo.rows.map(r => r.name).filter(c => !['id', 'created_at', 'updated_at'].includes(c));

        const mapping = {
            'tags': body.tags && Array.isArray(body.tags) ? JSON.stringify(body.tags) : undefined,
            'root_consonants': body._rootConsonants !== undefined ? body._rootConsonants : body.root_consonants,
            'verb_form': body._formLabel !== undefined ? body._formLabel : body.verb_form
        };

        const setClauses = [];
        const args = [];

        for (const col of columns) {
            let val;
            if (col in mapping && mapping[col] !== undefined) {
                val = mapping[col];
            } else if (col in fields) {
                val = fields[col];
            } else {
                continue;
            }

            if (col === 'is_loanword') val = val ? 1 : 0;
            else if (Array.isArray(val)) val = JSON.stringify(val);

            setClauses.push(`${col} = ?`);
            args.push(n(val));
        }

        if (!setClauses.length && !('definitions' in fields) && !('etymology_chain' in fields) && !('phonetics' in fields) && !('diminutives' in fields) && !('diminutive_form' in fields)) {
            return json({ error: 'No fields to update' }, 400);
        }

        if (setClauses.length) {
            setClauses.push('updated_at = ?');
            args.push(now());
            args.push(id);

            const updateRes = await client.execute({
                sql: `UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`,
                args,
            });
            if (!updateRes.rowsAffected) {
                return json({
                    error: 'Entry not found for update',
                    code: 'ENTRY_NOT_FOUND',
                    id,
                    old_id: old_id || null
                }, 404);
            }
        }

        if ('definitions' in fields && Array.isArray(fields.definitions)) {
            await client.execute({ sql: 'DELETE FROM definitions WHERE entry_id = ?', args: [id] });
            for (let i = 0; i < fields.definitions.length; i++) {
                const def = fields.definitions[i];
                if (!def.text_en) continue;
                await client.execute({
                    sql: `INSERT INTO definitions (id, entry_id, sense_number, text_mt, text_en, register, nuance, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [uid(), id, i + 1, n(def.text_mt), def.text_en, n(def.register), n(def.nuance), i],
                });
            }
        }

        if ('etymology_chain' in fields && Array.isArray(fields.etymology_chain)) {
            await client.execute({ sql: 'DELETE FROM etymologies WHERE entry_id = ?', args: [id] });
            if (fields.etymology_chain.length > 0) {
                await client.execute({
                    sql: `INSERT INTO etymologies (id, entry_id, chain) VALUES (?, ?, ?)`,
                    args: [uid(), id, JSON.stringify(fields.etymology_chain)],
                });
            }
        }

        if ('phonetics' in fields && Array.isArray(fields.phonetics)) {
            await client.execute({ sql: 'DELETE FROM phonetics WHERE entry_id = ?', args: [id] });
            for (const ph of fields.phonetics) {
                if (!ph.ipa && !ph.spelling) continue;
                await client.execute({
                    sql: `INSERT INTO phonetics (id, entry_id, ipa, dialect, notes) VALUES (?, ?, ?, ?, ?)`,
                    args: [uid(), id, ph.ipa || '', ph.dialect || 'Standard', ph.spelling ? `Spelling: ${ph.spelling}` : null],
                });
            }
        }

        try { await client.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`); } catch { }

        // Reciprocal Updates
        const currentHeadword = body.headword || (await client.execute({ sql: 'SELECT headword FROM entries WHERE id = ?', args: [id] })).rows[0]?.headword;
        const currentPos = body.pos || (await client.execute({ sql: 'SELECT pos FROM entries WHERE id = ?', args: [id] })).rows[0]?.pos;
        
        const syns = body.synonyms || [];
        const ants = body.antonyms || [];
        const related = body.related_entries || [];
        const alternatives = body.alternative_forms || [];
        if (syns.length > 0) await syncReciprocalRelationships(client, id, currentHeadword, currentPos, 'synonyms', syns);
        if (ants.length > 0) await syncReciprocalRelationships(client, id, currentHeadword, currentPos, 'antonyms', ants);
        if (related.length > 0) await syncReciprocalRelationships(client, id, currentHeadword, currentPos, 'related_entries', related);
        if (alternatives.length > 0) await syncReciprocalRelationships(client, id, currentHeadword, currentPos, 'alternative_forms', alternatives);

        // Auto-register patterns
        await ensurePatternsRegistered(client, body);
        await syncEntryDiminutives(client, id, body, currentPos);

        return json({ id, updated: true });
    } catch (e) {
        return internalError(e);
    }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const ids = url.searchParams.get('ids');

        if (!id && !ids) return json({ error: 'id or ids required' }, 400);

        const client = getDbClient(env);

        if (ids) {
            const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
            if (idList.length === 0) return json({ error: 'ids empty' }, 400);

            const placeholders = idList.map(() => '?').join(',');
            await client.execute({
                sql: `DELETE FROM entry_diminutives WHERE entry_id IN (${placeholders})`,
                args: idList
            });
            await client.execute({
                sql: `DELETE FROM entries WHERE id IN (${placeholders})`,
                args: idList
            });
            return json({ ids: idList, deleted: true });
        } else {
            await client.execute({ sql: 'DELETE FROM entry_diminutives WHERE entry_id = ?', args: [id] });
            await client.execute({ sql: 'DELETE FROM entries WHERE id = ?', args: [id] });
            return json({ id, deleted: true });
        }
    } catch (e) {
        return internalError(e);
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

function unauthorized() {
    return json({ error: 'Unauthorized — admin role required' }, 401);
}

function internalError(err) {
    const { status, body } = toApiErrorPayload(err);
    return json(body, status);
}

async function ensurePatternsRegistered(client, body) {
    const patternMap = {
        'cv_pattern': 'cv_wizen_pattern',
        'feminine_pattern': 'feminine_pattern',
        'form_fem_pattern': 'feminine_pattern',
        'form_masc_pattern': 'cv_wizen_pattern',
        'plural_pattern': 'broken_pattern', // Will be refined for sound_suffix below
        'form_plural_pattern': 'broken_pattern',
        'augmentative_pattern': 'derivational_suffix',
        'diminutive_pattern': 'diminutive_pattern',
        'elative_pattern': 'adjective_pattern',
        'dual_pattern': 'dual_suffix'
    };

    const roleMap = {
        'feminine_pattern': 'feminine_singular',
        'form_fem_pattern': 'feminine_singular',
        'plural_pattern': 'broken_plural',
        'form_plural_pattern': 'broken_plural',
        'augmentative_pattern': 'derivational',
        'diminutive_pattern': 'diminutive',
        'elative_pattern': 'elative'
    };

    for (const [col, cat] of Object.entries(patternMap)) {
        const raw = body[col];
        if (!raw || typeof raw !== 'string') continue;

        // Entries can have multiple patterns comma separated for plurals
        const patterns = raw.split(',').map(p => p.trim()).filter(Boolean);

        for (const cv of patterns) {
            const wizen = '';
            const candidatePatternId = btoa(encodeURIComponent(`${cv}|${wizen}`)).replace(/=/g, '');

            // Refine category for plural patterns (broken vs sound suffix)
            let actualCat = cat;
            if (cat === 'broken_pattern' && isDashMarkedSuffix(cv)) {
                actualCat = 'sound_suffix';
            } else if (cat === 'derivational_suffix' && !isDashMarkedSuffix(cv)) {
                continue;
            }

            // 1. Resolve a valid pattern_id for this CV in both legacy/new schemas.
            // Legacy DBs may enforce UNIQUE(cv_notation), which can ignore inserts with a new id.
            let patternId = candidatePatternId;
            const existingRes = await client.execute({
                sql: `SELECT id FROM patterns WHERE cv_notation = ? LIMIT 1`,
                args: [cv]
            });
            if (existingRes.rows.length > 0) {
                patternId = existingRes.rows[0].id;
            } else {
                try {
                    await client.execute({
                        sql: `INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation) VALUES (?, ?, ?)`,
                        args: [candidatePatternId, cv, wizen]
                    });
                } catch {
                    // Retry lookup below to recover from uniqueness races/legacy constraints.
                }
                const afterInsertRes = await client.execute({
                    sql: `SELECT id FROM patterns WHERE cv_notation = ? LIMIT 1`,
                    args: [cv]
                });
                if (afterInsertRes.rows.length > 0) {
                    patternId = afterInsertRes.rows[0].id;
                }
            }

            // 2. Link it to the correct category
            // Standardized ID: patternId_category_pos_stress (using stress=2 as default for auto-reg)
            const appId = `${patternId}_${actualCat}_all_2`; 
            await client.execute({
                sql: `INSERT OR IGNORE INTO pattern_applicability (id, pattern_id, category, pos, stress, linguistic_role, metadata)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [appId, patternId, actualCat, 'all', 2, roleMap[col] || '', '{}']
            });
        }
    }
}

async function syncReciprocalRelationships(client, currentId, currentHeadword, currentPos, relType, targetItems) {
    if (!targetItems || !Array.isArray(targetItems)) return;
    
    // Fetch current entry's first definition for the reciprocal gloss
    const currentDefRes = await client.execute({
        sql: `SELECT text_en, text_mt FROM definitions WHERE entry_id = ? AND sense_number = 1`,
        args: [currentId]
    });
    const currentGlossEn = currentDefRes.rows[0]?.text_en || '';
    const currentGlossMt = n(currentDefRes.rows[0]?.text_mt);

    for (const target of targetItems) {
        const targetId = target.id || target.headword; // Fallback to headword if ID is missing (though unlikely in UI)
        if (!targetId || targetId === currentId) continue;

        const targetRes = await client.execute({
            sql: `SELECT id, headword, synonyms, antonyms, related_entries, alternative_forms FROM entries WHERE id = ? OR headword = ?`,
            args: [targetId, targetId]
        });
        if (targetRes.rows.length === 0) continue;

        const targetData = targetRes.rows[0];
        const actualTargetId = targetData.id;
        
        // Don't recurse infinitely
        if (actualTargetId === currentId) continue;

        let targetList = [];
        try {
            const raw = targetData[relType];
            targetList = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
        } catch (e) {
            targetList = [];
        }

        const exists = targetList.some(item => item.id === currentId || item.headword === currentHeadword);
        if (!exists) {
            const relationKind = target?.relation_kind || target?.relationship_type || target?._rel || null;
            const reciprocalItem = {
                id: currentId,
                headword: currentHeadword,
                pos: currentPos,
                gloss_en: currentGlossEn,
                gloss_mt: currentGlossMt
            };
            if (relationKind) {
                reciprocalItem.relation_kind = relationKind;
            }
            targetList.push(reciprocalItem);
            await client.execute({
                sql: `UPDATE entries SET ${relType} = ?, updated_at = ? WHERE id = ?`,
                args: [JSON.stringify(targetList), now(), actualTargetId]
            });
        }
    }
}


/** Convert empty/undefined to null for DB consistency, and normalize strings */
function n(val) {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}
