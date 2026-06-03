import { generateZokkForms, type ZokkResult } from './zokkEngine.ts';
import { formatStemDisplay } from './stemDefaults.ts';

export type StemMorphologySource = {
    stem_string: string;
    class_type: 'ar' | 'ir';
    is_hybrid: boolean;
    root?: string | null;
    agentive_suffix?: string | null;
};

export type StemMorphologyInput = Omit<Partial<StemMorphologySource>, 'class_type'> & {
    class_type?: 'ar' | 'ir' | '' | null;
};

export interface StemMorphologyViewModel {
    source: StemMorphologySource;
    displayStem: string;
    displayRoot: string | null;
    forms: ZokkResult;
    hasDerivedForms: boolean;
}

function normalizeClassType(value: unknown): 'ar' | 'ir' | null {
    return value === 'ar' || value === 'ir' ? value : null;
}

export function normalizeStemMorphology(source?: StemMorphologyInput | null): StemMorphologySource | null {
    if (!source) return null;

    const stem_string = String(source.stem_string || '').trim();
    const class_type = normalizeClassType(source.class_type);
    if (!stem_string || !class_type) return null;

    const root = typeof source.root === 'string' ? source.root.trim() : source.root ?? null;
    const agentive_suffix = typeof source.agentive_suffix === 'string'
        ? source.agentive_suffix.trim()
        : source.agentive_suffix ?? null;

    return {
        stem_string,
        class_type,
        is_hybrid: !!source.is_hybrid,
        root: root || null,
        agentive_suffix: agentive_suffix || null,
    };
}

export function buildStemMorphologyViewModel(source?: StemMorphologyInput | null): StemMorphologyViewModel | null {
    const normalized = normalizeStemMorphology(source);
    if (!normalized) return null;

    const forms = generateZokkForms({
        stem_string: normalized.stem_string,
        class_type: normalized.class_type,
        is_hybrid: normalized.is_hybrid,
        root: normalized.root || undefined,
        agentive_suffix: normalized.agentive_suffix || undefined,
    });
    return {
        source: normalized,
        displayStem: formatStemDisplay(normalized.stem_string),
        displayRoot: normalized.root || null,
        forms,
        hasDerivedForms: !!(
            forms.passive_participle ||
            forms.agentive ||
            forms.verbal_noun ||
            forms.hybrid_forms?.form_ii ||
            forms.hybrid_forms?.semitic_passive_participle ||
            forms.hybrid_forms?.semitic_verbal_noun
        ),
    };
}

export async function ensureStemsTable(client: any) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS stems (
            stem_string      TEXT PRIMARY KEY,
            class_type       TEXT NOT NULL,
            is_hybrid        INTEGER NOT NULL DEFAULT 0,
            root             TEXT,
            agentive_suffix  TEXT,
            created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    `);
}

export async function syncStemMorphology(client: any, stem_string: string, payload: any) {
    if (!stem_string) return;

    // We can extract zokk_* fields from payload
    const class_type = payload.zokk_class || payload.zokk_morphology?.zokk_class;
    if (!class_type) return;

    const is_hybrid = payload.zokk_is_hybrid || payload.zokk_morphology?.zokk_is_hybrid ? 1 : 0;
    const root = payload.root_consonants || payload.zokk_morphology?.root_consonants;
    const agentive_suffix = payload.zokk_agentive_suffix || payload.zokk_morphology?.zokk_agentive_suffix;

    await client.execute({
        sql: `INSERT INTO stems (stem_string, class_type, is_hybrid, root, agentive_suffix, updated_at)
              VALUES (?, ?, ?, ?, ?, (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))
              ON CONFLICT(stem_string) DO UPDATE SET
                class_type = excluded.class_type,
                is_hybrid = excluded.is_hybrid,
                root = excluded.root,
                agentive_suffix = excluded.agentive_suffix,
                updated_at = excluded.updated_at`,
        args: [stem_string, class_type, is_hybrid, root || null, agentive_suffix || null]
    });
}
