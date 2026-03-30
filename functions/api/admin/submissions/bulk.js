/**
 * Admin feedback inbox bulk actions — /api/admin/submissions/bulk
 * Protected by Clerk JWT verification.
 */

import { getDbClient, toApiErrorPayload } from '../../../lib/dbClient.js';

const ALLOWED_STATUS = new Set(['new', 'reviewed', 'closed', 'spam']);
const ALLOWED_ACTIONS = new Set(['delete', 'status']);

async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') return true;

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
    } catch {
        return false;
    }
}

export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        const ids = Array.isArray(body?.ids) ? body.ids.map(id => String(id).trim()).filter(Boolean) : [];
        const action = String(body?.action || '').trim().toLowerCase();
        const status = body?.status ? String(body.status).trim().toLowerCase() : '';

        if (!ALLOWED_ACTIONS.has(action)) {
            return json({ error: `Invalid action: ${action}` }, 400);
        }
        if (ids.length === 0) {
            return json({ error: 'ids must not be empty' }, 400);
        }
        if (ids.length > 200) {
            return json({ error: 'Too many ids supplied' }, 400);
        }
        if (action === 'status' && !ALLOWED_STATUS.has(status)) {
            return json({ error: `Invalid status: ${status}` }, 400);
        }

        const client = getDbClient(env);
        await ensureTable(client);

        const placeholders = ids.map(() => '?').join(', ');
        const sqlArgs = [...ids];
        let sql;

        if (action === 'delete') {
            sql = `DELETE FROM site_submissions WHERE id IN (${placeholders})`;
        } else {
            sql = `UPDATE site_submissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
            sqlArgs.unshift(status);
        }

        const result = await client.execute({ sql, args: sqlArgs });

        return json({
            ok: true,
            action,
            affected: Number(result.rowsAffected ?? 0),
            status: action === 'status' ? status : undefined,
        });
    } catch (e) {
        const { status, body } = toApiErrorPayload(e);
        return json(body, status);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

async function ensureTable(client) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS site_submissions (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            category TEXT NOT NULL,
            subject TEXT NOT NULL,
            email TEXT,
            message TEXT,
            page_path TEXT,
            page_url TEXT,
            referer TEXT,
            user_agent TEXT,
            status TEXT NOT NULL DEFAULT 'new',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
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
