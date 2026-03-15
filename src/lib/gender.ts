import type { Gender } from '@/types';

export type NormalizedGender = Gender | null;

/**
 * Normalize known gender spellings/aliases into canonical values.
 */
export function normalizeGender(value: unknown): NormalizedGender {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    if (['masculine', 'masc', 'm'].includes(normalized)) return 'masculine';
    if (['feminine', 'fem', 'f'].includes(normalized)) return 'feminine';
    if (['neutral', 'neut', 'n'].includes(normalized)) return 'neutral';

    return null;
}

/**
 * Canonical gender fallback order used across API + UI:
 * 1) Explicit canonical row value (`gender`)
 * 2) Legacy row value (`noun_gender`) as temporary read-compat
 * 3) Noun morphology gender value
 * 4) null (no implicit masculine default)
 */
export function resolveEntryGender(entry: any): NormalizedGender {
    if (!entry) return null;

    return (
        normalizeGender(entry.gender) ||
        normalizeGender(entry.noun_gender) ||
        normalizeGender(entry.noun_morphology?.gender) ||
        null
    );
}
