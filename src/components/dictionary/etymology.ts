import { generateForeignScriptPronunciation } from '../../lib/foreignScriptPronunciation';

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

const CONJUNCTIVE_RELATIONSHIPS = new Set(['and', 'or', 'nor']);

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

function sentenceCase(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function normalizeRelationshipValue(relationship?: string) {
    return String(relationship || '').trim();
}

function normalizePronunciationComparisonValue(value?: string) {
    return String(value || '').trim().normalize('NFKC').toLowerCase();
}

function isRedundantPronunciation(pronunciation?: string, term?: string) {
    const cleanPronunciation = normalizePronunciationComparisonValue(pronunciation);
    const cleanTerm = normalizePronunciationComparisonValue(term);
    return Boolean(cleanPronunciation && cleanTerm && cleanPronunciation === cleanTerm);
}

export function isConjunctiveEtymologyRelationship(relationship?: string) {
    return CONJUNCTIVE_RELATIONSHIPS.has(normalizeRelationshipValue(relationship).toLowerCase());
}

export function formatEtymologySentenceLeadIn(prefix?: string, relationship?: string) {
    const cleanPrefix = normalizeRelationshipValue(prefix);
    const cleanRelationship = normalizeRelationshipValue(relationship);

    if (!cleanRelationship) return cleanPrefix || undefined;
    if (!cleanPrefix) return cleanRelationship;
    if (isConjunctiveEtymologyRelationship(cleanRelationship)) return cleanPrefix;

    const lowerPrefix = cleanPrefix.toLowerCase();
    const lowerRelationship = cleanRelationship.toLowerCase();

    if (lowerRelationship === lowerPrefix || lowerRelationship.endsWith(` ${lowerPrefix}`)) {
        return sentenceCase(cleanRelationship);
    }

    if (lowerRelationship === 'from') {
        return cleanPrefix;
    }

    return `${sentenceCase(cleanRelationship)} ${lowerPrefix}`;
}

export function formatEtymologyConnector(relationship?: string) {
    const cleanRelationship = normalizeRelationshipValue(relationship);
    if (!cleanRelationship) return '';
    return isConjunctiveEtymologyRelationship(cleanRelationship)
        ? cleanRelationship.toLowerCase()
        : cleanRelationship;
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

export function normalizeDictionaryEtymologyChainForDisplay(
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
            const language = translateLanguage(rawLanguage || '');
            const resolvedPronunciation = pronunciation || generateForeignScriptPronunciation({
                language: rawLanguage || language,
                term,
                script,
            });
            const displayPronunciation = isRedundantPronunciation(resolvedPronunciation, term)
                ? ''
                : resolvedPronunciation;

            return {
                relationship: relationship || undefined,
                language,
                term: term || undefined,
                pronunciation: displayPronunciation || undefined,
                definition: definition || undefined,
                form: term || undefined,
                meaning: definition || undefined,
                script: script || undefined,
                time_period: timePeriod || undefined,
            };
        })
        .filter((item) => Boolean(item.language || item.term || item.definition || item.form || item.meaning || item.script || item.time_period));
}
