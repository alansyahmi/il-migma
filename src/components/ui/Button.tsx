import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
    primary: 'bg-[#1B4D3E] text-white hover:bg-[#123527] active:scale-[0.98]',
    secondary: 'border border-[#1B4D3E] text-[#1B4D3E] hover:bg-[#1B4D3E]/10',
    ghost: 'text-[#000000] hover:bg-black/5',
    danger: 'bg-[#B22222] text-white hover:bg-[#8B1A1A]',
    accent: 'bg-[#A07030] text-white hover:bg-[#7A5520]',
};

const sizeClasses: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
};

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center font-sans font-medium rounded-md',
                'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[#1034A6] focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                variantClasses[variant],
                sizeClasses[size],
                className,
            )}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : leftIcon}
            {children}
            {!loading && rightIcon}
        </button>
    );
}
