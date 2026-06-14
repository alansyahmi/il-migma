import type { Entry } from '../types/index.ts';
import { normalizePluralContract, pluralRowsToLegacyForms } from './pluralForms.ts';
import { normalizeEntryPos } from './entryId.ts';

export const NOUN_MORPHOLOGY_DB_FIELD_KEYS = [
    'gender', 'noun_type', 'singular_form', 'plural_forms', 'sound_plural',
    'verbal_form',
    'dual_form', 'diminutive_form', 'collective_form', 'singulative_form',
    'paucal_form', 'augmentative_form', 'paucal_pattern', 'augmentative_pattern',
    'feminine_form', 'masculine_form', 'is_collective', 'is_singulative',
    'is_inflectable_singular', 'is_inflectable_plural',
    'vowel_set_sg', 'vowel_set_opp', 'vowel_set_dual',
    'vowel_set_pl', 'form_plural_pattern', 'form_fem_pattern', 'form_masc_pattern',
    'dual_pattern', 'diminutive_pattern', 'morph_pattern'
];

export const NOUN_MORPHOLOGY_LEGACY_FIELDS = {
};

export function isNounLikePos(pos: unknown): boolean {
    const normalized = normalizeEntryPos(pos);
    return normalized === 'noun' || normalized === 'pronoun' || normalized === 'preposition' || normalized === 'conjunction' || normalized === 'particle' || normalized === 'interjection';
}

export function hasNounMorphologyInput(source: any): boolean {
    if (!source) return false;
    if (!isNounLikePos(source.pos)) return false;
    const src = source.noun_morphology || source.nm || source;
    const hasSplitInflectableFlags =
        Object.prototype.hasOwnProperty.call(src, 'is_inflectable_singular') ||
        Object.prototype.hasOwnProperty.call(src, 'is_inflectable_plural');
    return !!(
        src.gender || src.noun_type || src.singular_form || src.verbal_form ||
        src.plural_forms || src.sound_plural || src.dual_form || 
        src.diminutive_form || src.feminine_form || src.masculine_form ||
        src.collective_form || src.singulative_form ||
        src.paucal_form || src.augmentative_form ||
        src.is_collective || src.is_singulative ||
        hasSplitInflectableFlags ||
        src.vowel_set_sg || src.vowel_set_pl || src.vowel_set_opp || src.vowel_set_dual ||
        src.form_plural_pattern || src.form_fem_pattern || src.form_masc_pattern ||
        src.dual_pattern || src.diminutive_pattern || src.morph_pattern ||
        src.form_fem || src.form_masc
    );
}

export function shouldUseFeminineBaseForPlural(pattern?: string | null, pluralForm?: string | null): boolean {
    const normalizedPattern = String(pattern || '').trim().toLowerCase().replace(/^[-\s]+/, '');
    const normalizedPluralForm = String(pluralForm || '').trim().toLowerCase();
    const isSuffixPluralPattern = normalizedPattern === 'a' || normalizedPattern === 'ie';
    const looksLikeSuffixPlural = normalizedPluralForm.endsWith('a') || normalizedPluralForm.endsWith('ie');
    return isSuffixPluralPattern && looksLikeSuffixPlural;
}

export function resolvePluralInflectionBase(
    pluralForm?: string | null,
    pattern?: string | null,
    feminineForm?: string | null,
): { base: string; gender: 'masculine' | 'feminine' } {
    const normalizedPluralForm = String(pluralForm || '').trim();
    const normalizedFeminineForm = String(feminineForm || '').trim();

    if (shouldUseFeminineBaseForPlural(pattern, normalizedPluralForm)) {
        return { base: normalizedFeminineForm || normalizedPluralForm, gender: 'feminine' };
    }

    return { base: normalizedPluralForm, gender: 'masculine' };
}

export function buildNounMorphologyRecord(entry: Partial<Entry> | null, source: any) {
    const entryId = entry?.id || source?.entry_id || source?.id;
    const normalized = normalizeNounMorphologyInput(source?.noun_morphology || source);
    
    return {
        entry_id: entryId,
        ...normalized,
        updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    };
}

export function applyNounMorphologyCompatibility(target: any, entry: Partial<Entry>, source: any) {
    const src = source?.noun_morphology || source;
    if (!hasNounMorphologyInput(src)) return target;

    const normalized = normalizeNounMorphologyInput(src);
    const pluralRows = normalizePluralContract(
        normalized.plural_forms,
        normalized.form_plural_pattern,
    ).rows;
    target.noun_morphology = {
        gender: normalized.gender || entry.gender,
        noun_type: normalized.noun_type,
        verbal_form: normalized.verbal_form,
        singular_form: normalized.singular_form,
        plural_forms: pluralRowsToLegacyForms(pluralRows),
        sound_plural: normalized.sound_plural,
        dual_form: normalized.dual_form,
        diminutive_form: normalized.diminutive_form,
        collective_form: normalized.collective_form,
        singulative_form: normalized.singulative_form,
        paucal_form: normalized.paucal_form,
        augmentative_form: normalized.augmentative_form,
        paucal_pattern: normalized.paucal_pattern,
        augmentative_pattern: normalized.augmentative_pattern,
        feminine_form: normalized.feminine_form,
        masculine_form: normalized.masculine_form,
        form_fem: normalized.feminine_form, // Type-safe alias
        form_masc: normalized.masculine_form, // Type-safe alias
        is_collective: normalized.is_collective === 1,
        is_singulative: normalized.is_singulative === 1,
        is_inflectable_singular: normalized.is_inflectable_singular === 1,
        is_inflectable_plural: normalized.is_inflectable_plural === 1,
        vowel_set_sg: normalized.vowel_set_sg,
        vowel_set_opp: normalized.vowel_set_opp,
        vowel_set_dual: normalized.vowel_set_dual,
        vowel_set_pl: normalized.vowel_set_pl,
        form_plural_pattern: normalized.form_plural_pattern,
        form_fem_pattern: normalized.form_fem_pattern,
        form_masc_pattern: normalized.form_masc_pattern,
        dual_pattern: normalized.dual_pattern,
        diminutive_pattern: normalized.diminutive_pattern,
        morph_pattern: normalized.morph_pattern,
        pattern: normalized.form_masc_pattern || normalized.form_fem_pattern || normalized.morph_pattern || null,
    };

    if (target.noun_morphology.gender) target.gender = target.noun_morphology.gender;
    
    return target;
}

export function normalizeNounMorphologyInput(source: any) {
    if (!source) return {};
    const result: any = {};
    
    // Map canonical fields
    for (const key of NOUN_MORPHOLOGY_DB_FIELD_KEYS) {
        if (source[key] !== undefined) {
            let val = source[key];
            if (key.startsWith('is_')) val = val ? 1 : 0;
            result[key] = val;
        }
    }

    if (source.form_fem !== undefined && result.feminine_form === undefined) result.feminine_form = source.form_fem;
    if (source.form_masc !== undefined && result.masculine_form === undefined) result.masculine_form = source.form_masc;
    const pluralContract = normalizePluralContract(
        source.plural_forms,
        source.form_plural_pattern,
        source.plural_form,
        source.form_plural_pattern,
    );
    if (
        pluralContract.rows.length > 0 ||
        source.plural_forms !== undefined ||
        source.plural_form !== undefined
    ) {
        result.plural_forms = JSON.stringify(pluralContract.rows);
    }

    return result;
}

export async function ensureNounMorphologyTable(client: any, options: { backfill?: boolean } = {}) {
    const info = await client.execute("PRAGMA table_info(noun_morphology)");
    if (info.rows.length === 0) {
        await client.execute(`
            CREATE TABLE noun_morphology (
                entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
                gender TEXT,
                noun_type TEXT,
                verbal_form TEXT,
                singular_form TEXT,
                plural_forms TEXT,
                sound_plural TEXT,
                dual_form TEXT,
                diminutive_form TEXT,
                collective_form TEXT,
                singulative_form TEXT,
                paucal_form TEXT,
                augmentative_form TEXT,
                paucal_pattern TEXT,
                augmentative_pattern TEXT,
                feminine_form TEXT,
                masculine_form TEXT,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                is_collective INTEGER DEFAULT 0,
                is_singulative INTEGER DEFAULT 0,
                is_inflectable_singular INTEGER DEFAULT 0,
                is_inflectable_plural INTEGER DEFAULT 0,
                vowel_set_sg TEXT,
                vowel_set_opp TEXT,
                vowel_set_dual TEXT,
                vowel_set_pl TEXT,
                form_plural_pattern TEXT,
                form_fem_pattern TEXT,
                form_masc_pattern TEXT,
                dual_pattern TEXT,
                diminutive_pattern TEXT,
                morph_pattern TEXT
            )
        `);
    } else {
        // Add missing columns
        const existingColumns = new Set(info.rows.map((r: any) => (r.name || r[1])));
        const requiredColumns = [
            ['is_collective', 'INTEGER DEFAULT 0'],
            ['is_singulative', 'INTEGER DEFAULT 0'],
            ['is_inflectable_singular', 'INTEGER DEFAULT 0'],
            ['is_inflectable_plural', 'INTEGER DEFAULT 0'],
            ['verbal_form', 'TEXT'],
            ['vowel_set_sg', 'TEXT'],
            ['vowel_set_opp', 'TEXT'],
            ['vowel_set_dual', 'TEXT'],
            ['vowel_set_pl', 'TEXT'],
            ['form_plural_pattern', 'TEXT'],
            ['form_fem_pattern', 'TEXT'],
            ['form_masc_pattern', 'TEXT'],
            ['dual_pattern', 'TEXT'],
            ['diminutive_pattern', 'TEXT'],
            ['morph_pattern', 'TEXT'],
            ['feminine_form', 'TEXT'],
            ['masculine_form', 'TEXT'],
        ];

        for (const [col, type] of requiredColumns) {
            if (!existingColumns.has(col)) {
                try {
                    await client.execute(`ALTER TABLE noun_morphology ADD COLUMN ${col} ${type}`);
                } catch (e: unknown) {
                    console.warn(`Could not add column ${col} to noun_morphology:`, e instanceof Error ? e.message : String(e));
                }
            }
        }
    }


    if (options.backfill) {
        // Legacy noun backfill has been retired.
        // Canonical noun data is expected to be written through noun_morphology directly.
    }
}

export async function syncNounMorphology(client: any, entryId: string, body: any) {
    if (!hasNounMorphologyInput(body)) return;

    const record = buildNounMorphologyRecord({ id: entryId }, body);
    const cols = Object.keys(record);
    const vals = Object.values(record);
    const placeholders = cols.map(() => '?').join(', ');

    await client.execute({
        sql: `INSERT OR REPLACE INTO noun_morphology (${cols.join(', ')}) VALUES (${placeholders})`,
        args: vals
    });
}
