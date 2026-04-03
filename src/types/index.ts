// ─── Linguistic Modes ──────────────────────────────────────────────────────
export type LinguisticMode = 'standard' | 'arabised';

// ─── Parts of Speech ───────────────────────────────────────────────────────
export type POS =
    | 'noun'
    | 'verb'
    | 'adjective'
    | 'adverb'
    | 'preposition'
    | 'conjunction'
    | 'particle'
    | 'article'
    | 'pronoun'
    | 'interrogative'
    | 'numeral'
    | 'participle'
    | 'interjection';

export type Gender = 'masculine' | 'feminine' | 'neutral';
export type LinguisticRole =
    | 'masculine_singular'
    | 'feminine_singular'
    | 'broken_plural'
    | 'sound_plural'
    | 'dual'
    | 'diminutive'
    | 'elative_masc'
    | 'elative_fem';
export type Transitivity = 'transitive' | 'intransitive' | 'both';

export type VerbStrength = 'strong' | 'strong-hybrid' | 'weak' | 'geminated';
export type WeakClass = 'assimilative' | 'hollow' | 'defective';

export type SourceLanguage =
    | 'Arabic'
    | 'Sicilian'
    | 'Italian'
    | 'Latin'
    | 'French'
    | 'English'
    | 'Spanish'
    | 'Berber'
    | 'Greek'
    | 'Uncertain';

// ─── Root / Pattern ────────────────────────────────────────────────────────
export interface Root {
    id: string;
    consonants: string;        // e.g. "k-t-b"
    consonant_array: string[]; // e.g. ["k","t","b"]

    // Morphological Metadata (centralized)
    strength: VerbStrength;
    weak_class?: WeakClass;
    is_imala_blocked: boolean;

    gloss: string;
    etymology: string;
    source?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_imp?: string;

    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface Pattern {
    id: string;
    cv_notation: string;   // e.g. "CvCvC"
    wizen_notation: string; // e.g. "Fagħal" — Arabised CV name
    description?: string;
    example_word?: string;
    tags?: string[];
    role?: LinguisticRole;
    gender?: Gender;
    created_at: string;
}

export interface RootPatternForm {
    id: string;
    root_id: string;
    pattern_id: string;
    derived_form: string; // surface form
    root?: Root;
    pattern?: Pattern;
}

// ─── Morphology ────────────────────────────────────────────────────────────
export interface NounMorphology {
    gender: Gender;
    singular: string;
    plural_forms: string[];        // can have multiple broken plurals
    sound_plural?: string;
    dual?: string;
    diminutive?: string;
    collective?: string;           // collective form
    singulative?: string;          // singulative form
    is_collective?: boolean;       // flag if the lemma itself is collective
    is_singulative?: boolean;      // flag if the lemma itself is singulative
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    vowel_set_opp?: string;
    vowel_set_dual?: string;
    feminine?: string;
    masculine?: string;
    morph_pattern?: string; // @deprecated use form_masc_pattern, form_fem_pattern, or form_plural_pattern
    lemma_pattern?: string; // @deprecated use form_masc_pattern or form_fem_pattern
    form_fem_pattern?: string;
    form_masc_pattern?: string;
    form_plural_pattern?: string;
    dual_pattern?: string;
    diminutive_pattern?: string;
    plural_pattern?: string; // keeping for internal use during transition
    sound_suffix?: string;
    is_inflectable?: boolean;
    usage_example?: string;
    usage_example_en?: string;
    // Common metadata
    synonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    antonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    related_entries?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    source_citation?: string;
    diminutives?: EntryDiminutive[];
}

export interface EntryDiminutive {
    id: string;
    entry_id: string;
    pos: 'noun' | 'adjective' | 'participle';
    form: string;
    pattern?: string;
    gender?: Gender;
    sort_order?: number;
    is_preferred?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PluralFormRow {
    form: string;
    pattern: string;
}

export interface ConjugationRow {
    person_mt: string;   // e.g. "jiena"
    person_en: string;   // e.g. "I"
    imperfect: string;          // base positive form (e.g. "nikteb")
    imperfect_attached?: string; // vowel-adjusted stem for suffix attachment (e.g. "niktib")
    perfect: string;            // perfect positive
    perfect_neg?: string;       // perfect negative form (3sg may shift vowel grade)
    // Stems used for automated suffix attachment (clitics)
    stems?: {
        /** Vowel-shifted stem for consonant-initial suffixes (-ni, -ha, -hom). e.g., jiktib- */
        impfType1: string;
        /** Syncopated/Shifted stem for vowel-initial suffixes (-u, -ok). e.g., jiktb- */
        impfType2: string;
        /** Perfect vowel-shifted stem. e.g., kitbit- */
        perfType1: string;
        /** Perfect base/syncopated stem. e.g., kitb- */
        perfType2: string;
    };
}

export interface VerbConjugationTable {
    rows: ConjugationRow[];
    imperative_sg: string;
    imperative_pl: string;
    /** Clitic attachment stems for imperative singular */
    imperative_sg_stems?: { impfType1: string; impfType2: string };
    /** Clitic attachment stems for imperative plural */
    imperative_pl_stems?: { impfType1: string; impfType2: string };
    // Negative forms (shown when polarity toggle = Negative)
    imperative_sg_neg?: string;
    imperative_pl_neg?: string;
    /** Whether this verb blocks the automatic a->ie vowel shift (Imala) b/c of a final guttural */
    blocksImala?: boolean;
}

export interface VerbMorphology {
    // These are now derived from the root/form combo
    transitivity: Transitivity;
    perfective_3sg_m: string;      // citation form
    imperfective_3sg_m: string;
    verbal_noun?: string;          // misder
    active_participle?: string;    // fiegħel
    passive_participle?: string;   // mifgħul
    // Verb form (I, II, III …)
    form: string;
    verb_class?: string;
    weak_class?: string;
    // Root classification tags shown in sub-header
    root_tags?: string[];          // e.g. ['BASE', 'STRONG'] or ['BASE', 'WEAK', 'HOLLOW']
    vowel_set_perfect: string;    // e.g. "i-e" for kiteb (perfect)
    vowel_set_imperfect: string;  // e.g. "i-e" for kiteb (imperfect/attached)
    vowel_set_imperative: string; // e.g. "i-e" for kiteb (imperative)
    is_inflectable?: boolean;
    usage_example?: string;
    usage_example_en?: string;
    // Full conjugation paradigm (optional — engine auto-generates if absent)
    conjugation?: VerbConjugationTable;
    // Thesaurus
    synonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    antonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    // Related entries from same root
    related_entries?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    // Source citation
    source_citation?: string;
}

export interface NumeralMorphology {
    numeral_type: 'cardinal' | 'ordinal' | 'adverbial' | 'fractional' | 'multiplier' | 'distributive';
    lemma_masc: string;
    lemma_fem: string;
    form_attributive_short?: string;
    form_attributive_long?: string;
    form_opposite?: string;
    inflections_pl?: string[];
    // Common metadata
    synonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    antonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    related_entries?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    morph_pattern?: string; // @deprecated
    lemma_pattern?: string; // @deprecated
    form_fem_pattern?: string;
    form_masc_pattern?: string;
    form_plural_pattern?: string;
    dual_pattern?: string;
    source_citation?: string;
}

export interface AdjectiveMorphology {
    gender?: Gender;
    masculine: string;
    feminine: string;
    plural: string;
    elative?: string;             // "most X" form
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    vowel_set_opp?: string;
    vowel_set_dual?: string;
    // Thesaurus
    synonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    antonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    // Related entries
    related_entries?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;
    morph_pattern?: string; // @deprecated
    lemma_pattern?: string; // @deprecated
    form_fem_pattern?: string;
    form_masc_pattern?: string;
    form_plural_pattern?: string;
    elative_pattern?: string;
    diminutive_pattern?: string;
    dual_pattern?: string;
    source_citation?: string;
    diminutives?: EntryDiminutive[];
}

export interface ZokkMorphology {
    stem_string: string;
    class_type: 'ar' | 'ir';
    is_hybrid: boolean;
    agentive_suffix?: string; // override (ant/ur/ent/itur)
    root?: string;            // the reanalysed root (e.g. k-n-t-j)
}

// ─── Phonetics ─────────────────────────────────────────────────────────────
export interface Phonetic {
    id: string;
    entry_id?: string;
    subentry_id?: string;
    ipa: string;
    dialect?: string;            // e.g. "Standard", "Żejtun", "Valletta"
    notes?: string;
}

// ─── Audio ─────────────────────────────────────────────────────────────────
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

// ─── Lexical Sources & Attestation ────────────────────────────────────────
export interface LexicalSource {
    id: string;
    name: string;              // e.g. "Aquilina"
    full_title: string;
    author?: string;
    year?: number;
    reliability_weight: number; // 0.0 – 1.0
    source_type: 'academic' | 'official' | 'peer_reviewed' | 'crowdsourced' | 'historical';
    url?: string;
}

export interface AttestationScore {
    source_id: string;
    source_name: string;
    reliability_weight: number;
    attested: boolean;          // did this source confirm this entry?
    notes?: string;
    source?: LexicalSource;
}

export interface AttestationReliability {
    id: string;
    entry_id: string;
    reliability_index: number;  // 0–100 computed score
    scores: AttestationScore[];
    computed_at: string;
}

// ─── Etymology ─────────────────────────────────────────────────────────────
export interface EtymologyNode {
    language: SourceLanguage;
    relationship?: string;
    term?: string;              // word form in source language
    pronunciation?: string;
    definition?: string;
    form?: string;
    meaning?: string;
    script?: string;            // e.g. Arabic script version
    time_period?: string;
}

export interface Etymology {
    id: string;
    entry_id: string;
    chain: EtymologyNode[];     // ordered oldest → newest
    notes?: string;
    attestation?: AttestationReliability;
}

// ─── SubEntry ──────────────────────────────────────────────────────────────
export interface SubEntry {
    id: string;
    entry_id: string;
    headword: string;
    pos?: POS;
    definitions: Definition[];
    example_sentences?: ExampleSentence[];
    phonetics?: Phonetic[];
    audio?: AudioFile[];
    tags?: string[];
    sort_order: number;
}

// ─── Definitions & Examples ────────────────────────────────────────────────
export interface Definition {
    id: string;
    sense_number: number;
    text_mt: string;             // Maltese definition
    text_en: string;             // English translation/gloss
    register?: 'formal' | 'informal' | 'archaic' | 'technical' | 'dialectal' | 'colloquial';
    field?: string;              // domain, e.g. "Law", "Medicine"
    example_sentences?: ExampleSentence[];
}

export interface ExampleSentence {
    id: string;
    maltese: string;
    english?: string;
    source?: string;
}

// ─── Dialect Variant ───────────────────────────────────────────────────────
export interface DialectVariant {
    id: string;
    entry_id: string;
    region: string;             // e.g. "Valletta", "Gozo", "Żejtun"
    variant_form: string;
    phonetics?: Phonetic[];
    audio?: AudioFile[];
    notes?: string;
}

// ─── Main Entry ────────────────────────────────────────────────────────────
export interface Entry {
    id: string;
    headword: string;
    pos: POS;
    root_pattern_form_id?: string;
    root_pattern_form?: RootPatternForm;

    // POS-specific morphology (only one will be populated)
    noun_morphology?: NounMorphology;
    verb_morphology?: VerbMorphology;
    adjective_morphology?: AdjectiveMorphology;
    numeral_morphology?: NumeralMorphology;
    zokk_morphology?: ZokkMorphology;
    diminutives?: EntryDiminutive[];

    definitions: Definition[];
    subentries?: SubEntry[];
    phonetics?: Phonetic[];
    audio?: AudioFile[];
    etymologies?: Etymology[];
    dialect_variants?: DialectVariant[];
    alternative_forms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string }>;

    // Flags
    is_loanword: boolean;
    source_language?: SourceLanguage;
    tags?: string[];

    // Unified Normalised Fields
    gender?: string;
    lemma_base?: string;
    inflections_pl?: string[];
    form_fem?: string;
    form_masc?: string;
    morph_pattern?: string; // @deprecated
    dual_form?: string;
    diminutive_form?: string;
    elative_form?: string;
    numeral_type?: string;
    form_attributive_short?: string;
    form_attributive_long?: string;
    form_opposite?: string;
    lemma_pattern?: string; // @deprecated
    form_fem_pattern?: string;
    form_masc_pattern?: string;
    form_plural_pattern?: string;
    diminutive_pattern?: string;
    elative_pattern?: string;
    dual_pattern?: string;
    plural_pattern?: string; // @deprecated
    sound_suffix?: string;

    // Verb specifics (maintained for display logic)
    cv_pattern?: string;
    plural_pattern_verb?: string; // disambiguated from shared plural_pattern if needed, but let's just keep one plural_pattern if possible.

    wizen_notation?: string;
    verb_class?: string;
    verb_weak_class?: string;
    verb_vowel_perf?: string;
    verb_vowel_impf?: string;
    verb_vowel_impv?: string;
    verb_verbal_noun?: string;
    verb_active_ptcp?: string;
    verb_passive_ptcp?: string;
    is_inflectable?: boolean;
    usage_example?: string;
    usage_example_en?: string;
    verb_type?: string;

    // Participle specifics
    participle_type?: 'active' | 'passive';
    participle_gender?: Gender;

    // Noun specifics
    is_collective?: boolean;
    is_singulative?: boolean;

    // Noun/Adj additions for Admin/Display
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    vowel_set_opp?: string;
    vowel_set_dual?: string;

    created_at: string;
    updated_at: string;
}

// ─── User / Auth / Tiers ───────────────────────────────────────────────────
export type Tier = 'basic' | 'pro' | 'enterprise';

export interface User {
    id: string;
    clerk_id: string;
    email: string;
    display_name?: string;
    tier: Tier;
    ads_disabled: boolean;       // paid €2.99 lifetime to disable ads
    audio_unlocked: boolean;     // paid €1.99 lifetime or Pro
    created_at: string;
}

export interface Subscription {
    id: string;
    user_id: string;
    tier: Tier;
    started_at: string;
    expires_at?: string;
    stripe_subscription_id?: string;
    is_lifetime: boolean;
}

export interface ApiKey {
    id: string;
    user_id: string;
    name: string;
    key_prefix: string;          // show first 8 chars only
    usage_count: number;
    rate_limit_per_month: number;
    created_at: string;
    last_used_at?: string;
    is_active: boolean;
}

// ─── Flashcards ────────────────────────────────────────────────────────────
export interface FlashcardList {
    id: string;
    user_id: string;
    name: string;
    entry_ids: string[];
    created_at: string;
    updated_at: string;
}

// ─── Community ─────────────────────────────────────────────────────────────
export interface SuggestedEntry {
    id: string;
    submitted_by_user_id?: string;
    headword: string;
    notes: string;
    status: 'pending' | 'approved' | 'rejected';
    vote_count: number;
    submitted_at: string;
}

export interface Vote {
    id: string;
    user_id: string;
    suggested_entry_id: string;
    value: 1 | -1;
    reason?: string;
    voted_at: string;
}

// ─── Search ────────────────────────────────────────────────────────────────
export type SearchResult = Entry & {
    score?: number;              // relevance score (semantic search)
    match_type?: 'exact' | 'prefix' | 'fulltext' | 'semantic';
    highlight?: string;
    definition_en?: string;
    definition_mt?: string;
};

export interface SearchFilters {
    pos?: POS[];
    source_language?: SourceLanguage[];
    min_reliability?: number;
    tags?: string[];
}

// ─── Chat ──────────────────────────────────────────────────────────────────
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: string;
    dialect?: string;
}

// ─── Blog ──────────────────────────────────────────────────────────────────
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

// ─── Feature gates ─────────────────────────────────────────────────────────
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
