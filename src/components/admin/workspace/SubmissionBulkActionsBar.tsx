import { CheckCircle2, Clock3, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmissionBulkActionsBarProps {
    count: number;
    onClear: () => void;
    onDelete: () => void;
    onMarkNew: () => void;
    onMarkReviewed: () => void;
    onMarkClosed: () => void;
    onMarkSpam: () => void;
    busy?: boolean;
}

export function SubmissionBulkActionsBar({
    count,
    onClear,
    onDelete,
    onMarkNew,
    onMarkReviewed,
    onMarkClosed,
    onMarkSpam,
    busy = false,
}: SubmissionBulkActionsBarProps) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500 w-[92%] sm:w-auto max-w-4xl">
            <div className="bg-black text-white px-6 sm:px-8 py-3 rounded-2xl shadow-2xl flex flex-col gap-3 border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-link text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                            {count}
                        </div>
                        <span className="text-sm font-bold tracking-tight">
                            {count} selected
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                        disabled={busy}
                    >
                        <X size={14} /> Clear
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={onMarkNew} disabled={busy} className={chipClass}>
                        <Clock3 size={14} /> New
                    </button>
                    <button type="button" onClick={onMarkReviewed} disabled={busy} className={chipClass}>
                        <CheckCircle2 size={14} /> Reviewed
                    </button>
                    <button type="button" onClick={onMarkClosed} disabled={busy} className={chipClass}>
                        <CheckCircle2 size={14} /> Closed
                    </button>
                    <button type="button" onClick={onMarkSpam} disabled={busy} className={chipClass}>
                        <CheckCircle2 size={14} /> Spam
                    </button>
                    <button type="button" onClick={onDelete} disabled={busy} className={cn(chipClass, 'bg-red-500 text-white hover:bg-red-600')}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

const chipClass = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
