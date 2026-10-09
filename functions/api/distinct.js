/**
 * GET /api/distinct?type=[tags|vowel_sets|sources|source_languages|suffixes]
 * Returns unique values found in the database for the requested type.
 */

import { createClient } from '@libsql/client/web';
import { listSuffixCatalog } from './_shared/suffixCatalog.js';

// ── In-Memory Worker Cache (Shared within worker isolate) ─────────────────────
const distinctCache = new Map();
const DISTINCT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const type = url.searchParams.get('type');
        if (!type) return new Response(JSON.stringify({ error: "Missing type parameter" }), { status: 400 });

        const now = Date.now();
        const cached = distinctCache.get(type);
        if (cached && (now - cached.timestamp < DISTINCT_CACHE_TTL_MS)) {
            return new Response(JSON.stringify(cached.values), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
                    'X-Distinct-Cache': 'HIT-MEMORY'
                },
            });
        }
        
        const tursoUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const dbToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: tursoUrl, authToken: dbToken });

        let sql = '';
        let transform = (rows) => rows.map(r => r.val).filter(Boolean);

        if (type === 'tags') {
            sql = `
                SELECT DISTINCT name as val
                FROM tags
                ORDER BY val ASC
            `;
        } else if (type === 'vowel_sets') {
            sql = `
                SELECT DISTINCT vowel_set_perf as val FROM verb_morphology WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_impf as val FROM verb_morphology WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_impv as val FROM verb_morphology WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_sg as val FROM noun_morphology WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_opp as val FROM noun_morphology WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_dual as val FROM noun_morphology WHERE val IS NOT NULL AND val != ''
                UNION
                SELECT DISTINCT vowel_set_pl as val FROM noun_morphology WHERE val IS NOT NULL AND val != ''
                ORDER BY val ASC
            `;
        } else if (type === 'sources') {
            sql = `
                SELECT DISTINCT full_title as val
                FROM lexical_sources
                WHERE val IS NOT NULL AND val != ''
                ORDER BY val ASC
            `;
        } else if (type === 'source_languages') {
            sql = `
                SELECT DISTINCT source_language as val
                FROM entries
                WHERE source_language IS NOT NULL AND source_language != ''
                ORDER BY val ASC
            `;
        } else if (type === 'suffixes') {
            const values = await listSuffixCatalog(db);
            distinctCache.set(type, { values, timestamp: Date.now() });

            return new Response(JSON.stringify(values), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
                    'X-Distinct-Cache': 'MISS'
                },
            });
        } else {
            return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400 });
        }
        
        const result = await db.execute(sql);
        const values = transform(result.rows);
        distinctCache.set(type, { values, timestamp: Date.now() });

        return new Response(JSON.stringify(values), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
                'X-Distinct-Cache': 'MISS'
            },
        });
    } catch (e) {
        console.error("API DISTINCT ERROR:", e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
