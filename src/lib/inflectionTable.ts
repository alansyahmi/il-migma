import { applyPossessiveSuffix, type PossessiveSuffixIdx } from './nounInflectionEngine.ts';

const A_ENDING_SUFFIXES = ['ja', 'k', 'h', 'ha', 'na', 'kom', 'hom'] as const;

function normalizeRadical(radical?: string) {
    return (radical || '').trim().toLowerCase();
}

function inferFinalRadicalFromBase(base: string) {
    const stripped = base.replace(/a$/i, '');
    const match = stripped.match(/([^\Waeiouàèìòùâêîôû])$/i);
    return match?.[1] || '';
}

export function applyInflectionTableSuffix(
    base: string,
    idx: PossessiveSuffixIdx,
    gender: 'masculine' | 'feminine' = 'masculine',
    pattern?: string,
    thirdRadical?: string
) {
    if (!base || base === '-') return '-';

    // Special cases that use glide 'j' instead of i-shift
    const GLIDE_A_WORDS = ['wara', 'meta', 'hawnha', 'hemmha'];
    const lowerBase = base.toLowerCase();

    const radical = normalizeRadical(thirdRadical) || normalizeRadical(inferFinalRadicalFromBase(base));
    
    // Vocalic endings: u/i
    if (base.endsWith('u') || base.endsWith('i')) {
        const glide = base.endsWith('u') ? 'w' : 'j';
        // 3ms special case for u/i endings: return base + 'h'
        if (idx === 2) return base + 'h';
        return `${base}${glide}${['i', 'ek', 'u', 'ha', 'na', 'kom', 'hom'][idx]}`;
    }

    // Handle words ending in 'a'
    if (base.endsWith('a')) {
        // Glide insertion (e.g., wara -> warajja)
        if (GLIDE_A_WORDS.includes(lowerBase) || (!!radical && ['j', 'w'].includes(radical))) {
            const stem = `${base}j`;
            // For warajja, we use 'ja' instead of 'i' for idx 0
            if (idx === 0) return `${stem}ja`;
            if (idx === 1) return `${stem}k`;
            if (idx === 2) return `${stem}h`;
            return `${stem}${['i', 'ek', 'u', 'ha', 'na', 'kom', 'hom'][idx]}`;
        }

        // I-shift (e.g., kontra -> kontrija)
        const stem = `${base.slice(0, -1)}i`;
        return `${stem}${A_ENDING_SUFFIXES[idx]}`;
    }

    // Default to standard possessive logic
    return applyPossessiveSuffix(base, idx, gender, pattern);
}
