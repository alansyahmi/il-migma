import React, { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const CONSONANTS = ['ʔ', 'ħ', 't͡ʃ', 'd͡ʒ', 't͡s', 'ʃ', 'ʒ', 'j', 'w', 'f', 'v', 's', 'z', 'l', 'm', 'n', 'r', 'p', 'b', 't', 'd', 'k', 'g'];
const VOWELS = ['ɐ', 'ɛ', 'ɪ', 'ɔ', 'ʊ', 'i'];
const LONG_VOWELS = ['ɐː', 'ɛː', 'ɪː', 'ɔː', 'ʊː', 'iː'];
const MARKS = ['ˈ', 'ˌ', 'ː', '.', '/', 'ˑ'];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (char: string) => void;
    triggerRef?: React.RefObject<any>;
}

export function IPAKeyboard({ open, onInsert, triggerRef }: Props) {
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
            className="flex items-center justify-center min-w-9 h-9 px-2 rounded-md bg-white border border-black/10 text-sm font-mono text-black hover:bg-black/5 hover:border-black/20 transition-colors shadow-sm"
        >
            {ch}
        </button>
    );

    const Section = ({ label, chars }: { label: string; chars: string[] }) => (
        <div className="mt-2 first:mt-0">
            <p className="text-[10px] text-black/40 font-sans mb-2 uppercase tracking-wider">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {chars.map(c => <CharBtn key={c} ch={c} />)}
            </div>
        </div>
    );

    const content = (
        <div
            ref={ref}
            className="fixed z-9999 bg-[#F4F3F0] border border-black/10 rounded-xl shadow-lg p-3"
            style={{
                minWidth: '26rem',
                top: coords?.top ?? -9999,
                left: coords?.left ?? -9999,
                visibility: coords ? 'visible' : 'hidden'
            }}
        >
            <p className="text-[10px] text-black/40 font-sans mb-2 uppercase tracking-wider">IPA keyboard</p>
            <Section label="Consonants" chars={CONSONANTS} />
            <Section label="Vowels" chars={VOWELS} />
            <Section label="Long vowels" chars={LONG_VOWELS} />
            <Section label="Marks" chars={MARKS} />
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
}
