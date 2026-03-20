type TermResolver = (key: string) => string;

const TAG_PREFIX_RE = /^[\\!$]+/;

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

export function resolveTagLabel(rawTag: string, term: TermResolver): string {
    const clean = stripTagPrefixes(rawTag);
    const normalizedKey = normalizeTagKey(rawTag);

    if (!clean || !normalizedKey) return clean;

    const tagScopedKey = `tag-${normalizedKey}`;
    const scoped = term(tagScopedKey);
    if (scoped && scoped !== tagScopedKey) return scoped;

    const direct = term(normalizedKey);
    if (direct && direct !== normalizedKey) return direct;

    return clean;
}

