import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Book, CheckSquare, Edit2, HelpCircle, Plus, RefreshCw, Sparkles, Square, Trash2, Zap } from 'lucide-react';
import { adminBulkDeleteEntries, adminDeleteEntry, adminListEntries } from '@/lib/api';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useAdminConfig } from '@/lib/adminConfig';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { WorkspaceViewToggle } from '@/components/admin/workspace/WorkspaceViewToggle';
import { WorkspaceBulkActionsBar } from '@/components/admin/workspace/WorkspaceBulkActionsBar';
import { WorkspaceEmptyState } from '@/components/admin/workspace/WorkspaceEmptyState';
import { WorkspaceErrorBanner, WorkspaceFeedbackBanner } from '@/components/admin/workspace/WorkspaceFeedbackBanner';
import { WorkspaceToolbar } from '@/components/admin/workspace/WorkspaceToolbar';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

export function EntryManager() {
    const { getToken } = useClerkAuth();
    const { term } = useLinguisticMode();
    const { getValues } = useAdminConfig();
    const [searchParams, setSearchParams] = useSearchParams();

    const [entries, setEntries] = useState<AdminEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [selectedPos, setSelectedPos] = useState<string>('all');
    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<Record<string, string> | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const createEntryRequested = searchParams.get('create') === '1';
    const prefillHeadword = searchParams.get('headword') || searchParams.get('q') || '';
    const prefillRoot = searchParams.get('root') || searchParams.get('consonants') || '';

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        window.setTimeout(() => setToast(null), 3500);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const data = await adminListEntries(token, {
                q: query,
                pos: selectedPos === 'all' ? '' : selectedPos,
                limit: PAGE_SIZE,
                offset: 0,
            }) as { entries?: AdminEntry[]; total?: number };
            setEntries(data.entries ?? []);
            setTotal(data.total ?? 0);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [getToken, query, selectedPos]);

    useEffect(() => {
        load();
    }, [load]);

    const clearCreateParams = useCallback(() => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('create');
            next.delete('headword');
            next.delete('root');
            next.delete('consonants');
            return next;
        });
    }, [setSearchParams]);

    useEffect(() => {
        if (!createEntryRequested) return;

        setEditEntry(null);
        setInitialFormData({
            ...(prefillHeadword ? { headword: prefillHeadword } : {}),
            ...(prefillRoot ? { _rootConsonants: prefillRoot } : {}),
        });
        setShowForm(true);
    }, [createEntryRequested, prefillHeadword, prefillRoot]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        setSelectedIds((prev) => {
            if (prev.size === entries.length) return new Set();
            return new Set(entries.map((entry) => entry.id));
        });
    };

    const handleDelete = async (id: string, headword: string) => {
        if (!confirm(term('delete-entry-confirm').replace('{headword}', headword))) return;
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminDeleteEntry(token, id);
            showToast(term('entry-deleted').replace('{headword}', headword));
            load();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(term('bulk-delete-confirm').replace('{count}', count.toString()))) return;

        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminBulkDeleteEntries(token, Array.from(selectedIds));
            showToast(term('items-deleted').replace('{count}', count.toString()));
            setSelectedIds(new Set());
            load();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        }
    };

    const groupedEntries = useMemo(() => {
        return entries.reduce((acc, entry) => {
            const pos = entry.pos || 'unknown';
            if (!acc[pos]) acc[pos] = [];
            acc[pos].push(entry);
            return acc;
        }, {} as Record<string, AdminEntry[]>);
    }, [entries]);

    const displayedGroups = useMemo(() => {
        return Object.entries(selectedPos === 'all' ? groupedEntries : { [selectedPos]: entries });
    }, [entries, groupedEntries, selectedPos]);

    const posOptions = useMemo(() => getValues('pos') as string[], [getValues]);

    const posIcons: Record<string, ReactNode> = {
        noun: <Book size={16} />,
        verb: <Zap size={16} />,
        adjective: <Sparkles size={16} />,
        default: <HelpCircle size={16} />,
    };

    return (
        <div className="space-y-4">
            <WorkspaceToolbar
                heading={term('entries')}
                countText={`${total.toLocaleString()} ${term('found')}`}
                controls={(
                    <>
                        <WorkspaceViewToggle viewMode={viewMode} onChange={setViewMode} />
                        <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} className={cn(loading && 'animate-spin')} />}>
                            {term('refresh')}
                        </Button>
                        <Button size="sm" onClick={() => { setEditEntry(null); setInitialFormData(null); setShowForm(true); }} leftIcon={<Plus size={14} />}>
                            {term('new-entry')}
                        </Button>
                    </>
                )}
                filters={(
                    <>
                        <SearchInput value={query} onChange={setQuery} onSubmit={load} placeholder={`${term('search-entry')}...`} />
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedPos('all')}
                                className={cn(
                                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
                                    selectedPos === 'all' ? 'bg-link text-white border-link' : 'bg-white text-black/60 border-black/10 hover:border-black/20',
                                )}
                            >
                                {term('all').toUpperCase()}
                            </button>
                            {posOptions.map((pos) => (
                                <button
                                    key={pos}
                                    type="button"
                                    onClick={() => setSelectedPos(pos)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-full text-xs font-bold transition-all border uppercase tracking-wider',
                                        selectedPos === pos ? 'bg-link text-white border-link' : 'bg-white text-black/60 border-black/10 hover:border-black/20',
                                    )}
                                >
                                    {pos}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            />

            {toast && <WorkspaceFeedbackBanner message={toast.msg} tone={toast.ok ? 'success' : 'error'} />}
            {error && <WorkspaceErrorBanner message={error} />}

            {loading && entries.length === 0 ? (
                <div className="flex justify-center py-20"><Spinner /></div>
            ) : entries.length === 0 ? (
                <WorkspaceEmptyState
                    title={query ? term('no-results-found').replace('{q}', query) : term('no-results-found').replace(" for '{q}'", '').replace(" għal '{q}'", '')}
                    actionLabel={query ? term('clear-selection') : term('new-entry')}
                    onAction={query ? () => setQuery('') : () => { setEditEntry(null); setInitialFormData(null); setShowForm(true); }}
                />
            ) : (
                <div className="space-y-8">
                    {displayedGroups.map(([pos, posEntries]) => (
                        <section key={pos} className="space-y-4">
                            <div className="flex items-center gap-3 px-1">
                                <div className="p-2 bg-link/5 text-link rounded-lg">{posIcons[pos] || posIcons.default}</div>
                                <h3 className="text-lg font-bold text-black uppercase tracking-tight">{pos}s</h3>
                                <div className="h-px flex-1 bg-black/5" />
                                <span className="text-xs font-bold text-black/25">{posEntries.length} {term('found')}</span>
                            </div>

                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {posEntries.map((entry) => (
                                        <article
                                            key={entry.id}
                                            className={cn(
                                                'group bg-white border rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between relative',
                                                selectedIds.has(entry.id) ? 'border-[#1034A6] ring-1 ring-[#1034A6]/20 bg-link/2' : 'border-border-light hover:shadow-xl hover:shadow-[#1034A6]/5',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleSelect(entry.id)}
                                                className={cn(
                                                    'absolute top-3 left-3 z-10 p-1 rounded-md transition-all',
                                                    selectedIds.has(entry.id) ? 'text-link bg-white shadow-sm' : 'opacity-0 group-hover:opacity-100 text-black/20 hover:text-black/40 bg-black/5',
                                                )}
                                            >
                                                {selectedIds.has(entry.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>

                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <Link to={`/entry/${entry.id}`}>
                                                            <h4 className="font-serif text-xl font-bold text-link hover:scale-105 transition-transform origin-left">{entry.headword}</h4>
                                                        </Link>
                                                        {entry.root_consonants && (
                                                            <Link to={`/root/${entry.root_consonants}`} className="text-xs font-bold text-slate-500 hover:text-link mt-1 inline-block" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                                                                {term('root')}: {entry.root_consonants}
                                                            </Link>
                                                        )}
                                                        <p className="text-[10px] text-black/30 font-mono mt-1">ID: {entry.id}</p>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button type="button" onClick={() => { setEditEntry(entry); setShowForm(true); }} className="p-1.5 text-link hover:bg-link/10 rounded-lg"><Edit2 size={14} /></button>
                                                        <button type="button" onClick={() => handleDelete(entry.id, entry.headword)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-black/60 line-clamp-2 italic">{entry.text_en || `${term('no-definition')}...`}</p>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    <span className="text-[10px] font-bold text-black/30 uppercase tracking-tighter">{term(entry.pos || 'pos')}</span>
                                                    {entry.gender && <Badge variant="pos" className="bg-sky-50 text-sky-700">{term(entry.gender)}</Badge>}
                                                    {entry.verb_class && <Badge variant="pos" className="bg-purple-50 text-purple-700">{term(entry.verb_class)}</Badge>}
                                                    {entry.verb_transitivity && <Badge variant="pos" className="bg-indigo-50 text-indigo-700">{term(entry.verb_transitivity)}</Badge>}
                                                    {entry.verb_form && <Badge variant="pos" className="bg-indigo-50 text-indigo-700">{term('form')} {entry.verb_form}</Badge>}
                                                    {entry.is_loanword && <Badge variant="pos" className="bg-amber-50 text-amber-700">{term('loanword')}</Badge>}
                                                    {entry.source_language && <Badge variant="pos" className="bg-emerald-50 text-emerald-700">{term(entry.source_language)}</Badge>}
                                                    {parseRelationshipItems(entry.alternative_forms).length > 0 && (
                                                        <Badge variant="pos" className="bg-blue-50 text-blue-700">
                                                            ALT {parseRelationshipItems(entry.alternative_forms).length}
                                                        </Badge>
                                                    )}
                                                    {parseTags(entry.tags).map((tag) => (
                                                        <Badge key={tag} variant="pos" className="bg-slate-50 text-slate-400 border-slate-100">{term(tag)}</Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                                                <Badge variant="pos" className="bg-slate-100 text-slate-600 border-0">{term(entry.pos || 'pos')}</Badge>
                                                <span className="text-[10px] text-black/20 font-bold uppercase">{entry.created_at?.slice(0, 10)}</span>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <Card className="overflow-hidden border-border-light overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-surface-soft border-b border-border-light">
                                            <tr>
                                                <th className="p-4 w-10">
                                                    <button type="button" onClick={toggleSelectAll} className="text-black/20 hover:text-black/40">
                                                        {selectedIds.size === entries.length && entries.length > 0 ? <CheckSquare size={16} className="text-link" /> : <Square size={16} />}
                                                    </button>
                                                </th>
                                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase">{term('word')} & ID</th>
                                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase">{term('root')} & POS</th>
                                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase">{term('meaning')}</th>
                                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase">{term('details')}</th>
                                                <th className="text-right p-4 text-xs font-bold text-black/40 uppercase">{term('actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {posEntries.map((entry) => (
                                                <tr key={entry.id} className={cn('border-b border-border-light last:border-0 transition-colors', selectedIds.has(entry.id) ? 'bg-link/3' : 'hover:bg-surface-soft')}>
                                                    <td className="p-4">
                                                        <button type="button" onClick={() => toggleSelect(entry.id)} className={cn('transition-colors', selectedIds.has(entry.id) ? 'text-link' : 'text-black/10 hover:text-black/20')}>
                                                            {selectedIds.has(entry.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                        </button>
                                                    </td>
                                                    <td className="p-4">
                                                        <Link to={`/entry/${entry.id}`} className="font-serif font-bold text-link text-lg hover:underline block">{entry.headword}</Link>
                                                        <span className="text-[10px] text-black/30 font-mono mt-0.5 inline-block">ID: {entry.id}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            {entry.root_consonants ? (
                                                                <Link to={`/root/${entry.root_consonants}`} className="font-bold text-slate-600 hover:text-link hover:underline" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                                                                    {entry.root_consonants}
                                                                </Link>
                                                            ) : <span className="text-black/20">-</span>}
                                                            <span className="italic text-black/40 text-[11px] uppercase tracking-wider">{term(entry.pos || 'pos')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-black/60 italic max-w-[200px] truncate">{entry.text_en || term('missing')}</td>
                                                    <td className="p-4">
                                                        <div className="text-xs font-bold text-black/80">{term(entry.pos || 'pos')}</div>
                                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                            {entry.gender && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{term(entry.gender)}</span>}
                                                            {entry.verb_class && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{term(entry.verb_class)}</span>}
                                                            {entry.verb_transitivity && <span className="text-[10px] bg-sky-50 px-1.5 py-0.5 rounded text-sky-700">{term(entry.verb_transitivity)}</span>}
                                                            {entry.verb_form && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{term('form')} {entry.verb_form}</span>}
                                                            {entry.is_loanword && <span className="text-[10px] bg-amber-50 px-1.5 py-0.5 rounded text-amber-700">{term('loanword')}</span>}
                                                            {entry.source_language && <span className="text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700">{term(entry.source_language)}</span>}
                                                            {parseRelationshipItems(entry.alternative_forms).length > 0 && (
                                                                <span className="text-[10px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-700">
                                                                    ALT {parseRelationshipItems(entry.alternative_forms).length}
                                                                </span>
                                                            )}
                                                            {parseTags(entry.tags).map((tag) => (
                                                                <span key={tag} className="text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-400">{tag}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button type="button" onClick={() => { setEditEntry(entry); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                                                            <button type="button" onClick={() => handleDelete(entry.id, entry.headword)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                        </section>
                    ))}
                </div>
            )}

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    initialForm={initialFormData ?? undefined}
                    onClose={() => {
                        setShowForm(false);
                        setInitialFormData(null);
                        if (createEntryRequested) clearCreateParams();
                    }}
                    onSaved={() => {
                        setShowForm(false);
                        setInitialFormData(null);
                        if (createEntryRequested) clearCreateParams();
                        load();
                    }}
                    getToken={getToken}
                />
            )}

            {selectedIds.size > 0 && (
                <WorkspaceBulkActionsBar
                    count={selectedIds.size}
                    selectedLabel={term('selected-entries')}
                    clearLabel={term('clear-selection')}
                    deleteLabel={term('delete-all')}
                    onClear={() => setSelectedIds(new Set())}
                    onDelete={handleBulkDelete}
                />
            )}
        </div>
    );
}

function parseTags(tags: unknown): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map((tag) => String(tag));
    if (typeof tags !== 'string') return [];

    try {
        if (tags.startsWith('[')) {
            const parsed = JSON.parse(tags) as unknown;
            return Array.isArray(parsed) ? parsed.map((tag) => String(tag)) : [];
        }
    } catch {
        return [];
    }

    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function parseRelationshipItems(value: unknown): Array<{ id?: string; headword?: string }> {
    if (!value) return [];
    if (Array.isArray(value)) return value as Array<{ id?: string; headword?: string }>;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed as Array<{ id?: string; headword?: string }> : [];
    } catch {
        return [];
    }
}
