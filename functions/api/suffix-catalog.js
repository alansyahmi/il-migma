import { getDbClient, toApiErrorPayload } from '../lib/dbClient.js';
import { listSuffixCatalog } from './_shared/suffixCatalog.js';

export async function onRequestGet({ env }) {
    try {
        const client = getDbClient(env);
        const suffixes = await listSuffixCatalog(client);
        return json({ suffixes });
    } catch (error) {
        const { status, body } = toApiErrorPayload(error);
        return json(body, status);
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
