import type { Gender } from '../types';

/**
 * nounInflectionEngine.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Pure-function module: attaches Maltese possessive suffixes to noun stems.
 * Uses a Dynamic Two-Stem Framework (Stem A and Stem B) to handle 
 * phonological shifts like syncopation, construct-state buffering, 
 * and weak-root glide management.
 */

// ── TYPES ──────────────────────────────────────────────────────────────────

export type PossessiveSuffixIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0:i, 1:ek/ok, 2:u, 3:ha, 4:na, 5:kom, 6:hom

const SUFFIXES = ['i', 'ek', 'u', 'ha', 'na', 'kom', 'hom'] as const;

// ── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Returns true if the stem contains a 'round' vowel (o) that triggers harmony.
 */
function isRound(stem: string): boolean {
    const vowels = stem.match(/[aeiouàèìòùâêîôû]/gi);
    if (!vowels) return false;
    // Check the last non-terminal vowel for harmony
    const lastVowel = vowels[vowels.length - 1].toLowerCase();
    return lastVowel === 'o';
}

/**
 * Simplifies illegal geminates like -jj- and -ww-.
 */
function degeminate(stem: string): string {
    return stem.replace(/jj/g, 'j').replace(/ww/g, 'w');
}

/**
 * Detects if a pattern triggers syncopation (CV-CV-C or similar).
 */
function isSyncopatingPattern(pattern: string): boolean {
    // Matches CvCvC, CCvCvC, CCvCCvC
    return /Cv[v]?C[v]?[v]?C$/.test(pattern);
}

/**
 * Syncopates a word by dropping the last short vowel.
 */
function syncopateWord(word: string): string {
    // Drop o/e/i in the last internal syllable
    return word.replace(/([aeiouàèìòùâêîôû])([^aeiouàèìòùâêîôû])([oei])([^aeiouàèìòùâêîôû])$/i, '$1$2$4');
}

// ── CORE ENGINE ────────────────────────────────────────────────────────────

export interface NounStems {
    stemA: string; // Full/Standard
    stemB: string; // Syncopated/Construct
}

/**
 * Generates the two-stem framework for a noun based on its pattern and gender.
 */
export function generateNounStems(
    base: string,
    pattern?: string,
    gender: Gender = 'masculine'
): NounStems {
    let stemA = base;
    let stemB = base;

    // 1. Degeminate both stems (illegal for all inflected forms)
    stemA = degeminate(stemA);
    stemB = degeminate(stemB);

    // 2. Handle Syncopation
    if (pattern && isSyncopatingPattern(pattern)) {
        stemB = syncopateWord(stemB);
    } else if (!pattern) {
        // Fallback heuristic: syncopate 5-char words like tifel
        if (base.length === 5 && /[aeiou]/i.test(base[1]) && /[aeiou]/i.test(base[3])) {
            stemB = syncopateWord(stemB);
        }
    }

    // 3. Handle Complex Patterns (iCCCa) BEFORE general -a handling
    if (pattern === 'iCCCa') {
        const C1 = base[1];
        const C2 = base[2];
        const C3 = base[3];
        // Transformation: ilsinti (i-l-s-i-n-t-i)
        stemB = `i${C1}${C2}i${C3}t`;
        stemA = stemB;
        return { stemA, stemB };
    }

    // 4. Handle Construct State triggers (-a ending)
    if (base.endsWith('a')) {
        const rootRaw = base.slice(0, -1);
        
        // Exceptional: mara -> mart-
        if (base === 'mara') {
            return { stemA: 'mart', stemB: 'mart' };
        }

        // Masculine Exception: wara -> waraj- (Only if it's explicitly masculine -a, e.g. prepositions/adverbs)
        // Note: For broken plurals ending in -a, they are usually treated as feminine-t.
        // We only trigger glide if gender is strictly masculine and NOT a broken plural pattern (like CvCCa).
        if (gender === 'masculine' && !pattern?.includes('CCa')) {
            return { stemA: base + 'j', stemB: base + 'j' };
        }

        // Weak Root C3 Drop: zija -> zit-
        // Logic: If the third radical is a glide, it drops in the construct form.
        if (rootRaw.endsWith('j') || rootRaw.endsWith('w')) {
            stemB = rootRaw.slice(0, -1) + 't';
        } else {
            stemB = rootRaw + 't';
        }
        
        stemA = stemB;
    }

    return { stemA, stemB };
}

/**
 * Apply possessive suffix to a noun.
 */
export function applyPossessiveSuffix(
    base: string,
    idx: PossessiveSuffixIdx,
    gender: Gender = 'masculine',
    pattern?: string
): string {
    if (!base || base === '-') return '-';

    const suffix = SUFFIXES[idx];
    const isVowelSuffix = /^[aeiou]/i.test(suffix);
    const { stemA, stemB } = generateNounStems(base, pattern, gender);

    // Determine which stem to use
    let stem = isVowelSuffix ? stemB : stemA;
    let finalSuffix: string = suffix;

    // ── Vowel Harmony ────────────────────────────────────────────────────────
    if (suffix === 'ek' && isRound(stem)) {
        finalSuffix = 'ok';
    }

    // ── Vocalic Endings (u/i) -> Glide Insertion ─────────────────────────────
    if (base.endsWith('u') || base.endsWith('i')) {
        const glide = base.endsWith('u') ? 'w' : 'j';
        if (isVowelSuffix) {
            // Suffix 3ms: u -> h (ziju -> zijuh)
            if (idx === 2) return base + 'h';
            return base + glide + finalSuffix;
        }
    }
    
    // ── Masculine -a Glide Handling (e.g. wara -> warajja) ────────────────────
    if (base.endsWith('a') && gender === 'masculine' && stem.endsWith('j')) {
        if (idx === 0) return stem + 'ja'; // warajja
        if (idx === 1) return stem + 'k';  // warajk
        if (idx === 2) return stem + 'h';  // warajh
    }

    // ── Buffer Logic for Consonant Suffixes ──────────────────────────────────
    // e.g. widna (CvCCa) -> widnitna
    // CRITICAL: We only add buffer if the stem ends in CONSTRUCT -t AND doesn't already have an internal i (like iCCCa)
    const isComplexPattern = pattern === 'iCCCa';
    if (!isVowelSuffix && base.endsWith('a') && !pattern?.includes('vCa') && base !== 'mara' && !isComplexPattern) {
        // Only add -i- buffer if we have a cluster (widnt -> widnit)
        if (stem.endsWith('t') && stem.length > 3) {
            stem = stem.slice(0, -1) + 'it';
        }
    }

    // ── Handle CvCCa broken plurals with t-marbuta construct forms ────────────
    if (base === 'kotba' || (pattern === 'CvCCa' && base.length <= 5)) {
        const kotobConstruct = 'kotobt';
        const suffixToUse = finalSuffix === 'ek'
            ? (isRound(kotobConstruct) ? 'ok' : 'ek')
            : finalSuffix;

        return kotobConstruct + suffixToUse;
    }

    return stem + finalSuffix;
}

export function getPossessiveLabels(vset: string = ''): string[] {
    const round = vset.includes('o'); 
    return ['-i', round ? '-ok' : '-ek', '-u', '-ha', '-na', '-kom', '-hom'];
}
