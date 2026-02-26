import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'pos' | 'source' | 'tier' | 'root' | 'tag' | 'register';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
    pos: 'bg-[#1034A6]/10 text-[#1034A6] border border-[#1034A6]/20',
    root: 'bg-[#C9A84C]/15 text-[#7A5520] border border-[#C9A84C]/30 font-mono',
    source: 'bg-[#A07030]/10 text-[#A07030] border border-[#A07030]/20',
    tier: 'bg-[#1034A6]/10 text-[#1034A6] border border-[#1034A6]/20',
    tag: 'bg-gray-100 text-gray-600 border border-gray-200',
    register: 'bg-purple-50 text-purple-700 border border-purple-200 italic',
};

export function Badge({ variant = 'tag', children, className }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                variantClasses[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}
