/**
 * @typedef {'masculine' | 'feminine' | null} NormalizedGender
 */

/**
 * Normalize known gender spellings/aliases into canonical values.
 * @param {unknown} value
 * @returns {NormalizedGender}
 */
export function normalizeGender(value) {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    if (['masculine', 'masc', 'm'].includes(normalized)) return 'masculine';
    if (['feminine', 'fem', 'f'].includes(normalized)) return 'feminine';

    return null;
}

/**
 * Canonical gender fallback order used across API + UI:
 * 1) Explicit DB value on the entry row (`noun_gender`/`gender`)
 * 2) Noun morphology gender value
 * 3) null (no implicit masculine default)
 * @param {any} entry
 * @returns {NormalizedGender}
 */
export function resolveEntryGender(entry) {
    if (!entry) return null;

    return (
        normalizeGender(entry.noun_gender) ||
        normalizeGender(entry.gender) ||
        normalizeGender(entry.noun_morphology?.gender) ||
        null
    );
}
