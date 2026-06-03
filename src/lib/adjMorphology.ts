import type { Entry } from '../types/index.ts';
import { normalizePluralContract } from './pluralForms.ts';
import { normalizeEntryPos } from './entryId.ts';
import { deriveMasculineFromFeminine } from './maltesePhonology.ts';

export const ADJ_MORPHOLOGY_DB_FIELD_KEYS = [
    'masculine_form', 'feminine_form', 'plural_form', 'elative_form',
    'has_elative', 'is_inflectable',
    'dual_form', 'dual_pattern', 'vowel_set_dual',
    'diminutive_form', 'diminutive_pattern',
    'elative_pattern', 'gender', 'form_fem_pattern', 'form_masc_pattern',
    'form_plural_pattern', 'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp',
    'pattern'
];

export const ADJ_MORPHOLOGY_LEGACY_FIELDS = {
    adj_masculine: 'masculine_form',
    adj_feminine: 'feminine_form',
    adj_plural: 'plural_form',
    adj_elative: 'elative_form',
    adj_gender: 'gender',
    elative_form: 'elative_form',
    elative_pattern: 'elative_pattern',
    form_fem_pattern: 'form_fem_pattern',
    form_masc_pattern: 'form_masc_pattern',
    form_plural_pattern: 'form_plural_pattern',
    lemma_pattern: 'pattern',
    pattern: 'pattern'
};

export function isAdjLikePos(pos: unknown): boolean {
    const normalized = normalizeEntryPos(pos);
    return normalized === 'adjective' || normalized === 'participle';
}

export function hasAdjMorphologyInput(source: any): boolean {
    if (!source) return false;
    const src = source.adjective_morphology || source.adj_morphology || source;
    const hasElativeFlag = Object.prototype.hasOwnProperty.call(src, 'has_elative');
    return !!(
        src.masculine_form || src.feminine_form || src.plural_form || src.elative_form ||
        src.form_masc || src.form_fem || hasElativeFlag ||
        src.gender || src.vowel_set_sg || src.vowel_set_pl || src.vowel_set_opp || src.vowel_set_dual ||
        src.dual_form || src.diminutive_form || src.pattern || src.cv_pattern || src.morph_pattern || src.lemma_pattern || src.is_inflectable ||
        src.form_masc_pattern || src.form_fem_pattern || src.form_plural_pattern || src.elative_pattern
    );
}

export function buildAdjMorphologyRecord(entry: Partial<Entry> | null, source: any) {
    const entryId = entry?.id || source?.entry_id || source?.id;
    const sourcePayload = source?.adjective_morphology || source?.adj_morphology || source;
    const normalized = normalizeAdjMorphologyInput({
        ...sourcePayload,
        pos: source?.pos || entry?.pos || sourcePayload?.pos,
    });

    return {
        entry_id: entryId,
        ...normalized,
        updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    };
}

export function applyAdjMorphologyCompatibility(target: any, entry: Partial<Entry>, source: any) {
    const src = source?.adjective_morphology || source?.adj_morphology || source;
    if (!hasAdjMorphologyInput(src)) return target;

    const normalized = normalizeAdjMorphologyInput({
        ...src,
        pos: src?.pos || (entry as any)?.pos || 'adjective',
    });
    const pluralRows = normalizePluralContract(
        normalized.plural_form,
        normalized.form_plural_pattern,
    ).rows;
    const adjectiveMorphology = {
        pattern: normalized.pattern,
        morph_pattern: normalized.pattern,
        masculine: normalized.masculine_form,
        feminine: normalized.feminine_form,
        masculine_form: normalized.masculine_form, // Consistency alias
        feminine_form: normalized.feminine_form, // Consistency alias
        form_masc: normalized.masculine_form, // Type-safe alias
        form_fem: normalized.feminine_form, // Type-safe alias
        form_masc_pattern: normalized.form_masc_pattern,
        form_fem_pattern: normalized.form_fem_pattern,
        form_plural_pattern: normalized.form_plural_pattern,
        plural: pluralRows,
        plural_form: JSON.stringify(pluralRows), // Normalized key
        plural_forms: pluralRows,
        has_elative: normalized.has_elative === undefined ? undefined : Boolean(normalized.has_elative),
        elative: normalized.elative_form,
        elative_form: normalized.elative_form,
        elative_pattern: normalized.elative_pattern,
        vowel_set_sg: normalized.vowel_set_sg,
        vowel_set_pl: normalized.vowel_set_pl,
        vowel_set_opp: normalized.vowel_set_opp,
        vowel_set_dual: normalized.vowel_set_dual || null,
        gender: normalized.gender || entry.gender,
        dual_form: normalized.dual_form || null,
        dual_pattern: normalized.dual_pattern || null,
        diminutive_form: normalized.diminutive_form || src.diminutive_form || src.diminutive || target.adjective_morphology?.diminutive_form || null,
        diminutive_pattern: normalized.diminutive_pattern || null,
        is_inflectable: normalized.is_inflectable === undefined ? undefined : Boolean(normalized.is_inflectable),
        diminutives: src.diminutives || target.adjective_morphology?.diminutives || [],
        synonyms: src.synonyms || target.adjective_morphology?.synonyms || [],
        antonyms: src.antonyms || target.adjective_morphology?.antonyms || [],
        related_entries: src.related_entries || target.adjective_morphology?.related_entries || [],
        source_citation: src.source_citation || target.adjective_morphology?.source_citation || (entry as any).source_citation || null,
        source_title: src.source_title || target.adjective_morphology?.source_title || (entry as any).source_title || null,
        source_year: src.source_year || target.adjective_morphology?.source_year || (entry as any).source_year || null,
        source_page: src.source_page || target.adjective_morphology?.source_page || (entry as any).source_page || null,
        source_publisher: src.source_publisher || target.adjective_morphology?.source_publisher || (entry as any).source_publisher || null,
        source_display: src.source_display || target.adjective_morphology?.source_display || (entry as any).source_display || null,
        source_tooltip: src.source_tooltip || target.adjective_morphology?.source_tooltip || (entry as any).source_tooltip || null,
    };

    target.adj_morphology = adjectiveMorphology;
    target.adjective_morphology = adjectiveMorphology;

    if (target.adjective_morphology.gender) target.gender = target.adjective_morphology.gender;

    return target;
}

export function normalizeAdjMorphologyInput(source: any) {
    if (!source) return {};
    if (!isAdjLikePos(source.pos)) return {};
    const result: any = {};

    // 1. Map legacy fields
    for (const [legacy, canonical] of Object.entries(ADJ_MORPHOLOGY_LEGACY_FIELDS)) {
        if (source[legacy] !== undefined) result[canonical] = source[legacy];
    }

    // 2. Map canonical fields
    for (const key of ADJ_MORPHOLOGY_DB_FIELD_KEYS) {
        if (source[key] !== undefined) {
            let val = source[key];
            if (key.startsWith('is_') || key === 'has_elative') val = val ? 1 : 0;
            result[key] = val;
        }
    }

    // 3. Special handling for common UI input field names and plural form aliases
    if (source.masculine !== undefined && result.masculine_form === undefined) result.masculine_form = source.masculine;
    if (source.feminine !== undefined && result.feminine_form === undefined) result.feminine_form = source.feminine;

    const pluralContract = normalizePluralContract(
        source.plural_forms || source.plural || source.adj_plural || source.plural_form,
        source.form_plural_pattern,
        source.plural_form,
        source.form_plural_pattern,
    );
    if (
        pluralContract.rows.length > 0 ||
        source.plural_form !== undefined ||
        source.plural_forms !== undefined ||
        source.plural !== undefined ||
        source.adj_plural !== undefined
    ) {
        result.plural_form = JSON.stringify(pluralContract.rows);
    }

    if (source.elative !== undefined && result.elative_form === undefined) result.elative_form = source.elative;
    if (source.form_fem !== undefined && result.feminine_form === undefined) result.feminine_form = source.form_fem;
    if (source.form_masc !== undefined && result.masculine_form === undefined) result.masculine_form = source.form_masc;
    if (source.pattern !== undefined && result.pattern === undefined) result.pattern = source.pattern;
    if (source.cv_pattern !== undefined && result.pattern === undefined) result.pattern = source.cv_pattern;
    if (source.morph_pattern !== undefined && result.pattern === undefined) result.pattern = source.morph_pattern;
    if (source.lemma_pattern !== undefined && result.pattern === undefined) result.pattern = source.lemma_pattern;
    if (result.masculine_form === undefined) {
        const derivedMasculine = resolveAdjMasculineForm(source);
        if (derivedMasculine) result.masculine_form = derivedMasculine;
    }
    if (source.is_inflectable !== undefined && result.is_inflectable === undefined) result.is_inflectable = source.is_inflectable ? 1 : 0;
    if (result.is_inflectable === undefined) result.is_inflectable = 0;
    if (source.has_elative !== undefined && result.has_elative === undefined) result.has_elative = source.has_elative ? 1 : 0;

    return result;
}

function firstNonEmptyText(...values: unknown[]): string {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

export function resolveAdjMasculineForm(source: any): string | null {
    if (!source) return null;

    const explicit = firstNonEmptyText(
        source.masculine_form,
        source.form_masc,
        source.adj_masculine,
        source.am_masculine,
    );
    if (explicit) return explicit;

    const headword = firstNonEmptyText(source.headword);
    if (!headword) return null;

    const gender = firstNonEmptyText(
        source.gender,
        source.adj_gender,
        source.am_gender,
        source.adjective_morphology?.gender,
        source.adj_morphology?.gender,
    ).toLowerCase();

    if (gender === 'feminine') {
        const feminine = firstNonEmptyText(
            source.feminine_form,
            source.form_fem,
            source.adj_feminine,
            source.am_feminine,
            source.adjective_morphology?.feminine_form,
            source.adjective_morphology?.form_fem,
            source.adj_morphology?.feminine_form,
            source.adj_morphology?.form_fem,
            headword,
        );
        return deriveMasculineFromFeminine(feminine || headword) || headword;
    }

    return headword;
}

export async function ensureAdjMorphologyTable(client: any, options: { backfill?: boolean } = {}) {
    const info = await client.execute("PRAGMA table_info(adj_morphology)");
    const existingColumns = new Set(info.rows.map((r: any) => (r.name || r[1])));
    if (info.rows.length === 0) {
        await client.execute(`
            CREATE TABLE adj_morphology (
                entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
                masculine_form TEXT,
                feminine_form TEXT,
                plural_form TEXT,
                elative_form TEXT,
                has_elative INTEGER NOT NULL DEFAULT 1,
                is_inflectable INTEGER DEFAULT 0,
                dual_form TEXT,
                dual_pattern TEXT,
                vowel_set_dual TEXT,
                diminutive_form TEXT,
                diminutive_pattern TEXT,
                elative_pattern TEXT,
                gender TEXT,
                form_plural_pattern TEXT,
                form_fem_pattern TEXT,
                form_masc_pattern TEXT,
                vowel_set_sg TEXT,
                vowel_set_pl TEXT,
                vowel_set_opp TEXT,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            )
        `);
    } else {
        // Add missing columns
        const requiredColumns = [
            ['vowel_set_sg', 'TEXT'],
            ['vowel_set_pl', 'TEXT'],
            ['vowel_set_opp', 'TEXT'],
            ['form_plural_pattern', 'TEXT'],
            ['form_fem_pattern', 'TEXT'],
            ['form_masc_pattern', 'TEXT'],
            ['elative_pattern', 'TEXT'],
            ['has_elative', 'INTEGER NOT NULL DEFAULT 1'],
            ['pattern', 'TEXT'],
            ['is_inflectable', 'INTEGER DEFAULT 0'],
            ['dual_form', 'TEXT'],
            ['dual_pattern', 'TEXT'],
            ['vowel_set_dual', 'TEXT'],
            ['diminutive_form', 'TEXT'],
            ['diminutive_pattern', 'TEXT'],
        ];

        for (const [col, type] of requiredColumns) {
            if (!existingColumns.has(col)) {
                try {
                    await client.execute(`ALTER TABLE adj_morphology ADD COLUMN ${col} ${type}`);
                } catch (e: unknown) {
                    console.warn(`Could not add column ${col} to adj_morphology:`, e instanceof Error ? e.message : String(e));
                }
            }
        }
    }


    if (options.backfill) {
        const entriesInfo = await client.execute("PRAGMA table_info(entries)");
        const entriesColumns = new Set((entriesInfo.rows || []).map((r: any) => (r as any).name || (Array.isArray(r) ? r[1] : '')));
        const hasTagsColumn = entriesColumns.has('tags');
        const hasLemmaPatternColumn = existingColumns.has('lemma_pattern');

        if (hasTagsColumn) {
            const selectColumns = [
                'e.id',
                'e.pos',
                'e.tags',
                'am.entry_id AS has_row',
                'am.has_elative',
                'am.pattern AS pattern',
            ];
            if (hasLemmaPatternColumn) {
                selectColumns.push('am.lemma_pattern AS lemma_pattern');
            }

            const rows = await client.execute(`
                SELECT ${selectColumns.join(', ')}
                FROM entries e
                LEFT JOIN adj_morphology am ON am.entry_id = e.id
                WHERE LOWER(TRIM(e.pos)) IN ('adjective', 'participle')
            `);

            for (const row of rows.rows) {
                const tags = Array.isArray(row.tags)
                    ? row.tags
                    : typeof row.tags === 'string'
                        ? (() => {
                            const trimmed = row.tags.trim();
                            if (!trimmed) return [];
                            if (trimmed.startsWith('[')) {
                                try {
                                    const parsed = JSON.parse(trimmed);
                                    if (Array.isArray(parsed)) return parsed;
                                } catch {
                                    // Fall through to comma split.
                                }
                            }
                            return trimmed.split(',').map((tag: string) => tag.trim()).filter(Boolean);
                        })()
                        : [];
                const hasNoElative = tags.some((tag: string) => String(tag).trim() === '$no-elative');
                const nextHasElative = hasNoElative ? 0 : 1;
                const nextPattern = firstNonEmptyText(row.pattern, hasLemmaPatternColumn ? row.lemma_pattern : '');

                if (row.has_row) {
                    if (row.has_elative !== nextHasElative) {
                        await client.execute({
                            sql: `UPDATE adj_morphology SET has_elative = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE entry_id = ?`,
                            args: [nextHasElative, row.id],
                        });
                    }
                    if (hasLemmaPatternColumn && nextPattern && String(row.pattern ?? '').trim() !== nextPattern) {
                        await client.execute({
                            sql: `UPDATE adj_morphology SET pattern = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE entry_id = ?`,
                            args: [nextPattern, row.id],
                        });
                    }
                } else {
                    await client.execute({
                        sql: `INSERT OR REPLACE INTO adj_morphology (entry_id, has_elative, pattern, updated_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`,
                        args: [row.id, nextHasElative, nextPattern || null],
                    });
                }
            }
        }
    }
}

export async function syncAdjMorphology(client: any, entryId: string, body: any) {
    const sourcePayload = body?.adjective_morphology || body?.adj_morphology || body;
    const normalizedSource = {
        ...sourcePayload,
        pos: body?.pos || sourcePayload?.pos || 'adjective',
    };
    if (!hasAdjMorphologyInput(normalizedSource)) return;

    const record = buildAdjMorphologyRecord({ id: entryId, pos: body?.pos || normalizedSource.pos }, body);
    const cols = Object.keys(record);
    const vals = Object.values(record);
    const placeholders = cols.map(() => '?').join(', ');
    const assignments = cols
        .filter((col) => col !== 'entry_id')
        .map((col) => `${col} = excluded.${col}`)
        .join(', ');

    const execWrite = async (executor: any) => {
        await executor.execute({
            sql: `INSERT INTO adj_morphology (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT(entry_id) DO UPDATE SET ${assignments}`,
            args: vals
        });
    };

    if (typeof client?.transaction === 'function') {
        const tx = await client.transaction('write');
        try {
            await execWrite(tx);
            await tx.commit();
        } catch (error) {
            try {
                await tx.rollback();
            } catch {
                // Best effort rollback.
            }
            throw error;
        } finally {
            tx.close?.();
        }
        return;
    }

    await execWrite(client);
}
