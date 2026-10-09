import type { SourceReference } from '@/types';

export interface SourceMetadataLike {
    source_title?: string | number | null;
    source_year?: string | number | null;
    source_page?: string | number | null;
    source_publisher?: string | number | null;
    source_citation?: string | number | null;
    source_display?: string | number | null;
    source_tooltip?: string | number | null;
    title?: string | number | null;
    year?: string | number | null;
    page?: string | number | null;
    publisher?: string | number | null;
    citation?: string | number | null;
    sources?: SourceReference[] | null;
}

export interface NormalizedSourceMetadata {
    title: string;
    year: string;
    page: string;
    publisher: string;
    citation: string;
    display: string;
    tooltip: string;
}

function cleanSourceValue(value: unknown): string {
    if (value === undefined || value === null) return '';
    const text = String(value).trim();
    return text ? text.normalize('NFC') : '';
}

function formatSourcePageLabel(page: string): string {
    if (!page) return '';
    const label = /[-,;]/.test(page) ? 'pp.' : 'p.';
    return `${label} ${page}`;
}

export function buildSourceCitation(source: SourceMetadataLike): string {
    const title = cleanSourceValue(source.source_title ?? source.title);
    const year = cleanSourceValue(source.source_year ?? source.year);
    const page = cleanSourceValue(source.source_page ?? source.page);
    const fallbackCitation = cleanSourceValue(source.source_citation ?? source.citation);

    if (title && year && page) return `${title} (${year}), ${formatSourcePageLabel(page)}`;
    if (title && year) return `${title} (${year})`;
    if (title && page) return `${title}, ${formatSourcePageLabel(page)}`;
    if (fallbackCitation) return fallbackCitation;
    return title || '';
}

export function formatSourceDisplay(source: SourceMetadataLike): string {
    const computedDisplay = cleanSourceValue(source.source_display);
    if (computedDisplay) return computedDisplay;

    if (source.sources && source.sources.length > 0) {
        return source.sources
            .map((s) => s.citation || [s.title, s.year ? `(${s.year})` : '', s.page ? `p. ${s.page}` : ''].filter(Boolean).join(' '))
            .filter(Boolean)
            .join('; ');
    }

    const title = cleanSourceValue(source.source_title ?? source.title);
    const year = cleanSourceValue(source.source_year ?? source.year);
    const page = cleanSourceValue(source.source_page ?? source.page);
    const fallbackDisplay = cleanSourceValue(source.source_citation ?? source.citation);

    if (title && year && page) return `${title}, ${year} (page ${page})`;
    if (title && year) return `${title}, ${year}`;
    if (title) return title;
    if (page && fallbackDisplay) return `${fallbackDisplay} (page ${page})`;
    return fallbackDisplay;
}

export function buildSourceTooltip(source: SourceMetadataLike): string {
    const computedTooltip = cleanSourceValue(source.source_tooltip);
    if (computedTooltip) return computedTooltip;

    if (source.sources && source.sources.length > 0) {
        return source.sources
            .map((s, i) => [
                `Source ${i + 1}: ${s.title || s.citation || '—'}`,
                s.author ? `Author: ${s.author}` : '',
                s.role ? `Role: ${s.role}` : '',
                s.year ? `Year: ${s.year}` : '',
                s.page ? `Page: ${s.page}` : '',
                s.publisher ? `Publisher: ${s.publisher}` : '',
                s.citation && s.citation !== s.title ? `Citation: ${s.citation}` : ''
            ].filter(Boolean).join('\n'))
            .join('\n\n');
    }

    const title = cleanSourceValue(source.source_title ?? source.title ?? source.source_citation ?? source.citation);
    const year = cleanSourceValue(source.source_year ?? source.year);
    const page = cleanSourceValue(source.source_page ?? source.page);
    const publisher = cleanSourceValue(source.source_publisher ?? source.publisher);

    if (!title && !year && !page && !publisher) return '';

    return [
        `Title: ${title || '—'}`,
        `Year of Publishing: ${year || '—'}`,
        `Page: ${page || '—'}`,
        `Publisher: ${publisher || '—'}`,
    ].join('\n');
}

export function normalizeSourceMetadata(source: SourceMetadataLike = {}): NormalizedSourceMetadata {
    const title = cleanSourceValue(source.source_title ?? source.title);
    const year = cleanSourceValue(source.source_year ?? source.year);
    const page = cleanSourceValue(source.source_page ?? source.page);
    const publisher = cleanSourceValue(source.source_publisher ?? source.publisher);
    const citation = buildSourceCitation(source);

    return {
        title,
        year,
        page,
        publisher,
        citation,
        display: formatSourceDisplay(source),
        tooltip: buildSourceTooltip(source),
    };
}
