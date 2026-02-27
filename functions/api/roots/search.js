
import { createClient } from '@libsql/client/web';

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const r1 = url.searchParams.get('r1') || '';
    const r2 = url.searchParams.get('r2') || '';
    const r3 = url.searchParams.get('r3') || '';
    const r4 = url.searchParams.get('r4') || '';

    try {
        const dbUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: dbUrl, authToken: token });

        // We'll search the roots table.
        // We need to parse the consonant_array (JSON) or use the consonants string.
        // The consonants string is like "k-t-b".

        let sql = `SELECT * FROM roots`;
        const conditions = [];
        const args = [];
        if (r1) { conditions.push("json_extract(consonant_array, '$[0]') = ?"); args.push(decodeURIComponent(r1).toLowerCase().trim().normalize('NFC')); }
        if (r2) { conditions.push("json_extract(consonant_array, '$[1]') = ?"); args.push(decodeURIComponent(r2).toLowerCase().trim().normalize('NFC')); }
        if (r3) { conditions.push("json_extract(consonant_array, '$[2]') = ?"); args.push(decodeURIComponent(r3).toLowerCase().trim().normalize('NFC')); }
        if (r4) { conditions.push("json_extract(consonant_array, '$[3]') = ?"); args.push(decodeURIComponent(r4).toLowerCase().trim().normalize('NFC')); }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        const result = await db.execute({ sql, args });
        const roots = result.rows.map(r => {
            try {
                r.consonant_array = r.consonant_array ? JSON.parse(r.consonant_array) : [];
                r.hidden_forms = r.hidden_forms ? JSON.parse(r.hidden_forms) : [];
            } catch (e) { }
            return r;
        });

        return new Response(JSON.stringify({ roots }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
