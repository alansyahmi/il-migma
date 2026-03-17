/**
 * GET /api/distinct?type=[tags|vowel_sets|sources]
 * Returns unique values found in the database for the requested type.
 */

import { createClient } from '@libsql/client/web';

export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const type = url.searchParams.get('type');
        
        const tursoUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const dbToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: tursoUrl, authToken: dbToken });

        let sql = '';
        let transform = (rows) => rows.map(r => r.val).filter(Boolean);

        if (type === 'tags') {
            sql = `
                SELECT DISTINCT REPLACE(REPLACE(value, '!', ''), '$', '') as val
                FROM entries, json_each(tags)
                WHERE value IS NOT NULL AND value != ''
                ORDER BY val ASC
            `;
        } else if (type === 'vowel_sets') {
            sql = `
                SELECT DISTINCT verb_vowel_perf as val FROM entries WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT verb_vowel_impf as val FROM entries WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT verb_vowel_impv as val FROM entries WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_sg as val FROM entries WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_opp as val FROM entries WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_dual as val FROM entries WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_pl as val FROM entries WHERE val IS NOT NULL AND val != ''
                ORDER BY val ASC
            `;
        } else if (type === 'sources') {
            sql = `
                SELECT DISTINCT source_citation as val
                FROM entries
                WHERE val IS NOT NULL AND val != ''
                ORDER BY val ASC
            `;
        } else {
            return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400 });
        }
        
        const result = await db.execute(sql);
        const values = transform(result.rows);

        return new Response(JSON.stringify(values), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (e) {
        console.error("API DISTINCT ERROR:", e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
