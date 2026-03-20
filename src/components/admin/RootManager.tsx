import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { CheckSquare, Edit2, Plus, RefreshCw, Square, Trash2 } from 'lucide-react';
import { adminBulkDeleteRoots, adminDeleteRoot, adminListRoots } from '@/lib/api';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { RootFormModal } from '@/components/admin/RootFormModal';
import { WorkspaceViewToggle } from '@/components/admin/workspace/WorkspaceViewToggle';
import { WorkspaceBulkActionsBar } from '@/components/admin/workspace/WorkspaceBulkActionsBar';
import { WorkspaceEmptyState } from '@/components/admin/workspace/WorkspaceEmptyState';
import { WorkspaceFeedbackBanner } from '@/components/admin/workspace/WorkspaceFeedbackBanner';
import { WorkspaceToolbar } from '@/components/admin/workspace/WorkspaceToolbar';
import { cn } from '@/lib/utils';
import { resolveTagLabel } from '@/lib/tagLabel';

interface AdminRootItem {
    id: string;
    consonants: string;
    gloss?: string;
    glosses?: unknown;
    source?: string;
    strength?: string;
    weak_class?: string;
    vowel_set_perf?: string;
    vowel_set_impf?: string;
    vowel_set_imp?: string;
    tags?: unknown;
    synonyms?: unknown;
    antonyms?: unknown;
    created_at?: string;
}

export function RootManager() {
    const { getToken } = useClerkAuth();
    const { term } = useLinguisticMode();
    const [searchParams, setSearchParams] = useSearchParams();

    const [roots, setRoots] = useState<AdminRootItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editRoot, setEditRoot] = useState<AdminRootItem | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const createRootRequested = searchParams.get('create') === '1';
    const prefillConsonants = searchParams.get('consonants') || searchParams.get('q') || '';

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        window.setTimeout(() => setToast(null), 3500);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const res = await adminListRoots(token, query) as { roots?: AdminRootItem[] };
            setRoots(res.roots ?? []);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        } finally {
            setLoading(false);
        }
    }, [getToken, query, showToast]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!createRootRequested) return;
        setShowAdd(true);
    }, [createRootRequested]);

    const clearCreateParams = useCallback(() => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('create');
            next.delete('consonants');
            next.delete('headword');
            next.delete('root');
            return next;
        });
    }, [setSearchParams]);

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
            if (prev.size === roots.length) return new Set();
            return new Set(roots.map((root) => root.id));
        });
    };

    const handleDelete = async (id: string, consonants: string) => {
        if (!confirm(term('delete-root-confirm').replace('{cons}', consonants))) return;

        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminDeleteRoot(token, id);
            showToast(term('root-deleted') || 'Root deleted');
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
            await adminBulkDeleteRoots(token, Array.from(selectedIds));
            setSelectedIds(new Set());
            showToast(term('items-deleted').replace('{count}', count.toString()));
            load();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        }
    };

    const noResults = !loading && roots.length === 0;

    const toolbarCount = useMemo(() => `${roots.length} ${term('found')}`, [roots.length, term]);

    return (
        <div className="space-y-4">
            <WorkspaceToolbar
                heading={term('roots')}
                countText={toolbarCount}
                controls={(
                    <>
                        <WorkspaceViewToggle viewMode={viewMode} onChange={setViewMode} />
                        <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} className={cn(loading && 'animate-spin')} />}>
                            {term('refresh')}
                        </Button>
                        <Button size="sm" onClick={() => setShowAdd(true)} leftIcon={<Plus size={14} />}>
                            {term('new-root')}
                        </Button>
                    </>
                )}
                filters={<SearchInput value={query} onChange={setQuery} onSubmit={load} placeholder={`${term('search-root')}...`} />}
            />

            {toast && <WorkspaceFeedbackBanner message={toast.msg} tone={toast.ok ? 'success' : 'error'} />}

            {loading && roots.length === 0 ? (
                <div className="flex justify-center py-16"><Spinner /></div>
            ) : noResults ? (
                <WorkspaceEmptyState
                    title={query ? term('no-results-found').replace('{q}', query) : term('no-results-found').replace(" for '{q}'", '').replace(" għal '{q}'", '')}
                    actionLabel={query ? term('clear-selection') : term('new-root')}
                    onAction={query ? () => setQuery('') : () => setShowAdd(true)}
                />
            ) : viewMode === 'list' ? (
                <Card className="overflow-hidden border-border-light overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-soft border-b border-border-light">
                            <tr>
                                <th className="p-4 w-10">
                                    <button type="button" onClick={toggleSelectAll} className="text-black/20 hover:text-black/40">
                                        {selectedIds.size === roots.length && roots.length > 0 ? <CheckSquare size={16} className="text-link" /> : <Square size={16} />}
                                    </button>
                                </th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('consonants')}</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('meaning')}</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('class')}</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('vowels')}</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('source')}</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Tags</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('thesaurus')}</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('date')}</th>
                                <th className="text-right p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roots.map((root) => (
                                <tr key={root.id} className={cn('border-b border-border-light last:border-0 transition-colors', selectedIds.has(root.id) ? 'bg-link/3' : 'hover:bg-surface-soft')}>
                                    <td className="p-4">
                                        <button type="button" onClick={() => toggleSelect(root.id)} className={cn('transition-colors', selectedIds.has(root.id) ? 'text-link' : 'text-black/10 hover:text-black/20')}>
                                            {selectedIds.has(root.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>
                                    </td>
                                    <td className="p-4 font-serif font-bold text-link text-lg">
                                        <Link to={`/root/${root.consonants}`} className="hover:underline">{root.consonants}</Link>
                                    </td>
                                    <td className="p-4 text-black/80">{renderGloss(root, term)}</td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded-full font-bold uppercase text-black/50">
                                            {root.strength || 'strong'} {root.weak_class ? `- ${root.weak_class}` : ''}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] text-black/30 font-bold uppercase">P:{root.vowel_set_perf || 'a-a'}</span>
                                            <span className="text-[9px] text-black/30 font-bold uppercase">F:{root.vowel_set_impf || 'i-a'}</span>
                                            <span className="text-[9px] text-black/30 font-bold uppercase">M:{root.vowel_set_imp || 'o-o'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-black/60 italic">{root.source || term('none')}</td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                                            {parseStringArray(root.tags).map((tag) => (
                                                <span key={tag} className="px-1.5 py-0.5 bg-black/5 text-black/40 rounded text-[9px] font-bold uppercase tracking-widest border border-black/5">
                                                    {resolveTagLabel(tag, term)}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {renderThesaurusCounts(root, term)}
                                    </td>
                                    <td className="p-4 text-black/40 text-xs">{root.created_at?.slice(0, 10)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setEditRoot(root)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                            <button type="button" onClick={() => handleDelete(root.id, root.consonants)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {roots.map((root) => {
                        const { synonymCount, antonymCount } = getThesaurusCounts(root);
                        return (
                            <article
                                key={root.id}
                                className={cn(
                                    'group bg-white border rounded-2xl p-5 transition-all duration-300 relative flex flex-col justify-between h-full',
                                    selectedIds.has(root.id) ? 'border-link ring-1 ring-link/20 bg-link/2' : 'border-border-light hover:shadow-xl hover:shadow-link/5',
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleSelect(root.id)}
                                    className={cn(
                                        'absolute top-3 left-3 z-10 p-1 rounded-md transition-all',
                                        selectedIds.has(root.id) ? 'text-link bg-white shadow-sm' : 'opacity-0 group-hover:opacity-100 text-black/20 hover:text-black/40 bg-black/5',
                                    )}
                                >
                                    {selectedIds.has(root.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                                <div className="flex justify-between items-start mb-3 ml-6 group-hover:ml-0 transition-all">
                                    <Link to={`/root/${root.consonants}`} className="ml-1">
                                        <h4 className="font-serif text-2xl font-bold text-link group-hover:underline">{root.consonants}</h4>
                                    </Link>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => setEditRoot(root)} className="p-1.5 text-link hover:bg-link/10 rounded-lg"><Edit2 size={14} /></button>
                                        <button type="button" onClick={() => handleDelete(root.id, root.consonants)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <p className="text-sm text-black/60 mb-4 h-10 line-clamp-2">{renderGloss(root, term)}</p>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex gap-1">
                                        {synonymCount > 0 && <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{synonymCount}</span>}
                                        {antonymCount > 0 && <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{antonymCount}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest">{root.strength || 'strong'}</span>
                                        <Badge variant="source">{root.source || 'Standard'}</Badge>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {showAdd && (
                <RootFormModal
                    data={prefillConsonants ? { consonants: prefillConsonants } : {}}
                    onClose={() => {
                        setShowAdd(false);
                        if (createRootRequested) clearCreateParams();
                    }}
                    onSaved={() => {
                        setShowAdd(false);
                        if (createRootRequested) clearCreateParams();
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

function renderGloss(root: AdminRootItem, term: (key: string) => string) {
    if (!root.gloss) return <span className="text-black/20 italic">{term('missing')}</span>;
    if (typeof root.gloss === 'string' && root.gloss.includes('[object Object]')) {
        return <span className="text-red-400 italic">{term('corrupted-data')}</span>;
    }

    try {
        const parsed = JSON.parse(root.gloss) as unknown;
        if (Array.isArray(parsed) && parsed[0]) {
            const first = parsed[0] as unknown;
            if (typeof first === 'object' && first !== null) {
                const gloss = first as Record<string, string>;
                return (gloss.en || gloss.mt) ? `${gloss.en || ''}${gloss.mt ? ` / ${gloss.mt}` : ''}` : <span className="text-black/20 italic">{term('missing')}</span>;
            }
            return String(first);
        }
    } catch {
        return root.gloss || <span className="text-black/20 italic">{term('missing')}</span>;
    }

    return root.gloss || <span className="text-black/20 italic">{term('missing')}</span>;
}

function parseStringArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function getThesaurusCounts(root: AdminRootItem) {
    const synonymCount = parseStringArray(root.synonyms).length;
    const antonymCount = parseStringArray(root.antonyms).length;
    return { synonymCount, antonymCount };
}

function renderThesaurusCounts(root: AdminRootItem, term: (key: string) => string) {
    const { synonymCount, antonymCount } = getThesaurusCounts(root);

    if (synonymCount === 0 && antonymCount === 0) {
        return <span className="text-[10px] text-black/20 italic">{term('none')}</span>;
    }

    return (
        <div className="flex gap-1.5 mt-0.5">
            {synonymCount > 0 && <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{synonymCount} {term('synonym-abbr')}</span>}
            {antonymCount > 0 && <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{antonymCount} {term('antonym-abbr')}</span>}
        </div>
    );
}
