import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

function parseJson(value, fallback) {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
}

export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);

        const client = getDbClient(env);
        const args = [];
        let sql = 'SELECT stem_string, glosses, class_type, is_hybrid FROM stems';
        if (q) {
            sql += ' WHERE stem_string LIKE ?';
            args.push(`%${q}%`);
        }
        sql += ' ORDER BY stem_string ASC LIMIT ?';
        args.push(limit);

        const res = await client.execute({ sql, args });
        return json({
            stems: res.rows.map((row) => {
                const glosses = parseJson(row.glosses, []);
                const first = Array.isArray(glosses) ? glosses[0] : null;
                return {
                    id: row.stem_string,
                    stem_string: row.stem_string,
                    headword: row.stem_string,
                    pos: 'STEM',
                    class_type: row.class_type || 'ar',
                    is_hybrid: row.is_hybrid === 1 || row.is_hybrid === true || row.is_hybrid === 'true',
                    gloss_en: first?.en || '',
                    gloss_mt: first?.mt || '',
                };
            }),
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
