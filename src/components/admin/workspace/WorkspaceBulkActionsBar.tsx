import { Trash2, X } from 'lucide-react';

interface WorkspaceBulkActionsBarProps {
    count: number;
    selectedLabel: string;
    clearLabel: string;
    deleteLabel: string;
    onClear: () => void;
    onDelete: () => void;
}

export function WorkspaceBulkActionsBar({
    count,
    selectedLabel,
    clearLabel,
    deleteLabel,
    onClear,
    onDelete,
}: WorkspaceBulkActionsBarProps) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500 w-[92%] sm:w-auto max-w-xl">
            <div className="bg-black text-white px-6 sm:px-8 py-3 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="bg-link text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {count}
                    </div>
                    <span className="text-sm font-bold tracking-tight">{selectedLabel}</span>
                </div>
                <div className="h-4 w-px bg-white/10 hidden sm:block" />
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                    >
                        <X size={14} /> {clearLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
                    >
                        <Trash2 size={14} /> {deleteLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
