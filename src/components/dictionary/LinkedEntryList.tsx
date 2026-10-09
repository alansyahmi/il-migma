import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { cn, getGloss } from '@/lib/utils';

export interface LinkedEntryItem {
    id?: string;
    headword?: string;
    type?: string | null;
    notes?: string | null;
    target_entry_id?: string | null;
    has_lemma_entry?: boolean;
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
    const { mode, term } = useLinguisticMode();

    if (!items.length) return null;

    return (
        <div className={cn('space-y-1.5', className)}>
            {items.map((item, idx) => {
                const gloss = getGloss(item, language, mode);
                const isLinked = Boolean(
                    item.target_entry_id ||
                    (item.has_lemma_entry && item.id && !String(item.id).startsWith('alt_'))
                );
                const linkTarget = item.target_entry_id || item.id;
                const formattedType = item.type && item.type !== 'orthographic'
                    ? (term(item.type) || item.type)
                    : (term('orthographic') || 'ortografika');
                const displayHeadword = item.headword || item.id || '';

                return (
                    <div key={item.id || `${item.headword}-${idx}`} className="flex items-start justify-between gap-2 group">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                {isLinked ? (
                                    <Link to={`/entry/${linkTarget}`} className="block">
                                        <span className="font-serif text-sm font-semibold text-[#1034A6] hover:underline">
                                            {displayHeadword}
                                            {gloss ? (
                                                <span className="ml-2 font-sans text-xs text-black/55 font-normal">
                                                    "{gloss}"
                                                </span>
                                            ) : null}
                                        </span>
                                    </Link>
                                ) : (
                                    <span className="font-serif text-sm font-semibold text-black">
                                        {displayHeadword}
                                    </span>
                                )}
                                {item.type && (
                                    <span className="text-[10px] uppercase font-sans font-medium px-1.5 py-0.2 rounded bg-black/5 text-black/60 border border-black/8">
                                        {formattedType}
                                    </span>
                                )}
                            </div>
                            {item.notes && (
                                <p className="text-[11px] text-black/50 italic mt-0.5">
                                    {item.notes}
                                </p>
                            )}
                        </div>
                        {renderActions?.(item)}
                    </div>
                );
            })}
        </div>
    );
}
