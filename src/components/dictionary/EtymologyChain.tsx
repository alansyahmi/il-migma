import React from 'react';
import { ArrowRight, Info } from 'lucide-react';
import type { Etymology } from '@/types';

interface EtymologyChainProps {
    etymologies: Etymology[];
}

const LANGUAGE_COLORS: Record<string, { bg: string; text: string }> = {
    Arabic: { bg: 'bg-emerald-50', text: 'text-emerald-800' },
    Sicilian: { bg: 'bg-orange-50', text: 'text-orange-800' },
    Italian: { bg: 'bg-blue-50', text: 'text-blue-800' },
    Latin: { bg: 'bg-purple-50', text: 'text-purple-800' },
    French: { bg: 'bg-sky-50', text: 'text-sky-800' },
    English: { bg: 'bg-gray-100', text: 'text-gray-700' },
    Spanish: { bg: 'bg-yellow-50', text: 'text-yellow-800' },
    Berber: { bg: 'bg-amber-50', text: 'text-amber-800' },
    Greek: { bg: 'bg-indigo-50', text: 'text-indigo-800' },
    Uncertain: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function EtymologyChain({ etymologies }: EtymologyChainProps) {
    if (!etymologies?.length) return null;

    return (
        <div className="space-y-4">
            {etymologies.map((ety) => (
                <div key={ety.id} className="space-y-2">
                    {/* Chain nodes */}
                    <div className="flex flex-wrap items-center gap-2">
                        {ety.chain.map((node, i) => {
                            const colors = LANGUAGE_COLORS[node.language] ?? LANGUAGE_COLORS.Uncertain;
                            return (
                                <React.Fragment key={i}>
                                    <div className={`rounded-lg border px-3 py-2 min-w-[80px] ${colors.bg} border-current/10`}>
                                        <div className={`text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${colors.text} opacity-70`}>
                                            {node.language}
                                        </div>
                                        {node.script && (
                                            <div className="font-arabic text-base leading-tight text-right mb-0.5">
                                                {node.script}
                                            </div>
                                        )}
                                        <div className={`font-serif text-sm font-semibold ${colors.text}`}>
                                            <em>{node.form}</em>
                                        </div>
                                        {node.meaning && (
                                            <div className="text-[11px] text-gray-500 mt-0.5 italic">"{node.meaning}"</div>
                                        )}
                                        {node.time_period && (
                                            <div className="text-[10px] text-gray-400 mt-0.5">{node.time_period}</div>
                                        )}
                                    </div>
                                    {i < ety.chain.length - 1 && (
                                        <ArrowRight size={14} className="text-[#A07030] flex-shrink-0" />
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {/* Final arrow to Maltese */}
                        <ArrowRight size={14} className="text-[#A07030] flex-shrink-0" />
                        <div className="rounded-lg border border-[#1034A6]/20 bg-[#1034A6]/5 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#1034A6]/60 mb-0.5">
                                Malti
                            </div>
                            <div className="font-serif text-sm font-bold text-[#1034A6]">
                                ← dan il-kelma
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {ety.notes && (
                        <p className="text-xs text-[#4a4a4a] bg-[#f9f7f3] border border-[#ede9e1] rounded px-3 py-2 leading-relaxed flex gap-2">
                            <Info size={12} className="text-[#A07030] mt-0.5 flex-shrink-0" />
                            {ety.notes}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
