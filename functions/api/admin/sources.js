/**
 * Admin Lexical Sources CRUD — /api/admin/sources
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

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

export async function onRequestGet(context) {
    const { request, env } = context;
    if (!(await verifyAdmin(request, env))) {
        return new Response('Unauthorized', { status: 401 });
    }

    const client = getDbClient(env);
    try {
        const res = await client.execute("SELECT * FROM lexical_sources ORDER BY name ASC");
        return new Response(JSON.stringify({ sources: res.rows }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        return new Response(JSON.stringify(toApiErrorPayload(e)), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    if (!(await verifyAdmin(request, env))) {
        return new Response('Unauthorized', { status: 401 });
    }

    const client = getDbClient(env);
    try {
        const body = await request.json();
        const { id, name, full_title, author, year, publisher, reliability_weight, source_type, url } = body;

        await client.execute({
            sql: `INSERT INTO lexical_sources (id, name, full_title, author, year, publisher, reliability_weight, source_type, url)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id || `src-${name.toLowerCase().replace(/\s+/g, '-')}`,
                name,
                full_title,
                author || null,
                year || null,
                publisher || null,
                reliability_weight || 0.5,
                source_type || 'academic',
                url || null
            ],
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        return new Response(JSON.stringify(toApiErrorPayload(e)), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function onRequestPut(context) {
    const { request, env } = context;
    if (!(await verifyAdmin(request, env))) {
        return new Response('Unauthorized', { status: 401 });
    }

    const client = getDbClient(env);
    try {
        const body = await request.json();
        const { id, name, full_title, author, year, publisher, reliability_weight, source_type, url } = body;

        await client.execute({
            sql: `UPDATE lexical_sources 
                  SET name = ?, full_title = ?, author = ?, year = ?, publisher = ?, 
                      reliability_weight = ?, source_type = ?, url = ?
                  WHERE id = ?`,
            args: [
                name,
                full_title,
                author || null,
                year || null,
                publisher || null,
                reliability_weight,
                source_type,
                url || null,
                id
            ],
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        return new Response(JSON.stringify(toApiErrorPayload(e)), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    if (!(await verifyAdmin(request, env))) {
        return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });

    const client = getDbClient(env);
    try {
        await client.execute({
            sql: "DELETE FROM lexical_sources WHERE id = ?",
            args: [id],
        });
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        return new Response(JSON.stringify(toApiErrorPayload(e)), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
