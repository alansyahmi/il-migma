import type { VerbStrength, WeakClass } from '@/types';

export interface StemDefaultClassification {
    strength: VerbStrength;
    weak_class: WeakClass | null;
}

export function formatStemDisplay(value: string | null | undefined): string {
    const cleaned = String(value ?? '').trim().replace(/^-+/, '').replace(/-+$/, '');
    return cleaned ? `-${cleaned}-` : '';
}

function normalizeStrength(value: unknown): VerbStrength | null {
    if (value === 'strong' || value === 'strong-hybrid' || value === 'weak' || value === 'geminated') {
        return value;
    }
    return null;
}

function normalizeWeakClass(value: unknown): WeakClass | null {
    if (value === 'assimilative' || value === 'hollow' || value === 'defective') {
        return value;
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
