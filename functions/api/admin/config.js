/**
 * Admin configuration CRUD — /api/admin/config
 * Protected by Clerk JWT verification.
 */

import { createClient } from '@libsql/client/web';
import { validateAndNormalize } from './configSchema';

// ── Auth guard ────────────────────────────────────────────────────────────────
async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    // LOCAL DEV OVERRIDE
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');

    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') {
        return true;
    }

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
    } catch (e) {
        return false;
    }
}

function db(env) {
    const url = env.TURSO_URL || env.VITE_TURSO_URL;
    const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
    return createClient({ url, authToken: token });
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

function unauthorized() {
    return json({ error: 'Unauthorized — admin role required' }, 401);
}

// ── GET — list config ────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const category = url.searchParams.get('category');

        const client = db(env);

        // Normalized Query for Patterns
        const patternSql = `
            SELECT 
                p.id as patternId,
                pa.category,
                pa.stress,
                p.cv_notation || '/' || p.wizen_notation as key,
                json_object(
                    'cv', p.cv_notation,
                    'wizen', p.wizen_notation,
                    'stress', pa.stress,
                    'pos_types', (
                        SELECT json_group_array(pos) 
                        FROM pattern_applicability 
                        WHERE pattern_id = pa.pattern_id AND category = pa.category AND stress = pa.stress
                    )
                ) as value,
                pa.sort_order
            FROM pattern_applicability pa
            JOIN patterns p ON p.id = pa.pattern_id
            WHERE pa.is_active = 1
        `;

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'adjective_pattern'];

        let patterns = [];
        if (!category || normalizedCategories.includes(category)) {
            const filterSql = category ? `${patternSql} AND pa.category = ?` : patternSql;
            const res = await client.execute({ 
                sql: `${filterSql} GROUP BY pa.pattern_id, pa.category, pa.stress`, 
                args: category ? [category] : [] 
            });
            patterns = res.rows.map(row => ({
                id: `${row.patternId}_${row.category}_${row.stress}`,
                category: row.category,
                key: row.key,
                value: JSON.stringify({
                    ...JSON.parse(row.value),
                    pos_types: JSON.parse(JSON.parse(row.value).pos_types).filter(p => p !== 'all' && p !== null)
                }),
                sort_order: row.sort_order
            }));
        }

        // Legacy Query for everything else
        let sql = `SELECT * FROM admin_config`;
        const args = [];
        if (category) {
            sql += ` WHERE category = ?`;
            args.push(category);
        }

        const legacyRes = await client.execute({ sql, args });
        
        // Combine results
        const config = [...legacyRes.rows, ...patterns].sort((a, b) => {
            if (a.category < b.category) return -1;
            if (a.category > b.category) return 1;
            return (a.sort_order || 0) - (b.sort_order || 0);
        });

        return json({ config });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

// ── POST — create config item ──────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        let { category, key, value, sort_order = 0 } = body;
        if (!category || !key || value === undefined) return json({ error: 'category, key, and value are required' }, 400);

        // Validation & Normalization
        try {
            value = validateAndNormalize(category, value);
        } catch (err) {
            return json({ error: `Validation failed: ${err.message}` }, 400);
        }

        const client = db(env);
        const id = Math.random().toString(36).slice(2, 11);

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'adjective_pattern'];
        if (normalizedCategories.includes(category)) {
            const cv = value.cv;
            const wizen = value.wizen;
            const patternId = btoa(`${cv}|${wizen}`).replace(/=/g, '');

            // Insert pattern
            await client.execute({
                sql: `INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation) VALUES (?, ?, ?)`,
                args: [patternId, cv, wizen]
            });

            // Insert applicability (one for each POS, or 'all')
            const posTypes = value.pos_types?.length > 0 ? value.pos_types : ['all'];
            for (const pos of posTypes) {
                const appId = `${patternId}_${category}_${pos}`;
                await client.execute({
                    sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order)
                          VALUES (?, ?, ?, ?, ?, ?)`,
                    args: [appId, patternId, category, pos, value.stress, sort_order]
                });
            }
            return json({ id: patternId, created: true }, 201);
        }

        await client.execute({
            sql: `INSERT INTO admin_config (id, category, key, value, sort_order, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [id, category, key, JSON.stringify(value), sort_order],
        });

        return json({ id, created: true }, 201);
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

// ── PUT — update config item ───────────────────────────────────────────────────
export async function onRequestPut({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        let { id, category, key, value, sort_order } = body;
        if (!id) return json({ error: 'id required' }, 400);

        const client = db(env);

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'adjective_pattern'];
        if (category && normalizedCategories.includes(category)) {
            // value is a whole object {cv, wizen, stress, pos_types}
            try {
                value = validateAndNormalize(category, value);
            } catch (err) {
                return json({ error: `Validation failed: ${err.message}` }, 400);
            }

            const cv = value.cv;
            const wizen = value.wizen;
            const patternId = btoa(`${cv}|${wizen}`).replace(/=/g, '');

            // 1. Ensure pattern exists
            await client.execute({
                sql: `INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation) VALUES (?, ?, ?)`,
                args: [patternId, cv, wizen]
            });

            // 2. Delete old applicability group
            // Old ID format was patternId_category_stress
            const [oldPatternId, oldCat, oldStress] = id.split('_');
            if (oldPatternId && oldCat && oldStress) {
                await client.execute({ 
                    sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND stress = ?`, 
                    args: [oldPatternId, oldCat, parseInt(oldStress)] 
                });
            } else {
                // Fallback for direct ID delete if format doesn't match
                await client.execute({ sql: `DELETE FROM pattern_applicability WHERE id = ?`, args: [id] });
            }

            // 3. Insert new applicability (one for each POS)
            const posTypes = value.pos_types?.length > 0 ? value.pos_types : ['all'];
            for (const pos of posTypes) {
                const appId = `${patternId}_${category}_${pos}`; // Internal DB unique ID
                await client.execute({
                    sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order)
                          VALUES (?, ?, ?, ?, ?, ?)`,
                    args: [appId, patternId, category, pos, value.stress, sort_order]
                });
            }
            return json({ id: `${patternId}_${category}_${value.stress}`, updated: true });
        }

        // ... existing legacy update logic ...
        const setClauses = [];
        const args = [];

        if (category !== undefined) { setClauses.push(`category = ?`); args.push(category); }
        if (key !== undefined) { setClauses.push(`key = ?`); args.push(key); }
        if (value !== undefined) { setClauses.push(`value = ?`); args.push(JSON.stringify(value)); }
        if (sort_order !== undefined) { setClauses.push(`sort_order = ?`); args.push(sort_order); }

        if (!setClauses.length) return json({ error: 'no fields to update' }, 400);

        setClauses.push(`updated_at = datetime('now')`);
        args.push(id);

        await client.execute({
            sql: `UPDATE admin_config SET ${setClauses.join(', ')} WHERE id = ?`,
            args,
        });

        return json({ id, updated: true });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'id required' }, 400);

        const client = db(env);
        
        // Try deleting from normalized tables first
        // If it's a composite ID patternId_category_stress
        const [patternId, cat, stress] = id.split('_');
        if (patternId && cat && stress) {
            const appRes = await client.execute({ 
                sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND stress = ?`, 
                args: [patternId, cat, parseInt(stress)] 
            });
            if (appRes.rowsAffected > 0) {
                return json({ id, deleted: true });
            }
        }

        const appRes = await client.execute({ sql: `DELETE FROM pattern_applicability WHERE id = ?`, args: [id] });
        if (appRes.rowsAffected > 0) {
            return json({ id, deleted: true });
        }

        await client.execute({ sql: `DELETE FROM admin_config WHERE id = ?`, args: [id] });

        return json({ id, deleted: true });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
