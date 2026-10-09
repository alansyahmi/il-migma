/**
 * Admin entries bulk import / upsert — /api/admin/entries/bulk
 * Protected by Clerk JWT verification.
 */
import { getDbClient, toApiErrorPayload } from '../../../lib/dbClient.js';
import { processEntryBatch, verifyAdmin } from '../entries.js';

export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) {
            return json({ error: 'Unauthorized' }, 401);
        }
        const body = await request.json();
        const client = getDbClient(env);
        const result = await processEntryBatch(client, {
            entries: body.entries || [],
            skipExisting: !!body.skipExisting,
        });
        return json(result);
    } catch (e) {
        const { status, body } = toApiErrorPayload(e);
        return json(body, status);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            ...extraHeaders,
        },
    });
}
