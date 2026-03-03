import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { MOCK_ENTRIES } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { type Entry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { buildVerbForm, buildPerfectForm, getDoLabels, getIoLabels } from '@/lib/suffixEngine';
import { generateConjugation } from '@/lib/conjugationEngine';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Edit2 } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { apiGetEntry } from '@/lib/api';

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

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <p className="text-xs font-semibold text-black/40 mb-0.5">{label}</p>
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
    return (
        <div className="flex flex-wrap gap-1">
            <div className="inline-flex rounded-md border border-black/10 overflow-hidden text-xs">
                {labels.map((lbl, i) => {
                    const isDisabled = dis.includes(i);
                    return (
                        <button
                            key={lbl}
                            disabled={isDisabled}
                            onClick={() => onToggle(i)}
                            className={`px-2.5 py-1 transition-colors font-mono border-r border-black/5 last:border-r-0 ${activeIdx === i
                                ? 'bg-[#1034A6] text-white'
                                : isDisabled
                                    ? 'bg-black/5 text-black/20 cursor-not-allowed'
                                    : 'bg-white text-[#555] hover:bg-black/5'
                                }`}
                        >
                            {lbl}
                        </button>
                    );
                })}
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
    const { t } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;

    const vm = entry.verb_morphology!;
    const ety = entry.etymologies?.[0];

    const rootConsonants = entry.root_pattern_form?.root?.consonants;
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
                strength: rootObj.strength,
                weakClass: rootObj.weak_class,
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


    const strengthLabel = entry.root_pattern_form?.root?.strength === 'strong-hybrid' ? 'STRONG' : entry.root_pattern_form?.root?.strength?.toUpperCase();

    const subParts = [
        t('VERB', term('verb')).toUpperCase(),
        vm.form ? `FORM ${vm.form}` : null,
        strengthLabel,
        ...(vm.root_tags ?? []).filter(tag => tag !== 'STRONG').map(tag => tag.toUpperCase())
    ].filter(Boolean);

    const patternLabel = mode === 'arabised' ? "Wiżen" : "CV";
    const patternValue = mode === 'arabised' ? pattern?.wizen_notation : pattern?.cv_notation;

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

                <div className="text-center mb-8 relative group max-w-fit mx-auto">
                    <div className="relative inline-flex items-center justify-center">
                        <h1 className="font-serif font-bold text-[3rem] leading-none text-[#000] tracking-tight">
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
                                title="Edit Entry"
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                    </div>
                    <p className="text-xs font-sans text-black/40 tracking-[0.18em] mt-2 uppercase">
                        — {subParts.join(' • ')} —
                    </p>
                </div>

                <div className="flex gap-6 items-start">
                    {/* Left Sidebar */}
                    <div className="w-64 shrink-0 space-y-4">
                        <SideCard title={t('Gloss', term('Tifsira'))}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-[#000] marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{def.text_en}</li>
                                ))}
                            </ol>
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={t('Etymology', term('Etimoloġija'))}>
                                <p className="text-sm text-[#000] leading-relaxed">
                                    {t('From ', 'Mill-')}
                                    <span style={{ color: BLUE }} className="font-medium">
                                        {t(ety.chain[0].language, term(ety.chain[0].language))}
                                    </span>
                                    {ety.chain[0].script && <> <span className="font-arabic">{ety.chain[0].script}</span></>}
                                    {ety.chain[1] && <> ({ety.chain[1].form})</>}.
                                </p>
                            </SideCard>
                        )}

                        {vm.related_entries && vm.related_entries.length > 0 && (
                            <SideCard title={t('Related Entries', term('Entrati Relatati'))}>
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
                            <SideCard title={t('Source', term('sors'))}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{vm.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-8">
                        <div className="flex gap-8 items-start">
                            {/* Properties */}
                            <div className="w-52 shrink-0">
                                {rootConsonants && (
                                    <PropRow label={t('Root', term('Għerq'))}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={t('Pronunciation', term('Pronunzja'))}>
                                        <div className="space-y-1.5 mt-1">
                                            {entry.phonetics.map((ph, idx) => {
                                                const spellingMatch = ph.notes?.match(/Spelling: (.*)/);
                                                const spelling = spellingMatch ? spellingMatch[1] : entry.headword;
                                                return (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="font-serif text-[#000]">{spelling}</span>
                                                        {ph.ipa && <span className="font-mono text-black/50 text-xs italic">[{ph.ipa}]</span>}
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

                                <PropRow label={t('Transitivity', term('Tranżittività'))}>
                                    <span className="capitalize">{vm.transitivity === 'transitive' ? t('Transitive', term('Tranżittiv')) : vm.transitivity === 'intransitive' ? t('Intransitive', term('Intranżittiv')) : t('Both', term('It-Tnejn'))}</span>
                                </PropRow>

                                <PropRow label={t('Vowel Set', term("Sett ta' Vokali"))}>
                                    <div className="space-y-0.5 text-sm">
                                        <p>{t('Perfect', term('Perfett'))} <span className="opacity-55 text-[0.7rem]">{t('(Past)', term('(Past)'))}</span>: <span className="font-mono">{vm.vowel_set_perfect}</span></p>
                                        <p>{t('Imperfect', term('Imperfett'))} <span className="opacity-55 text-[0.7rem]">{t('(Present)', term('(Present)'))}</span>: <span className="font-mono">{vm.vowel_set_imperfect}</span></p>
                                        <p>{t('Imperative', term('Imperattiv'))}: <span className="font-mono">{vm.vowel_set_imperative}</span></p>
                                    </div>
                                </PropRow>

                                {/* Admin / Technical Metadata */}
                                {isAdmin && entry.root_pattern_form?.root && (
                                    <div className="mt-6 pt-6 border-t border-black/5">
                                        <p className="text-[10px] uppercase tracking-widest text-black/30 mb-2 font-bold">Internal Metadata</p>
                                        <div className="text-[11px] font-mono space-y-1 text-black/50">
                                            <p>Strength: {entry.root_pattern_form.root.strength}</p>
                                            {entry.root_pattern_form.root.weak_class && <p>Weak Class: {entry.root_pattern_form.root.weak_class}</p>}
                                            <p>Imala Blocked: {entry.root_pattern_form.root.is_imala_blocked ? 'Yes' : 'No'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conjugation Table */}
                            {conj && (
                                <div className="flex-1 min-w-0">
                                    <h2 className="font-sans font-semibold text-[1.25rem] text-[#000] mb-3">
                                        {t('Conjugation Table', term('Tabella tal-') + term('konjugazzjoni'))}
                                    </h2>
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b border-black/8 font-sans">
                                                <th className="text-left font-semibold text-[#000] pb-2 pr-4 w-32">{t('Person', term('Persuna'))}</th>
                                                <th className="text-left font-semibold text-[#000] pb-2 pr-4">
                                                    {t('Imperfect', term('Imperfett'))} <span className="opacity-55 font-normal text-xs">{t('(Present)', term('(Present)'))}</span>
                                                </th>
                                                <th className="text-left font-semibold text-[#000] pb-2">
                                                    {t('Perfect', term('Perfett'))} <span className="opacity-55 font-normal text-xs">{t('(Past)', term('(Past)'))}</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {conj.rows.map(row => (
                                                <tr key={row.person_mt} className="border-b border-black/4">
                                                    <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">
                                                        {t(row.person_en, row.person_mt)}
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
                                        <p className="font-sans font-semibold text-[#000] self-center">{t('Imperative', term('Imperattiv'))}</p>
                                        <div>
                                            <p className="text-xs text-black/40 mb-0.5">{t('Singular', term('singular'))}</p>
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
                                            <p className="text-xs text-black/40 mb-0.5">{t('Plural', term('plural'))}</p>
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


                                    <div className="mt-4 pt-3 border-t border-black/8 space-y-4">
                                        <div>
                                            <p className="text-xs text-black/40 mb-1.5 font-sans">{t('Polarity', term('Polarità'))}</p>
                                            <TogglePill
                                                options={['Positive', 'Negative']}
                                                active={polarity}
                                                labels={[t('Positive', term('Positive')), t('Negative', term('Negative'))]}
                                                onChange={v => setPolarity(v as any)}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs text-black/40 mb-1.5 font-sans">{t('Direct Object', term('Oġġett Dirett'))}</p>
                                            <SuffixStrip
                                                labels={doLabels}
                                                activeIdx={doIdx}
                                                disabledIndices={ioIdx !== null ? [0, 1, 4, 5] : []}
                                                onToggle={idx => setDoIdx(prev => prev === idx ? null : idx)}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs text-black/40 mb-1.5 font-sans">{t('Indirect Object', term('Oġġett Indirett'))}</p>
                                            <SuffixStrip
                                                labels={ioLabels}
                                                activeIdx={ioIdx}
                                                onToggle={idx => {
                                                    const newIoIdx = ioIdx === idx ? null : idx;
                                                    setIoIdx(newIoIdx);
                                                    // If selecting an IO, check if active DO is restricted (ni, k, na, kom)
                                                    if (newIoIdx !== null && doIdx !== null && [0, 1, 4, 5].includes(doIdx)) {
                                                        setDoIdx(null);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Derived Terms */}
                        {((entry.verb_verbal_noun || vm.verbal_noun) || (entry.verb_passive_ptcp || vm.passive_participle) || (entry.verb_active_ptcp || vm.active_participle)) && (
                            <div>
                                <h2 className="font-serif font-semibold text-[1.25rem] text-[#000] mb-3">{t('Derived Terms', 'Termini Derivati')}</h2>
                                <div className="flex gap-10 text-sm">
                                    {(entry.verb_verbal_noun || vm.verbal_noun) && (
                                        <DerivedTermLink
                                            label={t('Verbal Noun', term('Nom Verbali'))}
                                            value={(isTheoretical && !(entry.verb_verbal_noun || vm.verbal_noun)!.startsWith('*') ? '*' : '') + (entry.verb_verbal_noun || vm.verbal_noun)}
                                        />
                                    )}
                                    {(entry.verb_passive_ptcp || vm.passive_participle) && (
                                        <DerivedTermLink
                                            label={t('Passive Participle', term('Partiċipju Passiv'))}
                                            value={(isTheoretical && !(entry.verb_passive_ptcp || vm.passive_participle)!.startsWith('*') ? '*' : '') + (entry.verb_passive_ptcp || vm.passive_participle)}
                                        />
                                    )}
                                    {(entry.verb_active_ptcp || vm.active_participle) && (
                                        <DerivedTermLink
                                            label={t('Active Participle', term('Partiċipju Attiv'))}
                                            value={(isTheoretical && !(entry.verb_active_ptcp || vm.active_participle)!.startsWith('*') ? '*' : '') + (entry.verb_active_ptcp || vm.active_participle)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Usage Example */}
                        {entry.definitions[0]?.example_sentences && entry.definitions[0].example_sentences.length > 0 && (
                            <div>
                                <h2 className="font-serif font-semibold text-[1.25rem] text-[#000] mb-3">{t('Usage Example', "Eżempju ta' Użu")}</h2>
                                {entry.definitions[0].example_sentences.slice(0, 1).map(ex => (
                                    <div key={ex.id}>
                                        <p className="text-sm text-[#000] font-serif">{ex.maltese}</p>
                                        {ex.english && (
                                            <p className="text-xs text-black/40 italic mt-1 pl-4 border-l-2 border-black/10 font-sans">
                                                {ex.english}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Thesaurus */}
                        {((vm.synonyms?.length ?? 0) > 0 || (vm.antonyms?.length ?? 0) > 0) && (
                            <div>
                                <h2 className="font-serif font-semibold text-[1.25rem] text-[#000] mb-3">{t('Thesaurus', 'Tesawru')}</h2>
                                <div className="flex gap-16 text-sm">
                                    {vm.synonyms && vm.synonyms.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-[#000] mb-1">{t('Synonyms', 'Sinonimi')}</p>
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
                                            <p className="font-semibold text-[#000] mb-1">{t('Antonyms', 'Antonimi')}</p>
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
        refetch();
    }, [refetch]);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
        </div>
    );

    if (!entry) return <Navigate to="/404" replace />;

    if (entry.pos === 'verb' && entry.verb_morphology) {
        return <VerbEntryView entry={entry} onRefetch={refetch} />;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <p className="text-sm text-black/40 italic">Full entry view for {entry.pos} coming soon.</p>
        </div>
    );
}
