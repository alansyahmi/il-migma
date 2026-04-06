const POS_PREFIXES: Record<string, string> = {
    noun: 'noun',
    verb: 'verb',
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
