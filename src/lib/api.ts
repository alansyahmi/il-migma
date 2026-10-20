/**
 * src/lib/api.ts
 * Client-side fetch helpers that call the Cloudflare Pages Functions.
 * All sensitive keys stay server-side in the functions.
 */

import type { Entry, SearchResult } from '@/types';
import {
    DEBUG_ENTRIES,
    DEBUG_ROOTS,
    DEBUG_STEMS,
    getDebugEntry,
    getDebugRoot,
    getDebugStem,
    searchDebugEntries,
} from '../data/debugEntries';
import type {
    SubmissionBulkRequest,
    SubmissionBulkResponse,
    SubmissionListFilters,
    SubmissionListResponse,
    SubmissionPayload,
    SubmissionStatus,
} from './submissions';
import { matchesMalteseLetter } from './malteseAlphabet';

const BASE = '';

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
            const baseMessage = json.error || errorMessage;
            errorMessage = json.code ? `${baseMessage} [${json.code}]` : baseMessage;
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

export interface HomeSummaryResponse {
    counts: {
        total: number;
        semitic: number;
        romance: number;
    };
    semitic: SearchResult[];
    romance: SearchResult[];
}

let clientHomeSummaryCache: { data: HomeSummaryResponse; timestamp: number } | null = null;
let clientHomeSummaryPromise: Promise<HomeSummaryResponse> | null = null;
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function apiGetHomeSummary(forceRefresh = false): Promise<HomeSummaryResponse> {
    const now = Date.now();
    if (!forceRefresh && clientHomeSummaryCache && (now - clientHomeSummaryCache.timestamp < CLIENT_CACHE_TTL)) {
        return clientHomeSummaryCache.data;
    }

    if (!forceRefresh && clientHomeSummaryPromise) {
        return clientHomeSummaryPromise;
    }

    clientHomeSummaryPromise = (async () => {
        try {
            const data = await apiFetch<HomeSummaryResponse>('/api/home-summary');
            clientHomeSummaryCache = { data, timestamp: Date.now() };
            return data;
        } catch {
            const semiticResults = searchDebugEntries('', { source_language: 'Semitic' }).results.slice(0, 10);
            const romanceResults = searchDebugEntries('', { source_language: 'Romance' }).results.slice(0, 10);
            return {
                counts: {
                    total: DEBUG_ENTRIES.length,
                    semitic: DEBUG_ENTRIES.filter((e) => e.source_language === 'Semitic').length,
                    romance: DEBUG_ENTRIES.filter((e) => e.source_language === 'Romance').length,
                },
                semitic: semiticResults,
                romance: romanceResults,
            };
        } finally {
            clientHomeSummaryPromise = null;
        }
    })();

    return clientHomeSummaryPromise;
}

export interface StemApiItem {
    id: string;
    stem_string: string;
    class_type: 'ar' | 'ir';
    is_hybrid: boolean;
    root: string | null;
    agentive_suffix: string | null;
    tags?: string[];
    source?: string | null;
    glosses?: Array<{ en: string; mt: string }>;
    etymology?: Record<string, unknown>;
    synonyms?: any[];
    antonyms?: any[];
    related_stems?: any[];
    entry_count?: number;
    entry_ids?: string[];
    created_at?: string;
    updated_at?: string;
}

export async function apiSearch(
    q: string,
    opts: {
        pos?: string;
        type?: string;
        weak_class?: string;
        noun_type?: string;
        limit?: number;
        offset?: number;
        root_id?: string;
        v?: string;
        form?: string;
        wizen?: string;
        verb_type?: string;
        source?: string;
        source_language?: string;
        suffix?: string;
        suffix_kind?: 'nominal' | 'derivational';
        gender?: string;
        radicals?: string[];
        random?: string;
        regex?: boolean;
        searchLemma?: boolean;
        searchWordForms?: boolean;
        searchEnglishGloss?: boolean;
        includeSuggested?: boolean;
        includePending?: boolean;
        recent?: boolean;
        lp?: string;
        fp?: string;
        mp?: string;
        pp?: string;
        dp?: string;
        ep?: string;
        dmp?: string;
        tag?: string;
        register?: string;
        vs_sg?: string;
        vs_opp?: string;
        vs_pl?: string;
        zokk?: boolean;
        stem_string?: string;
        forms?: string[];
        signal?: AbortSignal;
    } = {}

): Promise<SearchResponse> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (opts.pos) params.set('pos', opts.pos);
    if (opts.type) params.set('type', opts.type);
    if (opts.weak_class) params.set('weak_class', opts.weak_class);
    if (opts.noun_type) params.set('noun_type', opts.noun_type);
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.offset !== undefined) params.set('offset', String(opts.offset));
    if (opts.root_id) params.set('root_id', opts.root_id);
    if (opts.v) params.set('v', opts.v);
    if (opts.forms?.length) {
        opts.forms.forEach((form) => {
            if (form) params.append('form', form);
        });
    } else if (opts.form) params.set('form', opts.form);
    if (opts.wizen) params.set('wizen', opts.wizen);
    if (opts.verb_type) params.set('verb_type', opts.verb_type);
    if (opts.source) params.set('source', opts.source);
    if (opts.source_language) params.set('source_language', opts.source_language);
    if (opts.suffix) params.set('suffix', opts.suffix);
    if (opts.suffix_kind) params.set('suffix_kind', opts.suffix_kind);
    if (opts.gender) params.set('gender', opts.gender);
    if (opts.random) params.set('random', opts.random);
    if (opts.regex) params.set('regex', 'true');
    if (opts.searchLemma) params.set('lemma', 'true');
    if (opts.searchWordForms) params.set('word_forms', 'true');
    if (opts.searchEnglishGloss) params.set('gloss', 'true');
    if (opts.includeSuggested) params.set('suggested', 'true');
    if (opts.random) params.set('random', opts.random);
    if (opts.regex) params.set('regex', 'true');
    if (opts.searchLemma) params.set('lemma', 'true');
    if (opts.searchWordForms) params.set('word_forms', 'true');
    if (opts.searchEnglishGloss) params.set('gloss', 'true');
    if (opts.includeSuggested) params.set('suggested', 'true');
    if (opts.includePending) params.set('pending', 'true');
    if (opts.recent) params.set('recent', 'true');
    if (opts.lp) params.set('lp', opts.lp);
    if (opts.fp) params.set('fp', opts.fp);
    if (opts.mp) params.set('mp', opts.mp);
    if (opts.pp) params.set('pp', opts.pp);
    if (opts.dp) params.set('dp', opts.dp);
    if (opts.ep) params.set('ep', opts.ep);
    if (opts.dmp) params.set('dmp', opts.dmp);
    if (opts.tag) params.set('tag', opts.tag);
    if (opts.register) params.set('register', opts.register);
    if (opts.vs_sg) params.set('vs_sg', opts.vs_sg);
    if (opts.vs_opp) params.set('vs_opp', opts.vs_opp);
    if (opts.vs_pl) params.set('vs_pl', opts.vs_pl);
    if (opts.zokk) params.set('zokk', 'true');
    if (opts.stem_string) params.set('stem_string', opts.stem_string);
    if (opts.radicals) {
        opts.radicals.forEach((r, i) => {
            if (r) params.set(`r${i + 1}`, r);
        });
    }

    const debugRes = searchDebugEntries(q, opts);
    try {
        const apiRes = await apiFetch<SearchResponse>(`/api/search?${params}`, { signal: opts.signal });
        if (apiRes && Array.isArray(apiRes.results)) {
            return apiRes;
        }
        return debugRes;
    } catch {
        return debugRes;
    }
}

export async function apiGetRandomEntry(signal?: AbortSignal): Promise<{ results: SearchResult[] }> {
    try {
        return await apiFetch<{ results: SearchResult[] }>('/api/random', { signal });
    } catch {
        const randomItem = DEBUG_ENTRIES[Math.floor(Math.random() * DEBUG_ENTRIES.length)];
        return {
            results: randomItem
                ? [
                      {
                          id: randomItem.id,
                          headword: randomItem.headword,
                          pos: randomItem.pos,
                          gloss_en: randomItem.definitions?.[0]?.text_en,
                          gloss_mt: randomItem.definitions?.[0]?.text_mt || undefined,
                          definition_en: randomItem.definitions?.[0]?.text_en,
                          definition_mt: randomItem.definitions?.[0]?.text_mt || undefined,
                      },
                  ]
                : [],
        };
    }
}

export async function apiSearchRoots(radicals: string[]): Promise<{ roots: any[] }> {
    try {
        const params = new URLSearchParams();
        radicals.forEach((r, i) => {
            if (r) params.set(`r${i + 1}`, r);
        });
        return await apiFetch(`/api/roots/search?${params}`);
    } catch {
        const str = radicals.join('-').toLowerCase();
        const found = DEBUG_ROOTS.filter(
            (r) =>
                r.consonants.toLowerCase().includes(str) ||
                r.consonant_array.every((rad) => radicals.includes(rad)),
        );
        return { roots: found.length > 0 ? found : DEBUG_ROOTS };
    }
}

/** Specific helper for auto-populating entry fields from root data */
export async function apiLookupRootByConsonants(consonants: string): Promise<any | null> {
    if (!consonants.trim()) return null;
    const debug = getDebugRoot(consonants);
    try {
        const radicals = consonants.toLowerCase().split('-').map((r) => r.trim());
        const res = await apiSearchRoots(radicals);
        return res.roots.find((r) => r.consonants.toLowerCase() === consonants.toLowerCase()) || res.roots[0] || debug || null;
    } catch {
        return debug || null;
    }
}

// ── Generic Dynamic Options ──────────────────────────────────────────────────

const distinctValuesCache = new Map<'tags' | 'vowel_sets' | 'sources' | 'source_languages', Promise<string[]>>();

export async function apiGetDistinctValues(type: 'tags' | 'vowel_sets' | 'sources' | 'source_languages'): Promise<string[]> {
    const cached = distinctValuesCache.get(type);
    if (cached) return cached;

    const request = apiFetch<string[]>(`/api/distinct?type=${type}`).catch((err) => {
        distinctValuesCache.delete(type);
        throw err;
    });
    distinctValuesCache.set(type, request);
    return request;
}

export function invalidateDistinctValuesCache(type?: 'tags' | 'vowel_sets' | 'sources' | 'source_languages') {
    if (type) {
        distinctValuesCache.delete(type);
        return;
    }
    distinctValuesCache.clear();
}

export interface SuffixCatalogItem {
    id?: string;
    kind: 'nominal' | 'derivational';
    label: string;
    suffix: string;
    count: number;
    sort_order?: number;
    sample_headword?: string;
    sample_pos?: string;
}

export async function apiGetSuffixCatalog(): Promise<SuffixCatalogItem[]> {
    const res = await apiFetch<{ suffixes: SuffixCatalogItem[] }>('/api/suffix-catalog');
    return Array.isArray(res.suffixes) ? res.suffixes : [];
}

export async function adminListSuffixCatalog(token: string): Promise<{ suffixes: SuffixCatalogItem[] }> {
    return apiFetch('/api/admin/suffix-catalog', {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminCreateSuffixCatalog(
    token: string,
    data: { kind: 'nominal' | 'derivational'; suffix: string; label: string; sort_order?: number },
) {
    return apiFetch('/api/admin/suffix-catalog', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminUpdateSuffixCatalog(
    token: string,
    id: string,
    data: { kind: 'nominal' | 'derivational'; suffix: string; label: string; sort_order?: number },
) {
    return apiFetch('/api/admin/suffix-catalog', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, ...data }),
    });
}

export async function adminDeleteSuffixCatalog(token: string, id: string) {
    return apiFetch(`/api/admin/suffix-catalog?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

/** Legacy wrapper or convenience */
export async function apiGetTags(): Promise<string[]> {
    return apiGetDistinctValues('tags');
}

// ── Single Entry ─────────────────────────────────────────────────────────────

export async function apiGetEntry(id: string, signal?: AbortSignal): Promise<{ entry: Entry }> {
    const debug = getDebugEntry(id);
    try {
        const res = await apiFetch<{ entry: Entry }>(`/api/entry/${id}`, { signal });
        if (res && res.entry) return res;
        if (debug) return { entry: debug };
        return res;
    } catch (err) {
        if (debug) {
            return { entry: debug };
        }
        throw err;
    }
}

export async function apiGetRoot(id: string, signal?: AbortSignal): Promise<{ root: any }> {
    const debug = getDebugRoot(id);
    try {
        const res = await apiFetch<{ root: any }>(`/api/root/${encodeURIComponent(id)}`, { signal });
        if (res && res.root) return res;
        if (debug) return { root: debug };
        return res;
    } catch (err) {
        if (debug) {
            return { root: debug };
        }
        throw err;
    }
}

export interface PatternDetailEntry {
    id: string;
    headword: string;
    pos: string;
    root_id?: string | null;
    root_consonants?: string | null;
    definition?: string | null;
    inflections_pl?: string[] | string | null;
    plural_display?: string | null;
    match_role?: 'dual' | 'plural' | 'derivational' | 'other' | null;
    match_display_value?: string | null;
    match_source_field?: string | null;
    pos_group_key?: string;
    pos_group_label?: string;
    morphology_group_key?: string;
    morphology_group_label?: string;
}

export interface PatternDetailGroup {
    key: string;
    label: string;
    count: number;
    entries: PatternDetailEntry[];
}

export interface PatternDetailResponse {
    pattern: PatternApiItem;
    roles: PatternApiApplicability[];
    entries: PatternDetailEntry[];
    entry_groups: {
        pos: PatternDetailGroup[];
        morphology: PatternDetailGroup[];
    };
}

export async function apiGetPattern(id: string, signal?: AbortSignal): Promise<PatternDetailResponse> {
    return apiFetch(`/api/pattern/${encodeURIComponent(id)}`, { signal });
}

export interface PatternApiApplicability {
    category?: string;
    pos?: string;
    role?: string;
    gender?: string;
    stress?: number;
    sort_order?: number;
}

export interface PatternApiItem {
    id: string;
    cv_notation: string;
    wizen_notation: string;
    description?: string | null;
    example_word?: string | null;
    applicability?: PatternApiApplicability[];
}

export async function apiGetStem(id: string, signal?: AbortSignal): Promise<{ stem: StemApiItem }> {
    return apiFetch(`/api/stem/${encodeURIComponent(id)}`, { signal });
}

export async function apiSearchStems(q: string, limit = 10): Promise<{ stems: any[] }> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', String(limit));
    return apiFetch(`/api/stems/search?${params}`);
}

export async function apiListPatterns(): Promise<{ patterns: PatternApiItem[] }> {
    return apiFetch('/api/patterns');
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

// ── Community Submissions ───────────────────────────────────────────────────

export async function apiSubmitSubmission(payload: SubmissionPayload): Promise<void> {
    await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function adminListSubmissions(
    token: string,
    opts: SubmissionListFilters = {}
): Promise<SubmissionListResponse> {
    const params = new URLSearchParams();
    if (opts.q) params.set('q', opts.q);
    if (opts.kind && opts.kind !== 'all') params.set('kind', opts.kind);
    if (opts.status && opts.status !== 'all') params.set('status', opts.status);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));

    return apiFetch(`/api/admin/submissions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminUpdateSubmission(
    token: string,
    id: string,
    data: { status: SubmissionStatus }
): Promise<{ ok: boolean; id: string; status: SubmissionStatus }> {
    return apiFetch(`/api/admin/submissions/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminDeleteSubmission(token: string, id: string): Promise<{ ok: boolean; id: string }> {
    return apiFetch(`/api/admin/submissions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminBulkSubmissions(
    token: string,
    payload: SubmissionBulkRequest
): Promise<SubmissionBulkResponse> {
    return apiFetch('/api/admin/submissions/bulk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminListEntries(
    token: string,
    opts: { q?: string; pos?: string; letter?: string; limit?: number; offset?: number; signal?: AbortSignal; skipCount?: boolean } = {}
) {
    const params = new URLSearchParams();
    if (opts.q) params.set('q', opts.q);
    if (opts.pos) params.set('pos', opts.pos);
    if (opts.letter && opts.letter.toLowerCase() !== 'all') params.set('letter', opts.letter);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));
    if (opts.skipCount) params.set('skipCount', 'true');
    try {
        return await apiFetch<{ entries: Entry[]; total: number }>(`/api/admin/entries?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: opts.signal,
        });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw err;
        }
        const queryNorm = (opts.q || '').toLowerCase();
        const filtered = DEBUG_ENTRIES.filter((e) => {
            if (opts.pos && e.pos !== opts.pos) return false;
            if (opts.letter && !matchesMalteseLetter(e.headword, opts.letter)) return false;
            if (!queryNorm) return true;
            return e.headword.toLowerCase().includes(queryNorm) || e.id.toLowerCase().includes(queryNorm);
        });
        const total = filtered.length;
        const limit = opts.limit ?? 15;
        const offset = opts.offset ?? 0;
        const paginated = filtered.slice(offset, offset + limit).map((e) => {
            const defs = e.definitions || [];
            const text_en = (e as any).text_en || defs[0]?.text_en || '';
            const text_mt = (e as any).text_mt || defs.find((d: any) => d?.text_mt)?.text_mt || defs[0]?.text_mt || '';
            const etyChain = (e as any).etymology_chain || [];
            const arabicStep = Array.isArray(etyChain)
                ? etyChain.find((step: any) => step && (String(step.language || '').trim().toLowerCase() === 'arabic' || /[\u0600-\u06FF]/.test(step.term || '')))
                : null;
            const arabic = (e as any).arabic || arabicStep?.term || undefined;

            return {
                ...e,
                stem: (e as any).stem || undefined,
                arabic,
                text_en,
                text_mt,
            };
        });
        return { entries: paginated, total };
    }
}

export async function adminCreateEntry(token: string, data: Record<string, unknown>) {
    try {
        return await apiFetch('/api/admin/entries', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
    } catch (err) {
        if (data.id && typeof data.id === 'string') {
            const existingIdx = DEBUG_ENTRIES.findIndex((e) => e.id === data.id);
            if (existingIdx >= 0) {
                DEBUG_ENTRIES[existingIdx] = { ...DEBUG_ENTRIES[existingIdx], ...data } as Entry;
            } else {
                DEBUG_ENTRIES.push(data as unknown as Entry);
            }
            return { ok: true, id: data.id, message: 'Saved to local debug entries' };
        }
        throw err;
    }
}

export async function adminUpdateEntry(token: string, data: Record<string, unknown>) {
    try {
        return await apiFetch('/api/admin/entries', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
    } catch (err) {
        if (data.id && typeof data.id === 'string') {
            const existingIdx = DEBUG_ENTRIES.findIndex((e) => e.id === data.id);
            if (existingIdx >= 0) {
                DEBUG_ENTRIES[existingIdx] = { ...DEBUG_ENTRIES[existingIdx], ...data } as Entry;
                return { ok: true, id: data.id, message: 'Updated in local debug entries' };
            }
        }
        throw err;
    }
}

export async function adminDeleteEntry(token: string, id: string) {
    try {
        return await apiFetch(`/api/admin/entries?id=${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (err) {
        const existingIdx = DEBUG_ENTRIES.findIndex((e) => e.id === id);
        if (existingIdx >= 0) {
            DEBUG_ENTRIES.splice(existingIdx, 1);
            return { ok: true, id, message: 'Deleted from local debug entries' };
        }
        throw err;
    }
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
    try {
        return await apiFetch<{ roots: any[] }>(`/api/admin/roots?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch {
        const queryNorm = (q || '').toLowerCase();
        const filtered = DEBUG_ROOTS.filter((r) =>
            r.consonants.toLowerCase().includes(queryNorm) ||
            r.id.toLowerCase().includes(queryNorm) ||
            (r.gloss_en && r.gloss_en.toLowerCase().includes(queryNorm)) ||
            (r.gloss_mt && r.gloss_mt.toLowerCase().includes(queryNorm))
        );
        return { roots: filtered };
    }
}

export async function adminListStems(token: string, q?: string, limit = 500, offset = 0) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    try {
        return await apiFetch<{ stems: any[] }>(`/api/admin/stems?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch {
        const queryNorm = (q || '').toLowerCase();
        const filtered = DEBUG_STEMS.filter((s) => s.stem_string.toLowerCase().includes(queryNorm));
        return { stems: filtered };
    }
}

export async function adminGetStem(token: string, id: string) {
    const debug = getDebugStem(id);
    try {
        const res = await apiFetch<{ stem: StemApiItem }>(`/api/admin/stems/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res && res.stem) return res;
        if (debug) return { stem: debug };
        return res;
    } catch (err) {
        if (debug) {
            return { stem: debug };
        }
        throw err;
    }
}

export async function adminCreateStem(token: string, data: Record<string, unknown>) {
    try {
        return await apiFetch<{ stem_string: string; created: boolean }>('/api/admin/stems', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
    } catch (err) {
        const stemString = String(data.stem_string || '').trim();
        const existingIdx = DEBUG_STEMS.findIndex((s) => s.stem_string === stemString || s.id === data.id);
        const newStem: StemApiItem = {
            id: String(data.id || `stem-${stemString}`),
            stem_string: stemString,
            class_type: (data.class_type as any) || 'ar',
            is_hybrid: !!data.is_hybrid,
            root: (data.root as string) || null,
            agentive_suffix: (data.agentive_suffix as string) || null,
            tags: Array.isArray(data.tags) ? data.tags : typeof data.tags === 'string' ? (data.tags.startsWith('[') ? JSON.parse(data.tags) : data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : [],
            source: (data.source as string) || null,
            glosses: Array.isArray(data.glosses) ? data.glosses : [],
            ...data,
        };
        if (existingIdx >= 0) {
            DEBUG_STEMS[existingIdx] = newStem;
        } else {
            DEBUG_STEMS.push(newStem);
        }
        return { stem_string: stemString, created: true, ok: true };
    }
}

export async function adminUpdateStem(token: string, id: string, data: Record<string, unknown>) {
    try {
        return await apiFetch<{ success: boolean; stem_string: string }>(`/api/admin/stems/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
    } catch (err) {
        const existingIdx = DEBUG_STEMS.findIndex((s) => s.id === id || s.stem_string === id);
        if (existingIdx >= 0) {
            DEBUG_STEMS[existingIdx] = {
                ...DEBUG_STEMS[existingIdx],
                ...data,
                stem_string: (data.stem_string as string) || DEBUG_STEMS[existingIdx].stem_string,
            };
            return { success: true, stem_string: DEBUG_STEMS[existingIdx].stem_string, ok: true };
        }
        throw err;
    }
}

export async function adminDeleteStem(token: string, id: string) {
    try {
        return await apiFetch<{ id: string; deleted: boolean }>(`/api/admin/stems?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (err) {
        const existingIdx = DEBUG_STEMS.findIndex((s) => s.id === id || s.stem_string === id);
        if (existingIdx >= 0) {
            DEBUG_STEMS.splice(existingIdx, 1);
            return { id, deleted: true, ok: true };
        }
        throw err;
    }
}

export async function adminSyncStemEtymology(token: string, commit = false) {
    return apiFetch<{
        committed: boolean;
        examined: number;
        updated: number;
        skipped: number;
        logs: string[];
        samples: Array<Record<string, unknown>>;
    }>('/api/admin/sync-stems', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commit }),
    });
}

export async function adminSyncRootEtymology(token: string, commit = false) {
    return apiFetch<{
        committed: boolean;
        examined: number;
        updated: number;
        skipped: number;
        logs: string[];
        samples: Array<Record<string, unknown>>;
    }>('/api/admin/sync-roots', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commit }),
    });
}

export async function adminGetRoot(token: string, id: string) {
    const debug = getDebugRoot(id);
    try {
        const res = await apiFetch<{ root: any }>(`/api/admin/roots/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res && res.root) return res;
        if (debug) return { root: debug };
        return res;
    } catch (err) {
        if (debug) {
            return { root: debug };
        }
        throw err;
    }
}

export async function adminCreateRoot(token: string, data: any) {
    try {
        return await apiFetch('/api/admin/roots', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
    } catch (err: any) {
        const consonants = String(data.consonants || '').trim();
        const id = String(data.id || '').trim() || `root-${consonants.replace(/\s+/g, '-').replace(/[^a-z0-9\u0127\u0126\u010b\u010a\u0121\u0120\u017c\u017b\u0127-]/gi, '')}`;
        const existingIdx = DEBUG_ROOTS.findIndex((r) => r.id === id || r.consonants === consonants);
        if (existingIdx >= 0 && !data.force) {
            throw new Error('DUPLICATE_CONSONANTS');
        }
        let glosses: Array<{ en?: string; mt?: string }> = [];
        if (Array.isArray(data.glosses)) {
            glosses = data.glosses;
        } else if (typeof data.gloss === 'string') {
            try { glosses = JSON.parse(data.gloss); } catch {}
        }
        const newRoot: any = {
            id,
            consonants,
            consonant_array: Array.isArray(data.consonant_array) ? data.consonant_array : (consonants.includes('-') ? consonants.split('-') : consonants.split('')),
            gloss_en: glosses[0]?.en || data.gloss_en || (typeof data.gloss === 'string' && !data.gloss.startsWith('[') ? data.gloss : ''),
            gloss_mt: glosses[0]?.mt || data.gloss_mt || '',
            type: data.type || 'Semitic',
            strength: data.strength || 'strong',
            weak_class: data.weak_class || 'none',
            vowel_set_perf: data.vowel_set_perf || 'a-a',
            vowel_set_impf: data.vowel_set_impf || 'i-a',
            vowel_set_imp: data.vowel_set_imp || 'i-a',
            is_imala_blocked: data.is_imala_blocked,
            source: data.source || undefined,
            tags: Array.isArray(data.tags) ? data.tags : typeof data.tags === 'string' ? (data.tags.startsWith('[') ? JSON.parse(data.tags) : data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : [],
            ...data,
        };
        if (existingIdx >= 0) {
            DEBUG_ROOTS[existingIdx] = newRoot;
        } else {
            DEBUG_ROOTS.push(newRoot);
        }
        return { ok: true, root: newRoot, message: 'Saved to local debug roots' };
    }
}

export async function adminUpdateRootHiddenForms(token: string, id: string, hiddenForms: string[]) {
    try {
        return await apiFetch(`/api/admin/roots/${encodeURIComponent(id)}/hidden-forms`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ hidden_forms: hiddenForms }),
        });
    } catch (err) {
        const existingIdx = DEBUG_ROOTS.findIndex((r) => r.id === id || r.consonants === id);
        if (existingIdx >= 0) {
            (DEBUG_ROOTS[existingIdx] as any).hidden_forms = hiddenForms;
            return { ok: true, message: 'Updated hidden forms in local debug root' };
        }
        throw err;
    }
}

export async function adminUpdateRoot(token: string, id: string, data: any) {
    try {
        return await apiFetch(`/api/admin/roots/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
    } catch (err) {
        const targetId = data._oldId || id;
        const existingIdx = DEBUG_ROOTS.findIndex((r) => r.id === targetId || r.consonants === id || r.consonants === data.consonants);
        if (existingIdx >= 0) {
            let glosses: Array<{ en?: string; mt?: string }> = [];
            if (Array.isArray(data.glosses)) {
                glosses = data.glosses;
            } else if (typeof data.gloss === 'string') {
                try { glosses = JSON.parse(data.gloss); } catch {}
            }
            const consonants = data.consonants || DEBUG_ROOTS[existingIdx].consonants;
            DEBUG_ROOTS[existingIdx] = {
                ...DEBUG_ROOTS[existingIdx],
                ...data,
                consonants,
                consonant_array: data.consonant_array || (consonants.includes('-') ? consonants.split('-') : consonants.split('')),
                gloss_en: glosses[0]?.en || data.gloss_en || DEBUG_ROOTS[existingIdx].gloss_en,
                gloss_mt: glosses[0]?.mt || data.gloss_mt || DEBUG_ROOTS[existingIdx].gloss_mt,
            };
            return { ok: true, root: DEBUG_ROOTS[existingIdx], message: 'Updated in local debug roots' };
        }
        throw err;
    }
}

export async function adminDeleteRoot(token: string, id: string) {
    try {
        return await apiFetch(`/api/admin/roots?id=${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (err) {
        const existingIdx = DEBUG_ROOTS.findIndex((r) => r.id === id || r.consonants === id);
        if (existingIdx >= 0) {
            DEBUG_ROOTS.splice(existingIdx, 1);
            return { ok: true, id, message: 'Deleted from local debug roots' };
        }
        throw err;
    }
}

export async function adminBulkDeleteRoots(token: string, ids: string[]) {
    try {
        return await apiFetch(`/api/admin/roots?ids=${encodeURIComponent(ids.join(','))}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (err) {
        ids.forEach((id) => {
            const idx = DEBUG_ROOTS.findIndex((r) => r.id === id || r.consonants === id);
            if (idx >= 0) DEBUG_ROOTS.splice(idx, 1);
        });
        return { ok: true, message: 'Bulk deleted from local debug roots' };
    }
}

// ── Config Admin ─────────────────────────────────────────────────────────────

export async function adminListConfig(token: string, category?: string, cb?: number) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (cb) params.set('_cb', String(cb));
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

// ── Sources Admin ────────────────────────────────────────────────────────────

export interface LexicalSource {
    id: string;
    name: string;
    full_title: string;
    author?: string | null;
    year?: number | null;
    publisher?: string | null;
    reliability_weight: number;
    source_type: string;
    url?: string | null;
}

export async function adminListSources(token: string): Promise<{ sources: LexicalSource[] }> {
    return apiFetch('/api/admin/sources', {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function adminCreateSource(token: string, data: Partial<LexicalSource>) {
    return apiFetch('/api/admin/sources', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminUpdateSource(token: string, data: LexicalSource) {
    return apiFetch('/api/admin/sources', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
}

export async function adminDeleteSource(token: string, id: string) {
    return apiFetch(`/api/admin/sources?id=${encodeURIComponent(id)}`, {
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
        limit?: number;
        truncated?: boolean;
    }>(token, 'export', { table });
}

export interface AdminDbExportBundleTable {
    columns: string[];
    rows: any[];
    total: number;
    table: string;
    limit?: number;
    truncated?: boolean;
}

export interface AdminDbExportBundleResponse {
    preset: string;
    generatedAt: string;
    tableOrder: string[];
    totalRows: number;
    truncatedTables: string[];
    tables: Record<string, AdminDbExportBundleTable>;
}

export async function adminDbExportBundle(
    token: string,
    payload: { preset?: string; tables?: string[]; limit?: number } = {},
) {
    return adminDbToolsFetch<AdminDbExportBundleResponse>(token, 'export-bundle', payload);
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

export interface AdminBulkImportEntriesPayload {
    entries: Record<string, any>[];
    skipExisting?: boolean;
}

export interface AdminBulkImportEntriesResponse {
    ok: boolean;
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: { index: number; headword: string; error: string }[];
    details?: { id: string; headword: string; pos: string; action: 'inserted' | 'updated' | 'skipped' }[];
}

export async function adminBulkImportEntries(
    token: string,
    payload: AdminBulkImportEntriesPayload
): Promise<AdminBulkImportEntriesResponse> {
    return adminDbToolsFetch<AdminBulkImportEntriesResponse>(token, 'bulk-import-entries', payload);
}
