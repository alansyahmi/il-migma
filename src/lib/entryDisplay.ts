import type { Entry } from '@/types';
import { normalizeEntryPos } from './entryId.ts';

export type EntryViewKind =
    | 'verb'
    | 'numeral'
    | 'noun'
    | 'adjective'
    | 'participle'
    | 'function-word'
    | 'zokk'
    | 'fallback';

const FUNCTION_WORD_ENTRY_POS = new Set([
    'pronoun',
    'particle',
    'adverb',
    'preposition',
    'interjection',
    'article',
    'conjunction',
    'interrogative',
    'suffix',
]);

export function isFunctionWordEntryPos(pos?: string | null): boolean {
    return FUNCTION_WORD_ENTRY_POS.has(normalizeEntryPos(pos));
}

export function getEntryAdjectiveMorphology(entry: Pick<Entry, 'adjective_morphology' | 'adj_morphology'> | null | undefined) {
    return entry?.adjective_morphology || entry?.adj_morphology || null;
}

export function resolveEntryViewKind(entry: Entry | null | undefined): EntryViewKind {
    if (!entry) return 'fallback';

    const pos = normalizeEntryPos(entry.pos);

    if (pos === 'verb' && entry.verb_morphology) return 'verb';
    if (pos === 'numeral') return 'numeral';
    if (pos === 'noun' && entry.noun_morphology) return 'noun';
    if (pos === 'adjective' && getEntryAdjectiveMorphology(entry)) return 'adjective';
    if (pos === 'participle') return 'participle';
    if (isFunctionWordEntryPos(pos)) return 'function-word';
    if (entry.zokk_morphology) return 'zokk';

    return 'fallback';
}
