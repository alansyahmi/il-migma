import React, { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const LOWER = ['ċ', 'ġ', 'għ', 'ħ', 'ż'];
const UPPER = ['Ċ', 'Ġ', 'Għ', 'Ħ', 'Ż'];
const STRESS = ['á', 'é', 'í', 'ó', 'ú'];
const CIRCUMFLEX = ['â', 'ê', 'î', 'ô', 'û', 'v\u0302'];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (char: string) => void;
    triggerRef?: React.RefObject<any>;
}

export function MalteseCharPicker({ open, onInsert, triggerRef }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number, left: number } | null>(null);

    useLayoutEffect(() => {
        const updatePos = () => {
            if (open && triggerRef?.current && ref.current) {
                const triggerRect = triggerRef.current.getBoundingClientRect();
                const pickerRect = ref.current.getBoundingClientRect();

                let top = triggerRect.bottom + 6; // 6px gap
                let left = triggerRect.left;

                // Adjust if it goes off bottom
                if (top + pickerRect.height > window.innerHeight) {
                    top = triggerRect.top - pickerRect.height - 6;
                }

                // Adjust if it goes off right
                if (left + pickerRect.width > window.innerWidth) {
                    left = window.innerWidth - pickerRect.width - 12; // 12px padding
                }

                // Adjust if it goes off left
                if (left < 0) left = 12;

                setCoords({ top, left });
            }
        };

        if (open) {
            updatePos();
            window.addEventListener('resize', updatePos);
            window.addEventListener('scroll', updatePos, true); // capture phase
        }

        return () => {
            window.removeEventListener('resize', updatePos);
            window.removeEventListener('scroll', updatePos, true);
        };
    }, [open, triggerRef]);

    if (!open) return null;

    const CharBtn = ({ ch }: { ch: string }) => (
        <button
            type="button"
            onMouseDown={e => {
                e.preventDefault(); // prevent input blur
                onInsert(ch);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-white border border-black/10 text-sm font-serif text-black hover:bg-black/5 hover:border-black/20 transition-colors shadow-sm"
        >
            {ch}
        </button>
    );

    const content = (
        <div
            ref={ref}
            className="fixed z-9999 bg-[#F4F3F0] border border-black/10 rounded-xl shadow-lg p-3"
            style={{
                minWidth: '22rem',
                top: coords?.top ?? -9999,
                left: coords?.left ?? -9999,
                visibility: coords ? 'visible' : 'hidden'
            }}
        >
            <p className="text-[10px] text-black/40 font-sans mb-2 uppercase tracking-wider">Maltese characters</p>
            <div className="justify-center flex flex-wrap gap-1.5">
                {LOWER.map(c => <CharBtn key={c} ch={c} />)}
            </div>
            <div className="justify-center flex flex-wrap gap-1.5 mt-1.5">
                {UPPER.map(c => <CharBtn key={c} ch={c} />)}
            </div>
            <p className="text-[10px] text-black/40 font-sans mt-2.5 mb-2 uppercase tracking-wider">Stress vowels</p>
            <div className="justify-center flex flex-wrap gap-1.5 mt-1.5">
                {STRESS.map(c => <CharBtn key={c} ch={c} />)}
            </div>
            <div className="justify-center flex flex-wrap gap-1.5 mt-1.5">
                {CIRCUMFLEX.map(c => <CharBtn key={c} ch={c} />)}
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
}
