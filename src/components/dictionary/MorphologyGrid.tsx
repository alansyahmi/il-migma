import React from 'react';
import { Link } from 'react-router-dom';
import { useHideTheoreticalForms } from '@/contexts/HideTheoreticalFormsContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Badge } from '@/components/ui/Badge';
import { compactPluralRows, normalizePluralFormRows } from '@/lib/pluralForms';
import { resolveAdjMasculineForm } from '@/lib/adjMorphology';
import { resolveMainPatternByGenderForPos } from '@/lib/gender';
import { generateDiminutiveForm } from '@/lib/maltesePhonology';
import { stripTheoreticalPrefix, shouldHideSurface } from '@/lib/theoreticalForms';
import { buildVerbPreviewFromEngine } from '@/lib/verbMorphology';

import type { Entry } from '@/types';

interface MorphologyGridProps {
    entry: Entry;
}

export function MorphologyGrid({ entry }: MorphologyGridProps) {
    const { term } = useLinguisticMode();
    const { hideTheoreticalForms } = useHideTheoreticalForms();
    const isTheoretical = entry.tags?.some(tag => tag && tag.includes('THEORETICAL')) || 
        entry.verb_morphology?.root_tags?.includes('THEORETICAL') ||
        entry.headword.startsWith('*') ||
        entry.headword.startsWith('✦');
    const isElativeDisabled = (() => {
        const adjMorphology = (entry as any).adjective_morphology || (entry as any).adj_morphology || {};
        if (adjMorphology.has_elative === undefined || adjMorphology.has_elative === null) return false;
        return !Boolean(adjMorphology.has_elative);
    })();
    const visibleText = (value?: string | null) => (hideTheoreticalForms ? stripTheoreticalPrefix(value || '') : (value || ''));
    const hideValue = (value?: string | null, theoretical = false) => hideTheoreticalForms && (theoretical || isTheoretical || shouldHideSurface(value || '', hideTheoreticalForms));

    if (entry.pos === 'noun' && entry.noun_morphology) {
        const m = entry.noun_morphology;
        const diminutiveRows = m.diminutives?.length ? m.diminutives : [];
        const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants || null;
        const diminutivePatternHint = m.diminutive_pattern || null;
        const diminutiveBasePatternHint = m.pattern || m.form_masc_pattern || m.form_fem_pattern || resolveMainPatternByGenderForPos(entry, 'adjective') || (entry.root_pattern_form?.pattern?.cv_notation) || null;
        const diminutiveGender = entry.gender?.toLowerCase() === 'feminine' ? 'feminine' : 'masculine';
        const paucal = m.paucal_form || null;
        const paucalPattern = m.paucal_pattern || null;
        const augmentative = m.augmentative_form || null;
        const augmentativePattern = m.augmentative_pattern || null;
        const generatedDiminutive = diminutiveRows.length > 0
            ? null
            : generateDiminutiveForm(entry.headword, rootConsonants, diminutivePatternHint, { basePattern: diminutiveBasePatternHint, gender: diminutiveGender });
        const generatedDiminutiveRows = generatedDiminutive ? [generatedDiminutive] : [];
        const visibleDiminutiveRows = hideTheoreticalForms ? diminutiveRows.filter(row => !shouldHideSurface(row.form, hideTheoreticalForms)) : diminutiveRows;
        const visibleGeneratedDiminutiveRows = hideTheoreticalForms ? [] : generatedDiminutiveRows;
        const shownDiminutiveRows = visibleDiminutiveRows.length > 0 ? visibleDiminutiveRows : visibleGeneratedDiminutiveRows;
        const diminutive = diminutiveRows[0]?.form || m.diminutive_form || generatedDiminutiveRows[0]?.form || null;
        const diminutivePattern = diminutiveRows[0]?.pattern || m.diminutive_pattern || generatedDiminutiveRows[0]?.pattern || null;
        const diminutiveHidden = hideValue(diminutive, !!generatedDiminutiveRows[0]?.theoretical);
        const isEmptyMorphValue = (val: any) => !val || val === '-' || val === '';
        const hasVisibleDiminutiveValue = shownDiminutiveRows.some((row) => !isEmptyMorphValue(row.form));
        const showDiminutiveSection = !hideTheoreticalForms || hasVisibleDiminutiveValue;
        const pluralRows = compactPluralRows(normalizePluralFormRows(
            m.plural_forms,
            m.form_plural_pattern,
        )).filter(row => row.form || row.pattern);
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('noun')}
                    </span>
                    <div className="flex gap-1">
                        {m.is_collective && <Badge variant="pos" className="bg-blue-100 text-blue-700 border-blue-200">{term('collective')}</Badge>}
                        {m.is_singulative && <Badge variant="pos" className="bg-purple-100 text-purple-700 border-purple-200">{term('singulative')}</Badge>}
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border-light">
                    <Cell label={term('singular')} value={visibleText(m.singular_form)} />
                    <Cell
                        label={term('plural')}
                        value={pluralRows.length > 0 ? (
                            <div className="space-y-2">
                                {pluralRows.map((row, index: number) => (
                                    <div key={`${row.form}-${index}`} className="leading-tight">
                                        <div>{visibleText(row.form)}</div>
                                        {row.pattern && (
                                            <div className="text-[11px] text-black/40 font-sans">
                                                {row.pattern}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (m.plural_forms ? visibleText(Array.isArray(m.plural_forms) ? m.plural_forms.join(' / ') : m.plural_forms) : '-')}
                    />
                    {m.sound_plural && <Cell label={term('regular-plural')} value={visibleText(m.sound_plural)} />}
                    {m.dual_form && <Cell label={term('dual')} value={visibleText(m.dual_form)} />}
                    {paucal && <Cell label={term('paucal')} value={<div className="leading-tight"><div>{visibleText(paucal)}</div>{paucalPattern && <div className="text-[11px] text-black/40 font-sans">{paucalPattern}</div>}</div>} />}
                    {augmentative && <Cell label={term('augmentative')} value={<div className="leading-tight"><div>{visibleText(augmentative)}</div>{augmentativePattern && <div className="text-[11px] text-black/40 font-sans">{augmentativePattern}</div>}</div>} />}
                    {m.collective_form && <Cell label={term('collective')} value={visibleText(m.collective_form)} />}
                    {m.singulative_form && <Cell label={term('singulative')} value={visibleText(m.singulative_form)} />}
                    <Cell
                        label={term('masculine-fem')}
                        value={<Badge variant="pos">{term(m.gender)}</Badge>}
                    />
                    {m.form_fem && <Cell label={term('feminine')} value={<strong className="font-headword">{visibleText(m.form_fem)}</strong>} />}
                    <Cell
                        label={term('masculine')}
                        value={<strong className="font-headword">{visibleText(resolveAdjMasculineForm({ ...entry, ...m, adjective_morphology: m, adj_morphology: m }) || '')}</strong>}
                    />
                </div>
                {showDiminutiveSection && (
                    <div className="border-t border-border-light px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-[#A07030] font-semibold mb-0.5">
                            {term('diminutive')}
                        </div>
                        {shownDiminutiveRows.length > 0 ? (
                            <div className="space-y-1">
                                {shownDiminutiveRows.map((row: any, index: number) => (
                                    <div key={`${row.form}-${index}`} className="leading-tight">
                                        <div className="font-serif text-sm text-black">
                                            {visibleText(row.form)}
                                        </div>
                                        {(row.pattern || diminutivePattern) && (
                                            <div className="text-[11px] text-black/40 font-sans">
                                                {row.pattern || diminutivePattern}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : diminutive ? (
                            <div className="leading-tight">
                                <div className={`font-serif text-sm ${generatedDiminutiveRows.length > 0 ? 'text-black/55' : 'text-black'}`}>
                                    {diminutiveHidden ? <span className="opacity-40">-</span> : visibleText(diminutive)}
                                </div>
                                {diminutivePattern && (
                                    <div className="text-[11px] text-black/40 font-sans">
                                        {diminutivePattern}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="opacity-40">-</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (entry.pos === 'verb' && entry.verb_morphology) {
        const m = entry.verb_morphology;
        const verbPreview = buildVerbPreviewFromEngine(entry);
        const perfective3sg = verbPreview.perfective_3sgm || m.perfective_3sgm;
        const imperfective3sg = verbPreview.imperfective_3sgm || m.imperfective_3sgm;
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('verb')}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border-light">
                    <Cell label={term('perfect') + " (3sg.m)"} value={hideValue(perfective3sg, isTheoretical) ? '-' : <strong className="font-headword">{visibleText(perfective3sg)}</strong>} />
                    <Cell label={term('imperfect') + " (3sg.m)"} value={hideValue(imperfective3sg, isTheoretical) ? '-' : <strong className="font-headword">{visibleText(imperfective3sg)}</strong>} />
                    <Cell label={term('form-title')} value={<Link to={`/search?form=${m.form}`} className="text-[#1034A6] hover:underline font-bold">{visibleText(m.form)}</Link>} />
                    <Cell label={term('strength-title')} value={entry.root_pattern_form?.root?.strength === 'strong-hybrid' ? 'Strong' : entry.root_pattern_form?.root?.strength} />
                    <Cell label={term('transitivity')} value={m.transitivity ? term(m.transitivity) : '-'} />
                    {m.verbal_noun && <Cell label={term('masdar-label')} value={hideValue(m.verbal_noun, isTheoretical) ? '-' : visibleText(m.verbal_noun)} />}
                    {m.active_participle && <Cell label={term('active-participle')} value={hideValue(m.active_participle, isTheoretical) ? '-' : visibleText(m.active_participle)} />}
                    {m.passive_participle && <Cell label={term('passive-participle')} value={hideValue(m.passive_participle, isTheoretical) ? '-' : visibleText(m.passive_participle)} />}
                </div>
            </div>
        );
    }

    if (entry.pos === 'adjective' && entry.adjective_morphology) {
        const m = entry.adjective_morphology;
        const resolvedMasculineForm = resolveAdjMasculineForm({ ...entry, ...m, adjective_morphology: m, adj_morphology: m });
        const diminutiveRows = m.diminutives?.length ? m.diminutives : [];
        const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants || null;
        const diminutivePatternHint = m.diminutive_pattern || null;
        const diminutiveBasePatternHint = m.pattern || m.form_masc_pattern || m.form_fem_pattern || resolveMainPatternByGenderForPos(entry, 'adjective') || (entry.root_pattern_form?.pattern?.cv_notation) || null;
        const diminutiveGender = entry.gender?.toLowerCase() === 'feminine' ? 'feminine' : 'masculine';
        const generatedDiminutive = diminutiveRows.length > 0
            ? null
            : generateDiminutiveForm(entry.headword, rootConsonants, diminutivePatternHint, { basePattern: diminutiveBasePatternHint, gender: diminutiveGender });
        const generatedDiminutiveRows = generatedDiminutive ? [generatedDiminutive] : [];
        const diminutive = diminutiveRows[0]?.form || m.diminutive_form || generatedDiminutiveRows[0]?.form || null;
        const diminutivePattern = diminutiveRows[0]?.pattern || m.diminutive_pattern || generatedDiminutiveRows[0]?.pattern || null;
        const visibleAdjectiveDiminutiveRows = hideTheoreticalForms ? diminutiveRows.filter((row: any) => !shouldHideSurface(row.form, hideTheoreticalForms)) : diminutiveRows;
        const isTheoreticalElative = isTheoretical;
        const shownAdjectiveDiminutiveRows = visibleAdjectiveDiminutiveRows.length > 0 ? visibleAdjectiveDiminutiveRows : (hideTheoreticalForms ? [] : generatedDiminutiveRows);
        const diminutiveHidden = hideValue(diminutive, !!generatedDiminutiveRows[0]?.theoretical);
        const hasVisibleDiminutiveValue = shownAdjectiveDiminutiveRows.some((row: any) => !isEmptyMorphValue(row.form));
        const showDiminutiveSection = !hideTheoreticalForms || hasVisibleDiminutiveValue;
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('adjective')}
                    </span>
                </div>
                {/* Mobile: vertical layout (3 columns) */}
                <div className="grid grid-cols-3 md:hidden divide-x divide-y divide-border-light">
                    <Cell
                        label={term('masculine')}
                        value={resolvedMasculineForm
                            ? <strong className="font-headword">{visibleText(resolvedMasculineForm)}</strong>
                            : '-'}
                    />
                    <Cell label={term('feminine')} value={<strong className="font-headword">{visibleText(m.form_fem)}</strong>} />
                    <Cell label={term('plural')} value={<strong className="font-headword">{(() => {
                        const plurals = normalizePluralFormRows((m as any).plural_form || (m as any).plural_forms);
                        return plurals.length > 0 ? visibleText(plurals[0].form) : '-';
                    })()}</strong>} />
                    {m.elative_form && !isElativeDisabled && <Cell label={term('elative')} value={hideValue(m.elative_form, isTheoreticalElative) ? '-' : visibleText(m.elative_form)} />}
                </div>
                {/* Desktop: horizontal layout (row) */}
                <div className="hidden md:grid grid-cols-1 divide-y divide-border-light">
                    <div className="grid grid-cols-4 divide-x divide-border-light">
                        <Cell
                            label={term('masculine')}
                            value={resolvedMasculineForm
                                ? <strong className="font-headword">{visibleText(resolvedMasculineForm)}</strong>
                                : '-'}
                        />
                        <Cell label={term('feminine')} value={<strong className="font-headword">{visibleText(m.form_fem)}</strong>} />
                        <Cell label={term('plural')} value={<strong className="font-headword">{(() => {
                        const plurals = normalizePluralFormRows((m as any).plural_form || (m as any).plural_forms);
                        return plurals.length > 0 ? visibleText(plurals[0].form) : '-';
                    })()}</strong>} />
                        {m.elative_form && !isElativeDisabled ? 
                            <Cell label={term('elative')} value={hideValue(m.elative_form, isTheoreticalElative) ? '-' : visibleText(m.elative_form)} /> : 
                            <div></div> /* Empty cell to maintain grid */
                        }
                    </div>
                </div>
                {showDiminutiveSection && (
                    <div className="border-t border-border-light px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-[#A07030] font-semibold mb-0.5">
                            {term('diminutive')}
                        </div>
                        {shownAdjectiveDiminutiveRows.length > 0 ? (
                            <div className="space-y-1">
                                {shownAdjectiveDiminutiveRows.map((row: any, index: number) => (
                                    <div key={`${row.form}-${index}`} className="leading-tight">
                                        <div className="font-serif text-sm text-black">
                                            {visibleText(row.form)}
                                        </div>
                                        {(row.pattern || diminutivePattern) && (
                                            <div className="text-[11px] text-black/40 font-sans">
                                                {row.pattern || diminutivePattern}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : diminutive ? (
                            <div className="leading-tight">
                                <div className={`font-serif text-sm ${generatedDiminutiveRows.length > 0 ? 'text-black/55' : 'text-black'}`}>
                                    {diminutiveHidden ? <span className="opacity-40">-</span> : visibleText(diminutive)}
                                </div>
                                {diminutivePattern && (
                                    <div className="text-[11px] text-black/40 font-sans">
                                        {diminutivePattern}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="opacity-40">-</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (entry.pos === 'participle') {
        const participleRows = [
            {
                label: term('masculine'),
                value: (entry as any).form_masc || entry.headword,
                pattern: (entry as any).form_masc_pattern || (entry as any).pattern || null,
            },
            {
                label: term('feminine'),
                value: (entry as any).form_fem || entry.headword,
                pattern: (entry as any).form_fem_pattern || (entry as any).pattern || null,
            },
            {
                label: term('plural'),
                value: (entry as any).form_plural || (entry as any).inflections_pl?.[0] || null,
                pattern: (entry as any).form_plural_pattern || (entry as any).morph_pattern || null,
            },
        ].filter((row) => !isEmptyMorphValue(row.value) || !isEmptyMorphValue(row.pattern));

        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('participle')}
                    </span>
                </div>
                <div className="border-b border-border-light px-3 py-2 flex flex-wrap gap-2">
                    <Badge variant="pos">{term((entry.participle_morphology?.participle_type) || 'participle')}</Badge>
                    <Badge variant="pos">{term(entry.participle_morphology?.gender || 'neutral')}</Badge>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border-light bg-white/45">
                                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#A07030] font-semibold">
                                    {term('feature') || 'Feature'}
                                </th>
                                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#A07030] font-semibold">
                                    {term('surface-form') || 'Surface Form'}
                                </th>
                                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[#A07030] font-semibold">
                                    {term('pattern') || 'Pattern'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {participleRows.map((row) => (
                                <tr key={row.label} className="border-b border-border-light last:border-b-0">
                                    <td className="px-3 py-2 align-top text-sm font-serif text-black">
                                        {row.label}
                                    </td>
                                    <td className={`px-3 py-2 align-top text-sm font-sans ${isEmptyMorphValue(row.value) ? 'text-black/40' : 'text-black'}`}>
                                        {isEmptyMorphValue(row.value) ? '-' : visibleText(row.value)}
                                    </td>
                                    <td className="px-3 py-2 align-top text-[11px] font-sans text-link">
                                        {isEmptyMorphValue(row.pattern) ? '-' : row.pattern}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (entry.pos === 'numeral' && entry.numeral_morphology) {
        const m: any = entry.numeral_morphology;
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('numeral')}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border-light">
                    <Cell label={term('type')} value={m.numeral_type ? term(m.numeral_type) : '-'} />
                    <Cell label={term('attributive-short')} value={visibleText(m.form_attributive_short)} />
                    <Cell label={term('attributive-short-pattern') || 'Short Pattern'} value={visibleText(m.form_attributive_short_pattern)} />
                    <Cell label={term('attributive-long')} value={visibleText(m.form_attributive_long)} />
                    {m.ordinal_form && <Cell label={term('ordinal')} value={visibleText(m.ordinal_form)} />}
                    {m.adverbial_form && <Cell label={term('adverbial')} value={visibleText(m.adverbial_form)} />}
                    {m.fractional_form && <Cell label={term('fractional')} value={visibleText(m.fractional_form)} />}
                    {m.multiplier_form && <Cell label={term('multiplier')} value={visibleText(m.multiplier_form)} />}
                    {m.distributive_form && <Cell label={term('distributive')} value={visibleText(m.distributive_form)} />}
                </div>
            </div>
        );
    }

    return null;
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
    // Helper to determine if the value represents a theoretical form (starts with *)
    const isTheoretical = (() => {
        if (typeof value === 'string') return value.trim().startsWith('*');
        
        // If it's a React element (like <strong>*word</strong>), check its children
        if (React.isValidElement(value)) {
            const element = value as React.ReactElement<any>;
            const children = element.props.children;
            if (typeof children === 'string') return children.trim().startsWith('*');
            if (Array.isArray(children)) {
                return children.some(child => typeof child === 'string' && (child as string).trim().startsWith('*'));
            }
        }
        return false;
    })();

    return (
        <div className="px-3 py-2 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-[#A07030] font-semibold mb-0.5">{label}</div>
            <div className={`text-sm font-sans ${isTheoretical ? 'text-black/55' : 'text-black'}`}>
                {value}
            </div>
        </div>
    );
}

function isEmptyMorphValue(value?: string | null): boolean {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized === '-' || normalized === '—' || normalized === 'none' || normalized === 'null' || normalized === 'n/a';
}
