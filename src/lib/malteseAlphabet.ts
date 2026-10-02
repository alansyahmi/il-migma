/**
 * src/lib/malteseAlphabet.ts
 *
 * Maltese Alphabet utilities for sorting, indexing, and filtering entries
 * according to standard Maltese orthographic / abċ order (30 letters).
 */

export const MALTESE_ALPHABET = [
    'A', 'B', 'Ċ', 'D', 'E', 'F', 'Ġ', 'G', 'Għ', 'H', 'Ħ', 'I', 'Ie', 'J', 'K',
    'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Ż', 'Z'
] as const;

export type MalteseLetter = typeof MALTESE_ALPHABET[number];

/**
 * Strips leading asterisks, hyphens, quotes, or whitespace before letter matching.
 */
export function normalizeHeadwordForAlpha(word: string | null | undefined): string {
    if (!word) return '';
    return String(word)
        .trim()
        .replace(/^[*'"`\-\s/([\]]+/, '')
        .normalize('NFC')
        .toLowerCase();
}

/**
 * Identifies the Maltese alphabet letter bucket (in abċ order) for a given headword.
 */
export function getMalteseInitialLetter(headword: string | null | undefined): MalteseLetter | null {
    const clean = normalizeHeadwordForAlpha(headword);
    if (!clean) return null;

    // Check multi-character digraphs first:
    // Digraph: Għ (or ASCII gh)
    if (clean.startsWith('għ') || clean.startsWith('gh')) {
        return 'Għ';
    }

    // Digraph: Ie
    if (clean.startsWith('ie')) {
        return 'Ie';
    }

    // Single character checks:
    // Ġ vs G:
    if (clean.startsWith('ġ')) {
        return 'Ġ';
    }
    if (clean.startsWith('g')) {
        return 'G';
    }

    // Ħ vs H:
    if (clean.startsWith('ħ')) {
        return 'Ħ';
    }
    if (clean.startsWith('h')) {
        return 'H';
    }

    // Ż vs Z:
    if (clean.startsWith('ż')) {
        return 'Ż';
    }
    if (clean.startsWith('z')) {
        return 'Z';
    }

    // Ċ (including loanword c):
    if (clean.startsWith('ċ') || clean.startsWith('c')) {
        return 'Ċ';
    }

    // Vowels with accents:
    const ch0 = clean[0];
    if (ch0 === 'a' || ch0 === 'à' || ch0 === 'á' || ch0 === 'â') {
        return 'A';
    }
    if (ch0 === 'e' || ch0 === 'è' || ch0 === 'é' || ch0 === 'ê') {
        return 'E';
    }
    if (ch0 === 'i' || ch0 === 'ì' || ch0 === 'í' || ch0 === 'î') {
        return 'I';
    }
    if (ch0 === 'o' || ch0 === 'ò' || ch0 === 'ó' || ch0 === 'ô') {
        return 'O';
    }
    if (ch0 === 'u' || ch0 === 'ù' || ch0 === 'ú' || ch0 === 'û') {
        return 'U';
    }

    // Standard single letter match:
    const upper = ch0.toUpperCase();
    if ((MALTESE_ALPHABET as readonly string[]).includes(upper)) {
        return upper as MalteseLetter;
    }

    return null;
}

/**
 * Checks if a headword matches a given Maltese alphabet letter filter.
 */
export function matchesMalteseLetter(headword: string | null | undefined, letter: string | null | undefined): boolean {
    if (!letter || letter.toLowerCase() === 'all') return true;
    const initial = getMalteseInitialLetter(headword);
    if (!initial) return false;
    return initial.toLowerCase() === letter.trim().toLowerCase();
}
