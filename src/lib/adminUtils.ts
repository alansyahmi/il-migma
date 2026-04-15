/**
 * src/lib/adminUtils.ts
 * Shared utilities for parsing and normalizing admin data (glosses, etymologies, etc.)
 */

export interface RootGloss {
    en: string;
    mt: string;
}

export interface EtymologyBaseStep {
    relationship: string;
    language: string;
    term: string;
    definition: string;
}

export interface RootEtymology extends EtymologyBaseStep {}

export interface StemEtymology extends EtymologyBaseStep {}

export interface EntryEtymology extends EtymologyBaseStep {
    pronunciation: string;
}

export type EtymologyStep = RootEtymology | EntryEtymology;

export interface EntryDefinition {
    text_en: string;
    text_mt: string | null;
    register: string;
    nuance: string;
}

export interface RootFormData {
    id?: string;
    consonants: string;
    glosses: RootGloss[];
    etymology: RootEtymology[];
    source: string;
    strength: string;
    weak_class?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_imp?: string;
    is_imala_blocked?: boolean;
    tags?: string; // Comma-separated
    synonyms?: { id: string; headword: string; gloss_en: string; gloss_mt?: string | null }[];
    antonyms?: { id: string; headword: string; gloss_en: string; gloss_mt?: string | null }[];
    related_entries?: { id: string; headword: string; gloss_en: string; gloss_mt?: string | null }[];
}

/**
 * Normalizes a root gloss field into an array of RootGloss objects.
 * Handles JSON strings, single strings, and legacy formats.
 */
export function normalizeRootGloss(gloss: any): RootGloss[] {
    if (!gloss) return [{ en: '', mt: '' }];

    // If it's already an array of objects, return it (but filter out bad objects)
    if (Array.isArray(gloss) && typeof gloss[0] === 'object' && gloss[0] !== null) {
        return gloss.map(g => ({
            en: String(g.en || ''),
            mt: String(g.mt || '')
        }));
    }

    try {
        const parsed = typeof gloss === 'string' ? JSON.parse(gloss) : gloss;

        if (Array.isArray(parsed)) {
            if (typeof parsed[0] === 'object' && parsed[0] !== null) {
                return parsed.map(g => ({
                    en: String(g.en || ''),
                    mt: String(g.mt || '')
                }));
            }
            // Handle array of strings
            return parsed.map(s => ({ en: String(s), mt: '' }));
        }

        if (typeof parsed === 'object' && parsed !== null) {
            return [{ en: String(parsed.en || ''), mt: String(parsed.mt || '') }];
        }

        return [{ en: String(parsed), mt: '' }];
    } catch (e) {
        // Fallback for non-JSON strings
        return [{ en: String(gloss), mt: '' }];
    }
}

/**
 * Normalizes an etymology field into a RootEtymology object.
 */
export function normalizeRootEtymology(ety: any): RootEtymology {
    return normalizeEtymologyChain(ety, 'From', false)[0] as RootEtymology;
}

export function normalizeRootEtymologyChain(ety: any): RootEtymology[] {
    return normalizeEtymologyChain(ety, 'From', false) as RootEtymology[];
}

/**
 * Normalizes root relationship fields (synonyms, antonyms, related_entries).
 */
export function normalizeRootRelationships(rel: any): any[] {
    if (!rel) return [];

    try {
        const parsed = typeof rel === 'string' ? JSON.parse(rel) : rel;
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

export interface StemMorphology {
    stem_string: string;
    class_type: 'ar' | 'ir';
    is_hybrid: boolean;
    root: string | null;
    agentive_suffix: string | null;
}

export interface StemGloss {
    en: string;
    mt: string;
}

export interface StemFormData extends StemMorphology {
    tags?: string; // comma separated
    source?: string;
    glosses: StemGloss[];
    etymology: StemEtymology[];
    synonyms: any[];
    antonyms: any[];
    related_stems: any[];
}

/**
 * Normalizes stem morphology JSON into a typed object.
 */
export function normalizeStemMorphology(zokk: any, defaultStem = ''): StemMorphology {
    const defaultVal: StemMorphology = {
        stem_string: defaultStem,
        class_type: 'ar',
        is_hybrid: false,
        root: null,
        agentive_suffix: null
    };

    if (!zokk) return defaultVal;

    try {
        const parsed = typeof zokk === 'string' ? JSON.parse(zokk) : zokk;
        if (typeof parsed !== 'object' || parsed === null) return defaultVal;

        return {
            stem_string: String(parsed.stem_string || defaultStem),
            class_type: (parsed.class_type === 'ir' ? 'ir' : 'ar'),
            is_hybrid: !!parsed.is_hybrid,
            root: parsed.root ? String(parsed.root) : null,
            agentive_suffix: parsed.agentive_suffix ? String(parsed.agentive_suffix) : null
        };
    } catch (e) {
        return defaultVal;
    }
}

export function normalizeStemGloss(gloss: any): StemGloss[] {
    if (!gloss) return [{ en: '', mt: '' }];
    if (Array.isArray(gloss) && typeof gloss[0] === 'object' && gloss[0] !== null) {
        return gloss.map(g => ({
            en: String(g.en || ''),
            mt: String(g.mt || '')
        }));
    }
    try {
        const parsed = typeof gloss === 'string' ? JSON.parse(gloss) : gloss;
        if (Array.isArray(parsed)) {
            if (typeof parsed[0] === 'object' && parsed[0] !== null) {
                return parsed.map(g => ({ en: String(g.en || ''), mt: String(g.mt || '') }));
            }
            return parsed.map(s => ({ en: String(s), mt: '' }));
        }
    } catch { }
    return [{ en: String(gloss), mt: '' }];
}

export function normalizeStemEtymology(ety: any): StemEtymology {
    return normalizeEtymologyChain(ety, 'From', false)[0] as StemEtymology;
}

export function normalizeStemEtymologyChain(ety: any): StemEtymology[] {
    return normalizeEtymologyChain(ety, 'From', false) as StemEtymology[];
}

export function normalizeEntryEtymology(ety: any): EntryEtymology {
    return normalizeEtymologyChain(ety, 'From', true)[0] as EntryEtymology;
}

export function normalizeEntryEtymologyChain(ety: any): EntryEtymology[] {
    return normalizeEtymologyChain(ety, 'From', true) as EntryEtymology[];
}

function splitDefinitionText(value: any): string[] {
    if (value === undefined || value === null) return [''];

    const normalized = String(value);
    if (!normalized.trim()) return [''];

    const parts = normalized
        .split(/\s*;\s*/)
        .filter(Boolean);

    return parts.length > 0 ? parts : [''];
}

function normalizeNullableText(value: any): string | null {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized ? normalized : null;
}

function normalizeEntryDefinition(def: any): EntryDefinition[] {
    const textEnParts = splitDefinitionText(def?.text_en ?? def?.definition_en ?? def?.gloss_en ?? def?.text ?? def?.en);
    const textMtParts = splitDefinitionText(def?.text_mt ?? def?.definition_mt ?? def?.gloss_mt ?? def?.mt);
    const register = String(def?.register ?? def?.sense_register ?? '').trim();
    const nuance = String(def?.nuance ?? '').trim();
    const count = Math.max(textEnParts.length, textMtParts.length);

    if (count <= 1) {
        return [{
            text_en: textEnParts[0] || '',
            text_mt: normalizeNullableText(textMtParts[0]),
            register,
            nuance,
        }];
    }

    return Array.from({ length: count }, (_, index) => ({
        text_en: textEnParts[index] || '',
        text_mt: normalizeNullableText(textMtParts[index]),
        register,
        nuance,
    }));
}

export function normalizeEntryDefinitions(definitions: any): EntryDefinition[] {
    if (!definitions) {
        return [{ text_en: '', text_mt: null, register: '', nuance: '' }];
    }

    try {
        const parsed = typeof definitions === 'string' ? JSON.parse(definitions) : definitions;
        const items = Array.isArray(parsed) ? parsed : [parsed];
        const normalized = items.flatMap(item => normalizeEntryDefinition(item)).filter(item =>
            item.text_en.trim() || (item.text_mt?.trim() ?? '') || item.register || item.nuance
        );

        return normalized.length > 0
            ? normalized
            : [{ text_en: '', text_mt: null, register: '', nuance: '' }];
    } catch {
        const normalized = normalizeEntryDefinition({ text_en: definitions });
        return normalized.length > 0
            ? normalized
            : [{ text_en: '', text_mt: null, register: '', nuance: '' }];
    }
}

export function normalizeStemTags(tags: any): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map(t => String(t)).filter(Boolean);
    if (typeof tags === 'string') {
        const trimmed = tags.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed.map(t => String(t)).filter(Boolean);
            } catch { }
        }
        return trimmed.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
}

export function normalizeStemRelationships(rel: any): any[] {
    if (!rel) return [];
    try {
        const parsed = typeof rel === 'string' ? JSON.parse(rel) : rel;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function normalizeEtymologyStep(ety: any, defaultRelationship: string, includePronunciation: boolean): EtymologyStep {
    const fallback: EtymologyBaseStep = {
        relationship: defaultRelationship,
        language: '',
        term: '',
        definition: '',
    };

    if (!ety) return fallback;

    const pick = (source: Record<string, any>, keys: string[]) => {
        for (const key of keys) {
            const value = source?.[key];
            if (value === undefined || value === null) continue;
            const normalized = String(value).trim();
            if (normalized) return normalized;
        }
        return '';
    };

    try {
        const parsed = typeof ety === 'string' ? JSON.parse(ety) : ety;

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const normalized: EtymologyBaseStep = {
                relationship: pick(parsed, ['relationship', 'relation', 'type']) || defaultRelationship,
                language: pick(parsed, ['language', 'source_language', 'sourceLanguage', 'origin_language', 'originLanguage']),
                term: pick(parsed, ['term', 'form', 'word', 'source_term', 'sourceTerm', 'source_form', 'sourceForm']),
                definition: pick(parsed, ['definition', 'meaning', 'gloss', 'translation', 'text']),
            };

            if (includePronunciation) {
                return {
                    ...normalized,
                    pronunciation: pick(parsed, ['pronunciation', 'ipa', 'transcription', 'phonetic', 'reading']),
                } as EntryEtymology;
            }

            return normalized;
        }

        return { ...fallback, definition: String(parsed) };
    } catch {
        return { ...fallback, definition: String(ety) };
    }
}

export function normalizeEtymologyChain(ety: any, defaultRelationship: string, includePronunciation = false): EtymologyBaseStep[] | EntryEtymology[] {
    if (!ety) {
        return [normalizeEtymologyStep(null, defaultRelationship, includePronunciation)];
    }

    try {
        const parsed = typeof ety === 'string' ? JSON.parse(ety) : ety;

        if (Array.isArray(parsed)) {
            const normalized = parsed.map(step => normalizeEtymologyStep(step, defaultRelationship, includePronunciation));
            return normalized.length > 0 ? normalized : [normalizeEtymologyStep(null, defaultRelationship, includePronunciation)];
        }

        return [normalizeEtymologyStep(parsed, defaultRelationship, includePronunciation)];
    } catch {
        return [normalizeEtymologyStep(ety, defaultRelationship, includePronunciation)];
    }
}
