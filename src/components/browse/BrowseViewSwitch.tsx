import { cn } from '@/lib/utils';

export type BrowseViewMode = 'pos' | 'morphology';

export function BrowseViewSwitch({
    mode,
    onChange,
    leftLabel = 'POS',
    rightLabel = 'Morphology',
    ariaLabel = 'Browse view mode',
    className,
}: {
    mode: BrowseViewMode;
    onChange: (mode: BrowseViewMode) => void;
    leftLabel?: string;
    rightLabel?: string;
    ariaLabel?: string;
    className?: string;
}) {
    const isRightActive = mode === 'morphology';

    return (
        <div
            className={cn(
                'inline-flex w-auto min-w-fit items-end gap-1.5 border-b border-black/10',
                className,
            )}
            role="tablist"
            aria-label={ariaLabel}
        >
            <button
                type="button"
                onClick={() => onChange('pos')}
                role="tab"
                aria-selected={!isRightActive}
                className={cn(
                    'relative -mb-px border-b-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-link/25 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                    !isRightActive
                        ? 'border-link text-black'
                        : 'border-transparent text-black/45 hover:border-black/20 hover:text-black',
                )}
            >
                {leftLabel}
            </button>

            <button
                type="button"
                onClick={() => onChange('morphology')}
                role="tab"
                aria-selected={isRightActive}
                className={cn(
                    'relative -mb-px border-b-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-link/25 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                    isRightActive
                        ? 'border-link text-black'
                        : 'border-transparent text-black/45 hover:border-black/20 hover:text-black',
                )}
            >
                {rightLabel}
            </button>
        </div>
    );
}
