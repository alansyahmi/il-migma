/**
 * GET /api/patterns
 * Fetch all patterns with their basic metadata.
 */

import { createClient } from '@libsql/client/web';

export async function onRequestGet({ params, env }) {
    try {
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

        return json({
            patterns: patternRes.rows.map(p => ({
                ...p,
                applicability: JSON.parse(String(p.applicability || '[]'))
            }))
        });

    } catch (e) {
        return json({ error: e.message }, 500);
    }
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
