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
            <div className="rounded-lg border border-[#ede9e1] bg-[#f9f7f3] overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1B4D3E]/5 border-b border-[#ede9e1]">
                    <span className="text-xs font-semibold text-[#1B4D3E] uppercase tracking-wider">
                        Morfoloġija — {term('noun')}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-[#ede9e1]">
                    <Cell label={term('singular')} value={m.singular} />
                    <Cell label={term('plural')} value={m.plural_forms.join(' / ')} />
                    {m.sound_plural && <Cell label="Plural Regolari" value={m.sound_plural} />}
                    {m.dual && <Cell label={term('dual')} value={m.dual} />}
                    {m.diminutive && <Cell label="Diminuttiv" value={m.diminutive} />}
                    {m.collective && <Cell label="Kollettiv" value={m.collective} />}
                    {m.singulative && <Cell label="Singulattiv" value={m.singulative} />}
                    <Cell
                        label={term('masculine') + ' / ' + term('feminine')}
                        value={<Badge variant="pos">{term(m.gender)}</Badge>}
                    />
                </div>
            </div>
        );
    }

    if (entry.pos === 'verb' && entry.verb_morphology) {
        const m = entry.verb_morphology;
        return (
            <div className="rounded-lg border border-[#ede9e1] bg-[#f9f7f3] overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1B4D3E]/5 border-b border-[#ede9e1]">
                    <span className="text-xs font-semibold text-[#1B4D3E] uppercase tracking-wider">
                        Morfoloġija — {term('verb')}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-[#ede9e1]">
                    <Cell label="Perfettiv (3sg.m)" value={<strong className="font-headword">{isTheoretical && '*'}{m.perfective_3sg_m}</strong>} />
                    <Cell label="Imperfettiv (3sg.m)" value={<strong className="font-headword">{isTheoretical && '*'}{m.imperfective_3sg_m}</strong>} />
                    <Cell label="Forma" value={m.form} />
                    <Cell label="Saħħa" value={entry.root_pattern_form?.root?.strength === 'strong-hybrid' ? 'Strong' : entry.root_pattern_form?.root?.strength} />
                    <Cell label="Transittività" value={term(m.transitivity) ?? m.transitivity} />
                    {m.verbal_noun && <Cell label="Nom verbal (masdar)" value={(isTheoretical && !m.verbal_noun.startsWith('*') ? '*' : '') + m.verbal_noun} />}
                    {m.active_participle && <Cell label={term('participle') + ' attiv'} value={(isTheoretical && !m.active_participle.startsWith('*') ? '*' : '') + m.active_participle} />}
                    {m.passive_participle && <Cell label={term('participle') + ' passiv'} value={(isTheoretical && !m.passive_participle.startsWith('*') ? '*' : '') + m.passive_participle} />}
                </div>
            </div>
        );
    }

    if (entry.pos === 'adjective' && entry.adjective_morphology) {
        const m = entry.adjective_morphology;
        return (
            <div className="rounded-lg border border-[#ede9e1] bg-[#f9f7f3] overflow-hidden">
                <div className="px-3 py-1.5 bg-[#1B4D3E]/5 border-b border-[#ede9e1]">
                    <span className="text-xs font-semibold text-[#1B4D3E] uppercase tracking-wider">
                        Morfoloġija — {term('adjective')}
                    </span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-y divide-[#ede9e1]">
                    <Cell label={term('masculine')} value={<strong className="font-headword">{m.masculine}</strong>} />
                    <Cell label={term('feminine')} value={<strong className="font-headword">{m.feminine}</strong>} />
                    <Cell label={term('plural')} value={<strong className="font-headword">{m.plural}</strong>} />
                    {m.elative && <Cell label="Elattiv" value={m.elative} />}
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
            <div className="text-sm text-[#000] font-sans">{value}</div>
        </div>
    );
}
