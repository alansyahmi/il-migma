import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    zIndex?: string;
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md', className, zIndex }: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            const remainingModals = document.querySelectorAll('[role="dialog"]');
            if (remainingModals.length <= 1) {
                document.body.style.overflow = originalOverflow;
            }
        };
    }, [open, onClose]);

    if (!open) return null;
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div
            className={cn(
                "fixed inset-0 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden",
                zIndex || "z-50"
            )}
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Panel */}
            <div
                ref={panelRef}
                className={cn(
                    'relative w-full bg-white rounded-none sm:rounded-xl shadow-2xl animate-fade-in flex flex-col h-full sm:h-auto max-h-full sm:max-h-[90vh]',
                    'border-0 sm:border border-border pb-[env(safe-area-inset-bottom)] sm:pb-0',
                    sizeClasses[size],
                    className,
                )}
            >
                {title && (
                    <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border-light shrink-0">
                        <h2 className="font-serif text-base sm:text-lg font-semibold text-black pr-2">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors rounded-md p-1.5 sm:p-1 hover:bg-gray-100 shrink-0"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
                <div className="p-3 sm:p-6 overflow-hidden flex-1 flex flex-col min-h-0">{children}</div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
