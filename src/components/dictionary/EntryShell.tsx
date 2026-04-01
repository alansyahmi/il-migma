import React from 'react';
import { cn } from '@/lib/utils';

export const CREAM_RGBA = 'rgba(244,243,240,0.88)';
export const BLUE = '#1034A6';
export const GOLD = '#A07030';

export function SideCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl border border-black/8 shadow-sm p-5 space-y-2">
            <h2 className="font-sans font-bold text-[0.95rem] text-black">
                {title}
            </h2>
            <div>{children}</div>
        </div>
    );
}

export type EtymologySentenceItem = {
    relationship?: string;
    language: string;
    term?: string;
    form?: string;
    pronunciation?: string;
    definition?: string;
    meaning?: string;
    script?: string;
    time_period?: string;
};

function splitGlossText(value?: string) {
    return String(value || '')
        .split(/\s*;\s*/)
        .map(part => part.trim())
        .filter(Boolean);
}

function sentenceCase(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatEtymologyPrefix(prefix: string | undefined, relationship: string | undefined) {
    const cleanPrefix = prefix?.trim() || '';
    const cleanRelationship = relationship?.trim() || '';

    if (!cleanRelationship) return cleanPrefix || undefined;
    if (!cleanPrefix) return cleanRelationship;

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

export function EtymologySentence({
    prefix,
    items,
}: {
    prefix?: string;
    items: EtymologySentenceItem[];
}) {
    if (!items?.length) return null;
    const displayPrefix = formatEtymologyPrefix(prefix, items[0]?.relationship);

    return (
        <p className="text-sm text-black leading-relaxed">
            {displayPrefix && <span>{displayPrefix} </span>}
            {items.map((item, i) => (
                <React.Fragment key={`${item.language}-${i}`}>
                    {i > 0 && <span className="mx-1 opacity-50 font-sans">{' < '}</span>}
                    <span style={{ color: BLUE }} className="font-medium">
                        {item.language}
                    </span>
                    {item.term && <span className="ml-1 font-serif font-medium" dir="auto">{item.term}</span>}
                    {!item.term && item.form && <span className="ml-1 font-serif font-medium" dir="auto">{item.form}</span>}
                    {item.pronunciation && <span className="opacity-70"> ({item.pronunciation})</span>}
                    {(item.definition || item.meaning) && (
                        <span className="opacity-70">
                            {" "}
                            {splitGlossText(item.definition || item.meaning).map((part, index) => (
                                <React.Fragment key={`${item.language}-${i}-gloss-${index}`}>
                                    {index > 0 && <span className="text-black">, </span>}
                                    &quot;{part}&quot;
                                </React.Fragment>
                            ))}
                        </span>
                    )}
                    {item.script && <span className="opacity-70"> [{item.script}]</span>}
                    {item.time_period && <span className="opacity-70"> {item.time_period}</span>}
                </React.Fragment>
            ))}
            .
        </p>
    );
}

export function PropRow({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col', className)}>
            <p className="text-xs font-semibold text-black/40 mb-0.5 uppercase tracking-wider">{label}</p>
            <div className="text-sm text-black">{children}</div>
        </div>
    );
}

export type EntryViewModel = {
    title: React.ReactNode;
    titleClassName?: string;
    subtitle?: React.ReactNode;
    meta?: React.ReactNode;
    headerAccessory?: React.ReactNode;
    sidebarSections?: React.ReactNode[];
    contentSections?: React.ReactNode[];
    bgStyle?: React.CSSProperties;
    shellClassName?: string;
    containerClassName?: string;
    headerClassName?: string;
    layoutClassName?: string;
    sidebarClassName?: string;
    contentClassName?: string;
};

const DEFAULT_BG_STYLE: React.CSSProperties = {
    background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
    minHeight: '100vh',
};

export function EntryShell({
    viewModel,
    children,
}: {
    viewModel: EntryViewModel;
    children?: React.ReactNode;
}) {
    return (
        <div style={viewModel.bgStyle || DEFAULT_BG_STYLE} className={cn('w-full overflow-hidden', viewModel.shellClassName)}>
            <div className={cn('max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10', viewModel.containerClassName)}>
                <div className={cn('text-center mb-12 relative group max-w-fit mx-auto', viewModel.headerClassName)}>
                    <div className="relative inline-flex items-center justify-center">
                        <h1 className={cn('font-serif font-bold text-[3rem] leading-none text-black tracking-tight', viewModel.titleClassName)}>
                            {viewModel.title}
                        </h1>
                        {viewModel.headerAccessory}
                    </div>
                    {viewModel.subtitle}
                    {viewModel.meta}
                </div>

                {children ? (
                    children
                ) : (
                    <div className={cn('flex flex-col md:flex-row gap-8 md:gap-10 items-start', viewModel.layoutClassName)}>
                        <div className={cn('w-full md:w-64 shrink-0 space-y-4', viewModel.sidebarClassName)}>
                            {React.Children.toArray(viewModel.sidebarSections)}
                        </div>
                        <div className={cn('flex-1 min-w-0 space-y-12 w-full max-w-full', viewModel.contentClassName)}>
                            {React.Children.toArray(viewModel.contentSections)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
