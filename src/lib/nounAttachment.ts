import type { Gender } from '@/types';

const VOWEL_CLUSTER_RE = /[aeiouàèìòùâêîôû]/gi;
const GEMINATE_BEFORE_FINAL_VOWEL_RE = /([bcdfghjklmnpqrstvwxyzċġħż])\1(ie|[aeiouàèìòùâêîôû])[^aeiouàèìòùâêîôû]*$/i;

function normalizeWord(word: string): string {
    return String(word || '').trim().toLowerCase().normalize('NFC');
}

function normalizeRadical(radical?: string): string {
    return String(radical || '').trim().toLowerCase();
}

function hasOrthographicGeminateBeforeFinalVowel(word?: string): boolean {
    const normalized = normalizeWord(word || '');
    if (!normalized) return false;
    return GEMINATE_BEFORE_FINAL_VOWEL_RE.test(normalized);
}

export function hasStressedOrLongFinalSyllable(ipaHint?: string, word?: string, pattern?: string): boolean {
    const normalizedIPA = String(ipaHint || '')
        .trim()
        .replace(/^\/+|\/+$/g, '');

    if (normalizedIPA) {
        const syllables = normalizedIPA
            .split('.')
            .map((syl) => syl.trim())
            .filter(Boolean);

        if (syllables.length > 0) {
            const finalSyllable = syllables[syllables.length - 1];
            if (finalSyllable.includes('ˈ') || finalSyllable.includes('ː')) return true;
        }
    }

    // Heuristic 1: Pattern-based (e.g. CaCiC, vCCiC)
    if (pattern) {
        const p = pattern.toLowerCase();
        if (/(i|u|ie)[^aeiouàèìòùâêîôû]*$/i.test(p)) return true;
    }

    // Heuristic 2: Word-based (e.g. ħabib, sabiħ, qadim)
    const normalizedWord = String(word || '').toLowerCase().trim();
    if (normalizedWord) {
        const vowels = normalizedWord.match(VOWEL_CLUSTER_RE);
        if (vowels && vowels.length >= 2) {
            // Check for long vowels in the final closed syllable
            if (/(i|u|ie)[^aeiouàèìòùâêîôû]$/i.test(normalizedWord)) return true;
        }

        if (hasOrthographicGeminateBeforeFinalVowel(normalizedWord)) return true;
    }

    return false;
}

function isMasculineAglide(base: string, thirdRadical?: string): boolean {
    const normalized = normalizeWord(base);
    const radical = normalizeRadical(thirdRadical);

    if (normalized === 'wara') return true;
    if (!normalized.endsWith('a')) return false;

    if (['j', 'w'].includes(radical)) return true;

    return false;
}

function isRound(stem: string): boolean {
    const vowels = stem.match(VOWEL_CLUSTER_RE);
    if (!vowels || vowels.length === 0) return false;
    return vowels[vowels.length - 1].toLowerCase() === 'o';
}

function deriveMasculineLongStem(base: string): string {
    const normalized = normalizeWord(base);

    if (/ie([^aeiouàèìòùâêîôû]+)$/i.test(normalized)) {
        return normalized.replace(/ie([^aeiouàèìòùâêîôû]+)$/i, 'i$1');
    }

    if (/^ġi[^aeiouàèìòùâêîôû]*em$/i.test(normalized)) {
        return normalized.replace(/e([^aeiouàèìòùâêîôû]+)$/i, 'i$1');
    }

    return normalized;
}

/**
 * Returns true for the `-aj-` plural family used by `kotba`.
 * This is the pattern class that yields forms like `kotbaji`.
 */
export function isAjPluralPattern(pattern?: string): boolean {
    const normalized = String(pattern || '')
        .trim()
        .replace(/û/gi, 'u')
        .replace(/ù/gi, 'u')
        .replace(/î/gi, 'i')
        .replace(/ì/gi, 'i')
        .replace(/â/gi, 'a')
        .replace(/à/gi, 'a')
        .replace(/ê/gi, 'e')
        .replace(/è/gi, 'e')
        .replace(/ô/gi, 'o')
        .replace(/ò/gi, 'o')
        .toLowerCase();

    return /^cocca$/.test(normalized);
}

/**
 * Converts a `CoCCa`-style plural into the `-aj-` stem used for suffixes.
 *
 * This keeps broken plurals like `kotba` on the same attachment path as
 * their regular plural attachment stem.
 */
export function deriveAjPluralStem(base: string): string {
    const normalized = normalizeWord(base);
    if (!normalized || normalized === '-') return normalized;

    return `${normalized.slice(0, -1)}aj`;
}

/**
 * Returns a Type-1-style attachment stem for noun suffixes and duals.
 *
 * The result is intentionally conservative:
 * - consonant-final nouns use a shortened attachment stem for the reduced forms
 * - masculine final -u/-i nouns keep the citation base and use glide suffixes
 * - masculine final -a glide cases only activate for j/w radicals or wara
 * - feminine t-marbuta forms keep the existing feminine stem behavior
 */
export function prepareSuffixAttachmentStem(word: string, ipaHint?: string, pattern?: string): string {
    const normalized = normalizeWord(word);
    if (hasStressedOrLongFinalSyllable(ipaHint, normalized, pattern)) {
        return normalized;
    }

    const simplified = normalized.replace(/jj/g, 'j').replace(/ww/g, 'w');
    let stem = simplified;

    const vowelCount = stem.match(VOWEL_CLUSTER_RE)?.length ?? 0;
    if (vowelCount >= 2) {
        const shortenedIe = stem.replace(/ie([^aeiouàèìòùâêîôû]*)$/i, 'i$1');
        if (shortenedIe !== stem && (shortenedIe.match(/([aeiouàèìòùâêîôû])([^aeiouàèìòùâêîôû]+)$/i)?.[2]?.length ?? 0) === 1) {
            stem = shortenedIe;
        } else {
            const finalClusterMatch = stem.match(/([aeiouàèìòùâêîôû])([^aeiouàèìòùâêîôû]+)$/i);
            if (finalClusterMatch && finalClusterMatch[2].length === 1 && vowelCount === 2) {
                stem = stem.replace(/([aeiouàèìòùâêîôû])([^aeiouàèìòùâêîôû]+)$/i, '$2');
            }
        }
    }

    return stem;
}

export interface NounAttachmentStems {
    stemA: string;
    stemB: string;
}

export function deriveNounAttachmentStems(
    base: string,
    gender: Gender = 'masculine',
    thirdRadical?: string,
    pattern?: string,
    ipaHint?: string,
): NounAttachmentStems {
    const normalized = normalizeWord(base);
    const normalizedPattern = String(pattern || '').trim().replace(/û/gi, 'u').replace(/ù/gi, 'u').replace(/î/gi, 'i').replace(/ì/gi, 'i').replace(/â/gi, 'a').replace(/à/gi, 'a').replace(/ê/gi, 'e').replace(/è/gi, 'e').replace(/ô/gi, 'o').replace(/ò/gi, 'o');

    if (!normalized || normalized === '-') {
        return { stemA: '-', stemB: '-' };
    }

    if (normalizedPattern === 'iCCCa') {
        const C1 = normalized[1];
        const C2 = normalized[2];
        const C3 = normalized[3];
        const stem = `i${C1}${C2}i${C3}t`;
        return { stemA: stem, stemB: stem };
    }

    if (gender === 'masculine' && normalized.includes('ie')) {
        return { stemA: normalized, stemB: normalized };
    }

    if (gender === 'feminine' && normalized.endsWith('a')) {
        if (normalized === 'mara') {
            return { stemA: 'mart', stemB: 'mart' };
        }

        const rootRaw = normalized.slice(0, -1);
        if (rootRaw.includes('ie')) {
            const shortStem = `${rootRaw.replace(/ie([^aeiouàèìòùâêîôû]+)$/i, 'i$1')}t`;
            return { stemA: shortStem, stemB: shortStem };
        }

        let stemIpaHint = ipaHint;
        if (ipaHint) {
            const cleanIpa = ipaHint.replace(/^\/+|\/+$/g, '');
            const syllables = cleanIpa.split('.');
            if (syllables.length > 1) {
                stemIpaHint = '/' + syllables.slice(0, -1).join('.') + '/';
            }
        }

        const collapsedRoot = prepareSuffixAttachmentStem(rootRaw, stemIpaHint, pattern);
        const feminineStem = collapsedRoot.endsWith('j') || collapsedRoot.endsWith('w')
            ? `${collapsedRoot.slice(0, -1)}t`
            : `${collapsedRoot}t`;

        return { stemA: feminineStem, stemB: feminineStem };
    }

    if (normalized.endsWith('u') || normalized.endsWith('i') || normalized.endsWith('o')) {
        return { stemA: normalized, stemB: normalized };
    }

    if (normalized.endsWith('a') && isMasculineAglide(normalized, thirdRadical)) {
        return { stemA: `${normalized}j`, stemB: `${normalized}j` };
    }

    const shortStem = prepareSuffixAttachmentStem(normalized, ipaHint);
    const longStem = deriveMasculineLongStem(normalized);
    return { stemA: longStem, stemB: shortStem };
}

export function isRoundVowelStem(stem: string): boolean {
    return isRound(stem);
}
