import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled, className }) => {
    return (
        <label className={cn(
            "flex items-center gap-3 cursor-pointer group select-none",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                    disabled={disabled}
                />
                <div className={cn(
                    "w-10 h-5 rounded-full transition-all duration-200 ease-in-out",
                    checked ? "bg-[#1034A6] shadow-[0_0_8px_rgba(16,52,166,0.2)]" : "bg-slate-200"
                )} />
                <div className={cn(
                    "absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out transform",
                    checked ? "translate-x-5" : "translate-x-0"
                )} />
            </div>
            {label && (
                <span className="text-sm font-medium text-slate-700 group-hover:text-black transition-colors">
                    {label}
                </span>
            )}
        </label>
    );
};
