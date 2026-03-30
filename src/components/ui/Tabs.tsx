import React from 'react';
import { cn } from '@/lib/utils';

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface TabsProps {
    tabs: readonly Tab[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div className={cn('flex border-b border-[#d8cfc0]', className)} role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium',
                        'border-b-2 transition-colors duration-150 -mb-[1px]',
                        activeTab === tab.id
                            ? 'border-[#1034A6] text-[#1034A6]'
                            : 'border-transparent text-gray-500 hover:text-[#1034A6] hover:border-[#C9A84C]',
                    )}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

interface TabContentProps {
    tabId: string;
    activeTab: string;
    children: React.ReactNode;
}

export function TabContent({ tabId, activeTab, children }: TabContentProps) {
    if (tabId !== activeTab) return null;
    return <div role="tabpanel" className="animate-fade-in">{children}</div>;
}
