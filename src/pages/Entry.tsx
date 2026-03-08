import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_ENTRIES } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { type Entry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { buildVerbForm, buildPerfectForm, getDoLabels, getIoLabels } from '@/lib/suffixEngine';
import { generateConjugation } from '@/lib/conjugationEngine';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Edit2, ArrowLeft, Search } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { apiGetEntry } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Colour tokens ──────────────────────────────────────────────────────────
const CREAM_RGBA = 'rgba(244,243,240,0.88)';
const BLUE = '#1034A6';
const GOLD = '#A07030';


// ── Components ─────────────────────────────────────────────────────────────

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-black/8 shadow-sm p-5 space-y-2">
            <h2 className="font-sans font-bold text-[0.95rem] text-[#000]">{title}</h2>
            <div>{children}</div>
        </div>
    );
}

function PropRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col", className)}>
            <p className="text-xs font-semibold text-black/40 mb-0.5 uppercase tracking-wider">{label}</p>
            <div className="text-sm text-[#000]">{children}</div>
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

function DerivedTermLink({ label, value }: { label: string; value: string }) {
    const hasMarker = value.startsWith('*') || value.startsWith('✦');
    const entry = !hasMarker ? MOCK_ENTRIES.find(e => e.headword === value) : null;

    return (
        <div>
            <p className="text-xs text-black/40 mb-1">{label}</p>
            {entry ? (
                <Link to={`/entry/${entry.id}`} style={{ color: BLUE }} className="font-serif font-semibold hover:underline">
                    {value}
                </Link>
            ) : (
                <span className={`font-serif font-semibold ${hasMarker ? 'opacity-55' : ''} text-[#000]`}>
                    {value}
                </span>
            )}
        </div>
    );
}

// ── Verb View ──────────────────────────────────────────────────────────────

function VerbEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;

    const vm = entry.verb_morphology!;
    const ety = entry.etymologies?.[0];

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants;
    const pattern = entry.root_pattern_form?.pattern;

    // State
    const [polarity, setPolarity] = useState<'Positive' | 'Negative'>('Positive');
    const [doIdx, setDoIdx] = useState<number | null>(null);
    const [ioIdx, setIoIdx] = useState<number | null>(null);

    const isNeg = polarity === 'Negative';
    const isTheoretical = entry.tags?.includes('THEORETICAL') || vm.root_tags?.includes('THEORETICAL');
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
                isImalaBlocked: rootObj.is_imala_blocked,
                vowelSetPerfect: vsetPerf,
                vowelSetImperfect: vsetImpf,
                vowelSetImperative: vsetImp,
            });
        } catch (e) {
            console.error("Conjugation error:", e);
            return null;
        }
    }, [vm, vsetPerf, vsetImpf, vsetImp, entry]);

    // Derived suffix strip labels (vowel-set sensitive)
    const rawDoLabels = getDoLabels(vsetImpf);
    const doLabels = ioIdx !== null ? rawDoLabels.map((lbl, idx) => {
        if (idx === 2) return '-hu-';   // -u -> -hu-
        if (idx === 3) return '-hie-';  // -ha -> -hie-
        if (idx === 6) return '-hom-'; // -hom -> -hom-
        return lbl;
    }) : rawDoLabels;
    const ioLabels = getIoLabels(vsetImpf);


    const strengthRaw = entry.verb_class || entry.root_pattern_form?.root?.strength || 'strong';
    const strengthLabel = term(strengthRaw === 'strong-hybrid' ? 'strong-hybrid' : strengthRaw);
    const weakClassRaw = entry.verb_weak_class || entry.root_pattern_form?.root?.weak_class || vm.weak_class;
    const weakClassLabel = weakClassRaw ? term(weakClassRaw) : null;

    const subParts = [
        term('verb').toUpperCase(),
        vm.form ? `${term('forma-label')} ${vm.form}` : null,
        strengthLabel?.toUpperCase(),
        weakClassLabel?.toUpperCase(),
        ...(vm.root_tags ?? [])
            .filter(tag => {
                const upperTag = tag.toUpperCase();
                return upperTag !== 'STRONG' && upperTag !== 'WEAK' && upperTag !== strengthRaw.toUpperCase() && upperTag !== weakClassRaw?.toUpperCase();
            })
            .map(tag => term(tag).toUpperCase())
    ].filter(Boolean);

    const patternLabel = term('cv-pattern');
    const patternValue = mode === 'arabised' ? (pattern?.wizen_notation || pattern?.cv_notation) : pattern?.cv_notation;

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-10 w-full">
                <div className="flex items-center gap-2 mb-8">
                    <Link to="/search" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back-to-search')}
                    </Link>
                </div>

                <div className="text-center mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center">
                        <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-[#000] tracking-tight break-words">
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
                    <p className="text-xs font-sans text-black/40 tracking-[0.18em] mt-2">
                        — {subParts.join(' • ')} —
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-6 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-[#000] marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="w-full md:w-64 shrink-0 space-y-4 hidden md:block">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-[#000] marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <p className="text-sm text-[#000] leading-relaxed">
                                    {term('from')}
                                    <span style={{ color: BLUE }} className="font-medium mx-1">
                                        {term(ety.chain[0].language)}
                                    </span>
                                    {ety.chain[0].script && <> <span className="font-arabic">{ety.chain[0].script}</span></>}
                                    {ety.chain[1] && <> ({ety.chain[1].form})</>}.
                                </p>
                            </SideCard>
                        )}

                        {vm.related_entries && vm.related_entries.length > 0 && (
                            <SideCard title={term('entrati relatati')}>
                                <div className="space-y-1">
                                    {vm.related_entries.map(rel => (
                                        <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                            {rel.headword}{' '}
                                            <span className="opacity-55 font-sans text-xs text-[#000]">
                                                "{mode === 'standard' ? (rel.gloss_en ?? '') : (rel.gloss_mt ?? rel.gloss_en ?? '')}"
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {vm.source_citation && (
                            <SideCard title={term('sors')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{vm.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-8 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            {/* Properties */}
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-2 md:grid-cols-1 md:block gap-y-6 gap-x-8 max-w-[340px] mx-auto mb-8 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('għerq')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunzja')}>
                                        <div className="space-y-1.5 mt-1">
                                            {entry.phonetics.map((ph, idx) => {
                                                return (
                                                    <div key={idx} className="flex flex-col items-start gap-2">
                                                        {ph.ipa && <span className="text-[14px] tracking-tight font-mono">{ph.ipa}</span>}
                                                        {ph.dialect && ph.dialect !== 'Standard' && (
                                                            <span className="text-[0.6rem] bg-black/5 text-black/40 px-1 rounded uppercase tracking-tighter">
                                                                {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}
                                                            </span>
                                                        )}
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

                                <PropRow label={term('tranżittività')}>
                                    <span className="capitalize">{term(vm.transitivity || 'both')}</span>
                                </PropRow>

                                <PropRow label={term("sett ta' vokali")} className="col-span-2 sm:col-span-1 md:col-span-1">
                                    <div className="space-y-0.5 text-sm">
                                        <p>{term('perfett')} <span className="opacity-55 text-[0.7rem]">{term('(past)')}</span>: <span className="font-mono">{vm.vowel_set_perfect}</span></p>
                                        <p>{term('imperfett')} <span className="opacity-55 text-[0.7rem]">{term('(present)')}</span>: <span className="font-mono">{vm.vowel_set_imperfect}</span></p>
                                        <p>{term('imperattiv')}: <span className="font-mono">{vm.vowel_set_imperative}</span></p>
                                    </div>
                                </PropRow>

                                {/* Admin / Technical Metadata */}
                                {isAdmin && entry.root_pattern_form?.root && (
                                    <div className="mt-6 pt-6 border-t border-black/5">
                                        <p className="text-[10px] uppercase tracking-widest text-black/30 mb-2 font-bold">{term('internal-metadata')}</p>
                                        <div className="text-[11px] font-mono space-y-1 text-black/50">
                                            <p>{term('strength')}: {entry.verb_class || entry.root_pattern_form.root.strength}</p>
                                            {(entry.verb_weak_class || entry.root_pattern_form.root.weak_class) && <p>{term('weak-class')}: {entry.verb_weak_class || entry.root_pattern_form.root.weak_class}</p>}
                                            <p>{term('imala-blocked')}: {entry.root_pattern_form.root.is_imala_blocked ? term('yes') : term('no')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conjugation Table */}
                            {conj && (
                                <div className="flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none">
                                    <h2 className="font-sans font-semibold text-[1.25rem] text-[#000] mb-3 md:text-left text-center">
                                        {term('conjugation table')}
                                    </h2>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto overflow-y-hidden pb-4">
                                        <table className="w-full text-sm border-collapse md:min-w-[500px]">
                                            <thead>
                                                <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                                                    <th className="text-left font-semibold text-[#000] pb-2 pr-4 w-32">{term('person')}</th>
                                                    <th className="text-left font-semibold text-[#000] pb-2 pr-4">
                                                        {term('imperfett')} <span className="opacity-55 font-normal text-xs">{term('(present)')}</span>
                                                    </th>
                                                    <th className="text-left font-semibold text-[#000] pb-2">
                                                        {term('perfett')} <span className="opacity-55 font-normal text-xs">{term('(past)')}</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {conj.rows.map(row => (
                                                    <tr key={row.person_mt} className="border-b border-black/4 whitespace-nowrap">
                                                        <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">
                                                            {term(row.person_mt)}
                                                        </td>
                                                        <td className="py-1.5 pr-4 font-serif font-normal text-[#000]">
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
                                                        <td className="py-1.5 font-serif font-normal text-[#000]">
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

                                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm border-t border-black/8 pt-3">
                                            <p className="font-sans font-semibold text-[#000] self-center">{term('imperattiv')}</p>
                                            <div>
                                                <p className="text-xs text-black/40 mb-0.5">{term('singular')}</p>
                                                <p className="font-serif font-normal text-[#000]">
                                                    {(() => {
                                                        const row = conj.rows[1]; // inti
                                                        const base = isNeg ? row.imperfect : conj.imperative_sg;

                                                        // Prefer engine-provided stems, fallback to basic logic
                                                        const stems = isNeg ? row.stems : (conj.imperative_sg_stems || {
                                                            impfType1: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1'),
                                                            impfType2: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1')
                                                        });

                                                        const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                        return (isTheoretical ? '*' : '') + (isNeg ? result.replace(/^ma /, '') : result);
                                                    })()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-black/40 mb-0.5">{term('plural')}</p>
                                                <p className="font-serif font-normal text-[#000]">
                                                    {(() => {
                                                        const row = conj.rows[5]; // intom
                                                        const base = isNeg ? row.imperfect : conj.imperative_pl;

                                                        // Prefer engine-provided stems, fallback to basic logic
                                                        const stems = isNeg ? row.stems : (conj.imperative_pl_stems || {
                                                            impfType1: conj.imperative_pl,
                                                            impfType2: conj.imperative_pl
                                                        });

                                                        const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                        return (isTheoretical ? '*' : '') + (isNeg ? result.replace(/^ma /, '') : result);
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Unspooled View */}
                                    <div className="block md:hidden space-y-6">
                                        {/* Perfect */}
                                        <div>
                                            <h3 className="font-sans font-semibold text-[#000] mb-3">{term('perfett')}</h3>
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
                                                                <td className="py-2 font-serif text-[#000] text-right break-all text-sm">
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
                                            <h3 className="font-sans font-semibold text-[#000] mb-3">{term('imperfett')}</h3>
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
                                                                <td className="py-2 font-serif text-[#000] text-right break-all text-sm">
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
                                            <h3 className="font-sans font-semibold text-[#000] mb-3">{term('imperattiv')}</h3>
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
                                                            <td className="py-2 font-serif text-[#000] text-right break-all text-sm">
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
                                                            <td className="py-2 font-serif text-[#000] text-right break-all text-sm">
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
                                    <div className="mt-4 pt-6 border-t border-black/8 space-y-4 w-full max-w-[340px] mx-auto">
                                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                            <p className="text-xs text-[#000] font-semibold mb-1.5 font-sans">{term('polarità')}</p>
                                            <TogglePill
                                                options={['Positive', 'Negative']}
                                                active={polarity}
                                                labels={[term('positive'), term('negative')]}
                                                onChange={v => setPolarity(v as any)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                                <p className="text-xs text-[#000] font-semibold mb-1.5 font-sans">{term('oġġett dirett')}</p>
                                                <SuffixStrip
                                                    labels={doLabels}
                                                    activeIdx={doIdx}
                                                    disabledIndices={ioIdx !== null ? [0, 1, 4, 5] : []}
                                                    onToggle={idx => setDoIdx(prev => prev === idx ? null : idx)}
                                                />
                                            </div>
                                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                                <p className="text-xs text-[#000] font-semibold mb-1.5 font-sans">{term('oġġett indirett')}</p>
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
                                </div>
                            )}
                        </div>

                        {/* Derived Terms */}
                        {((entry.verb_verbal_noun || vm.verbal_noun) || (entry.verb_passive_ptcp || vm.passive_participle) || (entry.verb_active_ptcp || vm.active_participle)) && (
                            <div className="sm:max-w-sm mx-auto md:max-w-none w-full">
                                <h2 className="font-serif font-semibold text-[1.25rem] text-[#000] mb-3 text-center md:text-left">{term('termini derivati')}</h2>
                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-10 text-sm mt-3 items-center md:items-start text-center md:text-left">
                                    {(entry.verb_verbal_noun || vm.verbal_noun) && (
                                        <DerivedTermLink
                                            label={term('nom verbali')}
                                            value={(isTheoretical && !(entry.verb_verbal_noun || vm.verbal_noun)!.startsWith('*') ? '*' : '') + (entry.verb_verbal_noun || vm.verbal_noun)}
                                        />
                                    )}
                                    {(entry.verb_passive_ptcp || vm.passive_participle) && (
                                        <DerivedTermLink
                                            label={term('partiċipju passiv')}
                                            value={(isTheoretical && !(entry.verb_passive_ptcp || vm.passive_participle)!.startsWith('*') ? '*' : '') + (entry.verb_passive_ptcp || vm.passive_participle)}
                                        />
                                    )}
                                    {(entry.verb_active_ptcp || vm.active_participle) && (
                                        <DerivedTermLink
                                            label={term('partiċipju attiv')}
                                            value={(isTheoretical && !(entry.verb_active_ptcp || vm.active_participle)!.startsWith('*') ? '*' : '') + (entry.verb_active_ptcp || vm.active_participle)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Usage Example */}
                        {entry.definitions[0]?.example_sentences && entry.definitions[0].example_sentences.length > 0 && (
                            <div className="max-w-[340px] mx-auto md:max-w-none w-full">
                                <h2 className="font-sans font-semibold text-[1.25rem] text-[#000] mb-3 text-center md:text-left">{term('eżempju ta\' użu')}</h2>
                                {entry.definitions[0].example_sentences.slice(0, 1).map(ex => (
                                    <div key={ex.id}>
                                        <p className="text-sm text-[#000] font-serif text-center md:text-left">{ex.maltese}</p>
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
                            <div className="max-w-[340px] mx-auto md:max-w-none w-full">
                                <h2 className="font-serif font-semibold text-[1.25rem] text-[#000] mb-3 text-center md:text-left">{term('tesawru')}</h2>
                                <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-center md:items-start text-center md:text-left">
                                    {vm.synonyms && vm.synonyms.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-[#000] mb-1">{term('sinonimi')}</p>
                                            {vm.synonyms.map(s => (
                                                <Link key={s.id} to={`/entry/${s.id}`} style={{ color: BLUE }} className="block hover:underline">
                                                    {s.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-[#000]">
                                                        "{mode === 'standard' ? (s.gloss_en ?? '') : (s.gloss_mt ?? s.gloss_en ?? '')}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                    {vm.antonyms && vm.antonyms.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-[#000] mb-1">{term('antonimi')}</p>
                                            {vm.antonyms.map(a => (
                                                <Link key={a.id} to={`/entry/${a.id}`} style={{ color: BLUE }} className="block hover:underline">
                                                    {a.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-[#000]">
                                                        "{mode === 'standard' ? (a.gloss_en ?? '') : (a.gloss_mt ?? a.gloss_en ?? '')}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                        <div className="block md:hidden space-y-4 pt-4 max-w-[340px] mx-auto w-full">
                            {ety && ety.chain.length > 0 && (
                                <SideCard title={term('etymology')}>
                                    <p className="text-sm text-[#000] leading-relaxed">
                                        {term('from')}
                                        <span style={{ color: BLUE }} className="font-medium mx-1">
                                            {term(ety.chain[0].language)}
                                        </span>
                                        {ety.chain[0].script && <> <span className="font-arabic">{ety.chain[0].script}</span></>}
                                        {ety.chain[1] && <> ({ety.chain[1].form})</>}.
                                    </p>
                                </SideCard>
                            )}

                            {vm.related_entries && vm.related_entries.length > 0 && (
                                <SideCard title={term('entrati relatati')}>
                                    <div className="space-y-1">
                                        {vm.related_entries.map(rel => (
                                            <Link key={rel.id} to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-[#000]">
                                                    "{mode === 'standard' ? (rel.gloss_en ?? '') : (rel.gloss_mt ?? rel.gloss_en ?? '')}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {vm.source_citation && (
                                <SideCard title={term('sors')}>
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
                    onClose={() => setShowForm(false)}
                    onSaved={() => {
                        setShowForm(false);
                        if (onRefetch) onRefetch();
                        else window.location.reload();
                    }}
                    getToken={getToken}
                />
            )}
        </div>
    );
}

// ── Entry Shell ────────────────────────────────────────────────────────────

export function Entry() {
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
                    <h2 className="font-serif text-2xl font-bold text-[#000] mb-3">
                        {term('entry-not-found')}
                    </h2>
                    <p className="text-[#4a4a4a] text-sm mb-8 leading-relaxed">
                        {term('entry-not-found-desc').replace('{id}', id || '')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            to={`/suggest?type=entry&q=${id}`}
                            className="w-full sm:w-auto bg-[#1034A6] text-white text-sm font-sans font-medium px-6 py-2.5 rounded-lg hover:bg-[#0c268c] transition-colors shadow-lg shadow-[#1034A6]/20"
                        >
                            {term('suggest-adding-entry')}
                        </Link>
                        <Link
                            to="/search"
                            className="w-full sm:w-auto bg-white text-[#000] text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
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

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <p className="text-sm text-black/40 italic">
                {term('full-entry-view-coming-soon').replace('{pos}', term(entry.pos))}
            </p>
        </div>
    );
}
