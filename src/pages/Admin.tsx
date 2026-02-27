import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminListEntries, adminDeleteEntry, adminListRoots, adminDeleteRoot, adminCreateRoot, adminUpdateRoot } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { SearchInput } from '@/components/ui/SearchInput';
import { RootFormModal, type RootFormData } from '@/components/admin/RootFormModal';
import { EntryFormModal, type AdminEntry, POS_OPTIONS } from '@/components/admin/EntryFormModal';
import {
    Plus, Trash2, Edit2, RefreshCw,
    Layers, FileText, CheckCircle, AlertCircle, ShieldAlert,
    Book, Zap, Sparkles, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Main Admin Page ───────────────────────────────────────────────────────────

export function Admin() {
    const { tier, isTrueAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get('tab') as 'entries' | 'roots') || 'entries';

    const setTab = (t: 'entries' | 'roots') => {
        setSearchParams({ tab: t });
    };

    // For development, we allow access but show a warning if not tag as admin
    const hasAdminRights = isTrueAdmin || tier === 'enterprise';

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {!hasAdminRights && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <ShieldAlert className="shrink-0" size={20} />
                    <div className="text-sm">
                        <span className="font-bold">Attenzjoni:</span> Is-sistema ma tagħrfekx bħala Admin uffiċjali fil-Clerk Metadata. Għalissa qed inħalluk tidħol biex tittestja.
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-b border-black/5 pb-4">
                <h1 className="font-serif text-3xl font-bold text-black">Dashboard tal-Admin</h1>
                <div className="flex bg-black/5 p-1 rounded-xl">
                    <button
                        onClick={() => setTab('entries')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                            tab === 'entries' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40 hover:text-black/60"
                        )}
                    >
                        <FileText size={16} /> Entrati
                    </button>
                    <button
                        onClick={() => setTab('roots')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                            tab === 'roots' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40 hover:text-black/60"
                        )}
                    >
                        <Layers size={16} /> Għeruq
                    </button>
                </div>
            </div>

            {tab === 'entries' ? <EntryManager /> : <RootManager />}
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
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const PAGE_SIZE = 50;

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
                    {POS_OPTIONS.map(pos => (
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
                                <span className="text-xs font-bold text-black/20">{posEntries.length}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {posEntries.map(e => (
                                    <div key={e.id} className="group bg-white border border-[#ede9e1] rounded-2xl p-5 hover:shadow-xl hover:shadow-[#1034A6]/5 transition-all duration-300 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-serif text-xl font-bold text-[#1034A6] group-hover:scale-105 transition-transform origin-left">{e.headword}</h4>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditEntry(e); setShowForm(true); }} className="p-1.5 text-[#1034A6] hover:bg-[#1034A6]/10 rounded-lg"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDelete(e.id, e.headword)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-black/60 line-clamp-2 italic">{e.text_en || 'L-ebda definizzjoni...'}</p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                                            <Badge variant="pos" className="bg-slate-100 text-slate-600 border-0">{e.pos}</Badge>
                                            <span className="text-[10px] text-black/20 font-bold uppercase">{e.created_at?.slice(0, 10)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
    const [saving, setSaving] = useState(false);

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

    const handleCreate = async (data: RootFormData) => {
        setSaving(true);
        try {
            const token = await getToken();
            await adminCreateRoot(token!, {
                consonants: data.consonants,
                strength: data.strength,
                weak_class: data.weak_class,
                gloss: data.glosses[0] || '',
                etymology: data.etymology.definition,
                source: data.source,
                vowel_set_perf: data.vowel_set_perf,
                vowel_set_impf: data.vowel_set_impf,
                vowel_set_imp: data.vowel_set_imp
            } as any);
            setShowAdd(false);
            load();
        } catch (e) {
            alert("Spiċċa ħażin: " + (e as any).message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (data: RootFormData) => {
        setSaving(true);
        try {
            const token = await getToken();
            await adminUpdateRoot(token!, data.consonants, {
                strength: data.strength,
                weak_class: data.weak_class,
                gloss: data.glosses[0] || '',
                etymology: data.etymology.definition,
                source: data.source,
                vowel_set_perf: data.vowel_set_perf,
                vowel_set_impf: data.vowel_set_impf,
                vowel_set_imp: data.vowel_set_imp
            });
            setEditRoot(null);
            load();
        } catch (e) {
            alert("Spiċċa ħażin: " + (e as any).message);
        } finally {
            setSaving(false);
        }
    };

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
                    <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Aġġorna</Button>
                    <Button size="sm" onClick={() => setShowAdd(true)} leftIcon={<Plus size={14} />}>Għerq Ġdid</Button>
                </div>
            </div>

            <SearchInput value={q} onChange={setQ} onSubmit={load} placeholder="Fittex għerq (eż. k-t-b)..." />

            <Card className="overflow-hidden border-[#ede9e1]">
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-[#f9f7f3] border-b border-[#ede9e1]">
                            <tr>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Konsonanti</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Tifsira</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Klassi</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Vokali</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Sors</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Data</th>
                                <th className="text-right p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Azzjonijiet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roots.map(r => (
                                <tr key={r.id} className="border-b border-[#ede9e1] last:border-0 hover:bg-[#f9f7f3]">
                                    <td className="p-4 font-serif font-bold text-[#1034A6] text-lg">
                                        <Link to={`/root/${encodeURIComponent(r.consonants)}`} className="hover:underline">{r.consonants}</Link>
                                    </td>
                                    <td className="p-4 text-black/80">{r.gloss || <span className="text-black/20 italic">nieqsa</span>}</td>
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
                )}
            </Card>

            {showAdd && (
                <RootFormModal
                    data={{
                        consonants: '',
                        glosses: [''],
                        etymology: { language: '', term: '', definition: '' },
                        source: '',
                        strength: 'strong'
                    }}
                    saving={saving}
                    onClose={() => setShowAdd(false)}
                    onSaved={handleCreate}
                />
            )}

            {editRoot && (
                <RootFormModal
                    data={{
                        consonants: editRoot.consonants,
                        glosses: editRoot.gloss ? [editRoot.gloss] : [],
                        etymology: { language: '', term: '', definition: editRoot.etymology || '' },
                        source: editRoot.source || '',
                        strength: editRoot.strength || 'strong',
                        weak_class: editRoot.weak_class,
                        vowel_set_perf: editRoot.vowel_set_perf,
                        vowel_set_impf: editRoot.vowel_set_impf,
                        vowel_set_imp: editRoot.vowel_set_imp
                    }}
                    saving={saving}
                    onClose={() => setEditRoot(null)}
                    onSaved={handleUpdate}
                />
            )}
        </div>
    );
}
