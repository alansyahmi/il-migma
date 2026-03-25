
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
    form_fem_pattern: '',
    form_masc_pattern: '',
    form_plural_pattern: '',
    dual_pattern: '',
    elative_pattern: '',
    diminutive_pattern: '',
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

    const pos = full.pos || INITIAL_FORM_STATE.pos;

    // Resolve Plural Types
    const inflections_pl_raw = parseArray(full.inflections_pl);
    const inflections_pl = Array.isArray(inflections_pl_raw) ? inflections_pl_raw.join(', ') : (inflections_pl_raw || '');
    const raw_sound = full.sound_suffix || '';
    const raw_morph = full.morph_pattern || '';
    const plurals = [raw_morph, raw_sound].filter(Boolean).join(', ');

    const hasBroken = inflections_pl?.length > 0;
    const hasSound = raw_sound?.length > 0;

    const _pluralType = (hasBroken && hasSound) ? 'both'
        : hasBroken ? 'broken'
            : hasSound ? 'sound'
                : 'none';

    const _adjPluralType = (pos === 'adjective' && hasBroken) ? (plurals ? 'broken' : 'sound') : 'none';

    const dual_form = full.dual_form || '';

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
        diminutive_form: full.diminutive_form || '',
        form_fem: full.form_fem || '',
        form_masc: full.form_masc || '',
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
        dual_pattern: full.dual_pattern || '',
        elative_pattern: full.elative_pattern || '',
        diminutive_pattern: full.diminutive_pattern || '',
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
        is_loanword: typeof full.is_loanword === 'boolean' ? full.is_loanword : (full.is_loanword === 1),
        source_language: full.source_language || '',
        source_citation: full.source_citation || '',
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
        synonyms: parseArray(full.synonyms),
        antonyms: parseArray(full.antonyms),
        related_entries,
        alternative_forms,
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
            form.zokk_root = zokk.root || '';
            form.zokk_agentive_suffix = zokk.agentive_suffix || '';
        } catch (e) {
            console.error('Failed to parse zokk_morphology', e);
        }
    }

    return form;
}

/**
 * Delegates to buildEntryPayload for DB persistense logic.
 */
export function formToPayload(form: AdminForm): Record<string, any> {
    return buildEntryPayload({
        ...form,
        related_entries: Array.isArray(form.related_entries) ? form.related_entries : [],
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
