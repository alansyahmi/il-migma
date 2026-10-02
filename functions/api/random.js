/**
 * GET /api/random
 * Ultra-fast random entry selection using indexed rowid seek.
 * Reduces row reads from ~37,000 to just 1–2 rows!
 */

import { createClient } from '@libsql/client/web';

let cachedMaxRowId = 0;
let cachedMaxTime = 0;
const MAX_ROWID_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function onRequestGet({ env }) {
    try {
        const tursoUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const dbToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: tursoUrl, authToken: dbToken });

        const now = Date.now();
        let maxId = cachedMaxRowId;

        // Refresh max rowid every 10 min using O(1) indexed lookup (1 row read)
        if (!maxId || (now - cachedMaxTime > MAX_ROWID_CACHE_TTL)) {
            const maxRes = await db.execute("SELECT MAX(rowid) as max_id FROM entries");
            maxId = Number(maxRes.rows[0]?.max_id ?? 0);
            if (maxId > 0) {
                cachedMaxRowId = maxId;
                cachedMaxTime = now;
            }
        }

        if (maxId <= 0) {
            return json({ results: [] });
        }

        // Pick a random rowid between 1 and maxId
        const randomTarget = Math.floor(Math.random() * maxId) + 1;

        // O(1) B-tree seek: seek to rowid >= target (1 row read)
        let result = await db.execute({
            sql: "SELECT id, headword, pos FROM entries WHERE rowid >= ? LIMIT 1",
            args: [randomTarget]
        });

        // If target was near the end and rowid was deleted, wrap around (1 row read)
        if (!result.rows || result.rows.length === 0) {
            result = await db.execute({
                sql: "SELECT id, headword, pos FROM entries WHERE rowid <= ? ORDER BY rowid DESC LIMIT 1",
                args: [randomTarget]
            });
        }

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
