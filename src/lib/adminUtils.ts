/**
 * src/lib/adminUtils.ts
 * Shared utilities for parsing and normalizing admin data (glosses, etymologies, etc.)
 */

export interface RootGloss {
    en: string;
    mt: string;
}

export interface RootEtymology {
    relationship: string;
    language: string;
    term: string;
    pronunciation: string;
    definition: string;
}

export interface RootFormData {
    id?: string;
    consonants: string;
    glosses: RootGloss[];
    etymology: RootEtymology;
    source: string;
    strength: string;
    weak_class?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_imp?: string;
    is_imala_blocked?: boolean;
    tags?: string; // Comma-separated
    synonyms?: { id: string; headword: string; gloss_en: string; gloss_mt?: string }[];
    antonyms?: { id: string; headword: string; gloss_en: string; gloss_mt?: string }[];
    related_entries?: { id: string; headword: string; gloss_en: string; gloss_mt?: string }[];
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
    return normalizeEtymologyShape(ety, 'From');
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

export interface StemEtymology {
    relationship: string;
    language: string;
    term: string;
    pronunciation: string;
    definition: string;
}

export interface StemFormData extends StemMorphology {
    tags?: string; // comma separated
    source?: string;
    glosses: StemGloss[];
    etymology: StemEtymology;
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
    return normalizeEtymologyShape(ety, 'From');
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

function normalizeEtymologyShape(ety: any, defaultRelationship: string): RootEtymology {
    const fallback: RootEtymology = {
        relationship: defaultRelationship,
        language: '',
        term: '',
        pronunciation: '',
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
            return {
                relationship: pick(parsed, ['relationship', 'relation', 'type']) || defaultRelationship,
                language: pick(parsed, ['language', 'source_language', 'sourceLanguage', 'origin_language', 'originLanguage']),
                term: pick(parsed, ['term', 'form', 'word', 'source_term', 'sourceTerm', 'source_form', 'sourceForm']),
                pronunciation: pick(parsed, ['pronunciation', 'ipa', 'transcription', 'phonetic', 'reading']),
                definition: pick(parsed, ['definition', 'meaning', 'gloss', 'translation', 'text']),
            };
        }

        return { ...fallback, definition: String(parsed) };
    } catch {
        return { ...fallback, definition: String(ety) };
    }
}
