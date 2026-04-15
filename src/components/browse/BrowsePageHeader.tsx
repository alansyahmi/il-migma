import type { ReactNode } from 'react';
import { BrowseModeBar, type BrowseFacetKey } from '@/components/browse/BrowseModeBar';
import { useLanguage } from '@/contexts/LanguageContext';

export function BrowsePageHeader({
    active,
    description,
}: {
    active: BrowseFacetKey;
    description: ReactNode;
}) {
    const { t } = useLanguage();

    return (
        <div className="mb-8 flex flex-col gap-4">
            <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-serif font-medium text-4xl leading-tight text-black">
                <span>{t('Browse', 'Ibbrawżja')}</span>
                <BrowseModeBar active={active} />
            </h1>
            <div className="text-text-muted text-sm max-w-2xl">
                {description}
            </div>
        </div>
    );
}
