import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Plus, Loader2, Search, CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { apiGetEntry, apiGetRoot } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';

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
    lookupType?: 'entry' | 'root';
    extraActions?: { label: string; onClick: () => void; icon?: React.ReactNode }[];
}

type LookupState = 'idle' | 'loading' | 'success' | 'error';

export const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
    title, items, onChange, type, extraActions, lookupType = 'entry'
}) => {
    const { t } = useLanguage();
    const { mode } = useLinguisticMode();

    // Track lookup state per row
    const [rowStates, setRowStates] = useState<Record<number, { state: LookupState; message?: string }>>({});
    // Track which rows are pending removal (for undo animation)
    const [pendingRemove, setPendingRemove] = useState<number | null>(null);
    const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref for auto-focusing new inputs
    const newInputRef = useRef<HTMLInputElement | null>(null);
    const [justAdded, setJustAdded] = useState(false);

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
            } else {
                const res = await apiGetEntry(id);
                if (res?.entry) {
                    const entry = res.entry as any;
                    const nextItems = [...items];
                    nextItems[index] = {
                        ...nextItems[index],
                        id: entry.id,
                        headword: entry.headword,
                        gloss_en: entry.definitions?.[0]?.text_en || '',
                        gloss_mt: entry.definitions?.[0]?.text_mt || '',
                        pos: entry.pos,
                        cv_pattern: entry.cv_pattern || entry.root_pattern_form?.pattern?.cv_notation || '',
                        wizen_pattern: entry.root_pattern_form?.pattern?.wizen_notation || ''
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
    }, [items, lookupType, onChange, setRowState, t]);

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

                    return (
                        <div
                            key={i}
                            className={`
                                relative rounded-lg border transition-all duration-300 overflow-hidden
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
                                            ${rowStates[i]?.state === 'error' ? 'border-red-300 bg-red-50/30' : 'border-[#d8cfc0]'}
                                        `}
                                        value={item.id}
                                        placeholder={lookupType === 'root' ? "f-għ-l" : "entry-id"}
                                        onChange={e => updateId(i, e.target.value)}
                                        onBlur={() => lookupItem(item.id, i)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                lookupItem(item.id, i);
                                            }
                                        }}
                                        disabled={isPendingRemoval}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {stateIcon(i)}
                                    </div>
                                </div>

                                {/* Resolved Preview */}
                                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                                    {isResolved ? (
                                        <>
                                            <span className="font-serif text-[15px] text-black truncate">{item.headword}</span>
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
                                                    "{mode === 'standard' ? (item.gloss_en || item.gloss_mt) : (item.gloss_mt || item.gloss_en)}"
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-black/20 italic">
                                            {rowStates[i]?.state === 'error'
                                                ? <span className="text-red-400 not-italic text-[10px]">{rowStates[i]?.message}</span>
                                                : (lookupType === 'root'
                                                    ? t('Type consonants and press Enter', 'Ikteb il-konsonanti u agħfas Enter')
                                                    : t('Type an ID and press Enter', 'Ikteb ID u agħfas Enter'))
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
                            className="w-full py-8 border-2 border-dashed border-[#ede9e1] rounded-xl text-black/25 hover:border-[#1034A6]/30 hover:text-[#1034A6]/50 hover:bg-[#1034A6]/[0.02] transition-all cursor-pointer group"
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
