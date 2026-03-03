import { createClient } from '@libsql/client/web';

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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

function unauthorized() {
    return json({ error: 'Unauthorized — admin role required' }, 401);
}

export async function onRequestPut({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const { id } = params;
        if (!id) return json({ error: 'id parameter required' }, 400);

        const body = await request.json();
        const { hidden_forms } = body;

        if (!Array.isArray(hidden_forms)) {
            return json({ error: 'hidden_forms must be an array' }, 400);
        }

        const client = db(env);
        const hiddenFormsJson = JSON.stringify(hidden_forms);

        await client.execute({
            sql: `UPDATE roots SET hidden_forms = ?, updated_at = datetime('now') WHERE id = ?`,
            args: [hiddenFormsJson, id],
        });

        return json({ updated: true, hidden_forms });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}
