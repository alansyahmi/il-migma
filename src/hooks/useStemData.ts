import { useState, useEffect, useCallback } from 'react';
import { apiGetStem, apiSearch } from '@/lib/api';
import type { Entry } from '@/types';
import { normalizeStemMorphology, type StemMorphologySource } from '@/lib/stemMorphology';

export interface StemDataState {
    stem_string: string | null;
    class_type: 'ar' | 'ir' | null;
    is_hybrid: boolean;
    root: string | null;
    agentive_suffix: string | null;
    stemMorphology: StemMorphologySource | null;
    source_languages: string[];
    entries: Entry[];
    stem: any | null;
    loading: boolean;
    error: string | null;
}

export function useStemData(id: string | undefined) {
    const [state, setState] = useState<StemDataState>({
        stem_string: id || null,
        class_type: null,
        is_hybrid: false,
        root: null,
        agentive_suffix: null,
        stemMorphology: null,
        source_languages: [],
        entries: [],
        stem: null,
        loading: false,
        error: null,
    });

    const fetchData = useCallback(async (signal?: AbortSignal) => {
        if (!id) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const [stemRes, searchRes] = await Promise.all([
                apiGetStem(id, signal).catch(() => null),
                apiSearch('', { zokk: true, stem_string: id, signal } as any),
            ]);
            const entries = (searchRes.results as any) as Entry[];

            const canonicalStem = stemRes?.stem || null;

            if (entries.length === 0 && !canonicalStem) {
                if (!signal?.aborted) {
                    setState(prev => ({ ...prev, loading: false, entries: [], stem: null }));
                }
                return;
            }

            const primary = entries.find(e => e.zokk_morphology) || entries[0];
            const zokk = canonicalStem || primary?.zokk_morphology || null;

                if (!signal?.aborted) {
                    const stemMorphology = normalizeStemMorphology({
                        stem_string: zokk?.stem_string || id || '',
                        class_type: zokk?.class_type || undefined,
                        is_hybrid: !!zokk?.is_hybrid,
                        root: zokk?.root || null,
                        agentive_suffix: zokk?.agentive_suffix || null,
                    });

                    setState({
                        stem_string: zokk?.stem_string || id,
                        class_type: zokk?.class_type || null,
                        is_hybrid: !!zokk?.is_hybrid,
                        root: zokk?.root || null,
                        agentive_suffix: zokk?.agentive_suffix || null,
                        stemMorphology,
                        source_languages: entries
                            .map(e => e.source_language)
                            .filter(Boolean)
                            .flatMap(s => s!.split(',').map(x => x.trim()))
                        .filter((v, i, a) => a.indexOf(v) === i),
                    entries,
                    stem: canonicalStem,
                    loading: false,
                    error: null,
                });
            }
        } catch (err: any) {
            if (!signal?.aborted) {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: err.message || 'Failed to fetch stem data',
                }));
            }
        }
    }, [id]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, [fetchData]);

    const refetch = useCallback(() => fetchData(), [fetchData]);

    return { ...state, refetch };
}
