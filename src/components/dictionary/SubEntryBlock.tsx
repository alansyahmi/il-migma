import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';

import type { SubEntry } from '@/types';

interface SubEntryBlockProps {
    subentry: SubEntry;
    defaultOpen?: boolean;
}

export function SubEntryBlock({ subentry, defaultOpen = false }: SubEntryBlockProps) {
    const [open, setOpen] = useState(defaultOpen);
    const { term } = useLinguisticMode();

    return (
        <div className="border-l-2 border-[#C9A84C]/40 pl-4 py-1">
            {/* Header */}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 group w-full text-left"
            >
                <span className={cn(
                    "font-serif text-base font-semibold transition-colors",
                    subentry.headword.startsWith('*') ? "text-black/55" : "text-[#1034A6] hover:underline"
                )}>
                    {subentry.headword}
                </span>
                {subentry.pos && (
                    <Badge variant="pos">{term(subentry.pos)}</Badge>
                )}
                <span className="ml-auto text-gray-400 group-hover:text-[#1034A6] transition-colors">
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
            </button>

            {/* Expanded content */}
            {open && (
                <div className="mt-2 space-y-2 animate-fade-in">
                    {subentry.definitions?.map((def: any) => (
                        <div key={def.id} className="flex gap-2">
                            <span className="text-[#A07030] font-semibold text-sm min-w-[16px]">
                                {def.sense_number}.
                            </span>
                            <div className="flex-1">
                                <span className="text-sm text-black">{def.text_en}</span>
                                {def.text_mt && def.text_mt !== def.text_en && (
                                    <span className="text-xs text-text-muted ml-2 italic">— {def.text_mt}</span>
                                )}
                                {def.register && (
                                    <Badge variant="register" className="ml-2">{def.register}</Badge>
                                )}
                                {def.example_sentences?.map((ex: any) => (
                                    <div key={ex.id} className="mt-1 ml-2 text-xs text-text-muted">
                                        <em>"{ex.maltese}"</em>
                                        {ex.english && <span className="ml-1 text-gray-400">({ex.english})</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
