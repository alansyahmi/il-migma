import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_ENTRIES } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { type Entry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { buildVerbForm, buildPerfectForm, getDoLabels, getIoLabels } from '@/lib/suffixEngine';
import { applyPossessiveSuffix } from '@/lib/nounInflectionEngine';
import { generateConjugation, generateRootForms, markGeneratedForms, getAttestedEntries } from '@/lib/conjugationEngine';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Edit2, ArrowLeft, Search, Plus, Trash2 } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { apiGetEntry, adminUpdateEntry } from '@/lib/api';
import { useRootData } from '@/hooks/useRootData';
import { useAdminConfig } from '@/lib/adminConfig';
import { cn, getGloss } from '@/lib/utils';
import { SubParts } from '@/components/dictionary/SubParts';
import { generateTheoreticalDual, generateElative, generateNumeralForms, type NumeralAutoForms } from '@/lib/maltesePhonology';

const MarkedValue = ({ val, theoretical, showMarker = true }: { val: string | React.ReactNode | { value: React.ReactNode, theoretical: boolean }, theoretical?: boolean, showMarker?: boolean }) => {
    const isObj = typeof val === 'object' && val !== null && 'value' in val;
    let v = isObj ? (val as any).value : val;
    let isT = isObj ? (val as any).theoretical : theoretical;

    // If the value is a string and starts with an asterisk, treat it as theoretical
    if (typeof v === 'string' && v.startsWith('*')) {
        isT = true;
        v = v.substring(1);
    }

    if (!v || v === '-') return <span className="opacity-40">-</span>;
    return (
        <span className={cn("font-serif", isT && "opacity-45")}>
            {isT && showMarker ? '*' : ''}{v}
        </span>
    );
};

// ── Colour tokens ──────────────────────────────────────────────────────────
const CREAM_RGBA = 'rgba(244,243,240,0.88)';
const BLUE = '#1034A6';
const GOLD = '#A07030';


// ── Components ─────────────────────────────────────────────────────────────

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-black/8 shadow-sm p-5 space-y-2">
            <h2 className="font-sans font-bold text-[0.95rem] text-black">{title}</h2>
            <div>{children}</div>
        </div>
    );
}

function PropRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col", className)}>
            <p className="text-xs font-semibold text-black/40 mb-0.5 uppercase tracking-wider">{label}</p>
            <div className="text-sm text-black">{children}</div>
        </div>
    );
}

function MorphologyTable({ title, rows, displayPattern }: { title: string; rows: { label: string; value: React.ReactNode; show?: boolean; theoretical?: boolean; extra?: React.ReactNode; pattern?: string }[]; displayPattern?: (p?: string) => string }) {
    const { term } = useLinguisticMode();
    const activeRows = rows.filter(r => r.show !== false && r.value && r.value !== '-');
    if (activeRows.length === 0) return null;

    return (
        <div className="w-full">
            <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                {title}
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-black/8 font-sans">
                            <th className="text-left font-semibold text-black pb-2 pr-4 w-32 sm:w-40">{term('feature') || 'Feature'}</th>
                            <th className="text-left font-semibold text-black pb-2">{term('form') || 'Form'}</th>
                            <th className="text-left font-semibold text-black pb-2 w-24 sm:w-32">{term('pattern') || 'Pattern'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-black/4 group/row">
                                <td className="py-2.5 pr-4 text-black/40 text-[10px] font-sans uppercase tracking-wider leading-tight">{row.label}</td>
                                <td className="py-2.5 font-serif text-black leading-normal">
                                    <div className="flex items-baseline">
                                        {typeof row.value === 'string' || (row.value && typeof row.value === 'object' && !React.isValidElement(row.value)) ? (
                                            <MarkedValue val={row.value as any} theoretical={row.theoretical} />
                                        ) : (
                                            row.value
                                        )}
                                        {row.extra}
                                    </div>
                                </td>
                                <td className="py-2.5 text-black/40 text-[10px] font-sans tracking-tight">
                                    {row.pattern ? (displayPattern ? displayPattern(row.pattern) : row.pattern) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function VowelSetGrid({ morphology }: { morphology: any }) {
    const { t } = useLanguage();
    if (!morphology) return null;

    const fields = [
        { key: 'vowel_set_sg', label: 'SINGULAR' },
        { key: 'vowel_set_opp', label: morphology.gender === 'masculine' ? 'FEMININE' : 'MASCULINE' },
        { key: 'vowel_set_dual', label: 'DUAL' },
        { key: 'vowel_set_pl', label: 'PLURAL' }
    ];

    const active = fields.filter(f => morphology[f.key]);
    if (active.length === 0) return null;

    return (
        <PropRow label={t('Vowel Set', 'Sett ta\' Vokali')}>
            <div className="grid grid-cols-1 gap-x-2 gap-y-1 mt-0.5">
                {active.map(f => (
                    <div key={f.key} className="flex items-center text-[13px]">
                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter pr-1 shrink-0">{f.label}:</span>
                        <span className="font-mono font-regular" style={{ color: 'black' }}>{morphology[f.key]}</span>
                    </div>
                ))}
            </div>
        </PropRow>
    );
}

function MorphologyGrid({ title, rows, displayPattern }: { title: string; rows: { label: string; value: React.ReactNode; show?: boolean; theoretical?: boolean; extra?: React.ReactNode; pattern?: string }[]; displayPattern?: (p?: string) => string }) {
    const activeRows = rows.filter(r => r.show !== false && r.value && r.value !== '-');
    if (activeRows.length === 0) return null;

    return (
        <PropRow label={title}>
            <div className="grid grid-cols-1 gap-x-2 gap-y-1 mt-0.5">
                {activeRows.map((row, idx) => (
                    <div key={idx} className="flex items-center text-[13px]">
                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter pr-1 shrink-0">{row.label}:</span>
                        <div className="flex items-baseline font-serif text-black">
                            {typeof row.value === 'string' || (row.value && typeof row.value === 'object' && !React.isValidElement(row.value)) ? (
                                <MarkedValue val={row.value as any} theoretical={row.theoretical} />
                            ) : (
                                row.value
                            )}
                            {row.extra}
                            {row.pattern && (
                                <span className="ml-1 text-[10px] font-sans text-black/40">
                                    ({displayPattern ? displayPattern(row.pattern) : row.pattern})
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </PropRow>
    );
}

function TagChips({ entry }: { entry: Entry }) {
    const rawTags = entry.tags || [];
    if (!rawTags.length) return null;

    const chips = rawTags
        .filter(t => !t.includes('THEORETICAL'))
        .map(tag => {
            const isTitle = tag.startsWith('\\');
            const clean = tag.replace(/^[\\!$]/, '').trim();
            return { raw: tag, label: clean, isTitle };
        })
        .filter(c => c.label && c.label !== '$' && c.label.toLowerCase() !== 'invariable');

    if (!chips.length) return null;

    return (
        <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
            {chips
                .filter(c => !c.isTitle)
                .map(c => (
                    <span
                        key={c.raw}
                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/3 text-[11px] font-sans text-black/70 border border-black/5"
                    >
                        {c.label}
                    </span>
                ))}
        </div>
    );
}

function TogglePill<T extends string>({
    options, active, onChange, labels,
}: { options: T[]; active: T; onChange: (v: T) => void; labels?: string[] }) {
    return (
        <div className="inline-flex rounded-md border border-black/10 overflow-hidden text-xs">
            {options.map((opt, i) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`px-3 py-1 transition-colors font-sans ${active === opt
                        ? 'bg-[#1034A6] text-white'
                        : 'bg-white text-[#555] hover:bg-black/5'
                        }`}
                >
                    {labels ? labels[i] : opt}
                </button>
            ))}
        </div>
    );
}

function SuffixStrip({ labels, activeIdx, onToggle, disabledIndices = [] }: {
    labels: string[];
    activeIdx: number | null;
    onToggle: (i: number) => void;
    disabledIndices?: number[];
}) {
    const dis = disabledIndices || [];

    // Split into 4 and 3 for mobile layout
    const firstRow = labels.slice(0, 4);
    const secondRow = labels.slice(4);

    const renderRow = (rowLabels: string[], offset: number, isMobile: boolean = false) => (
        <div className={`${isMobile ? 'flex w-full' : 'inline-flex'} rounded-md border border-black/10 overflow-hidden text-[11px]`}>
            {rowLabels.map((lbl, i) => {
                const actualIdx = i + offset;
                const isDisabled = dis.includes(actualIdx);
                return (
                    <button
                        key={lbl}
                        disabled={isDisabled}
                        onClick={() => onToggle(actualIdx)}
                        className={`px-0.5 py-2 transition-colors font-mono border-r border-black/5 last:border-r-0 flex items-center justify-center text-center ${isMobile ? 'flex-1 h-6' : 'px-1'} ${activeIdx === actualIdx
                            ? 'bg-[#1034A6] text-white border-[#1034A6]'
                            : isDisabled
                                ? 'bg-black/5 text-black/20 cursor-not-allowed'
                                : 'bg-white text-[#555] hover:bg-black/5'
                            }`}
                    >
                        <span className="leading-tight">{lbl}</span>
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row flex-wrap gap-2 w-full md:w-auto">
            {/* Desktop View: Single Row */}
            <div className="hidden md:flex">
                {renderRow(labels, 0)}
            </div>

            {/* Mobile View: Two Rows */}
            <div className="flex md:hidden flex-col items-start gap-1 w-full">
                {renderRow(firstRow, 0, true)}
                {renderRow(secondRow, 4, true)}
            </div>
        </div>
    );
}

function DerivedTermLink({
    label,
    data,
    isAdmin,
    onEdit,
    onDelete
}: {
    label: string;
    data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string };
    isAdmin?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    if (data.value === '-') return null;

    const content = (data.marker === 'plain' && data.entryId) ? (
        <Link to={`/entry/${data.entryId}`} style={{ color: BLUE }} className="font-serif hover:underline">
            {data.value}
        </Link>
    ) : (
        <span className={`font-serif ${data.marker !== 'plain' ? 'opacity-45' : ''} text-black`}>
            {data.marker === 'theoretical' ? '*' : (data.marker === 'auto_generated' ? '✦' : '')}
            {data.value}
        </span>
    );

    return (
        <div className="group relative">
            <p className="text-xs text-black/55 mb-1.5 font-sans">{label}</p>
            <div className="flex items-center gap-2 justify-center md:justify-start">
                {content}
                {isAdmin && onEdit && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.preventDefault(); onEdit(); }}
                            className="p-1 rounded hover:bg-black/5 text-black/55 transition-all"
                            title={data.marker === 'plain' ? 'Edit Entry' : 'Add Entry'}
                        >
                            {data.marker === 'plain' ? <Edit2 size={12} /> : <Plus size={12} />}
                        </button>
                        {data.marker === 'plain' && data.entryId && onDelete && (
                            <button
                                onClick={(e) => { e.preventDefault(); onDelete(); }}
                                className="p-1 rounded hover:bg-black/5 text-red-400 hover:text-red-600 transition-all"
                                title="Delete Entry"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function AdminActionButtons({ onEdit, onDelete, isAdd = false }: { onEdit?: () => void, onDelete?: () => void, isAdd?: boolean }) {
    const { term } = useLinguisticMode();
    return (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
                <button
                    onClick={(e) => { e.preventDefault(); onEdit(); }}
                    className="p-1 rounded hover:bg-black/5 text-black/55 transition-all outline-none"
                    title={isAdd ? term('add-entry') : term('edit-entry')}
                >
                    {isAdd ? <Plus size={12} /> : <Edit2 size={12} />}
                </button>
            )}
            {onDelete && (
                <button
                    onClick={(e) => { e.preventDefault(); onDelete(); }}
                    className="p-1 rounded hover:bg-black/5 text-red-400 hover:text-red-600 transition-all outline-none"
                    title={term('remove-relationship') || 'Remove Relationship'}
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
}

function removeRelationshipFromEntry(entry: Entry, targetId: string): Entry {
    const updated = JSON.parse(JSON.stringify(entry)) as Entry;

    // POS-specific morphology arrays
    if (updated.noun_morphology) {
        const m = updated.noun_morphology;
        if (m.related_entries) m.related_entries = m.related_entries.filter((r: any) => r.id !== targetId);
        if (m.synonyms) m.synonyms = m.synonyms.filter((s: any) => s.id !== targetId);
        if (m.antonyms) m.antonyms = m.antonyms.filter((a: any) => a.id !== targetId);
    }
    if (updated.verb_morphology) {
        const m = updated.verb_morphology;
        if (m.related_entries) m.related_entries = m.related_entries.filter((r: any) => r.id !== targetId);
        if (m.synonyms) m.synonyms = m.synonyms.filter((s: any) => s.id !== targetId);
        if (m.antonyms) m.antonyms = m.antonyms.filter((a: any) => a.id !== targetId);
    }
    if (updated.adjective_morphology) {
        const m = updated.adjective_morphology;
        if (m.related_entries) m.related_entries = m.related_entries.filter((r: any) => r.id !== targetId);
        if (m.synonyms) m.synonyms = m.synonyms.filter((s: any) => s.id !== targetId);
        if (m.antonyms) m.antonyms = m.antonyms.filter((a: any) => a.id !== targetId);
    }
    if (updated.numeral_morphology) {
        const m = updated.numeral_morphology;
        if (m.related_entries) m.related_entries = m.related_entries.filter((r: any) => r.id !== targetId);
        if (m.synonyms) m.synonyms = m.synonyms.filter((s: any) => s.id !== targetId);
        if (m.antonyms) m.antonyms = m.antonyms.filter((a: any) => a.id !== targetId);
    }

    // Top-level arrays (fallback or primary for Participle/FunctionWord)
    if (Array.isArray((updated as any).alternative_forms)) {
        (updated as any).alternative_forms = (updated as any).alternative_forms.filter((a: any) => a.id !== targetId);
    }
    if (Array.isArray((updated as any).related_entries)) {
        (updated as any).related_entries = (updated as any).related_entries.filter((r: any) => r.id !== targetId);
    }
    if (Array.isArray((updated as any).synonyms)) {
        (updated as any).synonyms = (updated as any).synonyms.filter((s: any) => s.id !== targetId);
    }
    if (Array.isArray((updated as any).antonyms)) {
        (updated as any).antonyms = (updated as any).antonyms.filter((a: any) => a.id !== targetId);
    }

    return updated;
}

// ── Noun View ──────────────────────────────────────────────────────────────

function NounEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language, t } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;
    const nm = entry.noun_morphology!;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = nm.related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const isTheoretical = nm.is_inflectable === false || (nm.is_inflectable as any) === 0 || entry.is_inflectable === false || (entry.is_inflectable as any) === 0;

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;

    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern(pattern?.cv_notation);

    const POSSESSIVE_SUFFIX_KEYS = ['1s', '2s', '3ms', '3fs', '1p', '2p', '3p'];

    const applySuffix = (base: string, idx: number, theoreticalOverride?: boolean, customPattern?: string) => {
        const isT = theoreticalOverride ?? isTheoretical;
        // Use the passed customPattern (for plurals) or the entry's cv_pattern
        const activePattern = customPattern || (entry as any).cv_pattern || (entry.root_pattern_form?.pattern?.cv_notation);
        const result = applyPossessiveSuffix(base, idx as any, nm.gender, activePattern);

        if (result === '-') return { value: '-', theoretical: false };

        const parts = result.split(' / ');
        if (parts.length > 1) {
            return {
                value: (
                    <div className="flex flex-col gap-0.5">
                        {parts.map((p, i) => (
                            <span key={i} className={i > 0 ? 'text-black/40' : ''}>{p}</span>
                        ))}
                    </div>
                ),
                theoretical: isT
            };
        }
        return { value: result, theoretical: isT };
    };

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                        {/* Title-level tags (e.g. \puristic) */}
                        {entry.tags && entry.tags.some(t => t.startsWith('\\')) && (
                            <div className="flex flex-wrap gap-2 justify-center mt-1">
                                {entry.tags
                                    .filter(t => t.startsWith('\\'))
                                    .map(t => {
                                        const clean = t.slice(1).replace('$', '').trim();
                                        if (!clean) return null;
                                        return (
                                            <span
                                                key={t}
                                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/5 text-[11px] font-sans text-black/80 border border-black/10"
                                            >
                                                {clean}
                                            </span>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                    <SubParts entry={entry} showGender />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="w-full md:w-64 shrink-0 space-y-4 hidden md:block">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <p className="text-sm text-black leading-relaxed">
                                    {term('from')}
                                    {ety.chain.map((c, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                                            <span style={{ color: BLUE }} className="font-medium mx-1">
                                                {term(c.language)}
                                            </span>
                                            {c.form && <span className="font-serif font-medium">{c.form}</span>}
                                            {c.meaning && <span className="opacity-70"> "{c.meaning}"</span>}
                                        </React.Fragment>
                                    ))}.
                                </p>
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {nm.source_citation && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{nm.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-0 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            {/* Properties */}
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto mb-12 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}

                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}

                                <PropRow label={term('gender')}>
                                    <span className="capitalize">{term(nm.gender)}</span>
                                </PropRow>

                                {(entry.usage_example || entry.usage_example_en) && (
                                    <PropRow label={t('Usage', 'Użu')} className="col-span-2 text-black text-[0.8rem] leading-none mb-1 mt-1 font-normal">
                                        {entry.usage_example && <span className="italic">"{entry.usage_example}"</span>}
                                        {entry.usage_example && entry.usage_example_en && <span className="mx-2 opacity-40">—</span>}
                                        {entry.usage_example_en && <span>"{entry.usage_example_en}"</span>}
                                    </PropRow>
                                )}

                                <VowelSetGrid morphology={{ ...entry, ...nm }} />

                                <MorphologyGrid
                                    title={term('morphology')}
                                    displayPattern={displayPattern}
                                    rows={[
                                        {
                                            show: nm.gender?.toLowerCase() === 'masculine' && !!nm.feminine,
                                            label: term('feminine'),
                                            value: <MarkedValue val={nm.feminine} />,
                                            pattern: nm.form_fem_pattern || entry.form_fem_pattern
                                        },
                                        {
                                            show: nm.gender?.toLowerCase() === 'feminine' && !!nm.masculine,
                                            label: term('masculine'),
                                            value: <MarkedValue val={nm.masculine} />,
                                            pattern: nm.form_masc_pattern || entry.form_masc_pattern
                                        },
                                        {
                                            label: term('dual'),
                                            value: nm.dual ? (
                                                <MarkedValue val={nm.dual} />
                                            ) : (
                                                <MarkedValue val={generateTheoreticalDual(entry.headword)} theoretical={true} />
                                            ),
                                            pattern: nm.dual_pattern || entry.dual_pattern
                                        },
                                        ...nm.plural_forms.map((f, i) => ({
                                            label: term('broken-plural'),
                                            value: <MarkedValue val={f} />,
                                            pattern: i === 0 ? (entry.morph_pattern || nm?.morph_pattern || entry.form_plural_pattern || nm?.form_plural_pattern) : undefined
                                        })),
                                        {
                                            show: !!nm.sound_plural,
                                            label: term('sound-plural'),
                                            value: <MarkedValue val={nm.sound_plural} />,
                                            pattern: entry.sound_suffix || nm.sound_suffix
                                        },
                                        { show: !!nm.collective, label: (entry as any).is_singulative ? term('collective') : term('unit-form') || 'Unit Form', value: <MarkedValue val={nm.collective} /> },
                                        { show: !!nm.singulative, label: (entry as any).is_collective ? term('singulative') : term('individual-form') || 'Individual Form', value: <MarkedValue val={nm.singulative} /> },
                                        { show: !!nm.diminutive, label: term('diminutive'), value: <MarkedValue val={nm.diminutive} /> }
                                    ]}
                                />
                            </div>

                            {/* Inflection Table */}
                            <div className="flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none">
                                <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                                    {term('inflection-table')}
                                </h2>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto overflow-y-hidden pb-4">
                                    <table className="w-full text-sm border-collapse md:min-w-[500px]">
                                        <thead>
                                            <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                                                <th className="text-left font-semibold text-black pb-2 pr-4 w-32">{term('person')}</th>
                                                <th className="text-left font-semibold text-black pb-2 pr-4">
                                                    {(entry as any).is_collective ? term('collective') : (entry as any).is_singulative ? term('singulative') : term('singular')}
                                                </th>
                                                <th className="text-left font-semibold text-black pb-2">
                                                    {(entry as any).is_collective || (entry as any).is_singulative ? (term('unit-form') || 'Unit Form / Pl.') : term('plural')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {POSSESSIVE_SUFFIX_KEYS.map((key, idx) => {
                                                return (
                                                    <tr key={key} className="border-b border-black/4 whitespace-nowrap">
                                                        <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">
                                                            {term(key)}
                                                        </td>
                                                        <td className="py-1.5 pr-4 font-serif font-normal text-black">
                                                            <MarkedValue val={applySuffix(entry.headword, idx)} />
                                                        </td>
                                                        <td className="py-1.5 font-serif font-normal text-black">
                                                            <MarkedValue val={nm.plural_forms[0] ? applySuffix(nm.plural_forms[0], idx, false, nm.morph_pattern || entry.morph_pattern) : '-'} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Unspooled View */}
                                <div className="block md:hidden space-y-6">
                                    <div className="w-full overflow-hidden">
                                        <table className="w-full border-collapse table-fixed">
                                            <thead>
                                                <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                                    <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                                    <th className="text-left pb-1">{(entry as any).is_collective ? term('collective') : (entry as any).is_singulative ? term('singulative') : term('singular')}</th>
                                                    <th className="text-right pb-1">{(entry as any).is_collective || (entry as any).is_singulative ? (term('unit-form') || 'Unit Form') : term('plural')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/2">
                                                {POSSESSIVE_SUFFIX_KEYS.map((key, idx) => {
                                                    return (
                                                        <tr key={`mobile-${key}`}>
                                                            <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term(key)}</td>
                                                            <td className="py-2 text-left">
                                                                <MarkedValue val={applySuffix(entry.headword, idx)} />
                                                            </td>
                                                            <td className="py-2 text-right">
                                                                <MarkedValue val={nm.plural_forms[0] ? applySuffix(nm.plural_forms[0], idx, false, nm.morph_pattern || entry.morph_pattern) : '-'} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Derived Terms, Usage, and Thesaurus regions */}
                                <div className="mt-16 md:mt-12 space-y-16 md:space-y-12">
                                    {/* Derived Terms */}
                                    {nm.related_entries && nm.related_entries.length > 0 && (
                                        <div className="w-full">
                                            <h2 className="font-serif font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('related-entries')}</h2>
                                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-10 text-sm mt-3 items-center md:items-start text-center md:text-left">
                                                {nm.related_entries.map(rel => (
                                                    <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif hover:underline" style={{ color: BLUE }}>
                                                        {rel.headword}{' '}
                                                        <span className="opacity-55 font-sans text-xs text-black">
                                                            "{getGloss(rel, language, mode)}"
                                                        </span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Usage Example */}
                                    {entry.definitions[0]?.example_sentences && entry.definitions[0].example_sentences.length > 0 && (
                                        <div className="w-full">
                                            <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('usage-example')}</h2>
                                            {entry.definitions[0].example_sentences.slice(0, 1).map(ex => (
                                                <div key={ex.id}>
                                                    <p className="text-sm text-black font-serif text-center md:text-left">{ex.maltese}</p>
                                                    {ex.english && (
                                                        <div className="flex mt-1 justify-center md:justify-start">
                                                            <div className="hidden md:block w-2 h-2 border-l border-b border-black/20 mr-2 -translate-y-1"></div>
                                                            <p className="text-[13px] text-black/60 italic font-sans flex-1 text-center md:text-left max-w-full sm:max-w-[280px] md:max-w-none">
                                                                {ex.english}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Thesaurus */}
                                    {((nm.synonyms?.length ?? 0) > 0 || (nm.antonyms?.length ?? 0) > 0) && (
                                        <div className="w-full">
                                            <h2 className="font-serif font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                            <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-center md:items-start text-center md:text-left">
                                                {nm.synonyms && nm.synonyms.length > 0 && (
                                                    <div>
                                                        <p className="font-semibold text-black mb-1">{term('synonyms')}</p>
                                                        {nm.synonyms.map(s => (
                                                            <div key={s.id} className="flex items-center gap-2 group">
                                                                <Link to={`/entry/${s.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                    {s.headword}
                                                                </Link>
                                                                "{getGloss(s, language, mode)}"
                                                                {isActualAdmin && (
                                                                    <AdminActionButtons
                                                                        onEdit={() => handleEditEntry(s)}
                                                                        onDelete={() => handleRemoveRelationship(s.id)}
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {nm.antonyms && nm.antonyms.length > 0 && (
                                                    <div>
                                                        <p className="font-semibold text-black mb-1">{term('antonyms')}</p>
                                                        {nm.antonyms.map(a => (
                                                            <div key={a.id} className="flex items-center gap-2 group">
                                                                <Link key={a.id} to={`/entry/${a.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                    {a.headword}
                                                                </Link>
                                                                "{getGloss(a, language, mode)}"
                                                                {isActualAdmin && (
                                                                    <AdminActionButtons
                                                                        onEdit={() => handleEditEntry(a)}
                                                                        onDelete={() => handleRemoveRelationship(a.id)}
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                        <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                            {ety && ety.chain.length > 0 && (
                                <SideCard title={term('etymology')}>
                                    <p className="text-sm text-black leading-relaxed">
                                        {term('from')}
                                        <span style={{ color: BLUE }} className="font-medium mx-1">
                                            {term(ety.chain[0].language)}
                                        </span>
                                        {ety.chain[0].script && <> <span className="font-arabic">{ety.chain[0].script}</span></>}
                                        {ety.chain[1] && <> ({ety.chain[1].form})</>}.
                                    </p>
                                </SideCard>
                            )}

                            {alternativeForms.length > 0 && (
                                <SideCard title={term('alternative-forms')}>
                                    <div className="space-y-1">
                                        {alternativeForms.map((alt: any) => (
                                            <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {relatedEntries.length > 0 && (
                                <SideCard title={term('related-entries')}>
                                    <div className="space-y-1">
                                        {relatedEntries.map((rel: any) => (
                                            <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {nm.source_citation && (
                                <SideCard title={term('sources')}>
                                    <span className="text-sm font-medium" style={{ color: GOLD }}>{nm.source_citation}</span>
                                </SideCard>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

// ── Verb View ──────────────────────────────────────────────────────────────

function VerbEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language, t } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;

    const vm = entry.verb_morphology!;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = vm.related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants;
    const pattern = entry.root_pattern_form?.pattern;

    // State
    const [polarity, setPolarity] = useState<'Positive' | 'Negative'>('Positive');
    const [doIdx, setDoIdx] = useState<number | null>(null);
    const [ioIdx, setIoIdx] = useState<number | null>(null);

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const isNeg = polarity === 'Negative';
    const isTheoretical = entry.is_inflectable === false || (entry.is_inflectable as any) === 0 || vm.is_inflectable === false || (vm.is_inflectable as any) === 0 || entry.tags?.includes('THEORETICAL') || vm.root_tags?.includes('THEORETICAL');
    // Use new per-tense vowel sets
    const vsetImpf = entry.verb_vowel_impf || vm.vowel_set_imperfect;
    const vsetPerf = entry.verb_vowel_perf || vm.vowel_set_perfect;
    const vsetImp = vm.vowel_set_imperative || 'o-o';

    // Derive or use stored conjugation
    const conj = useMemo(() => {
        if (vm.conjugation) return vm.conjugation;
        // Auto-generate
        const rootStr = entry.root_pattern_form?.root?.consonants;
        const rootObj = entry.root_pattern_form?.root;
        if (!rootStr || !rootObj) return null;

        try {
            return generateConjugation({
                root: rootStr,
                form: vm.form,
                strength: (entry.verb_class as 'strong' | 'weak' | 'geminated') || rootObj.strength,
                weakClass: (entry.verb_weak_class as 'assimilative' | 'hollow' | 'defective') || rootObj.weak_class,
                isImalaBlocked: rootObj.is_imala_blocked || /[\u0127q]|g\u0127|h/i.test(rootStr),
                vowelSetPerfect: vsetPerf,
                vowelSetImperfect: vsetImpf,
                vowelSetImperative: vsetImp,
            });
        } catch (e) {
            console.error("Conjugation error:", e);
            return null;
        }
    }, [vm, vsetPerf, vsetImpf, vsetImp, entry]);

    // Fetch siblings for accurate theoretical/plain markers
    const { entries: rootEntries } = useRootData(entry.root_pattern_form?.root?.id);

    // Auto-derive root forms (verbal noun, participles) using the SAME logic as Root.tsx
    const autoDerived = useMemo(() => {
        const rootStr = entry.root_pattern_form?.root?.consonants;
        const rootObj = entry.root_pattern_form?.root;
        if (!rootStr || !rootObj || !vm.form) return null;

        // Use root-level primary vowels for auto-derivation matching Root.tsx
        const f1 = rootEntries?.find(e => e.pos === 'verb' && e.verb_morphology?.form === 'I');
        const f1vm = f1?.verb_morphology;
        const pvSet = rootObj.vowel_set_perf || f1vm?.vowel_set_perfect || 'a-a';
        const ipvSet = rootObj.vowel_set_impf || f1vm?.vowel_set_imperfect || 'i-a';

        try {
            const rawGen = generateRootForms(
                rootStr,
                pvSet,
                ipvSet,
                (rootObj.strength || f1vm?.verb_class || 'strong') as any,
                (rootObj.weak_class || f1vm?.weak_class) as any,
                rootObj.is_imala_blocked || /[\u0127q]|g\u0127|h/i.test(rootStr)
            );
            // Use siblings if available, otherwise just itself
            const attested = getAttestedEntries(rootEntries?.length ? rootEntries : [entry]);
            const markedTable = markGeneratedForms(rawGen, attested);
            return markedTable.find(f => f.form === vm.form);
        } catch (e) {
            console.error("Auto-derivation error:", e);
            return null;
        }
    }, [entry, rootEntries, vm.form]);

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditDerived = (data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string }, type: 'active' | 'passive' | 'noun') => {
        const rootObj = entry.root_pattern_form?.root;
        const existing = rootEntries?.find(e => e.headword === data.value && (e.verb_morphology?.form === vm.form || e.pos !== 'verb'));

        if (existing) {
            setEditEntry({
                ...existing,
                _rootConsonants: (existing as any).root_consonants || rootObj?.consonants || '',
                _formLabel: existing.verb_morphology?.form || vm.form,
            } as any);
            setInitialFormData(null);
        } else {
            setEditEntry(null);
            setInitialFormData({
                headword: data.value,
                pos: type === 'noun' ? 'noun' : 'participle',
                participle_type: type === 'noun' ? '' : type,
                _formLabel: vm.form,
                _rootConsonants: rootObj?.consonants || '',
            });
        }
        setShowForm(true);
    };

    // Derived suffix strip labels (vowel-set sensitive)
    const rawDoLabels = getDoLabels(vsetImpf);
    const doLabels = ioIdx !== null ? rawDoLabels.map((lbl, idx) => {
        if (idx === 2) return '-hu-';   // -u -> -hu-
        if (idx === 3) return '-hie-';  // -ha -> -hie-
        if (idx === 6) return '-hom-'; // -hom -> -hom-
        return lbl;
    }) : rawDoLabels;
    const ioLabels = getIoLabels(vsetImpf);



    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern(pattern?.cv_notation);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                {/*<div className="flex items-center gap-2 mb-4">
                    <Link to="/search" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back-to-search')}
                    </Link>
                </div>*/}

                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center">
                        <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                            {isTheoretical && '*'}{entry.headword}
                        </h1>
                        {isActualAdmin && (
                            <button
                                onClick={() => {
                                    setEditEntry({
                                        ...entry,
                                        _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                    } as any);
                                    setShowForm(true);
                                }}
                                className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                title={term('edit-entry')}
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                    </div>
                    <SubParts entry={entry} showGender />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="w-full md:w-64 shrink-0 space-y-4 hidden md:block">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <p className="text-sm text-black leading-relaxed">
                                    {term('from')}
                                    <span style={{ color: BLUE }} className="font-medium mx-1">
                                        {term(ety.chain[0].language)}
                                    </span>
                                    {ety.chain[0].script && <> <span className="font-arabic">{ety.chain[0].script}</span></>}
                                    {ety.chain[1] && <> ({ety.chain[1].form})</>}.
                                </p>
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {vm.source_citation && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{vm.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-0 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            {/* Properties */}
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto mb-12 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => {
                                                return (
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                        {ph.dialect && ( // add this to exclude Standard dialect, && ph.dialect !== 'Standard'
                                                            <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter sm:mb-0">
                                                                {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                            </span>
                                                        )}
                                                        {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </PropRow>
                                )}

                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}
                                <PropRow label={term('transitivity')}>
                                    <span className="capitalize">{term(vm.transitivity || 'both')}</span>
                                </PropRow>

                                {(entry.usage_example || entry.usage_example_en) && (
                                    <PropRow label={t('Usage', 'Użu')} className="col-span-2 text-black text-[0.8rem] leading-none mb-1 mt-1 font-normal">
                                        {entry.usage_example && <span className="italic">"{entry.usage_example}"</span>}
                                        {entry.usage_example && entry.usage_example_en && <span className="mx-2 opacity-40">—</span>}
                                        {entry.usage_example_en && <span>"{entry.usage_example_en}"</span>}
                                    </PropRow>

                                )}


                                <PropRow label={term("vowel-set")} className="col-span-2 sm:col-span-1 md:col-span-1">
                                    <div className="space-y-0 text-sm">
                                        <p>{term('perfect')} <span className="opacity-55 text-[0.7rem]">{term('(past)')}</span>: <span className="font-mono">{vm.vowel_set_perfect}</span></p>
                                        <p>{term('imperfect')} <span className="opacity-55 text-[0.7rem]">{term('(present)')}</span>: <span className="font-mono">{vm.vowel_set_imperfect}</span></p>
                                        <p>{term('imperative')}: <span className="font-mono">{vm.vowel_set_imperative}</span></p>
                                    </div>
                                </PropRow>

                                {/* Admin / Technical Metadata */}
                                {isAdmin && entry.root_pattern_form?.root && (
                                    <div className="pt-0 border-t border-black/5">
                                        <p className="text-[10px] uppercase tracking-widest text-black/30 mb-2 font-bold">{term('internal-metadata')}</p>
                                        <div className="text-[11px] font-mono space-y-1 text-black/50">
                                            <p>{term('strength')}: {entry.verb_class || entry.root_pattern_form.root.strength}</p>
                                            {(entry.verb_weak_class || entry.root_pattern_form.root.weak_class) && <p>{term('weak-class')}: {entry.verb_weak_class || entry.root_pattern_form.root.weak_class}</p>}
                                            <p>{term('imala-blocked')}: {
                                                (entry.root_pattern_form.root.is_imala_blocked ||
                                                    /[\u0127q]|g\u0127|h/i.test(entry.root_pattern_form.root.consonants))
                                                    ? term('yes') : term('no')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conjugation Table */}
                            {conj && (
                                <div className="flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none">
                                    <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                                        {term('conjugation-table')}
                                    </h2>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto overflow-y-hidden pb-4">
                                        <table className="w-full text-sm border-collapse md:min-w-[500px]">
                                            <thead>
                                                <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                                                    <th className="text-left font-semibold text-black pb-2 pr-4 w-32">{term('person')}</th>
                                                    <th className="text-left font-semibold text-black pb-2 pr-4">
                                                        {term('imperfect')} <span className="opacity-55 font-normal text-xs">{term('(present)')}</span>
                                                    </th>
                                                    <th className="text-left font-semibold text-black pb-2">
                                                        {term('perfect')} <span className="opacity-55 font-normal text-xs">{term('(past)')}</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {conj.rows.map(row => (
                                                    <tr key={row.person_mt} className="border-b border-black/4 whitespace-nowrap">
                                                        <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">
                                                            {term(row.person_mt)}
                                                        </td>
                                                        <td className="py-1.5 pr-4 font-serif font-normal text-black">
                                                            <MarkedValue val={buildVerbForm(
                                                                row.imperfect,
                                                                isNeg,
                                                                doIdx,
                                                                ioIdx,
                                                                vsetImpf,
                                                                row.stems,
                                                                conj?.blocksImala || false,
                                                                vm.form
                                                            )} theoretical={isTheoretical} />
                                                        </td>
                                                        <td className="py-1.5 font-serif font-normal text-black">
                                                            <MarkedValue val={buildPerfectForm(
                                                                row.perfect,
                                                                row.perfect_neg ?? row.perfect,
                                                                isNeg,
                                                                doIdx,
                                                                ioIdx,
                                                                vsetPerf,
                                                                row.stems,
                                                                conj?.blocksImala || false,
                                                                vm.form
                                                            )} theoretical={isTheoretical} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm border-t border-black/8 pt-3">
                                            <p className="font-sans font-semibold text-black self-center">{term('imperative')}</p>
                                            <div>
                                                <p className="text-xs text-black/40 mb-0.5">{term('singular')}</p>
                                                <p className="font-serif font-normal text-black">
                                                    {(() => {
                                                        const row = conj.rows[1]; // inti
                                                        const base = isNeg ? row.imperfect : conj.imperative_sg;

                                                        // Prefer engine-provided stems, fallback to basic logic
                                                        const stems = isNeg ? row.stems : (conj.imperative_sg_stems || {
                                                            impfType1: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1'),
                                                            impfType2: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1')
                                                        });

                                                        const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                        const finalVal = isNeg ? result.replace(/^ma /, '') : result;
                                                        return <MarkedValue val={finalVal} theoretical={isTheoretical} />;
                                                    })()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-black/40 mb-0.5">{term('plural')}</p>
                                                <p className="font-serif font-normal text-black">
                                                    {(() => {
                                                        const row = conj.rows[5]; // intom
                                                        const base = isNeg ? row.imperfect : conj.imperative_pl;

                                                        // Prefer engine-provided stems, fallback to basic logic
                                                        const stems = isNeg ? row.stems : (conj.imperative_pl_stems || {
                                                            impfType1: conj.imperative_pl,
                                                            impfType2: conj.imperative_pl
                                                        });

                                                        const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                        const finalVal = isNeg ? result.replace(/^ma /, '') : result;
                                                        return <MarkedValue val={finalVal} theoretical={isTheoretical} />;
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Unspooled View */}
                                    <div className="block md:hidden space-y-6">
                                        {/* Perfect */}
                                        <div>
                                            <h3 className="font-sans font-semibold text-black mb-3">{term('perfect')}</h3>
                                            <div className="w-full overflow-hidden">
                                                <table className="w-full border-collapse table-fixed">
                                                    <thead>
                                                        <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                                            <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                                            <th className="text-right pb-1">{term('conjugation')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/2">
                                                        {conj.rows.map(row => (
                                                            <tr key={`perf-${row.person_mt}`}>
                                                                <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term(row.person_mt)}</td>
                                                                <td className="py-2 font-serif text-black text-right break-all text-sm">
                                                                    {isTheoretical && '*'}{buildPerfectForm(
                                                                        row.perfect,
                                                                        row.perfect_neg ?? row.perfect,
                                                                        isNeg,
                                                                        doIdx,
                                                                        ioIdx,
                                                                        vsetPerf,
                                                                        row.stems,
                                                                        conj?.blocksImala || false,
                                                                        vm.form
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Imperfect */}
                                        <div>
                                            <h3 className="font-sans font-semibold text-black mb-3">{term('imperfect')}</h3>
                                            <div className="w-full overflow-hidden">
                                                <table className="w-full border-collapse table-fixed">
                                                    <thead>
                                                        <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                                            <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                                            <th className="text-right pb-1">{term('conjugation')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/2">
                                                        {conj.rows.map(row => (
                                                            <tr key={`impf-${row.person_mt}`}>
                                                                <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term(row.person_mt)}</td>
                                                                <td className="py-2 font-serif text-black text-right break-all text-sm">
                                                                    {isTheoretical && '*'}{buildVerbForm(
                                                                        row.imperfect,
                                                                        isNeg,
                                                                        doIdx,
                                                                        ioIdx,
                                                                        vsetImpf,
                                                                        row.stems,
                                                                        conj?.blocksImala || false,
                                                                        vm.form
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Imperative */}
                                        <div>
                                            <h3 className="font-sans font-semibold text-black mb-3">{term('imperative')}</h3>
                                            <div className="w-full overflow-hidden">
                                                <table className="w-full border-collapse table-fixed">
                                                    <thead>
                                                        <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                                            <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                                            <th className="text-right pb-1">{term('conjugation')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/2">
                                                        <tr>
                                                            <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term('singular')}</td>
                                                            <td className="py-2 font-serif text-black text-right break-all text-sm">
                                                                {(() => {
                                                                    const row = conj.rows[1];
                                                                    const base = isNeg ? row.imperfect : conj.imperative_sg;
                                                                    const stems = isNeg ? row.stems : (conj.imperative_sg_stems || { impfType1: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1'), impfType2: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1') });
                                                                    const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                                    return (isTheoretical ? '*' : '') + (isNeg ? result.replace(/^ma /, '') : result);
                                                                })()}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term('plural')}</td>
                                                            <td className="py-2 font-serif text-black text-right break-all text-sm">
                                                                {(() => {
                                                                    const row = conj.rows[5];
                                                                    const base = isNeg ? row.imperfect : conj.imperative_pl;
                                                                    const stems = isNeg ? row.stems : (conj.imperative_pl_stems || { impfType1: conj.imperative_pl, impfType2: conj.imperative_pl });
                                                                    const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                                    return (isTheoretical ? '*' : '') + (isNeg ? result.replace(/^ma /, '') : result);
                                                                })()}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Controls (Polarity & Pronouns) */}
                                    <div className="mt-4 pt-6 border-t border-black/8 space-y-4 w-full max-w-[340px] mx-auto md:max-w-none md:mx-0">
                                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                            <p className="text-xs text-black font-semibold mb-1.5 font-sans">{term('polarity')}</p>
                                            <TogglePill
                                                options={['Positive', 'Negative']}
                                                active={polarity}
                                                labels={[term('positive'), term('negative')]}
                                                onChange={v => setPolarity(v as any)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                                <p className="text-xs text-black font-semibold mb-1.5 font-sans">{term('direct-object')}</p>
                                                <SuffixStrip
                                                    labels={doLabels}
                                                    activeIdx={doIdx}
                                                    disabledIndices={ioIdx !== null ? [0, 1, 4, 5] : []}
                                                    onToggle={idx => setDoIdx(prev => prev === idx ? null : idx)}
                                                />
                                            </div>
                                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                                <p className="text-xs text-black font-semibold mb-1.5 font-sans">{term('indirect-object')}</p>
                                                <SuffixStrip
                                                    labels={ioLabels}
                                                    activeIdx={ioIdx}
                                                    onToggle={idx => {
                                                        const newIoIdx = ioIdx === idx ? null : idx;
                                                        setIoIdx(newIoIdx);
                                                        if (newIoIdx !== null && doIdx !== null && [0, 1, 4, 5].includes(doIdx)) {
                                                            setDoIdx(null);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Derived Terms, Usage, and Thesaurus regions moved here to align with the Conjugation Table pillar */}
                                    <div className="mt-16 md:mt-12 space-y-16 md:space-y-12">
                                        {/* Derived Terms */}
                                        {autoDerived && (autoDerived.imperfect.value !== '-' || autoDerived.imperative.value !== '-' || autoDerived.verbalNoun.value !== '-' || autoDerived.passiveParticiple.value !== '-' || autoDerived.activeParticiple.value !== '-') && (
                                            <div className="w-full">
                                                <h2 className="font-serif font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('derived-terms')}</h2>
                                                <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-10 text-sm mt-3 items-center md:items-start text-center md:text-left">
                                                    {autoDerived.passiveParticiple.value !== '-' && (
                                                        <DerivedTermLink
                                                            label={term('passive')}
                                                            data={autoDerived.passiveParticiple}
                                                            isAdmin={isActualAdmin}
                                                            onDelete={() => autoDerived!.passiveParticiple.entryId && handleRemoveRelationship(autoDerived!.passiveParticiple.entryId)}
                                                            onEdit={() => handleEditDerived(autoDerived!.passiveParticiple, 'passive')}
                                                        />
                                                    )}
                                                    {autoDerived.activeParticiple.value !== '-' && (
                                                        <DerivedTermLink
                                                            label={term('active')}
                                                            data={autoDerived.activeParticiple}
                                                            isAdmin={isActualAdmin}
                                                            onDelete={() => autoDerived!.activeParticiple.entryId && handleRemoveRelationship(autoDerived!.activeParticiple.entryId)}
                                                            onEdit={() => handleEditDerived(autoDerived!.activeParticiple, 'active')}
                                                        />
                                                    )}
                                                    {autoDerived.verbalNoun.value !== '-' && (
                                                        <DerivedTermLink
                                                            label={term('verbal-noun')}
                                                            data={autoDerived.verbalNoun}
                                                            isAdmin={isActualAdmin}
                                                            onDelete={() => autoDerived!.verbalNoun.entryId && handleRemoveRelationship(autoDerived!.verbalNoun.entryId)}
                                                            onEdit={() => handleEditDerived(autoDerived!.verbalNoun, 'noun')}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Usage Example */}
                                        {entry.definitions[0]?.example_sentences && entry.definitions[0].example_sentences.length > 0 && (
                                            <div className="w-full">
                                                <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('usage-example')}</h2>
                                                {entry.definitions[0].example_sentences.slice(0, 1).map(ex => (
                                                    <div key={ex.id}>
                                                        <p className="text-sm text-black font-serif text-center md:text-left">{ex.maltese}</p>
                                                        {ex.english && (
                                                            <div className="flex mt-1 justify-center md:justify-start">
                                                                <div className="hidden md:block w-2 h-2 border-l border-b border-black/20 mr-2 -translate-y-1"></div>
                                                                <p className="text-[13px] text-black/60 italic font-sans flex-1 text-center md:text-left max-w-full sm:max-w-[280px] md:max-w-none">
                                                                    {ex.english}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Thesaurus */}
                                        {((vm.synonyms?.length ?? 0) > 0 || (vm.antonyms?.length ?? 0) > 0) && (
                                            <div className="w-full">
                                                <h2 className="font-serif font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                                <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-center md:items-start text-center md:text-left">
                                                    {vm.synonyms && vm.synonyms.length > 0 && (
                                                        <div>
                                                            <p className="font-semibold text-black mb-1">{term('synonyms')}</p>
                                                            {vm.synonyms.map(s => (
                                                                <div key={s.id} className="flex items-center gap-2 group">
                                                                    <Link to={`/entry/${s.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                        {s.headword}
                                                                    </Link>
                                                                    <span className="opacity-55 font-sans text-xs text-black truncate max-w-[120px]">
                                                                        "{getGloss(s, language, mode)}"
                                                                    </span>
                                                                    {isActualAdmin && (
                                                                        <AdminActionButtons
                                                                            onEdit={() => handleEditEntry(s)}
                                                                            onDelete={() => handleRemoveRelationship(s.id)}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {vm.antonyms && vm.antonyms.length > 0 && (
                                                        <div>
                                                            <p className="font-semibold text-black mb-1">{term('antonyms')}</p>
                                                            {vm.antonyms.map(a => (
                                                                <div key={a.id} className="flex items-center gap-2 group">
                                                                    <Link key={a.id} to={`/entry/${a.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                        {a.headword}
                                                                    </Link>
                                                                    <span className="opacity-55 font-sans text-xs text-black truncate max-w-[120px]">
                                                                        "{getGloss(a, language, mode)}"
                                                                    </span>
                                                                    {isActualAdmin && (
                                                                        <AdminActionButtons
                                                                            onEdit={() => handleEditEntry(a)}
                                                                            onDelete={() => handleRemoveRelationship(a.id)}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                        <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                            {ety && ety.chain.length > 0 && (
                                <SideCard title={term('etymology')}>
                                    <p className="text-sm text-black leading-relaxed">
                                        {term('from')}
                                        <span style={{ color: BLUE }} className="font-medium mx-1">
                                            {term(ety.chain[0].language)}
                                        </span>
                                        {ety.chain[0].script && <> <span className="font-arabic">{ety.chain[0].script}</span></>}
                                        {ety.chain[1] && <> ({ety.chain[1].form})</>}.
                                    </p>
                                </SideCard>
                            )}

                            {alternativeForms.length > 0 && (
                                <SideCard title={term('alternative-forms')}>
                                    <div className="space-y-1">
                                        {alternativeForms.map((alt: any) => (
                                            <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {relatedEntries.length > 0 && (
                                <SideCard title={term('related-entries')}>
                                    <div className="space-y-1">
                                        {relatedEntries.map((rel: any) => (
                                            <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {vm.source_citation && (
                                <SideCard title={term('sources')}>
                                    <span className="text-sm font-medium" style={{ color: GOLD }}>{vm.source_citation}</span>
                                </SideCard>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

// ── Numeral View ──────────────────────────────────────────────────────────

function NumeralEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;
    const nm = entry.numeral_morphology || (entry as any).numeral_morphology;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = (entry as any).related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });

    if (!entry) return null;

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;

    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern((entry as any).cv_pattern || pattern?.cv_notation);

    const { entries: rootEntries } = useRootData(entry.root_pattern_form?.root?.id);

    const autoForms = useMemo(() => {
        if (rootConsonants) {
            try {
                return generateNumeralForms(entry.headword, rootConsonants);
            } catch (e) {
                console.error("Numeral generation error:", e);
                return {} as NumeralAutoForms;
            }
        }
        return {} as NumeralAutoForms;
    }, [entry.headword, rootConsonants]);

    const markedAutoForms = useMemo(() => {
        if (!autoForms || !rootEntries) return autoForms;

        const mark = (val: string | undefined) => {
            if (!val || val === '-') return { value: '-', marker: 'plain' };
            const cleanVal = val.startsWith('*') ? val.substring(1) : val;
            const existing = rootEntries.find(e => e.headword === cleanVal);
            return {
                value: cleanVal,
                marker: existing ? 'plain' : (val.startsWith('*') ? 'theoretical' : 'auto_generated'),
                entryId: existing?.id
            } as { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string };
        };

        return {
            ordinal: mark(autoForms.ordinal),
            adverbial: mark(autoForms.adverbial),
            fractional_semitic: mark(autoForms.fractional_semitic),
            multiplier_form1: mark(autoForms.multiplier_form1),
            multiplier_form2: mark(autoForms.multiplier_form2),
            distributive: mark(autoForms.distributive),
        };
    }, [autoForms, rootEntries]);

    const handleEditNumeralForm = (data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string }, type: string) => {
        if (data.marker === 'plain' && data.entryId) {
            const existing = rootEntries?.find(e => e.id === data.entryId);
            if (existing) {
                setEditEntry({
                    ...existing,
                    _rootConsonants: rootConsonants || ''
                } as any);
                setInitialFormData(null);
            }
        } else {
            setEditEntry(null);
            setInitialFormData({
                headword: data.value,
                pos: type === 'ordinal' ? 'adjective' : (type === 'adverbial' ? 'adverb' : 'noun'),
                _rootConsonants: rootConsonants || ''
            });
        }
        setShowForm(true);
    };

    const renderNumeralLink = (data: any, type: string) => {
        const isM = typeof data === 'object' && data !== null && 'value' in data;
        if (!isM) return <MarkedValue val={data} theoretical={true} />;

        const { value, marker, entryId } = data as { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string };
        if (value === '-') return <span className="opacity-40">-</span>;

        const content = (marker === 'plain' && entryId) ? (
            <Link to={`/entry/${entryId}`} style={{ color: BLUE }} className="hover:underline">
                {value}
            </Link>
        ) : (
            <span className={cn(marker !== 'plain' && "opacity-45")}>
                {marker === 'theoretical' ? '*' : (marker === 'auto_generated' ? '✦' : '')}{value}
            </span>
        );

        if (!isActualAdmin) return content;

        return (
            <div className="flex items-center gap-2 group/btn">
                {content}
                <div className="flex items-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.preventDefault(); handleEditNumeralForm(data, type); }}
                        className="p-1 rounded hover:bg-black/5 text-black/55 transition-all"
                        title={marker === 'plain' ? 'Edit Entry' : 'Add Entry'}
                    >
                        {marker === 'plain' ? <Edit2 size={12} /> : <Plus size={12} />}
                    </button>
                    {marker === 'plain' && entryId && (
                        <button
                            onClick={(e) => { e.preventDefault(); handleRemoveRelationship(entryId); }}
                            className="p-1 rounded hover:bg-black/5 text-red-400 hover:text-red-600 transition-all"
                            title={term('remove-relationship') || 'Remove Relationship'}
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <SubParts entry={entry} showGender />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions?.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                )) || <li>-</li>}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="hidden md:block w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions?.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                )) || <li>-</li>}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <p className="text-sm text-black leading-relaxed">
                                    {term('from')}
                                    {ety.chain.map((c, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                                            <span style={{ color: BLUE }} className="font-medium mx-1">
                                                {term(c.language)}
                                            </span>
                                            {c.form && <span className="font-serif font-medium">{c.form}</span>}
                                            {c.meaning && <span className="opacity-70"> "{c.meaning}"</span>}
                                        </React.Fragment>
                                    ))}.
                                </p>
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {nm.source_citation && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{nm.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-8 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            {/* Properties */}
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto md:max-w-none mb-12 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}

                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}

                                <VowelSetGrid morphology={{ ...entry, ...nm }} />

                                <MorphologyGrid
                                    title={term('morphology')}
                                    displayPattern={displayPattern}
                                    rows={[
                                        {
                                            label: term('type') || 'Type',
                                            value: <span className="capitalize">{entry.numeral_type || nm?.numeral_type || '-'}</span>,
                                            show: !!(entry.numeral_type || nm?.numeral_type)
                                        },
                                        {
                                            label: term('masculine'),
                                            value: nm?.lemma_masc || entry.form_masc || entry.headword,
                                            pattern: nm?.gender?.toLowerCase() === 'masculine' ? (nm.lemma_pattern || entry.lemma_pattern) : (nm?.form_masc_pattern || entry.form_masc_pattern)
                                        },
                                        {
                                            label: term('feminine'),
                                            value: nm?.lemma_fem || entry.form_fem,
                                            pattern: (nm?.gender?.toLowerCase() === 'feminine' && !nm.form_fem_pattern && !entry.form_fem_pattern)
                                                ? (nm.lemma_pattern || entry.lemma_pattern)
                                                : (nm?.form_fem_pattern || entry.form_fem_pattern)
                                        },
                                        {
                                            label: term('short-attributive') || 'Short',
                                            value: nm?.form_attributive_short || entry.form_attributive_short,
                                            theoretical: !nm?.form_attributive_short && !entry.form_attributive_short
                                        },
                                        {
                                            label: term('long-attributive') || 'Long',
                                            value: nm?.form_attributive_long || entry.form_attributive_long,
                                            theoretical: !nm?.form_attributive_long && !entry.form_attributive_long
                                        },
                                        {
                                            label: term('plural'),
                                            value: nm?.inflections_pl?.[0] || entry.inflections_pl?.[0] || (entry.headword === 'wieħed' ? 'uħud' : null),
                                            show: !!(nm?.inflections_pl?.[0] || entry.inflections_pl?.[0] || entry.headword === 'wieħed'),
                                            pattern: entry.morph_pattern || nm?.morph_pattern || entry.form_plural_pattern || nm?.form_plural_pattern
                                        },
                                        {
                                            label: term('ordinal') || 'Ordinal',
                                            value: renderNumeralLink(markedAutoForms.ordinal, 'ordinal'),
                                        },
                                        {
                                            label: term('adverbial') || 'Adverbial',
                                            value: renderNumeralLink(markedAutoForms.adverbial, 'adverbial'),
                                        },
                                        {
                                            label: term('fractional') || 'Fractional (Sem.)',
                                            value: renderNumeralLink(markedAutoForms.fractional_semitic, 'fractional'),
                                        },
                                        {
                                            label: term('multiplier') || 'Multiplier',
                                            value: (
                                                <div className="flex flex-col gap-1">
                                                    {renderNumeralLink(markedAutoForms.multiplier_form1, 'multiplier')}
                                                    {renderNumeralLink(markedAutoForms.multiplier_form2, 'multiplier')}
                                                </div>
                                            )
                                        },
                                        {
                                            label: term('distributive') || 'Distributive',
                                            value: renderNumeralLink(markedAutoForms.distributive, 'distributive'),
                                        }
                                    ]}
                                />

                                {/* Usage and Thesaurus */}
                                <div className="mt-12 space-y-12">
                                    {/* Usage Example */}
                                    {entry.definitions?.[0]?.example_sentences && entry.definitions[0].example_sentences.length > 0 && (
                                        <div className="w-full">
                                            <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('usage-example')}</h2>
                                            {entry.definitions[0].example_sentences.slice(0, 1).map(ex => (
                                                <div key={ex.id}>
                                                    <p className="text-sm text-black font-serif text-center md:text-left">{ex.maltese}</p>
                                                    {ex.english && (
                                                        <div className="flex mt-1 justify-center md:justify-start">
                                                            <div className="hidden md:block w-2 h-2 border-l border-b border-black/20 mr-2 -translate-y-1"></div>
                                                            <p className="text-[13px] text-black/60 italic font-sans flex-1 text-center md:text-left max-w-full sm:max-w-[280px] md:max-w-none">
                                                                {ex.english}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                        <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                            {ety && ety.chain.length > 0 && (
                                <SideCard title={term('etymology')}>
                                    <p className="text-sm text-black leading-relaxed">
                                        {term('from')}
                                        <span style={{ color: BLUE }} className="font-medium mx-1">
                                            {term(ety.chain[0].language)}
                                        </span>
                                        {ety.chain[0].script && <> <span className="font-arabic">{ety.chain[0].script}</span></>}
                                        {ety.chain[1] && <> ({ety.chain[1].form})</>}.
                                    </p>
                                </SideCard>
                            )}

                            {alternativeForms.length > 0 && (
                                <SideCard title={term('alternative-forms')}>
                                    <div className="space-y-1">
                                        {alternativeForms.map((alt: any) => (
                                            <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {relatedEntries.length > 0 && (
                                <SideCard title={term('related-entries')}>
                                    <div className="space-y-1">
                                        {relatedEntries.map((rel: any) => (
                                            <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {nm.source_citation && (
                                <SideCard title={term('sources')}>
                                    <span className="text-sm font-medium" style={{ color: GOLD }}>{nm.source_citation}</span>
                                </SideCard>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

// ── Adjective View ─────────────────────────────────────────────────────────

function AdjectiveEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;
    const am = entry.adjective_morphology!;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = am.related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;

    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern((entry as any).cv_pattern || pattern?.cv_notation);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    const elative = useMemo(() => {
        // Disable generation if any tag contains $ or is 'invariable'
        const isElativeDisabled = entry.tags?.some(tag => tag.includes('$') || tag.toLowerCase() === 'invariable');
        if (isElativeDisabled) return null;

        if (am.elative) return { masculine: am.elative, feminine: null };
        if (rootConsonants) {
            return generateElative(rootConsonants, entry.headword);
        }
        return null;
    }, [am.elative, rootConsonants, entry.headword, entry.tags]);

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <SubParts entry={entry} showGender />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="hidden md:block w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <p className="text-sm text-black leading-relaxed">
                                    {term('from')}
                                    {ety.chain.map((c, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                                            <span style={{ color: BLUE }} className="font-medium mx-1">
                                                {term(c.language)}
                                            </span>
                                            {c.form && <span className="font-serif font-medium">{c.form}</span>}
                                            {c.meaning && <span className="opacity-70"> "{c.meaning}"</span>}
                                        </React.Fragment>
                                    ))}.
                                </p>
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {am.source_citation && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{am.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-8 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            {/* Properties */}
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto md:max-w-none mb-12 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}

                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}

                                <VowelSetGrid morphology={{ ...entry, ...am }} />
                            </div>

                            {/* Morphology Table */}
                            <div className="flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none">
                                <MorphologyTable
                                    title={term('morphology')}
                                    displayPattern={displayPattern}
                                    rows={[
                                        {
                                            label: term('masculine'),
                                            value: am.masculine || (am.gender !== 'feminine' ? entry.headword : null),
                                            show: am.gender !== 'feminine' || !!am.masculine,
                                            pattern: am.gender?.toLowerCase() === 'masculine' ? (am.lemma_pattern || entry.lemma_pattern) : (am.form_masc_pattern || entry.form_masc_pattern)
                                        },
                                        {
                                            label: term('feminine'),
                                            value: am.feminine || (am.gender === 'feminine' ? entry.headword : null),
                                            show: am.gender === 'feminine' || !!am.feminine,
                                            pattern: (am.gender?.toLowerCase() === 'feminine' && !am.form_fem_pattern && !entry.form_fem_pattern)
                                                ? (am.lemma_pattern || entry.lemma_pattern)
                                                : (am.form_fem_pattern || entry.form_fem_pattern)
                                        },
                                        {
                                            label: term('plural') || 'Plural',
                                            value: am.plural,
                                            pattern: entry.morph_pattern || am?.morph_pattern || entry.form_plural_pattern || am?.form_plural_pattern
                                        },
                                        {
                                            label: term('diminutive'),
                                            show: !!entry.diminutive_form,
                                            value: entry.diminutive_form,
                                            pattern: entry.diminutive_pattern || am.diminutive_pattern
                                        },
                                        {
                                            label: term('elative-masculine') || 'Elative (Masc)',
                                            value: elative?.masculine,
                                            theoretical: !am.elative,
                                            show: !!elative
                                        },
                                        {
                                            label: term('elative-feminine') || 'Elative (Fem)',
                                            value: elative?.feminine,
                                            theoretical: true,
                                            show: !!elative
                                        }
                                    ]}
                                />

                                {/* Usage Example */}
                                {entry.definitions[0]?.example_sentences && entry.definitions[0].example_sentences.length > 0 && (
                                    <div className="w-full">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('usage-example')}</h2>
                                        {entry.definitions[0].example_sentences.slice(0, 1).map(ex => (
                                            <div key={ex.id}>
                                                <p className="text-sm text-black font-serif text-center md:text-left">{ex.maltese}</p>
                                                {ex.english && (
                                                    <div className="flex mt-1 justify-center md:justify-start">
                                                        <div className="hidden md:block w-2 h-2 border-l border-b border-black/20 mr-2 -translate-y-1"></div>
                                                        <p className="text-[13px] text-black/60 italic font-sans flex-1 text-center md:text-left max-w-full sm:max-w-[280px] md:max-w-none">
                                                            {ex.english}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Thesaurus */}
                                {((am.synonyms?.length ?? 0) > 0 || (am.antonyms?.length ?? 0) > 0) && (
                                    <div className="w-full">
                                        <h2 className="font-serif font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-center md:items-start text-center md:text-left">
                                            {am.synonyms && am.synonyms.length > 0 && (
                                                <div>
                                                    <p className="font-semibold text-black mb-1">{term('synonyms')}</p>
                                                    {am.synonyms.map((s: any) => (
                                                        <div key={s.id} className="flex items-center gap-2 group">
                                                            <Link to={`/entry/${s.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                {s.headword}
                                                            </Link>
                                                            "{getGloss(s, language, mode)}"
                                                            {isActualAdmin && (
                                                                <AdminActionButtons
                                                                    onEdit={() => handleEditEntry(s)}
                                                                    onDelete={() => handleRemoveRelationship(s.id)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {am.antonyms && am.antonyms.length > 0 && (
                                                <div>
                                                    <p className="font-semibold text-black mb-1">{term('antonyms')}</p>
                                                    {am.antonyms.map((a: any) => (
                                                        <div key={a.id} className="flex items-center gap-2 group">
                                                            <Link key={a.id} to={`/entry/${a.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                {a.headword}
                                                            </Link>
                                                            "{getGloss(a, language, mode)}"
                                                            {isActualAdmin && (
                                                                <AdminActionButtons
                                                                    onEdit={() => handleEditEntry(a)}
                                                                    onDelete={() => handleRemoveRelationship(a.id)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                            <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                                {ety && ety.chain.length > 0 && (
                                    <SideCard title={term('etymology')}>
                                        <p className="text-sm text-black leading-relaxed">
                                            {term('from')}
                                            {ety.chain.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                                                    <span style={{ color: BLUE }} className="font-medium mx-1">
                                                        {term(c.language)}
                                                    </span>
                                                    {c.form && <span className="font-serif font-medium">{c.form}</span>}
                                                    {c.meaning && <span className="opacity-70"> "{c.meaning}"</span>}
                                                </React.Fragment>
                                            ))}.
                                        </p>
                                    </SideCard>
                                )}

                                {alternativeForms.length > 0 && (
                                    <SideCard title={term('alternative-forms')}>
                                        <div className="space-y-1">
                                            {alternativeForms.map((alt: any) => (
                                                <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                    {alt.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-black">
                                                        "{getGloss(alt, language, mode)}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </SideCard>
                                )}

                                {relatedEntries.length > 0 && (
                                    <SideCard title={term('related-entries')}>
                                        <div className="space-y-1">
                                            {relatedEntries.map((rel: any) => (
                                                <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                    {rel.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-black">
                                                        "{getGloss(rel, language, mode)}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </SideCard>
                                )}

                                {am.source_citation && (
                                    <SideCard title={term('sources')}>
                                        <span className="text-sm font-medium" style={{ color: GOLD }}>{am.source_citation}</span>
                                    </SideCard>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}


function ParticipleEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = (entry as any).related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });
    //const pm = entry.adjective_morphology!;

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;

    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern((entry as any).cv_pattern || pattern?.cv_notation);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <SubParts entry={entry} showGender />
                    <div className="mt-2 text-xs font-sans uppercase tracking-[0.2em] text-[#1034A6] font-bold">
                        {entry.participle_type ? term(entry.participle_type) : term('participle')}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="hidden md:block w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <p className="text-sm text-black leading-relaxed">
                                    {term('from')}
                                    {ety.chain.map((c, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                                            <span style={{ color: BLUE }} className="font-medium mx-1">
                                                {term(c.language)}
                                            </span>
                                            {c.form && <span className="font-serif font-medium">{c.form}</span>}
                                            {c.meaning && <span className="opacity-70"> "{c.meaning}"</span>}
                                        </React.Fragment>
                                    ))}.
                                </p>
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-8 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto md:max-w-none mb-12 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}
                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}
                                <VowelSetGrid morphology={entry} />

                                <div className="mt-4 border-t border-black/5" />
                            </div>

                            <div className="flex-1 min-w-0 w-full space-y-12">
                                <MorphologyTable
                                    title={term('morphology')}
                                    displayPattern={displayPattern}
                                    rows={[
                                        {
                                            label: term('gender'),
                                            value: <span className="capitalize">{entry.participle_gender ? term(entry.participle_gender) : '-'}</span>,
                                            show: !!entry.participle_gender
                                        },
                                        {
                                            label: term('masculine'),
                                            value: (entry as any).adj_masculine || (entry.participle_gender !== 'feminine' ? entry.headword : null),
                                            show: entry.participle_gender !== 'feminine' || !!(entry as any).adj_masculine,
                                            pattern: entry.participle_gender?.toLowerCase() === 'masculine' ? entry.lemma_pattern : entry.form_masc_pattern
                                        },
                                        {
                                            label: term('feminine'),
                                            value: (entry as any).adj_feminine || (entry.participle_gender === 'feminine' ? entry.headword : null),
                                            show: entry.participle_gender === 'feminine' || !!(entry as any).adj_feminine,
                                            pattern: (entry.participle_gender?.toLowerCase() === 'feminine' && !entry.form_fem_pattern)
                                                ? entry.lemma_pattern
                                                : entry.form_fem_pattern
                                        },
                                        {
                                            label: term('plural'),
                                            value: (entry as any).adj_plural,
                                            pattern: entry.form_plural_pattern || entry.morph_pattern
                                        },
                                        {
                                            label: term('elative') || 'Elative',
                                            value: (entry as any).adj_elative || entry.adjective_morphology?.elative,
                                            show: !!((entry as any).adj_elative || entry.adjective_morphology?.elative) && !entry.tags?.some(t => t.includes('$') || t.toLowerCase() === 'invariable')
                                        }
                                    ]}
                                />

                                {entry.usage_example && (
                                    <div className="w-full">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3">{term('usage-example')}</h2>
                                        <p className="text-sm text-black font-serif italic">"{entry.usage_example}"</p>
                                        {entry.usage_example_en && <p className="text-xs text-black/60 mt-1">"{entry.usage_example_en}"</p>}
                                    </div>
                                )}

                                {((entry as any).synonyms?.length > 0 || (entry as any).antonyms?.length > 0) && (
                                    <div className="w-full">
                                        <h2 className="font-serif font-semibold text-[1.25rem] text-black mb-3">{term('thesaurus')}</h2>
                                        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3">
                                            {(entry as any).synonyms && (entry as any).synonyms.length > 0 && (
                                                <div>
                                                    <p className="font-semibold text-black mb-1">{term('synonyms')}</p>
                                                    {(entry as any).synonyms.map((s: any) => (
                                                        <div key={s.id} className="flex items-center gap-2 group">
                                                            <Link to={`/entry/${s.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                {s.headword}
                                                            </Link>
                                                            "{getGloss(s, language, mode)}"
                                                            {isActualAdmin && (
                                                                <AdminActionButtons
                                                                    onEdit={() => handleEditEntry(s)}
                                                                    onDelete={() => handleRemoveRelationship(s.id)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {(entry as any).antonyms && (entry as any).antonyms.length > 0 && (
                                                <div>
                                                    <p className="font-semibold text-black mb-1">{term('antonyms')}</p>
                                                    {(entry as any).antonyms.map((a: any) => (
                                                        <div key={a.id} className="flex items-center gap-2 group">
                                                            <Link key={a.id} to={`/entry/${a.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                {a.headword}
                                                            </Link>
                                                            "{getGloss(a, language, mode)}"
                                                            {isActualAdmin && (
                                                                <AdminActionButtons
                                                                    onEdit={() => handleEditEntry(a)}
                                                                    onDelete={() => handleRemoveRelationship(a.id)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                            <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                                {ety && ety.chain.length > 0 && (
                                    <SideCard title={term('etymology')}>
                                        <p className="text-sm text-black leading-relaxed">
                                            {term('from')}
                                            {ety.chain.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                                                    <span style={{ color: BLUE }} className="font-medium mx-1">
                                                        {term(c.language)}
                                                    </span>
                                                    {c.form && <span className="font-serif font-medium">{c.form}</span>}
                                                    {c.meaning && <span className="opacity-70"> "{c.meaning}"</span>}
                                                </React.Fragment>
                                            ))}.
                                        </p>
                                    </SideCard>
                                )}

                                {alternativeForms.length > 0 && (
                                    <SideCard title={term('alternative-forms')}>
                                        <div className="space-y-1">
                                            {alternativeForms.map((alt: any) => (
                                                <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                    {alt.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-black">
                                                        "{getGloss(alt, language, mode)}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </SideCard>
                                )}

                                {relatedEntries.length > 0 && (
                                    <SideCard title={term('related-entries')}>
                                        <div className="space-y-1">
                                            {relatedEntries.map((rel: any) => (
                                                <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                    {rel.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-black">
                                                        "{getGloss(rel, language, mode)}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </SideCard>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

function FunctionWordEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();
    const isActualAdmin = isAdmin && adminViewEnabled;

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const pos = (entry.pos || '').toLowerCase();
    const isInterjection = pos === 'interjection';
    const isPronoun = pos === 'pronoun';
    const isArticle = pos === 'article';
    const isInflectablePos = ['pronoun', 'particle', 'adverb', 'preposition', 'article'].includes(pos);
    const hasInflection = isInflectablePos && !(entry.is_inflectable === false || (entry.is_inflectable as any) === 0);

    const parseMaybeArray = <T,>(val: any): T[] => {
        if (Array.isArray(val)) return val as T[];
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed) return [];
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            }
            return trimmed.split(',').map(s => s.trim()).filter(Boolean) as any;
        }
        return [];
    };

    const allRelatedEntries = parseMaybeArray<any>((entry as any).related_entries);
    const directAlternativeForms = parseMaybeArray<any>((entry as any).alternative_forms);
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });
    const synonyms = parseMaybeArray<any>((entry as any).synonyms);
    const antonyms = parseMaybeArray<any>((entry as any).antonyms);
    const inflectionPlurals = parseMaybeArray<string>((entry as any).inflections_pl);

    const ety = entry.etymologies?.[0];
    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-')
        || entry.root_pattern_form?.root?.consonants
        || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;
    const patternValue = (entry as any).cv_pattern || pattern?.cv_notation;

    const isIlArticle = (isArticle || pos === 'particle') && /^il-?/i.test((entry.headword || '').trim());

    const sunTransformations = [
        { letter: 'ċ', rule: 'il- → iċ-', example: 'ċertu', result: 'iċ-ċertu' },
        { letter: 'd', rule: 'il- → id-', example: 'dar', result: 'id-dar' },
        { letter: 'n', rule: 'il- → in-', example: 'nar', result: 'in-nar' },
        { letter: 'r', rule: 'il- → ir-', example: 'raġel', result: 'ir-raġel' },
        { letter: 's', rule: 'il- → is-', example: 'sema', result: 'is-sema' },
        { letter: 't', rule: 'il- → it-', example: 'tarġa', result: 'it-tarġa' },
        { letter: 'x', rule: 'il- → ix-', example: 'xemx', result: 'ix-xemx' },
        { letter: 'ż', rule: 'il- → iż-', example: 'żarbun', result: 'iż-żarbun' },
        { letter: 'z', rule: 'il- → iz-', example: 'zokkor', result: 'iz-zokkor' },
    ];

    const moonTransformations = [
        { letter: 'b', rule: 'il- → il-', example: 'bieb', result: 'il-bieb' },
        { letter: 'f', rule: 'il- → il-', example: 'fenek', result: 'il-fenek' },
        { letter: 'g', rule: 'il- → il-', example: 'gżira', result: 'il-gżira' },
        { letter: 'ġ', rule: 'il- → il-', example: 'ġurnata', result: 'il-ġurnata' },
        { letter: 'għ', rule: 'il- → l-', example: 'għasfur', result: 'l-għasfur' },
        { letter: 'h', rule: 'il- → l-', example: 'hena', result: 'l-hena' },
        { letter: 'ħ', rule: 'il- → il-', example: 'ħobż', result: 'il-ħobż' },
        { letter: 'j', rule: 'il- → il-', example: 'jum', result: 'il-jum' },
        { letter: 'k', rule: 'il- → il-', example: 'klieb', result: 'il-klieb' },
        { letter: 'l', rule: 'il- → il-', example: 'lejl', result: 'il-lejl' },
        { letter: 'm', rule: 'il- → il-', example: 'mejda', result: 'il-mejda' },
        { letter: 'p', rule: 'il- → il-', example: 'pjanu', result: 'il-pjanu' },
        { letter: 'q', rule: 'il- → il-', example: 'qamar', result: 'il-qamar' },
        { letter: 'v', rule: 'il- → il-', example: 'vapur', result: 'il-vapur' },
        { letter: 'w', rule: 'il- → il-', example: 'werqa', result: 'il-werqa' },
    ];

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const POSSESSIVE_SUFFIX_KEYS = ['1s', '2s', '3ms', '3fs', '1p', '2p', '3p'];
    const applySuffix = (base: string, idx: number) => {
        if (!base) return { value: '-', theoretical: false };
        const result = applyPossessiveSuffix(base, idx as any, (entry.gender as any) || 'masculine', (entry as any).cv_pattern || pattern?.cv_notation);
        if (result === '-') return { value: '-', theoretical: false };
        const parts = result.split(' / ');
        if (parts.length > 1) {
            return {
                value: (
                    <div className="flex flex-col gap-0.5">
                        {parts.map((p, i) => <span key={i} className={i > 0 ? 'text-black/40' : ''}>{p}</span>)}
                    </div>
                ),
                theoretical: false
            };
        }
        return { value: result, theoretical: false };
    };

    const pluralBase = isPronoun ? (inflectionPlurals[0] || '') : '';
    const showPluralColumn = isPronoun && !!pluralBase;

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <SubParts entry={entry} showGender={isPronoun} />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    <div className="w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <p className="text-sm text-black leading-relaxed">
                                    {term('from')}
                                    {ety.chain.map((c, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                                            <span style={{ color: BLUE }} className="font-medium mx-1">
                                                {term(c.language)}
                                            </span>
                                            {c.form && <span className="font-serif font-medium">{c.form}</span>}
                                            {c.meaning && <span className="opacity-70"> "{c.meaning}"</span>}
                                        </React.Fragment>
                                    ))}.
                                </p>
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-8 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto md:max-w-none mb-8 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}
                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}
                                {patternValue && (
                                    <PropRow label={mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern')}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}
                                {isPronoun && entry.gender && (
                                    <PropRow label={term('gender')}>
                                        <span className="capitalize">{term(entry.gender)}</span>
                                    </PropRow>
                                )}
                                {(entry.usage_example || entry.usage_example_en) && (
                                    <PropRow label={term('usage-example')}>
                                        <span className="text-[13px]">
                                            {entry.usage_example && <span className="italic">"{entry.usage_example}"</span>}
                                            {entry.usage_example && entry.usage_example_en && <span className="mx-2 opacity-40">—</span>}
                                            {entry.usage_example_en && <span>"{entry.usage_example_en}"</span>}
                                        </span>
                                    </PropRow>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 w-full space-y-12">
                                {!isInterjection && hasInflection && (
                                    <div className="w-full overflow-x-auto">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                                            {term('inflection-table')}
                                        </h2>
                                        <table className="w-full text-sm border-collapse md:min-w-[500px]">
                                            <thead>
                                                <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                                                    <th className="text-left font-semibold text-black pb-2 pr-4 w-32">{term('person')}</th>
                                                    <th className="text-left font-semibold text-black pb-2 pr-4">{term('singular')}</th>
                                                    {showPluralColumn && (
                                                        <th className="text-left font-semibold text-black pb-2">{term('plural')}</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {POSSESSIVE_SUFFIX_KEYS.map((key, idx) => (
                                                    <tr key={key} className="border-b border-black/4 whitespace-nowrap">
                                                        <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">{term(key)}</td>
                                                        <td className="py-1.5 pr-4 font-serif font-normal text-black">
                                                            <MarkedValue val={applySuffix(entry.headword, idx)} />
                                                        </td>
                                                        {showPluralColumn && (
                                                            <td className="py-1.5 font-serif font-normal text-black">
                                                                <MarkedValue val={applySuffix(pluralBase, idx)} />
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {isIlArticle && (
                                    <div className="w-full">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                                            {term('sun-moon-letters') || 'Sun & Moon Letters'}
                                        </h2>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm">
                                            <div className="rounded-lg border border-black/10 p-4 bg-white shadow-sm overflow-hidden">
                                                <p className="text-xs font-bold uppercase tracking-wider text-black/50 mb-3 border-b border-black/5 pb-2">
                                                    {term('sun-letters') || 'Sun Letters'} (Assimilated)
                                                </p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="text-[10px] text-black/30 uppercase tracking-widest text-left">
                                                                <th className="pb-1">Letter</th>
                                                                <th className="pb-1">Rule</th>
                                                                <th className="pb-1">Example</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-black/5">
                                                            {sunTransformations.map((t, idx) => (
                                                                <tr key={idx} className="group hover:bg-black/2">
                                                                    <td className="py-2 pr-4 font-serif font-bold text-lg text-black">{t.letter}</td>
                                                                    <td className="py-2 pr-4 font-mono text-black/40 text-[11px] whitespace-nowrap">{t.rule}</td>
                                                                    <td className="py-2 pr-2 font-serif text-black leading-tight">
                                                                        <span className="opacity-40">{t.example}</span>
                                                                        <span className="mx-2 opacity-20">→</span>
                                                                        <span className="font-bold underline decoration-black/10 underline-offset-4">{t.result}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-black/10 p-4 bg-white shadow-sm overflow-hidden">
                                                <p className="text-xs font-bold uppercase tracking-wider text-black/50 mb-3 border-b border-black/5 pb-2">
                                                    {term('moon-letters') || 'Moon Letters'} (Standard)
                                                </p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="text-[10px] text-black/30 uppercase tracking-widest text-left">
                                                                <th className="pb-1">Letter</th>
                                                                <th className="pb-1">Rule</th>
                                                                <th className="pb-1">Example</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-black/5">
                                                            {moonTransformations.map((t, idx) => (
                                                                <tr key={idx} className="group hover:bg-black/2">
                                                                    <td className="py-2 pr-4 font-serif font-bold text-lg text-black">{t.letter}</td>
                                                                    <td className="py-2 pr-4 font-mono text-black/40 text-[11px] whitespace-nowrap">{t.rule}</td>
                                                                    <td className="py-2 pr-2 font-serif text-black leading-tight">
                                                                        <span className="opacity-40">{t.example}</span>
                                                                        <span className="mx-2 opacity-20">→</span>
                                                                        <span className="font-bold underline decoration-black/10 underline-offset-4">{t.result}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {((synonyms?.length ?? 0) > 0 || (antonyms?.length ?? 0) > 0) && (
                                    <div className="w-full">
                                        <h2 className="font-serif font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-start">
                                            {(synonyms?.length ?? 0) > 0 && (
                                                <div>
                                                    <p className="font-semibold text-black mb-1">{term('synonyms')}</p>
                                                    {synonyms.map((s: any) => (
                                                        <div key={s.id} className="flex items-center gap-2 group">
                                                            <Link to={`/entry/${s.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                 {s.headword}
                                                            </Link>
                                                            "{getGloss(s, language, mode)}"
                                                            {isActualAdmin && (
                                                                <AdminActionButtons
                                                                    onEdit={() => handleEditEntry(s)}
                                                                    onDelete={() => handleRemoveRelationship(s.id)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {(antonyms?.length ?? 0) > 0 && (
                                                <div>
                                                    <p className="font-semibold text-black mb-1">{term('antonyms')}</p>
                                                    {antonyms.map((a: any) => (
                                                        <div key={a.id} className="flex items-center gap-2 group">
                                                            <Link key={a.id} to={`/entry/${a.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                {a.headword}
                                                            </Link>
                                                            "{getGloss(a, language, mode)}"
                                                            {isActualAdmin && (
                                                                <AdminActionButtons
                                                                    onEdit={() => handleEditEntry(a)}
                                                                    onDelete={() => handleRemoveRelationship(a.id)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {(relatedEntries?.length ?? 0) > 0 && (
                                                <div>
                                                    <p className="font-semibold text-black mb-1">{term('related-entries')}</p>
                                                    {relatedEntries.map((rel: any) => (
                                                        <div key={rel.id} className="flex items-center gap-2 group">
                                                            <Link to={`/entry/${rel.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                {rel.headword}
                                                            </Link>
                                                            "{getGloss(rel, language, mode)}"
                                                            {isActualAdmin && (
                                                                <AdminActionButtons
                                                                    onEdit={() => handleEditEntry(rel)}
                                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {(alternativeForms?.length ?? 0) > 0 && (
                                                <div>
                                                    <p className="font-semibold text-black mb-1">{term('alternative-forms') || 'Alternative Forms'}</p>
                                                    {alternativeForms.map((alt: any) => (
                                                        <div key={alt.id} className="flex items-center gap-2 group">
                                                            <Link to={`/entry/${alt.id}`} style={{ color: BLUE }} className="block hover:underline whitespace-nowrap">
                                                                {alt.headword}
                                                            </Link>
                                                            "{getGloss(alt, language, mode)}"
                                                            {isActualAdmin && (
                                                                <AdminActionButtons
                                                                    onEdit={() => handleEditEntry(alt)}
                                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                            <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                                {ety && ety.chain.length > 0 && (
                                    <SideCard title={term('etymology')}>
                                        <p className="text-sm text-black leading-relaxed">
                                            {term('from')}
                                            {ety.chain.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                                                    <span style={{ color: BLUE }} className="font-medium mx-1">
                                                        {term(c.language)}
                                                    </span>
                                                    {c.form && <span className="font-serif font-medium">{c.form}</span>}
                                                    {c.meaning && <span className="opacity-70"> "{c.meaning}"</span>}
                                                </React.Fragment>
                                            ))}.
                                        </p>
                                    </SideCard>
                                )}

                                {alternativeForms.length > 0 && (
                                    <SideCard title={term('alternative-forms')}>
                                        <div className="space-y-1">
                                            {alternativeForms.map((alt: any) => (
                                                <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                    {alt.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-black">
                                                        "{getGloss(alt, language, mode)}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </SideCard>
                                )}

                                {relatedEntries.length > 0 && (
                                    <SideCard title={term('related-entries')}>
                                        <div className="space-y-1">
                                            {relatedEntries.map((rel: any) => (
                                                <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                    {rel.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-black">
                                                        "{getGloss(rel, language, mode)}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </SideCard>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

// ── Entry Shell ────────────────────────────────────────────────────────────

export function EntryPage() {
    const { term } = useLinguisticMode();
    const { id } = useParams<{ id: string }>();
    const [entry, setEntry] = useState<Entry | null>(null);
    const [loading, setLoading] = useState(true);

    const refetch = useMemo(() => {
        return () => {
            if (id) {
                setLoading(true);
                apiGetEntry(id)
                    .then(res => setEntry(res.entry))
                    .catch(() => {
                        // Fallback to mock if API fails
                        const mock = MOCK_ENTRIES.find(e => e.id === id);
                        setEntry(mock || null);
                    })
                    .finally(() => setLoading(false));
            }
        };
    }, [id]);

    useEffect(() => {
        if (entry) {
            document.title = `${entry.headword} | Il-Miġma'`;
        } else {
            document.title = "Il-Miġma'";
        }
    }, [entry]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
        </div>
    );

    if (!entry) {
        return (
            <div style={{
                background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
                minHeight: '60vh'
            }} className="flex flex-col items-center justify-center px-4 text-center">
                <div className="flex items-center gap-2 mb-8">
                    <Link to="/search" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back-to-search')}
                    </Link>
                </div>

                <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-10 max-w-lg w-full">
                    <h2 className="font-serif text-2xl font-bold text-black mb-3">
                        {term('entry-not-found')}
                    </h2>
                    <p className="text-text-muted text-sm mb-8 leading-relaxed">
                        {term('entry-not-found-desc').replace('{id}', id || '')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            to={`/suggest?type=entry&q=${id}`}
                            className="w-full sm:w-auto bg-[#1034A6] text-white text-sm font-sans font-medium px-6 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-[#1034A6]/20"
                        >
                            {term('suggest-adding-entry')}
                        </Link>
                        <Link
                            to="/search"
                            className="w-full sm:w-auto bg-white text-black text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                        >
                            <Search size={16} className="inline mr-1" />
                            {term('search-dictionary')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }



    if (entry.pos === 'verb' && entry.verb_morphology) {
        return <VerbEntryView entry={entry} onRefetch={refetch} />;
    }

    if (entry.pos.toLowerCase() === 'numeral') {
        return <NumeralEntryView entry={entry} onRefetch={refetch} />;
    }

    if (entry.pos === 'noun' && entry.noun_morphology) {
        return <NounEntryView entry={entry} onRefetch={refetch} />;
    }

    if (entry.pos === 'adjective' && entry.adjective_morphology) {
        return <AdjectiveEntryView entry={entry} onRefetch={refetch} />;
    }

    if (entry.pos === 'participle') {
        return <ParticipleEntryView entry={entry} onRefetch={refetch} />;
    }

    if (['pronoun', 'particle', 'adverb', 'preposition', 'interjection', 'article', 'conjunction', 'interrogative'].includes((entry.pos || '').toLowerCase())) {
        return <FunctionWordEntryView entry={entry} onRefetch={refetch} />;
    }

    return (
        <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8">
            <p className="text-sm text-black/40 italic">
                {term('full-entry-view-coming-soon').replace('{pos}', term(entry.pos))}
            </p>
        </div>
    );
}
