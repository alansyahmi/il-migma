import { generateZokkForms, type ZokkResult } from '@/lib/zokkEngine';
import { formatStemDisplay } from '@/lib/stemDefaults';

export type StemMorphologySource = {
    stem_string: string;
    class_type: 'ar' | 'ir';
    is_hybrid: boolean;
    root?: string | null;
    agentive_suffix?: string | null;
};

export interface StemMorphologyViewModel {
    source: StemMorphologySource;
    displayStem: string;
    displayRoot: string | null;
    forms: ZokkResult;
    hasDerivedForms: boolean;
}

function normalizeClassType(value: unknown): 'ar' | 'ir' | null {
    return value === 'ar' || value === 'ir' ? value : null;
}

export function normalizeStemMorphology(source?: Partial<StemMorphologySource> | null): StemMorphologySource | null {
    if (!source) return null;

    const stem_string = String(source.stem_string || '').trim();
    const class_type = normalizeClassType(source.class_type);
    if (!stem_string || !class_type) return null;

    const root = typeof source.root === 'string' ? source.root.trim() : source.root ?? null;
    const agentive_suffix = typeof source.agentive_suffix === 'string'
        ? source.agentive_suffix.trim()
        : source.agentive_suffix ?? null;

    return {
        stem_string,
        class_type,
        is_hybrid: !!source.is_hybrid,
        root: root || null,
        agentive_suffix: agentive_suffix || null,
    };
}

export function buildStemMorphologyViewModel(source?: Partial<StemMorphologySource> | null): StemMorphologyViewModel | null {
    const normalized = normalizeStemMorphology(source);
    if (!normalized) return null;

    const forms = generateZokkForms({
        stem_string: normalized.stem_string,
        class_type: normalized.class_type,
        is_hybrid: normalized.is_hybrid,
        root: normalized.root || undefined,
        agentive_suffix: normalized.agentive_suffix || undefined,
    });
    return {
        source: normalized,
        displayStem: formatStemDisplay(normalized.stem_string),
        displayRoot: normalized.root || null,
        forms,
        hasDerivedForms: !!(
            forms.passive_participle ||
            forms.agentive ||
            forms.verbal_noun ||
            forms.hybrid_forms?.form_ii ||
            forms.hybrid_forms?.semitic_passive_participle ||
            forms.hybrid_forms?.semitic_verbal_noun
        ),
    };
}
