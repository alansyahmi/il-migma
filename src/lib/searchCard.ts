import { convertCVTo1V } from './maltesePhonology.ts';

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

export function getSearchCardPattern(entry: any, mode: string) {
    const cvPattern = String(
        entry?.cv_pattern
        || entry?.root_pattern_form?.pattern?.cv_notation
        || entry?.morph_pattern
        || entry?.lemma_pattern
        || '',
    ).trim();
    const wizenPattern = String(entry?.root_pattern_form?.pattern?.wizen_notation || '').trim();
    const rawPattern = cvPattern || wizenPattern;

    const label = mode !== 'arabised'
        ? convertCVTo1V(rawPattern)
        : (wizenPattern || cvPattern);

    return {
        label,
        href: rawPattern ? `/search?pattern=${encodeURIComponent(rawPattern)}` : null,
    };
}
