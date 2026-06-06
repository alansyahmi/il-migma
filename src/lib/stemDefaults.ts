import type { VerbStrength, WeakClass } from '@/types';

export interface StemDefaultClassification {
    strength: VerbStrength;
    weak_class: WeakClass | null;
}

export interface VerbClassificationSource {
    form?: unknown;
    headword?: unknown;
    verb_class?: unknown;
    verb_weak_class?: unknown;
    root_consonants?: unknown;
    tags?: unknown;
    root_tags?: unknown;
    verb_morphology?: {
        form?: unknown;
        class?: unknown;
        verb_class?: unknown;
        weak_class?: unknown;
        root_tags?: unknown;
    } | null;
    root_strength?: unknown;
    root_weak_class?: unknown;
    root?: {
        strength?: unknown;
        weak_class?: unknown;
        consonants?: unknown;
    } | null;
    zokk_morphology?: {
        is_hybrid?: unknown;
        root?: unknown;
    } | null;
}

export function formatStemDisplay(value: string | null | undefined): string {
    const cleaned = String(value ?? '').trim().replace(/^-+/, '').replace(/-+$/, '');
    return cleaned ? `-${cleaned}-` : '';
}

function normalizeStrength(value: unknown): VerbStrength | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'doubled') return 'geminated';
    if (normalized === 'quadriliteral' || normalized === 'loan') return 'strong';
    if (normalized === 'strong' || normalized === 'strong-hybrid' || normalized === 'weak' || normalized === 'geminated') {
        return normalized;
    }
    return null;
}

function normalizeWeakClass(value: unknown): WeakClass | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    const valid: string[] = ['first', 'second', 'third', 'hollow', 'defective', 'assimilative', 'none'];
    if (valid.includes(normalized)) {
        return normalized as WeakClass;
    }
    return null;
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function asStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(item => String(item));
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(item => String(item)) : [value];
    } catch {
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }
}

function getRootConsonants(source: VerbClassificationSource): string {
    return normalizeText(
        source.root?.consonants ||
        source.root_consonants ||
        source.zokk_morphology?.root
    );
}

function getVerbForm(source: VerbClassificationSource): string {
    return normalizeText(source.form || source.verb_morphology?.form).toUpperCase();
}

function hasFinalWeakTag(source: VerbClassificationSource): boolean {
    const tags = [
        ...asStringArray(source.tags),
        ...asStringArray(source.root_tags),
        ...asStringArray(source.verb_morphology?.root_tags),
    ].map(tag => tag.toLowerCase());
    return tags.some(tag => tag.includes('defective') || tag.includes('final-weak') || tag.includes('final weak'));
}

function looksLikeFormIIFinalWeak(source: VerbClassificationSource): boolean {
    if (getVerbForm(source) !== 'II') return false;

    const headword = normalizeText(source.headword);
    const rootConsonants = getRootConsonants(source);
    const finalRadical = rootConsonants.split('-').map(part => part.trim()).filter(Boolean).at(-1) || '';
    const finalGhainRoot = finalRadical === 'għ' || finalRadical === 'gh';
    const finalWeakSurface = /a['’]?$/.test(headword);

    return (finalGhainRoot && finalWeakSurface) || hasFinalWeakTag(source);
}

export function looksLikeStrongHybridVerb(source: VerbClassificationSource): boolean {
    const verbForm = getVerbForm(source);
    const supportedForms = new Set(['I', 'II', 'III', 'V', 'VI', 'VII', 'XB']);
    if (!supportedForms.has(verbForm)) return false;

    const headword = normalizeText(source.headword);
    const rootConsonants = getRootConsonants(source);
    const finalRadical = rootConsonants.split('-').map(part => part.trim()).filter(Boolean).at(-1) || '';
    const finalGhainRoot = finalRadical === 'għ' || finalRadical === 'gh';
    const apostropheFinalSurface = /['’]$/.test(headword);

    return finalGhainRoot && apostropheFinalSurface;
}

/**
 * Stem entries do not currently persist strength metadata.
 * We default them to weak/defective so the public entry page does not
 * fall back to the generic strong classification.
 */
export function resolveStemDefaults(stem?: { strength?: unknown; weak_class?: unknown } | null): StemDefaultClassification {
    const explicitStrength = normalizeStrength(stem?.strength);
    const explicitWeakClass = normalizeWeakClass(stem?.weak_class);

    if (explicitStrength) {
        return {
            strength: explicitStrength,
            weak_class: explicitStrength === 'weak' ? (explicitWeakClass || 'defective') : explicitWeakClass,
        };
    }

    return {
        strength: 'weak',
        weak_class: 'defective',
    };
}

/**
 * Resolve the effective conjugation classification for a verb entry.
 *
 * Priority:
 * 1. Explicit entry-level classification
 * 2. Auto-inference for blank legacy/imported rows
 * 3. Hybrid stem override -> weak defective quad Form I
 * 4. Root classification
 * 5. Conservative weak defective fallback
 */
export function resolveVerbClassification(source?: VerbClassificationSource | null): StemDefaultClassification {
    if (!source) {
        return {
            strength: 'weak',
            weak_class: 'defective',
        };
    }

    const explicitStrength = normalizeStrength(source.verb_class || source.verb_morphology?.class || source.verb_morphology?.verb_class);
    const explicitWeakClass = normalizeWeakClass(source.verb_weak_class || source.verb_morphology?.weak_class);
    if (explicitStrength) {
        return {
            strength: explicitStrength,
            weak_class: explicitStrength === 'weak'
                ? (explicitWeakClass || 'defective')
                : null,
        };
    }

    if (looksLikeStrongHybridVerb(source)) {
        return {
            strength: 'strong-hybrid',
            weak_class: explicitWeakClass,
        };
    }

    if (looksLikeFormIIFinalWeak(source)) {
        return {
            strength: 'weak',
            weak_class: 'defective',
        };
    }

    if (source.zokk_morphology?.is_hybrid) {
        return {
            strength: 'weak',
            weak_class: 'defective',
        };
    }

    const rootStrength = normalizeStrength(source.root?.strength ?? source.root_strength);
    const rootWeakClass = normalizeWeakClass(source.root?.weak_class ?? source.root_weak_class);
    if (rootStrength) {
        return {
            strength: rootStrength,
            weak_class: rootStrength === 'weak'
                ? (rootWeakClass || 'defective')
                : rootWeakClass,
        };
    }

    return {
        strength: 'weak',
        weak_class: 'defective',
    };
}
