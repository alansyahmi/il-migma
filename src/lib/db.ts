import { createClient, type Client, type ResultSet } from '@libsql/client';
import type { Entry, SearchResult, SearchFilters } from '@/types';

// ─── Client Singleton ──────────────────────────────────────────────────────
// NOTE: In production, move all DB calls to Cloudflare Pages Functions
// to avoid exposing the auth token. For now we use the HTTP client which
// works safely in browser environments via Turso's HTTP API.

let _client: Client | null = null;

export function getDbClient(): Client {
    if (!_client) {
        const url = import.meta.env.VITE_TURSO_URL;
        const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;
        if (!url) throw new Error('VITE_TURSO_URL is not set');
        _client = createClient({ url, authToken });
    }
    return _client;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function firstRow<T>(rs: ResultSet): T | null {
    if (rs.rows.length === 0) return null;
    return rs.rows[0] as unknown as T;
}

function allRows<T>(rs: ResultSet): T[] {
    return rs.rows as unknown as T[];
}

// ─── Search ────────────────────────────────────────────────────────────────

/**
 * Basic full-text search (Basic tier).
 * Searches headword and definitions for the query string.
 */
export async function searchEntries(
    query: string,
    filters?: SearchFilters,
    limit = 20,
    offset = 0,
): Promise<SearchResult[]> {
    const db = getDbClient();
    const like = `%${query}%`;

    let sql = `
    SELECT e.*
    FROM entries e
    WHERE (e.headword LIKE ? OR COALESCE(e.definitions, '') LIKE ?)
  `;
    const args: (string | number)[] = [like, like];

    if (filters?.pos && filters.pos.length > 0) {
        sql += ` AND e.pos IN (${filters.pos.map(() => '?').join(',')})`;
        args.push(...filters.pos);
    }

    sql += ` ORDER BY e.headword ASC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const rs = await db.execute({ sql, args });
    return allRows<Entry>(rs).map((entry) => ({
        ...entry,
        match_type: 'fulltext',
    }));
}

/**
 * Semantic search stub (Pro tier).
 * TODO: Implement with Cloudflare Vectorize index.
 * Generate embedding via Gemini embedding model, query Vectorize, return results.
 */
export async function semanticSearch(
    _query: string,
    _limit = 10,
): Promise<SearchResult[]> {
    // TODO: implement with CF Vectorize
    throw new Error('Semantic search requires Pro tier and Cloudflare Vectorize setup.');
}

// ─── Entry Queries ─────────────────────────────────────────────────────────

export async function getEntry(id: string): Promise<Entry | null> {
    const db = getDbClient();
    const rs = await db.execute({
        sql: `SELECT * FROM entries WHERE id = ?`,
        args: [id],
    });
    const row = firstRow<Entry>(rs);
    if (!row) return null;

    // TODO: join related tables (subentries, phonetics, audio, etymology metadata, etc.)
    return row;
}

export async function getRecentEntries(limit = 10): Promise<Entry[]> {
    const db = getDbClient();
    const rs = await db.execute({
        sql: `SELECT * FROM entries ORDER BY created_at DESC LIMIT ?`,
        args: [limit],
    });
    return allRows<Entry>(rs);
}

export async function getRootForms(rootId: string) {
    const db = getDbClient();
    const rs = await db.execute({
        sql: `SELECT rpf.*, r.consonants, p.cv_notation, p.wizen_notation
          FROM root_pattern_forms rpf
          JOIN roots r ON rpf.root_id = r.id
          JOIN patterns p ON rpf.pattern_id = p.id
          WHERE rpf.root_id = ?`,
        args: [rootId],
    });
    return allRows(rs);
}

export async function getEntriesByRoot(rootConsonants: string, limit = 30) {
    const db = getDbClient();
    const rs = await db.execute({
        sql: `SELECT e.* FROM entries e
          JOIN root_pattern_forms rpf ON e.root_pattern_form_id = rpf.id
          JOIN roots r ON rpf.root_id = r.id
          WHERE r.consonants = ?
          LIMIT ?`,
        args: [rootConsonants, limit],
    });
    return allRows<Entry>(rs);
}
