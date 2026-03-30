function pickString(source, keys) {
    for (const key of keys) {
        const value = source?.[key];
        if (value === undefined || value === null) continue;
        const normalized = String(value).trim();
        if (normalized) return normalized;
    }
    return '';
}

export function normalizeRootEtymologyStepValue(ety) {
    const fallback = {
        relationship: 'From',
        language: '',
        term: '',
        definition: '',
    };

    if (!ety) return fallback;

    try {
        const parsed = typeof ety === 'string' ? JSON.parse(ety) : ety;

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return {
                relationship: pickString(parsed, ['relationship', 'relation', 'type']) || 'From',
                language: pickString(parsed, ['language', 'source_language', 'sourceLanguage', 'origin_language', 'originLanguage']),
                term: pickString(parsed, ['term', 'form', 'word', 'source_term', 'sourceTerm', 'source_form', 'sourceForm']),
                definition: pickString(parsed, ['definition', 'meaning', 'gloss', 'translation', 'text']),
            };
        }

        return { ...fallback, definition: String(parsed) };
    } catch {
        return { ...fallback, definition: String(ety) };
    }
}

export function normalizeRootEtymologyValue(ety) {
    try {
        const parsed = typeof ety === 'string' ? JSON.parse(ety) : ety;
        if (Array.isArray(parsed)) {
            return parsed.map((step) => normalizeRootEtymologyStepValue(step));
        }
        return [normalizeRootEtymologyStepValue(parsed)];
    } catch {
        return [normalizeRootEtymologyStepValue(ety)];
    }
}
