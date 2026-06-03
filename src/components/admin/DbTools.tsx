import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Database, Table, CheckCircle2, AlertCircle, Info, Download,
    Play, Trash2, GitMerge, RefreshCw, Lock, Unlock, Search,
    ChevronRight, ChevronDown, FileJson, FileSpreadsheet,
    Link as LinkIcon, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    adminDbQuery, adminDbExport, adminDbIntegrityCheck,
    adminDbMergeRoots, adminDbTableInfo, adminDbExportBundle
} from '@/lib/api';

interface DbToolsProps {
    getToken: () => Promise<string | null>;
}

type DbToolsTab = 'console' | 'export' | 'integrity' | 'bulk';

const DEFAULT_DB_TOOLS_TAB: DbToolsTab = 'console';

function isDbToolsTab(value: string | null): value is DbToolsTab {
    return value === 'console' || value === 'export' || value === 'integrity' || value === 'bulk';
}

export function DbTools({ getToken }: DbToolsProps) {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const rawTab = searchParams.get('dbtab');
    const activeTab = isDbToolsTab(rawTab)
        ? rawTab
        : DEFAULT_DB_TOOLS_TAB;
    const [tables, setTables] = useState<any[]>([]);

    const loadTableInfo = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const res = await adminDbTableInfo(token);
            setTables(res.tables || []);
        } catch (e) {
            console.error("Failed to load table info", e);
        }
    }, [getToken]);

    useEffect(() => {
        loadTableInfo();
    }, [loadTableInfo]);

    const tabs = [
        { id: 'console', label: t('SQL Console', 'Konsola SQL'), icon: Database },
        { id: 'export', label: t('Export', 'Esporta'), icon: Download },
        { id: 'integrity', label: t('Integrity', 'Integrità'), icon: CheckCircle2 },
        { id: 'bulk', label: t('Bulk Ops', 'Operazzjonijiet'), icon: GitMerge },
    ];

    const setActiveTab = (nextTab: DbToolsTab) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('dbtab', nextTab);
        setSearchParams(nextParams);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap gap-2 p-1 bg-black/5 rounded-2xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as DbToolsTab)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            activeTab === tab.id
                                ? "bg-white text-[#1034A6] shadow-sm"
                                : "text-black/40 hover:text-black/60 hover:bg-black/5"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <Card className="min-h-[500px] border-[#ede9e1] overflow-hidden flex flex-col">
                {activeTab === 'console' && <SqlConsole getToken={getToken} />}
                {activeTab === 'export' && <DataExport getToken={getToken} tables={tables} />}
                {activeTab === 'integrity' && <IntegrityCheck getToken={getToken} />}
                {activeTab === 'bulk' && <BulkOperations getToken={getToken} tables={tables} />}
            </Card>
        </div>
    );
}

// ── SUB-COMPONENT: SQL Console ────────────────────────────────────────────────
function SqlConsole({ getToken }: { getToken: () => Promise<string | null> }) {
    const { t } = useLanguage();
    const [sql, setSql] = useState('SELECT * FROM roots LIMIT 10;');
    const [allowWrite, setAllowWrite] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRun = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            const res = await adminDbQuery(token!, sql, allowWrite);
            setResult(res);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full flex-1">
            <div className="p-4 bg-[#f9f7f3] border-b border-[#ede9e1] space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-black uppercase tracking-tight flex items-center gap-2">
                        <Database size={16} className="text-[#1034A6]" />
                        {t('Query Editor', 'Editur tal-Queries')}
                    </h3>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div
                                onClick={() => setAllowWrite(!allowWrite)}
                                className={cn(
                                    "p-1 rounded-md transition-all",
                                    allowWrite ? "bg-amber-100 text-amber-700" : "bg-black/5 text-black/30 group-hover:bg-black/10"
                                )}
                            >
                                {allowWrite ? <Unlock size={14} /> : <Lock size={14} />}
                            </div>
                            <span className={cn("text-xs font-bold uppercase tracking-tighter", allowWrite ? "text-amber-700" : "text-black/30")}>
                                {t('Write Mode', 'Mod tal-Kitba')}
                            </span>
                        </label>
                        <Button
                            onClick={handleRun}
                            disabled={loading || !sql.trim()}
                            leftIcon={loading ? <Spinner size="sm" /> : <Play size={14} />}
                            size="sm"
                            className={cn(allowWrite && "bg-amber-600 hover:bg-amber-700 border-amber-700")}
                        >
                            {t('Execute', 'Eżegwixxi')}
                        </Button>
                    </div>
                </div>

                <div className="relative group">
                    <textarea
                        value={sql}
                        onChange={e => setSql(e.target.value)}
                        placeholder="SELECT * FROM table..."
                        className="w-full h-40 p-4 font-mono text-sm bg-white border border-[#ede9e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1034A6] transition-all resize-none shadow-inner"
                        spellCheck={false}
                    />
                    <div className="absolute bottom-3 right-3 opacity-20 group-hover:opacity-100 transition-opacity">
                        <code className="text-[10px] font-bold text-black/40">Ctrl + Enter</code>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[300px] bg-white overflow-auto relative p-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm">{t('Execution Error', 'Żball fl-Eżekuzzjoni')}</p>
                            <p className="text-xs mt-1 font-mono">{error}</p>
                        </div>
                    </div>
                )}

                {!error && result && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between text-[11px] font-bold text-black/30 uppercase tracking-widest px-1">
                            <div className="flex gap-4">
                                <span>{result.rows?.length ?? 0} {t('Rows Returned', 'Ringieli')}</span>
                                {result.rowsAffected > 0 && <span className="text-amber-600">{result.rowsAffected} {t('Rows Affected', 'Ringieli milquta')}</span>}
                            </div>
                            <span>{result.elapsed}ms</span>
                        </div>

                        {result.columns?.length > 0 ? (
                            <div className="border border-[#ede9e1] rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-[#f9f7f3] border-b border-[#ede9e1]">
                                        <tr>
                                            {result.columns.map((colName: string) => (
                                                <th key={colName} className="p-3 font-bold text-black/50 border-r last:border-0 border-[#ede9e1]">{colName}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede9e1]">
                                        {result.rows.map((row: any[], i: number) => (
                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                {result.columns.map((_: any, j: number) => (
                                                    <td key={j} className="p-3 font-medium text-black/70 border-r last:border-0 border-[#ede9e1] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={String(row[j])}>
                                                        {row[j] === null ? <em className="text-black/20 italic">null</em> : String(row[j])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : result.rowsAffected > 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-black/40 italic">
                                <CheckCircle2 size={32} className="text-green-500 mb-2 opacity-100" />
                                <p>{t('Command executed successfully', 'Il-kmand twettaq b\'suċċess')}</p>
                                <p className="text-[10px] mt-1 uppercase font-bold tracking-tighter">{result.rowsAffected} {t('rows affected', 'ringieli milquta')}</p>
                            </div>
                        ) : null}
                    </div>
                )}

                {!error && !result && !loading && (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-black/20 italic font-serif">
                        <Database size={40} className="mb-4 opacity-10" />
                        <p className="text-lg">{t('Run a query to see results', 'Agħmel query biex tara r-riżultati')}</p>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center h-full py-20">
                        <Spinner size="lg" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── SUB-COMPONENT: Data Export ────────────────────────────────────────────────
function DataExport({ getToken, tables }: { getToken: () => Promise<string | null>; tables: any[] }) {
    const { t } = useLanguage();
    const [selectedTable, setSelectedTable] = useState('');
    const [loading, setLoading] = useState(false);
    const [bundleLoading, setBundleLoading] = useState(false);
    const [preview, setPreview] = useState<any>(null);

    const downloadBlob = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadPreview = (format: 'json' | 'csv') => {
        if (!preview) return;
        const baseName = `${preview.table}_export_${new Date().toISOString().slice(0, 10)}`;

        if (format === 'json') {
            downloadBlob(JSON.stringify(preview.rows, null, 2), `${baseName}.json`, 'application/json');
            return;
        }

        const escapeCsv = (val: any) => {
            const s = String(val ?? '');
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };
        const header = preview.columns.join(',');
        const rows = preview.rows.map((row: any[]) => row.map(escapeCsv).join(',')).join('\n');
        downloadBlob(`${header}\n${rows}`, `${baseName}.csv`, 'text/csv');
    };

    const downloadBundle = async () => {
        setBundleLoading(true);
        try {
            const token = await getToken();
            const bundle = await adminDbExportBundle(token!, {
                preset: 'entry-linking',
            });
            downloadBlob(
                JSON.stringify(bundle, null, 2),
                `entry-linking_bundle_${new Date().toISOString().slice(0, 10)}.json`,
                'application/json',
            );
        } catch (e) {
            console.error(e);
        } finally {
            setBundleLoading(false);
        }
    };

    const handlePreview = async (table: string) => {
        if (!table) return;
        setLoading(true);
        setSelectedTable(table);
        try {
            const token = await getToken();
            const res = await adminDbExport(token!, table);
            setPreview(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="max-w-md space-y-4">
                <h3 className="text-lg font-bold text-black">{t('Export Data', 'Esporta d-Data')}</h3>
                <p className="text-sm text-black/60">{t('Select a table to preview and download its contents.', 'Agħżel tabella biex tara u tniżżel il-kontenut tagħha.')}</p>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{t('Select Table', 'Agħżel Tabella')}</label>
                    <select
                        value={selectedTable}
                        onChange={e => handlePreview(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#ede9e1] rounded-xl text-sm focus:ring-2 focus:ring-[#1034A6] focus:outline-none transition-all"
                    >
                        <option value="">— {t('Choose a table', 'Agħżel tabella')} —</option>
                        {tables.map(t => <option key={t.name} value={t.name}>{t.name} ({t.rowCount} rows)</option>)}
                    </select>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="border border-[#1034A6]/20 text-[#1034A6]"
                        leftIcon={<Download size={14} />}
                        onClick={downloadBundle}
                        disabled={bundleLoading}
                    >
                        {bundleLoading ? t('Bundling…', 'Qed jinġabar…') : t('Entries Bundle', 'Pakkett ta\' Entrati')}
                    </Button>
                    <p className="text-[11px] leading-5 text-black/45">
                        {t('Includes entries, definitions, phonetics, etymology data, roots, patterns, and linked relation tables.', 'Jinkludi l-entrati, id-definizzjonijiet, il-fonetiċi, id-data tal-etimoloġija, l-għeruq, ix-xejriet, u t-tabelli ta\' relazzjonijiet marbuta.')}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Spinner size="md" /></div>
            ) : preview ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between border-b border-black/5 pb-3">
                        <div className="flex gap-4 items-center">
                            <Badge className="bg-[#1034A6] text-white rounded-lg flex items-center gap-1.5 px-3 py-1">
                                <Table size={12} /> {preview.table}
                            </Badge>
                            <span className="text-[11px] font-bold text-black/30 uppercase tracking-widest">{preview.total} {t('Total Rows', 'Ringieli b\'kollox')}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="border border-black/10" leftIcon={<FileSpreadsheet size={14} />} onClick={() => downloadPreview('csv')}>CSV</Button>
                            <Button size="sm" variant="ghost" className="border border-black/10" leftIcon={<FileJson size={14} />} onClick={() => downloadPreview('json')}>JSON</Button>
                        </div>
                    </div>

                    <div className="border border-[#ede9e1] rounded-xl overflow-hidden shadow-sm max-h-[400px] overflow-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-[#f9f7f3] border-b border-[#ede9e1] sticky top-0 z-10">
                                <tr>
                                    {preview.columns.map((col: string) => (
                                        <th key={col} className="p-3 font-bold text-black/50 border-r border-b border-[#ede9e1]">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1]">
                                {preview.rows.slice(0, 100).map((row: any[], i: number) => (
                                    <tr key={i} className="hover:bg-blue-50/20">
                                        {row.map((cell: any, j: number) => (
                                            <td key={j} className="p-3 border-r border-[#ede9e1] text-black/70 max-w-[150px] truncate">
                                                {cell === null ? <em className="opacity-20 italic">null</em> : String(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {preview.rows.length > 100 && (
                            <div className="p-4 text-center bg-[#f9f7f3] text-[10px] font-bold text-black/30 uppercase tracking-widest border-t border-[#ede9e1]">
                                {t('Previewing first 100 rows', 'Qed tara l-ewwel 100 ringiela')}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-40 flex items-center justify-center text-black/10">
                    <Download size={48} />
                </div>
            )}
        </div>
    );
}

// ── SUB-COMPONENT: Integrity Check ──────────────────────────────────────────
function IntegrityCheck({ getToken }: { getToken: () => Promise<string | null> }) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const run = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await adminDbIntegrityCheck(token!);
            setResult(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggle = (cat: string) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 pb-6">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-black">{t('Database Integrity Scan', 'Skenn tal-Integrità')}</h3>
                    <p className="text-sm text-black/60">{t('Automatically scan for broken relationships, orphan records, and malformed data.', 'Skennja għal relazzjonijiet miksura u data mħassra.')}</p>
                </div>
                <Button
                    onClick={run}
                    disabled={loading}
                    leftIcon={loading ? <Spinner size="sm" /> : <RefreshCw size={14} className={cn(loading && "animate-spin")} />}
                    className="shadow-lg shadow-[#1034A6]/10"
                >
                    {t('Start Scan', 'Ibda Skenn')}
                </Button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-black/5 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : result ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-black/30 uppercase tracking-widest mb-4">
                        <CheckCircle2 size={12} className="text-green-500" />
                        {t('Last scan completed at', 'L-aħħar skenn sar fi')}: {new Date(result.checkedAt).toLocaleTimeString()}
                    </div>

                    {result.issues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-green-50 rounded-3xl border border-green-100 text-green-700">
                            <CheckCircle2 size={40} className="mb-4" />
                            <h4 className="font-bold text-xl font-serif italic">{t('All Healthy!', 'Kollox Sew!')}</h4>
                            <p className="text-sm mt-1">{t('No database integrity issues were found.', 'Ma nstabu l-ebda problemi fl-integrità tal-id.')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {result.issues.map((issue: any) => (
                                <div key={issue.category} className={cn(
                                    "border rounded-2xl overflow-hidden transition-all",
                                    issue.severity === 'error' ? "border-red-100 bg-red-50/30" :
                                        issue.severity === 'warning' ? "border-amber-100 bg-amber-50/30" : "border-[#ede9e1] bg-white"
                                )}>
                                    <button
                                        onClick={() => toggle(issue.category)}
                                        className="w-full flex items-center justify-between p-4 text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                issue.severity === 'error' ? "bg-red-100 text-red-600" :
                                                    issue.severity === 'warning' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                                            )}>
                                                {issue.severity === 'error' ? <AlertCircle size={18} /> :
                                                    issue.severity === 'warning' ? <AlertTriangle size={18} /> : <Info size={18} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-black group-hover:text-[#1034A6] transition-colors">{issue.category}</h4>
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-black/40 mt-0.5">
                                                    {issue.count} {t('instances found', 'każijiet sibt')}
                                                </p>
                                            </div>
                                        </div>
                                        {expanded[issue.category] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {expanded[issue.category] && (
                                        <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                {issue.details.map((detail: string, i: number) => (
                                                    <div key={i} className="flex gap-2 text-xs text-black/60 bg-white/50 p-2 rounded-lg border border-black/[0.03]">
                                                        <span className="text-black/30 mt-0.5">•</span>
                                                        <span className="font-mono">{detail}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {issue.ids && (
                                                <div className="mt-4 pt-4 border-t border-black/5 flex justify-end">
                                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" leftIcon={<Trash2 size={12} />}>
                                                        {t('Bulk Delete (Dev Only)', 'Ħassar Kollox (Dev Only)')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-10">
                    <CheckCircle2 size={64} />
                    <p className="mt-4 font-bold uppercase tracking-[0.2em]">{t('Scanning Engine Ready', 'Magna ReSti għall-iSkenn')}</p>
                </div>
            )}
        </div>
    );
}

// ── SUB-COMPONENT: Bulk Operations ──────────────────────────────────────────
function BulkOperations({ getToken }: { getToken: () => Promise<string | null>; tables: any[] }) {
    const { t } = useLanguage();
    const [activeWorkflow, setActiveWorkflow] = useState<'merge' | 'bulk-update' | null>(null);

    // Merge State
    const [mergeSource, setMergeSource] = useState('');
    const [mergeTarget, setMergeTarget] = useState('');
    const [mergePreview, setMergePreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleMergePreview = async () => {
        if (!mergeSource || !mergeTarget) return;
        setLoading(true);
        try {
            const token = await getToken();
            const res = await adminDbMergeRoots(token!, mergeSource, mergeTarget, true);
            setMergePreview(res);
        } catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
    };

    const handleMergeExec = async () => {
        if (!confirm(t('Are you ABSOLUTELY sure? This will delete the source root and reassign ALL related data. This cannot be undone.', 'Inti żgur B\'KOLlox? Dan se jħassar l-għerq tas-sors u jassenja d-data KOLLHA mill-ġdid. Dan ma jistax jinqaleb.'))) return;
        setLoading(true);
        try {
            const token = await getToken();
            await adminDbMergeRoots(token!, mergeSource, mergeTarget, false);
            alert(t('Roots merged successfully!', 'L-għeruq ingħaqdu b\'suċċess!'));
            setMergePreview(null);
            setMergeSource('');
            setMergeTarget('');
        } catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="p-6 space-y-6">
            {!activeWorkflow && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                    <button
                        onClick={() => setActiveWorkflow('merge')}
                        className="p-8 border-2 border-dashed border-[#ede9e1] rounded-3xl hover:border-[#1034A6] hover:bg-[#1034A6]/[0.02] transition-all group text-left flex flex-col items-start gap-4"
                    >
                        <div className="p-4 bg-[#1034A6]/5 text-[#1034A6] rounded-2xl group-hover:scale-110 transition-transform">
                            <GitMerge size={32} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-black">{t('Merge Duplicate Roots', 'Għaqqad Għeruq Duplikati')}</h4>
                            <p className="text-sm text-black/50 mt-1">{t('Reassign all entries from one root to another and delete the duplicate.', 'Assenja mill-ġdid l-entrati kollha għall-għerq l-ieħor.')}</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveWorkflow('bulk-update')}
                        className="p-8 border-2 border-dashed border-[#ede9e1] rounded-3xl hover:border-amber-500 hover:bg-amber-50/[0.02] transition-all group text-left flex flex-col items-start gap-4"
                    >
                        <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                            <RefreshCw size={32} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-black">{t('Bulk Field Update', 'Aġġorna Diversi Ringieli')}</h4>
                            <p className="text-sm text-black/50 mt-1">{t('Set a field to the same value for a list of record IDs.', 'Issettja field għall-istess valur għal lista ta\' IDs.')}</p>
                        </div>
                    </button>
                </div>
            )}

            {activeWorkflow === 'merge' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 max-w-2xl">
                    <button onClick={() => setActiveWorkflow(null)} className="text-xs font-bold text-[#1034A6] hover:underline mb-2 flex items-center gap-1">
                        &larr; {t('Back to Workflows', 'Lura għall-għażliet')}
                    </button>
                    <h3 className="text-lg font-bold text-black flex items-center gap-2">
                        <GitMerge size={20} className="text-[#1034A6]" />
                        {t('Merge Duplicate Roots', 'Għaqqad Għeruq Duplikati')}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 bg-[#f9f7f3] p-6 rounded-2xl border border-[#ede9e1]">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{t('Source Root ID (TO BE DELETED)', 'ID tas-Sors (SE JINĦASSAR)')}</label>
                            <input
                                value={mergeSource}
                                onChange={e => setMergeSource(e.target.value)}
                                placeholder="e.g. k-t-b-dup"
                                className="w-full p-2.5 bg-white border border-[#ede9e1] rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{t('Target Root ID (TO BE KEPT)', 'ID tad-Destinazzjoni (SE JINŻAMM)')}</label>
                            <input
                                value={mergeTarget}
                                onChange={e => setMergeTarget(e.target.value)}
                                placeholder="e.g. k-t-b"
                                className="w-full p-2.5 bg-white border border-[#ede9e1] rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div className="col-span-2 pt-4 flex justify-end">
                            <Button onClick={handleMergePreview} disabled={loading || !mergeSource || !mergeTarget} leftIcon={<Search size={14} />}>
                                {t('Preview Merge', 'Ara Preview')}
                            </Button>
                        </div>
                    </div>

                    {mergePreview && (
                        <div className="bg-white border-2 border-[#1034A6]/20 rounded-2xl p-6 space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-3 text-sm">
                                <AlertTriangle className="text-amber-500" size={20} />
                                <h4 className="font-bold">{t('Merge Summary', 'Sommarju tal-Għaqda')}</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-8 py-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-black/30">{t('Source', 'Sors')}</span>
                                    <p className="font-serif text-xl font-bold text-red-600">{mergePreview.source.consonants}</p>
                                    <p className="text-xs text-black/40">ID: {mergePreview.source.id}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-black/30">{t('Target', 'Target')}</span>
                                    <p className="font-serif text-xl font-bold text-green-600">{mergePreview.target.consonants}</p>
                                    <p className="text-xs text-black/40">ID: {mergePreview.target.id}</p>
                                </div>
                            </div>

                            <div className="bg-black/[0.02] rounded-xl p-4 space-y-3 border border-black/5">
                                <div className="flex items-center gap-2 text-xs font-bold text-black/60">
                                    <LinkIcon size={14} /> {t('Related Data to Reassign', 'Data Relatata se tiġi assenjata mill-ġdid')}
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="bg-white px-3 py-2 rounded-lg border border-black/5 shadow-sm min-w-32">
                                        <p className="text-xl font-bold text-[#1034A6]">{mergePreview.affectedEntries.length}</p>
                                        <p className="text-[10px] uppercase font-bold text-black/30 tracking-tight">{t('Entries', 'Entrati')}</p>
                                    </div>
                                    <div className="bg-white px-3 py-2 rounded-lg border border-black/5 shadow-sm min-w-32">
                                        <p className="text-xl font-bold text-[#1034A6]">{mergePreview.affectedForms.length}</p>
                                        <p className="text-[10px] uppercase font-bold text-black/30 tracking-tight">{t('CV Forms', 'Formoli CV')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between items-center">
                                <p className="text-xs text-black/40 max-w-xs">{t('Verify the data above carefully before proceeding. This is permanent.', 'Iċċekkja sew id-data qabel ma tkompli. Din hija permanenti.')}</p>
                                <Button onClick={handleMergeExec} disabled={loading} className="bg-red-600 hover:bg-red-700 border-red-700 shadow-lg shadow-red-500/20">
                                    {t('Confirm & Merge', 'Ikkonferma u Għaqqad')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeWorkflow === 'bulk-update' && (
                <div className="text-center py-20 opacity-40 italic">
                    <p>{t('Bulk Field Update workflow coming in the next patch...', 'Il-fluss tat-xogħol għall-aġġornament dalwaqt...')}</p>
                    <Button variant="ghost" className="mt-4" onClick={() => setActiveWorkflow(null)}>{t('Go Back', 'Mur Lura')}</Button>
                </div>
            )}
        </div>
    );
}
