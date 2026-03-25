import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';
import { normalizeStemEtymologyValue } from '../admin/stems.js';

function parseJson(value, fallback) {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
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

export async function onRequestGet({ env, params }) {
    try {
        const id = decodeURIComponent(params.id || '').trim().normalize('NFC');
        if (!id) return json({ error: 'id parameter required' }, 400);

        const client = getDbClient(env);
        const res = await client.execute({ sql: 'SELECT * FROM stems WHERE stem_string = ?', args: [id] });
        if (res.rows.length === 0) return json({ error: 'Stem not found' }, 404);

        const row = res.rows[0];
        const stats = await getStemEntryStats(client, id);
        return json({
            stem: {
                ...row,
                id: row.stem_string,
                is_hybrid: row.is_hybrid === 1 || row.is_hybrid === true || row.is_hybrid === 'true',
                tags: parseJson(row.tags, []),
                glosses: parseJson(row.glosses, []),
                etymology: normalizeStemEtymologyValue(parseJson(row.etymology, {})),
                synonyms: parseJson(row.synonyms, []),
                antonyms: parseJson(row.antonyms, []),
                related_stems: parseJson(row.related_stems, []),
                entry_count: stats.entry_count,
                entry_ids: stats.entry_ids,
            },
        });
    } catch (e) {
        const { status, body } = toApiErrorPayload(e);
        return json(body, status);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
}
