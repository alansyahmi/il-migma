import React from 'react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Badge } from '@/components/ui/Badge';

import type { Entry } from '@/types';

interface MorphologyGridProps {
    entry: Entry;
}

export function MorphologyGrid({ entry }: MorphologyGridProps) {
    const { term } = useLinguisticMode();
    const isTheoretical = entry.tags?.includes('THEORETICAL') || entry.verb_morphology?.root_tags?.includes('THEORETICAL');

    if (entry.pos === 'noun' && entry.noun_morphology) {
        const m = entry.noun_morphology;
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('noun')}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border-light">
                    <Cell label={term('singular')} value={m.singular} />
                    <Cell label={term('plural')} value={m.plural_forms.join(' / ')} />
                    {m.sound_plural && <Cell label={term('regular-plural')} value={m.sound_plural} />}
                    {m.dual && <Cell label={term('dual')} value={m.dual} />}
                    {m.diminutive && <Cell label={term('diminutive')} value={m.diminutive} />}
                    {m.collective && <Cell label={term('collective')} value={m.collective} />}
                    {m.singulative && <Cell label={term('singulative')} value={m.singulative} />}
                    <Cell
                        label={term('masculine-fem')}
                        value={<Badge variant="pos">{term(m.gender)}</Badge>}
                    />
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
                    <Cell label={term('form-title')} value={m.form} />
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
        return (
            <div className="rounded-lg border border-border-light bg-surface-soft overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1034A6]/5 border-b border-border-light">
                    <span className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                        {term('morphology')} — {term('adjective')}
                    </span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-y divide-border-light">
                    <Cell label={term('masculine')} value={<strong className="font-headword">{m.masculine}</strong>} />
                    <Cell label={term('feminine')} value={<strong className="font-headword">{m.feminine}</strong>} />
                    <Cell label={term('plural')} value={<strong className="font-headword">{m.plural}</strong>} />
                    {m.elative && <Cell label={term('elative')} value={m.elative} />}
                </div>
            </div>
        );
    }

    return null;
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="px-3 py-2 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-[#A07030] font-semibold mb-0.5">{label}</div>
            <div className="text-sm text-black font-sans">{value}</div>
        </div>
    );
}
