import type { Entry, DefinitionRegister } from '@/types';
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
    'determiner',
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

function normalizeText(value: unknown): string {
    return String(value ?? '').trim();
}

export function isRootConsonantSurfaceArtifact(value: unknown, rootConsonants?: string | null): boolean {
    const surface = normalizeText(value).toLowerCase();
    const rootParts = normalizeText(rootConsonants)
        .toLowerCase()
        .split(/[-,\s]+/)
        .map(part => part.trim())
        .filter(Boolean);

    if (!surface || rootParts.length < 2) return false;

    return surface === rootParts[0]
        || surface === rootParts.join('-')
        || surface === rootParts.join('');
}

export function resolveEntryParticipleType(entry: Pick<Entry, 'participle_type' | 'participle_morphology'> | null | undefined): string {
    return normalizeText(
        entry?.participle_morphology?.type
        || entry?.participle_morphology?.participle_type
        || entry?.participle_type
    );
}

export function resolveParticipleMorphologyInheritance(entry: Pick<Entry, 'participle_type' | 'participle_morphology'> | null | undefined): 'noun' | 'adjective' {
    return resolveEntryParticipleType(entry).toLowerCase() === 'passive' ? 'noun' : 'adjective';
}

export function hasNounNuanceDefinition(entry: Pick<Entry, 'definitions'> | null | undefined): boolean {
    return !!entry?.definitions?.some((definition) => normalizeText(definition?.nuance).toLowerCase() === 'noun');
}

export function formatDefinitionGloss(
    definition: { text_en?: string | null; text_mt?: string | null; nuance?: string | null; register?: DefinitionRegister | null; dialect?: string | null } | null | undefined,
    language: 'en' | 'mt',
    translate: (key: string) => string,
): string {
    const gloss = language === 'mt' && definition?.text_mt
        ? normalizeText(definition.text_mt)
        : normalizeText(definition?.text_en);

    const parts: string[] = [];
    const dialect = normalizeText(definition?.dialect);

    let regKey = '';
    let explicitLabel = '';
    const rawRegister = definition?.register;

    if (typeof rawRegister === 'string') {
        const trimmed = rawRegister.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                regKey = String(parsed.key || parsed.en || '').trim().toLowerCase();
                explicitLabel = String((language === 'en' ? parsed.en : parsed.mt) || '').trim();
            } catch {
                regKey = trimmed;
            }
        } else {
            regKey = trimmed;
        }
    } else if (typeof rawRegister === 'object' && rawRegister !== null) {
        regKey = String(rawRegister.key || rawRegister.en || '').trim().toLowerCase();
        explicitLabel = String((language === 'en' ? rawRegister.en : rawRegister.mt) || '').trim();
    }

    if (regKey || explicitLabel) {
        // When register is dialectal and a specific dialect is set, show
        // the dialect name directly instead of "Dialectal (Żejtun)".
        if ((regKey.toLowerCase().includes('dialect') || regKey.toLowerCase().includes('dialett')) && dialect) {
            const dialects = dialect.split(',').map(d => d.trim()).filter(Boolean);
            parts.push(dialects.join(', '));
        } else if (regKey.toLowerCase() !== 'standard') {
            let regLabel = '';
            if (regKey) {
                const rawReg = translate(`reg-${regKey}`);
                if (rawReg && rawReg !== `reg-${regKey}`) {
                    regLabel = rawReg;
                } else {
                    const fallbackReg = normalizeText(translate(regKey));
                    if (fallbackReg && fallbackReg !== regKey) {
                        regLabel = fallbackReg;
                    }
                }
            }
            if (!regLabel) {
                regLabel = explicitLabel || regKey;
            }
            const lowerReg = regLabel.toLowerCase();
            // In standard lexicography, standard/miqjiesi is the unmarked baseline and omitted
            if (lowerReg !== 'standard' && lowerReg !== 'miqjiesi') {
                parts.push(regLabel.charAt(0).toUpperCase() + regLabel.slice(1));
                if (dialect) {
                    parts.push(`(${dialect})`);
                }
            } else if (dialect) {
                parts.push(`(${dialect})`);
            }
        } else if (dialect) {
            parts.push(`(${dialect})`);
        }
    }
    const nuance = normalizeText(definition?.nuance);
    if (nuance) {
        const rawTranslated = normalizeText(translate(nuance));
        const hasTranslation = rawTranslated && rawTranslated.toLowerCase() !== nuance.toLowerCase();
        if (hasTranslation) {
            parts.push(rawTranslated.charAt(0).toUpperCase() + rawTranslated.slice(1));
        } else if (language === 'en') {
            parts.push(nuance.charAt(0).toUpperCase() + nuance.slice(1));
        }
    }

    if (parts.length === 0) return gloss;

    return `(${parts.join(', ')}) ${gloss}`.trim();
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

    // Fall back to generic view for content words lacking morphology
    if (['verb', 'noun', 'adjective'].includes(pos)) return 'function-word';

    return 'fallback';
}
