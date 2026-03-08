import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BookOpen } from 'lucide-react';

type Person = '1sg' | '2sg' | '3sg_m' | '3sg_f' | '1pl' | '2pl' | '3pl';
const PERSONS: { key: Person; label: string }[] = [
    { key: '1sg', label: 'jiena (jien)' },
    { key: '2sg', label: 'inti (int)' },
    { key: '3sg_m', label: 'huwa' },
    { key: '3sg_f', label: 'hija' },
    { key: '1pl', label: 'aħna' },
    { key: '2pl', label: 'intom' },
    { key: '3pl', label: 'huma' },
];

function conjugateDemo(_perf3sgm: string): Record<Person, { perf: string; imperf: string }> {
    // Very rudimentary CaCaC pattern only
    return {
        '1sg': { perf: 'ktibt', imperf: 'nikteb' },
        '2sg': { perf: 'ktibt', imperf: 'tikteb' },
        '3sg_m': { perf: 'kiteb', imperf: 'jikteb' },
        '3sg_f': { perf: 'kitbet', imperf: 'tikteb' },
        '1pl': { perf: 'ktibna', imperf: 'niktbu' },
        '2pl': { perf: 'ktibtu', imperf: 'tiktbu' },
        '3pl': { perf: 'kitbu', imperf: 'jiktbu' },
    };
}

export function Conjugator() {
    const { t } = useLanguage();
    const { term } = useLinguisticMode();
    const [input, setInput] = useState('');
    const [result, setResult] = useState<Record<Person, { perf: string; imperf: string }> | null>(null);

    useEffect(() => {
        document.title = `${t('Conjugator', term('conjugation'))} | Il-Miġma'`;
    }, [t, term]);

    const handleConjugate = () => {
        if (!input.trim()) return;
        setResult(conjugateDemo(input.trim()));
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={20} className="text-[#1B4D3E]" />
                    <h1 className="font-serif text-2xl font-bold text-[#1B4D3E]">{term('conjugation')} tal-{term('verb')}</h1>
                    <Badge variant="tag">{t('Basic', 'Bażiku')}</Badge>
                </div>
                <p className="text-sm text-[#4a4a4a]">
                    {t('Enter a verb in the 3sg.m perfect form (e.g. kiteb, niżel, fetaħ).', 'Daħħal verb fil-forma 3sg.m perfett (eż. kiteb, niżel, fetaħ).')}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConjugate()}
                    placeholder={t('e.g. kiteb', 'eż. kiteb')}
                    className="flex-1 border border-[#d8cfc0] rounded-lg px-3 py-2.5 text-sm
            font-serif focus:outline-none focus:ring-2 focus:ring-[#1034A6]"
                />
                <Button onClick={handleConjugate}>{t('Conjugate', 'Ikkonġuga')}</Button>
            </div>

            {result && (
                <Card className="animate-fade-in overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#1B4D3E]/5 border-b border-[#ede9e1]">
                        <h2 className="font-serif text-lg font-bold text-[#1B4D3E]">{input}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#f9f7f3]">
                                    <th className="text-left px-4 py-2 text-xs text-[#A07030] uppercase font-semibold">{t('Person', 'Persuna')}</th>
                                    <th className="text-left px-4 py-2 text-xs text-[#A07030] uppercase font-semibold">{term('perfett')}</th>
                                    <th className="text-left px-4 py-2 text-xs text-[#A07030] uppercase font-semibold">{term('imperfett')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PERSONS.map(({ key, label }) => (
                                    <tr key={key} className="border-b border-[#ede9e1] last:border-0 hover:bg-[#f9f7f3] transition-colors">
                                        <td className="px-4 py-2 text-[#4a4a4a] text-xs">{label}</td>
                                        <td className="px-4 py-2 font-serif font-semibold text-[#1B4D3E]">{result[key].perf}</td>
                                        <td className="px-4 py-2 font-serif font-semibold text-[#1034A6]">{result[key].imperf}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                        <p className="text-xs text-amber-700">
                            ⚠ {t('Demo: currently only gives the CaCaC form (kiteb). Full Conjugator coming soon.', 'Demo: bħalissa jagħti biss il-forma CaCaC (kiteb). Il-Konġugatur sħiħ jiġi dalwaqt.')}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
