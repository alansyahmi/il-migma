/**
 * Admin feedback inbox item — /api/admin/submissions/:id
 * Protected by Clerk JWT verification.
 */

import { getDbClient, toApiErrorPayload } from '../../../lib/dbClient.js';

const ALLOWED_STATUS = new Set(['new', 'reviewed', 'closed', 'spam']);

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

export async function onRequestPut({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const id = params?.id;
        if (!id) return json({ error: 'id required' }, 400);

        const body = await request.json();
        const status = String(body?.status || '').trim().toLowerCase();
        if (!ALLOWED_STATUS.has(status)) {
            return json({ error: `Invalid status: ${status}` }, 400);
        }

        const client = getDbClient(env);
        await ensureTable(client);

        const result = await client.execute({
            sql: `
                UPDATE site_submissions
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
            args: [status, id],
        });

        if (!result.rowsAffected) {
            return json({ error: 'Submission not found', code: 'SUBMISSION_NOT_FOUND' }, 404);
        }

        return json({ ok: true, id, status });
    } catch (e) {
        const { status, body } = toApiErrorPayload(e);
        return json(body, status);
    }
}

export async function onRequestDelete({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const id = params?.id;
        if (!id) return json({ error: 'id required' }, 400);

        const client = getDbClient(env);
        await ensureTable(client);

        const result = await client.execute({
            sql: 'DELETE FROM site_submissions WHERE id = ?',
            args: [id],
        });

        if (!result.rowsAffected) {
            return json({ error: 'Submission not found', code: 'SUBMISSION_NOT_FOUND' }, 404);
        }

        return json({ ok: true, id });
    } catch (e) {
        const { status, body } = toApiErrorPayload(e);
        return json(body, status);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
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
