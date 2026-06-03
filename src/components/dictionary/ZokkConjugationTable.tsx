import { useMemo } from 'react';
import type { ZokkMorphology } from '@/types';
import { generateZokkForms } from '@/lib/zokkEngine';
import { cn } from '@/lib/utils';

type ZokkConjugationTableProps = {
    morphology: ZokkMorphology;
    className?: string;
    title: string;
    term: (key: string) => string;
};

function surfaceNode(value?: string) {
    if (!value) {
        return <span className="text-black/25">-</span>;
    }

    return <span className="font-serif">{value}</span>;
}

export function ZokkConjugationTable({
    morphology,
    className,
    title,
    term,
}: ZokkConjugationTableProps) {
    const forms = useMemo(() => generateZokkForms(morphology), [morphology]);
    const conjugation = forms.conjugation;

    if (!conjugation?.rows?.length) {
        return null;
    }

    return (
        <div className={cn('flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none', className)}>
            <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                {title}
            </h2>

            <div className="hidden md:block overflow-x-auto overflow-y-hidden pb-4">
                <table className="w-full text-sm border-collapse md:min-w-[500px]">
                    <thead>
                        <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                            <th className="text-left font-semibold text-black pb-2 pr-4 w-32">{term('person')}</th>
                            <th className="text-left font-semibold text-black pb-2 pr-4">
                                {term('imperfect')} <span className="opacity-55 font-normal text-xs">{term('(present)')}</span>
                            </th>
                            <th className="text-left font-semibold text-black pb-2">
                                {term('perfect')} <span className="opacity-55 font-normal text-xs">{term('(past)')}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {conjugation.rows.map(row => (
                            <tr key={row.person_mt} className="border-b border-black/4 whitespace-nowrap">
                                <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">
                                    {term(row.person_mt)}
                                </td>
                                <td className="py-1.5 pr-4 font-serif font-normal text-black">
                                    {surfaceNode(row.imperfect)}
                                </td>
                                <td className="py-1.5 font-serif font-normal text-black">
                                    {surfaceNode(row.perfect)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-4 grid grid-cols-3 gap-2 text-sm border-t border-black/8 pt-3">
                    <p className="font-sans font-semibold text-black self-center">{term('imperative')}</p>
                    <div>
                        <p className="text-xs text-black/40 mb-0.5">{term('singular')}</p>
                        <p className="font-serif font-normal text-black">
                            {surfaceNode(conjugation.imperative_sg)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-black/40 mb-0.5">{term('plural')}</p>
                        <p className="font-serif font-normal text-black">
                            {surfaceNode(conjugation.imperative_pl)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="block md:hidden space-y-6">
                <div>
                    <h3 className="font-sans font-semibold text-black mb-3">{term('perfect')}</h3>
                    <div className="w-full overflow-hidden">
                        <table className="w-full border-collapse table-fixed">
                            <thead>
                                <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                    <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                    <th className="text-right pb-1">{term('conjugation')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/2">
                                {conjugation.rows.map(row => (
                                    <tr key={`perf-${row.person_mt}`}>
                                        <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term(row.person_mt)}</td>
                                        <td className="py-2 font-serif text-black text-right break-all text-sm">
                                            {surfaceNode(row.perfect)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h3 className="font-sans font-semibold text-black mb-3">{term('imperfect')}</h3>
                    <div className="w-full overflow-hidden">
                        <table className="w-full border-collapse table-fixed">
                            <thead>
                                <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                    <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                    <th className="text-right pb-1">{term('conjugation')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/2">
                                {conjugation.rows.map(row => (
                                    <tr key={`impf-${row.person_mt}`}>
                                        <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term(row.person_mt)}</td>
                                        <td className="py-2 font-serif text-black text-right break-all text-sm">
                                            {surfaceNode(row.imperfect)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h3 className="font-sans font-semibold text-black mb-3">{term('imperative')}</h3>
                    <div className="w-full overflow-hidden">
                        <table className="w-full border-collapse table-fixed">
                            <thead>
                                <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                    <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                    <th className="text-right pb-1">{term('conjugation')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/2">
                                <tr>
                                    <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term('singular')}</td>
                                    <td className="py-2 font-serif text-black text-right break-all text-sm">
                                        {surfaceNode(conjugation.imperative_sg)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term('plural')}</td>
                                    <td className="py-2 font-serif text-black text-right break-all text-sm">
                                        {surfaceNode(conjugation.imperative_pl)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
