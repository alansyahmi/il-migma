/**
 * src/lib/adminSchema.ts
 * Refactored for Normalized Semitic Morphology.
 */

import type { RootFormData } from './adminUtils';

// ── ROOTS ───────────────────────────────────────────────────────────────────

export const ROOT_HANDLED_FIELDS = [
    'id', 'consonants', 'consonant_array', 'strength', 'weak_class',
    'gloss', 'etymology', 'source', 'notes', 'vowel_set_perf',
    'vowel_set_impf', 'vowel_set_imp', 'tags', 'synonyms', 'antonyms',
    'related_entries', 'created_at', 'updated_at', 'hidden_forms', 'is_imala_blocked'
] as const;

export function buildRootPayload(form: RootFormData): Record<string, any> {
    return {
        id: form.id,
        consonants: form.consonants.trim().toLowerCase(),
        strength: form.strength,
        weak_class: form.weak_class || '',
        gloss: JSON.stringify(form.glosses.filter(g => g.en || g.mt)),
        etymology: JSON.stringify(form.etymology),
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
    'is_collective', 'is_singulative', 'vowel_set_sg', 'vowel_set_pl',
    'vowel_set_opp', 'vowel_set_dual',
    'verb_class', 'verb_transitivity', 'verb_perfective_3sgm',
    'verb_imperfective_3sgm', 'verb_verbal_noun', 'verb_vowel_perf',
    'verb_vowel_impf', 'verb_vowel_impv', 'verb_active_ptcp', 'verb_passive_ptcp',
    'elative_form', 'participle_type', 'is_loanword',
    'numeral_type', 'form_attributive_short', 'form_attributive_long',
    'source_language', 'source_citation', 'definitions', 'etymology_chain',
    'phonetics', 'tags', 'cv_pattern', 'morph_pattern', 'sound_suffix',
    'synonyms', 'antonyms', 'related_entries', 'created_at', 'updated_at',
    'root_consonants', 'verb_form', 'root_pattern_form_id', 'verb_weak_class', 'verb_type',
    'is_inflectable', 'usage_example', 'usage_example_en'
] as const;

export const ENTRY_PRIVATE_FIELDS = [
    '_rootConsonants', '_formLabel', '_hasDual', '_pluralType', '_adjPluralType', '_weakClass',
    '_sound_suffix', '_adj_sound_suffix', '_inheritedPattern'
] as const;

export const COMMON_FIELDS = [
    'id', 'headword', 'pos', 'is_loanword', 'source_language',
    'source_citation', 'definitions', 'etymology_chain', 'phonetics', 'tags',
    'synonyms', 'antonyms', 'related_entries', 'is_inflectable',
    'usage_example', 'usage_example_en', 'root_consonants', 'cv_pattern'
];

/** * Mapping POS to the Unified Database Columns.
 * UI will interpret 'lemma_base' as 'Singular' for Nouns and 'Masc' for Adjectives.
 */
export const POS_FEATURES: Record<string, string[]> = {
    'noun': [
        ...COMMON_FIELDS, 'gender', 'lemma_base', 'form_fem', 'form_masc',
        'inflections_pl', 'dual_form', 'diminutive_form', 'is_collective',
        'is_singulative', 'morph_pattern', 'sound_suffix', 
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
        'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual'
    ],
    'participle': [
        ...COMMON_FIELDS, 'gender', 'lemma_base', 'form_fem', 'form_masc', 'inflections_pl',
        'dual_form', 'diminutive_form', 'elative_form', 'participle_type', 'morph_pattern',
        'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual'
    ],
    'pronoun': [...COMMON_FIELDS, 'gender', 'lemma_base', 'inflections_pl'],
    'numeral': [
        ...COMMON_FIELDS, 'gender', 'lemma_base', 'inflections_pl', 'morph_pattern',
        'form_fem', 'form_masc', 'vowel_set_sg', 'vowel_set_pl',
        'numeral_type', 'form_attributive_short', 'form_attributive_long'
    ],
};

export const FORBIDDEN_FIELDS = [
    'id', 'created_at', 'updated_at', 'root_id', 'root_pattern_form_id'
] as const;

export function buildEntryPayload(form: any): Record<string, any> {
    const payload: Record<string, any> = { ...form };
    const extraFields = form.extraFields || {};

    // Strip private fields
    ENTRY_PRIVATE_FIELDS.forEach(f => {
        delete payload[f];
    });

    const pos = form.pos?.toLowerCase() || '';
    const allowedFields = POS_FEATURES[pos] || COMMON_FIELDS;

    // UI-to-DB Logic Mapping
    payload.verb_form = form._formLabel;
    payload.root_consonants = form._rootConsonants;
    payload.verb_weak_class = form._weakClass || null;

    // Filter to only allowed fields
    Object.keys(payload).forEach(key => {
        if (!allowedFields.includes(key)) {
            delete payload[key];
        }
    });

    // Merge extraFields (passthrough unknown keys unchanged)
    // Guardrails: skip private fields, forbidden/system fields, and already handled schema fields
    Object.keys(extraFields).forEach(key => {
        const isPrivate = key.startsWith('_');
        const isForbidden = FORBIDDEN_FIELDS.includes(key as any);
        const isSchema = allowedFields.includes(key);

        if (!isPrivate && !isForbidden && !isSchema) {
            payload[key] = extraFields[key];
        }
    });

    // Serialization & Normalization
    payload.is_collective = form.is_collective ? 1 : 0;
    payload.is_singulative = form.is_singulative ? 1 : 0;
    payload.is_loanword = form.is_loanword ? 1 : 0;
    payload.is_inflectable = form.is_inflectable ? 1 : 0;

    // Ensure array consistency
    const toArray = (val: any) => typeof val === 'string'
        ? val.split(',').map(s => s.trim()).filter(Boolean)
        : (val || []);

    payload.tags = toArray(form.tags);
    payload.inflections_pl = toArray(payload.inflections_pl);

    // JSON fields
    const jsonFields = ['definitions', 'phonetics', 'etymology_chain', 'synonyms', 'antonyms', 'related_entries'];
    jsonFields.forEach(field => {
        payload[field] = form[field] || [];
    });

    return payload;
}

export function n(val: unknown): unknown {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}