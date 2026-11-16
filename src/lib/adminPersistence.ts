/**
 * src/lib/adminPersistence.ts
 * Helpers for persisting Admin Dashboard workspace settings across navigation and reloads.
 */

export function readPersistedAdminState<T extends Record<string, unknown>>(
    storageKey: string,
    defaults: T,
    sanitize?: (raw: Partial<T>, defaults: T) => T,
): T {
    if (typeof window === 'undefined') {
        return defaults;
    }

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return defaults;
        }
        const merged = { ...defaults, ...(parsed as Partial<T>) };
        return sanitize ? sanitize(merged, defaults) : merged;
    } catch {
        return defaults;
    }
}

export function writePersistedAdminState<T extends Record<string, unknown>>(
    storageKey: string,
    state: T,
): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
        // Ignore storage quota / privacy mode errors
    }
}

export function readPersistedAdminString(
    storageKey: string,
    fallback: string,
    isValid?: (value: string) => boolean,
): string {
    if (typeof window === 'undefined') return fallback;

    try {
        const value = window.localStorage.getItem(storageKey);
        if (value === null) return fallback;
        if (isValid && !isValid(value)) return fallback;
        return value;
    } catch {
        return fallback;
    }
}

export function writePersistedAdminString(storageKey: string, value: string): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(storageKey, value);
    } catch {
        // Ignore storage quota / privacy mode errors
    }
}
