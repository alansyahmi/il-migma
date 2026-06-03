import type { VerbStrength, WeakClass } from '@/types';

export interface StemDefaultClassification {
    strength: VerbStrength;
    weak_class: WeakClass | null;
}

export interface VerbClassificationSource {
    verb_class?: unknown;
    verb_weak_class?: unknown;
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
 * 2. Hybrid stem override -> weak defective quad Form I
 * 3. Root classification
 * 4. Conservative weak defective fallback
 */
export function resolveVerbClassification(source?: VerbClassificationSource | null): StemDefaultClassification {
    if (!source) {
        return {
            strength: 'weak',
            weak_class: 'defective',
        };
    }

    const explicitStrength = normalizeStrength(source.verb_class);
    const explicitWeakClass = normalizeWeakClass(source.verb_weak_class);
    if (explicitStrength) {
        return {
            strength: explicitStrength,
            weak_class: explicitStrength === 'weak'
                ? (explicitWeakClass || 'defective')
                : explicitWeakClass,
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
