import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Plus, Loader2, Search, CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { apiGetEntry, apiGetRoot, apiGetStem, apiSearch, apiSearchStems } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { getGloss } from '@/lib/utils';
import { formatStemDisplay } from '@/lib/stemDefaults';

interface RelationshipItem {
    id: string;
    headword: string;
    gloss_en?: string;
    gloss_mt?: string;
    pos?: string;
    cv_pattern?: string;
    wizen_pattern?: string;
}

interface RelationshipEditorProps {
    title: string;
    items: RelationshipItem[];
    onChange: (items: RelationshipItem[]) => void;
    type: 'thesaurus' | 'derived';
    lookupType?: 'entry' | 'root' | 'stem';
    enableSuggestions?: boolean;
    suggestionScope?: 'entries';
    currentEntryId?: string;
    extraActions?: { label: string; onClick: () => void; icon?: React.ReactNode }[];
}

type LookupState = 'idle' | 'loading' | 'success' | 'error';
type SuggestionState = {
    query: string;
    open: boolean;
    loading: boolean;
    results: RelationshipItem[];
    activeIndex: number;
};

export const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
    title, items, onChange, type, extraActions, lookupType = 'entry', enableSuggestions = false, suggestionScope = 'entries', currentEntryId
}) => {
    const { language, t } = useLanguage();
    const { mode } = useLinguisticMode();

    // Track lookup state per row
    const [rowStates, setRowStates] = useState<Record<number, { state: LookupState; message?: string }>>({});
    // Track which rows are pending removal (for undo animation)
    const [pendingRemove, setPendingRemove] = useState<number | null>(null);
    const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suggestionTimers = useRef<Record<number, ReturnType<typeof setTimeout> | null>>({});
    const [suggestions, setSuggestions] = useState<Record<number, SuggestionState>>({});
    // Ref for auto-focusing new inputs
    const newInputRef = useRef<HTMLInputElement | null>(null);
    const [justAdded, setJustAdded] = useState(false);
    const normalizeStemLookupId = useCallback((value: string) => {
        return value.trim().replace(/^-+/, '').replace(/-+$/, '');
    }, []);

    // Auto-focus when a new item is added
    useEffect(() => {
        if (justAdded && newInputRef.current) {
            newInputRef.current.focus();
            setJustAdded(false);
        }
    }, [justAdded, items.length]);

    // Cleanup pending removal timer
    useEffect(() => {
        return () => {
            if (removeTimer.current) clearTimeout(removeTimer.current);
            Object.values(suggestionTimers.current).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
        };
    }, []);

    const setRowState = useCallback((index: number, state: LookupState, message?: string) => {
        setRowStates(prev => ({ ...prev, [index]: { state, message } }));
        // Auto-clear success after 2s
        if (state === 'success') {
            setTimeout(() => {
                setRowStates(prev => ({ ...prev, [index]: { state: 'idle' } }));
            }, 2000);
        }
    }, []);

    const lookupItem = useCallback(async (id: string, index: number) => {
        if (!id.trim()) return;
        // Don't re-lookup if already resolved with same id
        if (items[index]?.headword && items[index]?.id === id) return;

        setRowState(index, 'loading');
        try {
            if (lookupType === 'root') {
                const res = await apiGetRoot(id);
                if (res?.root) {
                    const root = res.root as any;
                    const nextItems = [...items];
                    const glosses = (() => {
                        try {
                            const parsed = JSON.parse(root.gloss);
                            if (Array.isArray(parsed) && typeof parsed[0] === 'object') {
                                return { en: parsed[0].en, mt: parsed[0].mt };
                            }
                        } catch (e) { }
                        return { en: root.gloss || '', mt: '' };
                    })();

                    nextItems[index] = {
                        ...nextItems[index],
                        id: root.consonants,
                        headword: root.consonants,
                        gloss_en: glosses.en,
                        gloss_mt: glosses.mt,
                        pos: 'ROOT',
                    };
                    onChange(nextItems);
                    setRowState(index, 'success');
                } else {
                    setRowState(index, 'error', t('Root not found', 'Għerq mhux misjub'));
                }
            } else if (lookupType === 'stem') {
                const lookupId = normalizeStemLookupId(id);
                let res = await apiGetStem(lookupId);
                if (res?.stem) {
                    const stem = res.stem as any;
                    const firstGloss = Array.isArray(stem.glosses) ? stem.glosses[0] : null;
                    const nextItems = [...items];
                    nextItems[index] = {
                        ...nextItems[index],
                        id: stem.stem_string,
                        headword: stem.stem_string,
                        gloss_en: firstGloss?.en || '',
                        gloss_mt: firstGloss?.mt || '',
                        pos: 'STEM',
                    };
                    onChange(nextItems);
                    setRowState(index, 'success');
                } else {
                    const searchRes = await apiSearchStems(lookupId, 8);
                    const exact = (searchRes.stems || []).find((stem: any) => {
                        const stemId = String(stem?.stem_string || stem?.id || '').trim().toLowerCase();
                        const head = String(stem?.headword || stem?.stem_string || '').trim().toLowerCase();
                        const q = lookupId.toLowerCase();
                        return stemId === q || head === q;
                    });
                    if (exact) {
                        const nextItems = [...items];
                        nextItems[index] = {
                            ...nextItems[index],
                            id: exact.stem_string || exact.id,
                            headword: exact.stem_string || exact.headword || exact.id,
                            gloss_en: exact.gloss_en || '',
                            gloss_mt: exact.gloss_mt || '',
                            pos: 'STEM',
                        };
                        onChange(nextItems);
                        setRowState(index, 'success');
                    } else {
                        setRowState(index, 'error', t('Stem not found', 'Żokk mhux misjub'));
                    }
                }
            } else {
                // First try strict ID lookup.
                let resolvedEntry: any = null;
                try {
                    const byId = await apiGetEntry(id);
                    resolvedEntry = byId?.entry || null;
                } catch {
                    resolvedEntry = null;
                }

                // If ID lookup fails, try headword search fallback.
                if (!resolvedEntry) {
                    const searchRes = await apiSearch(id, {
                        limit: 8,
                        searchLemma: true,
                        searchEnglishGloss: true,
                        includeSuggested: true,
                        includePending: true,
                    });
                    const q = id.trim().toLowerCase();
                    const exact = (searchRes.results || []).find((r: any) => {
                        const head = String(r?.headword || '').trim().toLowerCase();
                        const eid = String(r?.id || '').trim().toLowerCase();
                        return head === q || eid === q;
                    });
                    resolvedEntry = exact || searchRes.results?.[0] || null;
                }

                if (resolvedEntry) {
                    const nextItems = [...items];
                    nextItems[index] = {
                        ...nextItems[index],
                        id: resolvedEntry.id,
                        headword: resolvedEntry.headword,
                        gloss_en: resolvedEntry.definitions?.[0]?.text_en || '',
                        gloss_mt: resolvedEntry.definitions?.[0]?.text_mt || '',
                        pos: resolvedEntry.pos,
                        cv_pattern: resolvedEntry.cv_pattern || resolvedEntry.root_pattern_form?.pattern?.cv_notation || '',
                        wizen_pattern: resolvedEntry.root_pattern_form?.pattern?.wizen_notation || ''
                    };
                    onChange(nextItems);
                    setRowState(index, 'success');
                } else {
                    setRowState(index, 'error', t('Entry not found', 'Entrata mhux misjuba'));
                }
            }
        } catch {
            setRowState(index, 'error', t('Lookup failed — check ID', 'Tfittxija falliet — iċċekkja l-ID'));
        }
    }, [items, lookupType, normalizeStemLookupId, onChange, setRowState, t]);

    const setSuggestionState = useCallback((index: number, patch: Partial<SuggestionState>) => {
        setSuggestions(prev => ({
            ...prev,
            [index]: {
                query: prev[index]?.query || '',
                open: prev[index]?.open || false,
                loading: prev[index]?.loading || false,
                results: prev[index]?.results || [],
                activeIndex: prev[index]?.activeIndex || 0,
                ...patch,
            }
        }));
    }, []);

    const closeSuggestions = useCallback((index: number) => {
        setSuggestionState(index, { open: false, loading: false, results: [], activeIndex: 0 });
    }, [setSuggestionState]);

    const mapEntryToItem = (entry: any): RelationshipItem => ({
        id: entry.id,
        headword: entry.headword,
        gloss_en: entry.definitions?.[0]?.text_en || '',
        gloss_mt: entry.definitions?.[0]?.text_mt || '',
        pos: entry.pos,
        cv_pattern: entry.cv_pattern || entry.root_pattern_form?.pattern?.cv_notation || '',
        wizen_pattern: entry.root_pattern_form?.pattern?.wizen_notation || ''
    });

    const fetchSuggestions = useCallback(async (query: string, index: number) => {
        const canSuggest = enableSuggestions && (
            (suggestionScope === 'entries' && lookupType === 'entry') ||
            lookupType === 'stem'
        );
        if (!canSuggest) return;

        const normalized = query.trim();
        if (normalized.length < 2) {
            closeSuggestions(index);
            return;
        }

        setSuggestionState(index, { loading: true, query: normalized, open: true });
        try {
            const usedIds = new Set(items.map((it, i) => (i === index ? '' : it?.id)).filter(Boolean));
            let mapped: RelationshipItem[] = [];

            if (lookupType === 'stem') {
                const res = await apiSearchStems(normalized, 8);
                mapped = (res.stems || [])
                    .map((s: any) => ({
                        id: s.stem_string || s.id,
                        headword: s.headword || s.stem_string || s.id,
                        gloss_en: s.gloss_en || '',
                        gloss_mt: s.gloss_mt || '',
                        pos: 'STEM',
                    }))
                    .filter(it => !!it.id && !usedIds.has(it.id));
            } else {
                const res = await apiSearch(normalized, {
                    limit: 8,
                    searchLemma: true,
                    searchEnglishGloss: true,
                    includeSuggested: true,
                    includePending: true,
                });
                mapped = (res.results || [])
                    .map(r => mapEntryToItem(r))
                    .filter(it => !!it.id && !usedIds.has(it.id) && it.id !== currentEntryId);
            }

            setSuggestionState(index, {
                loading: false,
                open: mapped.length > 0,
                results: mapped,
                activeIndex: 0,
                query: normalized,
            });
        } catch {
            setSuggestionState(index, { loading: false, open: false, results: [], activeIndex: 0 });
        }
    }, [closeSuggestions, currentEntryId, enableSuggestions, items, lookupType, setSuggestionState, suggestionScope]);

    const queueSuggestionFetch = useCallback((query: string, index: number) => {
        if (suggestionTimers.current[index]) {
            clearTimeout(suggestionTimers.current[index]!);
        }
        suggestionTimers.current[index] = setTimeout(() => {
            fetchSuggestions(query, index);
        }, 250);
    }, [fetchSuggestions]);

    const selectSuggestion = useCallback((index: number, suggestion: RelationshipItem) => {
        const nextItems = [...items];
        nextItems[index] = {
            ...nextItems[index],
            ...suggestion,
        };
        onChange(nextItems);
        setRowState(index, 'success');
        closeSuggestions(index);
    }, [closeSuggestions, items, onChange, setRowState]);

    const addItem = () => {
        onChange([...items, { id: '', headword: '' }]);
        setJustAdded(true);
    };

    const requestRemove = (index: number) => {
        setPendingRemove(index);
        if (removeTimer.current) clearTimeout(removeTimer.current);
        removeTimer.current = setTimeout(() => {
            onChange(items.filter((_, i) => i !== index));
            setPendingRemove(null);
            if (suggestionTimers.current[index]) clearTimeout(suggestionTimers.current[index]!);
            delete suggestionTimers.current[index];
            setSuggestions(prev => {
                const next: Record<number, SuggestionState> = {};
                Object.entries(prev).forEach(([k, v]) => {
                    const ki = parseInt(k, 10);
                    if (ki < index) next[ki] = v;
                    else if (ki > index) next[ki - 1] = v;
                });
                return next;
            });
            // Shift row states
            setRowStates(prev => {
                const next: typeof prev = {};
                Object.entries(prev).forEach(([k, v]) => {
                    const ki = parseInt(k);
                    if (ki < index) next[ki] = v;
                    else if (ki > index) next[ki - 1] = v;
                });
                return next;
            });
        }, 2000);
    };

    const undoRemove = () => {
        if (removeTimer.current) clearTimeout(removeTimer.current);
        setPendingRemove(null);
    };

    const updateId = (index: number, id: string) => {
        const nextItems = [...items];
        nextItems[index] = { ...nextItems[index], id, headword: '' }; // Clear resolved data on ID change
        onChange(nextItems);
        setRowState(index, 'idle');
        if (enableSuggestions && (lookupType === 'entry' || lookupType === 'stem')) {
            queueSuggestionFetch(id, index);
        }
    };

    const patternLabel = (item: RelationshipItem) => {
        if (mode === 'standard') return item.cv_pattern || item.wizen_pattern;
        return item.wizen_pattern || item.cv_pattern;
    };

    // -- Border color per state --
    const borderColor = (index: number) => {
        const s = rowStates[index]?.state;
        if (s === 'loading') return 'border-[#1034A6]/40';
        if (s === 'success') return 'border-emerald-400';
        if (s === 'error') return 'border-red-300';
        return 'border-[#ede9e1]';
    };

    const stateIcon = (index: number) => {
        if (suggestions[index]?.loading) return <Loader2 size={14} className="animate-spin text-[#1034A6]" />;
        const s = rowStates[index]?.state;
        if (s === 'loading') return <Loader2 size={14} className="animate-spin text-[#1034A6]" />;
        if (s === 'success') return <CheckCircle2 size={14} className="text-emerald-500" />;
        if (s === 'error') return <AlertCircle size={14} className="text-red-400" />;
        return <Search size={14} className="text-black/25" />;
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link2 size={14} className="text-black/30" />
                    <span className="text-xs font-bold text-black/70 uppercase tracking-widest">{title}</span>
                    {items.length > 0 && (
                        <span className="bg-black/5 text-black/40 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{items.filter((_, i) => i !== pendingRemove).length}</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1034A6] uppercase tracking-wider px-2.5 py-1.5 rounded-md hover:bg-[#1034A6]/5 transition-colors"
                >
                    <Plus size={13} strokeWidth={2.5} /> {t('Add', 'Żid')}
                </button>
            </div>

            {/* Items List */}
            <div className="space-y-2">
                {items.map((item, i) => {
                    const isPendingRemoval = pendingRemove === i;
                    const isResolved = !!item.headword;
                    const rowSuggestions = suggestions[i];
                    const hasSuggestions = !!rowSuggestions?.open && (rowSuggestions.results?.length ?? 0) > 0;

                    return (
                        <div
                            key={i}
                            className={`
                                relative rounded-lg border transition-all duration-300
                                ${hasSuggestions ? 'overflow-visible' : 'overflow-hidden'}
                                ${isPendingRemoval ? 'opacity-40 scale-[0.97] bg-red-50/50 border-red-200' : borderColor(i)}
                                ${isResolved ? 'bg-white shadow-sm' : 'bg-[#faf9f7]'}
                            `}
                        >
                            {/* Pending removal overlay */}
                            {isPendingRemoval && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-red-500 font-medium">{t('Removed', 'Imneħħi')}</span>
                                        <button
                                            type="button"
                                            onClick={undoRemove}
                                            className="text-[11px] font-bold text-[#1034A6] uppercase tracking-wider px-2.5 py-1 bg-[#1034A6]/5 rounded-md hover:bg-[#1034A6]/10 transition-colors"
                                        >
                                            {t('Undo', 'Annulla')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 p-3">
                                {/* ID Input with inline search */}
                                <div className="relative w-36 shrink-0">
                                    <input
                                        ref={i === items.length - 1 ? newInputRef : undefined}
                                        className={`
                                            w-full border rounded-md px-2.5 py-1.5 text-[12px] font-mono
                                            focus:outline-none focus:ring-2 focus:ring-[#1034A6]/30 focus:border-[#1034A6]
                                            bg-white text-black placeholder:text-black/20
                                            ${rowStates[i]?.state === 'error' ? 'border-red-300 bg-red-50/30' : 'border-border'}
                                        `}
                                        value={item.id}
                                        placeholder={lookupType === 'root' ? "f-għ-l" : (lookupType === 'stem' ? "stem string" : "entry-id or headword")}
                                        onChange={e => updateId(i, e.target.value)}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                closeSuggestions(i);
                                            }, 120);
                                        }}
                                        onKeyDown={e => {
                                            if (hasSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                                                e.preventDefault();
                                                const delta = e.key === 'ArrowDown' ? 1 : -1;
                                                const len = rowSuggestions.results.length;
                                                const next = (rowSuggestions.activeIndex + delta + len) % len;
                                                setSuggestionState(i, { activeIndex: next });
                                                return;
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (hasSuggestions) {
                                                    const chosen = rowSuggestions.results[rowSuggestions.activeIndex] || rowSuggestions.results[0];
                                                    if (chosen) {
                                                        selectSuggestion(i, chosen);
                                                        return;
                                                    }
                                                }
                                                lookupItem(item.id, i);
                                            }
                                            if (e.key === 'Escape') {
                                                e.preventDefault();
                                                closeSuggestions(i);
                                            }
                                        }}
                                        disabled={isPendingRemoval}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {stateIcon(i)}
                                    </div>
                                    {hasSuggestions && (
                                        <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-black/10 rounded-md shadow-lg max-h-56 overflow-auto">
                                            {rowSuggestions.results.map((s, idx) => {
                                                const isActive = idx === rowSuggestions.activeIndex;
                                                return (
                                                    <button
                                                        key={`${s.id}-${idx}`}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            selectSuggestion(i, s);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-2 border-b border-black/5 last:border-b-0 ${isActive ? 'bg-[#1034A6]/8' : 'hover:bg-black/3'}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-serif text-[13px] text-black truncate">
                                                                {lookupType === 'stem' ? formatStemDisplay(s.headword || s.id) : s.headword}
                                                            </span>
                                                            <span className="text-[10px] text-black/30 font-mono truncate">{s.id}</span>
                                                        </div>
                                                        {!!(s.gloss_en || s.gloss_mt) && (
                                                            <div className="text-[11px] text-black/45 truncate">
                                                                "{getGloss(s, language, mode)}"
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Resolved Preview */}
                                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                                    {isResolved ? (
                                        <>
                                            <span className="font-serif text-[15px] text-black truncate">
                                                {item.pos === 'STEM' ? formatStemDisplay(item.headword) : item.headword}
                                            </span>
                                            {type === 'derived' && item.pos && (
                                                <span className="shrink-0 bg-black/5 text-black/50 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                    {item.pos}
                                                </span>
                                            )}
                                            {type === 'derived' && patternLabel(item) && (
                                                <span className="shrink-0 text-[#1034A6]/80 text-[9px] font-bold uppercase tracking-wider bg-[#1034A6]/5 px-1.5 py-0.5 rounded border border-[#1034A6]/10">
                                                    {patternLabel(item)}
                                                </span>
                                            )}
                                            {type === 'thesaurus' && (item.gloss_en || item.gloss_mt) && (
                                                <span className="text-[12px] text-black/35 italic truncate">
                                                    "{getGloss(item, language, mode)}"
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-black/20 italic">
                                            {rowStates[i]?.state === 'error'
                                                ? <span className="text-red-400 not-italic text-[10px]">{rowStates[i]?.message}</span>
                                                : (lookupType === 'root'
                                                    ? t('Type consonants and press Enter', 'Ikteb il-konsonanti u agħfas Enter')
                                                    : lookupType === 'stem'
                                                        ? t('Type stem and press Enter', 'Ikteb iż-żokk u agħfas Enter')
                                                        : t('Type ID or headword, then select suggestion', 'Ikteb ID jew kelma, imbagħad agħżel suġġeriment'))
                                            }
                                        </span>
                                    )}
                                </div>

                                {/* Delete Button */}
                                <button
                                    type="button"
                                    onClick={() => requestRemove(i)}
                                    disabled={isPendingRemoval}
                                    className="shrink-0 p-1.5 text-black/15 hover:text-red-400 hover:bg-red-50 rounded-md transition-all"
                                    title={t('Remove', 'Neħħi')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State */}
                {items.length === 0 && (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={addItem}
                            className="w-full py-8 border-2 border-dashed border-border-light rounded-xl text-black/25 hover:border-[#1034A6]/30 hover:text-[#1034A6]/50 hover:bg-[#1034A6]/2 transition-all cursor-pointer group"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Plus size={20} className="group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                                <span className="text-[11px] font-bold uppercase tracking-widest">
                                    {t('Add first entry', 'Żid l-ewwel entrata')}
                                </span>
                            </div>
                        </button>

                        {extraActions && extraActions.length > 0 && (
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                <span className="text-[9px] uppercase tracking-widest text-black/30 font-bold mr-1">{t('Or Create New', 'Jew Oħloq Ġdid')}</span>
                                {extraActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={action.onClick}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-black/50 hover:text-[#1034A6] hover:bg-black/5 px-2 py-1 rounded transition-colors border border-dashed border-black/10 hover:border-[#1034A6]/30"
                                    >
                                        {action.icon && <span>{action.icon}</span>}
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
