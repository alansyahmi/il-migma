import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

export function Spinner({ size = 'md', className }: SpinnerProps) {
    return (
        <div
            role="status"
            aria-label="Loading..."
            className={cn(
                'border-2 border-current border-t-transparent rounded-full animate-spin text-[#1B4D3E]',
                sizeMap[size],
                className,
            )}
        />
    );
}

export function FullPageSpinner() {
    return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
        </div>
    );
}
