import type { Gender } from '../types';
import {
    deriveNounAttachmentStems,
    deriveAjPluralStem,
    isAjPluralPattern,
    isRoundVowelStem,
} from './nounAttachment.ts';

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

// ── CORE ENGINE ────────────────────────────────────────────────────────────

export interface NounStems {
    stemA: string; // Full/Standard
    stemB: string; // Syncopated/Construct
}

/**
 * Generates the two-stem framework for a noun based on its pattern and gender.
 * Stem B is the reduced attachment stem; Stem A is the fuller consonant-suffix stem.
 */
export function generateNounStems(
    base: string,
    pattern?: string,
    gender: Gender = 'masculine',
    ipaHint?: string,
): NounStems {
    return deriveNounAttachmentStems(base, gender, undefined, pattern, ipaHint);
}

/**
 * Apply possessive suffix to a noun.
 */
export function applyPossessiveSuffix(
    base: string,
    idx: PossessiveSuffixIdx,
    gender: Gender = 'masculine',
    pattern?: string,
    thirdRadical?: string,
    ipaHint?: string,
): string {
    if (!base || base === '-') return '-';

    const suffix = SUFFIXES[idx];
    const isVowelSuffix = /^[aeiou]/i.test(suffix);
    const { stemA, stemB } = generateNounStems(base, pattern, gender, ipaHint);

    let stem = isVowelSuffix ? stemB : stemA;
    let finalSuffix: string = suffix;

    // ── Vowel Harmony ────────────────────────────────────────────────────────
    if (suffix === 'ek' && isRoundVowelStem(base)) {
        finalSuffix = 'ok';
    }

    // ── Vocalic Endings (u) -> Glide Insertion ───────────────────────────────
    if (base.endsWith('u')) {
        const glide = base.endsWith('u') ? 'w' : 'j';
        if (idx === 0) return base + glide + 'i';
        if (idx === 1) return base + 'k';
        if (idx === 2) return base + 'h';
        return base + finalSuffix;
    }

    // ── Vocalic Endings (i, o) -> Glide Attachment ───────────────────────────
    if (base.endsWith('i') || base.endsWith('o')) {
        if (idx === 0) return base + 'ja';
        if (idx === 1) return base + 'k';
        if (idx === 2) return base + 'h';
        return base + finalSuffix;
    }

    // ── Masculine -a Glide Handling (restricted to j/w radicals or wara) ─────
    if (base.endsWith('a') && gender === 'masculine' && stem.endsWith('j')) {
        const normalizedRadical = String(thirdRadical || '').trim().toLowerCase();
        const isAllowedGlide = base.toLowerCase().trim() === 'wara' || ['j', 'w'].includes(normalizedRadical);
        if (isAllowedGlide) {
            if (idx === 0) return stem + 'i';
            if (idx === 1) return stem + finalSuffix;
            if (idx === 2) return stem + finalSuffix;
            return stem + finalSuffix;
        }
    }

    // ── Handle CoCCa broken plurals with -aj- forms ─────────────────────────
    if (gender === 'masculine' && (base === 'kotba' || isAjPluralPattern(pattern))) {
        const pluralStem = deriveAjPluralStem(base);
        const suffixToUse = finalSuffix === 'ek'
            ? (isRoundVowelStem(pluralStem) ? 'ok' : 'ek')
            : finalSuffix;

        return pluralStem + suffixToUse;
    }

    // ── Feminine t-marbuta buffering ──────────────────────────────────────────
    const isComplexPattern = pattern === 'iCCCa';
    const hasLongIeFeminineStem = base.slice(0, -1).includes('ie');
    if (hasLongIeFeminineStem && gender === 'feminine' && !isVowelSuffix && idx >= 4 && stem.endsWith('t')) {
        stem = stem.slice(0, -1);
    }
    if (!isVowelSuffix && gender === 'feminine' && base.endsWith('a') && base !== 'mara' && !isComplexPattern && !hasLongIeFeminineStem) {
        if (stem.endsWith('t') && stem.length > 3) {
            stem = stem.slice(0, -1) + 'it';
        }
    }

    return stem + finalSuffix;
}

export function getPossessiveLabels(vset: string = ''): string[] {
    const round = vset.includes('o'); 
    return ['-i', round ? '-ok' : '-ek', '-u', '-ha', '-na', '-kom', '-hom'];
}
