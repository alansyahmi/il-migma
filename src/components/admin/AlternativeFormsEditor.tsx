import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Link2, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AlternativeForm, AlternativeFormType } from '@/types';
import { cn } from '@/lib/utils';
import { apiSearch } from '@/lib/api';

interface AlternativeFormsEditorProps {
    title?: string;
    items: AlternativeForm[];
    onChange: (items: AlternativeForm[]) => void;
    currentEntryId?: string;
}

const ALT_TYPES: { value: AlternativeFormType; labelEn: string; labelMt: string }[] = [
    { value: 'orthographic', labelEn: 'Orthographic (Spelling variant)', labelMt: 'Ortografika (Varjant ortografiku)' },
    { value: 'archaic', labelEn: 'Archaic', labelMt: 'Arkajka' },
    { value: 'pre-reform', labelEn: 'Pre-reform', labelMt: 'Qabel ir-riforma' },
    { value: 'phonetic', labelEn: 'Phonetic', labelMt: 'Fonetika' },
    { value: 'dialectal', labelEn: 'Dialectal', labelMt: 'Djalettali' },
    { value: 'variant', labelEn: 'Other variant', labelMt: 'Varjant ieħor' },
];

export const AlternativeFormsEditor: React.FC<AlternativeFormsEditorProps> = ({
    title,
    items = [],
    onChange,
    currentEntryId,
}) => {
    const { t, language } = useLanguage();
    const [quickHeadword, setQuickHeadword] = useState('');
    const [quickType, setQuickType] = useState<AlternativeFormType>('orthographic');

    // Autocomplete state for linked entries
    const [searchQuery, setSearchQuery] = useState<{ index: number; query: string } | null>(null);
    const [searchResults, setSearchResults] = useState<{ id: string; headword: string; pos?: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const updateItem = (index: number, patch: Partial<AlternativeForm>) => {
        const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
        onChange(next);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= items.length) return;
        const next = [...items];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        onChange(next.map((item, i) => ({ ...item, sort_order: i })));
    };

    const addItem = (headword: string, type: AlternativeFormType = 'orthographic') => {
        const trimmed = headword.trim();
        if (!trimmed) return;
        const newItem: AlternativeForm = {
            id: currentEntryId ? `alt_${currentEntryId}::${Date.now()}_${Math.random().toString(36).slice(2, 6)}` : undefined,
            headword: trimmed,
            type,
            notes: null,
            target_entry_id: null,
            target_id: null,
            has_lemma_entry: false,
            sort_order: items.length,
        };
        onChange([...items, newItem]);
        setQuickHeadword('');
    };

    const handleSearchEntries = async (index: number, query: string) => {
        setSearchQuery({ index, query });
        if (!query.trim() || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await apiSearch(query.trim(), { limit: 5 });
            const list = (res.results || []).map((r: any) => ({
                id: r.id || r.entry?.id,
                headword: r.headword || r.entry?.headword,
                pos: r.pos || r.entry?.pos,
            })).filter((r: any) => r.id && r.id !== currentEntryId);
            setSearchResults(list);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const inpClass = "w-full text-sm bg-white border border-black/15 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#1034A6] focus:ring-1 focus:ring-[#1034A6] placeholder:text-black/30";
    const selClass = "w-full text-sm bg-white border border-black/15 rounded-lg px-2.5 py-2 text-black focus:outline-none focus:border-[#1034A6] focus:ring-1 focus:ring-[#1034A6]";

    return (
        <div className="space-y-4 rounded-xl border border-black/10 bg-slate-50/50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/8 pb-3">
                <div>
                    <h3 className="font-semibold text-sm text-black flex items-center gap-2">
                        {title || t('Alternative Forms & Variant Spellings', 'Forom Alternattivi u Varjanti')}
                        <span className="text-xs font-normal text-black/50">
                            ({items.length})
                        </span>
                    </h3>
                    <p className="text-xs text-black/60 flex items-center gap-1.5 mt-0.5">
                        <Info size={13} className="shrink-0 text-blue-600" />
                        {t(
                            'Orthographic alt forms do not need their own lemma entry. They are searchable and lead users directly to this entry.',
                            'Forom ortografiċi alternattivi ma jeħtiġux entrata separata. Jinstabu fit-tfittxija u jwasslu lill-utenti direttament hawn.'
                        )}
                    </p>
                </div>
            </div>

            {/* Quick Add Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-white p-3 rounded-lg border border-black/10 shadow-sm">
                <input
                    type="text"
                    className={cn(inpClass, "flex-1")}
                    placeholder={t('Add alternative spelling (e.g. ċċana, ċamfrin)…', 'Żid għamla alternattiva (eż. ċċana, ċamfrin)…')}
                    value={quickHeadword}
                    onChange={(e) => setQuickHeadword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addItem(quickHeadword, quickType);
                        }
                    }}
                />
                <select
                    className={cn(selClass, "sm:w-56")}
                    value={quickType}
                    onChange={(e) => setQuickType(e.target.value as AlternativeFormType)}
                >
                    {ALT_TYPES.map((tOpt) => (
                        <option key={tOpt.value} value={tOpt.value}>
                            {language === 'mt' ? tOpt.labelMt : tOpt.labelEn}
                        </option>
                    ))}
                </select>
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => addItem(quickHeadword, quickType)}
                    disabled={!quickHeadword.trim()}
                    className="shrink-0 flex items-center gap-1"
                >
                    <Plus size={14} />
                    {t('Add Form', 'Żid Forma')}
                </Button>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
                <div className="text-center py-5 text-xs text-black/40 italic bg-white/60 rounded-lg border border-dashed border-black/10">
                    {t('No alternative forms added yet.', 'Għadhom ma ġew miżjuda l-ebda forom alternattivi.')}
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item, index) => {
                        const hasLinkedEntry = Boolean(item.target_entry_id || item.has_lemma_entry);
                        return (
                            <div
                                key={item.id || `${item.headword}-${index}`}
                                className="bg-white rounded-lg border border-black/10 p-3 shadow-xs space-y-3"
                            >
                                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                    <div className="flex items-center gap-1 shrink-0 self-stretch sm:self-auto justify-end">
                                        <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => moveItem(index, 'up')}
                                            className="p-1 rounded text-black/40 hover:text-black disabled:opacity-20 hover:bg-black/5"
                                            title={t('Move up', 'Mexxi ’l fuq')}
                                        >
                                            <ArrowUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === items.length - 1}
                                            onClick={() => moveItem(index, 'down')}
                                            className="p-1 rounded text-black/40 hover:text-black disabled:opacity-20 hover:bg-black/5"
                                            title={t('Move down', 'Mexxi ’l isfel')}
                                        >
                                            <ArrowDown size={14} />
                                        </button>
                                    </div>

                                    {/* Headword */}
                                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                                        <input
                                            type="text"
                                            value={item.headword || ''}
                                            onChange={(e) => updateItem(index, { headword: e.target.value })}
                                            placeholder={t('Spelling form…', 'Għamla ortografika…')}
                                            className={cn(inpClass, "font-serif font-bold text-base")}
                                        />
                                    </div>

                                    {/* Type */}
                                    <div className="w-full sm:w-52 shrink-0">
                                        <select
                                            value={item.type || 'orthographic'}
                                            onChange={(e) => updateItem(index, { type: e.target.value as AlternativeFormType })}
                                            className={selClass}
                                        >
                                            {ALT_TYPES.map((tOpt) => (
                                                <option key={tOpt.value} value={tOpt.value}>
                                                    {language === 'mt' ? tOpt.labelMt : tOpt.labelEn}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Notes */}
                                    <div className="w-full sm:w-52 shrink-0">
                                        <input
                                            type="text"
                                            value={item.notes || ''}
                                            onChange={(e) => updateItem(index, { notes: e.target.value || null })}
                                            placeholder={t('Notes (e.g. Pre-1984)…', 'Noti (eż. Qabel l-1984)…')}
                                            className={inpClass}
                                        />
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 rounded text-black/40 hover:text-red-600 hover:bg-red-50 transition-colors self-end sm:self-center shrink-0"
                                        title={t('Remove form', 'Neħħi din il-forma')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Optional Cross-Reference / Linked Entry */}
                                <div className="pt-2 border-t border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-black/60">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={hasLinkedEntry}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                updateItem(index, {
                                                    has_lemma_entry: checked,
                                                    target_entry_id: checked ? (item.target_entry_id || '') : null,
                                                    target_id: checked ? (item.target_entry_id || '') : null,
                                                });
                                            }}
                                            className="w-3.5 h-3.5 rounded border-black/20 text-[#1034A6] focus:ring-[#1034A6]"
                                        />
                                        <span className="flex items-center gap-1 text-black/70">
                                            <Link2 size={12} />
                                            {t('Also has its own separate lemma entry (optional cross-reference)', 'Taqbel ma’ entrata separata fid-dizzjunarju (mhux obbligatorju)')}
                                        </span>
                                    </label>

                                    {hasLinkedEntry && (
                                        <div className="relative flex-1 max-w-xs">
                                            <input
                                                type="text"
                                                value={item.target_entry_id || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    updateItem(index, { target_entry_id: val, target_id: val });
                                                    handleSearchEntries(index, val);
                                                }}
                                                placeholder={t('Entry ID or search headword…', 'ID tal-entrata jew fittex…')}
                                                className="w-full text-xs bg-slate-50 border border-black/15 rounded px-2 py-1 text-black pr-6"
                                            />
                                            {isSearching && searchQuery?.index === index && (
                                                <span className="absolute right-2 top-1.5 text-[10px] text-black/40">…</span>
                                            )}
                                            {searchQuery?.index === index && searchResults.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-black/15 rounded-md shadow-lg z-20 overflow-hidden">
                                                    {searchResults.map((sr) => (
                                                        <button
                                                            key={sr.id}
                                                            type="button"
                                                            className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs flex items-center justify-between"
                                                            onClick={() => {
                                                                updateItem(index, { target_entry_id: sr.id, target_id: sr.id });
                                                                setSearchQuery(null);
                                                                setSearchResults([]);
                                                            }}
                                                        >
                                                            <span className="font-serif font-bold text-black">{sr.headword}</span>
                                                            <span className="text-[10px] text-black/40 font-mono">{sr.id}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
