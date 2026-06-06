export type VerbClassOption = { value: string; label: string };

export const VERB_CLASS_FALLBACK_VALUES = [
    'strong',
    'strong-hybrid',
    'weak',
    'doubled',
    'quadriliteral',
    'loan',
] as const;

export function ensureVerbClassFallbackValues(values: string[]): string[] {
    const next = [...values];
    if (!next.includes('strong-hybrid')) {
        next.splice(1, 0, 'strong-hybrid');
    }
    return Array.from(new Set(next));
}

export function ensureVerbClassFallbackOptions(
    options: VerbClassOption[],
    labelFor: (value: string) => string,
): VerbClassOption[] {
    const next = [...options];
    if (!next.some((option) => option.value === 'strong-hybrid')) {
        next.splice(1, 0, {
            value: 'strong-hybrid',
            label: labelFor('strong-hybrid'),
        });
    }
    const seen = new Set<string>();
    return next.filter((option) => {
        if (seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
    });
}
