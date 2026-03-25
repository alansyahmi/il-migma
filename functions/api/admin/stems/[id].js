import { getDbClient, toApiErrorPayload } from '../../../lib/dbClient.js';
import { normalizeStemEtymologyValue } from '../stems.js';

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

async function updateStemAndPropagate(client, sourceStemString, payload) {
    const nextStemString = String(payload.stem_string || sourceStemString).trim().normalize('NFC');
    if (!nextStemString) throw new Error('stem_string required');

    const existing = await client.execute({
        sql: 'SELECT stem_string FROM stems WHERE stem_string = ?',
        args: [nextStemString],
    });
    if (nextStemString !== sourceStemString && existing.rows.length > 0) {
        const err = new Error('DUPLICATE_STEM');
        err.code = 'DUPLICATE_STEM';
        throw err;
    }

    const row = {
        stem_string: nextStemString,
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
            row.stem_string,
            row.class_type,
            row.is_hybrid,
            JSON.stringify(row.root),
            JSON.stringify(row.agentive_suffix),
            now(),
            sourceStemString,
        ],
    });

    if (sourceStemString !== nextStemString) {
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
                        id: nextStemString,
                        headword: nextStemString,
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
    }

    return nextStemString;
}

export async function onRequestGet({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const id = decodeURIComponent(params.id || '').trim().normalize('NFC');
        if (!id) return json({ error: 'id parameter required' }, 400);
        const client = getDbClient(env);

        const res = await client.execute({ sql: 'SELECT * FROM stems WHERE stem_string = ?', args: [id] });
        if (res.rows.length === 0) return json({ error: 'Stem not found' }, 404);

        const stats = await getStemEntryStats(client, id);
        return json({ stem: normalizeStemRow(res.rows[0], stats) });
    } catch (e) {
        return internalError(e);
    }
}

export async function onRequestPut({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const id = decodeURIComponent(params.id || '').trim().normalize('NFC');
        if (!id) return json({ error: 'id parameter required' }, 400);
        const body = await request.json();
        const client = getDbClient(env);

        const exists = await client.execute({ sql: 'SELECT stem_string FROM stems WHERE stem_string = ?', args: [id] });
        if (exists.rows.length === 0) return json({ error: 'Stem not found' }, 404);

        const finalStemString = await updateStemAndPropagate(client, id, body);
        return json({ success: true, stem_string: finalStemString });
    } catch (e) {
        if (e?.code === 'DUPLICATE_STEM') {
            return json({ error: 'DUPLICATE_STEM', message: 'A stem with this stem_string already exists.' }, 409);
        }
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
