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

export async function onRequestGet({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const { consonants } = params;
        if (!consonants) return json({ error: 'consonants parameter required' }, 400);

        const decodedCons = decodeURIComponent(consonants).normalize('NFC');

        const client = db(env);
        const rootRes = await client.execute({
            sql: `SELECT * FROM roots WHERE consonants = ?`,
            args: [decodedCons],
        });

        if (rootRes.rows.length === 0) {
            return json({ error: 'Root not found' }, 404);
        }

        const root = rootRes.rows[0];

        // Parse hidden_forms if it exists
        try {
            root.hidden_forms = root.hidden_forms ? JSON.parse(root.hidden_forms) : [];
        } catch (e) {
            root.hidden_forms = [];
        }

        return json({ root });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

export async function onRequestPut({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const { consonants } = params;
        const decodedCons = decodeURIComponent(consonants).normalize('NFC');
        const body = await request.json();
        const { consonants: newConsonants, strength, weak_class, gloss, etymology, source, notes, hidden_forms, vowel_set_perf, vowel_set_impf, vowel_set_imp, is_geminate } = body;

        const client = db(env);

        let sql = `UPDATE roots SET updated_at = datetime('now')`;
        const args = [];

        if (newConsonants !== undefined && newConsonants !== decodedCons) { sql += `, consonants = ?`; args.push(newConsonants); }

        if (strength !== undefined) { sql += `, strength = ?`; args.push(strength); }
        if (weak_class !== undefined) { sql += `, weak_class = ?`; args.push(weak_class); }
        if (gloss !== undefined) { sql += `, gloss = ?`; args.push(gloss); }
        if (etymology !== undefined) { sql += `, etymology = ?`; args.push(etymology); }
        if (source !== undefined) { sql += `, source = ?`; args.push(source); }
        if (notes !== undefined) { sql += `, notes = ?`; args.push(notes); }
        if (vowel_set_perf !== undefined) { sql += `, vowel_set_perf = ?`; args.push(vowel_set_perf); }
        if (vowel_set_impf !== undefined) { sql += `, vowel_set_impf = ?`; args.push(vowel_set_impf); }
        if (vowel_set_imp !== undefined) { sql += `, vowel_set_imp = ?`; args.push(vowel_set_imp); }
        if (is_geminate !== undefined) { sql += `, is_geminate = ?`; args.push(is_geminate ? 1 : 0); }

        // Always recalculate consonant_array to fix existing data
        const normalized = decodedCons.toLowerCase().trim();
        const arrArr = normalized.split('-').map(c => c.trim());
        sql += `, consonant_array = ?`;
        args.push(JSON.stringify(arrArr));

        if (hidden_forms !== undefined) {
            sql += `, hidden_forms = ?`;
            args.push(JSON.stringify(hidden_forms));
        }

        sql += ` WHERE consonants = ?`;
        args.push(decodedCons);

        await client.execute({ sql, args });

        return json({ success: true });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}
