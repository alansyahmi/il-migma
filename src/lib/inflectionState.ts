import type { Entry } from '@/types';

type InflectableFlagSource = Record<string, unknown> | Pick<Entry, 'is_inflectable' | 'has_inflection'> | {
    is_inflectable?: unknown;
    has_inflection?: unknown;
} | null | undefined;

const FUNCTION_WORD_INFLECTION_POS = new Set([
    'pronoun',
    'adverb',
    'preposition',
    'particle',
    'article',
]);

export function isFunctionWordInflectionPos(pos?: string | null): boolean {
    return FUNCTION_WORD_INFLECTION_POS.has(String(pos || '').trim().toLowerCase());
}

export function isInflectableEnabled(...values: unknown[]): boolean {
    return !values.some((value) => {
        if (value === false || value === 0) return true;
        if (typeof value !== 'string') return false;
        const normalized = value.trim().toLowerCase();
        return normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off';
    });
}

function hasExplicitFlag(source: InflectableFlagSource, key: 'has_inflection' | 'is_inflectable'): boolean {
    if (!source || typeof source !== 'object') return false;
    if (!Object.prototype.hasOwnProperty.call(source, key)) return false;

    const value = source[key];
    if (value === undefined || value === null) return false;
    return typeof value !== 'string' || value.trim() !== '';
}

export function resolveEntryInflectableValue(source: InflectableFlagSource): unknown {
    if (hasExplicitFlag(source, 'has_inflection')) return source?.has_inflection;
    if (hasExplicitFlag(source, 'is_inflectable')) return source?.is_inflectable;
    return undefined;
}

export function canShowFunctionWordInflectionTable(pos?: string | null, ...inflectableValues: unknown[]): boolean {
    return isFunctionWordInflectionPos(pos) && isInflectableEnabled(...inflectableValues);
}

export function canShowFunctionWordInflectionTableForEntry(pos?: string | null, entry?: InflectableFlagSource): boolean {
    return canShowFunctionWordInflectionTable(pos, resolveEntryInflectableValue(entry));
}

export function shouldHideInflectionTable(pos?: string | null, ...inflectableValues: unknown[]): boolean {
    return !canShowFunctionWordInflectionTable(pos, ...inflectableValues);
}

export function shouldHideInflectionTableForEntry(pos?: string | null, entry?: InflectableFlagSource): boolean {
    return !canShowFunctionWordInflectionTableForEntry(pos, entry);
}

export function shouldMarkInflectionTheoretical(...inflectableValues: unknown[]): boolean {
    return !isInflectableEnabled(...inflectableValues);
}

export function isInflectionDisabled(
    entry: InflectableFlagSource,
): boolean {
    return shouldMarkInflectionTheoretical(resolveEntryInflectableValue(entry));
}

export function applyInflectableToggle<T extends { is_inflectable?: unknown; has_inflection?: unknown }>(
    form: T,
    checked: boolean,
): T & { is_inflectable: boolean; has_inflection?: boolean } {
    return {
        ...form,
        is_inflectable: checked,
        ...(Object.prototype.hasOwnProperty.call(form, 'has_inflection') ? { has_inflection: checked } : {}),
    };
}
