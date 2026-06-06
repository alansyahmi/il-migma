export interface ImalaBlockedSource {
    consonants?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_imp?: string;
    is_imala_blocked?: unknown;
}

function normalizeVowelSet(value: string | undefined): string {
    return String(value || '').trim().toLowerCase();
}

/**
 * Infers blocked imāla from the current morphological fields instead of a
 * persisted flag. This keeps legacy rows in sync with the UI even if the saved
 * boolean was never backfilled.
 */
export function inferImalaBlocked(source: ImalaBlockedSource): boolean {
    const consonants = String(source.consonants || '');
    const vowelSets = [
        normalizeVowelSet(source.vowel_set_perf),
        normalizeVowelSet(source.vowel_set_impf),
        normalizeVowelSet(source.vowel_set_imp),
    ];

    return (
        vowelSets.some(v => v === 'a-a') ||
        /[\u0127q]|g\u0127|h/i.test(consonants)
    );
}

export function parseImalaBlockedOverride(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value !== 'string') return undefined;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return undefined;
}

export function resolveImalaBlocked(source: ImalaBlockedSource): boolean {
    const explicit = parseImalaBlockedOverride(source.is_imala_blocked);
    return explicit === undefined ? inferImalaBlocked(source) : explicit;
}
