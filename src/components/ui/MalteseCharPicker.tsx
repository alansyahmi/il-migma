import React, { useEffect, useRef } from 'react';

const LOWER = ['à', 'ċ', 'è', 'ġ', 'għ', 'ħ', 'ì', 'ò', 'ù', 'ż'];
const UPPER = ['À', 'Ċ', 'È', 'Ġ', 'Għ', 'Ħ', 'Ì', 'Ò', 'Ù', 'Ż'];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (char: string) => void;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function MalteseCharPicker({ open, onOpenChange, onInsert, triggerRef }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            // Ignore if clicking the picker itself OR the trigger button
            if (ref.current && ref.current.contains(e.target as Node)) return;
            if (triggerRef?.current && triggerRef.current.contains(e.target as Node)) return;

            onOpenChange(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, onOpenChange, triggerRef]);

    if (!open) return null;

    const CharBtn = ({ ch }: { ch: string }) => (
        <button
            type="button"
            onMouseDown={e => {
                e.preventDefault(); // prevent input blur
                onInsert(ch);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-white border border-black/10 text-sm font-serif text-[#000] hover:bg-black/5 hover:border-black/20 transition-colors shadow-sm"
        >
            {ch}
        </button>
    );

    return (
        <div
            ref={ref}
            className="absolute left-0 top-full mt-1.5 z-50 bg-[#F4F3F0] border border-black/10 rounded-xl shadow-lg p-3"
            style={{ minWidth: '22rem' }}
        >
            <p className="text-[10px] text-black/40 font-sans mb-2 uppercase tracking-wider">Maltese characters</p>
            <div className="flex flex-wrap gap-1.5">
                {LOWER.map(c => <CharBtn key={c} ch={c} />)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
                {UPPER.map(c => <CharBtn key={c} ch={c} />)}
            </div>
        </div>
    );
}
