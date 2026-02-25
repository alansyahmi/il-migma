/**
 * src/lib/api.ts
 * Client-side fetch helpers that call the Cloudflare Pages Functions.
 * All sensitive keys stay server-side in the functions.
 */

import type { Entry, SearchResult } from '@/types';

const BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_APP_URL ?? '');

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...init?.headers },
        ...init,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as any).error ?? res.statusText);
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

// ── Single Entry ─────────────────────────────────────────────────────────────

export async function apiGetEntry(id: string): Promise<{ entry: Entry }> {
    return apiFetch(`/api/entry/${id}`);
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
    opts: { q?: string; limit?: number; offset?: number } = {}
) {
    const params = new URLSearchParams();
    if (opts.q) params.set('q', opts.q);
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
