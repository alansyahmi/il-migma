import React from 'react';
import { Link } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Badge } from '@/components/ui/Badge';
import { compactPluralRows, normalizePluralFormRows } from '@/lib/pluralForms';
import { isHiddenTag } from '@/lib/tagLabel';
import { generateDiminutiveForm } from '@/lib/maltesePhonology';

import type { Entry } from '@/types';

interface MorphologyGridProps {
    entry: Entry;
}

export function MorphologyGrid({ entry }: MorphologyGridProps) {
    const { term } = useLinguisticMode();
    const isTheoretical = entry.tags?.some(tag => tag && tag.includes('THEORETICAL')) || 
        entry.verb_morphology?.root_tags?.includes('THEORETICAL') ||
        entry.headword.startsWith('*');
    const isElativeDisabled = entry.tags?.some(tag => tag && (tag.includes('$') || isHiddenTag(tag)));

    if (entry.pos === 'noun' && entry.noun_morphology) {
        const m = entry.noun_morphology;
        const diminutiveRows = m.diminutives?.length ? m.diminutives : entry.diminutives || [];
        const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants || null;
        const diminutivePatternHint = m.diminutive_pattern || entry.diminutive_pattern || null;
        const diminutiveBasePatternHint = m.form_masc_pattern || m.form_fem_pattern || m.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null;
        const generatedDiminutiveRows = diminutiveRows.length > 0
            ? []
            : [
                generateDiminutiveForm(entry.headword, rootConsonants, diminutivePatternHint, { basePattern: diminutiveBasePatternHint, gender: 'masculine' }),
                generateDiminutiveForm(entry.headword, rootConsonants, diminutivePatternHint, { basePattern: diminutiveBasePatternHint, gender: 'feminine' }),
            ].filter(Boolean) as Array<NonNullable<ReturnType<typeof generateDiminutiveForm>>>;
        const diminutive = diminutiveRows[0]?.form || m.diminutive || entry.diminutive_form || generatedDiminutiveRows[0]?.form || null;
        const diminutivePattern = diminutiveRows[0]?.pattern || m.diminutive_pattern || entry.diminutive_pattern || generatedDiminutiveRows[0]?.pattern || null;
        const pluralRows = compactPluralRows(normalizePluralFormRows(
            m.plural_forms,
            m.form_plural_pattern || entry.form_plural_pattern || entry.plural_pattern,
        )).filter(row => row.form || row.pattern);
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('noun')}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border-light">
                    <Cell label={term('singular')} value={m.singular} />
                    <Cell
                        label={term('plural')}
                        value={pluralRows.length > 0 ? (
                            <div className="space-y-2">
                                {pluralRows.map((row, index) => (
                                    <div key={`${row.form}-${index}`} className="leading-tight">
                                        <div>{row.form}</div>
                                        {row.pattern && (
                                            <div className="text-[11px] text-black/40 font-sans">
                                                {row.pattern}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : m.plural_forms.join(' / ')}
                    />
                    {m.sound_plural && <Cell label={term('regular-plural')} value={m.sound_plural} />}
                    {m.dual && <Cell label={term('dual')} value={m.dual} />}
                    {m.collective && <Cell label={term('collective')} value={m.collective} />}
                    {m.singulative && <Cell label={term('singulative')} value={m.singulative} />}
                    <Cell
                        label={term('masculine-fem')}
                        value={<Badge variant="pos">{term(m.gender)}</Badge>}
                    />
                </div>
                <div className="border-t border-border-light px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-[#A07030] font-semibold mb-0.5">
                        {term('diminutive')}
                    </div>
                    {diminutiveRows.length > 0 || generatedDiminutiveRows.length > 0 ? (
                        <div className="space-y-1">
                            {(diminutiveRows.length > 0 ? diminutiveRows : generatedDiminutiveRows).map((row, index) => (
                                <div key={`${row.form}-${index}`} className="leading-tight">
                                    <div className="font-serif text-sm text-black">
                                        {row.form}
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
                                {generatedDiminutiveRows[0]?.theoretical ? '*' : ''}{diminutive}
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
            </div>
        );
    }

    if (entry.pos === 'verb' && entry.verb_morphology) {
        const m = entry.verb_morphology;
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('verb')}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border-light">
                    <Cell label={term('perfect') + " (3sg.m)"} value={<strong className="font-headword">{isTheoretical && '*'}{m.perfective_3sg_m}</strong>} />
                    <Cell label={term('imperfect') + " (3sg.m)"} value={<strong className="font-headword">{isTheoretical && '*'}{m.imperfective_3sg_m}</strong>} />
                    <Cell label={term('form-title')} value={<Link to={`/search?form=${m.form}`} className="text-[#1034A6] hover:underline font-bold">{m.form}</Link>} />
                    <Cell label={term('strength-title')} value={entry.root_pattern_form?.root?.strength === 'strong-hybrid' ? 'Strong' : entry.root_pattern_form?.root?.strength} />
                    <Cell label={term('transitivity')} value={term(m.transitivity) ?? m.transitivity} />
                    {m.verbal_noun && <Cell label={term('masdar-label')} value={(isTheoretical && !m.verbal_noun.startsWith('*') ? '*' : '') + m.verbal_noun} />}
                    {m.active_participle && <Cell label={term('active-participle')} value={(isTheoretical && !m.active_participle.startsWith('*') ? '*' : '') + m.active_participle} />}
                    {m.passive_participle && <Cell label={term('passive-participle')} value={(isTheoretical && !m.passive_participle.startsWith('*') ? '*' : '') + m.passive_participle} />}
                </div>
            </div>
        );
    }

    if (entry.pos === 'adjective' && entry.adjective_morphology) {
        const m = entry.adjective_morphology;
        const diminutiveRows = m.diminutives?.length ? m.diminutives : entry.diminutives || [];
        const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants || null;
        const diminutivePatternHint = m.diminutive_pattern || entry.diminutive_pattern || null;
        const diminutiveBasePatternHint = m.form_masc_pattern || m.form_fem_pattern || m.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null;
        const generatedDiminutiveRows = diminutiveRows.length > 0
            ? []
            : [
                generateDiminutiveForm(entry.headword, rootConsonants, diminutivePatternHint, { basePattern: diminutiveBasePatternHint, gender: 'masculine' }),
                generateDiminutiveForm(entry.headword, rootConsonants, diminutivePatternHint, { basePattern: diminutiveBasePatternHint, gender: 'feminine' }),
            ].filter(Boolean) as Array<NonNullable<ReturnType<typeof generateDiminutiveForm>>>;
        const diminutive = diminutiveRows[0]?.form || entry.diminutive_form || generatedDiminutiveRows[0]?.form || null;
        const diminutivePattern = diminutiveRows[0]?.pattern || m.diminutive_pattern || entry.diminutive_pattern || generatedDiminutiveRows[0]?.pattern || null;
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('adjective')}
                    </span>
                </div>
                {/* Mobile: vertical layout (3 columns) */}
                <div className="grid grid-cols-3 md:hidden divide-x divide-y divide-border-light">
                    <Cell label={term('masculine')} value={<strong className="font-headword">{m.masculine}</strong>} />
                    <Cell label={term('feminine')} value={<strong className="font-headword">{m.feminine}</strong>} />
                    <Cell label={term('plural')} value={<strong className="font-headword">{m.plural}</strong>} />
                    {m.elative && !isElativeDisabled && <Cell label={term('elative')} value={m.elative} />}
                </div>
                {/* Desktop: horizontal layout (row) */}
                <div className="hidden md:grid grid-cols-1 divide-y divide-border-light">
                    <div className="grid grid-cols-4 divide-x divide-border-light">
                        <Cell label={term('masculine')} value={<strong className="font-headword">{m.masculine}</strong>} />
                        <Cell label={term('feminine')} value={<strong className="font-headword">{m.feminine}</strong>} />
                        <Cell label={term('plural')} value={<strong className="font-headword">{m.plural}</strong>} />
                        {m.elative && !isElativeDisabled ? 
                            <Cell label={term('elative')} value={m.elative} /> : 
                            <div></div> /* Empty cell to maintain grid */
                        }
                    </div>
                </div>
                <div className="border-t border-border-light px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-[#A07030] font-semibold mb-0.5">
                        {term('diminutive')}
                    </div>
                    {diminutiveRows.length > 0 || generatedDiminutiveRows.length > 0 ? (
                        <div className="space-y-1">
                            {(diminutiveRows.length > 0 ? diminutiveRows : generatedDiminutiveRows).map((row, index) => (
                                <div key={`${row.form}-${index}`} className="leading-tight">
                                    <div className="font-serif text-sm text-black">
                                        {row.form}
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
                                {generatedDiminutiveRows[0]?.theoretical ? '*' : ''}{diminutive}
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
            </div>
        );
    }

    if (entry.pos === 'participle') {
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('participle')}
                    </span>
                </div>
                {/* Mobile: vertical layout */}
                <div className="grid grid-cols-2 md:hidden divide-x divide-y divide-border-light">
                    <Cell 
                        label={term('type')} 
                        value={<Badge variant="pos">{term(entry.participle_type || 'participle')}</Badge>} 
                    />
                    <Cell 
                        label={term('gender')} 
                        value={<Badge variant="pos">{term(entry.participle_gender || 'neutral')}</Badge>} 
                    />
                </div>
                {/* Desktop: horizontal layout (row) */}
                <div className="hidden md:grid grid-cols-1 divide-y divide-border-light">
                    <div className="grid grid-cols-2 divide-x divide-border-light">
                        <Cell 
                            label={term('type')} 
                            value={<Badge variant="pos">{term(entry.participle_type || 'participle')}</Badge>} 
                        />
                        <Cell 
                            label={term('gender')} 
                            value={<Badge variant="pos">{term(entry.participle_gender || 'neutral')}</Badge>} 
                        />
                    </div>
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
