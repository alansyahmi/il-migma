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
import { buildSourceCitation, type SourceMetadataLike } from './sourceMetadata.ts';
import {
    normalizePluralContract,
} from './pluralForms.ts';
import { isDashMarkedSuffix } from './suffixMatching.ts';
import { normalizeEntryPos } from './entryId.ts';
import { NOUN_MORPHOLOGY_DB_FIELD_KEYS, isNounLikePos, normalizeNounMorphologyInput } from './nounMorphology.ts';
import { ADJ_MORPHOLOGY_DB_FIELD_KEYS, isAdjLikePos, normalizeAdjMorphologyInput } from './adjMorphology.ts';
import { PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS, normalizeParticipleMorphologyInput } from './participleMorphology.ts';
import { VERB_MORPHOLOGY_DB_FIELD_KEYS, hasVerbMorphologyInput, normalizeVerbMorphologyInput } from './verbMorphology.ts';
import { NUMERAL_MORPHOLOGY_DB_FIELD_KEYS, normalizeNumeralMorphologyForEntry } from './numeralMorphology.ts';
import { resolveMainPatternByGenderForPos } from './gender.ts';
import { isHiddenTag } from './tagLabel.ts';
import { isFunctionWordInflectionPos, resolveEntryInflectableValue } from './inflectionState.ts';

export const ADJECTIVE_ENTRY_TOP_LEVEL_STRIP_FIELDS = new Set<string>([
    'morph_pattern',
    'sound_suffix',
    'is_inflectable',
    'pattern',
    'has_elative',
    'elative_form',
    'elative_pattern',
    'dual_form',
    'dual_pattern',
    'diminutive_form',
    'diminutive_pattern',
    'form_fem_pattern',
    'form_masc_pattern',
    'form_plural_pattern',
    'vowel_set_sg',
    'vowel_set_pl',
    'vowel_set_opp',
    'vowel_set_dual',
    'masculine_form',
    'feminine_form',
    'plural_form',
    'form_masc',
    'form_fem',
    'adjective_morphology',
]);

// ── ROOTS ───────────────────────────────────────────────────────────────────

export const ROOT_HANDLED_FIELDS = [
    'id', 'consonants', 'consonant_array', 'strength', 'weak_class',
    'gloss', 'etymology', 'source', 'notes', 'vowel_set_perf',
    'vowel_set_impf', 'vowel_set_imp', 'tags', 'synonyms', 'antonyms',
    'related_entries', 'created_at', 'updated_at', 'hidden_forms', 'is_imala_blocked'
] as const;

export function buildRootPayload(form: RootFormData): Record<string, unknown> {
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
        is_imala_blocked: !!form.is_imala_blocked,
    };
}

// ── STEMS ───────────────────────────────────────────────────────────────────

export const STEM_HANDLED_FIELDS = [
    'stem_string', 'class_type', 'is_hybrid', 'root', 'agentive_suffix',
    'tags', 'source', 'glosses', 'etymology', 'synonyms', 'antonyms', 'related_stems',
    'created_at', 'updated_at'
] as const;

export function buildStemPayload(form: StemFormData): Record<string, unknown> {
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

/**
 * - gender: Replaces noun_gender, adj_gender, participle_gender
 * - inflections_pl: Replaces noun_plural_forms, adj_plural
 * - form_fem: Replaces noun_feminine, adj_feminine
 */
export const ENTRY_HANDLED_FIELDS = [
    'id', 'headword', 'pos', 'gender', 'is_loanword', 'is_inflectable', 'has_inflection',
    'source_language',
    'source_display', 'source_tooltip',
    'definitions', 'etymology_chain', 'etymology_notes',
    'phonetics', 'tags', 'cv_pattern',
    'synonyms', 'antonyms', 'related_entries', 'alternative_forms', 'created_at', 'updated_at',
    'root_consonants', 'source_id',
    'source_citation', 'source_title', 'source_year', 'source_page', 'source_publisher',
    'verb_morphology', 'noun_morphology', 'adj_morphology', 'participle_morphology', 'numeral_morphology',
    'old_id', 'zokk_morphology', 'stem', 'zokk_class', 'zokk_is_hybrid', 'zokk_agentive_suffix',
    ...NOUN_MORPHOLOGY_DB_FIELD_KEYS,
    ...ADJ_MORPHOLOGY_DB_FIELD_KEYS,
    ...VERB_MORPHOLOGY_DB_FIELD_KEYS,
    ...PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS,
    ...NUMERAL_MORPHOLOGY_DB_FIELD_KEYS
] as const;

export const ENTRY_PRIVATE_FIELDS = [
    '_rootConsonants', '_rootVowelSetPerf', '_formLabel', '_hasDual', '_pluralType', '_adjPluralType', '_weakClass',
    '_sound_suffix', '_adj_sound_suffix', '_inheritedPattern', 'prefer_zokk'
] as const;

export const COMMON_FIELDS = [
    'id', 'headword', 'pos', 'is_loanword', 'source_language',
    'definitions', 'etymology_chain', 'etymology_notes', 'phonetics', 'tags', 'cv_pattern',
    'synonyms', 'antonyms', 'related_entries', 'alternative_forms',
    'root_consonants', 'source_id',
    'source_citation', 'source_title', 'source_year', 'source_page', 'source_publisher'
];

export type EntryMorphologyMode = 'root' | 'stem';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function resolveEntryMorphologyMode(form: Record<string, unknown>): EntryMorphologyMode {
    const rootConsonants = String(form._rootConsonants ?? form.root_consonants ?? '').trim();
    const zokkStem = String(form.zokk_stem ?? '').trim();

    const hasRootConsonants = rootConsonants.length > 0;
    const hasZokkStem = zokkStem.length > 0;

    if (hasRootConsonants && hasZokkStem) {
        return form.prefer_zokk ? 'stem' : 'root';
    }

    if (hasZokkStem) return 'stem';
    if (hasRootConsonants) return 'root';

    return form.is_loanword ? 'stem' : 'root';
}

/** * Mapping POS to the Unified Database Columns.
 * UI will interpret headword as 'Singular' for Nouns and 'Masc' for Adjectives.
 */
export const POS_FEATURES: Record<string, string[]> = {
    'noun': [
        ...COMMON_FIELDS, 'gender', ...NOUN_MORPHOLOGY_DB_FIELD_KEYS
    ],
    'verb': [
        ...COMMON_FIELDS, ...VERB_MORPHOLOGY_DB_FIELD_KEYS
    ],
    'adjective': [
        ...COMMON_FIELDS, 'gender', ...ADJ_MORPHOLOGY_DB_FIELD_KEYS
    ],
    'participle': [
        ...COMMON_FIELDS, 'gender', ...PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS
    ],
    'pronoun': [
        ...COMMON_FIELDS, 'gender', ...NOUN_MORPHOLOGY_DB_FIELD_KEYS
    ],
    'numeral': [
        ...COMMON_FIELDS, 'gender', ...NUMERAL_MORPHOLOGY_DB_FIELD_KEYS
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
};

const CV_PATTERN_MIRROR_POS = new Set([
    'noun',
    'adjective',
    'participle',
    'numeral',
]);

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
    'id', 'created_at', 'updated_at', 'root_id', 'root_pattern_form_id',
    'noun_gender', 'noun_singular', 'noun_plural', 'noun_plural_forms',
    'noun_sound_plural', 'noun_dual', 'noun_diminutive', 'noun_collective',
    'noun_singulative', 'noun_paucal', 'noun_augmentative',
    'noun_paucal_pattern', 'noun_augmentative_pattern', 'noun_feminine',
    'noun_masculine',
    'adjective_morphology',
    'lemma_pattern',
] as const;

const LEGACY_NOUN_ENTRY_FIELDS = [
    'singular',
    'plural',
    'dual',
    'diminutive',
    'collective',
    'singulative',
    'form_masc',
    'form_fem',
    'morph_pattern',
    'plural_pattern',
    'sound_suffix',
] as const;

export function buildEntryPayload(form: Record<string, unknown> & { extraFields?: Record<string, unknown> }): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    const extraFields = isPlainObject(form.extraFields) ? form.extraFields : {};

    const pos = normalizeEntryPos(form.pos) || String(form.pos ?? '').toLowerCase();
    const allowedFields = new Set<string>(POS_FEATURES[pos] || COMMON_FIELDS);

    // UI-to-DB Logic Mapping
    const verbForm = form._formLabel;
    const rootConsonants = String(form._rootConsonants ?? form.root_consonants ?? '').trim();
    const zokkStem = String(form.zokk_stem ?? '').trim();
    const inferredIsLoanword = resolveEntryMorphologyMode(form) === 'stem';

    if (inferredIsLoanword && !entryPosHasNativeVowelSets(pos)) {
        ['vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual'].forEach(field => {
            allowedFields.add(field);
        });
    }
    if (isFunctionWordInflectionPos(pos)) {
        allowedFields.add('is_inflectable');
    }

    const pluralContract = normalizePluralContract(
        form.plural_forms,
        form.form_plural_pattern,
        form.inflections_pl,
        form.form_plural_pattern,
    );
    // Sync computed plural data back to form so nested morphology normalizers see it
    form.inflections_pl = pluralContract.legacyForms;
    form.plural_forms = pluralContract.rows;
    form.form_plural_pattern = pluralContract.legacyPattern;

    const pluralPatterns = pluralContract.rows.map(row => row.pattern).filter(Boolean);
    const soundSuffix = pluralPatterns.filter((p: string) => isDashMarkedSuffix(p)).join(', ');
    const morphPattern = pluralPatterns.filter((p: string) => !isDashMarkedSuffix(p)).join(', ');

    // ── SMART PATTERN SYNC ──────────────────────────────────────────────────
    // Automatically populate the main pattern alias based on the entry's
    // default gender and the matching gender-specific pattern field.
    if (isAdjLikePos(pos)) {
        const mainPattern = resolveMainPatternByGenderForPos(form, pos);

        if (mainPattern) {
            form.pattern = mainPattern;
            form.morph_pattern = mainPattern;
            if (!String(form.cv_pattern || '').trim()) {
                form.cv_pattern = mainPattern;
            }
        }
    }

    // Fill payload using the allowed fields and normalization
    ENTRY_HANDLED_FIELDS.forEach(field => {
        if (allowedFields.has(field as string) || field === 'old_id') {
            payload[field as string] = form[field as string];
        }
    });

    // POS-specific manual overrides
    payload.pos = pos;
    payload.root_consonants = rootConsonants;
    payload.sound_suffix = soundSuffix;
    payload.morph_pattern = morphPattern;
    payload.is_loanword = inferredIsLoanword;
    if (isFunctionWordInflectionPos(pos)) {
        const inflectableValue = resolveEntryInflectableValue(form);
        if (inflectableValue !== undefined) {
            payload.is_inflectable = inflectableValue;
        }
    }
    const sourceMetadata: SourceMetadataLike = {
        source_citation: String(form.source_citation ?? ''),
        source_title: String(form.source_title ?? ''),
        source_year: String(form.source_year ?? ''),
        source_page: String(form.source_page ?? ''),
        source_publisher: String(form.source_publisher ?? ''),
        source_display: String(form.source_display ?? ''),
        source_tooltip: String(form.source_tooltip ?? ''),
    };
    payload.source_citation = buildSourceCitation(sourceMetadata);
    // form_plural_pattern is already in payload from handled fields

    const usageExamples = Array.isArray(form.usage_examples) ? form.usage_examples : [];
    const usageExampleEn = String(form.usage_example_en ?? '').trim();
    const usageExampleMt = String(form.usage_example ?? '').trim();
    if (usageExamples.length > 0 || Object.prototype.hasOwnProperty.call(form, 'usage_example') || Object.prototype.hasOwnProperty.call(form, 'usage_example_en')) {
        const normalizedUsageExamples = usageExamples.length > 0 ? usageExamples.map((example) => ({ ...example })) : [{}];
        const first = {
            ...(normalizedUsageExamples[0] || {}),
            text_en: usageExampleEn,
            text_mt: usageExampleMt || null,
        };
        normalizedUsageExamples[0] = first;
        payload.usage_examples = normalizedUsageExamples.filter((example, index) => (
            index > 0 || String(example.text_en ?? '').trim() || String(example.text_mt ?? '').trim()
        ));
    }

    if (pos === 'verb') {
        const nestedVerbMorphology = isPlainObject(form.verb_morphology) ? form.verb_morphology : {};
        const savedVerbClass = String(form.verb_class ?? nestedVerbMorphology.class ?? '').trim().toLowerCase();
        const verbWeakClass = savedVerbClass === 'weak'
            ? (form._weakClass || form.verb_weak_class)
            : '';
        const verbMorphologySource = {
            verb_morphology: form.verb_morphology,
            verb_class: form.verb_class,
            verb_weak_class: verbWeakClass,
            verb_transitivity: form.verb_transitivity,
            verb_perfective_3sgm: form.verb_perfective_3sgm,
            verb_imperfective_3sgm: form.verb_imperfective_3sgm,
            verb_verbal_noun: form.verb_verbal_noun,
            verb_active_ptcp: form.verb_active_ptcp,
            verb_passive_ptcp: form.verb_passive_ptcp,
            verb_vowel_perf: form.verb_vowel_perf,
            verb_vowel_impf: form.verb_vowel_impf,
            verb_vowel_impv: form.verb_vowel_impv,
            verb_form: verbForm,
            verb_type: form.verb_type,
            is_imala_blocked: form.is_imala_blocked,
        };

        payload.verb_morphology = normalizeVerbMorphologyInput(verbMorphologySource);
    } else if (hasVerbMorphologyInput(form)) {
        // Non-verb rows should never persist verb morphology; the server will
        // reject these if they arrive through a direct API call.
    }

    // Emit nested child-table payloads so the admin save path can rely on the
    // dedicated morphology tables even when the editor still uses flat fields.
    if (isNounLikePos(pos)) {
        payload.noun_morphology = normalizeNounMorphologyInput(form);
    }
    if (isAdjLikePos(pos)) {
        payload.adj_morphology = normalizeAdjMorphologyInput(form);
    }
    if (pos === 'participle') {
        payload.participle_morphology = normalizeParticipleMorphologyInput(form);
    }
    if (pos === 'numeral') {
        payload.numeral_morphology = normalizeNumeralMorphologyForEntry(form);
    }

    // Adjective and participle saves now keep only the canonical nested
    // morphology payload. Legacy flat aliases are stripped here and on the
    // server so they cannot leak back into writes.
    if (pos === 'adjective' || pos === 'participle') {
        const adjMorph = payload.adj_morphology as Record<string, unknown> | undefined;
        if (adjMorph) {
            payload.adj_morphology = adjMorph;
        }

        for (const field of ADJECTIVE_ENTRY_TOP_LEVEL_STRIP_FIELDS) {
            delete payload[field];
        }
    } else if (pos === 'numeral') {
        delete payload.lemma_pattern;
        delete payload.form_masc;
        delete payload.form_fem;
        delete payload.form_masc_pattern;
        delete payload.form_fem_pattern;
    }

    // ── ZOKK MORPHOLOGY serialization (Maintained for backward compatibility / migration) ────
    if (zokkStem) {
        payload.stem = zokkStem;
        payload.zokk_class = form.zokk_class;
        payload.zokk_is_hybrid = !!form.zokk_is_hybrid;
        payload.zokk_agentive_suffix = form.zokk_agentive_suffix || null;

        // Still emit JSON for now so the backend can backfill/migrate easily
        payload.zokk_morphology = JSON.stringify({
            stem_string: zokkStem,
            class_type: form.zokk_class,
            is_hybrid: !!form.zokk_is_hybrid,
            root: rootConsonants || form.zokk_root || null,
            agentive_suffix: form.zokk_agentive_suffix || null
        });
    }

    // ── CV PATTERN RESOLUTION ───────────────────────────────────────────────
    // Keep the direct cv_pattern when the UI has one, and only fall back to
    // legacy gendered pattern slots for entries that still mirror them.
    const directCvPattern = String(form.cv_pattern || '').trim();
    const mirroredCvPattern = CV_PATTERN_MIRROR_POS.has(pos)
        ? resolveMainPatternByGenderForPos(form, pos)
        : '';
    payload.cv_pattern = directCvPattern || mirroredCvPattern || '';

    payload.inflections_pl = pluralContract.legacyForms;
    if (pos !== 'adjective' && pos !== 'participle') {
        payload.form_plural_pattern = pluralContract.legacyPattern;
    } else {
        delete payload.form_plural_pattern;
    }

    if (isNounLikePos(pos)) {
        LEGACY_NOUN_ENTRY_FIELDS.forEach((field) => {
            payload[field] = null;
        });
    }

    // Merge extraFields (passthrough unknown keys unchanged)
    const forbiddenFields = new Set<string>(FORBIDDEN_FIELDS);
    const handledFields = new Set<string>(ENTRY_HANDLED_FIELDS as any);
    Object.keys(extraFields).forEach(key => {
        const isPrivate = key.startsWith('_');
        const isForbidden = forbiddenFields.has(key);
        const isSchema = handledFields.has(key);

        if (!isPrivate && !isForbidden && !isSchema) {
            payload[key] = extraFields[key];
        }
    });

    // Normalization
    // Array-backed fields must stay arrays so the admin API can persist them
    // into the child tables / JSON columns it owns.
    const result: Record<string, unknown> = {};

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

    const sanitizeTags = (val: unknown) => (
        parseArrayField('tags', val)
            .map((tag) => String(tag || '').trim())
            .filter(Boolean)
            .filter((tag) => !isHiddenTag(tag))
    );

    // Final pass through payload to normalize primitives and collections
    Object.keys(payload).forEach(key => {
        const val = payload[key];

        if (arrayFields.has(key)) {
            if (key === 'etymology_chain') {
                result[key] = normalizeEntryEtymologyChain(parseArrayField(key, val));
            } else if (key === 'definitions') {
                const normalizedDefinitions = normalizeEntryDefinitions(val).map(def => ({
                    text_en: String(def.text_en || '').trim(),
                    text_mt: def.text_mt == null ? null : String(def.text_mt).trim() || null,
                    register: String(def.register || '').trim(),
                    nuance: String(def.nuance || '').trim(),
                    example_sentences: Array.isArray(def.example_sentences) ? def.example_sentences : [],
                })).filter(def => def.text_en || def.text_mt || def.register || def.nuance);

                result[key] = normalizedDefinitions.length > 0
                    ? normalizedDefinitions
                    : [{ text_en: '', text_mt: null, register: '', nuance: '' }];
            } else if (key === 'usage_examples') {
                result[key] = parseArrayField(key, val);
            } else if (key === 'tags') {
                result[key] = sanitizeTags(val);
            } else {
                result[key] = parseArrayField(key, val);
            }
        } else if (typeof val === 'boolean') {
            result[key] = val ? 1 : 0;
        } else if (isPlainObject(val)) {
            result[key] = val;
        } else {
            result[key] = n(val);
        }
    });

    // Noun saves must not carry verb-only fields, even if the form still has
    // legacy values from older payloads or a previous edit state.
    if (pos !== 'verb') {
        VERB_MORPHOLOGY_DB_FIELD_KEYS.forEach((key) => {
            delete result[key];
        });
        delete result.verb_form;
        delete result.verb_class;
        delete result.verb_weak_class;
        delete result.verb_transitivity;
        delete result.verb_perfective_3sgm;
        delete result.verb_imperfective_3sgm;
        delete result.verb_verbal_noun;
        delete result.verb_active_ptcp;
        delete result.verb_passive_ptcp;
        delete result.verb_vowel_perf;
        delete result.verb_vowel_impf;
        delete result.verb_vowel_impv;
        delete result.verb_type;
        delete result.verb_morphology;
    }

    // Sync source_language from etymology_chain for precision
    const finalEty = result.etymology_chain;
    if (Array.isArray(finalEty) && finalEty.length > 0 && finalEty[0].language) {
        result.source_language = String(finalEty[0].language).trim();
    }

    return result;
}

export function n(val: unknown): unknown {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}
