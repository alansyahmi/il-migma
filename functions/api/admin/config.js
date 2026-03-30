/**
 * Admin configuration CRUD — /api/admin/config
 * Protected by Clerk JWT verification.
 */

import { validateAndNormalize } from './configSchema.js';
import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

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

function internalError(err) {
    const { status, body } = toApiErrorPayload(err);
    return json(body, status);
}

function normalizePosTypes(rawPosTypes) {
    let parsed = rawPosTypes;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            parsed = [];
        }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(p => typeof p === 'string' && p !== 'all');
}

function parsePatternCompositeId(id) {
    if (!id || typeof id !== 'string') return null;
    const firstSep = id.indexOf('_');
    const lastSep = id.lastIndexOf('_');
    if (firstSep <= 0 || lastSep <= firstSep) return null;

    return {
        patternId: id.slice(0, firstSep),
        category: id.slice(firstSep + 1, lastSep),
        suffix: id.slice(lastSep + 1), // stress number, pos token, or "all"
    };
}

async function upsertPatternByCv(client, cv, wizen, description) {
    const existingByCv = await client.execute({
        sql: `SELECT id FROM patterns WHERE cv_notation = ? LIMIT 1`,
        args: [cv]
    });

    if (existingByCv.rows.length) {
        const existingId = String(existingByCv.rows[0].id);
        await client.execute({
            sql: `UPDATE patterns
                  SET wizen_notation = ?, description = COALESCE(?, description)
                  WHERE id = ?`,
            args: [wizen, description ?? null, existingId]
        });
        return existingId;
    }

    const patternId = btoa(encodeURIComponent(`${cv}|${wizen}`)).replace(/=/g, '');
    await client.execute({
        sql: `INSERT INTO patterns (id, cv_notation, wizen_notation, description)
              VALUES (?, ?, ?, ?)`,
        args: [patternId, cv, wizen, description ?? null]
    });
    return patternId;
}

// ── GET — list config ────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const category = url.searchParams.get('category');

        const client = getDbClient(env);

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
                    'description', p.description,
                    'linguistic_role', pa.linguistic_role,
                    'gender', pa.gender,
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

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];

        let patterns = [];
        if (!category || normalizedCategories.includes(category)) {
            try {
                const filterSql = category ? `${patternSql} AND pa.category = ?` : patternSql;
                const res = await client.execute({ 
                    sql: `${filterSql} GROUP BY pa.pattern_id, pa.category, pa.stress`, 
                    args: category ? [category] : [] 
                });
                patterns = res.rows.map(row => ({
                    // Standardized ID: patternId_category_stress
                    id: `${row.patternId}_${row.category}_${row.stress}`,
                    category: row.category,
                    key: row.key,
                    value: JSON.stringify((() => {
                        const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : (row.value || {});
                        return {
                            ...parsed,
                            pos_types: normalizePosTypes(parsed.pos_types),
                        };
                    })()),
                    sort_order: row.sort_order
                }));
            } catch (pErr) {
                console.error('Pattern query failed (missing tables?):', pErr.message);
                // Fallback: stay empty, legacyRes will catch any patterns still in admin_config
            }
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
        return internalError(e);
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

        const client = getDbClient(env);
        const id = Math.random().toString(36).slice(2, 11);

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];
        if (normalizedCategories.includes(category)) {
            const cv = value.cv;
            const wizen = value.wizen;
            const patternId = await upsertPatternByCv(client, cv, wizen, value.description);

            // Insert applicability (one for each POS, or 'all')
            const posTypes = value.pos_types?.length > 0 ? value.pos_types : ['all'];
            const stress = Number.isFinite(Number(value.stress)) ? Number(value.stress) : null;
            for (const pos of posTypes) {
                const stressToken = stress === null ? 'null' : String(stress);
                const appId = `${patternId}_${category}_${stressToken}_${pos}`;
                await client.execute({
                    sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order, linguistic_role, gender)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [appId, patternId, category, pos, stress, sort_order, value.linguistic_role, value.gender]
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
        return internalError(e);
    }
}

// ── PUT — update config item ───────────────────────────────────────────────────
export async function onRequestPut({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        let { id, category, key, value, sort_order } = body;
        if (!id) return json({ error: 'id required' }, 400);

        const client = getDbClient(env);

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];
        if (category && normalizedCategories.includes(category)) {
            // value is a whole object {cv, wizen, stress, pos_types}
            try {
                value = validateAndNormalize(category, value);
            } catch (err) {
                return json({ error: `Validation failed: ${err.message}` }, 400);
            }

            const cv = value.cv;
            const wizen = value.wizen;
            const patternId = await upsertPatternByCv(client, cv, wizen, value.description);

            // 2. Delete old applicability group (supports both grouped IDs and row IDs)
            const parsed = parsePatternCompositeId(id);
            if (parsed) {
                if (parsed.suffix === 'all') {
                    await client.execute({
                        sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ?`,
                        args: [parsed.patternId, parsed.category]
                    });
                } else {
                    const parsedStress = Number(parsed.suffix);
                    if (Number.isFinite(parsedStress)) {
                        await client.execute({
                            sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND stress = ?`,
                            args: [parsed.patternId, parsed.category, parsedStress]
                        });
                    } else {
                        await client.execute({
                            sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND pos = ?`,
                            args: [parsed.patternId, parsed.category, parsed.suffix]
                        });
                    }
                }
            }
            
            // Always try deleting the specific exact ID as fallback
            await client.execute({ sql: `DELETE FROM pattern_applicability WHERE id = ?`, args: [id] });

            // 3. Insert new applicability (one for each POS)
            const posTypes = value.pos_types?.length > 0 ? value.pos_types : ['all'];
            const stress = Number.isFinite(Number(value.stress)) ? Number(value.stress) : null;
            for (const pos of posTypes) {
                const stressToken = stress === null ? 'null' : String(stress);
                const appId = `${patternId}_${category}_${stressToken}_${pos}`; // Internal DB unique ID
                await client.execute({
                    sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order, linguistic_role, gender)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [appId, patternId, category, pos, stress, sort_order, value.linguistic_role, value.gender]
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
        return internalError(e);
    }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'id required' }, 400);

        const client = getDbClient(env);
        
        const parsed = parsePatternCompositeId(id);
        if (parsed) {
            if (parsed.suffix === 'all') {
                const appRes = await client.execute({
                    sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ?`,
                    args: [parsed.patternId, parsed.category]
                });
                if (appRes.rowsAffected > 0) {
                    return json({ id, deleted: true });
                }
            } else {
                const parsedStress = Number(parsed.suffix);
                if (Number.isFinite(parsedStress)) {
                    const appRes = await client.execute({
                        sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND stress = ?`,
                        args: [parsed.patternId, parsed.category, parsedStress]
                    });
                    if (appRes.rowsAffected > 0) {
                        return json({ id, deleted: true });
                    }
                } else {
                    const appRes = await client.execute({
                        sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND pos = ?`,
                        args: [parsed.patternId, parsed.category, parsed.suffix]
                    });
                    if (appRes.rowsAffected > 0) {
                        return json({ id, deleted: true });
                    }
                }
            }
        }

        const appRes = await client.execute({ sql: `DELETE FROM pattern_applicability WHERE id = ?`, args: [id] });
        if (appRes.rowsAffected > 0) {
            return json({ id, deleted: true });
        }

        await client.execute({ sql: `DELETE FROM admin_config WHERE id = ?`, args: [id] });

        return json({ id, deleted: true });
    } catch (e) {
        return internalError(e);
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
