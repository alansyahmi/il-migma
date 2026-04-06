import { applyPossessiveSuffix, type PossessiveSuffixIdx } from './nounInflectionEngine.ts';

const A_ENDING_SUFFIXES = ['ja', 'k', 'h', 'ha', 'na', 'kom', 'hom'] as const;
const CONSTRUCT_SUFFIXES = ['i', 'ek', 'u', 'ha', 'na', 'kom', 'hom'] as const;
const FINAL_SYLLABLE_COLLAPSE_RE = /^(.*?)([aeiouàèìòùâêîôû])([^aeiouàèìòùâêîôû]+)$/i;
const VOWEL_CLUSTER_RE = /(ie|[aeiouàèìòùâêîôû])/gi;

function normalizeRadical(radical?: string) {
    return (radical || '').trim().toLowerCase();
}

function inferFinalRadicalFromBase(base: string) {
    const stripped = base.replace(/a$/i, '');
    const match = stripped.match(/([^\Waeiouàèìòùâêîôû])$/i);
    return match?.[1] || '';
}

function collapseFinalSyllableVowel(base: string) {
    const collapsed = base.match(FINAL_SYLLABLE_COLLAPSE_RE);
    if (!collapsed) return base;
    return `${collapsed[1]}${collapsed[3]}`;
}

function hasSingleVowel(base: string) {
    return (base.match(VOWEL_CLUSTER_RE)?.length ?? 0) <= 1;
}

function normalizePattern(pattern?: string) {
    return (pattern || '')
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
        .replace(/ò/gi, 'o');
}

function derivePluralConstructStem(base: string, pattern?: string) {
    const normalizedPattern = normalizePattern(pattern);

    if (normalizedPattern === 'CvCCa') {
        if (base.length >= 4) {
            return `${base.slice(0, 3)}o${base[3]}t`;
        }
        return `${base.slice(0, -1)}t`;
    }

    if (normalizedPattern === 'CCuCa' || (!normalizedPattern && base.length === 5 && !/[aeiouàèìòùâêîôû]/i.test(base[1] || '') && /[aeiouàèìòùâêîôû]/i.test(base[2] || ''))) {
        return `${base.slice(0, -1)}t`;
    }

    if (normalizedPattern === 'iCCCa' || (!normalizedPattern && base.length === 5 && /^[aeiouàèìòùâêîôû]/i.test(base))) {
        if (base.length < 4) return `${base.slice(0, -1)}t`;
        return `${base.slice(0, 3)}i${base[3]}t`;
    }

    return null;
}

function applyConstructSuffix(stem: string, idx: PossessiveSuffixIdx) {
    const finalVowel = (stem.match(/([aeiouàèìòùâêîôû])(?!.*[aeiouàèìòùâêîôû])/i)?.[1] || '').toLowerCase();
    const suffix = idx === 1 && finalVowel === 'o' ? 'ok' : CONSTRUCT_SUFFIXES[idx];
    return `${stem}${suffix}`;
}

export function applyInflectionTableSuffix(
    base: string,
    idx: PossessiveSuffixIdx,
    gender: 'masculine' | 'feminine' = 'masculine',
    pattern?: string,
    thirdRadical?: string
) {
    if (!base || base === '-') return '-';

    const GLIDE_A_WORDS = ['wara'];
    const lowerBase = base.toLowerCase();
    const finalVowel = (base.match(/([aeiouàèìòùâêîôû])(?!.*[aeiouàèìòùâêîôû])/i)?.[1] || '').toLowerCase();

    if (hasSingleVowel(base)) {
        const suffix = idx === 1 && finalVowel === 'o'
            ? 'ok'
            : CONSTRUCT_SUFFIXES[idx];
        return `${base}${suffix}`;
    }

    const radical = normalizeRadical(thirdRadical) || normalizeRadical(inferFinalRadicalFromBase(base));

    // The first three attached forms collapse the final syllable vowel before suffixation.
    if (idx <= 2) {
        const collapsedBase = collapseFinalSyllableVowel(base);
        if (collapsedBase !== base) {
            return applyPossessiveSuffix(collapsedBase, idx, gender, pattern, thirdRadical);
        }
    }

    // Vocalic endings: u/i
    if (base.endsWith('u') || base.endsWith('i')) {
        return applyPossessiveSuffix(base, idx, gender, pattern, thirdRadical);
    }

    // Handle words ending in 'a'
    if (base.endsWith('a')) {
        if (gender === 'feminine') {
            return applyPossessiveSuffix(base, idx, gender, pattern, thirdRadical);
        }

        const pluralConstructStem = derivePluralConstructStem(base, pattern);
        if (pluralConstructStem) {
            return applyConstructSuffix(pluralConstructStem, idx);
        }

        // Glide insertion (e.g., wara -> warajja)
        if (GLIDE_A_WORDS.includes(lowerBase) || (!!radical && ['j', 'w'].includes(radical))) {
            const stem = `${base}j`;
            const suffix = ['i', 'ek', 'u', 'ha', 'na', 'kom', 'hom'][idx];
            if (idx === 0) return `${stem}i`;
            if (idx === 1) return `${stem}${suffix}`;
            if (idx === 2) return `${stem}${suffix}`;
            return `${stem}${suffix}`;
        }

        // I-shift (e.g., kontra -> kontrija)
        const stem = `${base.slice(0, -1)}i`;
        return `${stem}${A_ENDING_SUFFIXES[idx]}`;
    }

    // Default to standard possessive logic
    return applyPossessiveSuffix(base, idx, gender, pattern, thirdRadical);
}
