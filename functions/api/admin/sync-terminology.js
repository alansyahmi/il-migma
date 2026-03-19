/**
 * Admin terminology sync — /api/admin/sync-terminology
 * Bridge between database and src/lib/terminology.ts
 */

import { validateAndNormalize } from './configSchema.js';
import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') return true;
    try {
        const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
    } catch (e) { return false; }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
}

function internalError(err) {
    const { status, body } = toApiErrorPayload(err);
    return json(body, status);
}

function getErrorMessage(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    const parts = [];
    if (err.code) parts.push(String(err.code));
    if (err.message) parts.push(String(err.message));
    if (parts.length) return parts.join(': ');
    return JSON.stringify(err);
}

async function executeFirstSuccess(client, attempts, args) {
    let lastErr = null;
    for (const sql of attempts) {
        try {
            return await client.execute({ sql, args });
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error('All SQL attempts failed');
}

/**
 * GET — Export terminology
 */
export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

        const client = getDbClient(env);
        const res = await client.execute({
            sql: `SELECT key, value FROM admin_config WHERE category = 'ui_terminology'`
        });

        const terminology = {};
        res.rows.forEach(row => {
            const val = JSON.parse(row.value);
            terminology[row.key] = {
                en: val.en || '',
                standard: val.mt_standard || '',
                arabised: val.mt_arabised || ''
            };
        });

        return json({ terminology });
    } catch (e) {
        return internalError(e);
    }
}

/**
 * POST — Import terminology
 */
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

        const body = await request.json();
        const { terminology } = body;
        if (!terminology || typeof terminology !== 'object') {
            return json({ error: 'Terminology object required' }, 400);
        }

        const client = getDbClient(env);
        await client.execute('SELECT 1');
        const errors = [];
        let upserted = 0;

        for (const [key, val] of Object.entries(terminology)) {
            // Key naming consistency: requirement for kebab-case (lowercase only for safety)
            const safeKey = key.toLowerCase().replace(/_/g, '-');
            
            // Validate value shape
            if (!val.en && !val.standard && !val.arabised) {
                errors.push(`Key "${key}" has no labels`);
                continue;
            }

            const normalizedValue = {
                en: val.en || '',
                mt_standard: val.standard || val.mt_standard || '',
                mt_arabised: val.arabised || val.mt_arabised || ''
            };

            try {
                // Ensure value passes schema validation
                const finalValue = validateAndNormalize('ui_terminology', normalizedValue);
                
                const id = Math.random().toString(36).slice(2, 11);
                
                // Schema-tolerant upsert:
                // 1) update existing row(s) by category+key
                // 2) insert only when no rows were updated
                const nextValue = JSON.stringify(finalValue);
                const updateRes = await executeFirstSuccess(client, [
                    `UPDATE admin_config
                     SET value = ?, updated_at = datetime('now')
                     WHERE category = 'ui_terminology' AND "key" = ?`,
                    `UPDATE admin_config
                     SET value = ?
                     WHERE category = 'ui_terminology' AND "key" = ?`,
                    `UPDATE admin_config
                     SET value = ?, updated_at = datetime('now')
                     WHERE category = 'ui_terminology' AND key = ?`,
                    `UPDATE admin_config
                     SET value = ?
                     WHERE category = 'ui_terminology' AND key = ?`,
                ], [nextValue, safeKey]);

                if (!updateRes.rowsAffected) {
                    await executeFirstSuccess(client, [
                        `INSERT INTO admin_config (id, category, "key", value, sort_order, created_at, updated_at)
                         VALUES (?, 'ui_terminology', ?, ?, 0, datetime('now'), datetime('now'))`,
                        `INSERT INTO admin_config (id, category, "key", value, sort_order)
                         VALUES (?, 'ui_terminology', ?, ?, 0)`,
                        `INSERT INTO admin_config (id, category, "key", value)
                         VALUES (?, 'ui_terminology', ?, ?)`,
                        `INSERT INTO admin_config (id, category, key, value)
                         VALUES (?, 'ui_terminology', ?, ?)`,
                    ], [id, safeKey, nextValue]);
                }
                upserted++;
            } catch (err) {
                errors.push(`Key "${key}": ${getErrorMessage(err)}`);
                if (errors.length >= 10) {
                    errors.push('Import stopped after 10 errors to prevent noisy output.');
                    break;
                }
            }
        }

        return json({ upserted, errors });
    } catch (e) {
        return internalError(e);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
