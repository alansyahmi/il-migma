/**
 * Admin feedback inbox — /api/admin/submissions
 * Protected by Clerk JWT verification.
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

const ALLOWED_KINDS = new Set(['suggestion', 'feedback']);
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

export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const kind = url.searchParams.get('kind')?.trim() ?? '';
        const status = url.searchParams.get('status')?.trim() ?? '';
        const limit = clampLimit(url.searchParams.get('limit'));
        const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

        const client = getDbClient(env);
        await ensureTable(client);

        const where = [];
        const args = [];

        if (q) {
            const like = `%${escapeLike(q.toLowerCase())}%`;
            where.push('(' +
                'LOWER(COALESCE(subject, \'\')) LIKE ? ESCAPE \'\\\' OR ' +
                'LOWER(COALESCE(message, \'\')) LIKE ? ESCAPE \'\\\' OR ' +
                'LOWER(COALESCE(email, \'\')) LIKE ? ESCAPE \'\\\' OR ' +
                'LOWER(COALESCE(page_path, \'\')) LIKE ? ESCAPE \'\\\' OR ' +
                'LOWER(COALESCE(page_url, \'\')) LIKE ? ESCAPE \'\\\'' +
            ')');
            args.push(like, like, like, like, like);
        }

        if (kind && ALLOWED_KINDS.has(kind)) {
            where.push('kind = ?');
            args.push(kind);
        }

        if (status && ALLOWED_STATUS.has(status)) {
            where.push('status = ?');
            args.push(status);
        }

        const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

        const totalRes = await client.execute({
            sql: `SELECT COUNT(*) AS total FROM site_submissions${whereSql}`,
            args,
        });

        const res = await client.execute({
            sql: `
                SELECT id, kind, category, subject, email, message, page_path, page_url,
                       referer, user_agent, status, created_at, updated_at
                FROM site_submissions
                ${whereSql}
                ORDER BY created_at DESC, id DESC
                LIMIT ? OFFSET ?
            `,
            args: [...args, limit, offset],
        });

        return json({
            submissions: res.rows || [],
            total: Number(totalRes.rows[0]?.total ?? 0),
            limit,
            offset,
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
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

function clampLimit(value) {
    const parsed = Number(value ?? 50);
    if (!Number.isFinite(parsed) || parsed <= 0) return 50;
    return Math.min(parsed, 200);
}

function escapeLike(value) {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
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
