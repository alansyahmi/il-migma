export type DictionaryEtymologyStep = {
    relationship?: string;
    language: string;
    term?: string;
    pronunciation?: string;
    definition?: string;
    form?: string;
    meaning?: string;
    script?: string;
    time_period?: string;
};

function pickString(source: Record<string, any> | undefined, keys: string[]) {
    if (!source) return '';

    for (const key of keys) {
        const value = source[key];
        if (value === undefined || value === null) continue;
        const normalized = String(value).trim();
        if (normalized) return normalized;
    }

    return '';
}

export function normalizeDictionaryEtymologyChain(
    chain: any,
    translateLanguage: (language: string) => string = (language) => language,
): DictionaryEtymologyStep[] {
    const items = Array.isArray(chain) ? chain : [];

    return items
        .map((node) => {
            const rawLanguage = pickString(node, ['language', 'source_language', 'sourceLanguage', 'origin_language', 'originLanguage']);
            const term = pickString(node, ['term', 'form', 'word', 'source_term', 'sourceTerm', 'source_form', 'sourceForm']);
            const pronunciation = pickString(node, ['pronunciation', 'ipa', 'transcription', 'phonetic', 'reading']);
            const definition = pickString(node, ['definition', 'meaning', 'gloss', 'translation', 'text']);
            const relationship = pickString(node, ['relationship', 'relation', 'type']);
            const script = pickString(node, ['script']);
            const timePeriod = pickString(node, ['time_period', 'timePeriod']);

            return {
                relationship: relationship || undefined,
                language: translateLanguage(rawLanguage || ''),
                term: term || undefined,
                pronunciation: pronunciation || undefined,
                definition: definition || undefined,
                form: term || undefined,
                meaning: definition || undefined,
                script: script || undefined,
                time_period: timePeriod || undefined,
            };
        })
        .filter((item) => Boolean(item.language || item.term || item.definition || item.form || item.meaning || item.script || item.time_period));
}
