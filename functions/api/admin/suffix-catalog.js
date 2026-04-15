import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';
import {
    createSuffixCatalogItem,
    deleteSuffixCatalogItem,
    ensureSuffixCatalogSeeded,
    listSuffixCatalog,
    normalizeSuffixKind,
    normalizeSuffixText,
    updateSuffixCatalogItem,
} from '../_shared/suffixCatalog.js';

export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const client = getDbClient(env);
        const suffixes = await listSuffixCatalog(client);
        return json({ suffixes });
    } catch (error) {
        const { status, body } = toApiErrorPayload(error);
        return json(body, status);
    }
}

export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const client = getDbClient(env);
        const body = await request.json();

        if (body?.action === 'seed-derived') {
            const seeded = await ensureSuffixCatalogSeeded(client);
            return json({ ok: true, seeded });
        }

        const kind = normalizeSuffixKind(body.kind);
        const suffix = normalizeSuffixText(body.suffix);
        const label = String(body.label ?? '').trim();
        const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

        if (!kind) return json({ error: 'kind must be nominal or derivational' }, 400);
        if (!suffix) return json({ error: 'suffix is required' }, 400);
        if (!label) return json({ error: 'label is required' }, 400);

        const created = await createSuffixCatalogItem(client, { kind, suffix, label, sort_order: sortOrder });
        return json({ ok: true, suffix: created }, 201);
    } catch (error) {
        const { status, body } = toApiErrorPayload(error);
        const code = String(body?.error || '').toLowerCase();
        if (status === 500 && code.includes('unique')) {
            return json({ error: 'A suffix with that kind and suffix already exists' }, 409);
        }
        return json(body, status);
    }
}

export async function onRequestPut({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const client = getDbClient(env);
        const body = await request.json();
        const id = String(body.id ?? '').trim();
        const kind = normalizeSuffixKind(body.kind);
        const suffix = normalizeSuffixText(body.suffix);
        const label = String(body.label ?? '').trim();
        const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

        if (!id) return json({ error: 'id is required' }, 400);
        if (!kind) return json({ error: 'kind must be nominal or derivational' }, 400);
        if (!suffix) return json({ error: 'suffix is required' }, 400);
        if (!label) return json({ error: 'label is required' }, 400);

        const updated = await updateSuffixCatalogItem(client, { id, kind, suffix, label, sort_order: sortOrder });
        return json({ ok: true, suffix: updated });
    } catch (error) {
        const { status, body } = toApiErrorPayload(error);
        const code = String(body?.error || '').toLowerCase();
        if (status === 500 && code.includes('unique')) {
            return json({ error: 'A suffix with that kind and suffix already exists' }, 409);
        }
        return json(body, status);
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'id is required' }, 400);

        const client = getDbClient(env);
        const deleted = await deleteSuffixCatalogItem(client, id);
        return json({ ok: true, suffix: deleted });
    } catch (error) {
        const { status, body } = toApiErrorPayload(error);
        return json(body, status);
    }
}

export function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

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
    } catch {
        return false;
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
    return json({ error: 'Unauthorized' }, 401);
}
