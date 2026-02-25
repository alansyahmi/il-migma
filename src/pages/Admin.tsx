import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminListEntries, adminCreateEntry, adminDeleteEntry } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import {
    Plus, Trash2, Edit2, RefreshCw,
    CheckCircle, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const POS_OPTIONS = [
    'noun', 'verb', 'adjective', 'adverb', 'preposition',
    'conjunction', 'particle', 'article', 'pronoun',
    'interrogative', 'numeral', 'interjection',
];

const GENDER_OPTIONS = ['masculine', 'feminine', 'common'];
const VERB_CLASS_OPTIONS = ['strong', 'weak', 'doubled', 'quadrilateral', 'loan'];
const REGISTER_OPTIONS = ['formal', 'informal', 'archaic', 'technical', 'dialectal', 'colloquial'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminEntry {
    id: string;
    headword: string;
    pos: string;
    noun_gender?: string;
    verb_class?: string;
    is_loanword: boolean;
    source_language?: string;
    created_at: string;
    text_en?: string;
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export function Admin() {
    const { tier } = useAuth();

    // Only allow users with admin role — in production check Clerk public metadata
    // For now show to any enterprise user
    if (tier !== 'enterprise') {
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
                    <h1 className="font-serif text-2xl font-bold text-[#1B4D3E]">Admin — Entrati</h1>
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
                    toast.ok ? 'bg-green-50 text-green-800 border border-green-200'
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
                                        <td className="px-4 py-2.5 font-serif font-bold text-[#1B4D3E]">
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
                                                    className="p-1.5 rounded hover:bg-[#1B4D3E]/10 text-[#1B4D3E] transition-colors"
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

// ── Entry Form Modal ──────────────────────────────────────────────────────────

interface EntryFormModalProps {
    entry: AdminEntry | null;
    onClose: () => void;
    onSaved: () => void;
    getToken: () => Promise<string | null>;
}

function EntryFormModal({ entry, onClose, onSaved, getToken }: EntryFormModalProps) {
    const isEdit = Boolean(entry);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        headword: entry?.headword ?? '',
        pos: entry?.pos ?? 'noun',
        noun_gender: (entry as any)?.noun_gender ?? '',
        noun_singular: (entry as any)?.noun_singular ?? '',
        noun_plural_forms: '',  // comma-separated
        noun_sound_plural: '',
        noun_dual: '',
        verb_class: (entry as any)?.verb_class ?? '',
        verb_transitivity: '',
        verb_perfective_3sgm: '',
        verb_imperfective_3sgm: '',
        verb_verbal_noun: '',
        adj_masculine: '',
        adj_feminine: '',
        adj_plural: '',
        is_loanword: entry?.is_loanword ?? false,
        source_language: entry?.source_language ?? '',
        definition_en: (entry as any)?.text_en ?? '',
        definition_mt: '',
        register: '',
        ipa: '',
        tags: '',
    });

    const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.headword.trim()) { setError('Il-headword huwa obbligatorju'); return; }
        setSaving(true);
        setError('');
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const payload: Record<string, unknown> = {
                ...form,
                noun_plural_forms: form.noun_plural_forms
                    ? form.noun_plural_forms.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
            };
            if (isEdit && entry) payload.id = entry.id;
            isEdit ? await adminDeleteEntry(token, entry!.id) : await adminCreateEntry(token, payload);
            if (!isEdit) await adminCreateEntry(token, payload);
            onSaved();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const inp = "w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white";
    const sel = inp + " cursor-pointer";
    const label = "block text-xs font-semibold text-[#1B4D3E] uppercase tracking-wider mb-1";

    return (
        <Modal
            open
            onClose={onClose}
            title={isEdit ? `Editja: ${entry?.headword}` : 'Entrata Ġdida'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                {error && (
                    <div className="bg-red-50 text-red-800 border border-red-200 rounded px-3 py-2 text-sm">
                        {error}
                    </div>
                )}

                {/* Core */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className={label}>Headword *</label>
                        <input className={inp} value={form.headword} onChange={e => set('headword', e.target.value)} required />
                    </div>
                    <div>
                        <label className={label}>POS *</label>
                        <select className={sel} value={form.pos} onChange={e => set('pos', e.target.value)}>
                            {POS_OPTIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                {/* IPA */}
                <div>
                    <label className={label}>IPA (Standard)</label>
                    <input className={inp} value={form.ipa} onChange={e => set('ipa', e.target.value)}
                        placeholder="eż. ˈkitɛb" />
                </div>

                {/* Noun fields */}
                {form.pos === 'noun' && (
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                        <legend className="text-xs font-semibold text-[#1B4D3E] px-2">Nom</legend>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={label}>Ġeneru</label>
                                <select className={sel} value={form.noun_gender} onChange={e => set('noun_gender', e.target.value)}>
                                    <option value="">—</option>
                                    {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={label}>Singular</label>
                                <input className={inp} value={form.noun_singular} onChange={e => set('noun_singular', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>Plural maqsur (virgola)</label>
                                <input className={inp} value={form.noun_plural_forms}
                                    onChange={e => set('noun_plural_forms', e.target.value)} placeholder="ktieb, kotba" />
                            </div>
                            <div>
                                <label className={label}>Plural sħiħ</label>
                                <input className={inp} value={form.noun_sound_plural} onChange={e => set('noun_sound_plural', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>Dual</label>
                                <input className={inp} value={form.noun_dual} onChange={e => set('noun_dual', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>
                )}

                {/* Verb fields */}
                {form.pos === 'verb' && (
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                        <legend className="text-xs font-semibold text-[#1B4D3E] px-2">Verb</legend>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={label}>Klassi</label>
                                <select className={sel} value={form.verb_class} onChange={e => set('verb_class', e.target.value)}>
                                    <option value="">—</option>
                                    {VERB_CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={label}>Perfettiv 3sg.m</label>
                                <input className={inp} value={form.verb_perfective_3sgm}
                                    onChange={e => set('verb_perfective_3sgm', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>Imperfettiv 3sg.m</label>
                                <input className={inp} value={form.verb_imperfective_3sgm}
                                    onChange={e => set('verb_imperfective_3sgm', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>Nom Verbali</label>
                                <input className={inp} value={form.verb_verbal_noun}
                                    onChange={e => set('verb_verbal_noun', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>
                )}

                {/* Adjective fields */}
                {form.pos === 'adjective' && (
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                        <legend className="text-xs font-semibold text-[#1B4D3E] px-2">Aġġettiv</legend>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={label}>Maskil</label>
                                <input className={inp} value={form.adj_masculine} onChange={e => set('adj_masculine', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>Femminil</label>
                                <input className={inp} value={form.adj_feminine} onChange={e => set('adj_feminine', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>Plural</label>
                                <input className={inp} value={form.adj_plural} onChange={e => set('adj_plural', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>
                )}

                {/* Etymology / loanword */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="loanword" checked={form.is_loanword}
                            onChange={e => set('is_loanword', e.target.checked)}
                            className="w-4 h-4 text-[#1034A6] rounded" />
                        <label htmlFor="loanword" className="text-sm text-[#000]">Self (loanword)?</label>
                    </div>
                    {form.is_loanword && (
                        <div>
                            <label className={label}>Lingwa Sors</label>
                            <input className={inp} value={form.source_language}
                                onChange={e => set('source_language', e.target.value)} placeholder="eż. Italian" />
                        </div>
                    )}
                </div>

                {/* Definition */}
                <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                    <legend className="text-xs font-semibold text-[#1B4D3E] px-2">Definizzjoni (Sens 1)</legend>
                    <div>
                        <label className={label}>Bl-Ingliż</label>
                        <textarea className={inp} rows={2} value={form.definition_en}
                            onChange={e => set('definition_en', e.target.value)} />
                    </div>
                    <div>
                        <label className={label}>Bil-Malti (fakultattiv)</label>
                        <textarea className={inp} rows={2} value={form.definition_mt}
                            onChange={e => set('definition_mt', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={label}>Reġistru</label>
                            <select className={sel} value={form.register} onChange={e => set('register', e.target.value)}>
                                <option value="">—</option>
                                {REGISTER_OPTIONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={label}>Tags (virgola)</label>
                            <input className={inp} value={form.tags} onChange={e => set('tags', e.target.value)}
                                placeholder="eż. colloquial, archaic" />
                        </div>
                    </div>
                </fieldset>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Ikkanċella</Button>
                    <Button type="submit" loading={saving}>
                        {isEdit ? 'Issejva l-Bidliet' : 'Oħloq Entrata'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
