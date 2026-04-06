import type { Gender } from '@/types';

const VOWEL_CLUSTER_RE = /[aeiouàèìòùâêîôû]/gi;

function normalizeWord(word: string): string {
    return String(word || '').trim().toLowerCase().normalize('NFC');
}

function normalizeRadical(radical?: string): string {
    return String(radical || '').trim().toLowerCase();
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
 * Returns a Type-1-style attachment stem for noun suffixes and duals.
 *
 * The result is intentionally conservative:
 * - consonant-final nouns use a shortened attachment stem for the reduced forms
 * - masculine final -u/-i nouns keep the citation base and use glide suffixes
 * - masculine final -a glide cases only activate for j/w radicals or wara
 * - feminine t-marbuta forms keep the existing feminine stem behavior
 */
export function prepareSuffixAttachmentStem(word: string): string {
    const simplified = normalizeWord(word).replace(/jj/g, 'j').replace(/ww/g, 'w');
    let stem = simplified;

    const vowelCount = stem.match(VOWEL_CLUSTER_RE)?.length ?? 0;
    if (vowelCount >= 2) {
        const shortenedIe = stem.replace(/ie([^aeiouàèìòùâêîôû]*)$/i, 'i$1');
        if (shortenedIe !== stem && (shortenedIe.match(/([aeiouàèìòùâêîôû])([^aeiouàèìòùâêîôû]+)$/i)?.[2]?.length ?? 0) === 1) {
            stem = shortenedIe;
        } else {
            const finalClusterMatch = stem.match(/([aeiouàèìòùâêîôû])([^aeiouàèìòùâêîôû]+)$/i);
            if (finalClusterMatch && finalClusterMatch[2].length === 1) {
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

    if (gender === 'feminine' && normalized.endsWith('a')) {
        if (normalized === 'mara') {
            return { stemA: 'mart', stemB: 'mart' };
        }

        const rootRaw = normalized.slice(0, -1);
        const feminineStem = rootRaw.endsWith('j') || rootRaw.endsWith('w')
            ? `${rootRaw.slice(0, -1)}t`
            : `${rootRaw}t`;

        return { stemA: feminineStem, stemB: feminineStem };
    }

    if (normalized.endsWith('u') || normalized.endsWith('i')) {
        return { stemA: normalized, stemB: normalized };
    }

    if (normalized.endsWith('a') && isMasculineAglide(normalized, thirdRadical)) {
        return { stemA: `${normalized}j`, stemB: `${normalized}j` };
    }

    const shortStem = prepareSuffixAttachmentStem(normalized);
    const longStem = deriveMasculineLongStem(normalized);
    return { stemA: longStem, stemB: shortStem };
}

export function isRoundVowelStem(stem: string): boolean {
    return isRound(stem);
}
