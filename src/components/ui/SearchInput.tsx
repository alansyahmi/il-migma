import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';


interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: (value: string) => void;
    placeholder?: string;
    size?: 'sm' | 'md' | 'lg';
    autoFocus?: boolean;
    className?: string;
    id?: string;
}

const sizeClasses = {
    sm: 'py-1.5 pl-8 pr-8 text-sm',
    md: 'py-2.5 pl-10 pr-10 text-base',
    lg: 'py-3.5 pl-12 pr-12 text-lg',
};
const iconSizes = { sm: 14, md: 16, lg: 20 };
const iconOffsets = { sm: 'left-2.5 top-2', md: 'left-3 top-2.5', lg: 'left-3.5 top-3.5' };

export function SearchInput({
    value,
    onChange,
    onSubmit,
    placeholder,
    size = 'md',
    autoFocus = false,
    className,
    id = 'search-input',
}: SearchInputProps) {
    const { t } = useLanguage();
    const defaultPlaceholder = t('Search…', 'Fittex…');
    const finalPlaceholder = placeholder || defaultPlaceholder;
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onSubmit) onSubmit(value);
        if (e.key === 'Escape') onChange('');
    };

    return (
        <div className={cn('relative', className)}>
            <Search
                size={iconSizes[size]}
                className={cn('absolute text-gray-400 pointer-events-none', iconOffsets[size])}
            />
            <input
                ref={inputRef}
                id={id}
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={finalPlaceholder}
                autoComplete="off"
                spellCheck="false"
                className={cn(
                    'w-full rounded-lg border border-[#d8cfc0] bg-white font-sans',
                    'focus:outline-none focus:ring-2 focus:ring-[#1034A6] focus:border-[#1034A6]',
                    'placeholder:text-gray-400 transition-colors',
                    sizeClasses[size],
                )}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className={cn(
                        'absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600 transition-colors',
                    )}
                    aria-label={t('Clear search', 'Naddaf it-tfittxija')}
                >
                    <X size={iconSizes[size]} />
                </button>
            )}
        </div>
    );
}
