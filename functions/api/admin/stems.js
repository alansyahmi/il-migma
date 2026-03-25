/**
 * Admin stems aggregation — /api/admin/stems
 * Protected by Clerk JWT verification.
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

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

export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const limit = parseInt(url.searchParams.get('limit') || '500', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        const client = getDbClient(env);

        let sql = `
            SELECT 
                json_extract(zokk_morphology, '$.stem_string') as id,
                json_extract(zokk_morphology, '$.stem_string') as stem_string,
                json_extract(zokk_morphology, '$.class_type') as class_type,
                json_extract(zokk_morphology, '$.is_hybrid') as is_hybrid,
                json_extract(zokk_morphology, '$.root') as root,
                json_extract(zokk_morphology, '$.agentive_suffix') as agentive_suffix,
                COUNT(id) as entry_count,
                MIN(created_at) as created_at
            FROM entries
            WHERE is_loanword = 1 AND json_valid(zokk_morphology) = 1
              AND json_extract(zokk_morphology, '$.stem_string') IS NOT NULL
        `;

        const args = [];
        if (q) {
            sql += ` AND json_extract(zokk_morphology, '$.stem_string') LIKE ?`;
            args.push(`%${q}%`);
        }

        sql += ` GROUP BY json_extract(zokk_morphology, '$.stem_string') ORDER BY stem_string ASC LIMIT ? OFFSET ?`;
        args.push(limit, offset);

        const res = await client.execute({ sql, args });
        
        // Clean up the output to match frontend expectations (handling boolean conversion if necessary)
        const stems = res.rows.map(row => ({
            ...row,
            is_hybrid: row.is_hybrid === 1 || row.is_hybrid === 'true' || row.is_hybrid === true
        }));

        return json({ stems });
    } catch (e) {
        return internalError(e);
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
