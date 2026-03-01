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
    opts: { pos?: string; limit?: number; offset?: number } = {}
): Promise<SearchResponse> {
    const params = new URLSearchParams({ q });
    if (opts.pos) params.set('pos', opts.pos);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));
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

export async function apiGetRoot(consonants: string): Promise<{ root: any }> {
    return apiFetch(`/api/root/${encodeURIComponent(consonants)}`);
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

// ── Roots Admin ─────────────────────────────────────────────────────────────

export async function adminListRoots(token: string, q?: string) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    return apiFetch<{ roots: any[] }>(`/api/admin/roots?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminGetRoot(token: string, consonants: string) {
    return apiFetch<{ root: any }>(`/api/admin/roots/${encodeURIComponent(consonants)}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
}

export async function adminCreateRoot(token: string, data: { consonants: string; notes?: string }) {
    return apiFetch('/api/admin/roots', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminUpdateRootHiddenForms(token: string, consonants: string, hiddenForms: string[]) {
    return apiFetch(`/api/admin/roots/${encodeURIComponent(consonants)}/hidden-forms`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hidden_forms: hiddenForms }),
    });
}

export async function adminUpdateRoot(token: string, consonants: string, data: any) {
    return apiFetch(`/api/admin/roots/${encodeURIComponent(consonants)}`, {
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

