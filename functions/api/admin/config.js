/**
 * Admin configuration CRUD — /api/admin/config
 * Protected by Clerk JWT verification.
 */

import { createClient } from '@libsql/client/web';

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
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const category = url.searchParams.get('category');

        const client = db(env);
        let sql = `SELECT * FROM admin_config`;
        const args = [];

        if (category) {
            sql += ` WHERE category = ?`;
            args.push(category);
        }

        sql += ` ORDER BY category ASC, sort_order ASC`;

        const res = await client.execute({ sql, args });
        return json({ config: res.rows });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

// ── POST — create config item ──────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        const { category, key, value, sort_order = 0 } = body;
        if (!category || !key || !value) return json({ error: 'category, key, and value are required' }, 400);

        const client = db(env);
        const id = Math.random().toString(36).slice(2, 11);

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
        const { id, category, key, value, sort_order } = body;
        if (!id) return json({ error: 'id required' }, 400);

        const client = db(env);
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
