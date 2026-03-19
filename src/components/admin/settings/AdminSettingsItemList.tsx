import { Edit2, Filter, Info, Search, Tag, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ConfigItem } from '@/lib/adminConfig';
import type { AdminCategory } from '@/lib/adminCategoryRegistry';
import { cn } from '@/lib/utils';

interface AdminSettingsItemListProps {
    items: ConfigItem[];
    activeCategory: AdminCategory | null;
    onEdit: (item: ConfigItem) => void;
    onDelete: (id: string, key: string) => void;
}

export function AdminSettingsItemList({ items, activeCategory, onEdit, onDelete }: AdminSettingsItemListProps) {
    if (items.length === 0) {
        return (
            <div className="text-center py-12 bg-white/60 rounded-2xl border-2 border-dashed border-black/5">
                <div className="flex flex-col items-center gap-2 opacity-20">
                    <Search size={48} />
                    <p className="font-bold uppercase tracking-widest text-[10px]">No matches found</p>
                </div>
            </div>
        );
    }

    const isPattern = activeCategory?.editorType === 'pattern';

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {items.map((item) => (
                isPattern ? (
                    <PatternCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
                ) : (
                    <DefaultCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
                )
            ))}
        </div>
    );
}

function PatternCard({ item, onEdit, onDelete }: { item: ConfigItem; onEdit: (item: ConfigItem) => void; onDelete: (id: string, key: string) => void }) {
    const value = item.value as Record<string, unknown>;

    return (
        <Card className="p-4 border-border-light hover:border-[#1034A6]/30 transition-all group hover:shadow-xl hover:shadow-[#1034A6]/5">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-xl text-black uppercase tracking-tight">{item.key}</h3>
                        {!!value.linguistic_role && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1034A6]/10 text-[#1034A6] flex items-center gap-1">
                                <Filter size={10} /> {String(value.linguistic_role).replace('_', ' ')}
                            </span>
                        )}
                        {!!value.gender && (
                            <span className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1',
                                value.gender === 'feminine' ? 'bg-pink-100 text-pink-700' :
                                    value.gender === 'masculine' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700',
                            )}>
                                <Tag size={10} /> {String(value.gender)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 rounded-lg border border-black/5">
                            <span className="text-black/30 text-[10px] font-bold uppercase">CV</span>
                            <span className="font-mono text-[#1034A6]">{String(value.cv || '-')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 rounded-lg border border-black/5">
                            <span className="text-black/30 text-[10px] font-bold uppercase">Wizen</span>
                            <span className="text-black">{String(value.wizen || '-')}</span>
                        </div>
                        {!!value.stress && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 rounded-lg border border-black/5">
                                <span className="text-black/30 text-[10px] font-bold uppercase">Stress</span>
                                <span className="text-black">{String(value.stress)}</span>
                            </div>
                        )}
                    </div>

                    {!!value.description && (
                        <p className="text-xs text-black/60 leading-relaxed flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <Info size={14} className="text-[#1034A6] shrink-0 mt-0.5" />
                            {String(value.description)}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                        {Array.isArray(value.pos_types) && value.pos_types.map((pos: string) => (
                            <span key={pos} className="text-[9px] font-black uppercase text-black/30 border border-black/10 px-1.5 rounded bg-white">
                                {pos}
                            </span>
                        ))}
                    </div>
                </div>

                <ActionButtons item={item} onEdit={onEdit} onDelete={onDelete} />
            </div>
        </Card>
    );
}

function DefaultCard({ item, onEdit, onDelete }: { item: ConfigItem; onEdit: (item: ConfigItem) => void; onDelete: (id: string, key: string) => void }) {
    return (
        <Card className="p-4 border-border-light hover:border-[#1034A6]/30 transition-colors group">
            <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-lg text-black uppercase tracking-tight">{item.key}</h3>
                    <div className="flex items-center gap-2 text-xs font-medium text-black/50 italic mb-1">
                        {renderPreview(item.value)}
                    </div>
                    <div className="text-xs font-mono text-black/40 bg-black/5 inline-block px-1.5 py-0.5 rounded max-w-full overflow-x-auto">
                        {renderMeta(item.value)}
                    </div>
                </div>

                <ActionButtons item={item} onEdit={onEdit} onDelete={onDelete} />
            </div>
        </Card>
    );
}

function ActionButtons({ item, onEdit, onDelete }: { item: ConfigItem; onEdit: (item: ConfigItem) => void; onDelete: (id: string, key: string) => void }) {
    return (
        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button type="button" onClick={() => onEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
            <button type="button" onClick={() => onDelete(item.id, item.key)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
        </div>
    );
}

function renderPreview(value: unknown) {
    if (!value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>;

    if ('mt_standard' in v || 'mt_arabised' in v) {
        return (
            <>
                <span>{String(v.mt_standard || '-')}</span>
                <span className="opacity-30">/</span>
                <span>{String(v.mt_arabised || '-')}</span>
            </>
        );
    }

    if ('cv' in v || 'wizen' in v) {
        return (
            <>
                <span className="font-mono">{String(v.cv || '-')}</span>
                <span className="opacity-30">/</span>
                <span>{String(v.wizen || '-')}</span>
            </>
        );
    }

    return null;
}

function renderMeta(value: unknown) {
    if (typeof value === 'object' && value !== null) {
        return (
            <div className="flex gap-2">
                {Object.entries(value).map(([key, item]) => (
                    <span key={key} className="first:border-l-0 border-l border-black/10 pl-2">
                        {key}: {Array.isArray(item) ? item.join(', ') : String(item)}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-2">
            <span className="border-l border-black/10 pl-2">Value: {String(value)}</span>
        </div>
    );
}
