
/**
 * src/lib/entryAdapter.ts
 * Adapter for mapping between DB Entry and Admin Form state.
 */

import { buildEntryPayload, ENTRY_HANDLED_FIELDS } from './adminSchema.ts';
import { resolveEntryGender } from './gender.ts';
import { normalizeEntryPos } from './entryId.ts';
import { normalizeEntryDefinitions, normalizeEntryEtymologyChain, type EntryEtymology } from './adminUtils.ts';
import {
    compactPluralRows,
    normalizePluralFormRows,
    pluralRowsToLegacyForms,
    pluralRowsToLegacyPatternString,
    type PluralFormRow,
} from './pluralForms.ts';
import type { EntryDiminutive } from '@/types';

export const INITIAL_FORM_STATE = {
    id: '',
    headword: '',
    pos: 'noun',
    gender: 'masculine',
    lemma_base: '',
    inflections_pl: '',
    sound_suffix: '',
    dual_form: '',
    noun_type: '',
    diminutive_form: '',
    form_fem: '',
    form_masc: '',
    is_collective: false,
    is_singulative: false,
    vowel_set_sg: '',
    vowel_set_pl: '',
    vowel_set_opp: '',
    vowel_set_dual: '',
    verb_class: '',
    verb_type: '',
    verb_transitivity: '',
    verb_perfective_3sgm: '',
    verb_imperfective_3sgm: '',
    verb_verbal_noun: '',
    verb_vowel_perf: '',
    verb_vowel_impf: '',
    verb_vowel_impv: '',
    verb_active_ptcp: '',
    verb_passive_ptcp: '',
    elative_form: '',
    participle_type: '',
    is_loanword: false,
    source_language: '',
    source_citation: '',
    definitions: [
        { text_en: '', text_mt: '', register: '', nuance: '' }
    ],
    etymology_chain: [] as EntryEtymology[],
    phonetics: [] as { dialect: string; spelling: string; ipa: string }[],
    tags: '',
    _formLabel: '',
    _rootConsonants: '',
    _weakClass: '',
    _hasDual: false,
    _pluralType: 'none',
    _adjPluralType: 'none',
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
    diminutives: [] as EntryDiminutive[],
    _sound_suffix: '',
    _adj_sound_suffix: '',
    synonyms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    antonyms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    related_entries: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    alternative_forms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    is_inflectable: true,
    usage_example: '',
    usage_example_en: '',
    numeral_type: '',
    form_attributive_short: '',
    form_attributive_long: '',
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

/**
 * Maps a DB Entry (potentially legacy) to the Admin Form state.
 */
export function entryToForm(entry: any, initialFormOverrides: Partial<AdminForm> = {}): AdminForm {
    if (!entry) {
        return { ...INITIAL_FORM_STATE, ...initialFormOverrides };
    }

    const full = entry;

    // Helper to handle legacy array-in-string or standard array
    const parseArray = (val: any) => {
        if (typeof val === 'string' && val.trim().startsWith('[')) {
            try { return JSON.parse(val); } catch { return []; }
        }
        return Array.isArray(val) ? val : [];
    };

    const pos = normalizeEntryPos(full.pos || INITIAL_FORM_STATE.pos);

    // Resolve Plural Types
    const pluralRows = compactPluralRows(normalizePluralFormRows(
        full.inflections_pl,
        full.form_plural_pattern || full.plural_pattern || full.noun_morphology?.form_plural_pattern,
    ));
    const inflections_pl = pluralRowsToLegacyForms(pluralRows).join(', ');
    const raw_sound = full.sound_suffix || '';
    const raw_morph = full.morph_pattern || '';
    const plurals = pluralRowsToLegacyPatternString(pluralRows) || [raw_morph, raw_sound].filter(Boolean).join(', ');

    const hasBroken = pluralRows.some(row => row.form);
    const hasSound = raw_sound?.length > 0;

    const _pluralType = (hasBroken && hasSound) ? 'both'
        : hasBroken ? 'broken'
            : hasSound ? 'sound'
                : 'none';

    const _adjPluralType = (pos === 'adjective' && hasBroken) ? (plurals ? 'broken' : 'sound') : 'none';

    const dual_form = full.dual_form || '';
    const parseBooleanLike = (value: any) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value === 1;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
        }
        return false;
    };
    const hasZokkMorphology = !!full.zokk_morphology;
    const isLoanword = full.is_loanword === undefined || full.is_loanword === null || full.is_loanword === ''
        ? hasZokkMorphology
        : parseBooleanLike(full.is_loanword);
    const diminutives = parseArray(full.diminutives);
    const primaryDiminutive = diminutives.find((item: any) => item && (item.form || item.diminutive_form)) || null;

    // Extract Extra Fields (unknown backend keys)
    const extraFields: Record<string, any> = {};
    Object.keys(full).forEach(key => {
        if (!ENTRY_HANDLED_FIELDS.includes(key as any) && !key.startsWith('_')) {
            extraFields[key] = full[key];
        }
    });

    const relatedAll = parseArray(full.related_entries);
    const related_entries = relatedAll.filter((item: any) => !isAlternativeRelation(item));
    const directAlternatives = parseArray(full.alternative_forms);
    const fallbackAlternatives = relatedAll.filter((item: any) => isAlternativeRelation(item));
    const alternative_forms = directAlternatives.length > 0 ? directAlternatives : fallbackAlternatives;

    const form: AdminForm = {
        ...INITIAL_FORM_STATE,
        id: full.id || '',
        headword: full.headword || '',
        pos,
        lemma_base: full.lemma_base || '',
        // Preserve default for new forms, but read legacy/canonical when editing
        gender: resolveEntryGender(full) || INITIAL_FORM_STATE.gender,
        noun_type: full.noun_type || '',
        diminutive_form: primaryDiminutive?.form || primaryDiminutive?.diminutive_form || full.diminutive_form || '',
        form_fem: full.form_fem || '',
        form_masc: full.form_masc || '',
        paucal_form: full.paucal_form || full.noun_morphology?.paucal || '',
        augmentative_form: full.augmentative_form || full.noun_morphology?.augmentative || '',
        is_collective: Boolean(full.is_collective ?? false),
        is_singulative: Boolean(full.is_singulative ?? false),
        vowel_set_sg: full.vowel_set_sg || '',
        vowel_set_pl: full.vowel_set_pl || '',
        vowel_set_opp: full.vowel_set_opp || '',
        vowel_set_dual: full.vowel_set_dual || '',
        inflections_pl,
        sound_suffix: full.sound_suffix || '',
        form_masc_pattern: full.form_masc_pattern || full.lemma_pattern || '',
        form_fem_pattern: full.form_fem_pattern || '',
        form_plural_pattern: full.form_plural_pattern || plurals || '',
        plural_forms: pluralRows,
        dual_pattern: full.dual_pattern || '',
        paucal_pattern: full.paucal_pattern || full.noun_morphology?.paucal_pattern || '',
        augmentative_pattern: full.augmentative_pattern || full.noun_morphology?.augmentative_pattern || '',
        elative_pattern: full.elative_pattern || '',
        diminutive_pattern: primaryDiminutive?.pattern || primaryDiminutive?.diminutive_pattern || full.diminutive_pattern || '',
        dual_form,
        _hasDual: !!dual_form,
        _pluralType: _pluralType as any,
        _adjPluralType,
        verb_class: full.verb_class || '',
        verb_type: full.verb_type || '',
        _weakClass: full.verb_weak_class || full.weak_class || '',
        _formLabel: full.verb_form || '',
        verb_vowel_perf: full.verb_vowel_perf || '',
        verb_vowel_impf: full.verb_vowel_impf || '',
        verb_vowel_impv: full.verb_vowel_impv || '',
        verb_transitivity: full.verb_transitivity || '',
        verb_perfective_3sgm: full.verb_perfective_3sgm || '',
        verb_imperfective_3sgm: full.verb_imperfective_3sgm || '',
        verb_verbal_noun: full.verb_verbal_noun || '',
        verb_active_ptcp: full.verb_active_ptcp || '',
        verb_passive_ptcp: full.verb_passive_ptcp || '',
        elative_form: full.elative_form || '',
        participle_type: full.participle_type || '',
        is_loanword: isLoanword,
        source_language: full.source_language || '',
        source_citation: full.source_citation || '',
        tags: Array.isArray(full.tags) ? full.tags.join(', ')
            : (typeof full.tags === 'string' && full.tags.startsWith('[') ? parseArray(full.tags).join(', ') : (full.tags || '')),
        _rootConsonants: full.resolved_root_consonants || full.root_consonants || '',
        definitions: normalizeEntryDefinitions(
            parseArray(full.definitions).length
                ? full.definitions
                : (full.definition_en || full.definition_mt
                    ? [{ text_en: full.definition_en || '', text_mt: full.definition_mt || '' }]
                    : [])
        ),
        phonetics: parseArray(full.phonetics).map((p: any) => ({
            dialect: p.dialect || 'Standard',
            spelling: p.spelling || '',
            ipa: p.ipa || ''
        })),
        etymology_chain: parseArray(full.etymology_chain).length
            ? normalizeEntryEtymologyChain(parseArray(full.etymology_chain))
            : (full.etymologies?.[0]?.chain?.length
                ? normalizeEntryEtymologyChain(full.etymologies[0].chain)
                : []),
        cv_pattern: full.cv_pattern || full.cv_notation || '',
        _inheritedPattern: !full.cv_pattern && (full.cv_notation || full.resolved_cv),
        synonyms: parseArray(full.synonyms),
        antonyms: parseArray(full.antonyms),
        related_entries,
        alternative_forms,
        diminutives,
        numeral_type: full.numeral_type || '',
        form_attributive_short: full.form_attributive_short || '',
        form_attributive_long: full.form_attributive_long || '',
          form_opposite: full.form_opposite || '',
          is_inflectable: typeof full.is_inflectable === 'boolean' ? full.is_inflectable : (typeof full.is_inflectable === 'number' ? full.is_inflectable === 1 : true),
          usage_example: full.usage_example || '',
          usage_example_en: full.usage_example_en || '',
        // Initial Zokk values
        zokk_class: '',
        zokk_stem: '',
        zokk_is_hybrid: false,
        zokk_root: '',
        prefer_zokk: isLoanword,
        zokk_agentive_suffix: '',
        extraFields,
        ...initialFormOverrides
      };

    // Parse zokk_morphology if present
    if (full.zokk_morphology) {
        try {
            const zokk = typeof full.zokk_morphology === 'string' 
                ? JSON.parse(full.zokk_morphology) 
                : full.zokk_morphology;

            form.zokk_class = zokk.class_type || '';
            form.zokk_stem = zokk.stem_string || '';
            form.zokk_is_hybrid = !!zokk.is_hybrid;
            form.zokk_root = zokk.root || full.root_consonants || full.resolved_root_consonants || '';
            form.zokk_agentive_suffix = zokk.agentive_suffix || '';
            form.prefer_zokk = isLoanword;
        } catch (e) {
            console.error('Failed to parse zokk_morphology', e);
        }
    }

    return form;
}

/**
 * Builds a patch from a loaded full entry onto an already-open form.
 * This keeps the modal in sync with fields that are not present in the list view.
 */
export function buildLoadedEntryPatch(full: any, prev: AdminForm): Partial<AdminForm> {
    if (!full) return {};

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

    const pluralRows = compactPluralRows(normalizePluralFormRows(
        full.inflections_pl || prev.inflections_pl,
        full.form_plural_pattern || full.plural_pattern || full.noun_morphology?.form_plural_pattern,
    ));
    const inflections_pl = pluralRowsToLegacyForms(pluralRows).join(', ');
    const raw_sound = full.sound_suffix || '';
    const raw_morph = full.form_plural_pattern || '';
    const plurals = pluralRowsToLegacyPatternString(pluralRows) || [raw_morph, raw_sound].filter(Boolean).join(', ');
    const hasBroken = pluralRows.some(row => row.form);
    const hasSound = raw_sound?.length > 0;
    const _pluralType = (hasBroken && hasSound) ? 'both'
        : hasBroken ? 'broken'
            : hasSound ? 'sound'
                : 'none';
    const pos = normalizeEntryPos(full.pos || prev.pos);
    const _adjPluralType = (pos === 'adjective' && hasBroken)
        ? (plurals ? 'broken' : 'sound')
        : 'none';

    const zokk = full.zokk_morphology
        ? (() => {
            try {
                return typeof full.zokk_morphology === 'string'
                    ? JSON.parse(full.zokk_morphology)
                    : full.zokk_morphology;
            } catch {
                return null;
            }
        })()
        : null;

    const hasZokkMorphology = !!full.zokk_morphology;
    const isLoanword = full.is_loanword === undefined || full.is_loanword === null || full.is_loanword === ''
        ? hasZokkMorphology
        : parseBooleanLike(full.is_loanword);

    return {
        id: full.id || prev.id,
        headword: full.headword || prev.headword,
        pos,
        lemma_base: full.lemma_base || prev.lemma_base,
        gender: resolveEntryGender(full) || resolveEntryGender(prev) || prev.gender || '',
        noun_type: full.noun_type || full.noun_morphology?.noun_type || prev.noun_type,
        inflections_pl,
        sound_suffix: raw_sound,
        form_fem: full.form_fem || prev.form_fem,
        form_masc: full.form_masc || prev.form_masc,
        paucal_form: full.paucal_form || full.noun_morphology?.paucal || prev.paucal_form,
        augmentative_form: full.augmentative_form || full.noun_morphology?.augmentative || prev.augmentative_form,
        elative_form: full.elative_form || prev.elative_form,
        dual_form: full.dual_form || prev.dual_form,
        diminutive_form: full.diminutive_form || prev.diminutive_form,
        vowel_set_sg: full.vowel_set_sg || prev.vowel_set_sg,
        vowel_set_pl: full.vowel_set_pl || prev.vowel_set_pl,
        vowel_set_opp: full.vowel_set_opp || prev.vowel_set_opp,
        vowel_set_dual: full.vowel_set_dual || prev.vowel_set_dual,
        plural_forms: pluralRows,
        form_masc_pattern: full.form_masc_pattern || prev.form_masc_pattern,
        form_fem_pattern: full.form_fem_pattern || prev.form_fem_pattern,
        form_plural_pattern: full.form_plural_pattern || plurals || prev.form_plural_pattern,
        dual_pattern: full.dual_pattern || prev.dual_pattern,
        paucal_pattern: full.paucal_pattern || full.noun_morphology?.paucal_pattern || prev.paucal_pattern,
        augmentative_pattern: full.augmentative_pattern || full.noun_morphology?.augmentative_pattern || prev.augmentative_pattern,
        elative_pattern: full.elative_pattern || prev.elative_pattern,
        diminutive_pattern: full.diminutive_pattern || prev.diminutive_pattern,
        cv_pattern: full.cv_pattern || full.cv_notation || prev.cv_pattern,
        _hasDual: !!(full.dual_form || prev.dual_form),
        participle_type: full.participle_type || prev.participle_type,
        definitions: parseArray(full.definitions).length ? parseArray(full.definitions) : prev.definitions,
        tags: Array.isArray(full.tags) ? full.tags.join(', ')
            : (typeof full.tags === 'string' && full.tags.startsWith('[') ? parseArray(full.tags).join(', ') : (full.tags || prev.tags)),
        _rootConsonants: full.resolved_root_consonants || full.root_consonants || prev._rootConsonants,
        _formLabel: full.verb_form || full.verb_morphology?.form || prev._formLabel,
        verb_class: full.verb_class || full.verb_morphology?.verb_class || prev.verb_class,
        _weakClass: full.verb_weak_class || full.weak_class || full.verb_morphology?.weak_class || prev._weakClass,
        verb_type: full.verb_type || prev.verb_type,
        verb_vowel_perf: full.verb_vowel_perf || full.verb_morphology?.vowel_set_perf || prev.verb_vowel_perf,
        verb_vowel_impf: full.verb_vowel_impf || full.verb_morphology?.vowel_set_impf || prev.verb_vowel_impf,
        verb_vowel_impv: full.verb_vowel_impv || full.verb_morphology?.vowel_set_imperative || prev.verb_vowel_impv,
        verb_transitivity: full.verb_transitivity || full.verb_morphology?.transitivity || prev.verb_transitivity,
        verb_perfective_3sgm: full.verb_perfective_3sgm || full.verb_morphology?.perfective_3sg_m || prev.verb_perfective_3sgm,
        verb_imperfective_3sgm: full.verb_imperfective_3sgm || full.verb_morphology?.imperfective_3sg_m || prev.verb_perfective_3sgm,
        verb_verbal_noun: full.verb_verbal_noun || full.verb_morphology?.verbal_noun || prev.verb_verbal_noun,
        verb_active_ptcp: full.verb_active_ptcp || full.verb_morphology?.active_participle || prev.verb_active_ptcp,
        verb_passive_ptcp: full.verb_passive_ptcp || full.verb_morphology?.passive_participle || prev.verb_passive_ptcp,
        is_loanword: isLoanword,
        source_language: full.source_language || prev.source_language,
        source_citation: full.source_citation || full.verb_morphology?.source_citation || full.noun_morphology?.source_citation || prev.source_citation,
        phonetics: parseArray(full.phonetics).length ? parseArray(full.phonetics) : prev.phonetics,
        etymology_chain: parseArray(full.etymology_chain).length ? normalizeEntryEtymologyChain(parseArray(full.etymology_chain))
            : (full.etymologies?.[0]?.chain?.length ? normalizeEntryEtymologyChain(full.etymologies[0].chain) : prev.etymology_chain),
        is_collective: Boolean(full.is_collective ?? prev.is_collective),
        is_singulative: Boolean(full.is_singulative ?? prev.is_singulative),
        _inheritedPattern: !full.cv_pattern && (full.cv_notation || full.resolved_cv),
        synonyms: parseArray(full.synonyms || full.verb_morphology?.synonyms || full.noun_morphology?.synonyms),
        antonyms: parseArray(full.antonyms || full.verb_morphology?.antonyms || full.noun_morphology?.antonyms),
        related_entries: parseArray(full.related_entries || full.verb_morphology?.related_entries || full.noun_morphology?.related_entries),
        numeral_type: full.numeral_type || full.numeral_morphology?.numeral_type || prev.numeral_type,
        form_attributive_short: full.form_attributive_short || full.numeral_morphology?.form_attributive_short || prev.form_attributive_short,
        form_attributive_long: full.form_attributive_long || full.numeral_morphology?.form_attributive_long || prev.form_attributive_long,
        form_opposite: full.form_opposite || full.numeral_morphology?.form_opposite || prev.form_opposite,
        _pluralType,
        _adjPluralType,
        zokk_class: zokk?.class_type || prev.zokk_class,
        zokk_stem: zokk?.stem_string || prev.zokk_stem,
        zokk_is_hybrid: typeof zokk?.is_hybrid === 'boolean' ? zokk.is_hybrid : prev.zokk_is_hybrid,
        zokk_root: zokk?.root || full.root_consonants || full.resolved_root_consonants || prev.zokk_root,
        prefer_zokk: isLoanword,
        zokk_agentive_suffix: zokk?.agentive_suffix || prev.zokk_agentive_suffix,
        is_inflectable: typeof full.is_inflectable === 'boolean'
            ? full.is_inflectable
            : (typeof full.is_inflectable === 'number' ? full.is_inflectable === 1 : prev.is_inflectable),
        usage_example: full.usage_example || prev.usage_example,
        usage_example_en: full.usage_example_en || prev.usage_example_en,
        extraFields: (() => {
            const extras: Record<string, any> = {};
            Object.keys(full).forEach(key => {
                if (!ENTRY_HANDLED_FIELDS.includes(key as any) && !key.startsWith('_')) {
                    extras[key] = full[key];
                }
            });
            return extras;
        })(),
    };
}

/**
 * Delegates to buildEntryPayload for DB persistense logic.
 */
export function formToPayload(form: AdminForm): Record<string, any> {
    return buildEntryPayload({
        ...form,
        related_entries: Array.isArray(form.related_entries) ? form.related_entries : [],
        plural_forms: Array.isArray((form as any).plural_forms) ? (form as any).plural_forms : [],
        alternative_forms: Array.isArray((form as any).alternative_forms)
            ? (form as any).alternative_forms.map((item: any) => ({ ...item, relation_kind: 'alternative_form' }))
            : [],
    });
}

function isAlternativeRelation(item: any): boolean {
    const kind = String(
        item?.relation_kind
        || item?.relationship_type
        || item?._rel
        || '',
    ).toLowerCase().trim();
    return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
}
