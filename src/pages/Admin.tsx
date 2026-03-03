import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { adminListEntries, adminDeleteEntry, adminListRoots, adminDeleteRoot } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { SearchInput } from '@/components/ui/SearchInput';
import { RootFormModal } from '@/components/admin/RootFormModal';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { useAdminConfig } from '@/lib/adminConfig';
import {
    Plus, Trash2, Edit2, RefreshCw,
    Layers, FileText, CheckCircle, AlertCircle, ShieldAlert,
    Book, Zap, Sparkles, HelpCircle, List, LayoutGrid, Settings,
    Square, CheckSquare, X, Database
} from 'lucide-react';
import { DbTools } from '@/components/admin/DbTools';
import { cn } from '@/lib/utils';

// ── Main Admin Page ───────────────────────────────────────────────────────────

export function Admin() {
    const { tier, isTrueAdmin } = useAuth();
    const { getToken } = useClerkAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get('tab') as 'entries' | 'roots' | 'settings' | 'db') || 'entries';

    const setTab = (t: 'entries' | 'roots' | 'settings' | 'db') => {
        setSearchParams({ tab: t });
    };

    // For development, we allow access but show a warning if not tag as admin
    const hasAdminRights = isTrueAdmin || tier === 'enterprise';

    const { t } = useLanguage();

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {!hasAdminRights && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <ShieldAlert className="shrink-0" size={20} />
                    <div className="text-sm">
                        <span className="font-bold">{t('Attention:', 'Attenzjoni:')}</span> {t('The system does not recognize you as an official Admin in Clerk Metadata. We are letting you in for testing for now.', 'Is-sistema ma tagħrfekx bħala Admin uffiċjali fil-Clerk Metadata. Għalissa qed inħalluk tidħol biex tittestja.')}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-b border-black/5 pb-4">
                <h1 className="font-serif text-3xl font-bold text-black">{t('Admin Dashboard', 'Dashboard tal-Admin')}</h1>
                <div className="flex bg-black/5 p-1 rounded-xl">
                    <button
                        onClick={() => setTab('entries')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                            tab === 'entries' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40 hover:text-black/60"
                        )}
                    >
                        <FileText size={16} /> {t('Entries', 'Entrati')}
                    </button>
                    <button
                        onClick={() => setTab('roots')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                            tab === 'roots' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40 hover:text-black/60"
                        )}
                    >
                        <Layers size={16} /> {t('Roots', 'Għeruq')}
                    </button>
                    <button
                        onClick={() => setTab('settings')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                            tab === 'settings' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40 hover:text-black/60"
                        )}
                    >
                        <Settings size={16} /> {t('Settings', 'Settijiet')}
                    </button>
                    <button
                        onClick={() => setTab('db')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                            tab === 'db' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40 hover:text-black/60"
                        )}
                    >
                        <Database size={16} /> {t('DB Tools', 'Għodda DB')}
                    </button>
                </div>
            </div>

            {tab === 'entries' && <EntryManager />}
            {tab === 'roots' && <RootManager />}
            {tab === 'settings' && <AdminSettings />}
            {tab === 'db' && <DbTools getToken={getToken} />}
        </div>
    );
}

function EntryManager() {
    const { getToken } = useClerkAuth();
    const [entries, setEntries] = useState<AdminEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [selectedPos, setSelectedPos] = useState<string>('all');
    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const PAGE_SIZE = 50;

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === entries.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(entries.map(e => e.id)));
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(`Żgur li trid tħassar ${count} entrati? Din ma tistax tinqaleb.`)) return;
        try {
            const token = await getToken();
            const { adminBulkDeleteEntries } = await import('@/lib/api');
            await adminBulkDeleteEntries(token!, Array.from(selectedIds));
            showToast(`${count} entrati mħassra`);
            setSelectedIds(new Set());
            load();
        } catch (e: any) {
            showToast(e.message, false);
        }
    };

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const data: any = await adminListEntries(token, {
                q: query,
                pos: selectedPos === 'all' ? '' : selectedPos,
                limit: PAGE_SIZE,
                offset: 0,
            });
            setEntries(data.entries ?? []);
            setTotal(data.total ?? 0);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [query, selectedPos, getToken]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id: string, headword: string) => {
        if (!confirm(`TĦASSAR "${headword}"? Din ma tistax tinqaleb.`)) return;
        try {
            const token = await getToken();
            await adminDeleteEntry(token!, id);
            showToast(`"${headword}" imħassra`);
            load();
        } catch (e: any) {
            showToast(e.message, false);
        }
    };

    // Grouping logic for the "All" view
    const groupedEntries = entries.reduce((acc, entry) => {
        const pos = entry.pos || 'unknown';
        if (!acc[pos]) acc[pos] = [];
        acc[pos].push(entry);
        return acc;
    }, {} as Record<string, AdminEntry[]>);

    const posIcons: Record<string, any> = {
        noun: <Book size={16} />,
        verb: <Zap size={16} />,
        adjective: <Sparkles size={16} />,
        default: <HelpCircle size={16} />
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-black/40 uppercase tracking-widest">{total.toLocaleString()} entrati sibt</h2>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-black/5 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                        >
                            <List size={16} />
                        </button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} className={cn(loading && "animate-spin")} />}>Aġġorna</Button>
                    <Button size="sm" onClick={() => { setEditEntry(null); setShowForm(true); }} leftIcon={<Plus size={14} />}>Entrata Ġdida</Button>
                </div>
            </div>

            {toast && (
                <div className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-right-4 duration-300',
                    toast.ok ? 'bg-blue-50 text-blue-800 border-blue-100 border'
                        : 'bg-red-50 text-red-800 border border-red-100'
                )}>
                    {toast.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {toast.msg}
                </div>
            )}

            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <SearchInput value={query} onChange={setQuery} onSubmit={load} placeholder="Fittex entrata..." />

                {/* POS Filter Chips */}
                <div className="flex flex-wrap gap-2 pb-2">
                    <button
                        onClick={() => setSelectedPos('all')}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                            selectedPos === 'all'
                                ? "bg-[#1034A6] text-white border-[#1034A6]"
                                : "bg-white text-black/60 border-black/10 hover:border-black/20"
                        )}
                    >
                        KOLLHA
                    </button>
                    {useAdminConfig().getValues('pos').map((pos: string) => (
                        <button
                            key={pos}
                            onClick={() => setSelectedPos(pos)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-bold transition-all border uppercase tracking-wider",
                                selectedPos === pos
                                    ? "bg-[#1034A6] text-white border-[#1034A6]"
                                    : "bg-white text-black/60 border-black/10 hover:border-black/20"
                            )}
                        >
                            {pos}
                        </button>
                    ))}
                </div>
            </div>

            {loading && entries.length === 0 ? (
                <div className="flex justify-center py-20"><Spinner /></div>
            ) : entries.length === 0 ? (
                <div className="text-center py-20 bg-[#f9f7f3] rounded-3xl border-2 border-dashed border-black/5">
                    <p className="text-black/40 font-serif italic text-lg">Ma sibt l-ebda riżultat...</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {Object.entries(selectedPos === 'all' ? groupedEntries : { [selectedPos]: entries }).map(([pos, posEntries]) => (
                        <div key={pos} className="space-y-4">
                            <div className="flex items-center gap-3 px-1">
                                <div className="p-2 bg-[#1034A6]/5 text-[#1034A6] rounded-lg">
                                    {posIcons[pos] || posIcons.default}
                                </div>
                                <h3 className="text-lg font-bold text-black uppercase tracking-tight">{pos}s</h3>
                                <div className="h-px flex-1 bg-black/5" />
                                <span className="text-xs font-bold text-black/20">{posEntries.length} sibt</span>
                            </div>

                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {posEntries.map(e => (
                                        <div key={e.id} className={cn(
                                            "group bg-white border rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between relative",
                                            selectedIds.has(e.id) ? "border-[#1034A6] ring-1 ring-[#1034A6]/20 bg-[#1034A6]/[0.02]" : "border-[#ede9e1] hover:shadow-xl hover:shadow-[#1034A6]/5"
                                        )}>
                                            <button
                                                onClick={() => toggleSelect(e.id)}
                                                className={cn(
                                                    "absolute top-3 left-3 z-10 p-1 rounded-md transition-all",
                                                    selectedIds.has(e.id) ? "text-[#1034A6] bg-white shadow-sm" : "opacity-0 group-hover:opacity-100 text-black/20 hover:text-black/40 bg-black/5"
                                                )}
                                            >
                                                {selectedIds.has(e.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <Link to={`/entry/${e.id}`} className="group">
                                                            <h4 className="font-serif text-xl font-bold text-[#1034A6] group-hover:scale-105 transition-transform origin-left">{e.headword}</h4>
                                                        </Link>
                                                        {e.root_consonants && (
                                                            <Link to={`/root/${e.root_consonants}`} className="text-xs font-bold text-slate-500 hover:text-[#1034A6] mt-1 inline-block" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                                                                Għerq: {e.root_consonants}
                                                            </Link>
                                                        )}
                                                        <p className="text-[10px] text-black/30 font-mono mt-1">ID: {e.id}</p>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setEditEntry(e); setShowForm(true); }} className="p-1.5 text-[#1034A6] hover:bg-[#1034A6]/10 rounded-lg"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDelete(e.id, e.headword)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-black/60 line-clamp-2 italic">{e.text_en || 'L-ebda definizzjoni...'}</p>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {e.noun_gender && <Badge variant="pos" className="bg-sky-50 text-sky-700">{e.noun_gender}</Badge>}
                                                    {e.verb_class && <Badge variant="pos" className="bg-purple-50 text-purple-700">{e.verb_class}</Badge>}
                                                    {e.verb_form && <Badge variant="pos" className="bg-indigo-50 text-indigo-700">Form {e.verb_form}</Badge>}
                                                    {e.is_loanword && <Badge variant="pos" className="bg-amber-50 text-amber-700">Loanword</Badge>}
                                                    {e.source_language && <Badge variant="pos" className="bg-emerald-50 text-emerald-700">{e.source_language}</Badge>}
                                                    {e.tags && (() => {
                                                        try {
                                                            const tagsArr = typeof e.tags === 'string' ? (e.tags.startsWith('[') ? JSON.parse(e.tags) : e.tags.split(',').map(s => s.trim())) : e.tags;
                                                            if (Array.isArray(tagsArr)) {
                                                                return tagsArr.map(t => (
                                                                    <Badge key={t} variant="pos" className="bg-slate-50 text-slate-400 border-slate-100">{t}</Badge>
                                                                ));
                                                            }
                                                        } catch (err) { }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                                                <Badge variant="pos" className="bg-slate-100 text-slate-600 border-0">{e.pos}</Badge>
                                                <span className="text-[10px] text-black/20 font-bold uppercase">{e.created_at?.slice(0, 10)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Card className="overflow-hidden border-[#ede9e1]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[#f9f7f3] border-b border-[#ede9e1]">
                                            <tr>
                                                <th className="p-4 w-10">
                                                    <button onClick={toggleSelectAll} className="text-black/20 hover:text-black/40">
                                                        {selectedIds.size === entries.length && entries.length > 0 ? <CheckSquare size={16} className="text-[#1034A6]" /> : <Square size={16} />}
                                                    </button>
                                                </th>
                                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase">Kliem & ID</th>
                                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase">Għerq & POS</th>
                                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase">Definizzjoni</th>
                                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase">Dettalji</th>
                                                <th className="text-right p-4 text-xs font-bold text-black/40 uppercase">Azzjonijiet</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {posEntries.map(e => (
                                                <tr key={e.id} className={cn(
                                                    "border-b border-[#ede9e1] last:border-0 transition-colors",
                                                    selectedIds.has(e.id) ? "bg-[#1034A6]/[0.03]" : "hover:bg-[#f9f7f3]"
                                                )}>
                                                    <td className="p-4">
                                                        <button onClick={() => toggleSelect(e.id)} className={cn("transition-colors", selectedIds.has(e.id) ? "text-[#1034A6]" : "text-black/10 hover:text-black/20")}>
                                                            {selectedIds.has(e.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                        </button>
                                                    </td>
                                                    <td className="p-4">
                                                        <Link to={`/entry/${e.id}`} className="font-serif font-bold text-[#1034A6] text-lg hover:underline block">{e.headword}</Link>
                                                        <span className="text-[10px] text-black/30 font-mono mt-0.5 inline-block">ID: {e.id}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            {e.root_consonants ? (
                                                                <Link to={`/root/${e.root_consonants}`} className="font-bold text-slate-600 hover:text-[#1034A6] hover:underline" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                                                                    {e.root_consonants}
                                                                </Link>
                                                            ) : <span className="text-black/20">—</span>}
                                                            <span className="italic text-black/40 text-[11px] uppercase tracking-wider">{e.pos}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-black/60 italic max-w-[200px] truncate">{e.text_en || '—'}</td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                            {e.noun_gender && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{e.noun_gender}</span>}
                                                            {e.verb_class && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{e.verb_class}</span>}
                                                            {e.verb_form && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Form {e.verb_form}</span>}
                                                            {e.is_loanword && <span className="text-[10px] bg-amber-50 px-1.5 py-0.5 rounded text-amber-700">Loan</span>}
                                                            {e.source_language && <span className="text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700">{e.source_language}</span>}
                                                            {e.tags && (() => {
                                                                try {
                                                                    const tagsArr = typeof e.tags === 'string' ? (e.tags.startsWith('[') ? JSON.parse(e.tags) : e.tags.split(',').map(s => s.trim())) : e.tags;
                                                                    if (Array.isArray(tagsArr)) {
                                                                        return tagsArr.map(t => (
                                                                            <span key={t} className="text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-400">{t}</span>
                                                                        ));
                                                                    }
                                                                } catch (err) { }
                                                                return null;
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => { setEditEntry(e); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDelete(e.id, e.headword)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => setShowForm(false)}
                    onSaved={() => { setShowForm(false); load(); }}
                    getToken={getToken}
                />
            )}

            {selectedIds.size > 0 && (
                <BulkActionsBar
                    count={selectedIds.size}
                    onClear={() => setSelectedIds(new Set())}
                    onDelete={handleBulkDelete}
                />
            )}
        </div>
    );
}

function BulkActionsBar({ count, onClear, onDelete }: { count: number; onClear: () => void; onDelete: () => void }) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-black text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="bg-[#1034A6] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {count}
                    </div>
                    <span className="text-sm font-bold tracking-tight">Eżerċizzji magħżula</span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex gap-2">
                    <button
                        onClick={onClear}
                        className="text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                    >
                        <X size={14} /> Ħassar l-għażla
                    </button>
                    <button
                        onClick={onDelete}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
                    >
                        <Trash2 size={14} /> Ħassar kollha
                    </button>
                </div>
            </div>
        </div>
    );
}

function RootManager() {
    const { getToken } = useClerkAuth();
    const [roots, setRoots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editRoot, setEditRoot] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === roots.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(roots.map(r => r.id)));
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(`Żgur li trid tħassar ${count} għeruq? Din ma tistax tinqaleb.`)) return;
        try {
            const token = await getToken();
            const { adminBulkDeleteRoots } = await import('@/lib/api');
            await adminBulkDeleteRoots(token!, Array.from(selectedIds));
            setSelectedIds(new Set());
            load();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await adminListRoots(token!, q);
            setRoots(res.roots);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [getToken, q]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id: string, cons: string) => {
        if (!confirm(`Żgur li trid tħassar l-għerq ${cons}?`)) return;
        try {
            const token = await getToken();
            await adminDeleteRoot(token!, id);
            load();
        } catch (e) {
            alert((e as any).message);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-[#4a4a4a] font-medium">{roots.length} għeruq sibt</p>
                <div className="flex gap-2">
                    <div className="flex bg-black/5 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                        >
                            <List size={16} />
                        </button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Aġġorna</Button>
                    <Button size="sm" onClick={() => setShowAdd(true)} leftIcon={<Plus size={14} />}>Għerq Ġdid</Button>
                </div>
            </div>

            <SearchInput value={q} onChange={setQ} onSubmit={load} placeholder="Fittex għerq (eż. k-t-b)..." />

            {loading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
            ) : viewMode === 'list' ? (
                <Card className="overflow-hidden border-[#ede9e1]">
                    <table className="w-full text-sm">
                        <thead className="bg-[#f9f7f3] border-b border-[#ede9e1]">
                            <tr>
                                <th className="p-4 w-10">
                                    <button onClick={toggleSelectAll} className="text-black/20 hover:text-black/40">
                                        {selectedIds.size === roots.length && roots.length > 0 ? <CheckSquare size={16} className="text-[#1034A6]" /> : <Square size={16} />}
                                    </button>
                                </th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Konsonanti</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Tifsira</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Klassi</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Vokali</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Sors</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Tags</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Teżawru</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Data</th>
                                <th className="text-right p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Azzjonijiet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roots.map(r => (
                                <tr key={r.id} className={cn(
                                    "border-b border-[#ede9e1] last:border-0 transition-colors",
                                    selectedIds.has(r.id) ? "bg-[#1034A6]/[0.03]" : "hover:bg-[#f9f7f3]"
                                )}>
                                    <td className="p-4">
                                        <button onClick={() => toggleSelect(r.id)} className={cn("transition-colors", selectedIds.has(r.id) ? "text-[#1034A6]" : "text-black/10 hover:text-black/20")}>
                                            {selectedIds.has(r.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>
                                    </td>
                                    <td className="p-4 font-serif font-bold text-[#1034A6] text-lg">
                                        <Link to={`/root/${encodeURIComponent(r.id)}`} className="hover:underline">{r.consonants}</Link>
                                    </td>
                                    <td className="p-4 text-black/80">
                                        {(() => {
                                            if (!r.gloss) return <span className="text-black/20 italic">nieqsa</span>;
                                            if (typeof r.gloss === 'string' && r.gloss.includes('[object Object]')) return <span className="text-red-400 italic">data mħassra</span>;
                                            try {
                                                const parsed = JSON.parse(r.gloss);
                                                if (Array.isArray(parsed) && parsed[0]) {
                                                    const g = parsed[0];
                                                    if (typeof g === 'object') {
                                                        return (g.en || g.mt) ? `${g.en}${g.mt ? ` / ${g.mt}` : ''}` : <span className="text-black/20 italic">nieqsa</span>;
                                                    }
                                                    return String(g);
                                                }
                                            } catch (e) { }
                                            return r.gloss || <span className="text-black/20 italic">nieqsa</span>;
                                        })()}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded-full font-bold uppercase text-black/50">
                                            {r.strength} {r.weak_class && `• ${r.weak_class}`}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] text-black/30 font-bold uppercase">P:{r.vowel_set_perf || 'a-a'}</span>
                                            <span className="text-[9px] text-black/30 font-bold uppercase">F:{r.vowel_set_impf || 'i-a'}</span>
                                            <span className="text-[9px] text-black/30 font-bold uppercase">M:{r.vowel_set_imp || 'o-o'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-black/60 italic">{r.source || '—'}</td>
                                    <td className="p-4">
                                        {r.tags && (() => {
                                            try {
                                                const tagsArr = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags;
                                                if (Array.isArray(tagsArr) && tagsArr.length > 0) {
                                                    return (
                                                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                                                            {tagsArr.map((tag: string) => (
                                                                <span key={tag} className="px-1.5 py-0.5 bg-black/5 text-black/40 rounded text-[9px] font-bold uppercase tracking-widest border border-black/5">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                            } catch (e) {
                                                return <span className="text-[9px] text-black/40 italic">{String(r.tags)}</span>;
                                            }
                                            return null;
                                        })()}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-1.5 mt-0.5">
                                            {(() => {
                                                const sCount = typeof r.synonyms === 'string' ? JSON.parse(r.synonyms || '[]').length : (r.synonyms?.length || 0);
                                                const aCount = typeof r.antonyms === 'string' ? JSON.parse(r.antonyms || '[]').length : (r.antonyms?.length || 0);
                                                if (sCount === 0 && aCount === 0) return <span className="text-[10px] text-black/20 italic">xejn</span>;
                                                return (
                                                    <>
                                                        {sCount > 0 && <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{sCount} sin.</span>}
                                                        {aCount > 0 && <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{aCount} ant.</span>}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-black/40 text-xs">{r.created_at?.slice(0, 10)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditRoot(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(r.id, r.consonants)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {roots.map(r => (
                        <div key={r.id} className={cn(
                            "group bg-white border rounded-2xl p-5 transition-all duration-300 relative flex flex-col justify-between h-full",
                            selectedIds.has(r.id) ? "border-[#1034A6] ring-1 ring-[#1034A6]/20 bg-[#1034A6]/[0.02]" : "border-[#ede9e1] hover:shadow-xl hover:shadow-[#1034A6]/5"
                        )}>
                            <button
                                onClick={() => toggleSelect(r.id)}
                                className={cn(
                                    "absolute top-3 left-3 z-10 p-1 rounded-md transition-all",
                                    selectedIds.has(r.id) ? "text-[#1034A6] bg-white shadow-sm" : "opacity-0 group-hover:opacity-100 text-black/20 hover:text-black/40 bg-black/5"
                                )}
                            >
                                {selectedIds.has(r.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                            <div className="flex justify-between items-start mb-3 ml-6 group-hover:ml-0 transition-all">
                                <Link to={`/root/${encodeURIComponent(r.id)}`} className="ml-1">
                                    <h4 className="font-serif text-2xl font-bold text-[#1034A6] group-hover:underline">{r.consonants}</h4>
                                </Link>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditRoot(r)} className="p-1.5 text-[#1034A6] hover:bg-[#1034A6]/10 rounded-lg"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(r.id, r.consonants)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <p className="text-sm text-black/60 mb-4 h-10 line-clamp-2">
                                {(() => {
                                    if (!r.gloss) return <span className="italic opacity-50">L-ebda tifsira...</span>;
                                    if (typeof r.gloss === 'string' && r.gloss.includes('[object Object]')) return <span className="text-red-400 italic">data mħassra</span>;
                                    try {
                                        const parsed = JSON.parse(r.gloss);
                                        if (Array.isArray(parsed) && parsed[0]) {
                                            const g = parsed[0];
                                            if (typeof g === 'object') {
                                                return `${g.en}${g.mt ? ` / ${g.mt}` : ''}`;
                                            }
                                            return String(g);
                                        }
                                    } catch (e) { }
                                    return r.gloss || <span className="italic opacity-50">L-ebda tifsira...</span>;
                                })()}
                            </p>
                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex gap-1">
                                    {(() => {
                                        const sCount = typeof r.synonyms === 'string' ? JSON.parse(r.synonyms || '[]').length : (r.synonyms?.length || 0);
                                        const aCount = typeof r.antonyms === 'string' ? JSON.parse(r.antonyms || '[]').length : (r.antonyms?.length || 0);
                                        return (
                                            <>
                                                {sCount > 0 && <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{sCount}</span>}
                                                {aCount > 0 && <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{aCount}</span>}
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest">{r.strength}</span>
                                    <Badge variant="source">{r.source || 'Standard'}</Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && (
                <RootFormModal
                    data={{}}
                    onClose={() => setShowAdd(false)}
                    onSaved={() => {
                        setShowAdd(false);
                        load();
                    }}
                    getToken={getToken}
                    isNew={true}
                />
            )}

            {editRoot && (
                <RootFormModal
                    data={editRoot}
                    onClose={() => setEditRoot(null)}
                    onSaved={() => {
                        setEditRoot(null);
                        load();
                    }}
                    getToken={getToken}
                />
            )}
            {selectedIds.size > 0 && (
                <BulkActionsBar
                    count={selectedIds.size}
                    onClear={() => setSelectedIds(new Set())}
                    onDelete={handleBulkDelete}
                />
            )}
        </div>
    );
}
