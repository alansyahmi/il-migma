
export const VERB_MORPHOLOGY_DB_FIELD_KEYS = [
    'form',
    'class',
    'weak_class',
    'transitivity',
    'perfective_3sgm',
    'imperfective_3sgm',
    'verbal_noun',
    'active_participle',
    'passive_participle',
    'vowel_set_perf',
    'vowel_set_impf',
    'vowel_set_impv',
    'type'
];


export const VERB_MORPHOLOGY_TABLE = 'verb_morphology';

export const VERB_MORPHOLOGY_DB_COLUMNS = [
    'entry_id',
    ...VERB_MORPHOLOGY_DB_FIELD_KEYS,
    'created_at',
    'updated_at'
] as const;

export const VERB_MORPHOLOGY_LEGACY_FIELDS = {
    verb_form: 'form',
    verb_class: 'class',
    verb_weak_class: 'weak_class',
    verb_transitivity: 'transitivity',
    verb_perfective_3sgm: 'perfective_3sgm',
    verb_imperfective_3sgm: 'imperfective_3sgm',
    verb_verbal_noun: 'verbal_noun',
    verb_active_ptcp: 'active_participle',
    verb_passive_ptcp: 'passive_participle',
    verb_vowel_perf: 'vowel_set_perf',
    verb_vowel_impf: 'vowel_set_impf',
    verb_vowel_impv: 'vowel_set_impv',
    verb_type: 'type'
};

export function hasVerbMorphologyInput(source: any) {
    if (!source) return false;
    // Check for any of the legacy fields or the new field structure
    const hasLegacy = Object.keys(VERB_MORPHOLOGY_LEGACY_FIELDS).some(k => !!source[k]);
    const hasNew = VERB_MORPHOLOGY_DB_FIELD_KEYS.some(k => !!source[k] || !!source.verb_morphology?.[k]);
    return hasLegacy || hasNew;
}

export function buildVerbMorphologyRecord(entry: any, source: any) {
    const entryId = entry?.id || source?.entry_id || source?.id;
    const normalized = normalizeVerbMorphologyInput(source?.verb_morphology || source);
    
    return {
        entry_id: entryId,
        ...normalized,
        updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    };
}

export function applyVerbMorphologyCompatibility(target: any, _entry: any, source: any, _extras: any) {
    const src = source?.verb_morphology || source;
    if (!hasVerbMorphologyInput(src)) return target;

    const normalized = normalizeVerbMorphologyInput(src);
    target.verb_form = normalized.form;
    target.verb_class = normalized.class;
    target.verb_weak_class = normalized.weak_class;
    target.verb_transitivity = normalized.transitivity;
    target.verb_perfective_3sgm = normalized.perfective_3sgm;
    target.verb_imperfective_3sgm = normalized.imperfective_3sgm;
    target.verb_verbal_noun = normalized.verbal_noun;
    target.verb_active_ptcp = normalized.active_participle;
    target.verb_passive_ptcp = normalized.passive_participle;
    target.verb_vowel_perf = normalized.vowel_set_perf;
    target.verb_vowel_impf = normalized.vowel_set_impf;
    target.verb_vowel_impv = normalized.vowel_set_impv;
    target.verb_type = normalized.type;
    target.verb_morphology = {
        form: normalized.form,
        verb_class: normalized.class,
        weak_class: normalized.weak_class,
        transitivity: normalized.transitivity,
        perfective_3sg_m: normalized.perfective_3sgm,
        imperfective_3sg_m: normalized.imperfective_3sgm,
        verbal_noun: normalized.verbal_noun,
        active_participle: normalized.active_participle,
        passive_participle: normalized.passive_participle,
        vowel_set_perfect: normalized.vowel_set_perf,
        vowel_set_imperfect: normalized.vowel_set_impf,
        vowel_set_imperative: normalized.vowel_set_impv,
        type: normalized.type,
    };

    return target;
}

export function normalizeVerbMorphologyInput(source: any) {
    if (!source) return {};
    const src = source?.verb_morphology || source;
    const result: any = {};
    
    // Map legacy fields if present
    for (const [legacy, canonical] of Object.entries(VERB_MORPHOLOGY_LEGACY_FIELDS)) {
        if (src[legacy] !== undefined) result[canonical] = normalizeTextField(src[legacy]);
    }
    
    // Map canonical fields
    for (const key of VERB_MORPHOLOGY_DB_FIELD_KEYS) {
        if (src[key] !== undefined) result[key] = normalizeTextField(src[key]);
    }
    
    return result;
}

function normalizeTextField(value: any) {
    return typeof value === 'string' ? value.trim() : value;
}

export function buildVerbMorphologyResponse(entry: any = {}, source: any = {}, extras: any = {}) {
    const normalized = normalizeVerbMorphologyInput(source);

    return {
        form: normalized.form || entry.verb_form || '',
        verb_class: normalized.class || entry.verb_class || null,
        weak_class: normalized.weak_class || entry.verb_weak_class || null,
        transitivity: normalized.transitivity || entry.verb_transitivity || '',
        perfective_3sg_m: normalized.perfective_3sgm || entry.verb_perfective_3sgm || '',
        imperfective_3sg_m: normalized.imperfective_3sgm || entry.verb_imperfective_3sgm || '',
        verbal_noun: normalized.verbal_noun || entry.verb_verbal_noun || undefined,
        active_participle: normalized.active_participle || entry.verb_active_ptcp || undefined,
        passive_participle: normalized.passive_participle || entry.verb_passive_ptcp || undefined,
        vowel_set_perfect: normalized.vowel_set_perf || entry.verb_vowel_perf || '',
        vowel_set_imperfect: normalized.vowel_set_impf || entry.verb_vowel_impf || '',
        vowel_set_imperative: normalized.vowel_set_impv || entry.verb_vowel_impv || '',
        type: normalized.type || entry.verb_type || undefined,
        is_inflectable: entry.is_inflectable === 1 || entry.is_inflectable === true,
        usage_example: entry.usage_example,
        usage_example_en: entry.usage_example_en,
        synonyms: extras.synonyms || [],
        antonyms: extras.antonyms || [],
        related_entries: extras.related_entries || [],
        alternative_forms: extras.alternative_forms || [],
        root_tags: extras.root_tags || [],
        source_citation: entry.source_citation || normalized.source_citation || null,
        source_title: entry.source_title || null,
        source_year: entry.source_year || null,
        source_page: entry.source_page || null,
        source_publisher: entry.source_publisher || null,
        source_display: entry.source_display || '',
        source_tooltip: entry.source_tooltip || '',
    };
}

export async function ensureVerbMorphologyTable(client: any, options: any = {}) {
    const info = await client.execute("PRAGMA table_info(verb_morphology)");
    if (info.rows.length === 0) {
        await client.execute(`
            CREATE TABLE verb_morphology (
                entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
                form TEXT,
                class TEXT,
                weak_class TEXT,
                transitivity TEXT,
                perfective_3sgm TEXT,
                imperfective_3sgm TEXT,
                verbal_noun TEXT,
                active_participle TEXT,
                passive_participle TEXT,
                vowel_set_perf TEXT,
                vowel_set_impf TEXT,
                vowel_set_impv TEXT,
                type TEXT,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            )
        `);
        await client.execute("CREATE INDEX IF NOT EXISTS idx_verb_morphology_type ON verb_morphology(type)");
    }


    if (options.backfill) {
        // Check if legacy columns still exist in entries table
        const tableInfo = await client.execute("PRAGMA table_info(entries)");
        const availableColumns = new Set((tableInfo.rows || []).map((r: any) => (r as any).name || (Array.isArray(r) ? r[1] : '')));
        
        const legacyCols = [
            'verb_form', 'verb_class', 'verb_weak_class', 'verb_transitivity', 
            'verb_perfective_3sgm', 'verb_imperfective_3sgm', 'verb_verbal_noun', 
            'verb_active_ptcp', 'verb_passive_ptcp', 'verb_vowel_perf', 
            'verb_vowel_impf', 'verb_vowel_impv', 'verb_type'
        ].filter(c => availableColumns.has(c));

        if (legacyCols.length > 0) {
            // Find entries with verb columns that aren't in verb_morphology yet
            const selectCols = ['id', ...legacyCols].join(', ');
            const backfillRows = await client.execute(`
                SELECT ${selectCols}
                FROM entries 
                WHERE (${legacyCols[0]} IS NOT NULL OR ${legacyCols.includes('verb_perfective_3sgm') ? 'verb_perfective_3sgm' : legacyCols[0]} IS NOT NULL)
                  AND id NOT IN (SELECT entry_id FROM verb_morphology)
            `);

            for (const row of backfillRows.rows) {
                const record = buildVerbMorphologyRecord({ id: row.id as string }, row);
                const cols = Object.keys(record);
                const vals = Object.values(record);
                const placeholders = cols.map(() => '?').join(', ');
                await client.execute({
                    sql: `INSERT OR REPLACE INTO verb_morphology (${cols.join(', ')}) VALUES (${placeholders})`,
                    args: vals
                });
            }
        }
    }
}

export async function syncVerbMorphology(client: any, entryId: string, body: any, fallbackHeadword?: string) {
    if (!hasVerbMorphologyInput(body)) return;

    const record = buildVerbMorphologyRecord({ id: entryId }, body);
    if (!record.form && fallbackHeadword) record.form = fallbackHeadword;

    const cols = Object.keys(record);
    const vals = Object.values(record);
    const placeholders = cols.map(() => '?').join(', ');

    await client.execute({
        sql: `INSERT OR REPLACE INTO verb_morphology (${cols.join(', ')}) VALUES (${placeholders})`,
        args: vals
    });
}
