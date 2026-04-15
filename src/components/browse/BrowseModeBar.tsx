import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type BrowseFacetKey = 'entries' | 'pattern' | 'source' | 'suffix';

const FACETS: Array<{ key: BrowseFacetKey; to: string; labelEn: string; labelMt: string }> = [
    { key: 'entries', to: '/browse', labelEn: 'Entries', labelMt: 'Entrati' },
    { key: 'pattern', to: '/browse/pattern', labelEn: 'Pattern', labelMt: 'Mudell' },
    { key: 'source', to: '/browse/source', labelEn: 'Source', labelMt: 'Sors' },
    { key: 'suffix', to: '/browse/suffix', labelEn: 'Suffix', labelMt: 'Suffiss' },
];

export function BrowseModeBar({ active }: { active: BrowseFacetKey }) {
    const { t } = useLanguage();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const triggerId = useId();
    const menuId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const activeFacet = FACETS.find((facet) => facet.key === active) ?? FACETS[0];
    const labelFor = (facet: (typeof FACETS)[number]) => t(facet.labelEn, facet.labelMt);

    useEffect(() => {
        setOpen(false);
    }, [location.pathname, location.search]);

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative inline-flex shrink-0">
            <button
                id={triggerId}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={`${t('Browse mode', "Mod ta' bbrawżjar")}: ${labelFor(activeFacet)}`}
                onClick={() => setOpen((value) => !value)}
                className={cn(
                    'group inline-flex items-center gap-1.5 bg-transparent p-0 font-[inherit] text-[inherit] leading-[inherit] tracking-[inherit] text-current transition-colors',
                    'hover:text-link focus:outline-none focus-visible:ring-2 focus-visible:ring-link/25 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                )}
            >
                <span className="whitespace-nowrap">{labelFor(activeFacet)}</span>
                <span className="inline-flex items-center justify-center rounded-full bg-black/5 p-0.5 transition-colors group-hover:bg-black/10">
                    <ChevronDown
                        size={16}
                        strokeWidth={2.75}
                        className={cn('shrink-0 translate-y-[1px] text-black/80 transition-transform duration-200', open && 'rotate-180')}
                    />
                </span>
            </button>

            {open && (
                <div
                    id={menuId}
                    aria-labelledby={triggerId}
                    className="absolute left-0 top-full z-30 mt-3 min-w-56 overflow-hidden rounded-2xl border border-black/8 bg-white/95 p-1 shadow-xl shadow-black/10 backdrop-blur-sm"
                >
                    {FACETS.map((facet) => {
                        const isActive = facet.key === active;

                        return (
                            <Link
                                key={facet.key}
                                to={facet.to}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => setOpen(false)}
                            className={cn(
                                'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all',
                                isActive
                                    ? 'bg-link text-white shadow-sm shadow-link/15'
                                    : 'text-black/70 hover:bg-black/5 hover:text-black',
                            )}
                        >
                                <span>{labelFor(facet)}</span>
                                {isActive && <span className="text-[10px] font-sans uppercase tracking-wider text-white/80">Current</span>}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
