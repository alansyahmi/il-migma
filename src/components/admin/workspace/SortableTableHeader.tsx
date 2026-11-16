import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortDirection, SortState } from '@/lib/adminTableSort';

interface SortableTableHeaderProps<K extends string> {
    label: ReactNode;
    sortKey: K;
    activeSort: SortState<K> | null;
    onSort: (key: K, defaultDir?: SortDirection) => void;
    defaultDir?: SortDirection;
    align?: 'left' | 'center' | 'right';
    className?: string;
    buttonClassName?: string;
    title?: string;
}

export function SortableTableHeader<K extends string>({
    label,
    sortKey,
    activeSort,
    onSort,
    defaultDir = 'asc',
    align = 'left',
    className,
    buttonClassName,
    title,
}: SortableTableHeaderProps<K>) {
    const isActive = activeSort?.key === sortKey;
    const ariaSort = isActive
        ? activeSort.dir === 'asc'
            ? 'ascending'
            : 'descending'
        : 'none';

    return (
        <th
            scope="col"
            aria-sort={ariaSort}
            title={title}
            className={className}
        >
            <button
                type="button"
                onClick={() => onSort(sortKey, defaultDir)}
                className={cn(
                    'group/sort inline-flex items-center gap-1 font-inherit uppercase tracking-inherit transition-colors cursor-pointer select-none hover:text-link focus:outline-none focus-visible:text-link',
                    align === 'center' && 'justify-center w-full',
                    align === 'right' && 'justify-end w-full',
                    isActive ? 'text-link' : 'text-inherit',
                    buttonClassName,
                )}
            >
                <span>{label}</span>
                {isActive ? (
                    activeSort.dir === 'asc' ? (
                        <ArrowUp size={12} className="shrink-0 text-link" />
                    ) : (
                        <ArrowDown size={12} className="shrink-0 text-link" />
                    )
                ) : (
                    <ArrowUpDown
                        size={11}
                        className="shrink-0 opacity-35 transition-opacity group-hover/sort:opacity-85"
                    />
                )}
            </button>
        </th>
    );
}
