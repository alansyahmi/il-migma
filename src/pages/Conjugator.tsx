import { useState, useEffect } from 'react';
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
    const { term } = useLinguisticMode();
    const [input, setInput] = useState('');
    const [result, setResult] = useState<Record<Person, { perf: string; imperf: string }> | null>(null);

    useEffect(() => {
        document.title = `${term('conjugation')} | Il-Miġma'`;
    }, [term]);

    const handleConjugate = () => {
        if (!input.trim()) return;
        setResult(conjugateDemo(input.trim()));
    };

    return (
        <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8 space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={20} className="text-[#1B4D3E]" />
                    <h1 className="font-serif text-2xl font-bold text-[#1B4D3E]">{term('conjugation')} tal-{term('verb')}</h1>
                    <Badge variant="tag">{term('basic')}</Badge>
                </div>
                <p className="text-sm text-text-muted">
                    {term('conjugator-desc')}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConjugate()}
                    placeholder={term('eg-kiteb')}
                    className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm
            font-serif focus:outline-none focus:ring-2 focus:ring-[#1034A6]"
                />
                <Button onClick={handleConjugate}>{term('conjugate')}</Button>
            </div>

            {result && (
                <Card className="animate-fade-in overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#1B4D3E]/5 border-b border-border-light">
                        <h2 className="font-serif text-lg font-bold text-[#1B4D3E]">{input}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border-light bg-surface-soft">
                                    <th className="text-left px-4 py-2 text-xs text-[#A07030] uppercase font-semibold">{term('person')}</th>
                                    <th className="text-left px-4 py-2 text-xs text-[#A07030] uppercase font-semibold">{term('perfect')}</th>
                                    <th className="text-left px-4 py-2 text-xs text-[#A07030] uppercase font-semibold">{term('imperfect')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PERSONS.map(({ key, label }) => (
                                    <tr key={key} className="border-b border-border-light last:border-0 hover:bg-surface-soft transition-colors">
                                        <td className="px-4 py-2 text-text-muted text-xs">{label}</td>
                                        <td className="px-4 py-2 font-serif font-semibold text-[#1B4D3E]">{result[key].perf}</td>
                                        <td className="px-4 py-2 font-serif font-semibold text-[#1034A6]">{result[key].imperf}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                        <p className="text-xs text-amber-700">
                            ⚠ {term('conjugator-demo-warning')}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
