export interface PluralFormRow {
    form: string;
    pattern: string;
}

const EMPTY_PLURAL_ROW: PluralFormRow = { form: '', pattern: '' };

function normalizeText(value: unknown): string {
    return String(value ?? '').trim();
}

function parseList(value: unknown, preserveEmpty = false): string[] {
    if (Array.isArray(value)) {
        return value
            .map(item => (typeof item === 'string' ? item : normalizeText(item)))
            .map(item => item.trim())
            .filter(item => preserveEmpty || !!item);
    }

    if (typeof value !== 'string') {
        return [];
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return [];
    }

    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            return parseList(parsed, preserveEmpty);
        } catch {
            return [];
        }
    }

    return trimmed
        .split(',')
        .map(part => part.trim())
        .filter(item => preserveEmpty || !!item);
}

export function normalizePluralFormRows(
    forms: unknown,
    patterns?: unknown,
): PluralFormRow[] {
    if (Array.isArray(forms) && forms.some(item => item && typeof item === 'object' && 'form' in item)) {
        const rows = forms.map((item: any) => ({
            form: normalizeText(item?.form),
            pattern: normalizeText(item?.pattern),
        }));
        return rows.filter(row => row.form || row.pattern);
    }

    const formList = parseList(forms);
    const patternList = parseList(patterns, true);
    const count = Math.max(formList.length, patternList.length);

    if (count === 0) {
        return [EMPTY_PLURAL_ROW];
    }

    return Array.from({ length: count }, (_, index) => ({
        form: formList[index] || '',
        pattern: patternList[index] || '',
    })).filter(row => row.form || row.pattern);
}

export function pluralRowsToLegacyForms(rows: PluralFormRow[]): string[] {
    return rows.map(row => row.form.trim()).filter(Boolean);
}

export function pluralRowsToLegacyPatternString(rows: PluralFormRow[]): string {
    return rows.map(row => row.pattern.trim()).join(', ');
}

export function compactPluralRows(rows: PluralFormRow[]): PluralFormRow[] {
    const compacted = rows
        .map(row => ({
            form: row.form.trim(),
            pattern: row.pattern.trim(),
        }))
        .filter(row => row.form || row.pattern);

    return compacted.length > 0 ? compacted : [EMPTY_PLURAL_ROW];
}
