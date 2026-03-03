/**
 * src/lib/api.ts
 * Client-side fetch helpers that call the Cloudflare Pages Functions.
 * All sensitive keys stay server-side in the functions.
 */

import type { Entry, SearchResult } from '@/types';

const BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_APP_URL ?? '');

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${BASE}${path}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...init?.headers },
        ...init,
    });

    if (!res.ok) {
        const text = await res.text();
        let errorMessage = `API Error ${res.status}: ${res.statusText}`;
        try {
            const json = JSON.parse(text);
            errorMessage = json.error || errorMessage;
        } catch {
            errorMessage = `${errorMessage} (Response: ${text.slice(0, 100)}...)`;
        }
        throw new Error(errorMessage);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Expected JSON but got ${contentType || 'unknown'}. Preview: ${text.slice(0, 100)}...`);
    }

    return res.json() as Promise<T>;
}

// ── Search ──────────────────────────────────────────────────────────────────

export interface SearchResponse {
    results: SearchResult[];
    total: number;
    query: string;
}

export async function apiSearch(
    q: string,
    opts: { pos?: string; limit?: number; offset?: number; root_id?: string } = {}
): Promise<SearchResponse> {
    const params = new URLSearchParams({ q });
    if (opts.pos) params.set('pos', opts.pos);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));
    if (opts.root_id) params.set('root_id', opts.root_id);
    return apiFetch(`/api/search?${params}`);
}

export async function apiSearchRoots(radicals: string[]): Promise<{ roots: any[] }> {
    const params = new URLSearchParams();
    radicals.forEach((r, i) => {
        if (r) params.set(`r${i + 1}`, r);
    });
    return apiFetch(`/api/roots/search?${params}`);
}

// ── Single Entry ─────────────────────────────────────────────────────────────

export async function apiGetEntry(id: string): Promise<{ entry: Entry }> {
    return apiFetch(`/api/entry/${id}`);
}

export async function apiGetRoot(id: string): Promise<{ root: any }> {
    return apiFetch(`/api/root/${encodeURIComponent(id)}`);
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function apiChat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    dialect = 'Standard'
): Promise<{ reply: string }> {
    return apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, dialect }),
    });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminListEntries(
    token: string,
    opts: { q?: string; pos?: string; limit?: number; offset?: number } = {}
) {
    const params = new URLSearchParams();
    if (opts.q) params.set('q', opts.q);
    if (opts.pos) params.set('pos', opts.pos);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));
    return apiFetch(`/api/admin/entries?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminCreateEntry(token: string, data: Record<string, unknown>) {
    return apiFetch('/api/admin/entries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminUpdateEntry(token: string, data: Record<string, unknown>) {
    return apiFetch('/api/admin/entries', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminDeleteEntry(token: string, id: string) {
    return apiFetch(`/api/admin/entries?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminBulkDeleteEntries(token: string, ids: string[]) {
    return apiFetch(`/api/admin/entries?ids=${ids.join(',')}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ── Roots Admin ─────────────────────────────────────────────────────────────

export async function adminListRoots(token: string, q?: string) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    return apiFetch<{ roots: any[] }>(`/api/admin/roots?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminGetRoot(token: string, id: string) {
    return apiFetch<{ root: any }>(`/api/admin/roots/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
}

export async function adminCreateRoot(token: string, data: any) {
    return apiFetch('/api/admin/roots', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminUpdateRootHiddenForms(token: string, id: string, hiddenForms: string[]) {
    return apiFetch(`/api/admin/roots/${encodeURIComponent(id)}/hidden-forms`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hidden_forms: hiddenForms }),
    });
}

export async function adminUpdateRoot(token: string, id: string, data: any) {
    return apiFetch(`/api/admin/roots/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminDeleteRoot(token: string, id: string) {
    return apiFetch(`/api/admin/roots?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminBulkDeleteRoots(token: string, ids: string[]) {
    return apiFetch(`/api/admin/roots?ids=${encodeURIComponent(ids.join(','))}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ── Config Admin ─────────────────────────────────────────────────────────────

export async function adminListConfig(token: string, category?: string) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    return apiFetch<{ config: any[] }>(`/api/admin/config?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminCreateConfig(token: string, data: any) {
    return apiFetch('/api/admin/config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminUpdateConfig(token: string, data: any) {
    return apiFetch('/api/admin/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminDeleteConfig(token: string, id: string) {
    return apiFetch(`/api/admin/config?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

// ── DB Tools Admin ───────────────────────────────────────────────────────────

export async function adminDbToolsFetch<T>(token: string, action: string, data: Record<string, any> = {}): Promise<T> {
    return apiFetch<T>('/api/admin/db-tools', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...data }),
    });
}

export async function adminDbQuery(token: string, sql: string, allowWrite = false) {
    return adminDbToolsFetch<{
        columns: string[];
        rows: any[];
        rowsAffected: number;
        elapsed: number;
        error?: string;
        blocked?: boolean;
    }>(token, 'query', { sql, allowWrite });
}

export async function adminDbExport(token: string, table: string) {
    return adminDbToolsFetch<{
        columns: string[];
        rows: any[];
        total: number;
        table: string;
    }>(token, 'export', { table });
}

export async function adminDbIntegrityCheck(token: string) {
    return adminDbToolsFetch<{
        issues: Array<{
            category: string;
            severity: 'error' | 'warning' | 'info';
            count: number;
            details: string[];
            ids?: string[];
        }>;
        checkedAt: string;
    }>(token, 'integrity-check');
}

export async function adminDbBulkUpdate(token: string, table: string, ids: string[], field: string, value: any) {
    return adminDbToolsFetch<{ updated: number; table: string; field: string }>(token, 'bulk-update', { table, ids, field, value });
}

export async function adminDbMergeRoots(token: string, sourceId: string, targetId: string, preview = true) {
    return adminDbToolsFetch<{
        preview?: boolean;
        merged?: boolean;
        source?: any;
        target?: any;
        affectedEntries?: any[];
        affectedForms?: any[];
        sourceDeleted?: string;
        targetKept?: string;
        entriesReassigned?: number;
        formsReassigned?: number;
    }>(token, 'merge-roots', { sourceId, targetId, preview });
}

export async function adminDbTableInfo(token: string) {
    return adminDbToolsFetch<{
        tables: Array<{
            name: string;
            rowCount: number;
            columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean }>;
        }>;
    }>(token, 'table-info');
}

export async function adminCheckIdExists(token: string, table: string, id: string) {
    return adminDbToolsFetch<{ exists: boolean; id: string; table: string }>(token, 'check-id', { table, id });
}
