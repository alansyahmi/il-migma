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
    const defaultEty = {
        relationship: 'From',
        language: '',
        term: '',
        pronunciation: '',
        definition: ''
    };

    if (!ety) return defaultEty;

    try {
        const parsed = typeof ety === 'string' ? JSON.parse(ety) : ety;

        if (typeof parsed === 'object' && parsed !== null) {
            return {
                relationship: String(parsed.relationship || 'From'),
                language: String(parsed.language || ''),
                term: String(parsed.term || ''),
                pronunciation: String(parsed.pronunciation || ''),
                definition: String(parsed.definition || parsed.meaning || '')
            };
        }

        // Handle legacy string definition
        return { ...defaultEty, definition: String(parsed) };
    } catch (e) {
        return { ...defaultEty, definition: String(ety) };
    }
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
