/**
 * GET /api/home-summary
 * Lightweight endpoint for homepage stats & recently added Semitic / Romance entries.
 * Uses multi-tier caching (in-memory, Edge Cache API, and app_stats table)
 * to eliminate Turso row-read spikes and keep row reads near zero.
 */

import { createClient } from '@libsql/client/web';
import { hydrateEntryRow } from '../../src/lib/entryHydration.ts';
import { normalizeSourceMetadata } from '../../src/lib/sourceMetadata.ts';

// ── In-Memory Worker Cache (Shared within worker isolate) ─────────────────────
let memoryCache = null;
let memoryCacheTime = 0;
const MEMORY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function firstSenseText(value) {
    if (value === undefined || value === null) return '';
    const text = String(value).trim();
    if (!text) return '';
    return text.split(/\s*;\s*/)[0]?.trim() || '';
}

const SEMITIC_LANGUAGES = new Set(['Arabic', 'Berber']);
const ROMANCE_LANGUAGES = new Set(['Sicilian', 'Italian', 'Latin', 'French', 'Spanish']);

export async function onRequestGet(context) {
    const { request, env, waitUntil } = context;

    // 1. Check in-memory isolate cache (0 Turso reads)
    const now = Date.now();
    if (memoryCache && (now - memoryCacheTime < MEMORY_CACHE_TTL_MS)) {
        return createJsonResponse(memoryCache, 200, 'HIT-MEMORY');
    }

    // 2. Check Cloudflare Edge Cache API (0 Turso reads)
    let edgeCache = null;
    let cacheKey = null;
    try {
        if (typeof caches !== 'undefined' && caches.default && request?.url) {
            edgeCache = caches.default;
            cacheKey = new Request(new URL(request.url).toString(), request);
            const cachedRes = await edgeCache.match(cacheKey);
            if (cachedRes) {
                return cachedRes;
            }
        }
    } catch {
        // Cache API fallback if unavailable in dev
    }

    try {
        const tursoUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const dbToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: tursoUrl, authToken: dbToken });

        // 3. Fast Stats Lookup: Try precomputed app_stats table first (1 row read)
        let counts = { total: 0, semitic: 0, romance: 0 };
        let statsLoaded = false;

        try {
            const statsRes = await db.execute({
                sql: "SELECT value FROM app_stats WHERE key = 'home_summary' LIMIT 1",
                args: []
            });
            if (statsRes.rows && statsRes.rows.length > 0 && statsRes.rows[0].value) {
                const parsed = JSON.parse(String(statsRes.rows[0].value));
                if (parsed && typeof parsed.total === 'number') {
                    counts = {
                        total: Number(parsed.total || 0),
                        semitic: Number(parsed.semitic || 0),
                        romance: Number(parsed.romance || 0)
                    };
                    statsLoaded = true;
                }
            }
        } catch {
            // app_stats table may not exist yet; will compute & auto-heal below
        }

        // If app_stats was not available, compute once and self-heal the table
        if (!statsLoaded) {
            const countsRes = await db.execute(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN source_language IS NULL OR source_language IN ('Arabic', 'Berber') THEN 1 END) as semitic,
                    COUNT(CASE WHEN source_language IN ('Sicilian', 'Italian', 'Latin', 'French', 'Spanish') THEN 1 END) as romance
                FROM entries
            `);
            counts = {
                total: Number(countsRes.rows[0]?.total ?? 0),
                semitic: Number(countsRes.rows[0]?.semitic ?? 0),
                romance: Number(countsRes.rows[0]?.romance ?? 0)
            };

            // Non-blocking auto-heal app_stats table so future cold misses only read 1 row
            const healPromise = (async () => {
                try {
                    await db.execute(`
                        CREATE TABLE IF NOT EXISTS app_stats (
                            key TEXT PRIMARY KEY,
                            value TEXT NOT NULL,
                            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
                        )
                    `);
                    await db.execute({
                        sql: "INSERT OR REPLACE INTO app_stats (key, value, updated_at) VALUES ('home_summary', ?, datetime('now'))",
                        args: [JSON.stringify(counts)]
                    });
                } catch (e) {
                    console.warn("app_stats auto-heal skipped:", e);
                }
            })();

            if (waitUntil) {
                waitUntil(healPromise);
            } else {
                healPromise.catch(() => {});
            }
        }

        // 4. Fast Recently Added: Single indexed scan of latest 35 entries (~35 row reads max)
        // Instead of 2 separate unindexed table scans (44,000 row reads).
        const recentRowsRes = await db.execute({
            sql: `SELECT e.*,
                         json_extract(e.definitions, '$[0].text_en') AS definition_en,
                         json_extract(e.definitions, '$[0].text_mt') AS definition_mt
                  FROM entries e
                  ORDER BY e.created_at DESC
                  LIMIT 35`,
            args: []
        });

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

        const semiticEntries = [];
        const romanceEntries = [];

        for (const row of recentRowsRes.rows) {
            const lang = row.source_language;
            const isSemitic = !lang || SEMITIC_LANGUAGES.has(lang);
            const isRomance = Boolean(lang && ROMANCE_LANGUAGES.has(lang));

            if (semiticEntries.length < 3 && isSemitic) {
                semiticEntries.push(mapEntry(row));
            }
            if (romanceEntries.length < 3 && isRomance) {
                romanceEntries.push(mapEntry(row));
            }
            if (semiticEntries.length >= 3 && romanceEntries.length >= 3) break;
        }

        // Graceful fallback if recent 35 entries were skewed heavily towards one family
        if (romanceEntries.length < 3) {
            try {
                const romRes = await db.execute({
                    sql: `SELECT e.*,
                                 json_extract(e.definitions, '$[0].text_en') AS definition_en,
                                 json_extract(e.definitions, '$[0].text_mt') AS definition_mt
                          FROM entries e
                          WHERE e.source_language IN ('Sicilian', 'Italian', 'Latin', 'French', 'Spanish')
                          ORDER BY e.created_at DESC
                          LIMIT 3`,
                    args: []
                });
                for (const r of romRes.rows) {
                    if (!romanceEntries.some(existing => existing.id === r.id)) {
                        romanceEntries.push(mapEntry(r));
                    }
                    if (romanceEntries.length >= 3) break;
                }
            } catch (err) {
                console.warn("Romance fallback scan skipped:", err);
            }
        }

        const payload = {
            counts,
            semitic: semiticEntries,
            romance: romanceEntries
        };

        // Update in-memory cache
        memoryCache = payload;
        memoryCacheTime = Date.now();

        const response = createJsonResponse(payload, 200, 'MISS');

        // Store in Cloudflare Edge Cache API if available
        if (edgeCache && cacheKey) {
            const cachePutPromise = edgeCache.put(cacheKey, response.clone());
            if (waitUntil) {
                waitUntil(cachePutPromise);
            } else {
                cachePutPromise.catch(() => {});
            }
        }

        return response;

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

function createJsonResponse(data, status = 200, cacheStatus = 'MISS') {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=120, s-maxage=3600, stale-while-revalidate=86400',
            'X-Summary-Cache': cacheStatus
        }
    });
}
