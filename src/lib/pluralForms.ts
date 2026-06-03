export interface PluralFormRow {
    form: string;
    pattern: string;
}

export interface NormalizedPluralContract {
    rows: PluralFormRow[];
    legacyForms: string[];
    legacyPattern: string;
}

const EMPTY_PLURAL_ROW: PluralFormRow = { form: '', pattern: '' };

function normalizeText(value: unknown): string {
    return String(value ?? '').trim();
}

function extractText(value: unknown): string {
    if (value === null || value === undefined) return '';

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return normalizeText(value);
    }

    if (Array.isArray(value)) {
        // For arrays, we take the first non-empty text found in any item
        for (const item of value) {
            const text = extractText(item);
            if (text) return text;
        }
        return '';
    }

    if (typeof value !== 'object') {
        return '';
    }

    const record = value as Record<string, unknown>;
    // Common field names for text content in our system
    const candidates = [
        record.form,
        record.value,
        record.text,
        record.label,
        record.surface,
        record.plural,
        record.headword,
        record.lemma,
    ];

    for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null && typeof candidate !== 'object') {
            const text = normalizeText(candidate);
            if (text) return text;
        }
    }

    // Deep search if shallow candidates failed
    for (const candidate of candidates) {
        const text = extractText(candidate);
        if (text) return text;
    }

    return '';
}

function parseList(value: unknown, preserveEmpty = false): string[] {
    if (Array.isArray(value)) {
        return value
            .map(item => (typeof item === 'string' ? item : extractText(item)))
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
    let sourceForms = forms;
    if (typeof forms === 'string' && forms.trim().startsWith('[')) {
        try {
            sourceForms = JSON.parse(forms);
        } catch {
            // ignore
        }
    }

    if (Array.isArray(sourceForms) && sourceForms.some(item => item && typeof item === 'object')) {
        const patternList = parseList(patterns, true);
        const rows = (sourceForms as any[]).map((item: any, index: number) => ({
            form: extractText(item?.form ?? item),
            pattern: extractText(item?.pattern) || patternList[index] || '',
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

export function normalizePluralRowsForPersistence(
    forms: unknown,
    patterns?: unknown,
): PluralFormRow[] {
    return compactPluralRows(normalizePluralFormRows(forms, patterns)).filter((row) => row.form || row.pattern);
}

export function normalizePluralContract(
    forms: unknown,
    patterns?: unknown,
    fallbackForms?: unknown,
    fallbackPatterns?: unknown,
): NormalizedPluralContract {
    const rows = normalizePluralRowsForPersistence(forms, patterns);
    const resolvedRows = rows.length > 0
        ? rows
        : normalizePluralRowsForPersistence(fallbackForms, fallbackPatterns);
    const hasConcreteForms = resolvedRows.some(row => !!row.form.trim());
    const persistedRows = hasConcreteForms
        ? resolvedRows.filter(row => !!row.form.trim())
        : resolvedRows;
    return {
        rows: persistedRows,
        legacyForms: pluralRowsToLegacyForms(persistedRows),
        legacyPattern: pluralRowsToLegacyPatternString(persistedRows),
    };
}
