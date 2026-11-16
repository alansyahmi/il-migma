import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WorkspaceToolbarProps {
    heading: string;
    countText: string;
    controls: ReactNode;
    filters: ReactNode;
    sticky?: boolean;
}

export function WorkspaceToolbar({ heading, countText, controls, filters, sticky = true }: WorkspaceToolbarProps) {
    return (
        <div className={cn('bg-[#f7f6f3] border border-black/5 rounded-2xl p-3 space-y-3 shadow-sm', sticky && 'sticky top-16 z-30')}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-black">{heading}</h2>
                    <p className="text-[11px] font-bold text-black/35 uppercase tracking-widest mt-0.5">{countText}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">{controls}</div>
            </div>
            <div className="flex flex-col gap-3">{filters}</div>
        </div>
    );
}
