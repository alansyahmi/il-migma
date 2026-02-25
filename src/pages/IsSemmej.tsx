import React, { useState } from 'react';
import { TierGate } from '@/components/ui/TierGate';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { generateMalteseName } from '@/lib/gemini';
import { Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function IsSemmej() {
    const { hasAccess } = useAuth();

    if (!hasAccess('semmej')) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16">
                <TierGate feature="semmej" />
            </div>
        );
    }

    return <SemmejInterface />;
}

function SemmejInterface() {
    const [concept, setConcept] = useState('');
    const [roots, setRoots] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Array<{ word: string; rationale: string }>>([]);

    const generate = async () => {
        if (!concept.trim()) return;
        setLoading(true);
        try {
            const result = await generateMalteseName(concept, roots ? roots.split(',').map(r => r.trim()) : undefined);
            setSuggestions(result.suggestions);
        } catch (e) {
            setSuggestions([{ word: 'Żball', rationale: 'Żball tekniku. Prova mill-ġdid.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Wand2 size={20} className="text-[#C9A84C]" />
                    <h1 className="font-serif text-2xl font-bold text-[#1B4D3E]">Is-Semmej</h1>
                    <Badge variant="tier">Pro</Badge>
                </div>
                <p className="text-sm text-[#4a4a4a]">Agħti deskrizzjoni ta' xi ħaġa, u s-Semmej joħloq isem Malti ġenwin.</p>
            </div>

            <div className="bg-white border border-[#d8cfc0] rounded-xl p-5 space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-[#1B4D3E] mb-1.5 uppercase tracking-wider">
                        Deskrizzjoni tal-Kunċett *
                    </label>
                    <textarea
                        value={concept}
                        onChange={e => setConcept(e.target.value)}
                        placeholder="eż. a person who collects and preserves old books"
                        rows={3}
                        className="w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#1034A6] resize-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-[#1B4D3E] mb-1.5 uppercase tracking-wider">
                        Għeruq Preferiti (b'virgola, fakultattiv)
                    </label>
                    <input
                        value={roots}
                        onChange={e => setRoots(e.target.value)}
                        placeholder="eż. k-t-b, ħ-f-ħ"
                        className="w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#1034A6]"
                    />
                </div>
                <Button loading={loading} onClick={generate} leftIcon={<Sparkles size={15} />} className="w-full">
                    Issemmi bil-Malti
                </Button>
            </div>

            {suggestions.length > 0 && (
                <div className="space-y-3 animate-fade-in">
                    <h2 className="text-sm font-semibold text-[#1B4D3E] uppercase tracking-wider">Suġġerimenti</h2>
                    {suggestions.map((s, i) => (
                        <div key={i} className="bg-white border border-[#d8cfc0] rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[#C9A84C] font-semibold text-sm">{i + 1}.</span>
                                <span className="font-serif text-2xl font-bold text-[#1B4D3E]">{s.word}</span>
                            </div>
                            <p className="text-sm text-[#4a4a4a] leading-relaxed">{s.rationale}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
