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
