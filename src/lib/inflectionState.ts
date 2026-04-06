import type { Entry } from '@/types';

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

export function shouldHideInflectionTable(pos?: string | null, ...inflectableValues: unknown[]): boolean {
    return isFunctionWordInflectionPos(pos) && !isInflectableEnabled(...inflectableValues);
}

export function shouldMarkInflectionTheoretical(...inflectableValues: unknown[]): boolean {
    return !isInflectableEnabled(...inflectableValues);
}

export function isInflectionDisabled(
    entry: Pick<Entry, 'is_inflectable'> | { is_inflectable?: unknown } | null | undefined,
): boolean {
    return shouldMarkInflectionTheoretical(entry?.is_inflectable);
}

export function applyInflectableToggle<T extends { is_inflectable?: unknown }>(
    form: T,
    checked: boolean,
): T & { is_inflectable: boolean } {
    return {
        ...form,
        is_inflectable: checked,
    };
}
