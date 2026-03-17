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

    // 1) Canonical column
    const canonical = normalizeGender(entry.gender);
    if (canonical) return canonical;

    // 2) Legacy flat columns (read-compat while DB is migrating)
    const legacy =
        normalizeGender(entry.noun_gender) ||
        normalizeGender(entry.adj_gender) ||
        normalizeGender(entry.participle_gender);
    if (legacy) return legacy;

    // 3) Nested morphology objects (some API payloads embed these)
    const nested =
        normalizeGender(entry.noun_morphology?.gender) ||
        normalizeGender(entry.adjective_morphology?.gender) ||
        normalizeGender(entry.participle_morphology?.gender);
    if (nested) return nested;

    return null;
}
