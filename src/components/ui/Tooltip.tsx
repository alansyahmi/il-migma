import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
    const [visible, setVisible] = useState(false);

    const placementClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
        left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
        right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div
                    role="tooltip"
                    className={cn(
                        'absolute z-10 px-2 py-1 text-xs text-white bg-[#2D3748] rounded whitespace-nowrap',
                        'pointer-events-none animate-fade-in shadow-md',
                        placementClasses[placement],
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
}
