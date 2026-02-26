import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminListEntries, adminDeleteEntry, adminListRoots, adminDeleteRoot, adminCreateRoot } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { SearchInput } from '@/components/ui/SearchInput';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import {
    Plus, Trash2, Edit2, RefreshCw,
    Layers, FileText, CheckCircle, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Main Admin Page ───────────────────────────────────────────────────────────

export function Admin() {
    const { tier, isTrueAdmin } = useAuth();
    const [tab, setTab] = useState<'entries' | 'roots'>('entries');

    // Only allow users with admin role or enterprise tier
    if (!isTrueAdmin && tier !== 'enterprise') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
                <h1 className="font-serif text-3xl font-bold text-[#1034A6]">Dashboard tal-Admin</h1>
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
                q: query, limit: PAGE_SIZE, offset: 0,
            });
            setEntries(data.entries ?? []);
            setTotal(data.total ?? 0);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [query, getToken]);

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

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-[#4a4a4a] font-medium">{total.toLocaleString()} entrati fid-database</p>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Aġġorna</Button>
                    <Button size="sm" onClick={() => { setEditEntry(null); setShowForm(true); }} leftIcon={<Plus size={14} />}>Entrata Ġdida</Button>
                </div>
            </div>

            {toast && (
                <div className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium animate-fade-in',
                    toast.ok ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                )}>
                    <CheckCircle size={14} />
                    {toast.msg}
                </div>
            )}

            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    {error}
                </div>
            )}

            <SearchInput value={query} onChange={setQuery} onSubmit={load} placeholder="Fittex entrata..." />

            <Card className="overflow-hidden border-[#ede9e1]">
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-[#f9f7f3] border-b border-[#ede9e1]">
                            <tr>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Headword</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">POS</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Definizzjoni</th>
                                <th className="text-right p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Azzjonijiet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(e => (
                                <tr key={e.id} className="border-b border-[#ede9e1] last:border-0 hover:bg-[#f9f7f3]">
                                    <td className="p-4 font-serif font-bold text-[#1034A6]">{e.headword}</td>
                                    <td className="p-4"><Badge variant="pos">{e.pos}</Badge></td>
                                    <td className="p-4 text-black/60 truncate max-w-[300px]">{e.text_en}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => { setEditEntry(e); setShowForm(true); }} className="p-1.5 text-[#1034A6] hover:bg-[#1034A6]/10 rounded"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(e.id, e.headword)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

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
    const [newConsonants, setNewConsonants] = useState('');

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

    const handleCreate = async () => {
        if (!newConsonants) return;
        try {
            const token = await getToken();
            await adminCreateRoot(token!, { consonants: newConsonants });
            setNewConsonants('');
            setShowAdd(false);
            load();
        } catch (e) {
            alert("Spiċċa ħażin: " + (e as any).message);
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
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Data</th>
                                <th className="text-right p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Azzjonijiet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roots.map(r => (
                                <tr key={r.id} className="border-b border-[#ede9e1] last:border-0 hover:bg-[#f9f7f3]">
                                    <td className="p-4 font-serif font-bold text-[#1034A6] text-lg">
                                        <Link to={`/root/${r.consonants}`} className="hover:underline">{r.consonants}</Link>
                                    </td>
                                    <td className="p-4 text-black/40 text-xs">{r.created_at?.slice(0, 10)}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(r.id, r.consonants)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {showAdd && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                        <h2 className="text-xl font-bold text-black mb-4">Għerq Ġdid</h2>
                        <input
                            className="w-full border border-black/10 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-[#1034A6] outline-none"
                            placeholder="eż. k-t-b"
                            value={newConsonants}
                            onChange={e => setNewConsonants(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowAdd(false)}>Ikkanċella</Button>
                            <Button onClick={handleCreate}>Oħloq</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



