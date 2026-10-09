/**
 * GET /api/patterns
 * Fetch all patterns with their basic metadata.
 * Uses isolate memory cache & Cache-Control headers to eliminate redundant DB reads.
 */

import { createClient } from '@libsql/client/web';

let cachedPatterns = null;
let cachedTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function onRequestGet({ params, env }) {
    try {
        const now = Date.now();
        if (cachedPatterns && (now - cachedTime < CACHE_TTL_MS)) {
            return json({ patterns: cachedPatterns }, 200, 'HIT-MEMORY');
        }

        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });

        const patternRes = await db.execute({
            sql: `SELECT p.*,
                  COALESCE((
                      SELECT json_group_array(
                          json_object(
                              'category', category,
                              'pos', pos,
                              'role', linguistic_role,
                              'gender', gender,
                              'stress', stress,
                              'sort_order', sort_order
                          )
                      )
                   FROM pattern_applicability 
                   WHERE pattern_id = p.id AND is_active = 1
                  ), '[]') as applicability
                  FROM patterns p
                  ORDER BY p.cv_notation ASC`
        });

        const patterns = patternRes.rows.map(p => ({
            ...p,
            applicability: JSON.parse(String(p.applicability || '[]'))
        }));

        cachedPatterns = patterns;
        cachedTime = now;

        return json({ patterns }, 200, 'MISS');

    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

function json(data, status = 200, cacheStatus = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };
    if (status === 200) {
        headers['Cache-Control'] = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
        if (cacheStatus) headers['X-Patterns-Cache'] = cacheStatus;
    }
    return new Response(JSON.stringify(data), {
        status,
        headers,
    });
}
