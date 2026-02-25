import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverable?: boolean;
    as?: 'div' | 'article' | 'section';
    onClick?: () => void;
}

export function Card({ children, className, hoverable = false, as: Tag = 'div', onClick }: CardProps) {
    return (
        <Tag
            onClick={onClick}
            className={cn(
                'bg-white rounded-lg border border-[#d8cfc0] shadow-sm',
                hoverable && 'entry-card-hover cursor-pointer',
                className,
            )}
        >
            {children}
        </Tag>
    );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('px-5 py-4 border-b border-[#ede9e1]', className)}>
            {children}
        </div>
    );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('px-5 py-4', className)}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('px-5 py-3 bg-[#f9f7f3] border-t border-[#ede9e1] rounded-b-lg', className)}>
            {children}
        </div>
    );
}
