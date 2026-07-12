import { applyPossessiveSuffix, type PossessiveSuffixIdx } from './nounInflectionEngine.ts';
import { deriveAjPluralStem, hasStressedOrLongFinalSyllable, isAjPluralPattern } from './nounAttachment.ts';

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

function isNonSyncopatingPluralPattern(pattern?: string) {
    const normalized = normalizePattern(pattern).replace(/^-+/, '').toLowerCase();
    return normalized === 'at' || normalized === 'iet';
}

function derivePluralConstructStem(base: string, pattern?: string) {
    const normalizedPattern = normalizePattern(pattern);
    const normalizedBase = base.toLowerCase().trim().normalize('NFC');

    if (isAjPluralPattern(normalizedPattern)) {
        // CoCCa plurals like kotba use the -aj- stem.
        return deriveAjPluralStem(base);
    }

    if (!normalizedPattern && normalizedBase === 'kotba') {
        return deriveAjPluralStem(base);
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

function capitalizeFirst(s: string): string {
    if (!s) return s;
    const prefixMatch = s.match(/^([*✦\s]+)/);
    if (prefixMatch) {
        const prefix = prefixMatch[1];
        const rest = s.slice(prefix.length);
        return prefix + (rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : '');
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function applyInflectionTableSuffix(
    base: string,
    idx: PossessiveSuffixIdx,
    gender: 'masculine' | 'feminine' = 'masculine',
    pattern?: string,
    thirdRadical?: string,
    ipaHint?: string,
) {
    if (!base || base === '-') return '-';
    const cleanBase = base.replace(/^[*✦\s]+/, '');
    const isCapitalized = cleanBase.length > 0 && cleanBase[0] === cleanBase[0].toUpperCase() && cleanBase[0] !== cleanBase[0].toLowerCase();
    
    const normalizedBase = isCapitalized ? cleanBase.charAt(0).toLowerCase() + cleanBase.slice(1) : base;
    const result = applyInflectionTableSuffixInternal(normalizedBase, idx, gender, pattern, thirdRadical, ipaHint);
    
    if (result === '-') return '-';
    
    const hasOriginalAsterisk = base.startsWith('*');
    const finalResult = hasOriginalAsterisk && !result.startsWith('*') ? '*' + result : result;

    return isCapitalized ? capitalizeFirst(finalResult) : finalResult;
}

function applyInflectionTableSuffixInternal(
    base: string,
    idx: PossessiveSuffixIdx,
    gender: 'masculine' | 'feminine' = 'masculine',
    pattern?: string,
    thirdRadical?: string,
    ipaHint?: string,
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

    if (isNonSyncopatingPluralPattern(pattern)) {
        return applyConstructSuffix(base, idx);
    }

    const radical = normalizeRadical(thirdRadical) || normalizeRadical(inferFinalRadicalFromBase(base));

    // The first three attached forms normally collapse the final syllable vowel before suffixation.
    // Keep the full stem when the IPA shows a stressed or long final syllable.
    if (idx <= 2 && gender !== 'feminine' && !hasStressedOrLongFinalSyllable(ipaHint, base, pattern)) {
        const collapsedBase = collapseFinalSyllableVowel(base);
        if (collapsedBase !== base) {
            return applyPossessiveSuffix(collapsedBase, idx, gender, pattern, thirdRadical, ipaHint);
        }
    }

    // Vocalic endings: u/i/o
    if (base.endsWith('u') || base.endsWith('i') || base.endsWith('o')) {
        return applyPossessiveSuffix(base, idx, gender, pattern, thirdRadical, ipaHint);
    }

    // Handle words ending in 'a'
    if (base.endsWith('a')) {
        if (gender === 'feminine') {
            return applyPossessiveSuffix(base, idx, gender, pattern, thirdRadical, ipaHint);
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
    return applyPossessiveSuffix(base, idx, gender, pattern, thirdRadical, ipaHint);
}
