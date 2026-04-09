import { normalizePluralFormRows } from './pluralForms.ts';

const DASH_VARIANTS = /[–—−]/g;

export type SuffixKind = 'nominal' | 'derivational';
export type SuffixRole = 'dual' | 'plural' | 'derivational';

const ROLE_LABELS: Record<SuffixRole, string> = {
    dual: 'Dual',
    plural: 'Plural',
    derivational: 'Derivational',
};

const ROLE_ORDER: Record<SuffixRole, number> = {
    dual: 0,
    plural: 1,
    derivational: 2,
};

const NOMINAL_MATCHERS = [
    {
        role: 'dual' as const,
        matchFields: ['dual_pattern'],
        displayFields: ['dual_form', 'dual', 'noun_morphology.dual', 'dual_pattern'],
    },
    {
        role: 'plural' as const,
        matchFields: ['form_plural_pattern', 'sound_suffix'],
        displayFields: [
            'inflections_pl',
            'plural_forms',
            'noun_morphology.plural_forms',
            'sound_plural',
            'form_plural_pattern',
            'sound_suffix',
        ],
    },
];

const DERIVATIONAL_MATCHERS = [
    {
        role: 'derivational' as const,
        matchFields: ['augmentative_pattern', 'morph_pattern', 'lemma_pattern'],
        displayFields: ['augmentative_form', 'augmentative_pattern', 'morph_pattern', 'lemma_pattern', 'headword'],
    },
];

const CATALOG_SOURCES = [
    { kind: 'nominal' as const, role: 'dual' as const, label: 'Dual', fields: ['dual_pattern'] },
    {
        kind: 'nominal' as const,
        role: 'plural' as const,
        label: 'Plural',
        fields: ['form_plural_pattern', 'sound_suffix'],
    },
] as const;

type RecordLike = Record<string, unknown>;

export interface SuffixCatalogItem {
    kind: SuffixKind;
    label: string;
    suffix: string;
    count: number;
    sample_headword?: string;
    sample_pos?: string;
}

export interface SuffixEntryMatch {
    role: SuffixRole;
    displayValue: string;
    sourceField: string;
    matchedSuffix: string;
}

function readPathValue(source: RecordLike | undefined, path: string): unknown {
    if (!source) return undefined;

    const parts = path.split('.');
    let current: unknown = source;

    for (const part of parts) {
        if (!current || typeof current !== 'object') return undefined;
        current = (current as RecordLike)[part];
    }

    return current;
}

function firstTextValue(value: unknown): string {
    if (value === undefined || value === null) return '';

    if (Array.isArray(value)) {
        for (const item of value) {
            const text = firstTextValue(item);
            if (text) return text;
        }
        return '';
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        const text = firstTextValue(item);
                        if (text) return text;
                    }
                    return '';
                }
            } catch {
                // Fall through to raw string handling.
            }
        }
    }

    const text = String(value).trim().normalize('NFC').replace(DASH_VARIANTS, '-');
    return text;
}

export function normalizeSuffixDash(value: unknown): string {
    return String(value ?? '')
        .trim()
        .normalize('NFC')
        .replace(DASH_VARIANTS, '-');
}

export function normalizeSuffixValue(value: unknown): string {
    return normalizeSuffixDash(value);
}

export function normalizeSuffixDisplay(value: unknown): string {
    const normalized = normalizeSuffixValue(value);
    if (!normalized) return '';
    return normalized.startsWith('-') ? normalized : '';
}

export function normalizeSuffixKey(value: unknown): string {
    return normalizeSuffixValue(value)
        .replace(/^-/, '')
        .toLowerCase();
}

export function isSuffixLikeValue(value: unknown): boolean {
    return normalizeSuffixValue(value).startsWith('-');
}

export function isDashMarkedSuffix(value: unknown): boolean {
    return normalizeSuffixDash(value).includes('-');
}

export function stripLeadingDash(value: unknown): string {
    return normalizeSuffixDash(value).replace(/^-+/, '');
}

export function splitSuffixValues(value: unknown): string[] {
    const normalized = normalizeSuffixValue(value);
    if (!normalized) return [];

    return normalized
        .split(',')
        .map((part) => normalizeSuffixDisplay(part))
        .filter(Boolean);
}

export function suffixValueMatches(value: unknown, suffix: unknown): boolean {
    const target = normalizeSuffixKey(suffix);
    if (!target) return false;

    return splitSuffixValues(value).some((part) => normalizeSuffixKey(part) === target);
}

function pickDisplayValue(source: RecordLike, fields: readonly string[]): string {
    for (const field of fields) {
        const value = readPathValue(source, field);
        const text = firstTextValue(value);
        if (text) return text;
    }

    return '';
}

function pickMatchingPluralDisplayValue(entry: RecordLike, suffix: string): string {
    const headword = String(readPathValue(entry, 'headword') || '').trim().normalize('NFC').toLowerCase();
    const targetSuffix = stripLeadingDash(suffix).toLowerCase();

    const candidates: Array<{ forms: unknown; patterns: unknown }> = [
        {
            forms: readPathValue(entry, 'adjective_morphology.plural'),
            patterns: readPathValue(entry, 'adjective_morphology.form_plural_pattern')
                ?? readPathValue(entry, 'form_plural_pattern')
                ?? readPathValue(entry, 'plural_pattern')
                ?? readPathValue(entry, 'morph_pattern')
                ?? readPathValue(entry, 'sound_suffix'),
        },
        {
            forms: readPathValue(entry, 'inflections_pl'),
            patterns: readPathValue(entry, 'form_plural_pattern')
                ?? readPathValue(entry, 'plural_pattern')
                ?? readPathValue(entry, 'sound_suffix')
                ?? readPathValue(entry, 'morph_pattern'),
        },
        {
            forms: readPathValue(entry, 'plural_forms'),
            patterns: readPathValue(entry, 'form_plural_pattern')
                ?? readPathValue(entry, 'plural_pattern')
                ?? readPathValue(entry, 'sound_suffix')
                ?? readPathValue(entry, 'morph_pattern'),
        },
        {
            forms: readPathValue(entry, 'noun_morphology.plural_forms'),
            patterns: readPathValue(entry, 'noun_morphology.form_plural_pattern')
                ?? readPathValue(entry, 'noun_morphology.plural_pattern')
                ?? readPathValue(entry, 'noun_morphology.sound_suffix')
                ?? readPathValue(entry, 'noun_morphology.morph_pattern'),
        },
    ];

    for (const candidate of candidates) {
        const pluralRows = normalizePluralFormRows(candidate.forms, candidate.patterns)
            .map((row) => ({
                form: String(row.form || '').trim(),
                pattern: String(row.pattern || '').trim(),
            }))
            .filter((row) => row.form || row.pattern);

        if (pluralRows.length === 0) continue;

        const patternMatches = pluralRows.filter((row) => row.pattern && suffixValueMatches(row.pattern, suffix));
        const targetPatternMatch = patternMatches.find((row) => {
            const form = String(row.form || '').trim().normalize('NFC').toLowerCase();
            return form && form !== headword;
        }) || patternMatches[0];
        if (targetPatternMatch?.form) {
            return targetPatternMatch.form;
        }

        if (targetSuffix) {
            const endingMatches = pluralRows.filter((row) => {
                const form = String(row.form || '').trim().normalize('NFC').toLowerCase();
                return form && form.endsWith(targetSuffix);
            });
            const targetEndingMatch = endingMatches.find((row) => {
                const form = String(row.form || '').trim().normalize('NFC').toLowerCase();
                return form && form !== headword;
            }) || endingMatches[0];
            if (targetEndingMatch?.form) {
                return targetEndingMatch.form;
            }
        }

        const formMatches = pluralRows.filter((row) => row.form && suffixValueMatches(row.form, suffix));
        const targetFormMatch = formMatches.find((row) => {
            const form = String(row.form || '').trim().normalize('NFC').toLowerCase();
            return form && form !== headword;
        }) || formMatches[0];
        if (targetFormMatch?.form) {
            return targetFormMatch.form;
        }
    }

    return '';
}

export function pickMatchingPluralDisplayValueForSuffix(entry: RecordLike, suffix: string): string {
    return pickMatchingPluralDisplayValue(entry, suffix);
}

function formatRoleLabel(roles: SuffixRole[]): string {
    return [...new Set(roles)]
        .sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b])
        .map((role) => ROLE_LABELS[role])
        .join(' + ');
}

function determineKind(roles: SuffixRole[]): SuffixKind {
    return roles.some((role) => role === 'dual' || role === 'plural') ? 'nominal' : 'derivational';
}

export function resolveSuffixEntryMatch(
    entry: RecordLike,
    suffix: string,
    kind: SuffixKind,
): SuffixEntryMatch | null {
    const normalizedSuffix = normalizeSuffixKey(suffix);
    if (!normalizedSuffix) return null;

    const matchers = kind === 'derivational' ? DERIVATIONAL_MATCHERS : NOMINAL_MATCHERS;

    for (const matcher of matchers) {
        for (const field of matcher.matchFields) {
            const value = readPathValue(entry, field);
            if (!suffixValueMatches(value, normalizedSuffix)) continue;

            const displayValue = matcher.role === 'plural'
                ? pickMatchingPluralDisplayValue(entry, suffix)
                : pickDisplayValue(entry, matcher.displayFields);

            return {
                role: matcher.role,
                displayValue: displayValue || normalizeSuffixDisplay(suffix),
                sourceField: field,
                matchedSuffix: normalizedSuffix,
            };
        }
    }

    return null;
}

export function buildSuffixCatalogItems(rows: RecordLike[]): SuffixCatalogItem[] {
    const groups = new Map<
        string,
        {
            suffix: string;
            roles: SuffixRole[];
            count: number;
            sample_headword: string;
            sample_pos: string;
        }
    >();

    for (const row of rows) {
        const rowBuckets = new Map<
            string,
            {
                suffix: string;
                roles: Set<SuffixRole>;
            }
        >();

        for (const source of CATALOG_SOURCES) {
            for (const field of source.fields) {
                const value = readPathValue(row, field);
                for (const suffix of splitSuffixValues(value)) {
                    const key = normalizeSuffixKey(suffix);
                    if (!key) continue;

                    const bucket = rowBuckets.get(key) || { suffix, roles: new Set<SuffixRole>() };
                    bucket.suffix = suffix;
                    bucket.roles.add(source.role);
                    rowBuckets.set(key, bucket);
                }
            }
        }

        for (const [key, bucket] of rowBuckets) {
            const existing = groups.get(key) || {
                suffix: bucket.suffix,
                roles: [] as SuffixRole[],
                count: 0,
                sample_headword: '',
                sample_pos: '',
            };

            existing.count += 1;
            existing.suffix = bucket.suffix;
            existing.roles = [...new Set([...existing.roles, ...bucket.roles])];
            if (!existing.sample_headword) existing.sample_headword = firstTextValue(row.headword);
            if (!existing.sample_pos) existing.sample_pos = firstTextValue(row.pos);
            groups.set(key, existing);
        }
    }

    return [...groups.values()]
        .map((item) => ({
            kind: determineKind(item.roles),
            label: formatRoleLabel(item.roles),
            suffix: item.suffix,
            count: item.count,
            sample_headword: item.sample_headword || undefined,
            sample_pos: item.sample_pos || undefined,
        }))
        .sort((a, b) => {
            if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
            return a.suffix.localeCompare(b.suffix);
        });
}
