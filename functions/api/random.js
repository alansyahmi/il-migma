/**
 * GET /api/random
 * Fast random entry selection using light count + offset.
 * Bypasses 8-table morphology JOINs and ORDER BY RANDOM().
 */

import { createClient } from '@libsql/client/web';

export async function onRequestGet({ env }) {
    try {
        const tursoUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const dbToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: tursoUrl, authToken: dbToken });

        const countRes = await db.execute("SELECT COUNT(*) as c FROM entries");
        const total = Number(countRes.rows[0]?.c ?? 0);

        if (total === 0) {
            return json({ results: [] });
        }

        const randomIndex = Math.floor(Math.random() * total);
        const result = await db.execute({
            sql: "SELECT id, headword, pos FROM entries LIMIT 1 OFFSET ?",
            args: [randomIndex]
        });

        return json({ results: result.rows });
    } catch (e) {
        console.error("API RANDOM ERROR:", e);
        return json({ error: e.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, max-age=0'
        }
    });
}
