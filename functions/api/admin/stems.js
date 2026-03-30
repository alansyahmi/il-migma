/**
 * Admin stems CRUD — /api/admin/stems
 * Canonical source: stems table.
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

const now = () => new Date().toISOString();

async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') return true;

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
    } catch {
        return false;
    }
}

function n(val) {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}

function asJsonArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
        } catch { }
    }
    return [];
}

function asJsonObject(val) {
    if (val && typeof val === 'object' && !Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch { }
    }
    return {};
}

function pickString(source, keys) {
    for (const key of keys) {
        const value = source?.[key];
        if (value === undefined || value === null) continue;
        const normalized = String(value).trim();
        if (normalized) return normalized;
    }
    return '';
}

function normalizeStemEtymologyStepValue(ety) {
    const fallback = {
        relationship: 'From',
        language: '',
        term: '',
        definition: '',
    };

    if (!ety) return fallback;

    try {
        const parsed = typeof ety === 'string' ? JSON.parse(ety) : ety;

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return {
                relationship: pickString(parsed, ['relationship', 'relation', 'type']) || 'From',
                language: pickString(parsed, ['language', 'source_language', 'sourceLanguage', 'origin_language', 'originLanguage']),
                term: pickString(parsed, ['term', 'form', 'word', 'source_term', 'sourceTerm', 'source_form', 'sourceForm']),
                definition: pickString(parsed, ['definition', 'meaning', 'gloss', 'translation', 'text']),
            };
        }

        return { ...fallback, definition: String(parsed) };
    } catch {
        return { ...fallback, definition: String(ety) };
    }
}

export function normalizeStemEtymologyValue(ety) {
    try {
        const parsed = typeof ety === 'string' ? JSON.parse(ety) : ety;
        if (Array.isArray(parsed)) {
            return parsed.map((step) => normalizeStemEtymologyStepValue(step));
        }
        return [normalizeStemEtymologyStepValue(parsed)];
    } catch {
        return [normalizeStemEtymologyStepValue(ety)];
    }
}

function sanitizeStemRelationshipItems(items = []) {
    return items
        .map((it) => {
            const raw = String(it?.id || it?.headword || '').trim().normalize('NFC');
            if (!raw) return null;
            return {
                id: raw,
                headword: String(it?.headword || raw).trim().normalize('NFC'),
                gloss_en: String(it?.gloss_en || ''),
                gloss_mt: String(it?.gloss_mt || ''),
                pos: 'STEM',
            };
        })
        .filter(Boolean);
}

async function getStemEntryStats(client, stemString) {
    const res = await client.execute({
        sql: `
            SELECT id
            FROM entries
            WHERE is_loanword = 1
              AND zokk_morphology IS NOT NULL
              AND json_valid(zokk_morphology) = 1
              AND json_extract(zokk_morphology, '$.stem_string') = ?
        `,
        args: [stemString],
    });
    return {
        entry_count: res.rows.length,
        entry_ids: res.rows.map((r) => String(r.id)),
    };
}

async function upsertStem(client, payload, { oldStemString = null, force = false } = {}) {
    const targetStemString = String(payload.stem_string || '').trim().normalize('NFC');
    if (!targetStemString) throw new Error('stem_string required');

    const sourceStemString = oldStemString ? String(oldStemString).trim().normalize('NFC') : targetStemString;
    const creating = !oldStemString;

    const existingRes = await client.execute({
        sql: 'SELECT stem_string FROM stems WHERE stem_string = ?',
        args: [targetStemString],
    });

    let finalStemString = targetStemString;
    if (creating && existingRes.rows.length > 0) {
        if (!force) {
            const dup = new Error('DUPLICATE_STEM');
            dup.code = 'DUPLICATE_STEM';
            throw dup;
        }
        let suffix = 2;
        while (true) {
            const candidate = `${targetStemString}-${suffix}`;
            const chk = await client.execute({ sql: 'SELECT stem_string FROM stems WHERE stem_string = ?', args: [candidate] });
            if (chk.rows.length === 0) {
                finalStemString = candidate;
                break;
            }
            suffix += 1;
        }
    }

    const row = {
        stem_string: finalStemString,
        class_type: payload.class_type === 'ir' ? 'ir' : 'ar',
        is_hybrid: payload.is_hybrid ? 1 : 0,
        root: n(payload.root),
        agentive_suffix: n(payload.agentive_suffix),
        tags: JSON.stringify(asJsonArray(payload.tags)),
        source: n(payload.source),
        glosses: JSON.stringify(asJsonArray(payload.glosses)),
        etymology: JSON.stringify(normalizeStemEtymologyValue(payload.etymology)),
        synonyms: JSON.stringify(sanitizeStemRelationshipItems(asJsonArray(payload.synonyms))),
        antonyms: JSON.stringify(sanitizeStemRelationshipItems(asJsonArray(payload.antonyms))),
        related_stems: JSON.stringify(sanitizeStemRelationshipItems(asJsonArray(payload.related_stems))),
    };

    if (creating) {
        await client.execute({
            sql: `
                INSERT INTO stems (
                    stem_string, class_type, is_hybrid, root, agentive_suffix,
                    tags, source, glosses, etymology, synonyms, antonyms, related_stems,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                row.stem_string, row.class_type, row.is_hybrid, row.root, row.agentive_suffix,
                row.tags, row.source, row.glosses, row.etymology, row.synonyms, row.antonyms, row.related_stems,
                now(), now(),
            ],
        });
        return finalStemString;
    }

    await client.execute({
        sql: `
            UPDATE stems
            SET stem_string = ?, class_type = ?, is_hybrid = ?, root = ?, agentive_suffix = ?,
                tags = ?, source = ?, glosses = ?, etymology = ?, synonyms = ?, antonyms = ?, related_stems = ?,
                updated_at = ?
            WHERE stem_string = ?
        `,
        args: [
            row.stem_string, row.class_type, row.is_hybrid, row.root, row.agentive_suffix,
            row.tags, row.source, row.glosses, row.etymology, row.synonyms, row.antonyms, row.related_stems,
            now(), sourceStemString,
        ],
    });

    if (sourceStemString !== finalStemString) {
        await client.execute({
            sql: `
                UPDATE entries
                SET zokk_morphology = json_set(
                    COALESCE(zokk_morphology, '{}'),
                    '$.stem_string', ?,
                    '$.class_type', ?,
                    '$.is_hybrid', ?,
                    '$.root', json(?),
                    '$.agentive_suffix', json(?)
                ),
                updated_at = ?
                WHERE is_loanword = 1
                  AND zokk_morphology IS NOT NULL
                  AND json_valid(zokk_morphology) = 1
                  AND json_extract(zokk_morphology, '$.stem_string') = ?
            `,
            args: [
                finalStemString,
                row.class_type,
                row.is_hybrid,
                JSON.stringify(row.root),
                JSON.stringify(row.agentive_suffix),
                now(),
                sourceStemString,
            ],
        });

        const allStems = await client.execute({
            sql: 'SELECT stem_string, synonyms, antonyms, related_stems FROM stems',
            args: [],
        });

        for (const s of allStems.rows) {
            let dirty = false;
            const patchField = (field) => {
                const arr = asJsonArray(s[field]);
                const next = arr.map((item) => {
                    if (!item || typeof item !== 'object') return item;
                    const oldId = String(item.id || item.headword || '');
                    if (oldId !== sourceStemString) return item;
                    dirty = true;
                    return {
                        ...item,
                        id: finalStemString,
                        headword: finalStemString,
                    };
                });
                return JSON.stringify(next);
            };

            const synonyms = patchField('synonyms');
            const antonyms = patchField('antonyms');
            const related = patchField('related_stems');

            if (dirty) {
                await client.execute({
                    sql: 'UPDATE stems SET synonyms = ?, antonyms = ?, related_stems = ?, updated_at = ? WHERE stem_string = ?',
                    args: [synonyms, antonyms, related, now(), s.stem_string],
                });
            }
        }
    } else {
        await client.execute({
            sql: `
                UPDATE entries
                SET zokk_morphology = json_set(
                    COALESCE(zokk_morphology, '{}'),
                    '$.stem_string', ?,
                    '$.class_type', ?,
                    '$.is_hybrid', ?,
                    '$.root', json(?),
                    '$.agentive_suffix', json(?)
                ),
                updated_at = ?
                WHERE is_loanword = 1
                  AND zokk_morphology IS NOT NULL
                  AND json_valid(zokk_morphology) = 1
                  AND json_extract(zokk_morphology, '$.stem_string') = ?
            `,
            args: [
                finalStemString,
                row.class_type,
                row.is_hybrid,
                JSON.stringify(row.root),
                JSON.stringify(row.agentive_suffix),
                now(),
                sourceStemString,
            ],
        });
    }

    return finalStemString;
}

function normalizeStemRow(row, stats) {
    const parse = (value, fallback) => {
        if (!value) return fallback;
        try { return JSON.parse(value); } catch { return fallback; }
    };
    return {
        ...row,
        id: row.stem_string,
        is_hybrid: row.is_hybrid === 1 || row.is_hybrid === true || row.is_hybrid === 'true',
        tags: parse(row.tags, []),
        glosses: parse(row.glosses, []),
        etymology: normalizeStemEtymologyValue(parse(row.etymology, {})),
        synonyms: parse(row.synonyms, []),
        antonyms: parse(row.antonyms, []),
        related_stems: parse(row.related_stems, []),
        entry_count: stats.entry_count,
        entry_ids: stats.entry_ids,
    };
}

export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 1000);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const client = getDbClient(env);

        let sql = 'SELECT * FROM stems';
        const args = [];
        if (q) {
            sql += ' WHERE stem_string LIKE ?';
            args.push(`%${q}%`);
        }
        sql += ' ORDER BY stem_string ASC LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const res = await client.execute({ sql, args });
        const stems = [];
        for (const row of res.rows) {
            const stats = await getStemEntryStats(client, row.stem_string);
            stems.push(normalizeStemRow(row, stats));
        }
        return json({ stems });
    } catch (e) {
        return internalError(e);
    }
}

export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const body = await request.json();
        const client = getDbClient(env);
        const createdStem = await upsertStem(client, body, { force: body.force === true });
        return json({ stem_string: createdStem, created: true }, 201);
    } catch (e) {
        if (e?.code === 'DUPLICATE_STEM') {
            return json({ error: 'DUPLICATE_STEM', message: 'A stem with this stem_string already exists.' }, 409);
        }
        return internalError(e);
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const url = new URL(request.url);
        const id = url.searchParams.get('id')?.trim();
        if (!id) return json({ error: 'id required' }, 400);
        const client = getDbClient(env);

        await client.execute({ sql: 'DELETE FROM stems WHERE stem_string = ?', args: [id] });
        return json({ id, deleted: true });
    } catch (e) {
        return internalError(e);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
}

function unauthorized() {
    return json({ error: 'Unauthorized — admin role required' }, 401);
}

function internalError(err) {
    const { status, body } = toApiErrorPayload(err);
    return json(body, status);
}
