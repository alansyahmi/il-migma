/**
 * src/lib/adminSchema.ts
 * Single source of truth for admin data field definitions and payload construction.
 */

import type { RootFormData } from './adminUtils';

// ── ROOTS ───────────────────────────────────────────────────────────────────

/** Fields explicitly handled by the RootFormModal */
export const ROOT_HANDLED_FIELDS = [
    'id', 'consonants', 'consonant_array', 'strength', 'weak_class',
    'gloss', 'etymology', 'source', 'notes', 'vowel_set_perf',
    'vowel_set_impf', 'vowel_set_imp', 'tags', 'synonyms', 'antonyms',
    'related_entries', 'created_at', 'updated_at', 'hidden_forms', 'is_imala_blocked'
] as const;

/** Builds the root API payload, serializing complex fields to JSON */
export function buildRootPayload(form: RootFormData): Record<string, any> {
    return {
        id: form.id,
        consonants: form.consonants.trim().toLowerCase(),
        strength: form.strength,
        weak_class: form.weak_class || '',
        gloss: JSON.stringify(form.glosses.filter(g => g.en || g.mt)),
        etymology: JSON.stringify(form.etymology),
        source: form.source,
        vowel_set_perf: form.vowel_set_perf,
        vowel_set_impf: form.vowel_set_impf,
        vowel_set_imp: form.vowel_set_imp,
        tags: JSON.stringify(form.tags?.split(',').map(s => s.trim()).filter(Boolean) || []),
        synonyms: JSON.stringify(form.synonyms || []),
        antonyms: JSON.stringify(form.antonyms || []),
        related_entries: JSON.stringify(form.related_entries || []),
        is_imala_blocked: !!form.is_imala_blocked ||
            form.vowel_set_perf === 'a-a' ||
            form.vowel_set_impf === 'a-a' ||
            form.vowel_set_imp === 'a-a' ||
            /[\u0127q]|g\u0127|h/i.test(form.consonants),
    };
}

// ── ENTRIES ─────────────────────────────────────────────────────────────────

/** Fields explicitly handled by the EntryFormModal */
export const ENTRY_HANDLED_FIELDS = [
    'id', 'headword', 'pos', 'noun_gender', 'noun_singular', 'noun_plural_forms',
    'noun_sound_plural', 'noun_dual', 'noun_type', 'verb_class', 'verb_transitivity',
    'verb_perfective_3sgm', 'verb_imperfective_3sgm', 'verb_verbal_noun', 'verb_vowel_perf',
    'verb_vowel_impf', 'verb_vowel_impv', 'verb_active_ptcp', 'verb_passive_ptcp',
    'adj_masculine', 'adj_feminine', 'adj_plural', 'adj_comparative', 'adj_gender', 'participle_type', 'is_loanword',
    'source_language', 'definitions', 'etymology_chain', 'phonetics', 'tags',
    'cv_pattern', 'plural_pattern', 'sound_suffix', 'adj_pattern', 'noun_feminine',
    'noun_masculine', 'synonyms', 'antonyms', 'related_entries', 'created_at', 'updated_at',
    'root_consonants', 'verb_form', 'root_pattern_form_id', 'verb_weak_class'
] as const;

/** Internal-only UI fields that should be stripped from the payload */
export const ENTRY_PRIVATE_FIELDS = [
    '_rootConsonants', '_formLabel', '_hasDual', '_pluralType', '_adjPluralType', '_weakClass',
] as const;

/** 
 * Builds the entry API payload.
 * Strips private fields and serializes arrays/objects correctly.
 */
export function buildEntryPayload(form: any): Record<string, any> {
    const payload: Record<string, any> = { ...form };

    // Strip private fields
    ENTRY_PRIVATE_FIELDS.forEach(f => {
        delete payload[f];
    });

    // Map special UI-only fields back to DB names if needed
    // In this case, modal uses form._formLabel -> payload.verb_form
    // and form._rootConsonants -> payload.root_consonants
    // and form._weakClass -> payload.verb_weak_class
    payload.verb_form = form._formLabel;
    payload.root_consonants = form._rootConsonants;
    payload.verb_weak_class = form._weakClass || null;

    // Normalization of complex fields
    payload.noun_singular = form.pos === 'noun' ? (form.noun_singular || form.headword) : form.noun_singular;

    // Convert comma-separated strings to arrays
    if (typeof form.noun_plural_forms === 'string') {
        payload.noun_plural_forms = form.noun_plural_forms.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (typeof form.tags === 'string') {
        payload.tags = form.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Ensure boolean -> boolean (api handles 0/1)
    payload.is_loanword = !!form.is_loanword;

    return payload;
}

// ── SHARED ──────────────────────────────────────────────────────────────────

/** Shared null normalizer for DB consistency */
export function n(val: unknown): unknown {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}
