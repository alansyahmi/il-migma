import { normalizeEntryPos } from './entryId.ts';

export const PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS = [
    'type', 'gender', 'verbal_form', 'is_inflectable', 'form_fem_pattern', 'form_masc_pattern', 'form_plural_pattern'
];

export const PARTICIPLE_MORPHOLOGY_LEGACY_FIELDS = {
    participle_type: 'type'
};

export function hasParticipleMorphologyInput(source: any) {
    if (!source) return false;
    const pos = normalizeEntryPos(source.pos || source.participle_morphology?.pos);
    if (pos && pos !== 'participle') return false;
    const src = source.participle_morphology || source;
    const hasIsInflectable = Object.prototype.hasOwnProperty.call(src, 'is_inflectable');
    return !!(
        src.type || src.gender || src.verbal_form || hasIsInflectable ||
        src.form_fem_pattern || src.form_masc_pattern || src.form_plural_pattern
    );
}

export function buildParticipleMorphologyRecord(entry: any, source: any) {
    const entryId = entry?.id || source?.entry_id || source?.id;
    const normalized = normalizeParticipleMorphologyInput(source?.participle_morphology || source);
    
    return {
        entry_id: entryId,
        ...normalized,
        updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    };
}

export function applyParticipleMorphologyCompatibility(target: any, entry: any, source: any) {
    const src = source?.participle_morphology || source;
    if (!hasParticipleMorphologyInput(src)) return target;

    const normalized = normalizeParticipleMorphologyInput(src);
    target.participle_morphology = {
        type: normalized.type,
        gender: normalized.gender || entry.gender,
        verbal_form: normalized.verbal_form,
    };

    if (target.participle_morphology.gender) target.gender = target.participle_morphology.gender;

    return target;
}

export function normalizeParticipleMorphologyInput(source: any) {
    if (!source) return {};
    const result: any = {};
    
    // Map legacy fields
    for (const [legacy, canonical] of Object.entries(PARTICIPLE_MORPHOLOGY_LEGACY_FIELDS)) {
        if (source[legacy] !== undefined) result[canonical] = source[legacy];
    }
    
    // Map canonical fields
    for (const key of PARTICIPLE_MORPHOLOGY_DB_FIELD_KEYS) {
        if (source[key] !== undefined) {
            let val = source[key];
            if (key.startsWith('is_')) val = val ? 1 : 0;
            result[key] = val;
        }
    }
    
    return result;
}

export async function ensureParticipleMorphologyTable(client: any, options: any = {}) {
    const info = await client.execute("PRAGMA table_info(participle_morphology)");
    if (info.rows.length === 0) {
        await client.execute(`
            CREATE TABLE participle_morphology (
                entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
                type TEXT,
                gender TEXT,
                verbal_form TEXT,
                form_fem_pattern TEXT,
                form_masc_pattern TEXT,
                form_plural_pattern TEXT,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            )
        `);
    } else {
        // Add missing columns
        const existingColumns = new Set(info.rows.map((r: any) => (r.name || r[1])));
        const requiredColumns = [
            ['form_fem_pattern', 'TEXT'],
            ['form_masc_pattern', 'TEXT'],
            ['form_plural_pattern', 'TEXT'],
            ['verbal_form', 'TEXT'],
            ['is_inflectable', 'BOOLEAN DEFAULT false'],
        ];

        for (const [col, type] of requiredColumns) {
            if (!existingColumns.has(col)) {
                try {
                    await client.execute(`ALTER TABLE participle_morphology ADD COLUMN ${col} ${type}`);
                } catch (e: unknown) {
                    console.warn(`Could not add column ${col} to participle_morphology:`, e instanceof Error ? e.message : String(e));
                }
            }
        }
    }


    if (options.backfill) {
        // Check if legacy columns still exist in entries table
        const tableInfo = await client.execute("PRAGMA table_info(entries)");
        const availableColumns = new Set((tableInfo.rows || []).map((r: any) => (r as any).name || (Array.isArray(r) ? r[1] : '')));

        const legacyCols = [
            'gender', 'participle_type',
            'form_plural_pattern', 'form_fem_pattern', 'form_masc_pattern'
        ].filter(c => availableColumns.has(c));

        if (legacyCols.length > 0) {
            const selectCols = ['id', ...legacyCols].join(', ');
            const backfillRows = await client.execute(`
                SELECT ${selectCols}
                FROM entries 
                WHERE (${legacyCols[0]} IS NOT NULL OR ${legacyCols.includes('participle_type') ? 'participle_type' : legacyCols[0]} IS NOT NULL)
                  AND id NOT IN (SELECT entry_id FROM participle_morphology)
            `);

            for (const row of backfillRows.rows) {
                const record = buildParticipleMorphologyRecord({ id: row.id as string }, row);
                const cols = Object.keys(record);
                const vals = Object.values(record);
                const placeholders = cols.map(() => '?').join(', ');
                await client.execute({
                    sql: `INSERT OR REPLACE INTO participle_morphology (${cols.join(', ')}) VALUES (${placeholders})`,
                    args: vals
                });
            }
        }
    }
}

export async function syncParticipleMorphology(client: any, entryId: string, body: any) {
    const pos = normalizeEntryPos(body?.pos || body?.participle_morphology?.pos);
    if (pos && pos !== 'participle') return;
    if (!hasParticipleMorphologyInput(body)) return;

    const record = buildParticipleMorphologyRecord({ id: entryId }, body);
    const cols = Object.keys(record);
    const vals = Object.values(record);
    const placeholders = cols.map(() => '?').join(', ');

    await client.execute({
        sql: `INSERT OR REPLACE INTO participle_morphology (${cols.join(', ')}) VALUES (${placeholders})`,
        args: vals
    });
}
