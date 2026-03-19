import { Braces, ChevronDown, GripVertical, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminCategory, AdminCategoryGroupId } from '@/lib/adminCategoryRegistry';

interface AdminSettingsSidebarProps {
    groupedCategories: Array<{ groupId: AdminCategoryGroupId; groupLabel: string; categories: AdminCategory[] }>;
    expandedGroups: Record<string, boolean>;
    onToggleGroup: (groupId: AdminCategoryGroupId) => void;
    activeTab: string;
    draggedCatId: string | null;
    onSelectCategory: (categoryId: string) => void;
    onDragStart: (id: string, e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (targetId: string, e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    getItemCount: (categoryId: string) => number;
    language: 'en' | 'mt';
    setLanguage: (lang: 'en' | 'mt') => void;
    mode: 'standard' | 'arabised';
    setMode: (mode: 'standard' | 'arabised') => void;
    t: (english: string, maltese: string) => string;
    term: (text: string) => string;
}

export function AdminSettingsSidebar({
    groupedCategories,
    expandedGroups,
    onToggleGroup,
    activeTab,
    draggedCatId,
    onSelectCategory,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    getItemCount,
    language,
    setLanguage,
    mode,
    setMode,
    t,
    term,
}: AdminSettingsSidebarProps) {
    return (
        <aside className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-black/5 p-3 shadow-sm">
                <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest px-2 mb-3">Categories</h3>

                <div className="space-y-2">
                    {groupedCategories.map((group) => {
                        const isOpen = expandedGroups[group.groupId] ?? true;
                        return (
                            <section key={group.groupId} className="rounded-xl border border-black/5 bg-slate-50/60">
                                <button
                                    type="button"
                                    onClick={() => onToggleGroup(group.groupId)}
                                    className="w-full px-2.5 py-2 flex items-center justify-between text-[10px] font-black tracking-wider uppercase text-black/45"
                                >
                                    <span>{group.groupLabel}</span>
                                    <ChevronDown size={12} className={cn('transition-transform', isOpen ? 'rotate-180' : '')} />
                                </button>

                                {isOpen && (
                                    <div className="px-2 pb-2 space-y-1">
                                        {group.categories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                draggable
                                                onDragStart={(e) => onDragStart(cat.id, e)}
                                                onDragOver={onDragOver}
                                                onDrop={(e) => onDrop(cat.id, e)}
                                                onDragEnd={onDragEnd}
                                                className={cn(
                                                    'flex items-center gap-1 w-full text-left px-2 py-1.5 rounded-lg text-sm font-semibold transition-all group cursor-pointer',
                                                    activeTab === cat.id
                                                        ? 'bg-white text-[#1034A6] shadow-sm border border-[#1034A6]/15'
                                                        : 'text-black/45 hover:text-black/70 hover:bg-white',
                                                    draggedCatId === cat.id ? 'opacity-50 border-dashed border-2 bg-transparent' : '',
                                                    draggedCatId && draggedCatId !== cat.id ? 'border-t-2 border-t-transparent hover:border-t-[#1034A6]/20' : '',
                                                )}
                                                onClick={() => onSelectCategory(cat.id)}
                                            >
                                                <GripVertical size={14} className="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab active:cursor-grabbing text-black" />
                                                <span className="flex items-center gap-2 flex-1 min-w-0">
                                                    <cat.icon size={16} className={cn('shrink-0 transition-colors', activeTab === cat.id ? 'text-[#1034A6]' : 'text-black/25 group-hover:text-black/40')} />
                                                    <span className="truncate">{t(cat.label, term(cat.label))}</span>
                                                </span>
                                                <span className="text-[10px] bg-black/5 px-1.5 rounded opacity-60 group-hover:opacity-100">
                                                    {getItemCount(cat.id)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            </div>

            <div className="px-4 py-3 bg-white rounded-2xl border border-black/5 space-y-4 shadow-sm">
                <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Interface View</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-black/60 flex items-center gap-2">
                            <Languages size={14} /> Language
                        </span>
                        <div className="flex bg-black/5 p-0.5 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={cn('px-2 py-1 text-[10px] font-bold rounded-md transition-all', language === 'en' ? 'bg-white text-[#1034A6] shadow-sm' : 'text-black/40')}
                            >
                                EN
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage('mt')}
                                className={cn('px-2 py-1 text-[10px] font-bold rounded-md transition-all', language === 'mt' ? 'bg-white text-[#1034A6] shadow-sm' : 'text-black/40')}
                            >
                                MT
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-black/60 flex items-center gap-2">
                            <Braces size={14} /> Mode
                        </span>
                        <div className="flex bg-black/5 p-0.5 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setMode('standard')}
                                className={cn('px-2 py-1 text-[10px] font-bold rounded-md transition-all', mode === 'standard' ? 'bg-white text-[#1034A6] shadow-sm' : 'text-black/40')}
                            >
                                CV
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('arabised')}
                                className={cn('px-2 py-1 text-[10px] font-bold rounded-md transition-all', mode === 'arabised' ? 'bg-white text-[#1034A6] shadow-sm' : 'text-black/40')}
                            >
                                وزن
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
