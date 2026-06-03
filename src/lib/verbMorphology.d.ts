export const VERB_MORPHOLOGY_TABLE: string;
export const VERB_MORPHOLOGY_DB_COLUMNS: readonly string[];
export const VERB_MORPHOLOGY_DB_FIELD_KEYS: readonly string[];
export const VERB_MORPHOLOGY_LEGACY_FIELDS: Record<string, string>;

export interface VerbMorphologyInput {
    form?: string | null;
    class?: string | null;
    weak_class?: string | null;
    transitivity?: string | null;
    perfective_3sgm?: string | null;
    imperfective_3sgm?: string | null;
    verbal_noun?: string | null;
    active_participle?: string | null;
    passive_participle?: string | null;
    vowel_set_perf?: string | null;
    vowel_set_impf?: string | null;
    vowel_set_impv?: string | null;
    type?: string | null;
}

export interface VerbMorphologyRecord extends VerbMorphologyInput {
    entry_id: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface VerbMorphologyResponse {
    transitivity: string;
    perfective_3sg_m: string;
    imperfective_3sg_m: string;
    verbal_noun?: string;
    active_participle?: string;
    passive_participle?: string;
    form: string;
    verb_class?: string | null;
    weak_class?: string | null;
    root_tags?: string[];
    vowel_set_perfect: string;
    vowel_set_imperfect: string;
    vowel_set_imperative: string;
    usage_example?: string;
    usage_example_en?: string;
    synonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string | null }>;
    antonyms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string | null }>;
    related_entries?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string | null }>;
    alternative_forms?: Array<{ headword: string; id: string; gloss_en?: string; gloss_mt?: string | null }>;
    source_citation?: string | null;
    source_title?: string | null;
    source_year?: string | null;
    source_page?: string | null;
    source_publisher?: string | null;
    source_display?: string;
    source_tooltip?: string;
}

export function hasVerbMorphologyInput(source?: any): boolean;
export function normalizeVerbMorphologyInput(source?: any): VerbMorphologyInput;
export function buildVerbMorphologyRecord(entry?: any, source?: any): VerbMorphologyRecord;
export function buildVerbMorphologyResponse(entry?: any, source?: any, extras?: any): VerbMorphologyResponse;
export function applyVerbMorphologyCompatibility(target?: any, entry?: any, source?: any, extras?: any): any;
export function ensureVerbMorphologyTable(client: any, options?: { backfill?: boolean }): Promise<void>;
export function syncVerbMorphology(client: any, entryId: string, body?: any, fallbackHeadword?: string): Promise<void>;
