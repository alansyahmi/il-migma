export interface ImalaBlockedSource {
    consonants?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_imp?: string;
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
