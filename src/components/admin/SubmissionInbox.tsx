import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { CheckSquare, ExternalLink, RefreshCw, Square, Trash2 } from 'lucide-react';
import { adminBulkSubmissions, adminDeleteSubmission, adminListSubmissions, adminUpdateSubmission } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { WorkspaceEmptyState } from '@/components/admin/workspace/WorkspaceEmptyState';
import { WorkspaceFeedbackBanner } from '@/components/admin/workspace/WorkspaceFeedbackBanner';
import { WorkspaceToolbar } from '@/components/admin/workspace/WorkspaceToolbar';
import { SubmissionBulkActionsBar } from '@/components/admin/workspace/SubmissionBulkActionsBar';
import { cn } from '@/lib/utils';
import type { SubmissionKind, SubmissionRecord, SubmissionStatus } from '@/lib/submissions';

const KIND_FILTERS: Array<{ value: 'all' | SubmissionKind; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'suggestion', label: 'Suggestions' },
];

const STATUS_FILTERS: Array<{ value: 'all' | SubmissionStatus; label: string }> = [
    { value: 'all', label: 'All statuses' },
    { value: 'new', label: 'New' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'closed', label: 'Closed' },
    { value: 'spam', label: 'Spam' },
];

const STATUS_STYLES: Record<SubmissionStatus, string> = {
    new: 'bg-amber-50 text-amber-800 border-amber-100',
    reviewed: 'bg-blue-50 text-blue-800 border-blue-100',
    closed: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    spam: 'bg-red-50 text-red-800 border-red-100',
};

const KIND_STYLES: Record<SubmissionKind, string> = {
    feedback: 'bg-indigo-50 text-indigo-800 border-indigo-100',
    suggestion: 'bg-emerald-50 text-emerald-800 border-emerald-100',
};

const CATEGORY_LABELS: Record<SubmissionKind, Record<string, string>> = {
    feedback: {
        general: 'General',
        bug: 'Bug / Error',
        content: 'Content issue',
        feature: 'Feature request',
    },
    suggestion: {
        entry: 'Entry suggestion',
        root: 'Root suggestion',
    },
};

interface SubmissionInboxProps {
    onSelectionChange?: (selected: SubmissionRecord | null) => void;
}

export function SubmissionInbox({ onSelectionChange }: SubmissionInboxProps) {
    const { getToken } = useClerkAuth();

    const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [kindFilter, setKindFilter] = useState<'all' | SubmissionKind>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [total, setTotal] = useState(0);

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        window.setTimeout(() => setToast(null), 3500);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');

            const res = await adminListSubmissions(token, {
                q: query,
                kind: kindFilter,
                status: statusFilter,
                limit: 50,
            });
            const next = res.submissions ?? [];
            setTotal(res.total ?? next.length);
            setSubmissions(next);
            setSelectedIds(prev => {
                const nextIds = new Set(next.map(item => item.id));
                const kept = new Set(Array.from(prev).filter(id => nextIds.has(id)));
                return kept;
            });
            setSelectedId(prev => (prev && next.some(item => item.id === prev) ? prev : next[0]?.id ?? null));
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        } finally {
            setLoading(false);
        }
    }, [getToken, kindFilter, query, showToast, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const selected = useMemo(
        () => submissions.find(item => item.id === selectedId) ?? null,
        [selectedId, submissions],
    );

    const selectedCount = selectedIds.size;
    const visibleIds = useMemo(() => submissions.map(item => item.id), [submissions]);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

    useEffect(() => {
        onSelectionChange?.(selected);
    }, [onSelectionChange, selected]);

    const updateStatus = useCallback(async (submission: SubmissionRecord, status: SubmissionStatus) => {
        if (submission.status === status) return;

        setBusyId(submission.id);
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminUpdateSubmission(token, submission.id, { status });
            showToast(`Marked as ${status}.`);
            await load();
            setSelectedId(submission.id);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        } finally {
            setBusyId(null);
        }
    }, [getToken, load, showToast]);

    const deleteSubmission = useCallback(async (submission: SubmissionRecord) => {
        if (!window.confirm(`Delete "${submission.subject}"? This cannot be undone.`)) return;

        setBusyId(submission.id);
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminDeleteSubmission(token, submission.id);
            showToast('Submission deleted.');
            await load();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        } finally {
            setBusyId(null);
        }
    }, [getToken, load, showToast]);

    const toggleSelected = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectVisible = useCallback(() => {
        setSelectedIds(prev => {
            if (visibleIds.length > 0 && visibleIds.every(id => prev.has(id))) {
                return new Set(Array.from(prev).filter(id => !visibleIds.includes(id)));
            }
            const next = new Set(prev);
            visibleIds.forEach(id => next.add(id));
            return next;
        });
    }, [visibleIds]);

    const runBulk = useCallback(async (action: 'delete' | 'status', status?: SubmissionStatus) => {
        if (selectedIds.size === 0) return;

        if (action === 'delete' && !window.confirm(`Delete ${selectedIds.size} submissions? This cannot be undone.`)) return;

        setBulkBusy(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');

            await adminBulkSubmissions(token, {
                ids: Array.from(selectedIds),
                action,
                status,
            });
            showToast(action === 'delete' ? 'Submissions deleted.' : `Marked ${selectedIds.size} as ${status}.`);
            setSelectedIds(new Set());
            await load();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        } finally {
            setBulkBusy(false);
        }
    }, [getToken, load, selectedIds, showToast]);

    const detail = selected;
    const countText = total > 50 ? `${total} matching, latest 50 shown` : `${total} matching`;

    return (
        <div className="space-y-4">
            {toast && <WorkspaceFeedbackBanner message={toast.msg} tone={toast.ok ? 'success' : 'error'} />}

            <WorkspaceToolbar
                heading="Feedback Inbox"
                countText={countText}
                controls={(
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={load}
                            leftIcon={<RefreshCw size={14} className={cn(loading && 'animate-spin')} />}
                        >
                            Refresh
                        </Button>
                    </>
                )}
                filters={(
                    <div className="space-y-3">
                        <SearchInput
                            value={query}
                            onChange={setQuery}
                            onSubmit={load}
                            placeholder="Search subject, message, email, or page..."
                        />
                        <div className="flex flex-wrap gap-2">
                            {KIND_FILTERS.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setKindFilter(option.value)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all',
                                        kindFilter === option.value
                                            ? 'bg-white text-link border-link/20 shadow-sm'
                                            : 'bg-black/5 text-black/45 border-transparent hover:bg-black/10',
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_FILTERS.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setStatusFilter(option.value)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all',
                                        statusFilter === option.value
                                            ? 'bg-white text-link border-link/20 shadow-sm'
                                            : 'bg-black/5 text-black/45 border-transparent hover:bg-black/10',
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            />

            {loading && submissions.length === 0 ? (
                <div className="flex justify-center py-16">
                    <Spinner />
                </div>
            ) : submissions.length === 0 ? (
                <WorkspaceEmptyState
                    title={query || kindFilter !== 'all' || statusFilter !== 'all'
                        ? 'No submissions matched your filters.'
                        : 'No submissions yet.'}
                    actionLabel="Clear filters"
                    onAction={() => {
                        setQuery('');
                        setKindFilter('all');
                        setStatusFilter('all');
                    }}
                />
            ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] items-start">
                    <Card className="overflow-hidden border-border-light">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/5 bg-surface-soft">
                            <button
                                type="button"
                                onClick={toggleSelectVisible}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black/45 hover:text-black/70 transition-colors"
                            >
                                {allVisibleSelected ? <CheckSquare size={16} className="text-link" /> : <Square size={16} />}
                                {allVisibleSelected ? 'Deselect page' : 'Select page'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs font-bold uppercase tracking-widest text-black/30 hover:text-black/60 transition-colors"
                                disabled={selectedCount === 0}
                            >
                                Clear selection
                            </button>
                        </div>
                        <div className="divide-y divide-black/5">
                            {submissions.map((submission) => {
                                const isSelected = submission.id === selectedId;
                                const isBulkSelected = selectedIds.has(submission.id);
                                return (
                                    <div
                                        key={submission.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedId(submission.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedId(submission.id);
                                            }
                                        }}
                                        className={cn(
                                            'w-full text-left px-4 py-4 transition-colors cursor-pointer',
                                            isSelected ? 'bg-link/5' : 'hover:bg-surface-soft',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelected(submission.id);
                                                }}
                                                className={cn(
                                                    'mt-0.5 shrink-0 transition-colors',
                                                    isBulkSelected ? 'text-link' : 'text-black/20 hover:text-black/40',
                                                )}
                                                aria-label={isBulkSelected ? 'Deselect submission' : 'Select submission'}
                                            >
                                                {isBulkSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <Badge className={KIND_STYLES[submission.kind]}>
                                                        {formatKindLabel(submission.kind)}
                                                    </Badge>
                                                    <Badge className={STATUS_STYLES[submission.status]}>
                                                        {formatStatusLabel(submission.status)}
                                                    </Badge>
                                                    <Badge variant="tag">
                                                        {CATEGORY_LABELS[submission.kind][submission.category] || submission.category}
                                                    </Badge>
                                                </div>
                                                <h3 className="font-serif text-lg font-bold text-black truncate">
                                                    {submission.subject}
                                                </h3>
                                                <p className="text-sm text-black/45 truncate mt-1">
                                                    {submission.email || 'No email'} {submission.page_path ? `• ${submission.page_path}` : ''}
                                                </p>
                                            </div>
                                            <time className="text-[11px] font-bold uppercase tracking-widest text-black/30 shrink-0">
                                                {formatShortDate(submission.created_at)}
                                            </time>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card className="overflow-hidden border-border-light sticky top-4">
                        {detail ? (
                            <div className="p-5 space-y-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <Badge className={KIND_STYLES[detail.kind]}>
                                                {formatKindLabel(detail.kind)}
                                            </Badge>
                                            <Badge className={STATUS_STYLES[detail.status]}>
                                                {formatStatusLabel(detail.status)}
                                            </Badge>
                                            <Badge variant="tag">
                                                {CATEGORY_LABELS[detail.kind][detail.category] || detail.category}
                                            </Badge>
                                        </div>
                                        <h2 className="font-serif text-2xl leading-tight text-black font-bold">
                                            {detail.subject}
                                        </h2>
                                        <p className="text-sm text-black/40 mt-2">
                                            Submitted {formatLongDate(detail.created_at)}
                                        </p>
                                    </div>
                                    {detail.page_url ? (
                                        <a
                                            href={detail.page_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-black/35 hover:text-black/70 transition-colors shrink-0"
                                            aria-label="Open source page"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    ) : null}
                                </div>

                                <div className="space-y-4">
                                    <Section label="Message" value={detail.message || 'No message provided.'} multiline />
                                    <Section label="Email" value={detail.email || 'No email provided.'} />
                                    <Section label="Page" value={detail.page_path || 'Unknown'} code />
                                    <Section label="Page URL" value={detail.page_url || 'Unavailable'} />
                                    <Section label="Referer" value={detail.referer || 'Unavailable'} />
                                    <Section label="User agent" value={detail.user_agent || 'Unavailable'} />
                                    <Section label="Updated" value={formatLongDate(detail.updated_at)} />
                                </div>

                                <div className="flex flex-wrap gap-2 border-t border-black/5 pt-4">
                                    <Button variant="secondary" size="sm" onClick={() => updateStatus(detail, 'new')} loading={busyId === detail.id}>
                                        Mark new
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => updateStatus(detail, 'reviewed')} loading={busyId === detail.id}>
                                        Mark reviewed
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => updateStatus(detail, 'closed')} loading={busyId === detail.id}>
                                        Mark closed
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => updateStatus(detail, 'spam')} loading={busyId === detail.id}>
                                        Mark spam
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => deleteSubmission(detail)}
                                        loading={busyId === detail.id}
                                        leftIcon={<Trash2 size={14} />}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-black/40 italic">
                                Select a submission to review it.
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {selectedCount > 0 && (
                <SubmissionBulkActionsBar
                    count={selectedCount}
                    onClear={() => setSelectedIds(new Set())}
                    onDelete={() => runBulk('delete')}
                    onMarkNew={() => runBulk('status', 'new')}
                    onMarkReviewed={() => runBulk('status', 'reviewed')}
                    onMarkClosed={() => runBulk('status', 'closed')}
                    onMarkSpam={() => runBulk('status', 'spam')}
                    busy={bulkBusy}
                />
            )}
        </div>
    );
}

function Section({
    label,
    value,
    multiline = false,
    code = false,
}: {
    label: string;
    value: string;
    multiline?: boolean;
    code?: boolean;
}) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-black/35">{label}</p>
            <div
                className={cn(
                    'rounded-xl border border-black/5 bg-black/2 px-3 py-2 text-sm text-black/80',
                    multiline && 'whitespace-pre-wrap leading-relaxed',
                    code && 'font-mono text-xs break-all',
                )}
            >
                {value}
            </div>
        </div>
    );
}

function formatShortDate(value: string) {
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
    }).format(new Date(value));
}

function formatLongDate(value: string) {
    return new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function formatKindLabel(kind: SubmissionKind) {
    return kind === 'feedback' ? 'Feedback' : 'Suggestion';
}

function formatStatusLabel(status: SubmissionStatus) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}
