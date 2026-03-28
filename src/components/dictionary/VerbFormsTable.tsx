import React from 'react';
import { cn } from '@/lib/utils';

export interface VerbFormsTableRow {
    key: string;
    form: React.ReactNode;
    lemma: React.ReactNode;
    imperfect: React.ReactNode;
    imperative: React.ReactNode;
    passive: React.ReactNode;
    active: React.ReactNode;
    verbalNoun: React.ReactNode;
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

    return (
        <div className={cn('inline-flex flex-col items-start leading-tight', className)}>
            <div>{primary}</div>
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
    columnLabels?: {
        form: string;
        lemma: string;
        imperfect: string;
        imperative: string;
        passive: string;
        active: string;
        verbalNoun: string;
    };
    className?: string;
    tableClassName?: string;
}) {
    if (!rows.length) return null;

    return (
        <div className={cn('mb-12 w-full max-w-full', className)}>
            <h2 className="font-sans font-semibold text-[1.1rem] text-black mb-3">{title}</h2>
            <div className="overflow-x-auto overflow-y-hidden pb-4 w-full">
                <table className={cn('w-full text-sm border-collapse text-left min-w-[600px]', tableClassName)}>
                    <thead>
                        <tr className="border-b border-black/8 font-sans text-black/80 whitespace-nowrap">
                            <th className="font-semibold pb-2 pr-4 w-12">{columnLabels.form}</th>
                            <th className="font-semibold pb-2 pr-4">{columnLabels.lemma}</th>
                            <th className="font-semibold pb-2 pr-4">{columnLabels.imperfect}</th>
                            <th className="font-semibold pb-2 pr-4">{columnLabels.imperative}</th>
                            <th className="font-semibold pb-2 pr-4">{columnLabels.passive}</th>
                            <th className="font-semibold pb-2 pr-4">{columnLabels.active}</th>
                            <th className="font-semibold pb-2">{columnLabels.verbalNoun}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.key} className={cn('border-b border-black/4 last:border-0 hover:bg-black/2 transition-colors whitespace-nowrap', row.className)}>
                                <td className="py-2.5 pr-4 font-serif">
                                    {row.form}
                                </td>
                                <td className="py-2.5 pr-4 font-serif">
                                    {row.lemma}
                                </td>
                                <td className="py-2.5 pr-4 font-serif">
                                    {row.imperfect}
                                </td>
                                <td className="py-2.5 pr-4 font-serif">
                                    {row.imperative}
                                </td>
                                <td className="py-2.5 pr-4 font-serif">
                                    {row.passive}
                                </td>
                                <td className="py-2.5 pr-4 font-serif">
                                    {row.active}
                                </td>
                                <td className="py-2.5 font-serif">
                                    {row.verbalNoun}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
