
/**
 * src/lib/entryAdapter.ts
 * Adapter for mapping between DB Entry and Admin Form state.
 */

import { buildEntryPayload, ENTRY_HANDLED_FIELDS } from './adminSchema.ts';
import { resolveEntryGender } from './gender';

export const INITIAL_FORM_STATE = {
    id: '',
    headword: '',
    pos: 'noun',
    gender: '',
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
    etymology_chain: [] as { language: string; form: string; meaning: string }[],
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
    morph_pattern: '',
    lemma_pattern: '',
    form_fem_pattern: '',
    form_masc_pattern: '',
    form_plural_pattern: '',
    dual_pattern: '',
    _sound_suffix: '',
    _adj_sound_suffix: '',
    synonyms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    antonyms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    related_entries: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    is_inflectable: true,
    usage_example: '',
    usage_example_en: '',
    numeral_type: '',
    form_attributive_short: '',
    form_attributive_long: '',
    form_opposite: '',
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

    const pos = full.pos || INITIAL_FORM_STATE.pos;
    
    // Resolve Plural Types
    const inflections_pl_raw = parseArray(full.inflections_pl || full.noun_morphology?.plural_forms || full.adjective_morphology?.plural);
    const inflections_pl = Array.isArray(inflections_pl_raw) ? inflections_pl_raw.join(', ') : (inflections_pl_raw || '');
    const sound_suffix = full.sound_suffix || full.noun_morphology?.sound_plural || '';
    const morph_pattern = full.morph_pattern || '';
    
    const hasBroken = inflections_pl?.length > 0;
    const hasSound = sound_suffix?.length > 0;

    const _pluralType = (hasBroken && hasSound) ? 'both'
        : hasBroken ? 'broken'
            : hasSound ? 'sound'
                : 'none';

    const _adjPluralType = (pos === 'adjective' && hasBroken) ? (morph_pattern ? 'broken' : 'sound') : 'none';

    const dual_form = full.dual_form || full.noun_morphology?.dual || '';

    // Extract Extra Fields (unknown backend keys)
    const extraFields: Record<string, any> = {};
    Object.keys(full).forEach(key => {
        if (!ENTRY_HANDLED_FIELDS.includes(key as any) && !key.startsWith('_')) {
            extraFields[key] = full[key];
        }
    });

    const form: AdminForm = {
        ...INITIAL_FORM_STATE,
        id: full.id || '',
        headword: full.headword || '',
        pos,
        lemma_base: full.lemma_base || full.noun_morphology?.singular || full.adjective_morphology?.masculine || '',
        gender: resolveEntryGender(full) || '',
        noun_type: full.noun_type || full.noun_morphology?.noun_type || '',
        diminutive_form: full.diminutive_form || full.noun_morphology?.diminutive || '',
        form_fem: full.form_fem || full.noun_morphology?.feminine || full.adjective_morphology?.feminine || '',
        form_masc: full.form_masc || full.noun_morphology?.masculine || '',
        is_collective: Boolean(full.is_collective ?? full.noun_morphology?.is_collective ?? false),
        is_singulative: Boolean(full.is_singulative ?? full.noun_morphology?.is_singulative ?? false),
        vowel_set_sg: full.vowel_set_sg || full.noun_morphology?.vowel_set_sg || full.adjective_morphology?.vowel_set_sg || '',
        vowel_set_pl: full.vowel_set_pl || full.noun_morphology?.vowel_set_pl || full.adjective_morphology?.vowel_set_pl || '',
        vowel_set_opp: full.vowel_set_opp || '',
        vowel_set_dual: full.vowel_set_dual || '',
        inflections_pl,
        sound_suffix: sound_suffix || full.sound_suffix || '',
        morph_pattern,
        lemma_pattern: full.lemma_pattern || '',
        form_fem_pattern: full.form_fem_pattern || '',
        form_masc_pattern: full.form_masc_pattern || '',
        form_plural_pattern: full.form_plural_pattern || '',
        dual_pattern: full.dual_pattern || '',
        dual_form,
        _hasDual: !!dual_form,
        _pluralType,
        _adjPluralType,
        verb_class: full.verb_class || full.verb_morphology?.verb_class || '',
        verb_type: full.verb_type || '',
        _weakClass: full.verb_weak_class || full.weak_class || full.verb_morphology?.weak_class || '',
        _formLabel: full.verb_form || full.verb_morphology?.form || '',
        verb_vowel_perf: full.verb_vowel_perf || full.verb_morphology?.vowel_set_perf || '',
        verb_vowel_impf: full.verb_vowel_impf || full.verb_morphology?.vowel_set_impf || '',
        verb_vowel_impv: full.verb_vowel_impv || full.verb_morphology?.vowel_set_imperative || '',
        verb_transitivity: full.verb_transitivity || full.verb_morphology?.transitivity || '',
        verb_perfective_3sgm: full.verb_perfective_3sgm || full.verb_morphology?.perfective_3sg_m || '',
        verb_imperfective_3sgm: full.verb_imperfective_3sgm || full.verb_morphology?.imperfective_3sg_m || '',
        verb_verbal_noun: full.verb_verbal_noun || full.verb_morphology?.verbal_noun || '',
        verb_active_ptcp: full.verb_active_ptcp || full.verb_morphology?.active_participle || '',
        verb_passive_ptcp: full.verb_passive_ptcp || full.verb_morphology?.passive_participle || '',
        elative_form: full.elative_form || full.adjective_morphology?.elative || '',
        participle_type: full.participle_type || '',
        is_loanword: typeof full.is_loanword === 'boolean' ? full.is_loanword : false,
        source_language: full.source_language || '',
        source_citation: full.source_citation || full.verb_morphology?.source_citation || full.noun_morphology?.source_citation || full.adjective_morphology?.source_citation || '',
        tags: Array.isArray(full.tags) ? full.tags.join(', ')
            : (typeof full.tags === 'string' && full.tags.startsWith('[') ? parseArray(full.tags).join(', ') : (full.tags || '')),
        _rootConsonants: full.resolved_root_consonants || full.root_consonants || '',
        definitions: parseArray(full.definitions).length 
            ? parseArray(full.definitions).map((d: any) => ({
                text_en: d.text_en || '',
                text_mt: d.text_mt || '',
                register: d.register || d.sense_register || '',
                nuance: d.nuance || ''
            }))
            : [{ text_en: '', text_mt: '', register: '', nuance: '' }],
        phonetics: parseArray(full.phonetics).map((p: any) => ({
            dialect: p.dialect || 'Standard',
            spelling: p.spelling || '',
            ipa: p.ipa || ''
        })),
        etymology_chain: parseArray(full.etymology_chain).length ? parseArray(full.etymology_chain)
            : (full.etymologies?.[0]?.chain?.length ? full.etymologies[0].chain : []),
        cv_pattern: full.cv_pattern || full.cv_notation || '',
        _inheritedPattern: !full.cv_pattern && (full.cv_notation || full.resolved_cv),
        synonyms: parseArray(full.synonyms || full.verb_morphology?.synonyms || full.noun_morphology?.synonyms),
        antonyms: parseArray(full.antonyms || full.verb_morphology?.antonyms || full.noun_morphology?.antonyms),
        related_entries: parseArray(full.related_entries || full.verb_morphology?.related_entries || full.noun_morphology?.related_entries),
        numeral_type: full.numeral_type || full.numeral_morphology?.numeral_type || '',
        form_attributive_short: full.form_attributive_short || full.numeral_morphology?.form_attributive_short || '',
        form_attributive_long: full.form_attributive_long || full.numeral_morphology?.form_attributive_long || '',
        form_opposite: full.form_opposite || full.numeral_morphology?.form_opposite || '',
        is_inflectable: typeof full.is_inflectable === 'boolean' ? full.is_inflectable : (typeof full.is_inflectable === 'number' ? full.is_inflectable === 1 : true),
        usage_example: full.usage_example || full.noun_morphology?.usage_example || full.verb_morphology?.usage_example || '',
        usage_example_en: full.usage_example_en || full.noun_morphology?.usage_example_en || full.verb_morphology?.usage_example_en || '',
        extraFields,
        ...initialFormOverrides
    };

    return form;
}

/**
 * Delegates to buildEntryPayload for DB persistense logic.
 */
export function formToPayload(form: AdminForm): Record<string, any> {
    return buildEntryPayload(form);
}
