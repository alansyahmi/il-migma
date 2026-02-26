import React from 'react';
import { reliabilityBarColor, cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { Info } from 'lucide-react';
import type { AttestationReliability as AttestationReliabilityType } from '@/types';

interface AttestationReliabilityProps {
    data: AttestationReliabilityType;
    compact?: boolean;
}

export function AttestationReliability({ data, compact = false }: AttestationReliabilityProps) {
    const score = data.reliability_index;
    const barColor = reliabilityBarColor(score);
    const pct = `${score}%`;

    const scoreLabel =
        score >= 85 ? 'Affidabbli Ħafna' :
            score >= 65 ? 'Affidabbli' :
                score >= 40 ? 'Parzjalment Affidabbli' :
                    'Inċert';

    if (compact) {
        return (
            <Tooltip content={`Affidabilità: ${pct} — ${scoreLabel}`}>
                <div className="inline-flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={cn('h-full rounded-full reliability-bar-fill', barColor)}
                            style={{ '--bar-width': pct } as React.CSSProperties}
                        />
                    </div>
                    <span className="text-xs text-[#A07030] font-medium">{pct}</span>
                </div>
            </Tooltip>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#A07030]">
                    <Info size={14} />
                    Affidabilità tal-Attestament
                    <Tooltip content="Il-punteġġ huwa kkalkajat abbażi tal-pesatura ta' sorsi akkademiċi differenti.">
                        <span className="cursor-help">ⓘ</span>
                    </Tooltip>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-[#1034A6]">{pct}</span>
                    <p className="text-[11px] text-[#4a4a4a] -mt-0.5">{scoreLabel}</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full reliability-bar-fill', barColor)}
                    style={{ '--bar-width': pct } as React.CSSProperties}
                />
            </div>

            {/* Source breakdown */}
            {data.scores && data.scores.length > 0 && (
                <div className="space-y-1.5">
                    {data.scores.map((s) => (
                        <div key={s.source_id} className="flex items-center gap-2">
                            <div className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0',
                                s.attested ? 'bg-blue-500' : 'bg-red-400'
                            )} />
                            <span className="text-xs text-[#000] flex-1">{s.source_name}</span>
                            <span className="text-xs text-[#A07030] font-medium">
                                {s.attested ? `${Math.round(s.reliability_weight * 100)}%` : '—'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
