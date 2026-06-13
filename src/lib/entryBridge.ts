/**
 * Shared bridge between admin form state, DB rows, and hydrated entry models.
 * Keeps legacy aliases working while normalizing the morphology contract.
 */

import { buildEntryPayload as buildAdminEntryPayload } from './adminSchema.ts';
import { compactPluralRows, normalizePluralFormRows, normalizePluralContract, pluralRowsToLegacyForms, pluralRowsToLegacyPatternString, type PluralFormRow } from './pluralForms.ts';
import { normalizeEntryDefinitions, normalizeEntryEtymologyChain, type EntryEtymology } from './adminUtils.ts';
import { normalizeEntryPos } from './entryId.ts';
import { resolveEntryGender } from './gender.ts';
import { NOUN_MORPHOLOGY_DB_FIELD_KEYS } from './nounMorphology.ts';
import { ADJ_MORPHOLOGY_DB_FIELD_KEYS, resolveAdjMasculineForm } from './adjMorphology.ts';
import { applyAdjMorphologyCompatibility } from './adjMorphology.ts';
import { applyNounMorphologyCompatibility } from './nounMorphology.ts';
import { applyNumeralMorphologyCompatibility } from './numeralMorphology.ts';
import { applyParticipleMorphologyCompatibility } from './participleMorphology.ts';
import { PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS } from './participleMorphology.ts';
import { NUMERAL_MORPHOLOGY_DB_FIELD_KEYS } from './numeralMorphology.ts';
import { applyVerbMorphologyCompatibility, VERB_MORPHOLOGY_DB_FIELD_KEYS } from './verbMorphology.ts';
import { isHiddenTag } from './tagLabel.ts';
import { isFunctionWordInflectionPos, resolveEntryInflectableValue } from './inflectionState.ts';

export const INITIAL_FORM_STATE = {
    id: '',
    headword: '',
    pos: 'noun',
    gender: 'masculine',
    inflections_pl: '',
    sound_suffix: '',
    dual_form: '',
    noun_type: '',
    diminutive_form: '',
    form_fem: '',
    form_masc: '',
    lemma_base: '',
    is_collective: false,
    is_singulative: false,
    is_inflectable_singular: false,
    is_inflectable_plural: false,
    is_inflectable: true,
    has_inflection: undefined as boolean | undefined,
    vowel_set_sg: '',
    vowel_set_pl: '',
    vowel_set_opp: '',
    vowel_set_dual: '',
    collective_form: '',
    singulative_form: '',
    verb_class: '',
    verb_type: '',
    verb_transitivity: '',
    verb_perfective_3sgm: '',
    verb_imperfective_3sgm: '',
    verb_verbal_noun: '',
    verb_vowel_perf: '',
    verb_vowel_impf: '',
    verb_vowel_impv: '',
    is_imala_blocked: undefined as boolean | number | string | undefined,
    verb_active_ptcp: '',
    verb_passive_ptcp: '',
    elative_form: '',
    has_elative: true,
    participle_type: '',
    verbal_form: '',
    is_loanword: false,
    source_language: '',
    source_citation: '',
    source_title: '',
    source_year: '',
    source_page: '',
    source_publisher: '',
    source_id: '',
    definitions: [
        { text_en: '', text_mt: '', register: '', nuance: '' }
    ],
    usage_example: '',
    usage_example_en: '',
    etymology_chain: [] as EntryEtymology[],
    etymology_notes: '',
    phonetics: [] as { dialect: string; spelling: string; ipa: string }[],
    tags: '',
    _formLabel: '',
    _rootConsonants: '',
    _rootVowelSetPerf: '',
    _weakClass: '',
    _hasDual: false,
    _pluralType: 'none' as 'none' | 'broken' | 'sound' | 'both',
    _adjPluralType: 'none' as 'none' | 'broken' | 'sound',
    cv_pattern: '',
    _inheritedPattern: '',
    form_fem_pattern: '',
    form_masc_pattern: '',
    form_plural_pattern: '',
    plural_forms: [] as PluralFormRow[],
    dual_pattern: '',
    paucal_form: '',
    augmentative_form: '',
    paucal_pattern: '',
    augmentative_pattern: '',
    elative_pattern: '',
    diminutive_pattern: '',
    diminutives: [] as any[],
    _sound_suffix: '',
    _adj_sound_suffix: '',
    _manualFormMasc: false,
    synonyms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    antonyms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    related_entries: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    alternative_forms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    numeral_type: '',
    form_attributive_short: '',
    form_attributive_short_pattern: '',
    form_attributive_long: '',
    numeral_ordinal: '',
    numeral_adverbial: '',
    numeral_fractional: '',
    numeral_multiplier: '',
    numeral_distributive: '',
    form_opposite: '',
    zokk_class: '' as 'ar' | 'ir' | '',
    zokk_stem: '',
    zokk_is_hybrid: false,
    zokk_root: '',
    prefer_zokk: false,
    zokk_agentive_suffix: '',
    extraFields: {} as Record<string, any>,
};

export type AdminForm = typeof INITIAL_FORM_STATE;

export const ENTRY_MORPHOLOGY_JOINS = `
LEFT JOIN verb_morphology vm ON vm.entry_id = e.id
LEFT JOIN noun_morphology nm ON nm.entry_id = e.id
LEFT JOIN adj_morphology am ON am.entry_id = e.id
LEFT JOIN participle_morphology pm ON pm.entry_id = e.id
LEFT JOIN numeral_morphology num ON num.entry_id = e.id
LEFT JOIN stems s ON e.stem = s.stem_string
LEFT JOIN lexical_sources ls ON e.source_id = ls.id
`;

export const ENTRY_MORPHOLOGY_SELECT = `
e.root_consonants AS root_consonants,
vm.form AS vm_form,
vm.class AS vm_class,
vm.weak_class AS vm_weak_class,
vm.transitivity AS vm_transitivity,
vm.perfective_3sgm AS vm_perfective_3sgm,
vm.imperfective_3sgm AS vm_imperfective_3sgm,
vm.verbal_noun AS vm_verbal_noun,
vm.active_participle AS vm_active_ptcp,
vm.passive_participle AS vm_passive_ptcp,
vm.vowel_set_perf AS vm_vowel_perf,
vm.vowel_set_impf AS vm_vowel_impf,
vm.vowel_set_impv AS vm_vowel_impv,
vm.type AS vm_type,
vm.is_imala_blocked AS vm_is_imala_blocked,
nm.gender AS nm_gender,
nm.noun_type AS nm_noun_type,
nm.verbal_form AS nm_verbal_form,
nm.singular_form AS nm_singular,
nm.plural_forms AS nm_plural_forms,
nm.sound_plural AS nm_sound_plural,
nm.dual_form AS nm_dual,
nm.diminutive_form AS nm_diminutive,
nm.collective_form AS nm_collective,
nm.singulative_form AS nm_singulative,
nm.paucal_form AS nm_paucal,
nm.augmentative_form AS nm_augmentative,
nm.paucal_pattern AS nm_paucal_pattern,
nm.augmentative_pattern AS nm_augmentative_pattern,
nm.feminine_form AS nm_feminine,
nm.masculine_form AS nm_masculine,
nm.is_collective AS nm_is_collective,
nm.is_singulative AS nm_is_singulative,
nm.is_inflectable_singular AS nm_is_inflectable_singular,
nm.is_inflectable_plural AS nm_is_inflectable_plural,
nm.morph_pattern AS nm_morph_pattern,
nm.vowel_set_sg AS nm_vowel_set_sg,
nm.vowel_set_pl AS nm_vowel_set_pl,
nm.vowel_set_opp AS nm_vowel_set_opp,
nm.vowel_set_dual AS nm_vowel_set_dual,
nm.form_plural_pattern AS nm_plural_pattern,
nm.form_fem_pattern AS nm_fem_pattern,
nm.form_masc_pattern AS nm_masc_pattern,
nm.dual_pattern AS nm_dual_pattern,
nm.diminutive_pattern AS nm_diminutive_pattern,
am.masculine_form AS am_masculine,
am.feminine_form AS am_feminine,
am.plural_form AS am_plural,
am.elative_form AS am_elative,
am.elative_pattern AS am_elative_pattern,
am.has_elative AS am_has_elative,
am.pattern AS am_pattern,
am.gender AS am_gender,
am.vowel_set_sg AS am_vowel_set_sg,
am.vowel_set_pl AS am_vowel_set_pl,
am.vowel_set_opp AS am_vowel_set_opp,
am.form_plural_pattern AS am_plural_pattern,
am.form_fem_pattern AS am_fem_pattern,
am.form_masc_pattern AS am_masc_pattern,
am.dual_form AS am_dual,
am.dual_pattern AS am_dual_pattern,
am.vowel_set_dual AS am_vowel_set_dual,
am.diminutive_form AS am_diminutive,
am.diminutive_pattern AS am_diminutive_pattern,
am.is_inflectable AS am_is_inflectable,
pm.type AS pm_type,
pm.gender AS pm_gender,
pm.verbal_form AS pm_verbal_form,
pm.form_plural_pattern AS pm_plural_pattern,
pm.form_fem_pattern AS pm_fem_pattern,
pm.form_masc_pattern AS pm_masc_pattern,
num.numeral_type AS num_type,
num.form_attributive_short AS num_attr_short,
num.form_attributive_short_pattern AS num_attr_short_pattern,
num.form_attributive_long AS num_attr_long,
num.ordinal_form AS num_ordinal,
num.adverbial_form AS num_adverbial,
num.fractional_form AS num_fractional,
num.multiplier_form AS num_multiplier,
num.distributive_form AS num_distributive,
num.vowel_set_sg AS num_vowel_set_sg,
num.vowel_set_pl AS num_vowel_set_pl,
num.vowel_set_opp AS num_vowel_set_opp,
num.vowel_set_dual AS num_vowel_set_dual,
num.form_plural_pattern AS num_plural_pattern,
num.plural_forms AS num_plural_forms,
(SELECT json_group_array(json_object(
    'id', r.target_entry_id, 
    'headword', t.headword, 
    'pos', t.pos,
    'numeral_type', tnum.numeral_type,
    'cv_pattern', COALESCE(t.cv_pattern, t.morph_pattern, tpat.cv_notation, tnm.morph_pattern, tam.pattern),
    'lemma_pattern', COALESCE(t.morph_pattern, t.cv_pattern, tnm.morph_pattern, tam.pattern, tpat.cv_notation),
    'form_masc_pattern', COALESCE(tnm.form_masc_pattern, tam.form_masc_pattern, tpm.form_masc_pattern),
    'form_fem_pattern', COALESCE(tnm.form_fem_pattern, tam.form_fem_pattern, tpm.form_fem_pattern),
    'form_plural_pattern', COALESCE(tnm.form_plural_pattern, tam.form_plural_pattern, tpm.form_plural_pattern, tnum.form_plural_pattern),
    'morph_pattern', COALESCE(t.morph_pattern, tnm.morph_pattern, tam.pattern, t.cv_pattern, tpat.cv_notation),
    'numeral_morphology', json_object(
        'numeral_type', tnum.numeral_type,
        'form_attributive_short_pattern', tnum.form_attributive_short_pattern,
        'form_plural_pattern', tnum.form_plural_pattern
    ),
    'gloss_en', json_extract(t.definitions, '$[0].text_en'),
    'gloss_mt', json_extract(t.definitions, '$[0].text_mt')
 )) 
 FROM entry_relationships r 
 JOIN entries t ON r.target_entry_id = t.id 
 LEFT JOIN root_pattern_forms trpf ON trpf.id = t.id
 LEFT JOIN patterns tpat ON tpat.id = trpf.pattern_id
 LEFT JOIN noun_morphology tnm ON tnm.entry_id = t.id
 LEFT JOIN adj_morphology tam ON tam.entry_id = t.id
 LEFT JOIN participle_morphology tpm ON tpm.entry_id = t.id
 LEFT JOIN numeral_morphology tnum ON tnum.entry_id = t.id
 WHERE r.entry_id = e.id AND r.relationship_type = 'synonym') AS rel_synonyms,
(SELECT json_group_array(json_object(
    'id', r.target_entry_id, 
    'headword', t.headword, 
    'pos', t.pos,
    'numeral_type', tnum.numeral_type,
    'cv_pattern', COALESCE(t.cv_pattern, t.morph_pattern, tpat.cv_notation, tnm.morph_pattern, tam.pattern),
    'lemma_pattern', COALESCE(t.morph_pattern, t.cv_pattern, tnm.morph_pattern, tam.pattern, tpat.cv_notation),
    'form_masc_pattern', COALESCE(tnm.form_masc_pattern, tam.form_masc_pattern, tpm.form_masc_pattern),
    'form_fem_pattern', COALESCE(tnm.form_fem_pattern, tam.form_fem_pattern, tpm.form_fem_pattern),
    'form_plural_pattern', COALESCE(tnm.form_plural_pattern, tam.form_plural_pattern, tpm.form_plural_pattern, tnum.form_plural_pattern),
    'morph_pattern', COALESCE(t.morph_pattern, tnm.morph_pattern, tam.pattern, t.cv_pattern, tpat.cv_notation),
    'numeral_morphology', json_object(
        'numeral_type', tnum.numeral_type,
        'form_attributive_short_pattern', tnum.form_attributive_short_pattern,
        'form_plural_pattern', tnum.form_plural_pattern
    ),
    'gloss_en', json_extract(t.definitions, '$[0].text_en'),
    'gloss_mt', json_extract(t.definitions, '$[0].text_mt')
 )) 
 FROM entry_relationships r 
 JOIN entries t ON r.target_entry_id = t.id 
 LEFT JOIN root_pattern_forms trpf ON trpf.id = t.id
 LEFT JOIN patterns tpat ON tpat.id = trpf.pattern_id
 LEFT JOIN noun_morphology tnm ON tnm.entry_id = t.id
 LEFT JOIN adj_morphology tam ON tam.entry_id = t.id
 LEFT JOIN participle_morphology tpm ON tpm.entry_id = t.id
 LEFT JOIN numeral_morphology tnum ON tnum.entry_id = t.id
 WHERE r.entry_id = e.id AND r.relationship_type = 'antonym') AS rel_antonyms,
(SELECT json_group_array(json_object(
    'id', r.target_entry_id, 
    'headword', t.headword, 
    'pos', t.pos,
    'numeral_type', tnum.numeral_type,
    'cv_pattern', COALESCE(t.cv_pattern, t.morph_pattern, tpat.cv_notation, tnm.morph_pattern, tam.pattern),
    'lemma_pattern', COALESCE(t.morph_pattern, t.cv_pattern, tnm.morph_pattern, tam.pattern, tpat.cv_notation),
    'form_masc_pattern', COALESCE(tnm.form_masc_pattern, tam.form_masc_pattern, tpm.form_masc_pattern),
    'form_fem_pattern', COALESCE(tnm.form_fem_pattern, tam.form_fem_pattern, tpm.form_fem_pattern),
    'form_plural_pattern', COALESCE(tnm.form_plural_pattern, tam.form_plural_pattern, tpm.form_plural_pattern, tnum.form_plural_pattern),
    'morph_pattern', COALESCE(t.morph_pattern, tnm.morph_pattern, tam.pattern, t.cv_pattern, tpat.cv_notation),
    'numeral_morphology', json_object(
        'numeral_type', tnum.numeral_type,
        'form_attributive_short_pattern', tnum.form_attributive_short_pattern,
        'form_plural_pattern', tnum.form_plural_pattern
    ),
    'gloss_en', json_extract(t.definitions, '$[0].text_en'),
    'gloss_mt', json_extract(t.definitions, '$[0].text_mt')
 )) 
 FROM entry_relationships r 
 JOIN entries t ON r.target_entry_id = t.id 
 LEFT JOIN root_pattern_forms trpf ON trpf.id = t.id
 LEFT JOIN patterns tpat ON tpat.id = trpf.pattern_id
 LEFT JOIN noun_morphology tnm ON tnm.entry_id = t.id
 LEFT JOIN adj_morphology tam ON tam.entry_id = t.id
 LEFT JOIN participle_morphology tpm ON tpm.entry_id = t.id
 LEFT JOIN numeral_morphology tnum ON tnum.entry_id = t.id
 WHERE r.entry_id = e.id AND r.relationship_type = 'related') AS rel_related,
(SELECT json_group_array(json_object(
    'id', a.id, 
    'target_id', a.id,
    'headword', a.headword, 
    'type', a.type,
    'gloss_en', json_extract(e.definitions, '$[0].text_en'),
    'gloss_mt', json_extract(e.definitions, '$[0].text_mt')
 )) 
 FROM alternative_forms a 
 WHERE a.entry_id = e.id) AS rel_alternative_forms,
(e.usage_examples) AS rel_usage_examples,
 (SELECT json_group_array(t.name) 
  FROM entry_tags et 
  JOIN tags t ON et.tag_id = t.id 
  WHERE et.entry_id = e.id) AS rel_tags,
ls.name AS source_name,
COALESCE(e.source_title, ls.full_title) AS source_full_title,
ls.author AS source_author,
COALESCE(e.source_year, ls.year) AS source_year,
COALESCE(e.source_publisher, ls.publisher) AS source_publisher,
ls.url AS source_url,
s.class_type AS s_class,
s.is_hybrid AS s_hybrid,
s.agentive_suffix AS s_suffix
`;

function parseList(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];

        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && typeof parsed === 'object') return [parsed];
            } catch {
                // Fall through.
            }
        }

        return trimmed.split(',').map((part) => part.trim()).filter(Boolean);
    }

    return [value];
}

function parseObject(value: unknown): Record<string, unknown> | undefined {
    if (!value) return undefined;
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== 'string') return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : undefined;
    } catch {
        return undefined;
    }
}

function parseJsonArray(value: unknown): unknown[] {
    return parseList(value);
}

function normalizeMeaningfulPluralRows(forms: unknown, patterns?: unknown): PluralFormRow[] {
    return normalizePluralContract(forms, patterns).rows;
}

function pickPluralRows(...sources: Array<{ forms?: unknown; patterns?: unknown }>): PluralFormRow[] {
    let firstPatternOnlyRows: PluralFormRow[] = [];

    for (const source of sources) {
        const rows = normalizeMeaningfulPluralRows(source.forms, source.patterns);
        if (rows.some(row => row.form.trim())) return rows;
        if (rows.length > 0 && firstPatternOnlyRows.length === 0) {
            firstPatternOnlyRows = rows;
        }
    }

    return firstPatternOnlyRows;
}

function firstNonEmptyText(...values: unknown[]): string {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

function deriveAdjectivePluralRows(row: Record<string, unknown>): PluralFormRow[] {
    const elative = firstNonEmptyText(
        row.elative_form,
        row.am_elative,
        row.adj_elative,
        (row.adjective_morphology as Record<string, unknown> | undefined)?.elative_form,
    ).toLowerCase();

    if (elative.startsWith('i') && elative.length > 1) {
        const derived = elative.slice(1).trim();
        const headword = firstNonEmptyText(
            row.headword,
            row.form_masc,
            row.am_masculine,
            row.adj_masculine,
            row.masculine_form,
        ).toLowerCase();

        if (derived && derived !== headword) {
            return [{ form: derived, pattern: '' }];
        }
    }

    return [];
}

function buildVerbSource(row: Record<string, unknown>) {
    return {
        form: row.vm_form,
        class: row.vm_class,
        weak_class: row.vm_weak_class,
        transitivity: row.vm_transitivity,
        perfective_3sgm: row.vm_perfective_3sgm,
        imperfective_3sgm: row.vm_imperfective_3sgm,
        verbal_noun: row.vm_verbal_noun,
        active_participle: row.vm_active_ptcp,
        passive_participle: row.vm_passive_ptcp,
        vowel_set_perf: row.vm_vowel_perf,
        vowel_set_impf: row.vm_vowel_impf,
        vowel_set_impv: row.vm_vowel_impv,
        type: row.vm_type,
        is_imala_blocked: row.vm_is_imala_blocked,
    };
}

function buildNounSource(row: Record<string, unknown>) {
    const pluralRows = pickPluralRows(
        { forms: row.nm_plural_forms, patterns: row.nm_plural_pattern },
        { forms: row.plural_forms, patterns: row.form_plural_pattern },
        { forms: row.inflections_pl, patterns: row.form_plural_pattern },
    );
    return {
        pos: row.pos || 'noun',
        gender: row.nm_gender || row.gender,
        noun_type: row.nm_noun_type || row.noun_type,
        verbal_form: row.nm_verbal_form || row.verbal_form,
        singular_form: row.nm_singular,
        plural_forms: pluralRows.length > 0 ? pluralRows : row.nm_plural_forms,
        sound_plural: row.nm_sound_plural,
        dual_form: row.nm_dual,
        diminutive_form: row.nm_diminutive,
        collective_form: row.nm_collective,
        singulative_form: row.nm_singulative,
        paucal_form: row.nm_paucal,
        augmentative_form: row.nm_augmentative,
        paucal_pattern: row.nm_paucal_pattern,
        augmentative_pattern: row.nm_augmentative_pattern,
        feminine_form: row.nm_feminine || row.form_fem || row.adj_feminine,
        masculine_form: row.nm_masculine || row.form_masc || row.adj_masculine,
        form_masc: row.nm_masculine || row.form_masc || row.adj_masculine,
        form_fem: row.nm_feminine || row.form_fem || row.adj_feminine,
        is_collective: row.nm_is_collective,
        is_singulative: row.nm_is_singulative,
        is_inflectable_singular: row.nm_is_inflectable_singular,
        is_inflectable_plural: row.nm_is_inflectable_plural,
        morph_pattern: row.nm_morph_pattern,
        vowel_set_sg: row.nm_vowel_set_sg,
        vowel_set_pl: row.nm_vowel_set_pl,
        vowel_set_opp: row.nm_vowel_set_opp,
        vowel_set_dual: row.nm_vowel_set_dual,
        form_plural_pattern: pluralRowsToLegacyPatternString(pluralRows) || row.nm_plural_pattern,
        form_fem_pattern: row.nm_fem_pattern,
        form_masc_pattern: row.nm_masc_pattern,
        dual_pattern: row.nm_dual_pattern,
        diminutive_pattern: row.nm_diminutive_pattern,
    };
}

function buildAdjSource(row: Record<string, unknown>) {
    const pluralRows = pickPluralRows(
        { forms: row.inflections_pl, patterns: row.form_plural_pattern },
        { forms: row.plural_forms, patterns: row.form_plural_pattern },
        { forms: row.am_plural, patterns: row.am_plural_pattern || row.form_plural_pattern },
        { forms: row.adj_plural, patterns: row.adj_plural_pattern || row.form_plural_pattern },
    );
    const pluralFallbackRows = pluralRows.length > 0 ? pluralRows : deriveAdjectivePluralRows(row);
    const masculineForm = resolveAdjMasculineForm(row);
    return {
        pos: row.pos || 'adjective',
        masculine_form: masculineForm,
        feminine_form: row.am_feminine || row.form_fem || row.adj_feminine,
        form_masc: masculineForm,
        form_fem: row.am_feminine || row.form_fem || row.adj_feminine,
        plural_form: pluralFallbackRows,
        elative_form: row.am_elative || row.adj_elative || row.elative_form,
        elative_pattern: row.am_elative_pattern || row.elative_pattern,
        has_elative: row.am_has_elative === undefined || row.am_has_elative === null ? undefined : Boolean(row.am_has_elative),
        pattern: row.cv_pattern || row.am_pattern || row.adj_pattern,
        gender: row.am_gender || row.gender || row.adj_gender,
        vowel_set_sg: row.am_vowel_set_sg,
        vowel_set_pl: row.am_vowel_set_pl,
        vowel_set_opp: row.am_vowel_set_opp,
        vowel_set_dual: row.am_vowel_set_dual || row.vowel_set_dual,
        form_plural_pattern: pluralRowsToLegacyPatternString(pluralRows) || row.am_plural_pattern || row.form_plural_pattern,
        form_fem_pattern: row.am_fem_pattern,
        form_masc_pattern: row.am_masc_pattern,
        diminutive_form: row.am_diminutive || row.adj_diminutive || row.diminutive_form,
        diminutive_pattern: row.am_diminutive_pattern || row.diminutive_pattern,
        diminutives: row.am_diminutives || row.diminutives || [],
        dual_form: row.am_dual || row.dual_form,
        dual_pattern: row.am_dual_pattern || row.dual_pattern,
        is_inflectable: row.am_is_inflectable !== undefined ? Boolean(row.am_is_inflectable) : undefined,
        synonyms: row.rel_synonyms || row.synonyms || [],
        antonyms: row.rel_antonyms || row.antonyms || [],
        related_entries: row.rel_related || row.related_entries || [],
        source_citation: row.source_citation || row.source_name || row.source_full_title,
        source_title: row.source_title || row.source_full_title,
        source_year: row.source_year,
        source_page: row.source_page,
        source_publisher: row.source_publisher,
        source_display: row.source_display || row.source_name,
        source_tooltip: row.source_tooltip,
    };
}

function buildNumeralSource(row: Record<string, unknown>) {
    return {
        numeral_type: row.numeral_type ?? row.num_type,
        form_attributive_short: row.num_attr_short ?? row.form_attributive_short,
        form_attributive_short_pattern: row.num_attr_short_pattern ?? row.form_attributive_short_pattern,
        form_attributive_long: row.num_attr_long ?? row.form_attributive_long,
        ordinal_form: row.num_ordinal ?? row.ordinal_form ?? row.numeral_ordinal,
        adverbial_form: row.num_adverbial ?? row.adverbial_form ?? row.numeral_adverbial,
        fractional_form: row.num_fractional ?? row.fractional_form ?? row.numeral_fractional,
        multiplier_form: row.num_multiplier ?? row.multiplier_form ?? row.numeral_multiplier,
        distributive_form: row.num_distributive ?? row.distributive_form ?? row.numeral_distributive,
        vowel_set_sg: row.num_vowel_set_sg ?? row.vowel_set_sg,
        vowel_set_pl: row.num_vowel_set_pl ?? row.vowel_set_pl,
        vowel_set_opp: row.num_vowel_set_opp ?? row.vowel_set_opp,
        vowel_set_dual: row.num_vowel_set_dual ?? row.vowel_set_dual,
        form_plural_pattern: row.num_plural_pattern ?? row.form_plural_pattern,
        plural_forms: row.num_plural_forms ?? row.plural_forms,
    };
}

function buildParticipleSource(row: Record<string, unknown>) {
    return {
        type: row.pm_type,
        gender: row.pm_gender,
        verbal_form: row.pm_verbal_form || row.verbal_form,
        form_plural_pattern: row.pm_plural_pattern,
        form_fem_pattern: row.pm_fem_pattern,
        form_masc_pattern: row.pm_masc_pattern,
    };
}

function deriveInflections(row: Record<string, unknown>, pos: string) {
    if (pos === 'noun') {
        return pickPluralRows(
            { forms: row.nm_plural_forms, patterns: row.nm_plural_pattern },
            { forms: row.plural_forms, patterns: row.form_plural_pattern },
            { forms: row.inflections_pl, patterns: row.form_plural_pattern },
        );
    }
    if (pos === 'adjective' || pos === 'participle') {
        const pluralRows = pickPluralRows(
            { forms: row.inflections_pl, patterns: row.form_plural_pattern },
            { forms: row.plural_forms, patterns: row.form_plural_pattern },
            { forms: row.am_plural, patterns: row.am_plural_pattern || row.form_plural_pattern },
            { forms: row.adj_plural, patterns: row.adj_plural_pattern || row.form_plural_pattern },
        );
        return pluralRows.length > 0 ? pluralRows : deriveAdjectivePluralRows(row);
    }
    if (pos === 'numeral') {
        return pickPluralRows(
            { forms: row.num_plural_forms, patterns: row.num_plural_pattern },
            { forms: row.plural_forms, patterns: row.form_plural_pattern },
            { forms: row.inflections_pl, patterns: row.form_plural_pattern },
        );
    }
    return pickPluralRows({ forms: row.inflections_pl, patterns: row.form_plural_pattern });
}

export function entryToForm(entry: any, initialFormOverrides: Partial<AdminForm> = {}): AdminForm {
    const form = { ...INITIAL_FORM_STATE, ...initialFormOverrides };
    if (!entry) return form;

    const full = entry;
    const pos = normalizeEntryPos(full.pos || form.pos || 'noun');
    form.pos = pos;

    Object.keys(form).forEach((key) => {
        if (full[key] !== undefined && full[key] !== null) {
            (form as any)[key] = full[key];
        }
    });
    form.pos = pos;

    const morphMapEntries: Array<[string, readonly string[]]> = pos === 'adjective'
        ? [
            ['adj_morphology', ADJ_MORPHOLOGY_DB_FIELD_KEYS],
            ['adjective_morphology', ADJ_MORPHOLOGY_DB_FIELD_KEYS],
            ['participle_morphology', PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS],
            ['numeral_morphology', NUMERAL_MORPHOLOGY_DB_FIELD_KEYS],
            ['verb_morphology', VERB_MORPHOLOGY_DB_FIELD_KEYS],
        ]
        : pos === 'noun'
            ? [
                ['noun_morphology', NOUN_MORPHOLOGY_DB_FIELD_KEYS],
                ['adj_morphology', ADJ_MORPHOLOGY_DB_FIELD_KEYS],
                ['adjective_morphology', ADJ_MORPHOLOGY_DB_FIELD_KEYS],
                ['participle_morphology', PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS],
                ['numeral_morphology', NUMERAL_MORPHOLOGY_DB_FIELD_KEYS],
                ['verb_morphology', VERB_MORPHOLOGY_DB_FIELD_KEYS],
            ]
            : pos === 'participle'
                ? [
                    ['participle_morphology', PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS],
                    ['adj_morphology', ADJ_MORPHOLOGY_DB_FIELD_KEYS],
                    ['adjective_morphology', ADJ_MORPHOLOGY_DB_FIELD_KEYS],
                    ['noun_morphology', NOUN_MORPHOLOGY_DB_FIELD_KEYS],
                    ['verb_morphology', VERB_MORPHOLOGY_DB_FIELD_KEYS],
                    ['numeral_morphology', NUMERAL_MORPHOLOGY_DB_FIELD_KEYS],
                ]
            : [
                ['verb_morphology', VERB_MORPHOLOGY_DB_FIELD_KEYS],
                ['noun_morphology', NOUN_MORPHOLOGY_DB_FIELD_KEYS],
                ['adj_morphology', ADJ_MORPHOLOGY_DB_FIELD_KEYS],
                ['adjective_morphology', ADJ_MORPHOLOGY_DB_FIELD_KEYS],
                ['participle_morphology', PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS],
                ['numeral_morphology', NUMERAL_MORPHOLOGY_DB_FIELD_KEYS],
            ];

    morphMapEntries.forEach(([morphKey, fields]) => {
        const morphObj = full[morphKey];
        fields.forEach((field) => {
            if (field in form) {
                const val = (morphObj && morphObj[field] !== undefined && morphObj[field] !== null)
                    ? morphObj[field]
                    : (full[field] !== undefined && full[field] !== null ? full[field] : undefined);

                if (val !== undefined) {
                    (form as any)[field] = field === 'has_elative' ? Boolean(val) : val;
                }
            }
        });
    });

    const aliasMap: Record<string, string | string[]> = {
        participle_type: ['type', 'participle_type'],
        form_fem: ['feminine_form', 'feminine'],
        form_masc: ['masculine_form', 'masculine'],
        form_attributive_short: ['num_attr_short', 'form_attributive_short'],
        form_attributive_long: ['num_attr_long', 'form_attributive_long'],
        form_attributive_short_pattern: ['num_attr_short_pattern', 'form_attributive_short_pattern'],
        numeral_type: ['num_type', 'numeral_type'],
        numeral_ordinal: ['num_ordinal', 'ordinal_form'],
        numeral_adverbial: ['num_adverbial', 'adverbial_form'],
        numeral_fractional: ['num_fractional', 'fractional_form'],
        numeral_multiplier: ['num_multiplier', 'multiplier_form'],
        numeral_distributive: ['num_distributive', 'distributive_form'],
        _rootConsonants: ['root_consonants', 'resolved_root_consonants'],
        verb_class: ['class', 'verb_class'],
        _weakClass: ['weak_class', 'verb_weak_class'],
        _formLabel: ['form', 'verb_form'],
        verb_type: ['type', 'verb_type'],
        verb_transitivity: ['transitivity', 'verb_transitivity'],
        verb_perfective_3sgm: ['perfective_3sgm', 'verb_perfective_3sgm', 'perfective_3sg_m'],
        verb_imperfective_3sgm: ['imperfective_3sgm', 'verb_imperfective_3sgm', 'imperfective_3sg_m'],
        verb_verbal_noun: ['verbal_noun', 'verb_verbal_noun'],
        verb_active_ptcp: ['active_participle', 'verb_active_ptcp'],
        verb_passive_ptcp: ['passive_participle', 'verb_passive_ptcp'],
        verb_vowel_perf: ['vowel_set_perf', 'verb_vowel_perf', 'vowel_set_perfect'],
        verb_vowel_impf: ['vowel_set_impf', 'verb_vowel_impf', 'vowel_set_imperfect'],
        verb_vowel_impv: ['vowel_set_impv', 'verb_vowel_impv', 'vowel_set_imperative'],
        is_imala_blocked: ['is_imala_blocked', 'verb_is_imala_blocked'],
    };

    Object.entries(aliasMap).forEach(([formKey, dbKeys]) => {
        const keys = Array.isArray(dbKeys) ? dbKeys : [dbKeys];
        for (const dbKey of keys) {
            for (const [morphKey] of morphMapEntries) {
                if (full[morphKey] && full[morphKey][dbKey] !== undefined && full[morphKey][dbKey] !== null) {
                    (form as any)[formKey] = full[morphKey][dbKey];
                    return;
                }
            }
            if (full[dbKey] !== undefined && full[dbKey] !== null) {
                (form as any)[formKey] = full[dbKey];
                return;
            }
        }
    });

    const parseArray = (val: any) => {
        if (typeof val === 'string' && val.trim().startsWith('[')) {
            try { return JSON.parse(val); } catch { return []; }
        }
        return Array.isArray(val) ? val : [];
    };

    const parseBooleanLike = (value: any) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value === 1;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
        }
        return false;
    };

    const nounMorphology = full.noun_morphology || {};
    const hasSplitInflectableFlags =
        Object.prototype.hasOwnProperty.call(nounMorphology, 'is_inflectable_singular') ||
        Object.prototype.hasOwnProperty.call(nounMorphology, 'is_inflectable_plural') ||
        Object.prototype.hasOwnProperty.call(full, 'is_inflectable_singular') ||
        Object.prototype.hasOwnProperty.call(full, 'is_inflectable_plural');

    const rawPluralForms =
        pos === 'noun'
            ? (
                full.noun_morphology?.plural_forms ??
                full.noun_morphology?.plural_form ??
                full.plural_forms ??
                full.inflections_pl
            )
            : pos === 'adjective'
                ? (
                    full.adj_morphology?.plural_form ??
                    full.adjective_morphology?.plural_form ??
                    full.adj_morphology?.plural ??
                    full.adjective_morphology?.plural ??
                    full.plural_forms ??
                    full.inflections_pl
                )
                : (
                    full.adj_morphology?.plural_form ??
                    full.adjective_morphology?.plural_form ??
                    full.adj_morphology?.plural ??
                    full.adjective_morphology?.plural ??
                    full.plural_forms ??
                    full.inflections_pl
                );
    const pluralPatternInput = full.form_plural_pattern || full.noun_morphology?.form_plural_pattern || full.adj_morphology?.form_plural_pattern;
    const hasPluralInput = !!(
        (typeof rawPluralForms === 'string' ? rawPluralForms.trim() : rawPluralForms) ||
        (typeof pluralPatternInput === 'string' ? pluralPatternInput.trim() : pluralPatternInput)
    );
    const pluralRows = hasPluralInput ? compactPluralRows(normalizePluralFormRows(
        rawPluralForms,
        pluralPatternInput,
    )) : [];
    (form as any).plural_forms = hasPluralInput ? pluralRows : undefined;
    form.inflections_pl = pluralRowsToLegacyForms(pluralRows).join(', ');

    const raw_sound = pos === 'noun'
        ? (full.noun_morphology?.sound_plural || full.sound_plural || '')
        : (full.sound_suffix || full.adj_morphology?.sound_plural || full.adjective_morphology?.sound_plural || '');
    const raw_morph = pos === 'noun'
        ? (full.noun_morphology?.morph_pattern || full.morph_pattern || '')
        : (full.morph_pattern || full.adj_morphology?.morph_pattern || full.adjective_morphology?.morph_pattern || '');
    const plurals = pluralRowsToLegacyPatternString(pluralRows) || [raw_morph, raw_sound].filter(Boolean).join(', ');

    const hasBroken = pluralRows.some(row => row.form);
    const hasSound = raw_sound?.length > 0;
    form._pluralType = (hasBroken && hasSound) ? 'both' : hasBroken ? 'broken' : hasSound ? 'sound' : 'none';
    form._adjPluralType = (pos === 'adjective' && hasBroken) ? (plurals ? 'broken' : 'sound') : 'none';

    form.gender = resolveEntryGender(full) || form.gender;

    if (pos === 'noun') {
        if (hasSplitInflectableFlags) {
            form.is_inflectable_singular = parseBooleanLike(
                nounMorphology.is_inflectable_singular ?? full.is_inflectable_singular ?? form.is_inflectable_singular,
            );
            form.is_inflectable_plural = parseBooleanLike(
                nounMorphology.is_inflectable_plural ?? full.is_inflectable_plural ?? form.is_inflectable_plural,
            );
        }
    }

    if (isFunctionWordInflectionPos(pos)) {
        const inflectableValue = resolveEntryInflectableValue(full);
        if (inflectableValue !== undefined) {
            form.is_inflectable = parseBooleanLike(inflectableValue);
        }
    }

    const hasZokkMorphology = !!full.zokk_morphology;
    form.is_loanword = full.is_loanword === undefined || full.is_loanword === null || full.is_loanword === ''
        ? hasZokkMorphology
        : parseBooleanLike(full.is_loanword);

    form.definitions = normalizeEntryDefinitions(parseArray(full.definitions)).map(def => ({ ...def, text_mt: def.text_mt ?? '' }));
    form.phonetics = parseArray(full.phonetics).map((p: any) => ({ dialect: p.dialect || 'Standard', spelling: p.spelling || '', ipa: p.ipa || '' }));
    form.etymology_chain = parseArray(full.etymology_chain).length ? normalizeEntryEtymologyChain(parseArray(full.etymology_chain)) : [];
    const rawTags = Array.isArray(full.tags)
        ? full.tags
        : (typeof full.tags === 'string' && full.tags.startsWith('[') ? parseArray(full.tags) : (typeof full.tags === 'string' ? full.tags.split(',') : []));
    const normalizedTags = rawTags
        .map((tag: any) => String(tag || '').trim())
        .filter(Boolean);
    const hiddenTagSet = new Set(normalizedTags.filter((tag: string) => isHiddenTag(tag)).map((tag: string) => tag.toLowerCase()));
    if (hiddenTagSet.size > 0) {
        form.has_elative = false;
    }
    form.tags = normalizedTags.filter((tag: string) => !isHiddenTag(tag)).join(', ');

    const relatedAll = parseArray(full.related_entries);
    form.related_entries = relatedAll.filter((item: any) => !isAlternativeRelation(item));
    const directAlternatives = parseArray(full.alternative_forms);
    const fallbackAlternatives = relatedAll.filter((item: any) => isAlternativeRelation(item));
    form.alternative_forms = directAlternatives.length > 0 ? directAlternatives : fallbackAlternatives;

    const zokk = (() => {
        if (!full.zokk_morphology) return null;
        try { return typeof full.zokk_morphology === 'string' ? JSON.parse(full.zokk_morphology) : full.zokk_morphology; } catch { return null; }
    })();
    form.zokk_class = full.zokk_class || zokk?.class_type || '';
    form.zokk_stem = full.stem || zokk?.stem_string || '';
    form.zokk_is_hybrid = typeof full.zokk_is_hybrid === 'number' ? full.zokk_is_hybrid === 1 : (typeof full.zokk_is_hybrid === 'boolean' ? full.zokk_is_hybrid : !!zokk?.is_hybrid);
    form.zokk_root = full.root_consonants || zokk?.root || full.resolved_root_consonants || '';
    form.zokk_agentive_suffix = full.zokk_agentive_suffix || zokk?.agentive_suffix || '';
    form.prefer_zokk = form.is_loanword;
    form._rootConsonants = full.resolved_root_consonants || full.root_consonants || '';

    form.extraFields = {};
    Object.keys(full).forEach(key => {
        if (!(key in INITIAL_FORM_STATE) && !key.startsWith('_')) {
            form.extraFields[key] = full[key];
        }
    });

    return form;
}

export function buildLoadedEntryPatch(full: any, _prev: AdminForm): Partial<AdminForm> {
    if (!full) return {};
    const fullForm = entryToForm(full, {});
    const patch: Partial<AdminForm> = {};
    (patch as any)._manualFormMasc = false;

    const coreFields = ['id', 'headword', 'pos', 'gender', 'definitions', 'phonetics', 'tags', 'is_loanword', 'is_inflectable_singular', 'is_inflectable_plural', 'is_inflectable'];

    Object.keys(fullForm).forEach(key => {
        const val = (fullForm as any)[key];
        if (coreFields.includes(key) || (val !== undefined && val !== null && val !== '')) {
            (patch as any)[key] = val;
        }
    });

    return patch;
}

export function formToPayload(form: AdminForm): Record<string, any> {
    const normalizedPluralRows = normalizePluralContract(
        (form as any).plural_forms,
        form.form_plural_pattern,
        form.inflections_pl,
        form.form_plural_pattern,
    ).rows;

    return buildAdminEntryPayload({
        ...form,
        related_entries: Array.isArray(form.related_entries) ? form.related_entries : [],
        plural_forms: normalizedPluralRows,
        alternative_forms: Array.isArray((form as any).alternative_forms)
            ? (form as any).alternative_forms.map((item: any) => ({ ...item, relation_kind: 'alternative_form' }))
            : [],
    });
}

export function hydrateEntryRow(row: Record<string, unknown> | undefined | null) {
    if (!row) return row;

    const payload: Record<string, unknown> = {
        ...Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)),
    };

    payload.tags = parseJsonArray(row.rel_tags || row.tags);
    payload.definitions = parseJsonArray(row.definitions);
    payload.synonyms = parseJsonArray(row.rel_synonyms || row.synonyms);
    payload.antonyms = parseJsonArray(row.rel_antonyms || row.antonyms);
    payload.related_entries = parseJsonArray(row.rel_related || row.related_entries);
    payload.alternative_forms = parseJsonArray(row.rel_alternative_forms || row.alternative_forms).map((alt: any) => {
        if (alt && typeof alt === 'object' && alt.id && alt.id.includes('::')) {
            const parts = alt.id.split('::');
            const targetId = parts[1];
            return {
                ...alt,
                id: targetId,
                target_id: targetId
            };
        }
        return alt;
    });
    payload.usage_examples = parseJsonArray(row.usage_examples || row.rel_usage_examples);
    payload.etymology_chain = parseJsonArray(row.etymology_chain);
    const firstUsageExample = Array.isArray(payload.usage_examples) ? payload.usage_examples[0] as Record<string, unknown> | undefined : undefined;
    payload.usage_example = firstUsageExample?.text_mt == null ? '' : String(firstUsageExample.text_mt).trim();
    payload.usage_example_en = firstUsageExample?.text_en == null ? '' : String(firstUsageExample.text_en).trim();

    if (row.cv_notation || row.wizen_notation || row.pattern_id || row.derived_form) {
        payload.root_pattern_form = {
            id: row.id,
            derived_form: row.derived_form,
            pattern: {
                id: row.pattern_id,
                cv_notation: row.cv_notation,
                wizen_notation: row.wizen_notation
            }
        };
    }

    if (row.source_id || row.source_name) {
        payload.lexical_source = {
            id: row.source_id,
            name: row.source_name,
            full_title: row.source_full_title,
            author: row.source_author,
            year: row.source_year,
            publisher: row.source_publisher,
            url: row.source_url
        };
    }

    const zokkFromCols = row.stem ? {
        stem: row.stem,
        zokk_class: row.s_class || row.zokk_class,
        zokk_is_hybrid: (row.s_hybrid === 1 || row.s_hybrid === true) || (row.zokk_is_hybrid === 1 || row.zokk_is_hybrid === true),
        root_consonants: row.root_consonants,
        zokk_agentive_suffix: row.s_suffix || row.zokk_agentive_suffix
    } : null;
    payload.zokk_morphology = zokkFromCols || parseObject(row.zokk_morphology);
    payload.inflections_pl = deriveInflections(row, String(row.pos || '').toLowerCase()).map(r => r.form);

    const pos = normalizeEntryPos(row.pos);

    if (pos === 'verb') {
        applyVerbMorphologyCompatibility(payload, payload, buildVerbSource(row), payload);
    } else if (pos === 'noun') {
        applyNounMorphologyCompatibility(payload, payload, buildNounSource(row));
    } else if (pos === 'adjective') {
        applyAdjMorphologyCompatibility(payload, payload, buildAdjSource(row));
    } else if (pos === 'participle') {
        applyAdjMorphologyCompatibility(payload, payload, buildAdjSource(row));
        applyParticipleMorphologyCompatibility(payload, payload, buildParticipleSource(row));
    } else if (pos === 'numeral') {
        applyNumeralMorphologyCompatibility(payload, payload, buildNumeralSource(row));
    }

    const adjMorph = (payload.adj_morphology as Record<string, unknown> | undefined)
        || (payload.adjective_morphology as Record<string, unknown> | undefined);
    if (adjMorph) {
        payload.adj_morphology = payload.adj_morphology ?? adjMorph;
        payload.adjective_morphology = payload.adjective_morphology ?? adjMorph;
        payload.form_masc = payload.form_masc ?? adjMorph.form_masc ?? adjMorph.masculine_form ?? null;
        payload.form_fem = payload.form_fem ?? adjMorph.form_fem ?? adjMorph.feminine_form ?? null;
        payload.form_masc_pattern = payload.form_masc_pattern ?? adjMorph.form_masc_pattern ?? null;
        payload.form_fem_pattern = payload.form_fem_pattern ?? adjMorph.form_fem_pattern ?? null;
        payload.form_plural_pattern = payload.form_plural_pattern ?? adjMorph.form_plural_pattern ?? null;
    }

    const nounMorph = payload.noun_morphology as Record<string, unknown> | undefined;
    if (nounMorph) {
        payload.form_masc = payload.form_masc ?? nounMorph.form_masc ?? nounMorph.masculine_form ?? null;
        payload.form_fem = payload.form_fem ?? nounMorph.form_fem ?? nounMorph.feminine_form ?? null;
        payload.form_masc_pattern = payload.form_masc_pattern ?? nounMorph.form_masc_pattern ?? null;
        payload.form_fem_pattern = payload.form_fem_pattern ?? nounMorph.form_fem_pattern ?? null;
        payload.form_plural_pattern = payload.form_plural_pattern ?? nounMorph.form_plural_pattern ?? null;
    }

    const numMorph = payload.numeral_morphology as Record<string, unknown> | undefined;
    if (numMorph) {
        delete payload.form_attributive_short_pattern;
        payload.form_plural_pattern = payload.form_plural_pattern ?? numMorph.form_plural_pattern ?? null;
    }

    if (!payload.gender) {
        payload.gender = resolveEntryGender(payload) || null;
    }

    return payload;
}

function isAlternativeRelation(item: any) {
    const kind = String(
        item?.relation_kind
        || item?.relationship_type
        || item?._rel
        || '',
    ).toLowerCase().trim();
    return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
}
