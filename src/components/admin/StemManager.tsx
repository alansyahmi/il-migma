import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { adminListStems } from '@/lib/api';
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

interface AdminStemItem {
    id: string;
    stem_string: string;
    class_type: string;
    is_hybrid: boolean;
    root: string | null;
    agentive_suffix: string | null;
    entry_count: number;
    created_at?: string;
}

export function StemManager() {
    const { getToken } = useClerkAuth();
    const { term } = useLinguisticMode();

    const [stems, setStems] = useState<AdminStemItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

    const noResults = !loading && stems.length === 0;

    const toolbarCount = useMemo(() => `${stems.length} ${term('found')}`, [stems.length, term]);

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
                    </>
                )}
                filters={<SearchInput value={query} onChange={setQuery} onSubmit={load} placeholder="Search stems..." />}
            />

            {toast && <WorkspaceFeedbackBanner message={toast.msg} tone={toast.ok ? 'success' : 'error'} />}

            {loading && stems.length === 0 ? (
                <div className="flex justify-center py-16"><Spinner /></div>
            ) : noResults ? (
                <WorkspaceEmptyState
                    title={query ? term('no-results-found').replace('{q}', query) : term('no-results-found').replace(" for '{q}'", '').replace(" għal '{q}'", '')}
                    actionLabel={query ? term('clear-selection') : undefined}
                    onAction={query ? () => setQuery('') : undefined}
                />
            ) : viewMode === 'list' ? (
                <Card className="overflow-hidden border-border-light overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-soft border-b border-border-light">
                            <tr>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Stem String</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Class</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Hybrid</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Reanalysed Root</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Agentive Suffix</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">Assoc. Entries</th>
                                <th className="text-left p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('date')}</th>
                                <th className="text-right p-4 text-xs font-bold text-black/40 uppercase tracking-tighter">{term('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stems.map((stem) => (
                                <tr key={stem.id} className="border-b border-border-light last:border-0 hover:bg-surface-soft transition-colors">
                                    <td className="p-4 font-serif font-bold text-link text-lg">
                                        <Link to={`/stem/${stem.stem_string}`} className="hover:underline">-{stem.stem_string}-</Link>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded-full font-bold uppercase text-black/50">
                                            -{stem.class_type || 'ar'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {stem.is_hybrid ? (
                                            <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase">Yes</span>
                                        ) : (
                                            <span className="text-[10px] bg-black/5 text-black/40 font-bold px-2 py-0.5 rounded-full uppercase">No</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-black/60 font-serif">{stem.root || '-'}</td>
                                    <td className="p-4 text-black/60 italic">{stem.agentive_suffix ? `-${stem.agentive_suffix}` : '-'}</td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-link/10 text-link px-2 py-0.5 rounded-full font-bold uppercase">
                                            {stem.entry_count} entries
                                        </span>
                                    </td>
                                    <td className="p-4 text-black/40 text-xs">{stem.created_at?.slice(0, 10)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link to={`/stem/${stem.stem_string}`} className="p-1.5 text-link hover:bg-link/10 rounded flex items-center gap-1 text-xs font-semibold">
                                                <ExternalLink size={14} /> View Engine
                                            </Link>
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
                            <div className="flex justify-between items-start mb-3 transition-all">
                                <Link to={`/stem/${stem.stem_string}`}>
                                    <h4 className="font-serif text-2xl font-bold text-link group-hover:underline">-{stem.stem_string}-</h4>
                                </Link>
                                <span className="text-[10px] bg-link/10 text-link px-1.5 py-0.5 rounded-md font-bold uppercase">
                                    {stem.entry_count} E
                                </span>
                            </div>

                            <div className="text-sm text-black/60 mb-4 h-16 flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-black/40 uppercase">Class:</span>
                                    <span>-{stem.class_type || 'ar'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-black/40 uppercase">Hybrid:</span>
                                    <span>{stem.is_hybrid ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-black/40 uppercase">Root:</span>
                                    <span className="font-serif">{stem.root || '-'}</span>
                                </div>
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
        </div>
    );
}
