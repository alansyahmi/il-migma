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

export interface NumeralMorphologyDisplayForms extends NumeralDisplayForms {
    cardinal: NumeralSurfaceValue[];
}

export type NumeralRole =
    | 'cardinal'
    | 'attributive_short'
    | 'attributive_long'
    | 'ordinal'
    | 'adverbial'
    | 'fractional'
    | 'multiplier'
    | 'distributive';

export const NUMERAL_ROLE_META: Record<NumeralRole, {
    label: string;
    displayKey: keyof NumeralMorphologyDisplayForms;
    dbField?: string;
    patternField?: string;
}> = {
    cardinal: { label: 'Cardinal', displayKey: 'cardinal' },
    attributive_short: {
        label: 'Attributive Short',
        displayKey: 'attributive_short',
        dbField: 'form_attributive_short',
        patternField: 'form_attributive_short_pattern',
    },
    attributive_long: {
        label: 'Attributive Long',
        displayKey: 'attributive_long',
        dbField: 'form_attributive_long',
    },
    ordinal: { label: 'Ordinal', displayKey: 'ordinal', dbField: 'ordinal_form' },
    adverbial: { label: 'Adverbial', displayKey: 'adverbial', dbField: 'adverbial_form' },
    fractional: { label: 'Fractional', displayKey: 'fractional', dbField: 'fractional_form' },
    multiplier: { label: 'Multiplier', displayKey: 'multiplier', dbField: 'multiplier_form' },
    distributive: { label: 'Distributive', displayKey: 'distributive', dbField: 'distributive_form' },
};

export const NUMERAL_ROLE_ORDER: NumeralRole[] = [
    'cardinal',
    'attributive_short',
    'attributive_long',
    'ordinal',
    'adverbial',
    'fractional',
    'multiplier',
    'distributive',
];

type LinkedNumeralEntry = {
    id?: string;
    headword?: string | null;
    pos?: string | null;
    numeral_type?: string | null;
    num_type?: string | null;
    relationship_source?: string | null;
    root_consonants?: string | null;
    cv_pattern?: string | null;
    pattern?: string | null;
    form_attributive_short_pattern?: string | null;
    form_plural_pattern?: string | null;
    morph_pattern?: string | null;
    form_masc_pattern?: string | null;
    form_fem_pattern?: string | null;
    numeral_morphology?: {
        numeral_type?: string | null;
        form_attributive_short_pattern?: string | null;
        form_plural_pattern?: string | null;
        morph_pattern?: string | null;
        pattern?: string | null;
        related_entries?: unknown[] | null;
    } | null;
    related_entries?: unknown[] | null;
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
    return 'Short-Attributive';
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
        || normalizePatternValue(entry.numeral_morphology?.form_attributive_short_pattern)
        || normalizePatternValue(entry.numeral_morphology?.form_plural_pattern)
        || normalizePatternValue(entry.numeral_morphology?.morph_pattern)
        || normalizePatternValue(entry.numeral_morphology?.pattern)
    );
}

function getLinkedNumeralRootKey(entry: LinkedNumeralEntry): string {
    return String(
        entry.root_consonants
        || (entry as any).root_pattern_form?.root?.consonants
        || '',
    ).trim().toLowerCase();
}

function getExplicitLinkedNumeralRole(entry: LinkedNumeralEntry): NumeralRole | null {
    return getExplicitNumeralEntryRole(entry);
}

export function normalizeNumeralRole(value: unknown): NumeralRole | null {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    return normalized in NUMERAL_ROLE_META ? normalized as NumeralRole : null;
}

export function isCardinalNumeralRole(value: unknown): boolean {
    return (normalizeNumeralRole(value) || 'cardinal') === 'cardinal';
}

export function getExplicitNumeralEntryRole(entry: any): NumeralRole | null {
    return (
        normalizeNumeralRole(entry?.numeral_type)
        || normalizeNumeralRole(entry?.numeral_morphology?.numeral_type)
        || normalizeNumeralRole(entry?.num_type)
    );
}

function addNumeralRoleSurfaceKey(target: Set<string>, value: unknown) {
    const normalized = normalizeNumeralLookupKey(stripTheoreticalPrefix(String(value || '').trim()));
    if (normalized && normalized !== '-') target.add(normalized);
}

function getCardinalRoleSurfaceKeys(cardinal: LinkedNumeralEntry): Partial<Record<NumeralRole, Set<string>>> {
    const source = cardinal.numeral_morphology
        ? { ...cardinal, ...cardinal.numeral_morphology }
        : cardinal;
    const rootConsonants = getLinkedNumeralRootKey(cardinal);
    const generated = buildNumeralDisplayForms(String(cardinal.headword || ''), rootConsonants, []);
    const roleKeys: Partial<Record<NumeralRole, Set<string>>> = {};

    NUMERAL_ROLE_ORDER.forEach((role) => {
        if (role === 'cardinal') return;
        const roleMeta = NUMERAL_ROLE_META[role];
        const keys = new Set<string>();
        if (roleMeta.dbField) {
            splitNumeralStoredValues((source as any)[roleMeta.dbField]).forEach((value) => addNumeralRoleSurfaceKey(keys, value));
        }
        const displayKey = roleMeta.displayKey as keyof NumeralDisplayForms;
        (generated[displayKey] as NumeralSurfaceValue[] | undefined)?.forEach((item) => {
            addNumeralRoleSurfaceKey(keys, item.value);
        });
        if (keys.size > 0) roleKeys[role] = keys;
    });

    return roleKeys;
}

function inferNumeralRoleFromCardinalSurfaces(
    entry: LinkedNumeralEntry,
    familyEntries: LinkedNumeralEntry[] = [],
): NumeralRole | null {
    const headwordKey = normalizeNumeralLookupKey(String(entry.headword || ''));
    if (!headwordKey) return null;

    const entryRootKey = getLinkedNumeralRootKey(entry);

    for (const familyEntry of familyEntries) {
        if (!familyEntry || familyEntry === entry) continue;
        const explicitFamilyRole = getExplicitLinkedNumeralRole(familyEntry);
        if (explicitFamilyRole && explicitFamilyRole !== 'cardinal') continue;

        const familyRootKey = getLinkedNumeralRootKey(familyEntry);
        if (entryRootKey && familyRootKey && entryRootKey !== familyRootKey) continue;

        const roleKeys = getCardinalRoleSurfaceKeys(familyEntry);
        for (const role of NUMERAL_ROLE_ORDER) {
            if (role === 'cardinal') continue;
            if (roleKeys[role]?.has(headwordKey)) return role;
        }
    }

    return null;
}

export function getNumeralEntryRole(entry: any, familyEntries: any[] = []): NumeralRole {
    return (
        getExplicitNumeralEntryRole(entry)
        || inferNumeralRoleFromCardinalSurfaces(entry, familyEntries as LinkedNumeralEntry[])
        || 'cardinal'
    );
}

export function getNumeralRoleLabel(value: unknown): string {
    const role = normalizeNumeralRole(value);
    if (role) return NUMERAL_ROLE_META[role].label;
    const normalized = String(value || '').trim();
    if (!normalized) return NUMERAL_ROLE_META.cardinal.label;
    return normalized
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function splitNumeralStoredValues(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') return String((item as any).value || (item as any).form || '').trim();
                return '';
            })
            .map((item) => item.trim())
            .filter(Boolean);
    }

    if (typeof value !== 'string') return [];
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
        try {
            return splitNumeralStoredValues(JSON.parse(trimmed));
        } catch {
            return [trimmed];
        }
    }

    return [trimmed];
}

function applyFallbackPattern(items: NumeralSurfaceValue[], pattern: unknown): NumeralSurfaceValue[] {
    const patternValue = normalizePatternValue(pattern);
    if (!patternValue) return items;
    return items.map((item) => item.pattern ? item : { ...item, pattern: patternValue });
}

function toSavedNumeralSurfaceList(
    value: unknown,
    linkedEntries: LinkedNumeralEntry[],
    pattern?: unknown,
): NumeralSurfaceValue[] {
    return applyFallbackPattern(
        toNumeralSurfaceList(splitNumeralStoredValues(value), linkedEntries, 'plain'),
        pattern,
    );
}

function toCurrentNumeralRoleSurface(headword: string, pattern?: unknown): NumeralSurfaceValue[] {
    const surface = toNumeralSurfaceValue(headword, [], 'plain');
    return surface ? applyFallbackPattern([surface], pattern) : [];
}

function unwrapLinkedNumeralEntry(item: unknown): LinkedNumeralEntry | null {
    if (!item || typeof item !== 'object') return null;
    const source = item as any;
    const entry = source.entry && typeof source.entry === 'object' ? source.entry : source;
    return entry && typeof entry === 'object' ? entry as LinkedNumeralEntry : null;
}

function getNestedLinkedNumeralEntries(entry: LinkedNumeralEntry): LinkedNumeralEntry[] {
    return [
        ...((entry as any).related_entries || []),
        ...((entry as any).numeral_morphology?.related_entries || []),
    ]
        .map(unwrapLinkedNumeralEntry)
        .filter((item): item is LinkedNumeralEntry => Boolean(item));
}

function expandLinkedNumeralEntries(linkedEntries: LinkedNumeralEntry[]): LinkedNumeralEntry[] {
    const expanded: LinkedNumeralEntry[] = [];
    const indexes = new Map<string, number>();
    const isRicherEntry = (next: LinkedNumeralEntry, current: LinkedNumeralEntry) => {
        const nextRole = getExplicitLinkedNumeralRole(next);
        const currentRole = getExplicitLinkedNumeralRole(current);
        if (nextRole && !currentRole) return true;
        if (next.numeral_morphology && !current.numeral_morphology) return true;
        if (extractLinkedEntryPattern(next) && !extractLinkedEntryPattern(current)) return true;
        return false;
    };
    const append = (entry: LinkedNumeralEntry | null) => {
        if (!entry) return;
        const key = String(entry.id || normalizeNumeralLookupKey(entry.headword || '')).toLowerCase().trim();
        if (!key) return;

        const existingIndex = indexes.get(key);
        if (existingIndex !== undefined) {
            if (isRicherEntry(entry, expanded[existingIndex])) {
                expanded[existingIndex] = { ...expanded[existingIndex], ...entry };
            }
            return;
        }

        indexes.set(key, expanded.length);
        expanded.push(entry);
    };

    linkedEntries.forEach((entry) => {
        append(unwrapLinkedNumeralEntry(entry));
        getNestedLinkedNumeralEntries(entry).forEach(append);
    });

    return expanded;
}

function toLinkedNumeralSurface(entry: LinkedNumeralEntry): NumeralSurfaceValue | null {
    const value = String(entry.headword || '').trim();
    if (!value) return null;
    return {
        value,
        marker: 'plain',
        entryId: entry.id,
        pattern: extractLinkedEntryPattern(entry),
    };
}

function buildNumeralFamilyRoleForms(
    linkedEntries: LinkedNumeralEntry[],
    currentHeadword: string,
): Partial<Record<NumeralRole, NumeralSurfaceValue[]>> {
    const currentKey = normalizeNumeralLookupKey(currentHeadword);
    const seen = new Set<string>();
    const forms: Partial<Record<NumeralRole, NumeralSurfaceValue[]>> = {};

    linkedEntries.forEach((entry) => {
        if (String(entry.pos || 'numeral').trim().toLowerCase() !== 'numeral') return;

        const valueKey = normalizeNumeralLookupKey(String(entry.headword || ''));
        if (!valueKey || valueKey === currentKey) return;

        const identity = String(entry.id || valueKey).trim().toLowerCase();
        if (!identity || seen.has(identity)) return;
        seen.add(identity);

        const surface = toLinkedNumeralSurface(entry);
        if (!surface) return;

        const role = getExplicitLinkedNumeralRole(entry) || inferNumeralRoleFromCardinalSurfaces(entry, linkedEntries);
        if (!role) return;
        if (!forms[role]) forms[role] = [];
        forms[role]!.push(surface);
    });

    return forms;
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

export function getNumeralDerivedCandidateHeadwords(headword: string, rootConsonants: string): string[] {
    const normalizedHeadword = normalizeNumeralLookupKey(headword);
    if (!normalizedHeadword || !rootConsonants) return [];

    const forms = buildNumeralDisplayForms(headword, rootConsonants, []);
    const seen = new Set<string>();
    const candidates: string[] = [];

    Object.values(forms).forEach((items: NumeralSurfaceValue[]) => {
        items.forEach((item) => {
            const value = String(item?.value || '').trim();
            const key = normalizeNumeralLookupKey(value);
            if (!value || !key || key === normalizedHeadword || value === '-' || seen.has(key)) return;
            seen.add(key);
            candidates.push(value);
        });
    });

    return candidates;
}

export type NumeralRelationshipCandidate = {
    id?: string | null;
    target_id?: string | null;
    headword?: string | null;
    pos?: string | null;
    numeral_type?: string | null;
    numeral_morphology?: {
        numeral_type?: string | null;
    } | null;
};

export type NumeralRelationshipSelectionOptions = {
    currentEntryId?: string | null;
    currentNumeralType?: string | null;
    existingRelatedEntries?: unknown[];
    candidateHeadwords?: string[];
    entries?: unknown[];
};

function unwrapNumeralSearchResult(item: unknown): NumeralRelationshipCandidate | null {
    if (!item || typeof item !== 'object') return null;
    const source = item as any;
    const entry = (source.entry && typeof source.entry === 'object') ? source.entry : source;
    return entry && typeof entry === 'object' ? entry as NumeralRelationshipCandidate : null;
}

function getRelationshipTargetId(item: unknown): string {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object') return '';
    const source = item as any;
    return String(source.id || source.target_id || source.entry_id || '').trim();
}

export function selectNumeralRelationshipEntries({
    currentEntryId,
    currentNumeralType,
    existingRelatedEntries = [],
    candidateHeadwords = [],
    entries = [],
}: NumeralRelationshipSelectionOptions): NumeralRelationshipCandidate[] {
    const currentId = String(currentEntryId || '').trim();
    const currentRole = normalizeNumeralRole(currentNumeralType) || 'cardinal';
    const existingIds = new Set(existingRelatedEntries.map(getRelationshipTargetId).filter(Boolean));
    const candidateHeadwordKeys = new Set(candidateHeadwords.map(normalizeNumeralLookupKey).filter(Boolean));
    const seenIds = new Set<string>();
    const candidates: NumeralRelationshipCandidate[] = [];

    for (const rawEntry of entries) {
        const entry = unwrapNumeralSearchResult(rawEntry);
        if (!entry) continue;

        const id = getRelationshipTargetId(entry);
        if (!id || id === currentId || existingIds.has(id) || seenIds.has(id)) continue;
        if (String(entry.pos || '').trim().toLowerCase() !== 'numeral') continue;
        if (candidateHeadwordKeys.size > 0 && !candidateHeadwordKeys.has(normalizeNumeralLookupKey(entry.headword || ''))) continue;

        seenIds.add(id);
        candidates.push(entry);
    }

    if (currentRole === 'cardinal') {
        return candidates.filter((entry) => getNumeralEntryRole(entry, candidates) !== 'cardinal');
    }

    const cardinalMatches = candidates.filter((entry) => getNumeralEntryRole(entry, candidates) === 'cardinal');
    if (cardinalMatches.length > 0) return cardinalMatches;

    return candidates.filter((entry) => getNumeralEntryRole(entry, candidates) !== currentRole);
}

export function buildNumeralDisplayForms(
    headword: string,
    rootConsonants: string,
    linkedEntries: LinkedNumeralEntry[] = [],
): NumeralDisplayForms {
    const expandedLinkedEntries = expandLinkedNumeralEntries(linkedEntries);
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
        ordinal: toNumeralSurfaceList(resolveDisplayValues('ordinal', mergedAutoForms.ordinal), expandedLinkedEntries, 'auto_generated'),
        adverbial: toNumeralSurfaceList(resolveDisplayValues('adverbial', mergedAutoForms.adverbial), expandedLinkedEntries, 'auto_generated'),
        fractional: toNumeralSurfaceList(resolveDisplayValues('fractional', mergedAutoForms.fractional_semitic), expandedLinkedEntries, 'auto_generated'),
        multiplier: toNumeralSurfaceList(
            resolveDisplayValues(
                'multiplier',
                [mergedAutoForms.multiplier_form1, mergedAutoForms.multiplier_form2].filter((value): value is string => Boolean(value)),
            ),
            expandedLinkedEntries,
            'auto_generated',
        ),
        distributive: toNumeralSurfaceList(resolveDisplayValues('distributive', mergedAutoForms.distributive), expandedLinkedEntries, 'auto_generated'),
        attributive_short: toNumeralSurfaceList(resolveDisplayValues('attributive_short', shouldSuppressNumeralAttributiveForms(headword) ? [] : mergedAutoForms.attributive_short), expandedLinkedEntries, 'auto_generated'),
        attributive_long: toNumeralSurfaceList(resolveDisplayValues('attributive_long', shouldSuppressNumeralAttributiveForms(headword) ? [] : mergedAutoForms.attributive_long), expandedLinkedEntries, 'auto_generated'),
    };
}

export function buildNumeralMorphologyDisplayForms(
    headword: string,
    rootConsonants: string,
    morphology: any = {},
    linkedEntries: LinkedNumeralEntry[] = [],
): NumeralMorphologyDisplayForms {
    const expandedLinkedEntries = expandLinkedNumeralEntries(linkedEntries);
    const saved = morphology?.numeral_morphology
        ? { ...morphology, ...morphology.numeral_morphology }
        : (morphology || {});
    const currentEntryForRole = {
        ...saved,
        headword,
        root_consonants: saved.root_consonants || rootConsonants,
    };
    const role = normalizeNumeralRole(saved.numeral_type)
        || inferNumeralRoleFromCardinalSurfaces(currentEntryForRole, expandedLinkedEntries)
        || 'cardinal';
    const roleMeta = NUMERAL_ROLE_META[role];
    const familyRoleForms = buildNumeralFamilyRoleForms(expandedLinkedEntries, headword);
    const currentRolePattern = saved.cv_pattern || saved.entry_cv_pattern || saved.pattern || (roleMeta.patternField ? saved[roleMeta.patternField] : null);
    const currentRoleSurface = toCurrentNumeralRoleSurface(headword, currentRolePattern);
    const linkedCardinal = expandedLinkedEntries.find((entry) => getExplicitLinkedNumeralRole(entry) === 'cardinal')
        || expandedLinkedEntries.find((entry) => getNumeralEntryRole(entry, expandedLinkedEntries) === 'cardinal');
    const cardinal = role === 'cardinal'
        ? currentRoleSurface
        : linkedCardinal
            ? [toNumeralSurfaceValue(linkedCardinal.headword || '', expandedLinkedEntries, 'plain')].filter((item): item is NumeralSurfaceValue => Boolean(item))
            : [];

    if (role !== 'cardinal') {
        const emptyForms: NumeralMorphologyDisplayForms = {
            cardinal,
            ordinal: [],
            adverbial: [],
            fractional: [],
            multiplier: [],
            distributive: [],
            attributive_short: [],
            attributive_long: [],
        };

        const cardinalForms = linkedCardinal
            ? buildNumeralMorphologyDisplayForms(
                linkedCardinal.headword || '',
                linkedCardinal.root_consonants || rootConsonants,
                {
                    ...(linkedCardinal.numeral_morphology || {}),
                    numeral_type: 'cardinal',
                    cv_pattern: extractLinkedEntryPattern(linkedCardinal),
                },
                expandedLinkedEntries,
            )
            : emptyForms;

        const displayForms: NumeralMorphologyDisplayForms = {
            ...emptyForms,
            ...cardinalForms,
            cardinal,
        };
        NUMERAL_ROLE_ORDER.forEach((familyRole) => {
            if (familyRole === role) return;
            const familyValues = familyRoleForms[familyRole];
            if (familyValues?.length) {
                (displayForms[NUMERAL_ROLE_META[familyRole].displayKey] as NumeralSurfaceValue[]) = familyValues;
            }
        });
        (displayForms[roleMeta.displayKey] as NumeralSurfaceValue[]) = currentRoleSurface;
        return displayForms;
    }

    const generated = buildNumeralDisplayForms(headword, rootConsonants, expandedLinkedEntries);
    const pickSaved = (
        dbKey: string,
        generatedItems: NumeralSurfaceValue[],
        pattern?: unknown,
    ) => {
        const savedItems = toSavedNumeralSurfaceList(saved[dbKey], expandedLinkedEntries, pattern);
        return savedItems.length > 0 ? savedItems : generatedItems;
    };

    const displayForms: NumeralMorphologyDisplayForms = {
        cardinal,
        attributive_short: familyRoleForms.attributive_short?.length
            ? familyRoleForms.attributive_short
            : pickSaved('form_attributive_short', generated.attributive_short, saved.form_attributive_short_pattern),
        attributive_long: familyRoleForms.attributive_long?.length
            ? familyRoleForms.attributive_long
            : pickSaved('form_attributive_long', generated.attributive_long),
        ordinal: familyRoleForms.ordinal?.length
            ? familyRoleForms.ordinal
            : pickSaved('ordinal_form', generated.ordinal),
        adverbial: familyRoleForms.adverbial?.length
            ? familyRoleForms.adverbial
            : pickSaved('adverbial_form', generated.adverbial),
        fractional: familyRoleForms.fractional?.length
            ? familyRoleForms.fractional
            : pickSaved('fractional_form', generated.fractional),
        multiplier: familyRoleForms.multiplier?.length
            ? familyRoleForms.multiplier
            : pickSaved('multiplier_form', generated.multiplier),
        distributive: familyRoleForms.distributive?.length
            ? familyRoleForms.distributive
            : pickSaved('distributive_form', generated.distributive),
    };

    return displayForms;
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
    'plural_forms'
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
        form_plural_pattern: src.form_plural_pattern,
        vowel_set_sg: src.vowel_set_sg,
        vowel_set_pl: src.vowel_set_pl,
        vowel_set_opp: src.vowel_set_opp,
        vowel_set_dual: src.vowel_set_dual,
        plural_forms: src.plural_forms,
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
        src.form_masc || src.form_fem || src.form_masc_pattern || src.form_fem_pattern ||
        src.plural_form || src.plural_forms || src.plural
    );
}

export function buildNumeralMorphologyRecord(entry: any, source: any) {
    const entryId = entry?.id || source?.entry_id || source?.id;
    const normalized = normalizeNumeralMorphologyForEntry(source);

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

export function normalizeNumeralMorphologyForEntry(source: any) {
    if (!source) return {};
    const src = source?.numeral_morphology
        ? { ...source, ...source.numeral_morphology }
        : source;
    const normalized = normalizeNumeralMorphologyInput(src);
    const role = normalizeNumeralRole(normalized.numeral_type || src.numeral_type) || 'cardinal';
    normalized.numeral_type = role;

    if (role === 'cardinal') return normalized;

    const roleMeta = NUMERAL_ROLE_META[role];
    const result: any = { numeral_type: role };
    const headword = String(src.headword || '').trim();
    const storedRoleValue = roleMeta.dbField ? String(normalized[roleMeta.dbField] || '').trim() : '';
    const roleValue = headword || storedRoleValue;
    if (roleMeta.dbField && roleValue) {
        result[roleMeta.dbField] = roleValue;
    }

    const cvPattern = String(src.cv_pattern || src.entry_cv_pattern || '').trim();
    if (roleMeta.patternField && cvPattern) {
        result[roleMeta.patternField] = cvPattern;
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
