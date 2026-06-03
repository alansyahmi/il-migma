import type { Gender } from '../types/index.ts';

export type NormalizedGender = Gender | null;

/**
 * Normalize known gender spellings/aliases into canonical values.
 */
export function normalizeGender(value: unknown): NormalizedGender {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    if (['masculine', 'masc', 'm'].includes(normalized)) return 'masculine';
    if (['feminine', 'fem', 'f'].includes(normalized)) return 'feminine';
    if (['neutral', 'neut', 'n'].includes(normalized)) return 'neutral';

    return null;
}

/**
 * Canonical gender fallback order used across API + UI:
 * 1) Explicit canonical row value (`gender`)
 * 2) Legacy row value (`noun_gender`) as temporary read-compat
 * 3) Noun morphology gender value
 * 4) null (no implicit masculine default)
 */
export function resolveEntryGender(entry: any): NormalizedGender {
    if (!entry) return null;

    // 1) Canonical column
    const canonical = normalizeGender(entry.gender);
    if (canonical) return canonical;

    // 2) Legacy flat columns (read-compat while DB is migrating)
    const legacy =
        normalizeGender(entry.noun_gender) ||
        normalizeGender(entry.adj_gender) ||
        normalizeGender(entry.participle_gender);
    if (legacy) return legacy;

    // 3) Nested morphology objects (some API payloads embed these)
    const nested =
        normalizeGender(entry.noun_morphology?.gender) ||
        normalizeGender(entry.adjective_morphology?.gender) ||
        normalizeGender(entry.participle_morphology?.gender);
    if (nested) return nested;

    return null;
}

function normalizePos(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

function firstPatternValue(...values: unknown[]): string | null {
    for (const value of values) {
        const normalized = String(value || '').trim();
        if (normalized) return normalized;
    }
    return null;
}

function readMorphologyPatternSet(source: any, nested: any) {
    return {
        pattern: firstPatternValue(nested?.pattern, source?.pattern),
        formMascPattern: firstPatternValue(nested?.form_masc_pattern, source?.form_masc_pattern),
        formFemPattern: firstPatternValue(nested?.form_fem_pattern, source?.form_fem_pattern),
        formPluralPattern: firstPatternValue(nested?.form_plural_pattern, source?.form_plural_pattern),
        elativePattern: firstPatternValue(nested?.elative_pattern, source?.elative_pattern),
        diminutivePattern: firstPatternValue(nested?.diminutive_pattern, source?.diminutive_pattern),
    };
}

function readPatternBundle(source: any) {
    return {
        cvPattern: firstPatternValue(source?.cv_pattern),
        morphPattern: firstPatternValue(source?.morph_pattern),
        rootPattern: firstPatternValue(source?.root_pattern_form?.pattern?.cv_notation),
        noun: readMorphologyPatternSet(source, source?.noun_morphology || {}),
        adjective: readMorphologyPatternSet(source, source?.adjective_morphology || source?.adj_morphology || {}),
        participle: readMorphologyPatternSet(source, source?.participle_morphology || source?.pm || {}),
        numeral: readMorphologyPatternSet(source, source?.numeral_morphology || source?.num || {}),
    };
}

function resolveMainPatternByGenderLegacy(entry: any): string | null {
    if (!entry) return null;

    const gender = normalizeGender(entry.gender);
    const { cvPattern, morphPattern, rootPattern, noun, adjective, participle, numeral } = readPatternBundle(entry);

    const femininePattern = firstPatternValue(
        adjective.formFemPattern,
        participle.formFemPattern,
        numeral.formFemPattern,
        noun.formFemPattern,
        adjective.pattern,
        participle.pattern,
        numeral.pattern,
        noun.pattern,
        cvPattern,
        morphPattern,
        rootPattern,
    );

    const masculinePattern = firstPatternValue(
        adjective.formMascPattern,
        participle.formMascPattern,
        numeral.formMascPattern,
        noun.formMascPattern,
        adjective.pattern,
        participle.pattern,
        numeral.pattern,
        noun.pattern,
        cvPattern,
        morphPattern,
        rootPattern,
    );

    const neutralPattern = firstPatternValue(
        cvPattern,
        morphPattern,
        noun.pattern,
        adjective.pattern,
        participle.pattern,
        numeral.pattern,
        rootPattern,
    );

    switch (gender) {
        case 'feminine':
            return femininePattern;
        case 'neutral':
            return neutralPattern || masculinePattern || femininePattern;
        case 'masculine':
        default:
            return masculinePattern || femininePattern || neutralPattern;
    }
}

function pickMorphologyBundleByPos(
    bundle: {
        noun: { pattern: string | null; formMascPattern: string | null; formFemPattern: string | null; formPluralPattern: string | null; elativePattern: string | null; diminutivePattern: string | null };
        adjective: { pattern: string | null; formMascPattern: string | null; formFemPattern: string | null; formPluralPattern: string | null; elativePattern: string | null; diminutivePattern: string | null };
        participle: { pattern: string | null; formMascPattern: string | null; formFemPattern: string | null; formPluralPattern: string | null; elativePattern: string | null; diminutivePattern: string | null };
        numeral: { pattern: string | null; formMascPattern: string | null; formFemPattern: string | null; formPluralPattern: string | null; elativePattern: string | null; diminutivePattern: string | null };
    },
    pos: string,
) {
    switch (pos) {
        case 'noun':
            return bundle.noun;
        case 'adjective':
            return bundle.adjective;
        case 'participle':
            return bundle.participle;
        case 'numeral':
            return bundle.numeral;
        default:
            return null;
    }
}

/**
 * Resolve the "main" pattern using the current entry POS and default gender.
 * This prefers the morphology bundle that matches the entry's POS and only
 * falls back to neutral slots when the matching gender slot is empty.
 */
export function resolveMainPatternByGenderForPos(entry: any, pos?: unknown): string | null {
    if (!entry) return null;

    const normalizedPos = normalizePos(pos ?? entry?.pos);
    if (!normalizedPos) {
        return resolveMainPatternByGenderLegacy(entry);
    }

    const gender = normalizeGender(entry.gender);
    const { cvPattern, morphPattern, rootPattern, noun, adjective, participle, numeral } = readPatternBundle(entry);
    const source = pickMorphologyBundleByPos({ noun, adjective, participle, numeral }, normalizedPos);

    if (!source) {
        return resolveMainPatternByGenderLegacy(entry);
    }

    const masculinePattern = firstPatternValue(
        source.formMascPattern,
        source.pattern,
        cvPattern,
        morphPattern,
        rootPattern,
    );

    const femininePattern = firstPatternValue(
        source.formFemPattern,
        source.pattern,
        cvPattern,
        morphPattern,
        rootPattern,
    );

    const neutralPattern = firstPatternValue(
        cvPattern,
        morphPattern,
        source.pattern,
        rootPattern,
    );

    switch (gender) {
        case 'feminine':
            return femininePattern;
        case 'neutral':
            return neutralPattern || masculinePattern || femininePattern;
        case 'masculine':
        default:
            return masculinePattern || femininePattern || neutralPattern;
    }
}

/**
 * Resolve the "main" pattern for an entry by its default gender.
 * Neutral entries use the neutral/non-gendered pattern slots first.
 */
export function resolveMainPatternByGender(entry: any): string | null {
    return resolveMainPatternByGenderForPos(entry, entry?.pos);
}
