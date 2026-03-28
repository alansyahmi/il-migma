import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names safely */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Format a reliability index (0-100) as a percentage string */
export function formatReliability(score: number): string {
    return `${Math.round(score)}%`;
}

/** Get a color class for a reliability score */
export function reliabilityColor(score: number): string {
    if (score >= 80) return 'text-[#1034A6]';
    if (score >= 60) return 'text-yellow-700';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-700';
}

/** Get the bar fill color for a reliability score */
export function reliabilityBarColor(score: number): string {
    if (score >= 80) return 'bg-[#1034A6]';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
}

/** Generate a stable ID */
export function generateId(): string {
    return Math.random().toString(36).slice(2, 11);
}

/** Truncate text to a given length */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '…';
}

/** Format a date string for display */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('mt', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number,
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

/** 
 * Selects the appropriate gloss based on interface language and linguistic mode.
 * Falls back to the alternative language if the preferred one is missing.
 */
export function getGloss(
    item: any,
    language: 'en' | 'mt',
    _mode: 'standard' | 'arabised' = 'standard'
): string {
    if (!item) return '';

    // 1. Handle flattened glosses (common in related_entries / search results)
    const flatEn = item.gloss_en ?? item.translation_en ?? item.en;
    const flatMt = item.gloss_mt ?? item.translation_mt ?? item.mt;

    if (language === 'en') {
        if (flatEn) return flatEn;
        if (flatMt) return flatMt;
    } else {
        if (flatMt) return flatMt;
        if (flatEn) return flatEn;
    }

    // 2. Handle full Entry/SubEntry objects with definitions array
    if (item.definitions && Array.isArray(item.definitions) && item.definitions.length > 0) {
        // Try all definitions until we find a non-empty one
        for (const def of item.definitions) {
            const defEn = def.text_en || def.gloss_en || def.translation || def.en;
            const defMt = def.text_mt || def.gloss_mt || def.mt;

            if (language === 'en') {
                const val = defEn || defMt;
                if (val) return val;
            } else {
                const val = defMt || defEn;
                if (val) return val;
            }
        }
    }

    // 3. Handle single definition/gloss object passed directly (or Root objects)
    const textEn = item.text_en || item.gloss_en || item.gloss || item.translation || item.en;
    const textMt = item.text_mt || item.gloss_mt || item.mt;
    const desc = item.description;

    if (language === 'en') {
        return textEn || textMt || desc || '';
    }
    return textMt || textEn || desc || '';
}

/**
 * Normalize fields that may arrive as JSON strings, arrays, or empty values.
 * This keeps older DB payloads from crashing result cards when they expect a list.
 */
export function parseMaybeArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? (parsed as T[]) : [];
            } catch {
                return [];
            }
        }
    }

    return [];
}
