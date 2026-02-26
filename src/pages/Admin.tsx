import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminListEntries, adminDeleteEntry } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { SearchInput } from '@/components/ui/SearchInput';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import {
    Plus, Trash2, Edit2, RefreshCw,
    CheckCircle, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Main Admin Page ───────────────────────────────────────────────────────────

export function Admin() {
    const { tier, isTrueAdmin } = useAuth();

    // Only allow users with admin role or enterprise tier
    if (!isTrueAdmin && tier !== 'enterprise') {
        return <Navigate to="/" replace />;
    }

    return <AdminInterface />;
}

function AdminInterface() {
    const { getToken } = useClerkAuth();

    const [entries, setEntries] = useState<AdminEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
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
                q: query, limit: PAGE_SIZE, offset: page * PAGE_SIZE,
            });
            setEntries(data.entries ?? []);
            setTotal(data.total ?? 0);
        } catch (e: any) {
            // In dev without CF workers running, show mock notice
            setError(e.message.includes('Failed to fetch')
                ? 'Admin API unavailable in dev — deploy to Cloudflare or run wrangler pages dev.'
                : e.message);
        } finally {
            setLoading(false);
        }
    }, [query, page, getToken]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id: string, headword: string) => {
        if (!confirm(`DELETE "${headword}"? This cannot be undone.`)) return;
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminDeleteEntry(token!, id);
            showToast(`"${headword}" deleted`);
            load();
        } catch (e: any) {
            showToast(e.message, false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-[#1034A6]">Admin — Entrati</h1>
                    <p className="text-sm text-[#4a4a4a]">{total.toLocaleString()} entrati fid-database</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>
                        Aġġorna
                    </Button>
                    <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditEntry(null); setShowForm(true); }}>
                        Entrata Ġdida
                    </Button>
                </div>
            </div>

            {/* Search */}
            <SearchInput value={query} onChange={setQuery} onSubmit={load} placeholder="Fittex bil-headword…" />

            {/* Toast */}
            {toast && (
                <div className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium animate-fade-in',
                    toast.ok ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                )}>
                    {toast.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {toast.msg}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Table */}
            <Card className="overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#f9f7f3]">
                                    {['Headword', 'POS', 'Ġeneru / Klassi', 'Sors', 'Definizzjoni', 'Eqdem', ''].map(h => (
                                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[#A07030] uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                                        L-ebda entrati.
                                    </td></tr>
                                )}
                                {entries.map(e => (
                                    <tr key={e.id} className="border-b border-[#ede9e1] last:border-0 hover:bg-[#f9f7f3] transition-colors">
                                        <td className="px-4 py-2.5 font-serif font-bold text-[#1034A6]">
                                            {e.headword}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <Badge variant="pos">{e.pos}</Badge>
                                        </td>
                                        <td className="px-4 py-2.5 text-[#4a4a4a]">
                                            {e.noun_gender ?? e.verb_class ?? '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-[#4a4a4a]">
                                            {e.is_loanword && e.source_language
                                                ? <Badge variant="source">← {e.source_language}</Badge>
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-[#4a4a4a] max-w-[200px] truncate">
                                            {e.text_en ?? <span className="text-gray-300 italic">bla definizzjoni</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-[#4a4a4a] text-xs whitespace-nowrap">
                                            {e.created_at?.slice(0, 10)}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => { setEditEntry(e); setShowForm(true); }}
                                                    className="p-1.5 rounded hover:bg-[#1034A6]/10 text-[#1034A6] transition-colors"
                                                    title="Editja"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(e.id, e.headword)}
                                                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-[#B22222] transition-colors"
                                                    title="Ħassar"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#ede9e1] bg-[#f9f7f3]">
                        <span className="text-xs text-[#4a4a4a]">
                            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} minn {total}
                        </span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" disabled={page === 0}
                                onClick={() => setPage(p => p - 1)} leftIcon={<ChevronLeft size={14} />}>
                                Preċedenti
                            </Button>
                            <Button variant="ghost" size="sm" disabled={(page + 1) * PAGE_SIZE >= total}
                                onClick={() => setPage(p => p + 1)} rightIcon={<ChevronRight size={14} />}>
                                Li Jmiss
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Entry Form Modal */}
            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => setShowForm(false)}
                    onSaved={() => { setShowForm(false); load(); showToast(editEntry ? 'Aġġornata!' : 'Maħluqa!'); }}
                    getToken={getToken}
                />
            )}
        </div>
    );
}


