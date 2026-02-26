
import { cn } from '@/lib/utils';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';

interface LinguisticToggleProps {
    className?: string;
}

export function LinguisticToggle({ className }: LinguisticToggleProps) {
    const { mode, setMode } = useLinguisticMode();
    const isArabised = mode === 'arabised';

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <span className={cn('text-xs font-medium transition-colors', !isArabised ? 'text-[#1034A6]' : 'text-gray-400')}>
                Standard
            </span>
            <button
                role="switch"
                aria-checked={isArabised}
                onClick={() => setMode(isArabised ? 'standard' : 'arabised')}
                className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                    'transition-colors duration-200 ease-in-out focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-[#1034A6] focus-visible:ring-offset-2',
                    isArabised ? 'bg-[#C9A84C]' : 'bg-[#1034A6]',
                )}
                title={`Switch to ${isArabised ? 'Standard' : 'Arabised'} Maltese terminology`}
            >
                <span
                    className={cn(
                        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md',
                        'transform transition-transform duration-200 ease-in-out',
                        isArabised ? 'translate-x-4' : 'translate-x-0',
                    )}
                />
            </button>
            <span className={cn('text-xs font-medium transition-colors', isArabised ? 'text-[#C9A84C]' : 'text-gray-400')}>
                Arabised
            </span>
        </div>
    );
}
