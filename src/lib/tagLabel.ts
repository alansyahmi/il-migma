type TermResolver = (key: string) => string;

const TAG_PREFIX_RE = /^[\\!$]+/;
const TAG_KEY_ALIASES: Record<string, string> = {
    invariable: 'no-elative',
    'no_elative': 'no-elative',
};
const HIDDEN_PUBLIC_TAG_KEYS = new Set(['no-elative']);

export function stripTagPrefixes(rawTag: string): string {
    if (!rawTag) return '';
    return rawTag.replace(TAG_PREFIX_RE, '').trim();
}

export function normalizeTagKey(rawTag: string): string {
    const clean = stripTagPrefixes(rawTag).toLowerCase();
    return clean
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function resolveCanonicalTagKey(rawTag: string): string {
    const normalized = normalizeTagKey(rawTag);
    return TAG_KEY_ALIASES[normalized] || normalized;
}

export function isHiddenTag(rawTag: string): boolean {
    return HIDDEN_PUBLIC_TAG_KEYS.has(resolveCanonicalTagKey(rawTag));
}

export function resolveTagLabel(rawTag: string, term: TermResolver): string {
    const clean = stripTagPrefixes(rawTag);
    const normalizedKey = resolveCanonicalTagKey(rawTag);

    if (!clean || !normalizedKey) return clean;

    const tagScopedKey = `tag-${normalizedKey}`;
    const scoped = term(tagScopedKey);
    if (scoped && scoped !== tagScopedKey) return scoped;

    const direct = term(normalizedKey);
    if (direct && direct !== normalizedKey) return direct;

    return clean;
}
