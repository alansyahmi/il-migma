import { useState, useRef, useEffect } from 'react';
import { useAdminConfig, type ConfigItem } from '@/lib/adminConfig';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Plus, Trash2, Edit2, RotateCcw, Save, Settings, HelpCircle, Keyboard, GripVertical, Languages, Braces, Search, Filter, Info, Tag } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';

import { TERMINOLOGY } from '@/lib/terminology';
import { CATEGORIES, getCategoryById } from '@/lib/adminCategoryRegistry';
import { Download, Upload, CheckCircle2, XCircle } from 'lucide-react';

export function AdminSettings() {
    const { config, loading, getCategoryItems, deleteItem, createItem, updateItem, refresh } = useAdminConfig();
    const [activeTab, setActiveTab] = useState('pos');
    const [editItem, setEditItem] = useState<ConfigItem | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [posFilter, setPosFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const { language, setLanguage, t } = useLanguage();
    const { mode, setMode, term } = useLinguisticMode();
    const { user } = useUser();
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success?: number, errors?: string[] } | null>(null);

    const summarizeRawError = (raw: string): string => {
        const trimmed = raw?.trim() || '';
        if (!trimmed) return '';
        const lower = trimmed.toLowerCase();
        if (!lower.startsWith('<!doctype html') && !lower.startsWith('<html')) {
            return trimmed;
        }
        try {
            const doc = new DOMParser().parseFromString(trimmed, 'text/html');
            const msgNode = doc.querySelector('#error-message span:last-child');
            const titleNode = doc.querySelector('#error-title');
            const text = msgNode?.textContent?.trim() || titleNode?.textContent?.trim() || '';
            return text ? `Server HTML error: ${text}` : 'Server returned an HTML error page (see dev API logs).';
        } catch {
            return 'Server returned an HTML error page (see dev API logs).';
        }
    };

    const buildErrorLines = (data: any, raw: string, fallback: string): string[] => {
        const lines: string[] = [];
        if (data?.error) lines.push(String(data.error));
        else if (raw?.trim()) lines.push(summarizeRawError(raw));
        else lines.push(fallback);
        if (data?.code) lines.push(`Code: ${data.code}`);
        if (data?.upstream_status) lines.push(`Upstream status: ${data.upstream_status}`);
        if (data?.hint) lines.push(`Hint: ${data.hint}`);
        return lines;
    };

    // Reordering state
    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
    const [draggedCatId, setDraggedCatId] = useState<string | null>(null);

    // Load initial order from Clerk metadata
    useEffect(() => {
        if (user?.unsafeMetadata?.adminCategoryOrder) {
            setCategoryOrder(user.unsafeMetadata.adminCategoryOrder as string[]);
        } else {
            setCategoryOrder(CATEGORIES.map(c => c.id));
        }
    }, [user?.id]);

    const sortedCategories = [...CATEGORIES].sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.id);
        const indexB = categoryOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const handleDragStart = (id: string, e: React.DragEvent) => {
        setDraggedCatId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a class to the dragged element itself for visual feedback if desired
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (targetId: string, e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedCatId || draggedCatId === targetId) return;

        const newOrder = [...categoryOrder];
        const oldIndex = newOrder.indexOf(draggedCatId);
        const newIndex = newOrder.indexOf(targetId);

        // Remove from old pos
        newOrder.splice(oldIndex, 1);
        // Insert at new pos
        newOrder.splice(newIndex, 0, draggedCatId);

        setCategoryOrder(newOrder);

        // Save to Clerk asynchronously
        if (user) {
            try {
                await user.update({
                    unsafeMetadata: {
                        ...user.unsafeMetadata,
                        adminCategoryOrder: newOrder
                    }
                });
            } catch (err) {
                console.error('Failed to save category order:', err);
            }
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedCatId(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const currentItems = getCategoryItems(activeTab);

    if (loading && config.length === 0) {
        return <div className="flex justify-center py-20"><Spinner /></div>;
    }

    const handleDelete = async (id: string, key: string) => {
        if (!confirm(`Are you sure you want to delete "${key}"?`)) return;
        try {
            await deleteItem(id);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleExportTerminology = async () => {
        setSyncLoading(true);
        try {
            const token = await (window as any).Clerk?.session?.getToken();
            const res = await fetch('/api/admin/sync-terminology', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const raw = await res.text();
            let data: any = null;
            try {
                data = JSON.parse(raw);
            } catch {
                data = null;
            }

            if (!res.ok || data?.error) {
                const lines = buildErrorLines(data, raw, 'Export failed');
                throw new Error(lines.join('\n'));
            }

            if (!data?.terminology || typeof data.terminology !== 'object') {
                throw new Error('Export response did not include a valid terminology object');
            }

            // Create TS snippet
            const tsSnippet = `export const TERMINOLOGY: Record<string, { en?: string; standard: string; arabised: string }> = ${JSON.stringify(data.terminology, null, 4)};`;
            
            const blob = new Blob([tsSnippet], { type: 'text/typescript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'terminology_export.ts';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            alert('Export failed: ' + e.message);
        } finally {
            setSyncLoading(false);
        }
    };

    const handleImportTerminology = async () => {
        if (!confirm('This will upsert labels from the in-code TERMINOLOGY into the database. Existing database labels for these keys will be overwritten. Proceed?')) return;
        
        setSyncLoading(true);
        setSyncResult(null);
        try {
            const token = await (window as any).Clerk?.session?.getToken();
            const res = await fetch('/api/admin/sync-terminology', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ terminology: TERMINOLOGY })
            });
            const raw = await res.text();
            let data: any = null;
            try {
                data = JSON.parse(raw);
            } catch {
                data = null;
            }

            if (!res.ok) {
                throw new Error(buildErrorLines(data, raw, 'Import failed').join('\n'));
            }

            if (!data) {
                throw new Error('Import response was not JSON');
            }

            if (data.error) {
                throw new Error(buildErrorLines(data, raw, 'Import failed').join('\n'));
            }

            const upserted = data.upserted || 0;
            const errors = Array.isArray(data.errors) ? data.errors : [];
            if (upserted === 0 && errors.length === 0) {
                throw new Error('Import returned 0 upserted rows. Check API connectivity and terminology payload.');
            }

            setSyncResult({ success: upserted, errors });
            
            if (data.upserted > 0) {
                await refresh();
            }
        } catch (e: any) {
            const msg = String(e?.message || 'Import failed');
            setSyncResult({ errors: msg.split('\n').map(s => s.trim()).filter(Boolean) });
        } finally {
            setSyncLoading(false);
        }
    };

    const handleSyncPatterns = async () => {
        if (!confirm('This will scan all dictionary entries and add any new patterns to the registry. Proceed?')) return;
        
        setSyncLoading(true);
        setSyncResult(null);
        try {
            const token = await (window as any).Clerk?.session?.getToken();
            const res = await fetch('/api/admin/migrate-patterns', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'sync-from-entries', commit: true })
            });
            const raw = await res.text();
            let data: any = null;
            try {
                data = JSON.parse(raw);
            } catch {
                data = null;
            }

            if (!res.ok) {
                throw new Error(buildErrorLines(data, raw, 'Sync failed').join('\n'));
            }

            if (!data) {
                throw new Error('Sync response was not JSON');
            }

            if (data.error) {
                throw new Error(buildErrorLines(data, raw, 'Sync failed').join('\n'));
            }

            const added = Number(data.added || 0);
            const errors = Array.isArray(data.errors) ? data.errors.map((e: unknown) => String(e)) : [];
            const skipped = Number(data.skipped || 0);

            if (errors.length > 0 && added === 0) {
                throw new Error(errors.join('\n'));
            }

            setSyncResult({ success: added, errors });
            if (added > 0 || skipped > 0) {
                refresh();
            }
        } catch (e: any) {
            const msg = String(e?.message || 'Sync failed');
            setSyncResult({ errors: msg.split('\n').map(s => s.trim()).filter(Boolean) });
        } finally {
            setSyncLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar Tabs */}
            <div className="md:col-span-1 space-y-1">
                <div className="mb-4 pb-4 border-b border-black/5">
                    <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest px-4 mb-2">Categories</h3>
                    {sortedCategories.map(cat => (
                        <div
                            key={cat.id}
                            draggable
                            onDragStart={(e) => handleDragStart(cat.id, e)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(cat.id, e)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "flex items-center gap-1 w-full text-left px-2 py-1.5 rounded-xl text-sm font-semibold transition-all group mb-1 cursor-pointer",
                                activeTab === cat.id
                                    ? "bg-white text-[#1034A6] shadow-md shadow-[#1034A6]/5 border border-[#1034A6]/10"
                                    : "text-black/40 hover:text-black/60 hover:bg-black/5",
                                draggedCatId === cat.id ? "opacity-50 border-dashed border-2 bg-transparent" : "",
                                draggedCatId && draggedCatId !== cat.id ? "border-t-2 border-t-transparent hover:border-t-[#1034A6]/30" : ""
                            )}
                            onClick={() => setActiveTab(cat.id)}
                        >
                            <GripVertical size={14} className="opacity-0 group-hover:opacity-40 hover:opacity-100! transition-opacity cursor-grab active:cursor-grabbing text-black" />
                            <span className="flex items-center gap-2 flex-1">
                                <cat.icon size={16} className={cn("transition-colors", activeTab === cat.id ? "text-[#1034A6]" : "text-black/20 group-hover:text-black/40")} />
                                {t(cat.label, term(cat.label))}
                            </span>
                            <span className="text-[10px] bg-black/5 px-1.5 rounded opacity-50 group-hover:opacity-100 mr-2">
                                {getCategoryItems(cat.id).length}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-3 bg-white/50 rounded-2xl border border-black/5 space-y-4">
                    <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Interface View</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-black/60 flex items-center gap-2">
                                <Languages size={14} /> Language
                            </span>
                            <div className="flex bg-black/5 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", language === 'en' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => setLanguage('mt')}
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", language === 'mt' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
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
                                    onClick={() => setMode('standard')}
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", mode === 'standard' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                                >
                                    CV
                                </button>
                                <button
                                    onClick={() => setMode('arabised')}
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", mode === 'arabised' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                                >
                                    وزن
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3 space-y-4">
                <div className="flex items-center gap-2 mb-8">
                    <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                        <Settings className="text-[#1034A6]" size={24} /> Admin Settings
                    </h2>
                    {import.meta.env.DEV && (
                        <div className="ml-auto bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3 max-w-md">
                            <HelpCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                            <div className="text-xs text-blue-800 leading-relaxed">
                                <p className="font-bold mb-1">Development Tip: Sync to Code</p>
                                <p>To persist these changes in the source code, update <code className="bg-blue-100 px-1 rounded">src/lib/terminology.ts</code> manually. This ensures your settings survive database resets and deployments.</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-black flex items-center gap-2">
                        {CATEGORIES.find(c => c.id === activeTab)?.label}
                    </h2>
                    <div className="flex items-center gap-2">
                        {activeTab === 'ui_terminology' && (
                            <div className="flex gap-2 mr-4">
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={handleExportTerminology}
                                    disabled={syncLoading}
                                    leftIcon={syncLoading ? <RotateCcw className="animate-spin" size={14} /> : <Download size={14} />}
                                >
                                    Export to TS
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={handleImportTerminology}
                                    disabled={syncLoading}
                                    leftIcon={syncLoading ? <RotateCcw className="animate-spin" size={14} /> : <Upload size={14} />}
                                >
                                    Import from Source
                                </Button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-white border border-black/10 rounded-lg px-2 py-1 shadow-sm">
                            <Search size={14} className="text-black/30" />
                            <input 
                                type="text"
                                placeholder="Search items..."
                                className="bg-transparent border-none text-xs focus:outline-none w-32 focus:w-48 transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {getCategoryById(activeTab)?.editorType === 'pattern' && (
                            <select
                                className="bg-white border border-black/10 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                                value={roleFilter}
                                onChange={e => setRoleFilter(e.target.value)}
                            >
                                <option value="all">Any Role</option>
                                <option value="broken_plural">Broken Plural</option>
                                <option value="sound_plural">Sound Plural</option>
                                <option value="feminine_singular">Feminine Singular</option>
                                <option value="diminutive">Diminutive</option>
                                <option value="elative">Elative</option>
                                <option value="verbal_noun">Verbal Noun</option>
                            </select>
                        )}
                        {getCategoryById(activeTab)?.hasPosFilter && (
                            <select
                                className="bg-white border border-black/10 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                                value={posFilter}
                                onChange={e => setPosFilter(e.target.value)}
                            >
                                <option value="all">All POS</option>
                                {getCategoryItems('pos').map(p => (
                                    <option key={p.key} value={p.key}>{p.key.toUpperCase()}</option>
                                ))}
                            </select>
                        )}
                        {getCategoryById(activeTab)?.editorType === 'pattern' && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleSyncPatterns}
                                disabled={syncLoading}
                                leftIcon={<RotateCcw className={cn(syncLoading && "animate-spin")} size={14} />}
                                className="mr-2"
                            >
                                Sync from Entries
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={refresh}
                            disabled={loading || syncLoading}
                            leftIcon={<RotateCcw className={cn((loading || syncLoading) && "animate-spin")} size={14} />}
                        >
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => setShowAdd(true)} leftIcon={<Plus size={14} />}>Add New</Button>
                    </div>
                </div>

                {syncResult && (
                    <div className={cn(
                        "p-4 rounded-xl border flex items-start gap-3 mb-4",
                        syncResult.errors?.length ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
                    )}>
                        {syncResult.errors?.length ? <XCircle className="text-amber-600 shrink-0" /> : <CheckCircle2 className="text-green-600 shrink-0" />}
                        <div className="text-xs">
                            <p className={syncResult.errors?.length ? "text-amber-800 font-bold" : "text-green-800 font-bold"}>
                                {syncResult.errors?.length ? "Synchronization failed." : `${syncResult.success || 0} items synchronized successfully.`}
                            </p>
                            {syncResult.errors?.map((err, i) => (
                                <p key={i} className="text-amber-700 mt-1">• {err}</p>
                            ))}
                        </div>
                        <button onClick={() => setSyncResult(null)} className="ml-auto text-black/20 hover:text-black/40">✕</button>
                    </div>
                )}

                <div className="grid gap-3">
                    {(() => {
                        let items = currentItems;
                        
                        // 1. Search filter
                        if (searchTerm.trim()) {
                            const s = searchTerm.toLowerCase();
                            items = items.filter(item => {
                                const val = item.value as any;
                                return item.key.toLowerCase().includes(s) || 
                                       val.description?.toLowerCase().includes(s) ||
                                       val.cv?.toLowerCase().includes(s) ||
                                       val.wizen?.toLowerCase().includes(s);
                            });
                        }

                        // 2. Role filter (for patterns)
                        if (roleFilter !== 'all' && getCategoryById(activeTab)?.editorType === 'pattern') {
                            items = items.filter(item => {
                                const val = item.value as any;
                                return val.linguistic_role === roleFilter;
                            });
                        }

                        // 3. POS filter
                        if (posFilter !== 'all' && getCategoryById(activeTab)?.hasPosFilter) {
                            items = items.filter(item => {
                                const val = item.value as any;
                                return val.pos_types?.includes(posFilter);
                            });
                        }

                        if (items.length === 0) {
                            return (
                                <div className="text-center py-12 bg-white/50 rounded-2xl border-2 border-dashed border-black/5">
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <Search size={48} />
                                        <p className="font-bold uppercase tracking-widest text-[10px]">No matches found</p>
                                    </div>
                                </div>
                            );
                        }

                        return items.map(item => {
                            const isPattern = getCategoryById(activeTab)?.editorType === 'pattern';
                            const val = item.value as any;

                            if (isPattern) {
                                return (
                                    <Card key={item.id} className="p-4 border-border-light hover:border-[#1034A6]/30 transition-all group hover:shadow-xl hover:shadow-[#1034A6]/5">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-bold text-xl text-black uppercase tracking-tight">
                                                        {item.key}
                                                    </h3>
                                                    {val.linguistic_role && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1034A6]/10 text-[#1034A6] flex items-center gap-1">
                                                            <Filter size={10} /> {val.linguistic_role.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                    {val.gender && (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                                                            val.gender === 'feminine' ? "bg-pink-100 text-pink-700" : 
                                                            val.gender === 'masculine' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                                                        )}>
                                                            <Tag size={10} /> {val.gender}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-xs font-semibold">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 rounded-lg border border-black/5">
                                                        <span className="text-black/30 text-[10px] font-bold uppercase">CV</span>
                                                        <span className="font-mono text-[#1034A6]">{val.cv || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 rounded-lg border border-black/5">
                                                        <span className="text-black/30 text-[10px] font-bold uppercase">Wiżen</span>
                                                        <span className="text-black">{val.wizen || '-'}</span>
                                                    </div>
                                                    {val.stress && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 rounded-lg border border-black/5">
                                                            <span className="text-black/30 text-[10px] font-bold uppercase">Stress</span>
                                                            <span className="text-black">{val.stress}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {val.description && (
                                                    <p className="text-xs text-black/60 leading-relaxed flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        <Info size={14} className="text-[#1034A6] shrink-0 mt-0.5" />
                                                        {val.description}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {val.pos_types?.map((p: string) => (
                                                        <span key={p} className="text-[9px] font-black uppercase text-black/30 border border-black/10 px-1.5 rounded bg-white">
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                                <button onClick={() => setEditItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(item.id, item.key)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            }

                            // Default card for other categories
                            return (
                                <Card key={item.id} className="p-4 border-border-light hover:border-[#1034A6]/30 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-lg text-black uppercase tracking-tight">
                                                {item.key}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs font-medium text-black/50 italic mb-1">
                                                {(() => {
                                                    if (typeof item.value === 'object' && item.value !== null) {
                                                        const v = item.value as any;
                                                        if ('mt_standard' in v || 'mt_arabised' in v) {
                                                            return (
                                                                <>
                                                                    <span>{v.mt_standard || '-'}</span>
                                                                    <span className="opacity-30">/</span>
                                                                    <span>{v.mt_arabised || '-'}</span>
                                                                </>
                                                            );
                                                        }
                                                        if ('cv' in v || 'wizen' in v) {
                                                            return (
                                                                <>
                                                                    <span className="font-mono">{v.cv || '-'}</span>
                                                                    <span className="opacity-30">/</span>
                                                                    <span>{v.wizen || '-'}</span>
                                                                </>
                                                            );
                                                        }
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <div className="text-xs font-mono text-black/40 bg-black/5 inline-block px-1.5 py-0.5 rounded">
                                                {typeof item.value === 'object' && item.value !== null ? (
                                                    <div className="flex gap-2">
                                                        {Object.entries(item.value).map(([vk, vv]) => (
                                                            <span key={vk} className="first:border-l-0 border-l border-black/10 pl-2">{vk}: {Array.isArray(vv) ? vv.join(', ') : String(vv)}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <span className="border-l border-black/10 pl-2">Value: {String(item.value)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(item.id, item.key)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        });
                    })()}
                </div >
            </div >

            {/* Modals */}
            {
                (showAdd || editItem) && (
                    <ConfigFormModal
                        item={editItem}
                        category={activeTab}
                        onClose={() => { setShowAdd(false); setEditItem(null); }}
                        onSave={async (val) => {
                            if (editItem) {
                                await updateItem({ ...editItem, ...val });
                            } else {
                                let saveCategory = activeTab;
                                await createItem({ category: saveCategory, ...val });
                            }
                            setShowAdd(false);
                            setEditItem(null);
                        }}
                    />
                )
            }
        </div >
    );
}

function ConfigFormModal({ item, category, onClose, onSave }: {
    item: ConfigItem | null;
    category: string;
    onClose: () => void;
    onSave: (val: any) => Promise<void>;
}) {
    const [key, setKey] = useState(item?.key ?? '');
    const [value, setValue] = useState<any>(() => {
        if (item) return item.value;
        const reg = getCategoryById(category);
        return reg ? reg.defaultValueFactory() : { en: '', mt_standard: '', mt_arabised: '' };
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [kbOpen, setKbOpen] = useState(false);
    const [activeInput, setActiveInput] = useState<'key' | 'cv' | 'wizen' | null>(null);
    const activeInputRef = useRef<HTMLInputElement | null>(null);
    const kbTriggerRef = useRef<HTMLButtonElement>(null);

    const insertChar = (char: string) => {
        const el = activeInputRef.current;
        if (!el) return;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const val = el.value;

        const nextVal = val.substring(0, start) + char + val.substring(end);
        if (activeInput === 'key') setKey(nextVal);
        else if (activeInput === 'cv' || activeInput === 'wizen') {
            setValue({ ...value, [activeInput]: nextVal });
        }

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + char.length, start + char.length);
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return setError('Key is required');
        setSaving(true);
        try {
            await onSave({ key, value });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const activeReg = getCategoryById(category);
    const isComplex = activeReg?.editorType !== 'simple_label';
    const { getValues } = useAdminConfig();
    const POS_OPTIONS = getValues('pos');

    const inp = "w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black";
    const labelStyle = "block text-xs font-bold text-black/40 uppercase tracking-widest mb-1.5";

    return (
        <Modal open onClose={onClose} title={item ? `Edit Item` : `Add New ${category}`} size={isComplex ? 'lg' : 'md'}>
            <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 max-h-[85vh] overflow-hidden">
                {error && <div className="px-6 py-3"><div className="bg-red-50 text-red-800 p-3 rounded-xl text-sm border border-red-100">{error}</div></div>}

                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className={labelStyle}>In-code ID / Key</label>
                            <div className="relative">
                                <input className={inp} value={key} onChange={e => setKey(e.target.value)} onFocus={(e) => { setActiveInput('key'); activeInputRef.current = e.target; }} placeholder="e.g. noun, transitive, I..." />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-black/5">
                        <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-tighter">Translations / Display Labels</h4>
                        <div>
                            <label className={labelStyle}>English Label {category === 'verb_preset' ? '(Form Name)' : ''}</label>
                            <input className={inp} value={typeof value === 'object' ? (value.en || '') : value} onChange={e => {
                                if (typeof value === 'object') setValue({ ...value, en: e.target.value });
                                else setValue({ en: e.target.value, mt_standard: '', mt_arabised: '' });
                            }} placeholder={category === 'verb_preset' ? "e.g. Form I" : "English display name..."} />
                        </div>
                        {/* Only show these for non-pattern items to avoid redundancy */}
                        {activeReg?.editorType !== 'pattern' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyle}>Maltese (CV / Standard) {category === 'verb_preset' ? '(Form Name)' : ''}</label>
                                    <input className={inp} value={typeof value === 'object' ? (value.mt_standard || '') : ''} onChange={e => {
                                        if (typeof value === 'object') setValue({ ...value, mt_standard: e.target.value });
                                        else setValue({ en: '', mt_standard: e.target.value, mt_arabised: '' });
                                    }} placeholder={category === 'verb_preset' ? "e.g. Forma I" : "Standard Maltese label..."} />
                                </div>
                                <div>
                                    <label className={labelStyle}>Maltese (Wiżen / Arabised) {category === 'verb_preset' ? '(Form Name)' : ''}</label>
                                    <input className={inp} value={typeof value === 'object' ? (value.mt_arabised || '') : ''} onChange={e => {
                                        if (typeof value === 'object') setValue({ ...value, mt_arabised: e.target.value });
                                        else setValue({ en: '', mt_standard: '', mt_arabised: e.target.value });
                                    }} placeholder={category === 'verb_preset' ? "e.g. Forma I" : "Arabised Maltese label..."} />
                                </div>
                            </div>
                        )}
                    </div>

                    {isComplex && (
                        <div className="pt-4 border-t border-black/5 space-y-4">
                            <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-tighter">Specific Configuration</h4>
                            {activeReg?.editorType === 'verb_preset' ? (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    {['perfect', 'passive', 'active', 'verbal'].map(form => (
                                        <div key={form} className="space-y-2 border-l-2 border-slate-100 pl-3">
                                            <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">{form}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="relative">
                                                    <label className="text-[10px] text-black/50 block mb-1">Standard (CV)</label>
                                                    <input className={inp} value={value[form]?.cv} onChange={e => setValue({ ...value, [form]: { ...value[form], cv: e.target.value } })} placeholder="CV notation" />
                                                </div>
                                                <div className="relative">
                                                    <label className="text-[10px] text-black/50 block mb-1">Arabised (Wiżen)</label>
                                                    <input className={inp} value={value[form]?.wizen} onChange={e => setValue({ ...value, [form]: { ...value[form], wizen: e.target.value } })} placeholder="Wizen name" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className={labelStyle}>Maltese (CV / Standard) <span className="text-black/30 normal-case font-normal">(v = short, V = long vowel)</span></label>
                                            <input className={inp} value={value.cv} onChange={e => setValue({ ...value, cv: e.target.value })} onFocus={(e) => { setActiveInput('cv'); activeInputRef.current = e.target; }} placeholder="e.g. CvCVC  (V = long vowel)" />
                                        </div>
                                        <div className="relative">
                                            <label className={labelStyle}>Maltese (Wiżen / Arabised)</label>
                                            <input className={inp} value={value.wizen} onChange={e => setValue({ ...value, wizen: e.target.value })} onFocus={(e) => { setActiveInput('wizen'); activeInputRef.current = e.target; }} placeholder="e.g. fagħal" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className={labelStyle}>Stress (syllable from end)</label>
                                            <input className={inp} type="number" min={1} max={5} value={value.stress ?? 2} onChange={e => setValue({ ...value, stress: parseInt(e.target.value) || 2 })} placeholder="2 = penultimate" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-black/5">
                                        <div>
                                            <label htmlFor="pattern-description" className={labelStyle}>Linguistic Description / Role Notes</label>
                                            <textarea 
                                                id="pattern-description"
                                                className={cn(inp, "resize-none h-20")} 
                                                value={value.description || ''} 
                                                onChange={e => setValue({ ...value, description: e.target.value })} 
                                                placeholder="e.g. Used for Quadriliteral broken plurals with long penult..." 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="pattern-role" className={labelStyle}>Explicit Linguistic Role</label>
                                            <select 
                                                id="pattern-role"
                                                className={inp} 
                                                value={value.linguistic_role || ''} 
                                                onChange={e => setValue({ ...value, linguistic_role: e.target.value })}
                                            >
                                                <option value="">-- None / General --</option>
                                                <option value="masculine_singular">Masculine Singular</option>
                                                <option value="feminine_singular">Feminine Singular</option>
                                                <option value="broken_plural">Broken Plural</option>
                                                <option value="sound_plural">Sound Plural</option>
                                                <option value="dual">Dual</option>
                                                <option value="diminutive">Diminutive</option>
                                                <option value="elative_masc">Elative (Masc)</option>
                                                <option value="elative_fem">Elative (Fem)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="pattern-gender" className={labelStyle}>Target Gender</label>
                                            <select 
                                                id="pattern-gender"
                                                className={inp} 
                                                value={value.gender || ''} 
                                                onChange={e => setValue({ ...value, gender: e.target.value })}
                                            >
                                                <option value="">-- Any --</option>
                                                <option value="masculine">Masculine</option>
                                                <option value="feminine">Feminine</option>
                                                <option value="neutral">Neutral</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex justify-start">
                                        <button
                                            ref={kbTriggerRef}
                                            type="button"
                                            onClick={() => setKbOpen(!kbOpen)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all",
                                                kbOpen ? "bg-[#1034A6] text-white border-[#1034A6]" : "bg-white text-black/40 border-black/10 hover:border-black/20"
                                            )}
                                        >
                                            <Keyboard size={12} /> {kbOpen ? 'Close Keyboard' : 'Open Keyboard'}
                                        </button>
                                        <div className="relative">
                                            <MalteseCharPicker open={kbOpen} onOpenChange={setKbOpen} onInsert={insertChar} triggerRef={kbTriggerRef} />
                                        </div>
                                    </div>

                                    {activeReg?.hasPosFilter && (
                                        <div>
                                            <label className={labelStyle}>Apply to POS</label>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {POS_OPTIONS.map(p => {
                                                    const isSelected = (value.pos_types || []).includes(p);
                                                    return (
                                                        <button
                                                            key={p}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = value.pos_types || [];
                                                                const next = isSelected ? current.filter((x: string) => x !== p) : [...current, p];
                                                                setValue({ ...value, pos_types: next });
                                                            }}
                                                            className={cn(
                                                                "px-3 py-1 text-[10px] font-bold rounded-lg border transition-all",
                                                                isSelected ? "bg-[#1034A6] text-white border-[#1034A6]" : "bg-white text-black/40 border-black/10 hover:border-black/20"
                                                            )}
                                                        >
                                                            {p.toUpperCase()}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 z-20 shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-black/5 bg-slate-50/95 rounded-b-2xl backdrop-blur-sm">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving} leftIcon={saving ? <RotateCcw className="animate-spin" size={14} /> : <Save size={14} />}>
                        {saving ? 'Saving...' : 'Save Config'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
