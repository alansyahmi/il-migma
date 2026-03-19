/**
 * GET /api/pattern/:id
 * Fetch a single pattern with its metadata and a sample of entries using it.
 */

import { createClient } from '@libsql/client/web';

export async function onRequestGet({ params, env }) {
    const { id } = params;
    if (!id) return json({ error: 'Missing id' }, 400);

    try {
        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });

        // 1. Fetch Pattern metadata
        const patternRes = await db.execute({
            sql: `SELECT * FROM patterns WHERE id = ?`,
            args: [id]
        });

        if (!patternRes.rows.length) return json({ error: 'Pattern not found' }, 404);
        const pattern = patternRes.rows[0];

        // 2. Fetch Applicability (Roles)
        const appRes = await db.execute({
            sql: `SELECT DISTINCT category, pos, linguistic_role, gender, stress 
                  FROM pattern_applicability 
                  WHERE pattern_id = ? AND is_active = 1`,
            args: [id]
        });

        // 3. Fetch sample entries
        // We look for entries matching this pattern ID via root_pattern_forms OR matching the CV notation
        const entriesRes = await db.execute({
            sql: `SELECT e.id, e.headword, e.pos, d.text_en as definition
                  FROM entries e
                  LEFT JOIN root_pattern_forms rpf ON rpf.id = e.root_pattern_form_id
                  LEFT JOIN definitions d ON d.entry_id = e.id AND d.sense_number = 1
                  WHERE rpf.pattern_id = ? OR e.cv_pattern = ?
                  LIMIT 50`,
            args: [id, pattern.cv_notation]
        });

        return json({
            pattern,
            roles: appRes.rows,
            entries: entriesRes.rows
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
