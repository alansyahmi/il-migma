import { useState, useEffect, useCallback } from 'react';
import { apiGetRoot, apiSearch } from '@/lib/api';
import {
    normalizeRootGloss,
    normalizeRootEtymology,
    normalizeRootEtymologyChain,
    normalizeRootRelationships,
    normalizeRootTags,
    type RootGloss,
    type RootEtymology
} from '@/lib/adminUtils';
import type { Entry } from '@/types';

export interface DbRoot {
    id: string;
    consonants: string;
    consonant_array: string | string[];
    strength: string;
    weak_class?: string;
    gloss: string;
    etymology: string;
    source?: string;
    notes?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_imp?: string;
    is_imala_blocked?: boolean | number | string;
    tags?: string;
    synonyms?: string | any[];
    antonyms?: string | any[];
    related_entries?: string | any[];
    created_at: string;
    updated_at: string;
}

export interface RootDataState {
    root: DbRoot | null;
    entries: Entry[];
    loading: boolean;
    error: string | null;
    normalized: {
        glosses: RootGloss[];
        etymology: RootEtymology;
        etymologyChain: RootEtymology[];
        tags: string[];
        relationships: {
            synonyms: any[];
            antonyms: any[];
            related_entries: any[];
        };
    } | null;
}

export function useRootData(id: string | undefined) {
    const [state, setState] = useState<RootDataState>({
        root: null,
        entries: [],
        loading: false,
        error: null,
        normalized: null,
    });

    const fetchData = useCallback(async (isRefetch = false, signal?: AbortSignal) => {
        if (!id) return;

        if (!isRefetch) {
            setState(prev => ({ ...prev, loading: true, error: null }));
        }

        try {
            // Fetch root metadata and entries in parallel
            const [rootRes, searchRes] = await Promise.all([
                apiGetRoot(id, signal),
                apiSearch('', { root_id: id, signal } as any)
            ]);

            const root = rootRes.root as DbRoot;
            const entries = (searchRes.results as any) as Entry[];

            // Normalize fields using shared utilities
            const normalized = {
                glosses: normalizeRootGloss(root.gloss),
                etymology: normalizeRootEtymology(root.etymology),
                etymologyChain: normalizeRootEtymologyChain(root.etymology),
                tags: normalizeRootTags(root.tags),
                relationships: {
                    synonyms: normalizeRootRelationships(root.synonyms),
                    antonyms: normalizeRootRelationships(root.antonyms),
                    related_entries: normalizeRootRelationships(root.related_entries),
                }
            };

            if (!signal?.aborted) {
                setState({
                    root,
                    entries,
                    loading: false,
                    error: null,
                    normalized,
                });
            }
        } catch (err: any) {
            if (!signal?.aborted) {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: err.message || 'Failed to fetch root data',
                }));
            }
        }
    }, [id]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData(false, controller.signal);
        return () => controller.abort();
    }, [fetchData]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    return { ...state, refetch };
}
