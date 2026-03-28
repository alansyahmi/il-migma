export function getSearchCardLocation(entry: any, rootFallback: string) {
    const stem = entry?.zokk_morphology?.stem_string?.trim();
    if (stem) {
        return {
            root: stem,
            rootSlug: stem,
            rootHref: `/stem/${encodeURIComponent(stem)}`,
        };
    }

    const root = rootFallback || '';
    return {
        root,
        rootSlug: root,
        rootHref: `/root/${encodeURIComponent(root)}`,
    };
}
