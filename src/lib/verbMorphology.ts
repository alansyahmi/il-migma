
import { generateConjugation, generateRootForms } from './conjugationEngine.ts';
import { inferImalaBlocked } from './imala.ts';
import { resolveVerbClassification } from './stemDefaults.ts';

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

const VERB_MORPHOLOGY_DISPLAY_ALIAS_FIELDS = {
    vm_form: 'form',
    vm_class: 'class',
    vm_weak_class: 'weak_class',
    vm_transitivity: 'transitivity',
    vm_perfective_3sgm: 'perfective_3sgm',
    vm_imperfective_3sgm: 'imperfective_3sgm',
    vm_verbal_noun: 'verbal_noun',
    vm_active_ptcp: 'active_participle',
    vm_passive_ptcp: 'passive_participle',
    vm_vowel_perf: 'vowel_set_perf',
    vm_vowel_impf: 'vowel_set_impf',
    vm_vowel_impv: 'vowel_set_impv',
    vm_type: 'type',
    perfective_3sg_m: 'perfective_3sgm',
    imperfective_3sg_m: 'imperfective_3sgm',
    vowel_set_perfect: 'vowel_set_perf',
    vowel_set_imperfect: 'vowel_set_impf',
    vowel_set_imperative: 'vowel_set_impv',
} as const;

function isDisabledFlag(value: any): boolean {
    if (value === false || value === 0) return true;
    if (typeof value !== 'string') return false;
    return ['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
}

function hasExplicitFlag(source: any, key: string): boolean {
    if (!source || typeof source !== 'object') return false;
    if (!Object.prototype.hasOwnProperty.call(source, key)) return false;
    const value = source[key];
    return value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '');
}

export function shouldMarkVerbConjugationTheoretical(entry: any = {}, morphology: any = {}): boolean {
    const tags = [
        ...(Array.isArray(entry?.tags) ? entry.tags : []),
        ...(Array.isArray(morphology?.root_tags) ? morphology.root_tags : []),
    ].map((tag) => String(tag || '').trim().toUpperCase());

    if (tags.includes('THEORETICAL')) return true;
    if (hasExplicitFlag(morphology, 'is_inflectable') && isDisabledFlag(morphology.is_inflectable)) return true;
    if (hasExplicitFlag(entry, 'has_inflection') && isDisabledFlag(entry.has_inflection)) return true;

    return false;
}

function getRootConsonantsForVerb(entry: any = {}): string {
    const root = entry?.root_pattern_form?.root;
    const fromArray = Array.isArray(root?.consonant_array) ? root.consonant_array.join('-') : '';
    return normalizeTextField(
        fromArray ||
        root?.consonants ||
        entry?.zokk_morphology?.root ||
        entry?.root_consonants ||
        ''
    ) || '';
}

export function resolveVerbGenerationInput(entry: any = {}, morphology: any = entry?.verb_morphology || {}) {
    const vm = morphology || {};
    const root = getRootConsonantsForVerb(entry);
    if (!root) return null;

    const rootObj = entry?.root_pattern_form?.root;
    const form = normalizeTextField(vm.form || entry?.verb_form || 'I') || 'I';
    const vowelSetPerfect = normalizeTextField(vm.vowel_set_perf || vm.vowel_set_perfect || entry?.verb_vowel_perf || 'a-a') || 'a-a';
    const vowelSetImperfect = normalizeTextField(vm.vowel_set_impf || vm.vowel_set_imperfect || entry?.verb_vowel_impf || 'i-a') || 'i-a';
    const vowelSetImperative = normalizeTextField(vm.vowel_set_impv || vm.vowel_set_imperative || entry?.verb_vowel_impv || 'o-o') || 'o-o';
    const classification = resolveVerbClassification({
        form,
        headword: entry?.headword,
        verb_class: vm.class || vm.verb_class || entry?.verb_class,
        verb_weak_class: vm.weak_class || entry?.verb_weak_class,
        root_consonants: root,
        tags: entry?.tags,
        root_tags: vm.root_tags,
        root: rootObj,
        zokk_morphology: entry?.zokk_morphology,
    });

    return {
        root,
        form,
        strength: classification.strength,
        weakClass: classification.weak_class || undefined,
        vowelSetPerfect,
        vowelSetImperfect,
        vowelSetImperative,
        isImalaBlocked: inferImalaBlocked({
            consonants: root,
            vowel_set_perf: rootObj?.vowel_set_perf || vowelSetPerfect,
            vowel_set_impf: rootObj?.vowel_set_impf || vowelSetImperfect,
            vowel_set_imp: rootObj?.vowel_set_imp || vowelSetImperative,
        }),
    };
}

export function buildVerbConjugationFromEngine(entry: any = {}, morphology: any = entry?.verb_morphology || {}) {
    const input = resolveVerbGenerationInput(entry, morphology);
    if (!input) return null;
    return generateConjugation(input);
}

export function buildEntryFormVerbMorphologyPreview(form: any = {}) {
    const root = normalizeTextField(form._rootConsonants || form.root_consonants || '');
    const selectedForm = normalizeTextField(form._formLabel || form.verb_form || form.form || 'I') || 'I';
    const vowelDefaults = getDefaultVerbVowelSets(selectedForm, form.verb_class, form._weakClass || form.verb_weak_class, root);
    const vowelSetPerfect = normalizeTextField(form.verb_vowel_perf || form.vowel_set_perf || form.vowel_set_perfect || vowelDefaults.perfect);
    const vowelSetImperfect = normalizeTextField(form.verb_vowel_impf || form.vowel_set_impf || form.vowel_set_imperfect || vowelDefaults.imperfect);
    const vowelSetImperative = normalizeTextField(
        form.verb_vowel_impv || form.vowel_set_impv || form.vowel_set_imperative || vowelDefaults.imperative || vowelSetImperfect
    );

    if (!root || !vowelSetPerfect || !vowelSetImperfect) return null;
    if (!vowelSetPerfect.includes('-') || !vowelSetImperfect.includes('-')) return null;

    const verbClassForEngine = ['quadriliteral', 'loan'].includes(String(form.verb_class || '').trim().toLowerCase())
        ? 'strong'
        : form.verb_class;
    const classification = resolveVerbClassification({
        form: selectedForm,
        headword: form.headword,
        verb_class: verbClassForEngine,
        verb_weak_class: form._weakClass || form.verb_weak_class,
        root_consonants: root,
        tags: form.tags,
    });

    const isImalaBlocked = inferImalaBlocked({
        consonants: root,
        vowel_set_perf: vowelSetPerfect,
        vowel_set_impf: vowelSetImperfect,
        vowel_set_imp: vowelSetImperative || vowelSetImperfect,
    });

    const rootForms = generateRootForms(
        root,
        vowelSetPerfect,
        vowelSetImperfect,
        classification.strength,
        classification.weak_class || undefined,
        isImalaBlocked,
    );
    const derivedPreview = rootForms.find((candidate: any) => candidate.form === selectedForm) || null;

    try {
        const conjugation = generateConjugation({
            root,
            form: selectedForm,
            strength: classification.strength,
            weakClass: classification.weak_class || undefined,
            vowelSetPerfect,
            vowelSetImperfect,
            vowelSetImperative: vowelSetImperative || vowelSetImperfect,
            isImalaBlocked,
        });
        const citationRow = conjugation.rows.find((row: any) => row.person_mt === '3ms') || conjugation.rows[2];
        const perfect = citationRow?.perfect || derivedPreview?.perfect || '';
        const imperfect = citationRow?.imperfect || derivedPreview?.imperfect || '';

        return {
            ...(derivedPreview || {}),
            form: selectedForm,
            perfect,
            imperfect,
            vowelSetPerfect,
            vowelSetImperfect,
            vowelSetImperative: vowelSetImperative || vowelSetImperfect,
            vowel_set_perf: vowelSetPerfect,
            vowel_set_impf: vowelSetImperfect,
            vowel_set_impv: vowelSetImperative || vowelSetImperfect,
            imperative: conjugation.imperative_sg || derivedPreview?.imperative || '',
            perfective_3sg_m: perfect,
            imperfective_3sg_m: imperfect,
            perfective_3sgm: perfect,
            imperfective_3sgm: imperfect,
        };
    } catch (_err) {
        return derivedPreview;
    }
}

export function getDefaultVerbVowelSets(form: any, verbClass: any = '', weakClass: any = '', rootConsonants: any = '') {
    const selectedForm = String(form || 'I').trim();
    const cls = String(verbClass || '').trim().toLowerCase();
    const weak = String(weakClass || '').trim().toLowerCase();
    const isDefective = weak === 'defective' || cls === 'defective';
    const radicals = String(rootConsonants || '').split('-').map((part) => part.trim().toLowerCase()).filter(Boolean);
    const finalRadical = radicals[radicals.length - 1] || '';

    switch (selectedForm) {
        case 'I':
            return { perfect: 'a-a', imperfect: 'i-a', imperative: 'i-a' };
        case 'II':
        case 'V':
        case 'Xa':
        case 'Xb':
            return isDefective
                ? { perfect: 'a-a', imperfect: 'a-i', imperative: 'a-i' }
                : { perfect: 'a-a', imperfect: 'a-a', imperative: 'a-a' };
        case 'III':
            if (isDefective && finalRadical === 'w') {
                return { perfect: 'a-a', imperfect: 'i-a', imperative: 'o-o' };
            }
            return { perfect: 'ie-a', imperfect: 'ie-a', imperative: 'ie-a' };
        case 'VI':
            return { perfect: 'ie-a', imperfect: 'ie-a', imperative: 'ie-a' };
        case 'IV':
        case 'VII':
        case 'VIII':
        case 'IX':
            return { perfect: 'i-e', imperfect: 'i-e', imperative: 'i-e' };
        default:
            return { perfect: 'a-a', imperfect: 'i-a', imperative: 'i-a' };
    }
}

export function detectVerbRootType(rootConsonants: any): 'triliteral' | 'quadriliteral' {
    const root = normalizeTextField(rootConsonants || '');
    if (!root) return 'triliteral';

    if (root.includes('-')) {
        const radicals = root.split('-').map((part: string) => part.trim()).filter(Boolean);
        return radicals.length >= 4 ? 'quadriliteral' : 'triliteral';
    }

    const normalized = root
        .toLowerCase()
        .replace(/għ|gh/g, 'G')
        .replace(/[^a-zċġħżG]/g, '');

    return normalized.length >= 4 ? 'quadriliteral' : 'triliteral';
}

export function hasVerbMorphologyInput(source: any) {
    if (!source) return false;
    const nested = source.verb_morphology || {};
    // Check for any of the legacy fields or the new field structure
    const hasLegacy = Object.keys(VERB_MORPHOLOGY_LEGACY_FIELDS).some(k => !!source[k] || !!nested[k]);
    const hasDisplayAlias = Object.keys(VERB_MORPHOLOGY_DISPLAY_ALIAS_FIELDS).some(k => !!source[k] || !!nested[k]);
    const hasNew = VERB_MORPHOLOGY_DB_FIELD_KEYS.some(k => !!source[k] || !!nested[k]);
    const hasNestedDisplayAlias = Object.keys(VERB_MORPHOLOGY_DISPLAY_ALIAS_FIELDS).some(k => !!nested[k]);
    return hasLegacy || hasDisplayAlias || hasNew || hasNestedDisplayAlias;
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
        class: normalized.class,
        verb_class: normalized.class,
        weak_class: normalized.weak_class,
        transitivity: normalized.transitivity,
        perfective_3sgm: normalized.perfective_3sgm,
        perfective_3sg_m: normalized.perfective_3sgm,
        imperfective_3sgm: normalized.imperfective_3sgm,
        imperfective_3sg_m: normalized.imperfective_3sgm,
        verbal_noun: normalized.verbal_noun,
        active_participle: normalized.active_participle,
        passive_participle: normalized.passive_participle,
        vowel_set_perf: normalized.vowel_set_perf,
        vowel_set_perfect: normalized.vowel_set_perf,
        vowel_set_impf: normalized.vowel_set_impf,
        vowel_set_imperfect: normalized.vowel_set_impf,
        vowel_set_impv: normalized.vowel_set_impv,
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

    for (const [alias, canonical] of Object.entries(VERB_MORPHOLOGY_DISPLAY_ALIAS_FIELDS)) {
        if (src[alias] !== undefined) result[canonical] = normalizeTextField(src[alias]);
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
        class: normalized.class || entry.verb_class || null,
        verb_class: normalized.class || entry.verb_class || null,
        weak_class: normalized.weak_class || entry.verb_weak_class || null,
        transitivity: normalized.transitivity || entry.verb_transitivity || '',
        perfective_3sgm: normalized.perfective_3sgm || entry.verb_perfective_3sgm || '',
        perfective_3sg_m: normalized.perfective_3sgm || entry.verb_perfective_3sgm || '',
        imperfective_3sgm: normalized.imperfective_3sgm || entry.verb_imperfective_3sgm || '',
        imperfective_3sg_m: normalized.imperfective_3sgm || entry.verb_imperfective_3sgm || '',
        verbal_noun: normalized.verbal_noun || entry.verb_verbal_noun || undefined,
        active_participle: normalized.active_participle || entry.verb_active_ptcp || undefined,
        passive_participle: normalized.passive_participle || entry.verb_passive_ptcp || undefined,
        vowel_set_perf: normalized.vowel_set_perf || entry.verb_vowel_perf || '',
        vowel_set_perfect: normalized.vowel_set_perf || entry.verb_vowel_perf || '',
        vowel_set_impf: normalized.vowel_set_impf || entry.verb_vowel_impf || '',
        vowel_set_imperfect: normalized.vowel_set_impf || entry.verb_vowel_impf || '',
        vowel_set_impv: normalized.vowel_set_impv || entry.verb_vowel_impv || '',
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
