import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { cn, getGloss } from '@/lib/utils';

export interface LinkedEntryItem {
    id?: string;
    headword: string;
    gloss_en?: string;
    gloss_mt?: string | null;
    definitions?: Array<{ text_en?: string; text_mt?: string | null }>;
}

export function LinkedEntryList({
    items,
    renderActions,
    className,
}: {
    items: LinkedEntryItem[];
    renderActions?: (item: LinkedEntryItem) => ReactNode;
    className?: string;
}) {
    const { language } = useLanguage();
    const { mode } = useLinguisticMode();

    if (!items.length) return null;

    return (
        <div className={cn('space-y-1', className)}>
            {items.map(item => {
                const gloss = getGloss(item, language, mode);
                const surface = (
                    <span className="font-serif text-sm font-semibold text-[#1034A6] hover:underline">
                        {item.headword}
                        {gloss ? (
                            <span className="ml-2 font-sans text-xs text-black/55">
                                "{gloss}"
                            </span>
                        ) : null}
                    </span>
                );

                return (
                    <div key={item.id || item.headword} className="flex items-center justify-between gap-2 group">
                        {item.id ? (
                            <Link to={`/entry/${item.id}`} className="block">
                                {surface}
                            </Link>
                        ) : (
                            <span className="block">{surface}</span>
                        )}
                        {renderActions?.(item)}
                    </div>
                );
            })}
        </div>
    );
}
