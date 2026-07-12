import React, { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const ALPHABET_ROW_1 = ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'];
const ALPHABET_ROW_2 = ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'];
const ALPHABET_ROW_3 = ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'ذ'];
const EXTRA = ['أ', 'إ', 'آ', 'ٱ'];
const DIACRITICS = ['َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ً', 'ٌ', 'ٍ'];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (char: string) => void;
    triggerRef?: React.RefObject<any>;
}

export function ArabicKeyboard({ open, onInsert, triggerRef }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number, left: number } | null>(null);

    useLayoutEffect(() => {
        const updatePos = () => {
            if (open && triggerRef?.current && ref.current) {
                const triggerRect = triggerRef.current.getBoundingClientRect();
                const pickerRect = ref.current.getBoundingClientRect();

                let top = triggerRect.bottom + 6;
                let left = triggerRect.left;

                if (top + pickerRect.height > window.innerHeight) {
                    top = triggerRect.top - pickerRect.height - 6;
                }

                if (left + pickerRect.width > window.innerWidth) {
                    left = window.innerWidth - pickerRect.width - 12;
                }

                if (left < 0) left = 12;

                setCoords({ top, left });
            }
        };

        if (open) {
            updatePos();
            window.addEventListener('resize', updatePos);
            window.addEventListener('scroll', updatePos, true);
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
                e.preventDefault();
                onInsert(ch);
            }}
            className="flex items-center justify-center min-w-9 h-9 px-2 rounded-md bg-white border border-black/10 text-sm font-serif text-black hover:bg-black/5 hover:border-black/20 transition-colors shadow-sm"
        >
            {ch}
        </button>
    );

    const content = (
        <div
            ref={ref}
            className="fixed z-9999 bg-[#F4F3F0] border border-black/10 rounded-xl shadow-lg p-3"
            style={{
                minWidth: '28rem',
                top: coords?.top ?? -9999,
                left: coords?.left ?? -9999,
                visibility: coords ? 'visible' : 'hidden'
            }}
            dir="rtl"
        >
            <p className="text-[10px] text-black/40 font-sans mb-2 uppercase tracking-wider text-left" dir="ltr">Arabic Keyboard</p>
            <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1.5 justify-center">
                    {ALPHABET_ROW_1.map(c => <CharBtn key={c} ch={c} />)}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                    {ALPHABET_ROW_2.map(c => <CharBtn key={c} ch={c} />)}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                    {ALPHABET_ROW_3.map(c => <CharBtn key={c} ch={c} />)}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1.5 pt-1.5 border-t border-black/5">
                    {EXTRA.map(c => <CharBtn key={c} ch={c} />)}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1 pt-1">
                    {DIACRITICS.map(c => <CharBtn key={c} ch={c} />)}
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
}
