const POS_PREFIXES: Record<string, string> = {
    noun: 'n',
    verb: 'v',
    adjective: 'adj',
    adverb: 'adv',
    preposition: 'prep',
    conjunction: 'conj',
    particle: 'part',
    article: 'art',
    pronoun: 'pron',
    interrogative: 'int',
    numeral: 'num',
    interjection: 'intj',
    participle: 'participle',
    verbal_noun: 'vn',
};

const POS_ALIASES: Record<string, string> = {
    n: 'noun',
    noun: 'noun',
    v: 'verb',
    verb: 'verb',
    adj: 'adjective',
    adjective: 'adjective',
    adv: 'adverb',
    adverb: 'adverb',
    prep: 'preposition',
    preposition: 'preposition',
    conj: 'conjunction',
    conjunction: 'conjunction',
    part: 'particle',
    particle: 'particle',
    art: 'article',
    article: 'article',
    det: 'article',
    pron: 'pronoun',
    pronoun: 'pronoun',
    int: 'interrogative',
    intg: 'interrogative',
    interrogative: 'interrogative',
    num: 'numeral',
    numeral: 'numeral',
    intj: 'interjection',
    interjection: 'interjection',
    ptcp: 'participle',
    participle: 'participle',
    vn: 'verbal_noun',
    verbal_noun: 'verbal_noun',
    'verbal noun': 'verbal_noun',
};

const ENTRY_ID_PREFIX_ALIASES: Record<string, string> = {
    noun: 'n',
    verb: 'v',
};

const ENTRY_ID_LEGACY_PREFIXES: Record<string, string[]> = {
    n: ['noun'],
    v: ['verb'],
};

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeKey(value: unknown): string {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, '_');
}

export function normalizeEntryPos(pos: unknown): string {
    const normalized = normalizeKey(pos);
    if (!normalized) return '';
    return POS_ALIASES[normalized] || normalized;
}

export function slugifyEntryHeadword(headword: unknown): string {
    return String(headword || '')
        .normalize('NFC')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9àċġħżie-]/gi, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function normalizeEntryId(id: unknown): string {
    const raw = String(id || '')
        .normalize('NFC')
        .trim();

    if (!raw) return '';

    const [rawPrefix, ...rest] = raw.split('-');
    const normalizedPrefix = ENTRY_ID_PREFIX_ALIASES[rawPrefix.trim().toLowerCase()] || rawPrefix.trim().toLowerCase();
    if (rest.length === 0) return normalizedPrefix;

    const normalizedTail = slugifyEntryHeadword(rest.join('-'));

    return normalizedTail ? `${normalizedPrefix}-${normalizedTail}` : normalizedPrefix;
}

export function getEntryIdVariants(id: unknown): string[] {
    const normalized = normalizeEntryId(id);
    if (!normalized) return [];

    const [prefix, ...rest] = normalized.split('-');
    const tail = rest.join('-');
    const variants = [normalized];

    if (tail && ENTRY_ID_LEGACY_PREFIXES[prefix]) {
        for (const legacyPrefix of ENTRY_ID_LEGACY_PREFIXES[prefix]) {
            variants.push(`${legacyPrefix}-${tail}`);
        }
    } else if (!tail && ENTRY_ID_LEGACY_PREFIXES[prefix]) {
        variants.push(...ENTRY_ID_LEGACY_PREFIXES[prefix]);
    }

    return [...new Set(variants)];
}

export function getEntryIdFamily(id: unknown): { exact: string[]; likePatterns: string[] } {
    const normalized = normalizeEntryId(id);
    if (!normalized) return { exact: [], likePatterns: [] };

    const [prefix, ...rest] = normalized.split('-');
    const tail = rest.join('-');
    const familyPrefixes = [prefix, ...(ENTRY_ID_LEGACY_PREFIXES[prefix] || [])];

    const exact = [...new Set(familyPrefixes.map(p => tail ? `${p}-${tail}` : p))];
    const likePatterns = tail ? familyPrefixes.map(p => `${p}-${tail}-%`) : [];

    return { exact, likePatterns };
}

export function getEntryIdSuffixRegexes(id: unknown): RegExp[] {
    const normalized = normalizeEntryId(id);
    if (!normalized) return [];

    const [prefix, ...rest] = normalized.split('-');
    const tail = rest.join('-');
    if (!tail) return [];

    const familyPrefixes = [prefix, ...(ENTRY_ID_LEGACY_PREFIXES[prefix] || [])];
    return familyPrefixes.map(p => new RegExp(`^${escapeRegExp(`${p}-${tail}`)}-(\\d+)$`));
}

export function getEntryIdPrefix(pos: unknown, participleType?: unknown): string {
    const normalizedPos = normalizeEntryPos(pos);
    if (!normalizedPos) return 'entry';

    if (normalizedPos === 'participle') {
        return String(participleType || '').trim().toLowerCase() === 'active' ? 'ap' : 'pp';
    }

    return POS_PREFIXES[normalizedPos] || normalizedPos;
}

export function buildSuggestedEntryId(input: {
    headword: unknown;
    pos: unknown;
    participleType?: unknown;
}): string {
    const prefix = getEntryIdPrefix(input.pos, input.participleType);
    const headword = slugifyEntryHeadword(input.headword);

    if (!prefix) return headword;
    if (!headword) return prefix;
    return `${prefix}-${headword}`;
}
