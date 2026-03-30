import { Edit2, Search, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { ConfigItem } from '@/lib/adminConfig';
import type { AdminCategory } from '@/lib/adminCategoryRegistry';
import { getPatternMetadataSummary } from '@/lib/patternBuckets';
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
    const summary = getPatternMetadataSummary(value);

    return (
        <Card className="group relative overflow-hidden p-3.5 border-border-light transition-all hover:border-[#1034A6]/30 hover:shadow-xl hover:shadow-[#1034A6]/5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1034A6]/75 via-[#1034A6]/20 to-transparent" />
            <div className="flex items-start justify-between gap-2.5">
                <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center rounded-full border border-[#1034A6]/10 bg-[#1034A6]/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#1034A6]">
                            Pattern
                        </span>
                        <MetaChip label="Bucket" value={summary.bucketLabel} tone="accent" compact />
                        {!!summary.role && <MetaChip label="Role" value={summary.role.replace(/_/g, ' ')} tone="neutral" />}
                        {!!summary.gender && (
                            <span className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold',
                                summary.gender === 'feminine' ? 'bg-pink-50 border-pink-100 text-pink-700' :
                                    summary.gender === 'masculine' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-700',
                            )}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-black/30">Gender</span>
                                <span>{summary.gender}</span>
                            </span>
                        )}
                    </div>

                    <h3 className="font-bold text-[17px] text-black uppercase tracking-tight">{item.key}</h3>

                    <div className="flex flex-wrap gap-1.5">
                        <MetaChip label="CV" value={String(value.cv || '-')} tone="accent" mono compact />
                        <MetaChip label="Wizen" value={String(value.wizen || '-')} tone="neutral" compact />
                        {value.stress ? <MetaChip label="Stress" value={String(value.stress)} tone="neutral" /> : null}
                        {summary.posTypes.length > 0 ? (
                            <MetaChip
                                label="POS"
                                value={summary.posTypes.slice(0, 3).map(pos => pos.toUpperCase()).join(' • ')}
                                tone="neutral"
                            />
                        ) : null}
                    </div>

                    {!!value.description && (
                        <p className="pt-1.5 border-t border-black/5 text-xs text-black/55 leading-relaxed line-clamp-2">
                            {String(value.description)}
                        </p>
                    )}
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

function MetaChip({
    label,
    value,
    tone,
    mono = false,
    compact = false,
}: {
    label: string;
    value: string;
    tone: 'accent' | 'neutral';
    mono?: boolean;
    compact?: boolean;
}) {
    return (
        <div className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border text-xs font-semibold',
            compact ? 'px-2 py-0.5' : 'px-2.5 py-1',
            tone === 'accent' ? 'bg-[#1034A6]/5 border-[#1034A6]/10 text-[#1034A6]' : 'bg-black/5 border-black/5 text-black/80',
        )}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/30">{label}</span>
            <span className={cn(mono && 'font-mono')}>{value}</span>
        </div>
    );
}
