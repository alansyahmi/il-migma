/**
 * src/lib/adminSchema.ts
 * Refactored for Normalized Semitic Morphology.
 */

import {
    normalizeEntryDefinitions,
    normalizeEntryEtymologyChain,
    normalizeRootEtymologyChain,
    normalizeStemEtymologyChain,
    type RootFormData,
    type StemFormData
} from './adminUtils.ts';
import {
    compactPluralRows,
    normalizePluralFormRows,
    pluralRowsToLegacyForms,
    pluralRowsToLegacyPatternString,
} from './pluralForms.ts';

// ── ROOTS ───────────────────────────────────────────────────────────────────

export const ROOT_HANDLED_FIELDS = [
    'id', 'consonants', 'consonant_array', 'strength', 'weak_class',
    'gloss', 'etymology', 'source', 'notes', 'vowel_set_perf',
    'vowel_set_impf', 'vowel_set_imp', 'tags', 'synonyms', 'antonyms',
    'related_entries', 'created_at', 'updated_at', 'hidden_forms', 'is_imala_blocked'
] as const;

export function buildRootPayload(form: RootFormData): Record<string, any> {
    const etymology = normalizeRootEtymologyChain(form.etymology);
    return {
        id: form.id,
        consonants: form.consonants.trim().toLowerCase(),
        strength: form.strength,
        weak_class: form.weak_class || '',
        gloss: JSON.stringify(form.glosses.filter(g => g.en || g.mt)),
        etymology: JSON.stringify(etymology),
        source: form.source,
        vowel_set_perf: form.vowel_set_perf,
        vowel_set_impf: form.vowel_set_impf,
        vowel_set_imp: form.vowel_set_imp,
        tags: JSON.stringify(form.tags?.split(',').map(s => s.trim()).filter(Boolean) || []),
        synonyms: JSON.stringify(form.synonyms || []),
        antonyms: JSON.stringify(form.antonyms || []),
        related_entries: JSON.stringify(form.related_entries || []),
        // Linguistic logic for Maltese phonology
        is_imala_blocked: !!form.is_imala_blocked ||
            form.vowel_set_perf === 'a-a' ||
            form.vowel_set_impf === 'a-a' ||
            form.vowel_set_imp === 'a-a' ||
            /[\u0127q]|g\u0127|h/i.test(form.consonants),
    };
}

// ── STEMS ───────────────────────────────────────────────────────────────────

export const STEM_HANDLED_FIELDS = [
    'stem_string', 'class_type', 'is_hybrid', 'root', 'agentive_suffix',
    'tags', 'source', 'glosses', 'etymology', 'synonyms', 'antonyms', 'related_stems',
    'created_at', 'updated_at'
] as const;

export function buildStemPayload(form: StemFormData): Record<string, any> {
    const etymology = normalizeStemEtymologyChain(form.etymology);
    return {
        stem_string: form.stem_string.trim().normalize('NFC'),
        class_type: form.class_type === 'ir' ? 'ir' : 'ar',
        is_hybrid: !!form.is_hybrid,
        root: form.root || null,
        agentive_suffix: form.agentive_suffix || null,
        tags: JSON.stringify(form.tags?.split(',').map(s => s.trim()).filter(Boolean) || []),
        source: form.source || '',
        glosses: JSON.stringify(form.glosses.filter(g => g.en || g.mt)),
        etymology: JSON.stringify(etymology),
        synonyms: JSON.stringify(form.synonyms || []),
        antonyms: JSON.stringify(form.antonyms || []),
        related_stems: JSON.stringify(form.related_stems || []),
    };
}

// ── ENTRIES (REFACTORED) ─────────────────────────────────────────────────────

/** * Unified Fields: 
 * - gender: Replaces noun_gender, adj_gender, participle_gender
 * - lemma_base: Replaces noun_singular, adj_masculine
 * - inflections_pl: Replaces noun_plural_forms, adj_plural
 * - form_fem: Replaces noun_feminine, adj_feminine
 */
export const ENTRY_HANDLED_FIELDS = [
    'id', 'headword', 'pos', 'gender', 'lemma_base', 'inflections_pl',
    'form_fem', 'form_masc', 'dual_form', 'diminutive_form',
    'paucal_form', 'augmentative_form',
    'is_collective', 'is_singulative', 'vowel_set_sg', 'vowel_set_pl',
    'vowel_set_opp', 'vowel_set_dual',
    'verb_class', 'verb_transitivity', 'verb_perfective_3sgm',
    'verb_imperfective_3sgm', 'verb_verbal_noun', 'verb_vowel_perf',
    'verb_vowel_impf', 'verb_vowel_impv', 'verb_active_ptcp', 'verb_passive_ptcp',
    'elative_form', 'participle_type', 'is_loanword',
    'numeral_type', 'form_attributive_short', 'form_attributive_long',
    'source_language', 'source_citation', 'definitions', 'etymology_chain',
    'phonetics', 'tags', 'cv_pattern', 'morph_pattern', 'sound_suffix',
    'lemma_pattern', 'form_fem_pattern', 'form_masc_pattern', 'form_plural_pattern', 'dual_pattern',
    'paucal_pattern', 'augmentative_pattern',
    'elative_pattern', 'diminutive_pattern',
    'synonyms', 'antonyms', 'related_entries', 'alternative_forms', 'created_at', 'updated_at',
    'root_consonants', 'verb_form', 'root_pattern_form_id', 'verb_weak_class', 'verb_type',
    'is_inflectable', 'usage_example', 'usage_example_en', 'old_id', 'zokk_morphology'
] as const;

export const ENTRY_PRIVATE_FIELDS = [
    '_rootConsonants', '_formLabel', '_hasDual', '_pluralType', '_adjPluralType', '_weakClass',
    '_sound_suffix', '_adj_sound_suffix', '_inheritedPattern', 'prefer_zokk'
] as const;

export const COMMON_FIELDS = [
    'id', 'headword', 'pos', 'is_loanword', 'source_language',
    'source_citation', 'definitions', 'etymology_chain', 'phonetics', 'tags',
    'synonyms', 'antonyms', 'related_entries', 'alternative_forms', 'is_inflectable',
    'usage_example', 'usage_example_en', 'root_consonants', 'cv_pattern', 'zokk_morphology'
];

export type EntryMorphologyMode = 'root' | 'stem';

export function resolveEntryMorphologyMode(form: any): EntryMorphologyMode {
    const rootConsonants = String(form?._rootConsonants || form?.root_consonants || '').trim();
    const zokkStem = String(form?.zokk_stem || '').trim();

    const hasRootConsonants = rootConsonants.length > 0;
    const hasZokkStem = zokkStem.length > 0;

    if (hasRootConsonants && hasZokkStem) {
        return form?.prefer_zokk ? 'stem' : 'root';
    }

    if (hasZokkStem) return 'stem';
    if (hasRootConsonants) return 'root';

    return form?.is_loanword ? 'stem' : 'root';
}

/** * Mapping POS to the Unified Database Columns.
 * UI will interpret 'lemma_base' as 'Singular' for Nouns and 'Masc' for Adjectives.
 */
export const POS_FEATURES: Record<string, string[]> = {
    'noun': [
        ...COMMON_FIELDS, 'gender', 'lemma_base', 'form_fem', 'form_masc',
        'inflections_pl', 'dual_form', 'diminutive_form', 'paucal_form', 'augmentative_form', 'is_collective',
        'is_singulative', 'morph_pattern', 'sound_suffix',
        'lemma_pattern', 'form_fem_pattern', 'form_masc_pattern', 'form_plural_pattern', 'dual_pattern',
        'paucal_pattern', 'augmentative_pattern',
        'diminutive_pattern',
        'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual'
    ],
    'verb': [
        ...COMMON_FIELDS, 'verb_class', 'verb_transitivity', 'verb_perfective_3sgm',
        'verb_imperfective_3sgm', 'verb_verbal_noun', 'verb_vowel_perf',
        'verb_vowel_impf', 'verb_vowel_impv', 'verb_active_ptcp', 'verb_passive_ptcp',
        'verb_form', 'verb_weak_class', 'verb_type'
    ],
    'adjective': [
        ...COMMON_FIELDS, 'gender', 'lemma_base', 'form_fem', 'form_masc', 'inflections_pl',
        'dual_form', 'diminutive_form', 'elative_form', 'morph_pattern', 'sound_suffix',
        'lemma_pattern', 'form_fem_pattern', 'form_masc_pattern', 'form_plural_pattern', 'dual_pattern',
        'elative_pattern', 'diminutive_pattern',
        'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual'
    ],
    'participle': [
        ...COMMON_FIELDS, 'gender', 'lemma_base', 'form_fem', 'form_masc', 'inflections_pl',
        'dual_form', 'diminutive_form', 'elative_form', 'participle_type', 'morph_pattern', 'sound_suffix',
        'lemma_pattern', 'form_fem_pattern', 'form_masc_pattern', 'form_plural_pattern', 'dual_pattern',
        'elative_pattern', 'diminutive_pattern',
        'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual'
    ],
    'pronoun': [
        ...COMMON_FIELDS, 'gender', 'lemma_base', 'form_fem', 'form_masc', 'inflections_pl',
        'lemma_pattern', 'form_fem_pattern', 'form_masc_pattern', 'form_plural_pattern', 'dual_pattern',
    ],
    'numeral': [
        ...COMMON_FIELDS, 'gender', 'lemma_base', 'inflections_pl', 'morph_pattern',
        'form_fem', 'form_masc', 'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual',
        'lemma_pattern', 'form_fem_pattern', 'form_masc_pattern', 'form_plural_pattern', 'dual_pattern',
        'numeral_type', 'form_attributive_short', 'form_attributive_long'
    ],
    'adverb': [
        ...COMMON_FIELDS
    ],
    'preposition': [
        ...COMMON_FIELDS
    ],
    'particle': [
        ...COMMON_FIELDS
    ],
    'article': [
        ...COMMON_FIELDS
    ],
    'interjection': [
        ...COMMON_FIELDS
    ],
    'conjunction': [
        ...COMMON_FIELDS
    ],
    'interrogative': [
        ...COMMON_FIELDS
    ],
};

const POS_WITH_NATIVE_VOWEL_SET_UI = new Set([
    'noun',
    'adjective',
    'participle',
    'numeral',
]);

export function entryPosHasNativeVowelSets(pos: string): boolean {
    return POS_WITH_NATIVE_VOWEL_SET_UI.has(String(pos || '').toLowerCase());
}

export const FORBIDDEN_FIELDS = [
    'id', 'created_at', 'updated_at', 'root_id', 'root_pattern_form_id'
] as const;

export function buildEntryPayload(form: any): Record<string, any> {
    const payload: Record<string, any> = {};
    const extraFields = form.extraFields || {};

    const pos = form.pos?.toLowerCase() || '';
    const allowedFields = new Set<string>(POS_FEATURES[pos] || COMMON_FIELDS);

    // UI-to-DB Logic Mapping
    const verbForm = form._formLabel;
    const rootConsonants = String(form._rootConsonants || form.root_consonants || '').trim();
    const verbWeakClass = form._weakClass || null;
    const zokkStem = String(form.zokk_stem || '').trim();
    const inferredIsLoanword = resolveEntryMorphologyMode(form) === 'stem';

    if (inferredIsLoanword && !entryPosHasNativeVowelSets(pos)) {
        ['vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual'].forEach(field => {
            allowedFields.add(field);
        });
    }

    const pluralRows = compactPluralRows(normalizePluralFormRows(
        form.plural_forms || form.inflections_pl,
        form.form_plural_pattern,
    )).filter(row => row.form);
    const pluralPatterns = pluralRows.map(row => row.pattern).filter(Boolean);
    const soundSuffix = pluralPatterns.filter((p: string) => p.startsWith('-')).join(', ');
    const morphPattern = pluralPatterns.filter((p: string) => !p.startsWith('-')).join(', ');

    // Fill payload using the allowed fields and normalization
    ENTRY_HANDLED_FIELDS.forEach(field => {
        if (allowedFields.has(field) || field === 'old_id') {
            payload[field] = form[field];
        }
    });

    // POS-specific manual overrides
    payload.verb_form = verbForm;
    payload.root_consonants = rootConsonants;
    payload.verb_weak_class = verbWeakClass;
    payload.sound_suffix = soundSuffix;
    payload.morph_pattern = morphPattern;
    payload.is_loanword = inferredIsLoanword;
    // form_plural_pattern is already in payload from handled fields

    // ── ZOKK MORPHOLOGY serialization ─────────────────────────────────────
    if (zokkStem) {
        payload.zokk_morphology = JSON.stringify({
            stem_string: zokkStem,
            class_type: form.zokk_class,
            is_hybrid: !!form.zokk_is_hybrid,
            root: rootConsonants || form.zokk_root || null,
            agentive_suffix: form.zokk_agentive_suffix || null
        });
    }

    // ── ACTIVE MIRRORING ───────────────────────────────────────────────────
    // The cv_pattern field always mirrors the current gender's primary slot
    if (form.gender?.toLowerCase() === 'feminine') {
        payload.cv_pattern = form.form_fem_pattern || '';
    } else {
        payload.cv_pattern = form.form_masc_pattern || '';
    }

    payload.inflections_pl = pluralRowsToLegacyForms(pluralRows);
    payload.form_plural_pattern = pluralRowsToLegacyPatternString(pluralRows);

    // Merge extraFields (passthrough unknown keys unchanged)
    Object.keys(extraFields).forEach(key => {
        const isPrivate = key.startsWith('_');
        const isForbidden = FORBIDDEN_FIELDS.includes(key as any);
        const isSchema = ENTRY_HANDLED_FIELDS.includes(key as any);

        if (!isPrivate && !isForbidden && !isSchema) {
            payload[key] = extraFields[key];
        }
    });

    // Normalization
    // Array-backed fields must stay arrays so the admin API can persist them
    // into the child tables / JSON columns it owns.
    const result: Record<string, any> = {};

    const arrayFields = new Set([
        'definitions',
        'phonetics',
        'etymology_chain',
        'synonyms',
        'antonyms',
        'related_entries',
        'alternative_forms',
        'tags',
        'inflections_pl',
    ]);

    const parseArrayField = (key: string, val: unknown) => {
        if (Array.isArray(val)) return val;
        if (typeof val !== 'string') return [];

        const trimmed = val.trim();
        if (!trimmed) return [];

        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
            } catch {
                return [];
            }
        }

        if (key === 'tags' || key === 'inflections_pl') {
            return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        }

        return [];
    };

    // Final pass through payload to normalize primitives and collections
    Object.keys(payload).forEach(key => {
        const val = payload[key];

        if (arrayFields.has(key)) {
            if (key === 'etymology_chain') {
                result[key] = normalizeEntryEtymologyChain(parseArrayField(key, val));
            } else if (key === 'definitions') {
                const normalizedDefinitions = normalizeEntryDefinitions(val).map(def => ({
                    text_en: String(def.text_en || '').trim(),
                    text_mt: String(def.text_mt || '').trim(),
                    register: String(def.register || '').trim(),
                    nuance: String(def.nuance || '').trim(),
                })).filter(def => def.text_en || def.text_mt || def.register || def.nuance);

                result[key] = normalizedDefinitions.length > 0
                    ? normalizedDefinitions
                    : [{ text_en: '', text_mt: '', register: '', nuance: '' }];
            } else {
                result[key] = parseArrayField(key, val);
            }
        } else if (typeof val === 'boolean') {
            result[key] = val ? 1 : 0;
        } else {
            result[key] = n(val);
        }
    });

    return result;
}

export function n(val: unknown): unknown {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}
