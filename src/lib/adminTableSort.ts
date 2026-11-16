/**
 * src/lib/adminTableSort.ts
 * Shared sorting state and comparators for Admin Dashboard tables.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string = string> {
    key: K;
    dir: SortDirection;
}

export function toggleSortState<K extends string>(
    current: SortState<K> | null,
    nextKey: K,
    defaultDir: SortDirection = 'asc',
): SortState<K> {
    if (current && current.key === nextKey) {
        return {
            key: nextKey,
            dir: current.dir === 'asc' ? 'desc' : 'asc',
        };
    }
    return {
        key: nextKey,
        dir: defaultDir,
    };
}

function isEmptySortValue(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (typeof value === 'number') return Number.isNaN(value);
    return false;
}

function parseNumericValue(value: unknown, numericStrings: boolean): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (numericStrings && typeof value === 'string') {
        const trimmed = value.trim();
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            const parsed = Number(trimmed);
            return Number.isFinite(parsed) ? parsed : null;
        }
    }
    return null;
}

export function compareSortValues(
    a: unknown,
    b: unknown,
    dir: SortDirection,
    options?: { numericStrings?: boolean },
): number {
    const emptyA = isEmptySortValue(a);
    const emptyB = isEmptySortValue(b);
    if (emptyA && emptyB) return 0;
    // Keep missing/blank values at the bottom regardless of sort direction
    if (emptyA) return 1;
    if (emptyB) return -1;

    const numericStrings = Boolean(options?.numericStrings);
    const numA = parseNumericValue(a, numericStrings);
    const numB = parseNumericValue(b, numericStrings);

    let cmp: number;
    if (numA !== null && numB !== null) {
        cmp = numA - numB;
    } else if (typeof a === 'boolean' && typeof b === 'boolean') {
        cmp = Number(a) - Number(b);
    } else {
        cmp = String(a).trim().localeCompare(String(b).trim(), undefined, {
            sensitivity: 'base',
            numeric: true,
        });
    }

    return dir === 'asc' ? cmp : -cmp;
}

export function sortByAccessor<T>(
    items: readonly T[],
    dir: SortDirection,
    getValue: (item: T) => unknown,
    getTieBreaker?: (item: T) => unknown,
    options?: { numericStrings?: boolean },
): T[] {
    return [...items].sort((a, b) => {
        const primary = compareSortValues(getValue(a), getValue(b), dir, options);
        if (primary !== 0 || !getTieBreaker) return primary;
        return compareSortValues(getTieBreaker(a), getTieBreaker(b), 'asc', options);
    });
}
