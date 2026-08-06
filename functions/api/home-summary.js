/**
 * GET /api/home-summary
 * Lightweight endpoint for homepage stats & recently added Semitic / Romance entries.
 * Sets Cache-Control headers for Cloudflare Edge caching to eliminate Turso read spikes.
 */

import { createClient } from '@libsql/client/web';
import { hydrateEntryRow } from '../../src/lib/entryHydration.ts';
import { normalizeSourceMetadata } from '../../src/lib/sourceMetadata.ts';

function firstSenseText(value) {
    if (value === undefined || value === null) return '';
    const text = String(value).trim();
    if (!text) return '';
    return text.split(/\s*;\s*/)[0]?.trim() || '';
}

export async function onRequestGet({ env }) {
    try {
        const tursoUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const dbToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: tursoUrl, authToken: dbToken });

        // Execute 1 combined count query + 2 top-3 sample queries in parallel
        const [
            countsRes,
            semiticEntriesRes,
            romanceEntriesRes
        ] = await Promise.all([
            db.execute(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN source_language IS NULL OR source_language IN ('Arabic', 'Berber') THEN 1 END) as semitic,
                    COUNT(CASE WHEN source_language IN ('Sicilian', 'Italian', 'Latin', 'French', 'Spanish') THEN 1 END) as romance
                FROM entries
            `),
            db.execute({
                sql: `SELECT e.*,
                             json_extract(e.definitions, '$[0].text_en') AS definition_en,
                             json_extract(e.definitions, '$[0].text_mt') AS definition_mt
                      FROM entries e
                      WHERE e.source_language IS NULL OR e.source_language IN ('Arabic', 'Berber')
                      ORDER BY e.created_at DESC
                      LIMIT 3`,
                args: []
            }),
            db.execute({
                sql: `SELECT e.*,
                             json_extract(e.definitions, '$[0].text_en') AS definition_en,
                             json_extract(e.definitions, '$[0].text_mt') AS definition_mt
                      FROM entries e
                      WHERE e.source_language IN ('Sicilian', 'Italian', 'Latin', 'French', 'Spanish')
                      ORDER BY e.created_at DESC
                      LIMIT 3`,
                args: []
            })
        ]);

        const mapEntry = (r) => {
            const mapped = hydrateEntryRow(r);
            const sourceMeta = normalizeSourceMetadata(r);
            return {
                ...mapped,
                definition_en: firstSenseText(r.definition_en),
                definition_mt: firstSenseText(r.definition_mt),
                source_display: sourceMeta.display || '',
                source_tooltip: sourceMeta.tooltip || ''
            };
        };

        const total = Number(countsRes.rows[0]?.total ?? 0);
        const semitic = Number(countsRes.rows[0]?.semitic ?? 0);
        const romance = Number(countsRes.rows[0]?.romance ?? 0);

        return new Response(JSON.stringify({
            counts: { total, semitic, romance },
            semitic: semiticEntriesRes.rows.map(mapEntry),
            romance: romanceEntriesRes.rows.map(mapEntry)
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400'
            }
        });

    } catch (e) {
        console.error("API HOME SUMMARY ERROR:", e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
