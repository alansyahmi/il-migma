import React from 'react';
import { cn } from '@/lib/utils';
import { shouldHideSurface } from '@/lib/theoreticalForms';

export interface VerbFormsTableCell {
    value: React.ReactNode;
    marker?: 'plain' | 'theoretical' | 'auto_generated';
    hidden?: boolean;
    placeholder?: boolean;
}

export type VerbFormsTableCellValue = React.ReactNode | VerbFormsTableCell;

export interface VerbFormsTableRow {
    key: string;
    form: React.ReactNode;
    lemma: VerbFormsTableCellValue;
    imperfect: VerbFormsTableCellValue;
    imperative: VerbFormsTableCellValue;
    passive: VerbFormsTableCellValue;
    active: VerbFormsTableCellValue;
    verbalNoun: VerbFormsTableCellValue;
    className?: string;
}

export function StackedSurface({
    primary,
    alternates,
    className,
}: {
    primary: React.ReactNode;
    alternates?: React.ReactNode[];
    className?: string;
}) {
    if (!alternates || alternates.length === 0) {
        return <>{primary}</>;
    }

    const hasPrimary = primary !== null && primary !== undefined && primary !== false && primary !== '';

    return (
        <div className={cn('inline-flex flex-col items-start leading-tight', className)}>
            {hasPrimary && <div>{primary}</div>}
            {alternates.map((alternate, index) => (
                <div key={index}>
                    {alternate}
                </div>
            ))}
        </div>
    );
}

export function VerbFormsTable({
    title,
    rows,
    hideTheoreticalForms = false,
    columnLabels = {
        form: 'Form',
        lemma: 'Lemma',
        imperfect: 'Imperfect',
        imperative: 'Imperative',
        passive: 'Passive',
        active: 'Active',
        verbalNoun: 'Verbal Noun',
    },
    className,
    tableClassName,
}: {
    title: string;
    rows: VerbFormsTableRow[];
    hideTheoreticalForms?: boolean;
    columnLabels?: {
        form: React.ReactNode;
        lemma: React.ReactNode;
        imperfect: React.ReactNode;
        imperative: React.ReactNode;
        passive: React.ReactNode;
        active: React.ReactNode;
        verbalNoun: React.ReactNode;
    };
    className?: string;
    tableClassName?: string;
}) {
    if (!rows.length) return null;

    const columnOrder = ['lemma', 'imperfect', 'imperative', 'passive', 'active', 'verbalNoun'] as const;

    const resolveCell = (cell: VerbFormsTableCellValue) => {
        if (cell === null || cell === undefined || cell === '') {
            return {
                countsForVisibility: false,
                node: <span className="opacity-40">-</span>,
                placeholder: true,
            };
        }

        if (typeof cell === 'string' && cell.trim() === '-') {
            return {
                countsForVisibility: false,
                node: <span className="opacity-40">-</span>,
                placeholder: true,
            };
        }

        if (React.isValidElement(cell) || typeof cell !== 'object' || cell === null || !('value' in cell)) {
            return {
                countsForVisibility: true,
                node: cell,
                placeholder: false,
            };
        }

        if (cell.hidden) {
            return {
                countsForVisibility: false,
                node: <span className="opacity-40">-</span>,
                placeholder: true,
            };
        }

        const marker = cell.marker;
        if (cell.value === null || cell.value === undefined || cell.value === '') {
            return {
                countsForVisibility: false,
                node: cell.placeholder ? <span className="opacity-40">-</span> : null,
                placeholder: !!cell.placeholder,
            };
        }

        const hiddenForToggle = shouldHideSurface(
            marker ? { marker, value: cell.value } : cell.value,
            hideTheoreticalForms,
        );
        const isPlaceholder =
            !!cell.placeholder ||
            hiddenForToggle ||
            (typeof cell.value === 'string' && cell.value.trim() === '-');

        return {
            countsForVisibility: !hiddenForToggle && !isPlaceholder,
            node: isPlaceholder ? <span className="opacity-40">-</span> : cell.value,
            placeholder: isPlaceholder,
        };
    };

    const resolvedRows = rows
        .map(row => {
            const cells = {
                lemma: resolveCell(row.lemma),
                imperfect: resolveCell(row.imperfect),
                imperative: resolveCell(row.imperative),
                passive: resolveCell(row.passive),
                active: resolveCell(row.active),
                verbalNoun: resolveCell(row.verbalNoun),
            };

            const visibleCellCount = columnOrder.filter(column => cells[column].countsForVisibility).length;

            return {
                row,
                cells,
                visibleCellCount,
            };
        })
        .filter(item => item.visibleCellCount > 0);

    if (!resolvedRows.length) return null;

    const visibleColumns = columnOrder.filter(column => resolvedRows.some(item => item.cells[column].countsForVisibility));
    if (!visibleColumns.length) return null;

    return (
        <div className={cn('mb-12 w-full max-w-full', className)}>
            <h2 className="font-sans font-semibold text-[1.1rem] text-black mb-3">{title}</h2>
            <div className="overflow-x-auto overflow-y-hidden pb-4 w-full">
                <table className={cn('w-full text-sm border-collapse text-left min-w-[600px]', tableClassName)}>
                    <thead>
                        <tr className="border-b border-black/8 font-sans text-black/80 whitespace-nowrap">
                            <th className="font-semibold pb-2 pr-4 w-12">{columnLabels.form}</th>
                            {visibleColumns.map(column => (
                                <th key={column} className="font-semibold pb-2 pr-4">
                                    {columnLabels[column]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {resolvedRows.map(({ row, cells }) => (
                            <tr key={row.key} className={cn('border-b border-black/4 last:border-0 hover:bg-black/2 transition-colors whitespace-nowrap', row.className)}>
                                <td className="py-2.5 pr-4 font-serif">
                                    {row.form}
                                </td>
                                {visibleColumns.map(column => (
                                    <td key={column} className="py-2.5 pr-4 font-serif last:pr-0">
                                        {cells[column].countsForVisibility || cells[column].placeholder ? cells[column].node : null}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
