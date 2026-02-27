/**
 * Admin root CRUD — /api/admin/roots
 * Protected by Clerk JWT verification.
 */

import { createClient } from '@libsql/client/web';

async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    // LOCAL DEV OVERRIDE
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    console.log('VerifyAdmin Check:', { url: request.url, isLocal, hasSecret: !!env.CLERK_SECRET_KEY });

    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') {
        console.log('Admin verify bypass activated');
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

        if (!res.ok) {
            console.error('Clerk verify failed:', res.status, await res.text());
            return false;
        }

        const data = await res.json();
        return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
    } catch (e) {
        console.error('VerifyAdmin Exception:', e.message);
        return false;
    }
}

function db(env) {
    const url = env.TURSO_URL || env.VITE_TURSO_URL;
    const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
    if (!url) {
        const keys = Object.keys(env).join(', ');
        throw new Error(`TURSO_URL missing. Available env keys: ${keys}`);
    }
    return createClient({ url, authToken: token });
}

export async function onRequestGet({ request, env }) {
    try {
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
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        const { strength, weak_class, gloss, etymology, source, hidden_forms, vowel_set_perf, vowel_set_impf, vowel_set_imp } = body;
        const consonants = body.consonants?.trim().toLowerCase().normalize('NFC');
        const notes = body.notes?.trim() ?? ''; // Trim notes
        if (!consonants) return json({ error: 'consonants required' }, 400);

        const client = db(env);
        const id = Math.random().toString(36).slice(2, 11);
        const consonant_array = JSON.stringify(consonants.split('-').map(c => c.trim().normalize('NFC')));

        await client.execute({
            sql: `INSERT INTO roots (id, consonants, consonant_array, strength, weak_class, gloss, etymology, source, notes, vowel_set_perf, vowel_set_impf, vowel_set_imp, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [
                id,
                consonants,
                consonant_array,
                strength ?? 'strong',
                weak_class ?? '',
                gloss ?? '',
                etymology ?? '',
                source ?? '',
                notes ?? '',
                vowel_set_perf ?? 'a-a',
                vowel_set_impf ?? 'i-a',
                vowel_set_imp ?? 'o-o'
            ],
        });

        return json({ id, created: true }, 201);
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'id required' }, 400);

        const client = db(env);
        await client.execute({ sql: 'DELETE FROM roots WHERE id = ?', args: [id] });

        return json({ id, deleted: true });
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

function unauthorized() {
    return json({ error: 'Unauthorized — admin role required' }, 401);
}
