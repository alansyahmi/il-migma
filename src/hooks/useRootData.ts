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
    hidden_forms?: string[];
    is_virtual?: boolean;
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

function buildFallbackRoot(id: string, entries: Entry[]): DbRoot | null {
    if (!entries.length) return null;
    const primaryVerb = entries.find((e) => e.pos === 'verb' && e.verb_morphology?.form === 'I')
        || entries.find((e) => e.pos === 'verb')
        || entries[0];
    const embeddedRoot = primaryVerb?.root_pattern_form?.root;
    const consonants = String(
        embeddedRoot?.consonants || primaryVerb?.root_consonants || id
    ).replace(/^root-/i, '').trim().toLowerCase().normalize('NFC');
    const consonantArray = consonants.split('-').map((c) => c.trim()).filter(Boolean);
    const vm = primaryVerb?.verb_morphology;

    let strength = String(embeddedRoot?.strength || vm?.class || 'strong').trim().toLowerCase();
    if (strength === 'doubled') strength = 'geminated';
    let weakClass = String(embeddedRoot?.weak_class || vm?.weak_class || '').trim().toLowerCase() || undefined;

    if (strength === 'strong' && !weakClass) {
        if (consonantArray.length === 3) {
            const [c1, c2, c3] = consonantArray;
            if (c3 === 'j' || c3 === 'w') {
                strength = 'weak';
                weakClass = 'defective';
            } else if (c2 === 'j' || c2 === 'w') {
                strength = 'weak';
                weakClass = 'hollow';
            } else if (c1 === 'w') {
                strength = 'weak';
                weakClass = 'assimilative';
            } else if (c2 && c2 === c3) {
                strength = 'geminated';
            }
        } else if (consonantArray.length === 4 && (consonantArray[3] === 'j' || consonantArray[3] === 'w')) {
            strength = 'weak';
            weakClass = 'defective';
        }
    }

    return {
        id: embeddedRoot?.id || consonants,
        consonants,
        consonant_array: consonantArray,
        strength,
        weak_class: weakClass,
        gloss: embeddedRoot?.gloss || '',
        etymology: embeddedRoot?.etymology || '',
        source: primaryVerb?.source_citation || '',
        vowel_set_perf: embeddedRoot?.vowel_set_perf || vm?.vowel_set_perf || 'a-a',
        vowel_set_impf: embeddedRoot?.vowel_set_impf || vm?.vowel_set_impf || 'i-a',
        vowel_set_imp: embeddedRoot?.vowel_set_imp || vm?.vowel_set_impv || 'o-o',
        is_imala_blocked: embeddedRoot?.is_imala_blocked ?? vm?.is_imala_blocked ?? false,
        hidden_forms: [],
        is_virtual: true,
        created_at: '',
        updated_at: '',
    };
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
                apiGetRoot(id, signal).catch(() => null),
                apiSearch('', { root_id: id, limit: 100, signal } as any)
            ]);

            const entries = (Array.isArray(searchRes?.results) ? searchRes.results : []) as Entry[];
            const root = (rootRes?.root as DbRoot | undefined) || buildFallbackRoot(id, entries);

            if (!root && entries.length === 0) {
                if (!signal?.aborted) {
                    setState({
                        root: null,
                        entries: [],
                        loading: false,
                        error: null,
                        normalized: null,
                    });
                }
                return;
            }

            // Normalize fields using shared utilities
            const normalized = {
                glosses: normalizeRootGloss(root?.gloss),
                etymology: normalizeRootEtymology(root?.etymology),
                etymologyChain: normalizeRootEtymologyChain(root?.etymology),
                tags: normalizeRootTags(root?.tags),
                relationships: {
                    synonyms: normalizeRootRelationships(root?.synonyms),
                    antonyms: normalizeRootRelationships(root?.antonyms),
                    related_entries: normalizeRootRelationships(root?.related_entries),
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
