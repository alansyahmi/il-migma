import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { ShieldAlert, FileText, Layers, Settings, Database, GitBranch } from 'lucide-react';
import { DbTools } from '@/components/admin/DbTools';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { EntryManager } from '@/components/admin/EntryManager';
import { RootManager } from '@/components/admin/RootManager';
import { StemManager } from '@/components/admin/StemManager';
import { cn } from '@/lib/utils';

export function Admin() {
    const { tier, isTrueAdmin } = useAuth();
    const { getToken } = useClerkAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get('tab') as 'entries' | 'roots' | 'stems' | 'settings' | 'db') || 'entries';

    const setTab = (nextTab: 'entries' | 'roots' | 'stems' | 'settings' | 'db') => {
        setSearchParams({ tab: nextTab });
    };

    const hasAdminRights = isTrueAdmin || tier === 'enterprise';
    const { term } = useLinguisticMode();

    useEffect(() => {
        const tabLabels: Record<string, string> = {
            entries: term('entries'),
            roots: term('roots'),
            stems: 'Stems',
            settings: term('settings'),
            db: term('db-tools'),
        };
        const activeLabel = tabLabels[tab] || term('dashboard');
        document.title = `Admin: ${activeLabel} | Il-Migma'`;
    }, [tab, term]);

    return (
        <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8 space-y-6">
            {!hasAdminRights && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <ShieldAlert className="shrink-0" size={20} />
                    <div className="text-sm">
                        <span className="font-bold">{term('attention')}</span> {term('admin-warning')}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 pb-4">
                <h1 className="font-serif text-3xl font-bold text-black">{term('admin-dashboard')}</h1>
                <div className="flex flex-wrap gap-1 bg-black/5 p-1 rounded-xl">
                    <button
                        onClick={() => setTab('entries')}
                        className={cn(
                            'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
                            tab === 'entries' ? 'bg-white text-link shadow-sm' : 'text-black/40 hover:text-black/60',
                        )}
                    >
                        <FileText size={16} /> {term('entries')}
                    </button>
                    <button
                        onClick={() => setTab('roots')}
                        className={cn(
                            'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
                            tab === 'roots' ? 'bg-white text-link shadow-sm' : 'text-black/40 hover:text-black/60',
                        )}
                    >
                        <Layers size={16} /> {term('roots')}
                    </button>
                    <button
                        onClick={() => setTab('stems')}
                        className={cn(
                            'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
                            tab === 'stems' ? 'bg-white text-link shadow-sm' : 'text-black/40 hover:text-black/60',
                        )}
                    >
                        <GitBranch size={16} /> Stems
                    </button>
                    <button
                        onClick={() => setTab('settings')}
                        className={cn(
                            'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
                            tab === 'settings' ? 'bg-white text-link shadow-sm' : 'text-black/40 hover:text-black/60',
                        )}
                    >
                        <Settings size={16} /> {term('settings')}
                    </button>
                    <button
                        onClick={() => setTab('db')}
                        className={cn(
                            'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
                            tab === 'db' ? 'bg-white text-link shadow-sm' : 'text-black/40 hover:text-black/60',
                        )}
                    >
                        <Database size={16} /> {term('db-tools')}
                    </button>
                </div>
            </div>

            {tab === 'entries' && <EntryManager />}
            {tab === 'roots' && <RootManager />}
            {tab === 'stems' && <StemManager />}
            {tab === 'settings' && <AdminSettings />}
            {tab === 'db' && <DbTools getToken={getToken} />}
        </div>
    );
}
