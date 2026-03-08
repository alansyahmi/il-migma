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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-8">
            <div className="text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                    <div className="p-2 sm:p-0 bg-[#1B4D3E]/5 rounded-xl sm:bg-transparent">
                        <BookOpen size={28} className="text-[#1B4D3E]" />
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1B4D3E]">{term('conjugation')} tal-{term('verb')}</h1>
                    <Badge variant="tag" className="bg-[#1B4D3E] text-white border-0 py-1 px-3 hidden sm:inline-flex">{t('Basic', 'Bażiku')}</Badge>
                </div>
                <p className="text-base sm:text-sm text-[#4a4a4a] leading-relaxed max-w-xl">
                    {t('Enter a verb in the 3sg.m perfective form (e.g. kiteb, niżel, fetaħ).', 'Daħħal verb fil-forma 3sg.m perfettiv (eż. kiteb, niżel, fetaħ).')}
                </p>
                <Badge variant="tag" className="mt-4 bg-[#1B4D3E] text-white border-0 py-1 px-3 sm:hidden">{t('Basic', 'Bażiku')}</Badge>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConjugate()}
                    placeholder={t('e.g. kiteb', 'eż. kiteb')}
                    className="flex-1 border-2 border-[#d8cfc0] rounded-xl px-4 py-3.5 text-lg
            font-serif focus:outline-none focus:ring-4 focus:ring-[#1034A6]/10 focus:border-[#1034A6] transition-all"
                />
                <Button
                    onClick={handleConjugate}
                    className="py-6 sm:py-2.5 px-8 text-lg sm:text-sm font-bold bg-[#1034A6] hover:bg-[#0c268c] shadow-lg shadow-[#1034A6]/20 transition-all active:scale-95"
                >
                    {t('Conjugate', 'Ikkonġuga')}
                </Button>
            </div>

            {result && (
                <Card className="animate-fade-in overflow-hidden border-0 shadow-2xl shadow-black/5 rounded-2xl">
                    <div className="px-6 py-4 bg-[#1B4D3E] border-b border-[#1B4D3E]/10">
                        <h2 className="font-serif text-2xl font-bold text-white tracking-tight">{input}</h2>
                    </div>
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-base sm:text-sm border-collapse min-w-[320px]">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#fdfaf5]">
                                    <th className="text-left px-6 py-4 text-[10px] text-[#A07030] uppercase font-bold tracking-widest">{t('Person', 'Persuna')}</th>
                                    <th className="text-left px-6 py-4 text-[10px] text-[#A07030] uppercase font-bold tracking-widest">{t('Perfective', 'Perfettiv')}</th>
                                    <th className="text-left px-6 py-4 text-[10px] text-[#A07030] uppercase font-bold tracking-widest">{t('Imperfective', 'Imperfettiv')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1]/50">
                                {PERSONS.map(({ key, label }) => (
                                    <tr key={key} className="hover:bg-black/[0.01] transition-colors group">
                                        <td className="px-6 py-4 text-black/50 text-[11px] font-bold uppercase tracking-wider bg-black/[0.01] sm:bg-transparent">{label}</td>
                                        <td className="px-6 py-4 font-serif font-bold text-lg sm:text-base text-[#1B4D3E]">{result[key].perf}</td>
                                        <td className="px-6 py-4 font-serif font-bold text-lg sm:text-base text-[#1034A6]">{result[key].imperf}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 bg-[#1034A6]/5 border-t border-[#1034A6]/10 flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <p className="text-xs text-[#1034A6] font-medium leading-relaxed">
                            {t('Demo: currently only gives the CaCaC form (kiteb). Full Conjugator coming soon.', 'Demo: bħalissa jagħti biss il-forma CaCaC (kiteb). Il-Konġugatur sħiħ jiġi dalwaqt.')}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
