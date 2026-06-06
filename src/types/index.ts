/**
 * src/types/index.ts
 * Core type definitions for the Il-Miġma' application.
 */

export type POS = 
  | 'noun' 
  | 'verb' 
  | 'adjective' 
  | 'adverb' 
  | 'pronoun' 
  | 'preposition' 
  | 'conjunction' 
  | 'interjection' 
  | 'article' 
  | 'particle'
  | 'numeral'
  | 'participle'
  | 'interrogative'
  | 'suffix';

export type SourceLanguage = 'Semitic' | 'Romance' | 'English' | 'Other' | 'Maltese';

export type VerbStrength = 'strong' | 'weak' | 'geminated' | 'strong-hybrid';

export type WeakClass = 'first' | 'second' | 'third' | 'hollow' | 'defective' | 'assimilative' | 'none';

export type LinguisticMode = 'latinised' | 'arabised' | 'standard';

export interface StemVariantSet {
    attached: string;
    syncopated: string;
    perfectAttached?: string;
    perfectSyncopated?: string;
}

export type NounGender = 'masculine' | 'feminine' | 'both' | 'none' | 'plural' | 'neutral';
export type Gender = NounGender;

export interface Definition {
    id: string;
    text_en: string;
    text_mt?: string | null;
    sense_number?: number;
    usage_context?: string;
    register?: string;
    nuance?: string;
    examples?: string[];
    example_sentences?: any[];
    field?: string;
}

export interface ConjugationRow {
    person_mt: string;
    person_en: string;
    perfect: string;
    imperfect: string;
    perfect_neg?: string;
    imperfect_neg?: string;
    imperfect_attached?: string;
    imperfect_syncopated?: string;
    stems?: {
        attached: string;
        syncopated: string;
        perfectAttached?: string;
        perfectSyncopated?: string;
    };
}

export interface VerbConjugationTable {
    rows: ConjugationRow[];
    imperative_sg: string;
    imperative_pl: string;
    imperative_sg_neg?: string;
    imperative_pl_neg?: string;
    imperative_sg_stems?: { attached: string; syncopated: string };
    imperative_pl_stems?: { attached: string; syncopated: string };
    blocksImala?: boolean;
}

export interface Entry {
    id: string;
    headword: string;
    pos?: string;
    gender?: string;
    form_fem?: string;
    form_masc?: string;
    form_plural_pattern?: string | null;
    form_fem_pattern?: string | null;
    form_masc_pattern?: string | null;
    dual_form?: string | null;
    dual_pattern?: string | null;
    paucal_form?: string | null;
    paucal_pattern?: string | null;
    augmentative_form?: string | null;
    augmentative_pattern?: string | null;
    diminutive_pattern?: string | null;
    elative_pattern?: string | null;
    plural_pattern?: string | null;
    morph_pattern?: string | null;
    lemma_pattern?: string | null;
    cv_pattern?: string | null;
    sound_suffix?: string | null;
    definitions?: Definition[];
    usage_examples?: any[];
    usage_example?: string;
    usage_example_en?: string;
    diminutives?: EntryDiminutive[];
    // Canonical etymology fields stored on `entries`.
    etymology_chain?: EntryEtymology[];
    etymologies?: EntryEtymologyChain[];
    etymology_notes?: string | null;
    phonetics?: Phonetic[];
    audio_files?: AudioFile[];
    tags?: string[];
    synonyms?: any[];
    antonyms?: any[];
    related_entries?: any[];
    alternative_forms?: any[];
    subentries?: Entry[];
    source_language?: string;
    is_loanword?: boolean;
    is_inflectable?: boolean;
    has_inflection?: boolean;
    created_at?: string;
    updated_at?: string;
    sort_order?: number;
    verb_class?: string | null;
    verb_weak_class?: string | null;
    verb_vowel_perf?: string | null;
    verb_vowel_impf?: string | null;
    verb_vowel_impv?: string | null;
    participle_type?: string | null;
    participle_gender?: string | null;
    numeral_type?: string | null;
    form_attributive_short?: string | null;

    // Morphological Sub-tables (Normalized)
    noun_morphology?: NounMorphology;
    verb_morphology?: VerbMorphology;
    adjective_morphology?: AdjectiveMorphology;
    adj_morphology?: AdjectiveMorphology;
    participle_morphology?: ParticipleMorphology;
    numeral_morphology?: NumeralMorphology;
    zokk_morphology?: ZokkMorphology;

    // Root/Pattern Relation
    root_pattern_form?: RootPatternForm;
}


export interface Root {
    id: string;
    consonants: string;
    consonant_array: string[];
    gloss_en?: string;
    gloss_mt?: string;
    type?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_imp?: string;
    strength?: string;
    weak_class?: string;
    is_imala_blocked?: boolean;
    gloss?: string;
    etymology?: string;
    created_at?: string;
    updated_at?: string;
}

export interface RootPatternForm {
    id?: string;
    root_id?: string;
    pattern_id?: string;
    derived_form?: string;
    root?: Root;
    pattern?: Pattern;
}

export type SubEntry = Entry;

export interface Pattern {
    id: string;
    cv_notation: string;
    wizen_notation?: string;
    pos?: string;
    gloss_en?: string;
    gloss_mt?: string;
    description?: string;
    example_word?: string;
    created_at?: string;
}

export interface EntryEtymologyChain {
    id: string;
    entry_id?: string;
    chain: EntryEtymology[];
    notes?: string;
    attestation?: any;
}

export interface EntryEtymology {
    language: string;
    etymon?: string;
    form?: string;
    meaning?: string;
    gloss?: string;
    notes?: string;
    time_period?: string;
    script?: string;
}

export interface NounMorphology {
    id?: string;
    entry_id?: string;
    gender: string;
    is_collective?: boolean;
    is_singulative?: boolean;
    is_inflectable_singular?: boolean;
    is_inflectable_plural?: boolean;
    noun_type?: string;
    singular_form?: string;
    plural_forms?: string | string[];
    plural?: any[];
    plural_pattern?: string;
    sound_plural?: string;
    sound_suffix?: string;
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    vowel_set_opp?: string;
    vowel_set_dual?: string;
    form_fem?: string;
    form_fem_pattern?: string;
    form_masc?: string;
    form_masc_pattern?: string;
    feminine_form?: string;
    masculine_form?: string;
    form_plural_pattern?: string;
    dual_form?: string;
    dual_pattern?: string;
    diminutive_form?: string;
    diminutive_pattern?: string;
    paucal_form?: string;
    paucal_pattern?: string;
    augmentative_form?: string;
    augmentative_pattern?: string;
    collective_form?: string;
    singulative_form?: string;
    source_citation?: string;
    diminutives?: EntryDiminutive[];
    related_entries?: any[];
    synonyms?: any[];
    antonyms?: any[];
    pattern?: string;
    morph_pattern?: string;
    lemma_pattern?: string;
    singular?: string;
    dual?: string;
    paucal?: string;
    augmentative?: string;
    masculine?: string;
    feminine?: string;
    is_inflectable?: boolean;
}
export interface VerbMorphology {
    id?: string;
    entry_id?: string;
    form: string;
    class?: string;
    verb_class?: string;
    verb_type?: string;
    transitivity?: string;
    weak_class?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_impv?: string;
    vowel_set_perfect?: string;
    vowel_set_imperfect?: string;
    vowel_set_imperative?: string;
    perfective_3sgm?: string;
    perfective_3sg_m?: string;
    imperfective_3sgm?: string;
    imperfective_3sg_m?: string;
    imperative_sg?: string;
    verbal_noun?: string;
    active_participle?: string;
    passive_participle?: string;
    is_imala_blocked?: boolean | number | string | null;
    source_citation?: string;
    conjugation?: any;
    related_entries?: any[];
    synonyms?: any[];
    antonyms?: any[];
    root_tags?: string[];
    type?: string;
    is_inflectable?: boolean;
}

export interface AdjectiveMorphology {
    id?: string;
    entry_id?: string;
    gender?: string;
    form_masc?: string;
    form_fem?: string;
    masculine?: string;
    feminine?: string;
    plural_form?: string | string[];
    plural_forms?: any[];
    plural?: any[];
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    vowel_set_opp?: string;
    vowel_set_dual?: string;
    form_fem_pattern?: string;
    form_masc_pattern?: string;
    form_plural_pattern?: string;
    dual_form?: string;
    dual_pattern?: string;
    diminutive_form?: string;
    diminutive_pattern?: string;
    elative_form?: string;
    elative?: string;
    elative_pattern?: string;
    source_citation?: string;
    diminutives?: EntryDiminutive[];
    related_entries?: any[];
    synonyms?: any[];
    antonyms?: any[];
    pattern?: string;
    morph_pattern?: string;
    lemma_pattern?: string;
    has_elative?: boolean;
    is_inflectable?: boolean;
}

export interface ParticipleMorphology {
    id: string;
    entry_id: string;
    participle_type: string;
    type?: string;
    gender: string;
    is_inflectable?: boolean;
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    vowel_set_opp?: string;
    vowel_set_dual?: string;
    form_fem?: string;
    form_fem_pattern?: string;
    form_masc?: string;
    form_masc_pattern?: string;
    form_plural_pattern?: string;
    dual_form?: string;
    dual_pattern?: string;
    diminutive_form?: string;
    diminutive_pattern?: string;
    elative_form?: string;
    elative_pattern?: string;
    source_citation?: string;
    related_entries?: any[];
    synonyms?: any[];
    antonyms?: any[];
}

export interface NumeralMorphology {
    id: string;
    entry_id: string;
    numeral_type: string;
    gender: string;
    form_plural_pattern?: string;
    form_attributive_short?: string;
    form_attributive_short_pattern?: string;
    lemma_pattern?: string;
    form_masc_pattern?: string;
    form_attributive_long?: string;
    numeral_ordinal?: string;
    numeral_adverbial?: string;
    numeral_fractional?: string;
    numeral_multiplier?: string;
    numeral_distributive?: string;
    ordinal_form?: string;
    adverbial_form?: string;
    fractional_form?: string;
    multiplier_form?: string;
    distributive_form?: string;
    source_citation?: string;
    related_entries?: any[];
    synonyms?: any[];
    antonyms?: any[];
    pattern?: string;
}

export interface ZokkMorphology {
    id?: string;
    entry_id?: string;
    stem_string: string;
    class_type: 'ar' | 'ir' | '';
    is_hybrid: boolean;
    agentive_suffix?: string;
    root?: string;
}

export interface Phonetic {
    id: string;
    entry_id?: string;
    subentry_id?: string;
    ipa: string;
    dialect?: string;
    notes?: string;
}

export interface AudioFile {
    id: string;
    entry_id?: string;
    subentry_id?: string;
    r2_object_key: string;
    dialect?: string;
    generated_at: string;
    is_ai_generated: boolean;
    duration_seconds?: number;
}

export interface LexicalSource {
    id: string;
    name: string;
    full_title: string;
    author?: string;
    published_year?: number;
}

export interface EntryDiminutive {
    form: string;
    pattern?: string;
    gender?: string | null;
    theoretical?: boolean;
}

export interface SearchResult {
    id: string;
    headword: string;
    pos?: string;
    gloss_en?: string;
    gloss_mt?: string;
    score?: number;
    highlight?: string;
    definition_en?: string;
    definition_mt?: string;
    suffix_match?: {
        role: 'dual' | 'plural' | 'derivational';
        displayValue: string;
        sourceField: string;
        matchedSuffix: string;
    };
    zokk_morphology?: ZokkMorphology;
}

export interface SearchFilters {
    pos?: POS[];
    source_language?: SourceLanguage[];
    min_reliability?: number;
    tags?: string[];
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: string;
    dialect?: string;
}

export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content_md: string;
    author: string;
    published_at: string;
    tags?: string[];
    cover_image_url?: string;
}

export type Feature =
    | 'semantic_search'
    | 'unlimited_audio'
    | 'dialect_variants'
    | 'chatbot'
    | 'inflector'
    | 'semmej'
    | 'grammar_checker'
    | 'corpus_insights'
    | 'suggest_dialect'
    | 'export_flashcards'
    | 'vote_suggestions'
    | 'api_access'
    | 'api_key_management';

export type Tier = 'basic' | 'pro' | 'enterprise';
export type Etymology = EntryEtymologyChain;
export interface AttestationReliability { reliability_index?: string; scores?: any[]; }
