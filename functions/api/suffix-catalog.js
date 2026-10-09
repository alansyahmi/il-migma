import { getDbClient, toApiErrorPayload } from '../lib/dbClient.js';
import { listSuffixCatalog } from './_shared/suffixCatalog.js';

let cachedSuffixes = null;
let cachedTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function onRequestGet({ env }) {
    try {
        const now = Date.now();
        if (cachedSuffixes && (now - cachedTime < CACHE_TTL_MS)) {
            return json({ suffixes: cachedSuffixes });
        }

        const client = getDbClient(env);
        const suffixes = await listSuffixCatalog(client);
        cachedSuffixes = suffixes;
        cachedTime = now;

        return json({ suffixes });
    } catch (error) {
        const { status, body } = toApiErrorPayload(error);
        return json(body, status);
    }
}

function json(data, status = 200) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };
    if (status === 200) {
        headers['Cache-Control'] = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
    }
    return new Response(JSON.stringify(data), {
        status,
        headers,
    });
}
