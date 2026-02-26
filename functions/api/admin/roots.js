/**
 * Admin root CRUD — /api/admin/roots
 * Protected by Clerk JWT verification.
 */

import { createClient } from '@libsql/client/web';

async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

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
}

function db(env) {
    return createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });
}

export async function onRequestGet({ request, env }) {
    if (!(await verifyAdmin(request, env))) return unauthorized();

    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() ?? '';
    const client = db(env);

    let sql = `SELECT * FROM roots`;
    const args = [];
    if (q) {
        sql += ` WHERE consonants LIKE ?`;
        args.push(`%${q}%`);
    }
    sql += ` ORDER BY consonants ASC LIMIT 100`;

    const res = await client.execute({ sql, args });
    return json({ roots: res.rows });
}

export async function onRequestPost({ request, env }) {
    if (!(await verifyAdmin(request, env))) return unauthorized();

    const body = await request.json();
    const { consonants, notes } = body;
    if (!consonants) return json({ error: 'consonants required' }, 400);

    const client = db(env);
    const id = Math.random().toString(36).slice(2, 11);
    const consonant_array = JSON.stringify(consonants.split('-'));

    await client.execute({
        sql: `INSERT INTO roots (id, consonants, consonant_array, notes, created_at, updated_at) 
              VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [id, consonants, consonant_array, notes ?? ''],
    });

    return json({ id, created: true }, 201);
}

export async function onRequestDelete({ request, env }) {
    if (!(await verifyAdmin(request, env))) return unauthorized();

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);

    const client = db(env);
    await client.execute({ sql: 'DELETE FROM roots WHERE id = ?', args: [id] });

    return json({ id, deleted: true });
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
