import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Edit2, ExternalLink, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { adminDeleteStem, adminGetStem, adminListStems, adminSyncStemEtymology } from '@/lib/api';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { WorkspaceViewToggle } from '@/components/admin/workspace/WorkspaceViewToggle';
import { WorkspaceEmptyState } from '@/components/admin/workspace/WorkspaceEmptyState';
import { WorkspaceFeedbackBanner } from '@/components/admin/workspace/WorkspaceFeedbackBanner';
import { WorkspaceToolbar } from '@/components/admin/workspace/WorkspaceToolbar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { StemFormModal } from '@/components/admin/StemFormModal';
import { formatStemDisplay } from '@/lib/stemDefaults';
import type { StemFormData } from '@/lib/adminUtils';

interface AdminStemItem {
    id: string;
    stem_string: string;
    class_type: string;
    is_hybrid: boolean;
    root: string | null;
    agentive_suffix: string | null;
    entry_count: number;
    entry_ids?: string[];
    tags?: string[] | string;
    source?: string | null;
    glosses?: unknown;
    etymology?: unknown;
    synonyms?: unknown;
    antonyms?: unknown;
    related_stems?: unknown;
    created_at?: string;
    updated_at?: string;
}

export function StemManager() {
    const { getToken } = useClerkAuth();
    const { term } = useLinguisticMode();
    const [searchParams, setSearchParams] = useSearchParams();

    const [stems, setStems] = useState<AdminStemItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [editStem, setEditStem] = useState<AdminStemItem | null>(null);
    const [showAddStem, setShowAddStem] = useState(false);
    const [initialFormData, setInitialFormData] = useState<Record<string, string> | null>(null);
    const [syncing, setSyncing] = useState(false);
    const createStemRequested = searchParams.get('create') === '1';
    const prefillStemString = searchParams.get('stem_string') || searchParams.get('q') || '';

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        window.setTimeout(() => setToast(null), 3500);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const res = await adminListStems(token, query) as { stems?: AdminStemItem[] };
            setStems(res.stems ?? []);
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
        if (!createStemRequested) return;
        setEditStem(null);
        setInitialFormData(prefillStemString ? { stem_string: prefillStemString } : {});
        setShowAddStem(true);
    }, [createStemRequested, prefillStemString]);

    const clearCreateParams = useCallback(() => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('create');
            next.delete('stem_string');
            next.delete('q');
            return next;
        });
    }, [setSearchParams]);

    const noResults = !loading && stems.length === 0;

    const toolbarCount = useMemo(() => `${stems.length} ${term('found')}`, [stems.length, term]);
    const handleDelete = useCallback(async (stem: AdminStemItem) => {
        if (!confirm(`Delete stem "${stem.stem_string}"? This removes the canonical stem record.`)) return;

        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminDeleteStem(token, stem.stem_string);
            showToast(`Stem "${stem.stem_string}" deleted.`);
            load();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        }
    }, [getToken, load, showToast]);

    const openEdit = useCallback(async (stemString: string) => {
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const res = await adminGetStem(token, stemString);
            setEditStem(res.stem as unknown as AdminStemItem);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        }
    }, [getToken, showToast]);

    const syncEtymology = useCallback(async () => {
        if (!window.confirm('Normalize all stem etymology records to the new four-field shape?')) return;

        setSyncing(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const res = await adminSyncStemEtymology(token, true);
            showToast(`Stem etymology synced: ${res.updated} updated, ${res.skipped} skipped.`);
            await load();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        } finally {
            setSyncing(false);
        }
    }, [getToken, load, showToast]);

    return (
        <div className="space-y-4">
            <WorkspaceToolbar
                heading="Virtual Stems (Zokk)"
                countText={toolbarCount}
                controls={(
                    <>
                        <WorkspaceViewToggle viewMode={viewMode} onChange={setViewMode} />
                        <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw size={14} className={cn(loading && 'animate-spin')} />}>
                            {term('refresh')}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={syncEtymology} loading={syncing}>
                            Sync Etymology
                        </Button>
                        <Button size="sm" onClick={() => setShowAddStem(true)} leftIcon={<Plus size={14} />}>
                            New Stem
                        </Button>
                    </>
                )}
                filters={<SearchInput value={query} onChange={setQuery} onSubmit={load} placeholder="Search stems..." />}
            />

            {toast && <WorkspaceFeedbackBanner message={toast.msg} tone={toast.ok ? 'success' : 'error'} />}

            {loading && stems.length === 0 ? (
                <div className="flex justify-center py-16"><Spinner /></div>
            ) : noResults ? (
                <WorkspaceEmptyState
                    title={query ? term('no-results-found', { q: query }) : term('no-results-found-empty')}
                    actionLabel={query ? term('clear-selection') : 'New Stem'}
                    onAction={query ? () => setQuery('') : () => setShowAddStem(true)}
                />
            ) : viewMode === 'list' ? (
                <Card className="overflow-hidden border-border-light overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-soft border-b border-border-light">
                            <tr>
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
                            {stems.map((stem) => (
                                <tr key={stem.id} className="border-b border-border-light last:border-0 hover:bg-surface-soft transition-colors">
                                    <td className="p-4 font-serif font-bold text-link text-lg">
                                        <Link to={`/stem/${stem.stem_string}`} className="hover:underline">{formatStemDisplay(stem.stem_string)}</Link>
                                    </td>
                                    <td className="p-4 text-black/80">
                                        {renderStemMeaning(stem, term)}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded-full font-bold uppercase text-black/50">
                                            -{stem.class_type || 'ar'} {stem.is_hybrid ? '- hybrid' : ''}
                                        </span>
                                    </td>
                                    <td className="p-4 text-black/60 italic">{stem.agentive_suffix ? `-${stem.agentive_suffix}` : term('none')}</td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded-full font-bold uppercase text-black/50">
                                            {(stem.root || term('none'))}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                                            <span className={cn(
                                                'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border',
                                                stem.is_hybrid ? 'bg-green-50 text-green-700 border-green-100' : 'bg-black/5 text-black/40 border-black/5',
                                            )}>
                                                {stem.is_hybrid ? 'Hybrid' : 'Standard'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-link/10 text-link px-2 py-0.5 rounded-full font-bold uppercase">
                                            {stem.entry_count} entries
                                        </span>
                                    </td>
                                    <td className="p-4 text-black/40 text-xs">{stem.created_at?.slice(0, 10)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => openEdit(stem.stem_string)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                            <button type="button" onClick={() => handleDelete(stem)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stems.map((stem) => (
                        <article
                            key={stem.id}
                            className="group bg-white border border-border-light rounded-2xl p-5 hover:shadow-xl hover:shadow-link/5 transition-all duration-300 relative flex flex-col justify-between h-full"
                        >
                            <div className="flex justify-between items-start gap-3 mb-3 transition-all">
                                <Link to={`/stem/${stem.stem_string}`} className="min-w-0">
                                    <h4 className="font-serif text-2xl font-bold text-link group-hover:underline break-words">{formatStemDisplay(stem.stem_string)}</h4>
                                </Link>
                                <div className="flex gap-1 items-center">
                                    <span className="text-[10px] bg-link/10 text-link px-1.5 py-0.5 rounded-md font-bold uppercase">
                                        {stem.entry_count} E
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => openEdit(stem.stem_string)} className="p-1.5 text-link hover:bg-link/10 rounded-lg"><Edit2 size={14} /></button>
                                        <button type="button" onClick={() => handleDelete(stem)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-sans text-black/40 tracking-[0.18em] uppercase">{term('stem')}</p>
                                    <p className="font-serif font-medium">{formatStemDisplay(stem.stem_string)}</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[11px] font-sans text-black/40 tracking-[0.18em] uppercase">{term('class')}</p>
                                    <p className="capitalize font-medium">-{stem.class_type || 'ar'}</p>
                                </div>

                                {stem.root && (
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-sans text-black/40 tracking-[0.18em] uppercase">{term('reanalysed-root')}</p>
                                        <p className="font-sans font-medium">{stem.root}</p>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <p className="text-[11px] font-sans text-black/40 tracking-[0.18em] uppercase">{term('is-hybrid')}</p>
                                    <p>{stem.is_hybrid ? term('yes') : term('no')}</p>
                                </div>

                                <p className="text-sm text-black/60 italic line-clamp-2 min-h-[2.5rem] pt-1">
                                    {renderStemMeaning(stem, term)}
                                </p>
                            </div>

                            <div className="flex items-center justify-end mt-auto pt-2 border-t border-border-light">
                                <Link to={`/stem/${stem.stem_string}`} className="text-link hover:text-blue-700 text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                                    Open Engine <ExternalLink size={12} />
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {showAddStem && (
                <StemFormModal
                    data={initialFormData || {}}
                    isNew
                    onClose={() => {
                        setShowAddStem(false);
                        clearCreateParams();
                    }}
                    onSaved={(_newData: StemFormData) => {
                        setShowAddStem(false);
                        clearCreateParams();
                        setInitialFormData(null);
                        load();
                    }}
                    getToken={getToken}
                />
            )}

            {editStem && (
                <StemFormModal
                    data={editStem}
                    onClose={() => setEditStem(null)}
                    onSaved={(_newData: StemFormData) => {
                        setEditStem(null);
                        load();
                    }}
                    getToken={getToken}
                />
            )}
        </div>
    );
}

function renderStemMeaning(stem: AdminStemItem, term: (key: string) => string) {
    const glosses = Array.isArray(stem.glosses)
        ? stem.glosses
        : typeof stem.glosses === 'string'
            ? safeParseJson(stem.glosses, [])
            : [];

    const firstGloss = glosses.find((g: any) => g && (g.en || g.mt));
    const meaning = firstGloss?.en || firstGloss?.mt || '';

    if (meaning) {
        return <span>{meaning}</span>;
    }

    if (stem.root) {
        return <span className="text-black/20 italic">{stem.root}</span>;
    }

    return <span className="text-black/20 italic">{term('missing')}</span>;
}

function safeParseJson<T>(value: string, fallback: T): T {
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}
