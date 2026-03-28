import { generateZokkForms } from './zokkEngine.ts';
import { resolveAttestedEntryFromEntries, type FormMarker } from './conjugationEngine.ts';

export type StemSearchPreviewKind = 'imperfect' | 'imperative' | 'passive' | 'verbal-noun';

type StemSearchMorphologySource = {
    stem_string: string;
    class_type: 'ar' | 'ir';
    is_hybrid: boolean;
    root?: string | null;
    agentive_suffix?: string | null;
};

export interface StemSearchPreviewSecondary {
    value: string;
    hasPage: boolean;
    entryId?: string;
    marker?: FormMarker;
}

export interface StemSearchPreviewRow {
    kind: StemSearchPreviewKind;
    value: string;
    hasPage: boolean;
    entryId?: string;
    marker?: FormMarker;
    secondary?: StemSearchPreviewSecondary;
}

function normalizeStemMorphology(source?: Partial<StemSearchMorphologySource> | null): StemSearchMorphologySource | null {
    if (!source) return null;

    const stem_string = String(source.stem_string || '').trim();
    const class_type = source.class_type === 'ar' || source.class_type === 'ir' ? source.class_type : null;
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

function toSurface(
    entry: { word: string; id?: string } | null,
    fallback: string,
): { value: string; hasPage: boolean; entryId?: string; marker: FormMarker } {
    if (entry?.word) {
        return {
            value: entry.word,
            hasPage: true,
            entryId: entry.id,
            marker: 'plain',
        };
    }

    return {
        value: fallback,
        hasPage: false,
        marker: 'auto_generated',
    };
}

export function buildStemSearchPreview(
    entry: any,
    relatedEntries: any[] = [],
): StemSearchPreviewRow[] {
    const normalized = normalizeStemMorphology(entry?.zokk_morphology);
    if (!normalized) return [];

    const forms = generateZokkForms({
        stem_string: normalized.stem_string,
        class_type: normalized.class_type,
        is_hybrid: normalized.is_hybrid,
        root: normalized.root || undefined,
        agentive_suffix: normalized.agentive_suffix || undefined,
    });

    const candidates = [entry, ...relatedEntries].filter(Boolean);
    const stem = normalized.stem_string;
    const root = normalized.root || undefined;
    const citationRow = forms.conjugation?.rows.find((row) => row.person_mt === '3ms');

    const resolve = (
        surface: string | undefined,
        criteria: {
            type: 'lemma' | 'passive' | 'active' | 'noun' | 'imperfect' | 'imperative';
            pos: 'verb' | 'participle' | 'noun';
            participleType?: 'passive' | 'active';
        },
    ) => {
        if (!surface) return null;
        return resolveAttestedEntryFromEntries(candidates, {
            surface,
            form: 'I',
            type: criteria.type,
            pos: criteria.pos,
            participleType: criteria.participleType,
            root,
            stem,
        });
    };

    const imperfect = citationRow?.imperfect || '';
    const imperative = forms.conjugation?.imperative_sg || '';
    const passive = forms.passive_participle?.masc || '';
    const verbalNoun = forms.verbal_noun || '';
    const active = forms.agentive?.masc || '';

    const imperfectEntry = resolve(imperfect, { type: 'imperfect', pos: 'verb' });
    const imperativeEntry = resolve(imperative, { type: 'imperative', pos: 'verb' });
    const passiveEntry = resolve(passive, { type: 'passive', pos: 'participle', participleType: 'passive' });
    const activeEntry = resolve(active, { type: 'active', pos: 'participle', participleType: 'active' });
    const verbalEntry = resolve(verbalNoun, { type: 'noun', pos: 'noun' });

    const rows: StemSearchPreviewRow[] = [
        {
            kind: 'imperfect',
            ...toSurface(imperfectEntry, imperfect),
        },
        {
            kind: 'imperative',
            ...toSurface(imperativeEntry, imperative),
        },
        {
            kind: 'passive',
            ...toSurface(passiveEntry, passive),
            secondary: activeEntry && activeEntry.word !== passiveEntry?.word
                ? toSurface(activeEntry, active)
                : undefined,
        },
        {
            kind: 'verbal-noun',
            ...toSurface(verbalEntry, verbalNoun),
        },
    ];

    return rows.filter((row) => row.value && row.value !== '-');
}
