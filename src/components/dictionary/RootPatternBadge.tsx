import React from 'react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Tooltip } from '@/components/ui/Tooltip';
import type { RootPatternForm } from '@/types';

interface RootPatternBadgeProps {
    form?: RootPatternForm;
    size?: 'sm' | 'md';
}

export function RootPatternBadge({ form, size = 'md' }: RootPatternBadgeProps) {
    const { mode } = useLinguisticMode();

    if (!form?.root || !form?.pattern) return null;

    const rootLabel = form.root.consonants;
    const patternLabel = mode === 'arabised'
        ? form.pattern.wizen_notation
        : form.pattern.cv_notation;

    const isSmall = size === 'sm';

    return (
        <Tooltip content={`${mode === 'arabised' ? 'Ġidra' : 'Għerq'}: ${rootLabel} | ${mode === 'arabised' ? 'Wiżen' : 'CV Pattern'}: ${patternLabel}`}>
            <div className={`inline-flex items-stretch rounded border border-[#C9A84C]/40 overflow-hidden ${isSmall ? 'text-xs' : 'text-xs'}`}>
                {/* Root chip */}
                <span className="bg-[#C9A84C] text-[#1B4D3E] font-mono font-bold px-2 py-0.5">
                    {rootLabel}
                </span>
                {/* Pattern chip */}
                <span className="bg-[#C9A84C]/15 text-[#7A5520] font-mono px-2 py-0.5 border-l border-[#C9A84C]/30">
                    {patternLabel}
                </span>
            </div>
        </Tooltip>
    );
}
