import { generateNumeralForms, type NumeralAutoForms } from './maltesePhonology.ts';
import { stripTheoreticalPrefix } from './theoreticalForms.ts';

// Numeral morphology logic
export interface NumeralDerivedFieldState {
    numeral_type?: string;
    form_attributive_short?: string;
    form_attributive_long?: string;
    form_attributive_short_pattern?: string;
}

export type NumeralSurfaceMarker = 'plain' | 'theoretical' | 'auto_generated';

export interface NumeralSurfaceValue {
    value: string;
    marker: NumeralSurfaceMarker;
    entryId?: string;
    pattern?: string | null;
}

export interface NumeralDisplayForms {
    ordinal: NumeralSurfaceValue[];
    adverbial: NumeralSurfaceValue[];
    fractional: NumeralSurfaceValue[];
    multiplier: NumeralSurfaceValue[];
    distributive: NumeralSurfaceValue[];
    attributive_short: NumeralSurfaceValue[];
    attributive_long: NumeralSurfaceValue[];
}

type LinkedNumeralEntry = {
    id?: string;
    headword?: string | null;
    cv_pattern?: string | null;
    pattern?: string | null;
    form_attributive_short_pattern?: string | null;
    form_plural_pattern?: string | null;
    morph_pattern?: string | null;
    lemma_pattern?: string | null;
    form_masc_pattern?: string | null;
    form_fem_pattern?: string | null;
    numeral_morphology?: {
        form_attributive_short_pattern?: string | null;
        form_plural_pattern?: string | null;
        morph_pattern?: string | null;
        lemma_pattern?: string | null;
        form_masc_pattern?: string | null;
        form_fem_pattern?: string | null;
        pattern?: string | null;
    } | null;
    root_pattern_form?: {
        pattern?: {
            cv_notation?: string | null;
        } | null;
    } | null;
};

type CanonicalNumeralOverrides = {
    auto?: Partial<NumeralAutoForms>;
    display?: Partial<Record<keyof NumeralDisplayForms, string[]>>;
};

const NUMERAL_RELATED_HEADWORDS: Record<string, string[]> = {
    wieħed: ['ewwel'],
    ewwel: ['wieħed'],
    tlieta: ['tielet'],
    tielet: ['tlieta'],
    erbgħa: ["raba'"],
    "raba'": ['erbgħa'],
};

const NUMERAL_DISPLAY_FORMS: Record<string, Partial<Record<keyof NumeralDisplayForms, string[]>>> = {
    wieħed: {
        ordinal: ['ewwel'],
        adverbial: ['darba'],
        fractional: [],
        multiplier: ['uniku', 'fard', '*mwaħħad'],
        distributive: ['*uħied', 'uħud', 'frad', 'frud'],
    },
    tlieta: {
        ordinal: ['tielet'],
    },
    erbgħa: {
        ordinal: ["raba'"],
    },
};

const NUMERAL_CANONICAL_OVERRIDES: Record<string, CanonicalNumeralOverrides> = {
    wieħed: {
        auto: {
            ordinal: 'ewwel',
            adverbial: 'darba',
        },
        display: {
            ordinal: ['ewwel'],
            adverbial: ['darba'],
            fractional: [],
        },
    },
    tnejn: {
        auto: {
            ordinal: 'tieni',
            adverbial: 'darbtejn',
            fractional_semitic: 'nofs',
            attributive_short: 'żewġ',
            attributive_long: 'żewġt',
        },
        display: {
            ordinal: ['tieni'],
            adverbial: ['darbtejn'],
            fractional: ['nofs'],
        },
    },
    tlieta: {
        auto: {
            ordinal: 'tielet',
            adverbial: 'tliet darbiet',
            fractional_semitic: 'terz',
            attributive_short: 'tliet',
            attributive_long: 'tlitt',
        },
        display: {
            ordinal: ['tielet'],
            adverbial: ['tliet darbiet'],
            fractional: ['terz'],
        },
    },
    erbgħa: {
        auto: {
            ordinal: "raba'",
            adverbial: "erba' darbiet",
            fractional_semitic: 'kwart',
            attributive_short: "erba'",
            attributive_long: 'erbat',
        },
        display: {
            ordinal: ["raba'"],
            adverbial: ["erba' darbiet"],
            fractional: ['kwart'],
        },
    },
    ħamsa: {
        auto: {
            ordinal: 'ħames',
            adverbial: 'ħames darbiet',
            fractional_semitic: 'kwint',
            attributive_short: 'ħames',
            attributive_long: 'ħamest',
        },
        display: {
            ordinal: ['ħames'],
            adverbial: ['ħames darbiet'],
            fractional: ['kwint'],
        },
    },
    sitta: {
        auto: {
            ordinal: 'sitt',
            adverbial: 'sitt darbiet',
            attributive_short: 'sitt',
            attributive_long: 'sitt',
        },
        display: {
            ordinal: ['sitt'],
            adverbial: ['sitt darbiet'],
            fractional: [],
        },
    },
    sebgħa: {
        auto: {
            ordinal: "seba'",
            adverbial: "seba' darbiet",
            attributive_short: "seba'",
            attributive_long: 'sebat',
        },
        display: {
            ordinal: ["seba'"],
            adverbial: ["seba' darbiet"],
            fractional: [],
        },
    },
    tmienja: {
        auto: {
            ordinal: 'tmien',
            adverbial: 'tmien darbiet',
            attributive_short: 'tmien',
            attributive_long: 'tmint',
        },
        display: {
            ordinal: ['tmien'],
            adverbial: ['tmien darbiet'],
            fractional: [],
        },
    },
    disgħa: {
        auto: {
            ordinal: "disa'",
            adverbial: "disa' darbiet",
            attributive_short: "disa'",
            attributive_long: 'disat',
        },
        display: {
            ordinal: ["disa'"],
            adverbial: ["disa' darbiet"],
            fractional: [],
        },
    },
    għaxra: {
        auto: {
            ordinal: 'għaxar',
            adverbial: 'għaxar darbiet',
            attributive_short: 'għaxar',
            attributive_long: 'għaxart',
        },
        display: {
            ordinal: ['għaxar'],
            adverbial: ['għaxar darbiet'],
            fractional: [],
        },
    },
};

const SUPPLETIVE_NUMERAL_FAMILY_ALIASES: Record<string, string> = {
    ewwel: 'wieħed',
};

const NUMERAL_MASC_SHORT_ATTRIBUTIVE_EXCEPTIONS = new Set([
    'wieħed',
    'ewwel',
    'tieni',
    'it-tnejn',
    "it-tnejn",
    'it-tieni',
]);

export function shouldSuppressNumeralAttributiveForms(headword: string): boolean {
    const normalizedHeadword = normalizeNumeralLookupKey(headword);
    return !!normalizedHeadword && NUMERAL_MASC_SHORT_ATTRIBUTIVE_EXCEPTIONS.has(normalizedHeadword);
}

export function buildNumeralAutoForms(headword: string, rootConsonants: string): NumeralAutoForms {
    const forms = generateNumeralForms(headword, rootConsonants);
    const override = NUMERAL_CANONICAL_OVERRIDES[normalizeNumeralLookupKey(headword)];
    if (override?.auto) {
        Object.assign(forms, override.auto);
    }
    if (shouldSuppressNumeralAttributiveForms(headword)) {
        (forms as any).attributive_short = null;
        (forms as any).attributive_long = null;
    }
    return forms;
}

export function getNumeralShortAttributiveRowLabel(): string {
    return 'Short-Attributive (Masculine)';
}

export function shouldCombineMasculineAndShortAttributive(headword: string): boolean {
    return !shouldSuppressNumeralAttributiveForms(headword);
}

export function getNumeralRelatedHeadwords(headword: string): string[] {
    const normalizedHeadword = normalizeNumeralLookupKey(headword);
    if (!normalizedHeadword) return [];

    return Array.from(new Set([
        normalizedHeadword,
        ...(NUMERAL_RELATED_HEADWORDS[normalizedHeadword] || []),
    ].map(normalizeNumeralLookupKey).filter(Boolean)));
}

export function normalizeNumeralLookupKey(value: string): string {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFC')
        .replace(/[’‘`´ˈ]/g, "'");
}

function normalizePatternValue(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function extractLinkedEntryPattern(entry: LinkedNumeralEntry): string | null {
    const rootPattern = entry.root_pattern_form?.pattern;
    if (rootPattern && typeof rootPattern === 'object') {
        const patternValue = normalizePatternValue(rootPattern.cv_notation);
        if (patternValue) return patternValue;
    }

    return (
        normalizePatternValue(entry.cv_pattern)
        || normalizePatternValue(entry.pattern)
        || normalizePatternValue(entry.form_attributive_short_pattern)
        || normalizePatternValue(entry.form_plural_pattern)
        || normalizePatternValue(entry.morph_pattern)
        || normalizePatternValue(entry.lemma_pattern)
        || normalizePatternValue(entry.form_masc_pattern)
        || normalizePatternValue(entry.form_fem_pattern)
        || normalizePatternValue(entry.numeral_morphology?.form_attributive_short_pattern)
        || normalizePatternValue(entry.numeral_morphology?.form_plural_pattern)
        || normalizePatternValue(entry.numeral_morphology?.morph_pattern)
        || normalizePatternValue(entry.numeral_morphology?.lemma_pattern)
        || normalizePatternValue(entry.numeral_morphology?.form_masc_pattern)
        || normalizePatternValue(entry.numeral_morphology?.form_fem_pattern)
        || normalizePatternValue(entry.numeral_morphology?.pattern)
    );
}

function toNumeralSurfaceValue(
    rawValue: string | undefined,
    linkedEntries: LinkedNumeralEntry[],
    fallbackMarker: Exclude<NumeralSurfaceMarker, 'theoretical'> = 'auto_generated',
): NumeralSurfaceValue | null {
    if (!rawValue || rawValue === '-') return null;

    const normalizedValue = rawValue.trim();
    const isTheoretical = normalizedValue.startsWith('*');
    const isAutoGenerated = normalizedValue.startsWith('✦');
    const value = stripTheoreticalPrefix(normalizedValue);
    if (!value) return null;

    const existing = linkedEntries.find((entry) => normalizeNumeralLookupKey(entry.headword || '') === normalizeNumeralLookupKey(value));
    if (existing) {
        return { value, marker: 'plain', entryId: existing.id, pattern: extractLinkedEntryPattern(existing) };
    }

    if (isTheoretical) {
        return { value, marker: 'theoretical', pattern: null };
    }

    if (isAutoGenerated) {
        return { value, marker: 'auto_generated', pattern: null };
    }

    return { value, marker: fallbackMarker, pattern: null };
}

function toNumeralSurfaceList(
    values: string[] | undefined,
    linkedEntries: LinkedNumeralEntry[],
    fallbackMarker: Exclude<NumeralSurfaceMarker, 'theoretical'> = 'auto_generated',
): NumeralSurfaceValue[] {
    return (values || [])
        .map((value) => toNumeralSurfaceValue(value, linkedEntries, fallbackMarker))
        .filter((value): value is NumeralSurfaceValue => Boolean(value));
}

export function hasVisibleNumeralSurface(value: NumeralSurfaceValue | NumeralSurfaceValue[] | null | undefined): boolean {
    if (!value) return false;

    const values = Array.isArray(value) ? value : [value];
    return values.some((item) => {
        const normalized = String(item?.value || '').trim();
        return !!normalized && normalized !== '-';
    });
}

export function buildNumeralDisplayForms(
    headword: string,
    rootConsonants: string,
    linkedEntries: LinkedNumeralEntry[] = [],
): NumeralDisplayForms {
    const emptyForms: NumeralDisplayForms = {
        ordinal: [],
        adverbial: [],
        fractional: [],
        multiplier: [],
        distributive: [],
        attributive_short: [],
        attributive_long: [],
    };

    const normalizedHeadword = normalizeNumeralLookupKey(headword);
    if (!normalizedHeadword || !rootConsonants) {
        return emptyForms;
    }

    const familyHeadword = SUPPLETIVE_NUMERAL_FAMILY_ALIASES[normalizedHeadword] || normalizedHeadword;
    const displayOverride = NUMERAL_CANONICAL_OVERRIDES[normalizedHeadword]?.display;
    const displayForms = {
        ...(NUMERAL_DISPLAY_FORMS[familyHeadword] || {}),
        ...(displayOverride || {}),
    };

    const autoForms = generateNumeralForms(headword, rootConsonants);
    const canonicalAutoOverride = NUMERAL_CANONICAL_OVERRIDES[normalizedHeadword]?.auto;
    const mergedAutoForms = canonicalAutoOverride ? { ...autoForms, ...canonicalAutoOverride } : autoForms;

    const resolveDisplayValues = (key: keyof NumeralDisplayForms, fallback: string[] | string | null | undefined) => {
        const override = displayForms?.[key];
        if (override !== undefined) return override;
        if (fallback === undefined || fallback === null) return [];
        return Array.isArray(fallback) ? fallback : [fallback];
    };

    return {
        ordinal: toNumeralSurfaceList(resolveDisplayValues('ordinal', mergedAutoForms.ordinal), linkedEntries, 'auto_generated'),
        adverbial: toNumeralSurfaceList(resolveDisplayValues('adverbial', mergedAutoForms.adverbial), linkedEntries, 'auto_generated'),
        fractional: toNumeralSurfaceList(resolveDisplayValues('fractional', mergedAutoForms.fractional_semitic), linkedEntries, 'auto_generated'),
        multiplier: toNumeralSurfaceList(
            resolveDisplayValues(
                'multiplier',
                [mergedAutoForms.multiplier_form1, mergedAutoForms.multiplier_form2].filter((value): value is string => Boolean(value)),
            ),
            linkedEntries,
            'auto_generated',
        ),
        distributive: toNumeralSurfaceList(resolveDisplayValues('distributive', mergedAutoForms.distributive), linkedEntries, 'auto_generated'),
        attributive_short: toNumeralSurfaceList(resolveDisplayValues('attributive_short', shouldSuppressNumeralAttributiveForms(headword) ? [] : mergedAutoForms.attributive_short), linkedEntries, 'auto_generated'),
        attributive_long: toNumeralSurfaceList(resolveDisplayValues('attributive_long', shouldSuppressNumeralAttributiveForms(headword) ? [] : mergedAutoForms.attributive_long), linkedEntries, 'auto_generated'),
    };
}

export function seedNumeralDerivedFields<T extends NumeralDerivedFieldState>(
    form: T,
    autoForms: NumeralAutoForms,
): T {
    const next = { ...form };
    const numeralType = String(next.numeral_type || '').trim();

    next.numeral_type = numeralType || 'cardinal';
    next.form_attributive_short = next.form_attributive_short || autoForms.attributive_short || '';
    next.form_attributive_long = next.form_attributive_long || autoForms.attributive_long || '';

    return next;
}

export const NUMERAL_MORPHOLOGY_DB_FIELD_KEYS = [
    'numeral_type', 'form_attributive_short', 'form_attributive_long',
    'ordinal_form', 'adverbial_form',
    'fractional_form', 'multiplier_form', 'distributive_form',
    'form_attributive_short_pattern', 'form_plural_pattern',
    'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual',
    'lemma_pattern', 'form_masc_pattern'
];

export const NUMERAL_MORPHOLOGY_UI_MAPPING = {
    numeral_type: 'numeral_type',
    form_attributive_short: 'form_attributive_short',
    form_attributive_long: 'form_attributive_long',
    form_attributive_short_pattern: 'form_attributive_short_pattern',
    numeral_ordinal: 'ordinal_form',
    numeral_adverbial: 'adverbial_form',
    numeral_fractional: 'fractional_form',
    numeral_multiplier: 'multiplier_form',
    numeral_distributive: 'distributive_form'
};

export function applyNumeralMorphologyCompatibility(target: any, _entry: any, source: any) {
    const src = source?.numeral_morphology || source;
    if (!hasNumeralMorphologyInput(src)) return target;

    target.numeral_morphology = {
        numeral_type: src.numeral_type,
        form_attributive_short: src.form_attributive_short,
        form_attributive_long: src.form_attributive_long,
        form_attributive_short_pattern: src.form_attributive_short_pattern,
        ordinal_form: src.ordinal_form,
        adverbial_form: src.adverbial_form,
        fractional_form: src.fractional_form,
        multiplier_form: src.multiplier_form,
        distributive_form: src.distributive_form,
        lemma_pattern: src.lemma_pattern,
        form_masc_pattern: src.form_masc_pattern,
    };

    return target;
}

export function hasNumeralMorphologyInput(source: any) {
    if (!source) return false;
    const pos = String(source.pos || source.numeral_morphology?.pos || '').toLowerCase().trim();
    if (pos && pos !== 'numeral') return false;
    const src = source.numeral_morphology || source;
    return !!(
        src.numeral_type || src.form_attributive_short || src.form_attributive_long ||
        src.form_attributive_short_pattern ||
        src.ordinal_form || src.numeral_ordinal || src.adverbial_form || src.numeral_adverbial ||
        src.fractional_form || src.numeral_fractional || src.multiplier_form || src.numeral_multiplier ||
        src.distributive_form || src.numeral_distributive ||
        src.plural_form || src.plural_forms || src.plural
    );
}

export function buildNumeralMorphologyRecord(entry: any, source: any) {
    const entryId = entry?.id || source?.entry_id || source?.id;
    const normalized = normalizeNumeralMorphologyInput(source?.numeral_morphology || source);
    
    return {
        entry_id: entryId,
        ...normalized,
        updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    };
}

export function normalizeNumeralMorphologyInput(source: any) {
    if (!source) return {};
    const result: any = {};
    
    // Map UI/Legacy fields to DB fields
    for (const [uiKey, dbKey] of Object.entries(NUMERAL_MORPHOLOGY_UI_MAPPING)) {
        if (source[uiKey] !== undefined) result[dbKey] = source[uiKey];
    }
    
    // Also check for direct DB keys
    for (const dbKey of NUMERAL_MORPHOLOGY_DB_FIELD_KEYS) {
        if (source[dbKey] !== undefined && result[dbKey] === undefined) {
            result[dbKey] = source[dbKey];
        }
    }
    
    return result;
}

export async function ensureNumeralMorphologyTable(client: any, options: { backfill?: boolean } = {}) {
    const info = await client.execute("PRAGMA table_info(numeral_morphology)");
    if (info.rows.length === 0) {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS numeral_morphology (
                entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
                numeral_type TEXT,
                form_attributive_short TEXT,
                form_attributive_long TEXT,
                form_attributive_short_pattern TEXT,
                ordinal_form TEXT,
                adverbial_form TEXT,
                fractional_form TEXT,
                multiplier_form TEXT,
                distributive_form TEXT,
                form_plural_pattern TEXT,
                vowel_set_sg TEXT,
                vowel_set_pl TEXT,
                vowel_set_opp TEXT,
                vowel_set_dual TEXT,
                plural_forms TEXT,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            )
        `);
    } else {
        // Add missing columns
        const existingColumns = new Set(info.rows.map((r: any) => (r.name || r[1])));
        const requiredColumns = [
            ['vowel_set_sg', 'TEXT'],
            ['vowel_set_pl', 'TEXT'],
            ['vowel_set_opp', 'TEXT'],
            ['vowel_set_dual', 'TEXT'],
            ['form_attributive_short_pattern', 'TEXT'],
            ['form_plural_pattern', 'TEXT'],
            ['plural_forms', 'TEXT'],
        ];

        for (const [col, type] of requiredColumns) {
            if (!existingColumns.has(col)) {
                try {
                    await client.execute(`ALTER TABLE numeral_morphology ADD COLUMN ${col} ${type}`);
                } catch (e: unknown) {
                    console.warn(`Could not add column ${col} to numeral_morphology:`, e instanceof Error ? e.message : String(e));
                }
            }
        }
    }


    if (options.backfill) {
        // Check if legacy columns still exist in entries table
        const tableInfo = await client.execute("PRAGMA table_info(entries)");
        const availableColumns = new Set((tableInfo.rows || []).map((r: any) => (r as any).name || (Array.isArray(r) ? r[1] : '')));

        const legacyCols = [
            'numeral_type', 'form_attributive_short', 'form_attributive_long',
            'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual',
            'form_attributive_short_pattern', 'form_plural_pattern'
        ].filter(c => availableColumns.has(c));

        if (legacyCols.length > 0) {
            const selectCols = ['id', ...legacyCols].join(', ');
            const backfillRows = await client.execute(`
                SELECT ${selectCols}
                FROM entries 
                WHERE (${legacyCols[0]} IS NOT NULL OR ${legacyCols.includes('numeral_type') ? 'numeral_type' : legacyCols[0]} IS NOT NULL)
                  AND id NOT IN (SELECT entry_id FROM numeral_morphology)
            `);

            for (const row of backfillRows.rows) {
                const record = buildNumeralMorphologyRecord({ id: row.id as string }, row);
                const cols = Object.keys(record);
                const vals = Object.values(record);
                const placeholders = cols.map(() => '?').join(', ');
                await client.execute({
                    sql: `INSERT OR REPLACE INTO numeral_morphology (${cols.join(', ')}) VALUES (${placeholders})`,
                    args: vals
                });
            }
        }
    }
}

export async function syncNumeralMorphology(client: any, entryId: string, body: any) {
    const pos = String(body?.pos || body?.numeral_morphology?.pos || '').toLowerCase().trim();
    if (pos && pos !== 'numeral') return;
    if (!hasNumeralMorphologyInput(body)) return;

    const record = buildNumeralMorphologyRecord({ id: entryId }, body);
    const cols = Object.keys(record);
    const vals = Object.values(record);
    const placeholders = cols.map(() => '?').join(', ');

    await client.execute({
        sql: `INSERT OR REPLACE INTO numeral_morphology (${cols.join(', ')}) VALUES (${placeholders})`,
        args: vals
    });
}
