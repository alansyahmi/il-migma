import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Check, CheckSquare, Edit2, ExternalLink, Maximize2, Plus, RefreshCw, RotateCcw, Square, Trash2, X } from 'lucide-react';
import { adminBulkDeleteEntries, adminDeleteEntry, adminListEntries, adminUpdateEntry } from '@/lib/api';
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
import { resolveTagLabel } from '@/lib/tagLabel';
import { MALTESE_ALPHABET, matchesMalteseLetter } from '@/lib/malteseAlphabet';

const PAGE_SIZE = 15;

export function EntryManager() {
    const { getToken: clerkGetToken } = useClerkAuth();
    const getToken = useCallback(async () => {
        return (await clerkGetToken()) ?? '';
    }, [clerkGetToken]);
    const { term } = useLinguisticMode();
    const { getValues } = useAdminConfig();
    const [searchParams, setSearchParams] = useSearchParams();

    const [entries, setEntries] = useState<AdminEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedPos, setSelectedPos] = useState<string>('all');
    const [selectedLetter, setSelectedLetter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<Record<string, string> | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [auditFilter, setAuditFilter] = useState<'all' | 'action-needed' | 'partial' | 'complete'>('all');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Inline row quick-editing state
    const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
    const [quickSavingId, setQuickSavingId] = useState<string | null>(null);
    const [quickHeadword, setQuickHeadword] = useState('');
    const [quickPos, setQuickPos] = useState('');
    const [quickGender, setQuickGender] = useState('');
    const [quickVerbForm, setQuickVerbForm] = useState('');
    const [quickVerbClass, setQuickVerbClass] = useState('');
    const [quickRoot, setQuickRoot] = useState('');
    const [quickIsLoan, setQuickIsLoan] = useState(false);
    const [quickSourceLang, setQuickSourceLang] = useState('');
    const [quickMeaning, setQuickMeaning] = useState('');
    const [quickTags, setQuickTags] = useState('');
    const [quickAltForms, setQuickAltForms] = useState('');

    const abortControllerRef = useRef<AbortController | null>(null);
    const lastRequestSignatureRef = useRef<string>('');
    const createEntryRequested = searchParams.get('create') === '1';
    const prefillHeadword = searchParams.get('headword') || searchParams.get('q') || '';
    const prefillRoot = searchParams.get('root') || searchParams.get('consonants') || '';

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        window.setTimeout(() => setToast(null), 3500);
    }, []);

    // Debounce search input by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleSearchSubmit = useCallback(() => {
        setDebouncedQuery(searchInput.trim());
        setPage(1);
    }, [searchInput]);

    const handlePosChange = useCallback((pos: string) => {
        setSelectedPos(pos);
        setPage(1);
    }, []);

    const handleLetterChange = useCallback((letter: string) => {
        setSelectedLetter(letter);
        setPage(1);
    }, []);

    const load = useCallback(async (options?: { force?: boolean; skipCount?: boolean }) => {
        const currentPosFilter = selectedPos === 'all' ? '' : selectedPos;
        const currentLetterFilter = selectedLetter === 'all' ? '' : selectedLetter;
        const currentOffset = (page - 1) * PAGE_SIZE;
        const requestSig = `${debouncedQuery}::${currentPosFilter}::${currentLetterFilter}::${currentOffset}::${page}`;

        if (!options?.force && requestSig === lastRequestSignatureRef.current) {
            return;
        }
        lastRequestSignatureRef.current = requestSig;

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError('');
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');

            const skipCount = Boolean(options?.skipCount || (page > 1 && total > 0));

            const data = await adminListEntries(token, {
                q: debouncedQuery,
                pos: currentPosFilter,
                letter: currentLetterFilter,
                limit: PAGE_SIZE,
                offset: currentOffset,
                signal: controller.signal,
                skipCount,
            }) as { entries?: AdminEntry[]; total?: number };

            setEntries(data.entries ?? []);
            if (!skipCount && data.total !== undefined) {
                setTotal(data.total);
            }
        } catch (e: unknown) {
            if (e instanceof Error && e.name === 'AbortError') return;
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            if (abortControllerRef.current === controller) {
                setLoading(false);
            }
        }
    }, [getToken, debouncedQuery, selectedPos, selectedLetter, page, total]);

    useEffect(() => {
        load();
    }, [debouncedQuery, selectedPos, selectedLetter, page]);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

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

    const handleDelete = async (id: string, headword: string) => {
        if (!confirm(term('delete-entry-confirm', { headword }))) return;
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminDeleteEntry(token, id);
            showToast(term('entry-deleted', { headword }));
            setEntries((prev) => prev.filter((e) => e.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        }
    };

    const handleSaved = useCallback((savedData?: any) => {
        setShowForm(false);
        setInitialFormData(null);
        if (createEntryRequested) clearCreateParams();

        if (savedData && (savedData.id || editEntry?.id)) {
            const targetId = savedData.id || editEntry?.id;
            setEntries((prev) => prev.map((item) => {
                if (item.id === targetId) {
                    return {
                        ...item,
                        headword: savedData.headword || item.headword,
                        pos: savedData.pos || item.pos,
                        gender: savedData.gender ?? item.gender,
                        root_consonants: savedData.root_consonants || savedData._rootConsonants || item.root_consonants,
                        text_en: savedData.text_en || savedData.definitions?.[0]?.text_en || item.text_en,
                        is_loanword: savedData.is_loanword ?? item.is_loanword,
                        source_language: savedData.source_language ?? item.source_language,
                        verb_form: savedData.verb_form || savedData.form || item.verb_form,
                        verb_class: savedData.verb_class || savedData.class || item.verb_class,
                        verb_transitivity: savedData.verb_transitivity || savedData.transitivity || item.verb_transitivity,
                        tags: savedData.tags ?? item.tags,
                        alternative_forms: savedData.alternative_forms ?? item.alternative_forms,
                    };
                }
                return item;
            }));
            showToast(term('entry-saved') || 'Entry saved');
            return;
        }

        load({ force: true });
    }, [createEntryRequested, clearCreateParams, editEntry, showToast, term, load]);

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(term('bulk-delete-confirm', { count }))) return;

        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminBulkDeleteEntries(token, Array.from(selectedIds));
            showToast(term('items-deleted', { count }));
            setSelectedIds(new Set());
            load();
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        }
    };

    const filteredEntries = useMemo(() => {
        let list = entries;
        if (selectedPos !== 'all') {
            list = list.filter((entry) => posMatchesFilter(entry.pos, selectedPos));
        }
        if (selectedLetter !== 'all') {
            list = list.filter((entry) => matchesMalteseLetter(entry.headword, selectedLetter));
        }
        return list;
    }, [entries, selectedPos, selectedLetter]);

    const auditCounts = useMemo(() => {
        let actionNeeded = 0;
        let partial = 0;
        let complete = 0;
        for (const entry of filteredEntries) {
            const audit = evaluateEntryAudit(entry, term);
            if (audit.status === 'action-needed') actionNeeded++;
            else if (audit.status === 'partial') partial++;
            else complete++;
        }
        return { total: filteredEntries.length, actionNeeded, partial, complete };
    }, [filteredEntries, term]);

    const displayedEntries = useMemo(() => {
        if (auditFilter === 'all') return filteredEntries;
        return filteredEntries.filter((entry) => evaluateEntryAudit(entry, term).status === auditFilter);
    }, [filteredEntries, auditFilter, term]);

    const isAllDisplayedSelected = useMemo(() => {
        return displayedEntries.length > 0 && displayedEntries.every((entry) => selectedIds.has(entry.id));
    }, [displayedEntries, selectedIds]);

    const toggleSelectAll = () => {
        setSelectedIds((prev) => {
            const displayedIds = displayedEntries.map((entry) => entry.id);
            const allSelected = displayedIds.length > 0 && displayedIds.every((id) => prev.has(id));
            const next = new Set(prev);
            if (allSelected) {
                for (const id of displayedIds) next.delete(id);
            } else {
                for (const id of displayedIds) next.add(id);
            }
            return next;
        });
    };

    const posOptions = useMemo(() => getValues('pos') as string[], [getValues]);
    const PRIMARY_POS = useMemo(() => ['noun', 'verb', 'adjective'], []);
    const secondaryPosOptions = useMemo(() => {
        return posOptions.filter((pos) => !PRIMARY_POS.includes(pos.toLowerCase()));
    }, [posOptions, PRIMARY_POS]);
    const isSecondaryPosSelected = useMemo(() => {
        return selectedPos !== 'all' && !PRIMARY_POS.includes(selectedPos.toLowerCase());
    }, [selectedPos, PRIMARY_POS]);

    const isFilterActive = useMemo(() => {
        return selectedPos !== 'all' || selectedLetter !== 'all' || Boolean(debouncedQuery) || auditFilter !== 'all';
    }, [selectedPos, selectedLetter, debouncedQuery, auditFilter]);

    const handleClearAllFilters = useCallback(() => {
        setSearchInput('');
        setDebouncedQuery('');
        setSelectedPos('all');
        setSelectedLetter('all');
        setAuditFilter('all');
        setPage(1);
    }, []);

    const availablePosList = useMemo(() => {
        return posOptions && posOptions.length > 0 ? posOptions : [
            'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'particle', 'article', 'pronoun', 'interrogative', 'numeral', 'interjection', 'participle'
        ];
    }, [posOptions]);

    const handleStartQuickEdit = useCallback((entry: AdminEntry) => {
        setQuickEditingId(entry.id);
        setQuickHeadword(entry.headword || '');
        setQuickPos(entry.pos || 'noun');
        setQuickGender(entry.gender || '');
        setQuickVerbForm(entry.verb_form || '');
        setQuickVerbClass(entry.verb_class || entry.verb_morphology?.verb_class || '');
        setQuickRoot(entry.root_consonants || '');
        setQuickIsLoan(Boolean(entry.is_loanword));
        setQuickSourceLang(entry.source_language || '');
        setQuickMeaning(entry.text_en || '');

        const tagsArr = parseTags(entry.tags);
        setQuickTags(tagsArr.join(', '));

        const altsArr = parseRelationshipItems(entry.alternative_forms);
        const altHeadwords = altsArr
            .map((a) => (typeof a === 'string' ? a : a?.headword || ''))
            .filter(Boolean);
        setQuickAltForms(altHeadwords.join(', '));
    }, []);

    const handleCancelQuickEdit = useCallback(() => {
        setQuickEditingId(null);
    }, []);

    const handleSaveQuickEdit = useCallback(async (entry: AdminEntry) => {
        const trimmedHeadword = quickHeadword.trim();
        if (!trimmedHeadword) {
            showToast(term('headword-required') || 'Headword is required', false);
            return;
        }

        setQuickSavingId(entry.id);
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');

            const tagsList = quickTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            const altFormsList = quickAltForms
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .map((hw, i) => ({
                    id: `alt_${entry.id}::${i + 1}`,
                    headword: hw,
                }));

            const cleanMeaning = quickMeaning.trim();
            const definitions = cleanMeaning ? [{ id: 'def_1', text_en: cleanMeaning }] : [];

            const isVerb = quickPos.toLowerCase() === 'verb';
            const payload: Record<string, any> = {
                id: entry.id,
                headword: trimmedHeadword,
                pos: quickPos,
                gender: quickGender || null,
                root_consonants: quickIsLoan ? null : (quickRoot.trim() || null),
                is_loanword: quickIsLoan,
                source_language: quickIsLoan ? (quickSourceLang.trim() || null) : null,
                text_en: cleanMeaning || null,
                definitions,
                tags: tagsList,
                alternative_forms: altFormsList,
            };

            if (isVerb) {
                payload.verb_form = quickVerbForm || null;
                payload.verb_class = quickVerbClass || null;
                payload.form = quickVerbForm || null;
                payload.class = quickVerbClass || null;
            }

            await adminUpdateEntry(token, payload);

            setEntries((prev) =>
                prev.map((item) => {
                    if (item.id === entry.id) {
                        return {
                            ...item,
                            headword: trimmedHeadword,
                            pos: quickPos,
                            gender: quickGender || undefined,
                            root_consonants: quickIsLoan ? undefined : (quickRoot.trim() || undefined),
                            is_loanword: quickIsLoan,
                            source_language: quickIsLoan ? (quickSourceLang.trim() || undefined) : undefined,
                            text_en: cleanMeaning || undefined,
                            verb_form: isVerb ? (quickVerbForm || undefined) : item.verb_form,
                            verb_class: isVerb ? (quickVerbClass || undefined) : item.verb_class,
                            tags: tagsList,
                            alternative_forms: altFormsList,
                        };
                    }
                    return item;
                })
            );

            showToast(term('entry-saved') || 'Entry saved');
            setQuickEditingId(null);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : String(e), false);
        } finally {
            setQuickSavingId(null);
        }
    }, [
        quickHeadword,
        quickPos,
        quickGender,
        quickVerbForm,
        quickVerbClass,
        quickRoot,
        quickIsLoan,
        quickSourceLang,
        quickMeaning,
        quickTags,
        quickAltForms,
        getToken,
        showToast,
        term,
    ]);

    const handleQuickInputKeyDown = useCallback((e: React.KeyboardEvent, entry: AdminEntry) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveQuickEdit(entry);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelQuickEdit();
        }
    }, [handleSaveQuickEdit, handleCancelQuickEdit]);

    // Clear editing row when navigating or filtering
    useEffect(() => {
        setQuickEditingId(null);
    }, [page, debouncedQuery, selectedPos, selectedLetter, auditFilter]);

    return (
        <div className="space-y-3">
            <WorkspaceToolbar
                heading={term('entries')}
                countText={`${total.toLocaleString()} ${term('found')}`}
                controls={(
                    <>
                        <WorkspaceViewToggle viewMode={viewMode} onChange={setViewMode} />
                        <Button variant="ghost" size="sm" onClick={() => load({ force: true })} leftIcon={<RefreshCw size={14} className={cn(loading && 'animate-spin')} />}>
                            {term('refresh')}
                        </Button>
                        <Button size="sm" onClick={() => { setEditEntry(null); setInitialFormData(null); setShowForm(true); }} leftIcon={<Plus size={14} />}>
                            {term('new-entry')}
                        </Button>
                    </>
                )}
                filters={(
                    <div className="space-y-2.5">
                        {/* Row 1: Search & Streamlined POS Filters */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <div className="flex-1 min-w-[200px]">
                                <SearchInput
                                    value={searchInput}
                                    onChange={setSearchInput}
                                    onSubmit={handleSearchSubmit}
                                    placeholder={`${term('search-entry')}...`}
                                />
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => handlePosChange('all')}
                                    className={cn(
                                        'px-2.5 py-1 rounded-full text-xs font-bold transition-all border',
                                        selectedPos === 'all'
                                            ? 'bg-link text-white border-link shadow-xs'
                                            : 'bg-white text-black/60 border-black/10 hover:border-black/20 hover:bg-black/5',
                                    )}
                                >
                                    {term('all').toUpperCase()}
                                </button>
                                {PRIMARY_POS.map((pos) => (
                                    <button
                                        key={pos}
                                        type="button"
                                        onClick={() => handlePosChange(pos)}
                                        className={cn(
                                            'px-2.5 py-1 rounded-full text-xs font-bold transition-all border uppercase tracking-wider',
                                            selectedPos === pos
                                                ? 'bg-link text-white border-link shadow-xs'
                                                : 'bg-white text-black/60 border-black/10 hover:border-black/20 hover:bg-black/5',
                                        )}
                                    >
                                        {pos}
                                    </button>
                                ))}
                                {secondaryPosOptions.length > 0 && (
                                    <div className="relative inline-block">
                                        <select
                                            value={isSecondaryPosSelected ? selectedPos : ''}
                                            onChange={(e) => handlePosChange(e.target.value || 'all')}
                                            aria-label={term('part-of-speech') || 'Part of speech'}
                                            className={cn(
                                                'px-2.5 py-1 rounded-full text-xs font-bold transition-all border appearance-none pr-6 cursor-pointer uppercase tracking-wider',
                                                isSecondaryPosSelected
                                                    ? 'bg-link text-white border-link shadow-xs'
                                                    : 'bg-white text-black/60 border-black/10 hover:border-black/20 hover:bg-black/5',
                                            )}
                                        >
                                            <option value="" className="text-black bg-white">
                                                {isSecondaryPosSelected ? selectedPos.toUpperCase() : `${term('more') || 'More'} POS...`}
                                            </option>
                                            {secondaryPosOptions.map((pos) => (
                                                <option key={pos} value={pos} className="text-black bg-white">
                                                    {pos.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                        <div className={cn(
                                            'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[9px]',
                                            isSecondaryPosSelected ? 'text-white' : 'text-black/40'
                                        )}>
                                            ▼
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Maltese Alphabetical Filter (abċ order) */}
                        <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-black/5">
                            <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider mr-1 shrink-0">
                                ABĊ:
                            </span>
                            <button
                                type="button"
                                onClick={() => handleLetterChange('all')}
                                className={cn(
                                    'px-2.5 py-1 rounded text-xs font-bold transition-all border shrink-0 uppercase tracking-wider',
                                    selectedLetter === 'all'
                                        ? 'bg-link text-white border-link shadow-xs'
                                        : 'bg-white text-black/60 border-black/10 hover:border-black/20 hover:bg-black/5',
                                )}
                            >
                                {term('all').toUpperCase()}
                            </button>
                            {MALTESE_ALPHABET.map((letter) => {
                                const isSelected = selectedLetter.toLowerCase() === letter.toLowerCase();
                                return (
                                    <button
                                        key={letter}
                                        type="button"
                                        onClick={() => handleLetterChange(isSelected ? 'all' : letter)}
                                        className={cn(
                                            'h-7 min-w-[28px] px-1.5 rounded text-xs font-semibold transition-all border flex items-center justify-center font-serif shrink-0',
                                            isSelected
                                                ? 'bg-link text-white border-link shadow-xs font-bold'
                                                : 'bg-white text-black/75 border-black/10 hover:border-black/25 hover:bg-black/5',
                                        )}
                                        title={`Filter entries starting with ${letter}`}
                                    >
                                        {letter}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Row 3: Audit Health Chips & Filter Reset */}
                        {(filteredEntries.length > 0 || isFilterActive) && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider mr-1">
                                        {term('audit-health') || 'Audit Health'}:
                                    </span>

                                    {/* All Chip */}
                                    <button
                                        type="button"
                                        onClick={() => setAuditFilter('all')}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all border',
                                            auditFilter === 'all'
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                                : 'bg-white text-slate-600 border-black/10 hover:border-black/20 hover:bg-black/5'
                                        )}
                                    >
                                        <span>{term('all') || 'All'}</span>
                                        <span className={cn(
                                            'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                                            auditFilter === 'all' ? 'bg-white/20 text-white' : 'bg-black/5 text-black/50'
                                        )}>
                                            {filteredEntries.length}
                                        </span>
                                    </button>

                                    {/* Action Needed Chip */}
                                    <button
                                        type="button"
                                        onClick={() => setAuditFilter('action-needed')}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all border',
                                            auditFilter === 'action-needed'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                                : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                                        )}
                                        title={term('audit-action-needed-hint') || 'Entries missing definition, root consonants, or part of speech'}
                                    >
                                        <span className="relative flex h-2 w-2">
                                            {auditCounts.actionNeeded > 0 && (
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                            )}
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                        </span>
                                        <span>{term('action-needed') || 'Action Needed'}</span>
                                        <span className={cn(
                                            'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                                            auditFilter === 'action-needed' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                                        )}>
                                            {auditCounts.actionNeeded}
                                        </span>
                                    </button>

                                    {/* Incomplete / Partial Chip */}
                                    <button
                                        type="button"
                                        onClick={() => setAuditFilter('partial')}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all border',
                                            auditFilter === 'partial'
                                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                                : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                                        )}
                                        title={term('audit-partial-hint') || 'Entries missing secondary grammar fields (e.g. unclassified verb or missing noun gender)'}
                                    >
                                        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                                        <span>{term('partial') || 'Incomplete'}</span>
                                        <span className={cn(
                                            'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                                            auditFilter === 'partial' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                                        )}>
                                            {auditCounts.partial}
                                        </span>
                                    </button>

                                    {/* Complete Chip */}
                                    <button
                                        type="button"
                                        onClick={() => setAuditFilter('complete')}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all border',
                                            auditFilter === 'complete'
                                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                                : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                                        )}
                                        title={term('audit-complete-hint') || 'Entries with definitions, root/loan attribution, and required grammar tags'}
                                    >
                                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                        <span>{term('complete') || 'Complete'}</span>
                                        <span className={cn(
                                            'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                                            auditFilter === 'complete' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                                        )}>
                                            {auditCounts.complete}
                                        </span>
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 text-xs">
                                    {isFilterActive && (
                                        <button
                                            type="button"
                                            onClick={handleClearAllFilters}
                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline"
                                        >
                                            <RotateCcw size={11} />
                                            <span>{term('reset-filters') || 'Reset filters'}</span>
                                        </button>
                                    )}
                                    <span className="text-[11px] text-black/40 font-medium font-mono">
                                        {displayedEntries.length} {term('entries') || 'entries'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            />

            {toast && <WorkspaceFeedbackBanner message={toast.msg} tone={toast.ok ? 'success' : 'error'} />}
            {error && <WorkspaceErrorBanner message={error} />}

            {loading && filteredEntries.length === 0 ? (
                <div className="flex justify-center py-20"><Spinner /></div>
            ) : filteredEntries.length === 0 ? (
                <WorkspaceEmptyState
                    title={
                        debouncedQuery
                            ? term('no-results-found', { q: debouncedQuery })
                            : selectedLetter !== 'all'
                            ? `No entries starting with "${selectedLetter}"`
                            : term('no-results-found-empty')
                    }
                    actionLabel={
                        isFilterActive
                            ? (term('reset-filters') || 'Reset filters')
                            : term('new-entry')
                    }
                    onAction={
                        isFilterActive
                            ? handleClearAllFilters
                            : () => { setEditEntry(null); setInitialFormData(null); setShowForm(true); }
                    }
                />
            ) : displayedEntries.length === 0 ? (
                <div className="bg-white border border-border-light rounded-xl p-8 text-center space-y-3">
                    <p className="text-sm font-medium text-black/60">
                        {term('no-entries-audit-filter') || 'No entries on this page match the selected audit filter.'}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setAuditFilter('all')}>
                        {term('show-all-entries') || 'Show all'} ({filteredEntries.length})
                    </Button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedEntries.map((entry) => {
                        const audit = evaluateEntryAudit(entry, term);
                        const verbClass = entry.verb_class || entry.verb_morphology?.verb_class;
                        return (
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
                                        <div className="pl-6">
                                            <Link to={`/entry/${entry.id}`}>
                                                <h4 className="font-serif text-xl font-bold text-link hover:scale-105 transition-transform origin-left">{entry.headword}</h4>
                                            </Link>
                                            {entry.root_consonants && (
                                                <Link to={`/root/${entry.root_consonants}`} className="text-xs font-bold text-slate-500 hover:text-link mt-1 inline-block font-mono tracking-wider">
                                                    {term('root')}: {entry.root_consonants}
                                                </Link>
                                            )}
                                            <p className="text-[10px] text-black/30 font-mono mt-0.5">ID: {entry.id}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={cn(
                                                    'px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-help',
                                                    audit.status === 'action-needed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    audit.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                )}
                                                title={audit.issues.join('; ')}
                                            >
                                                {audit.label}
                                            </span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/entry/${entry.id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-link hover:bg-link/10 rounded-lg" title={term('view') || 'View entry'}>
                                                    <ExternalLink size={14} />
                                                </Link>
                                                <button type="button" onClick={() => { setEditEntry(entry); setShowForm(true); }} className="p-1.5 text-link hover:bg-link/10 rounded-lg"><Edit2 size={14} /></button>
                                                <button type="button" onClick={() => handleDelete(entry.id, entry.headword)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-black/60 line-clamp-2 italic">{entry.text_en || `${term('no-definition')}...`}</p>

                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        <span className="text-[10px] font-bold text-black/30 uppercase tracking-tighter">{term(entry.pos || 'pos')}</span>
                                        {entry.gender && <Badge variant="pos" className="bg-sky-50 text-sky-700">{term(entry.gender)}</Badge>}
                                        {verbClass && <Badge variant="pos" className="bg-purple-50 text-purple-700">{term(verbClass)}</Badge>}
                                        {entry.verb_transitivity && <Badge variant="pos" className="bg-indigo-50 text-indigo-700">{term(entry.verb_transitivity)}</Badge>}
                                        {entry.verb_form && (
                                            <Link to={`/search?form=${entry.verb_form}`}>
                                                <Badge variant="pos" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                                                    {term('form')} {entry.verb_form}
                                                </Badge>
                                            </Link>
                                        )}
                                        {entry.is_loanword && <Badge variant="pos" className="bg-amber-50 text-amber-700">{term('loanword')}</Badge>}
                                        {entry.source_language && <Badge variant="pos" className="bg-emerald-50 text-emerald-700">{term(entry.source_language)}</Badge>}
                                        {parseRelationshipItems(entry.alternative_forms).length > 0 && (
                                            <Badge variant="pos" className="bg-blue-50 text-blue-700">
                                                ALT {parseRelationshipItems(entry.alternative_forms).length}
                                            </Badge>
                                        )}
                                        {parseTags(entry.tags).map((tag) => (
                                            <Badge key={tag} variant="pos" className="bg-slate-50 text-slate-400 border-slate-100">{resolveTagLabel(tag, term)}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                                    <Badge variant="pos" className="bg-slate-100 text-slate-600 border-0">{term(entry.pos || 'pos')}</Badge>
                                    <span className="text-[10px] text-black/20 font-bold uppercase">{entry.created_at?.slice(0, 10)}</span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                /* HIGH DENSITY DATA GRID */
                <Card className="relative z-0 overflow-hidden border border-border-light shadow-sm bg-white rounded-xl">
                    <div className="overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-surface-soft/95 backdrop-blur-sm border-b border-border-light shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                                <tr className="text-black/50 uppercase tracking-wider font-semibold text-[11px]">
                                    <th className="py-2.5 px-3 w-10 text-center">
                                        <button
                                            type="button"
                                            onClick={toggleSelectAll}
                                            className="text-black/30 hover:text-link transition-colors align-middle"
                                            title="Select all displayed"
                                        >
                                            {isAllDisplayedSelected ? (
                                                <CheckSquare size={15} className="text-link" />
                                            ) : (
                                                <Square size={15} />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-2.5 px-2 w-12 text-center" title="Health / Audit Status">
                                        {term('status') || 'Status'}
                                    </th>
                                    <th className="py-2.5 px-3 min-w-[170px]">
                                        {term('word') || 'Word'} & ID
                                    </th>
                                    <th className="py-2.5 px-3 w-44 min-w-[150px]">
                                        {term('pos') || 'POS'} & Grammar
                                    </th>
                                    <th className="py-2.5 px-3 w-40 min-w-[140px]">
                                        {term('root') || 'Root'} / Etym
                                    </th>
                                    <th className="py-2.5 px-3 min-w-[220px]">
                                        {term('meaning') || 'Meaning'}
                                    </th>
                                    <th className="py-2.5 px-3 w-40 min-w-[140px]">
                                        Tags & Alt
                                    </th>
                                    <th className="py-2.5 px-3 w-24">
                                        {term('date') || 'Date'}
                                    </th>
                                    <th className="py-2.5 px-3 w-24 text-right">
                                        {term('actions') || 'Actions'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light/60">
                                {displayedEntries.map((entry) => {
                                    const isSelected = selectedIds.has(entry.id);
                                    const isEditing = quickEditingId === entry.id;
                                    const audit = evaluateEntryAudit(entry, term);
                                    const altCount = parseRelationshipItems(entry.alternative_forms).length;
                                    const tags = parseTags(entry.tags);
                                    const verbClass = entry.verb_class || entry.verb_morphology?.verb_class;

                                    return (
                                        <tr
                                            key={entry.id}
                                            onDoubleClick={() => {
                                                if (!isEditing) handleStartQuickEdit(entry);
                                            }}
                                            className={cn(
                                                'group transition-colors',
                                                isEditing
                                                    ? 'bg-amber-50/50 ring-1 ring-amber-300/60'
                                                    : isSelected
                                                        ? 'bg-link/5 hover:bg-link/10 h-11'
                                                        : 'hover:bg-surface-soft/80 h-11'
                                            )}
                                            title={isEditing ? undefined : 'Double-click to quick edit inline'}
                                        >
                                            {/* Checkbox */}
                                            <td className={cn('py-2 px-3 text-center', isEditing && 'align-top pt-3.5')}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSelect(entry.id)}
                                                    className={cn(
                                                        'transition-colors align-middle',
                                                        isSelected ? 'text-link' : 'text-black/20 group-hover:text-black/40'
                                                    )}
                                                >
                                                    {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                                                </button>
                                            </td>

                                            {/* Health Dot */}
                                            <td className={cn('py-2 px-2 text-center', isEditing && 'align-top pt-3.5')}>
                                                <div
                                                    className="inline-flex items-center justify-center cursor-help"
                                                    title={`${audit.label}: ${audit.issues.join('; ')}`}
                                                >
                                                    {audit.status === 'action-needed' ? (
                                                        <span className="relative flex h-2.5 w-2.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                                                        </span>
                                                    ) : audit.status === 'partial' ? (
                                                        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                                                    ) : (
                                                        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Headword & ID */}
                                            <td className={cn('py-2 px-3', isEditing && 'align-top')}>
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <input
                                                            type="text"
                                                            value={quickHeadword}
                                                            onChange={(e) => setQuickHeadword(e.target.value)}
                                                            onKeyDown={(e) => handleQuickInputKeyDown(e, entry)}
                                                            className="w-full text-xs font-serif font-bold px-2 py-1 bg-white border border-link/50 rounded shadow-2xs focus:outline-none focus:ring-1 focus:ring-link text-slate-900"
                                                            placeholder={term('word') || 'Word'}
                                                            autoFocus
                                                        />
                                                        <div className="font-mono text-[10px] text-black/40 select-all truncate">
                                                            #{entry.id}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-baseline gap-2">
                                                            <Link
                                                                to={`/entry/${entry.id}`}
                                                                className="font-serif font-bold text-sm text-link hover:underline truncate max-w-[160px]"
                                                                title={entry.headword}
                                                            >
                                                                {entry.headword}
                                                            </Link>
                                                        </div>
                                                        <div className="font-mono text-[10px] text-black/40 select-all">
                                                            #{entry.id}
                                                        </div>
                                                    </>
                                                )}
                                            </td>

                                            {/* POS & Grammar */}
                                            <td className={cn('py-2 px-3', isEditing && 'align-top')}>
                                                {isEditing ? (
                                                    <div className="space-y-1.5">
                                                        <select
                                                            value={quickPos}
                                                            onChange={(e) => setQuickPos(e.target.value)}
                                                            className="w-full text-[11px] font-semibold uppercase px-1.5 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link text-slate-800"
                                                        >
                                                            {availablePosList.map((pos) => (
                                                                <option key={pos} value={pos}>
                                                                    {term(pos) || pos}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        {['noun', 'adjective', 'pronoun', 'participle'].includes(quickPos.toLowerCase()) && (
                                                            <select
                                                                value={quickGender}
                                                                onChange={(e) => setQuickGender(e.target.value)}
                                                                className="w-full text-[11px] px-1.5 py-0.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link text-slate-700"
                                                            >
                                                                <option value="">— {term('gender') || 'Ġens'} —</option>
                                                                <option value="masculine">{term('masculine') || 'Maskil (m)'}</option>
                                                                <option value="feminine">{term('feminine') || 'Femminil (f)'}</option>
                                                                <option value="neutral">{term('neutral') || 'Maskil/Femminil (mf)'}</option>
                                                            </select>
                                                        )}

                                                        {quickPos.toLowerCase() === 'verb' && (
                                                            <div className="grid grid-cols-2 gap-1">
                                                                <select
                                                                    value={quickVerbForm}
                                                                    onChange={(e) => setQuickVerbForm(e.target.value)}
                                                                    className="w-full text-[10px] px-1 py-0.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link text-slate-700"
                                                                    title="Verb Form (I–X)"
                                                                >
                                                                    <option value="">Form...</option>
                                                                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Xa', 'Xb', 'Iq', 'IIq'].map((f) => (
                                                                        <option key={f} value={f}>F{f}</option>
                                                                    ))}
                                                                </select>
                                                                <select
                                                                    value={quickVerbClass}
                                                                    onChange={(e) => setQuickVerbClass(e.target.value)}
                                                                    className="w-full text-[10px] px-1 py-0.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link text-slate-700"
                                                                    title="Verb Class"
                                                                >
                                                                    <option value="">Class...</option>
                                                                    {['strong', 'weak', 'defective', 'hollow', 'assimilative', 'doubled', 'quadriliteral', 'loan', 'strong-hybrid'].map((cls) => (
                                                                        <option key={cls} value={cls}>{term(cls) || cls}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                                            {term(entry.pos || 'pos')}
                                                        </span>
                                                        {entry.gender && (
                                                            <span className="inline-block px-1 py-0.2 rounded text-[10px] bg-sky-50 text-sky-700 font-medium">
                                                                {term(entry.gender)}
                                                            </span>
                                                        )}
                                                        {verbClass && (
                                                            <span className="inline-block px-1 py-0.2 rounded text-[10px] bg-purple-50 text-purple-700 font-medium">
                                                                {term(verbClass)}
                                                            </span>
                                                        )}
                                                        {entry.verb_transitivity && (
                                                            <span className="inline-block px-1 py-0.2 rounded text-[10px] bg-indigo-50 text-indigo-700 font-medium">
                                                                {term(entry.verb_transitivity)}
                                                            </span>
                                                        )}
                                                        {entry.verb_form && (
                                                            <Link
                                                                to={`/search?form=${entry.verb_form}`}
                                                                className="inline-block px-1 py-0.2 rounded text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium"
                                                            >
                                                                F{entry.verb_form}
                                                            </Link>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Root / Etymology */}
                                            <td className={cn('py-2 px-3', isEditing && 'align-top')}>
                                                {isEditing ? (
                                                    <div className="space-y-1.5">
                                                        <input
                                                            type="text"
                                                            value={quickRoot}
                                                            onChange={(e) => setQuickRoot(e.target.value)}
                                                            onKeyDown={(e) => handleQuickInputKeyDown(e, entry)}
                                                            disabled={quickIsLoan}
                                                            placeholder={quickIsLoan ? '(Loanword)' : 'k-t-b'}
                                                            className="w-full font-mono text-[11px] px-1.5 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link disabled:bg-slate-100 disabled:text-slate-400"
                                                        />
                                                        <div className="flex items-center gap-1.5 pt-0.5">
                                                            <label className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={quickIsLoan}
                                                                    onChange={(e) => {
                                                                        const checked = e.target.checked;
                                                                        setQuickIsLoan(checked);
                                                                        if (checked && !quickSourceLang) {
                                                                            setQuickSourceLang('Italian');
                                                                        }
                                                                    }}
                                                                    className="rounded border-slate-300 text-link focus:ring-link h-3 w-3"
                                                                />
                                                                <span>{term('loanword') || 'Loan'}</span>
                                                            </label>
                                                            {quickIsLoan && (
                                                                <select
                                                                    value={quickSourceLang}
                                                                    onChange={(e) => setQuickSourceLang(e.target.value)}
                                                                    className="flex-1 text-[10px] px-1 py-0.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link text-slate-700"
                                                                >
                                                                    <option value="">Origin...</option>
                                                                    {['Italian', 'Sicilian', 'English', 'French', 'Siculo-Arabic', 'Semitic', 'Other'].map((lang) => (
                                                                        <option key={lang} value={lang}>{lang}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    entry.root_consonants ? (
                                                        <Link
                                                            to={`/root/${entry.root_consonants}`}
                                                            className="font-mono text-[11px] font-semibold tracking-wider text-slate-700 hover:text-link bg-slate-100 hover:bg-slate-200/70 px-1.5 py-0.5 rounded border border-slate-200/50 inline-block"
                                                        >
                                                            {entry.root_consonants}
                                                        </Link>
                                                    ) : entry.is_loanword || entry.source_language ? (
                                                        <span className="inline-block text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 px-1.5 py-0.5 rounded">
                                                            {entry.source_language ? term(entry.source_language) : term('loanword')}
                                                        </span>
                                                    ) : ['verb', 'noun', 'adjective', 'participle'].includes((entry.pos || '').toLowerCase()) ? (
                                                        <span
                                                            className="inline-block text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 px-1.5 py-0.5 rounded"
                                                            title="Missing root consonants for Semitic word"
                                                        >
                                                            No Root
                                                        </span>
                                                    ) : (
                                                        <span className="text-black/25 font-mono text-[11px]">—</span>
                                                    )
                                                )}
                                            </td>

                                            {/* Meaning / Gloss */}
                                            <td className={cn('py-2 px-3', isEditing && 'align-top')}>
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <textarea
                                                            rows={2}
                                                            value={quickMeaning}
                                                            onChange={(e) => setQuickMeaning(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleSaveQuickEdit(entry);
                                                                } else if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    handleCancelQuickEdit();
                                                                }
                                                            }}
                                                            placeholder="English definition..."
                                                            className="w-full text-xs italic px-2 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link resize-none"
                                                        />
                                                    </div>
                                                ) : (
                                                    entry.text_en ? (
                                                        <span
                                                            className="text-black/70 italic line-clamp-1 cursor-default text-xs"
                                                            title={entry.text_en}
                                                        >
                                                            {entry.text_en}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-rose-600 font-medium italic">
                                                            {term('missing')}
                                                        </span>
                                                    )
                                                )}
                                            </td>

                                            {/* Tags & Alt */}
                                            <td className={cn('py-2 px-3', isEditing && 'align-top')}>
                                                {isEditing ? (
                                                    <div className="space-y-1.5">
                                                        <input
                                                            type="text"
                                                            value={quickTags}
                                                            onChange={(e) => setQuickTags(e.target.value)}
                                                            onKeyDown={(e) => handleQuickInputKeyDown(e, entry)}
                                                            placeholder="Tags (tag1, tag2)"
                                                            title="Comma-separated tags"
                                                            className="w-full text-[10px] px-1.5 py-0.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link text-slate-700"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={quickAltForms}
                                                            onChange={(e) => setQuickAltForms(e.target.value)}
                                                            onKeyDown={(e) => handleQuickInputKeyDown(e, entry)}
                                                            placeholder="Alts (alt1, alt2)"
                                                            title="Comma-separated alternative headwords"
                                                            className="w-full text-[10px] px-1.5 py-0.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-link text-slate-700"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-1 max-w-[150px]">
                                                        {altCount > 0 && (
                                                            <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/50">
                                                                ALT {altCount}
                                                            </span>
                                                        )}
                                                        {tags.slice(0, 2).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="text-[9px] bg-slate-50 border border-slate-200/60 px-1 py-0.5 rounded text-slate-500 truncate max-w-[70px]"
                                                                title={resolveTagLabel(tag, term)}
                                                            >
                                                                {resolveTagLabel(tag, term)}
                                                            </span>
                                                        ))}
                                                        {tags.length > 2 && (
                                                            <span
                                                                className="text-[9px] text-slate-400 font-semibold"
                                                                title={tags.slice(2).join(', ')}
                                                            >
                                                                +{tags.length - 2}
                                                            </span>
                                                        )}
                                                        {altCount === 0 && tags.length === 0 && (
                                                            <span className="text-black/20 text-[10px]">—</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Date */}
                                            <td className={cn('py-2 px-3', isEditing && 'align-top pt-3.5')}>
                                                <span className="font-mono text-[10px] text-black/40">
                                                    {entry.created_at ? entry.created_at.slice(0, 10) : '—'}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className={cn('py-2 px-3 text-right', isEditing && 'align-top pt-2.5')}>
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveQuickEdit(entry)}
                                                            disabled={quickSavingId === entry.id}
                                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs transition-colors flex items-center justify-center disabled:opacity-50"
                                                            title={`${term('save') || 'Save'} (Enter)`}
                                                        >
                                                            {quickSavingId === entry.id ? (
                                                                <RefreshCw size={13} className="animate-spin" />
                                                            ) : (
                                                                <Check size={14} strokeWidth={2.5} />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelQuickEdit}
                                                            disabled={quickSavingId === entry.id}
                                                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors flex items-center justify-center disabled:opacity-50"
                                                            title={`${term('cancel') || 'Cancel'} (Esc)`}
                                                        >
                                                            <X size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <Link
                                                            to={`/entry/${entry.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 text-slate-400 hover:text-link hover:bg-link/10 rounded transition-colors"
                                                            title={term('view') || 'View entry'}
                                                        >
                                                            <ExternalLink size={13} />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartQuickEdit(entry)}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                            title={term('quick-edit') || 'Quick edit inline'}
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditEntry(entry); setShowForm(true); }}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title={term('full-edit') || 'Full edit modal'}
                                                        >
                                                            <Maximize2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(entry.id, entry.headword)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title={term('delete') || 'Delete entry'}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Pagination Controls */}
            {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-light pt-4 px-1">
                    <span className="text-xs text-black/50 font-medium">
                        {term('showing') || 'Showing'} {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} {term('of') || 'of'} {total.toLocaleString()} {term('entries') || 'entries'}
                    </span>
                    {Math.ceil(total / PAGE_SIZE) > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="h-8 px-2.5 text-xs"
                            >
                                {term('previous') || 'Previous'}
                            </Button>

                            {getPageNumbers(page, Math.ceil(total / PAGE_SIZE)).map((item, idx) => {
                                if (item === '...') {
                                    return (
                                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-black/40 font-mono select-none">
                                            …
                                        </span>
                                    );
                                }
                                const pageNum = item as number;
                                const isActive = pageNum === page;
                                return (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => setPage(pageNum)}
                                        className={cn(
                                            'min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center',
                                            isActive
                                                ? 'bg-link text-white border-link shadow-xs font-bold'
                                                : 'bg-white text-black/70 border-black/10 hover:border-black/25 hover:bg-black/5',
                                        )}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
                                onClick={() => setPage((p) => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))}
                                className="h-8 px-2.5 text-xs"
                            >
                                {term('next') || 'Next'}
                            </Button>
                        </div>
                    )}
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
                    onSaved={handleSaved}
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

const POS_ALIAS_GROUPS: Record<string, string[]> = {
    noun: ['noun', 'n'],
    verb: ['verb', 'v'],
    adjective: ['adjective', 'adj'],
    adverb: ['adverb', 'adv'],
    preposition: ['preposition', 'prep'],
    conjunction: ['conjunction', 'conj'],
    particle: ['particle', 'part'],
    article: ['article', 'art', 'det'],
    pronoun: ['pronoun', 'pron'],
    interrogative: ['interrogative', 'int', 'intg'],
    numeral: ['numeral', 'num'],
    interjection: ['interjection', 'intj'],
    participle: ['participle', 'ptcp'],
};

function posMatchesFilter(entryPos: string | null | undefined, selectedPos: string) {
    const normalizedEntryPos = normalizePos(entryPos);
    const normalizedFilter = normalizePos(selectedPos);
    if (!normalizedEntryPos || !normalizedFilter || normalizedFilter === 'all') return false;

    if (normalizedEntryPos === normalizedFilter) return true;

    const entryAliases = POS_ALIAS_GROUPS[normalizedEntryPos] || [normalizedEntryPos];
    const filterAliases = POS_ALIAS_GROUPS[normalizedFilter] || [normalizedFilter];
    return entryAliases.some((alias) => filterAliases.includes(alias));
}

function normalizePos(value: string | null | undefined) {
    return String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
}

export type EntryAuditStatus = 'action-needed' | 'partial' | 'complete';

export interface EntryAuditInfo {
    status: EntryAuditStatus;
    label: string;
    issues: string[];
}

export function evaluateEntryAudit(
    entry: AdminEntry,
    term: (key: string, ...args: any[]) => string
): EntryAuditInfo {
    const issues: string[] = [];
    const normPos = entry.pos?.trim().toLowerCase() || '';

    // Check Definition / Gloss
    const hasDef = Boolean(entry.text_en?.trim());
    if (!hasDef) {
        issues.push(term('missing-definition') || 'Missing definition');
    }

    // Check Root vs Loanword
    const hasRoot = Boolean(entry.root_consonants?.trim());
    const isLoan = Boolean(entry.is_loanword || entry.source_language);
    const isMajorPos = ['verb', 'noun', 'adjective', 'participle'].includes(normPos);

    if (!hasRoot && !isLoan && isMajorPos) {
        issues.push(term('missing-root') || 'Missing root consonants');
    }

    // Check POS
    if (!normPos) {
        issues.push(term('missing-pos') || 'Missing part of speech');
    }

    // Specific grammar completeness checks
    const verbClass = entry.verb_class || entry.verb_morphology?.verb_class;
    if (normPos === 'verb' && !entry.verb_form && !verbClass) {
        issues.push(term('unclassified-verb') || 'Unclassified verb (missing form/class)');
    }

    if (normPos === 'noun' && !entry.gender) {
        issues.push(term('missing-gender') || 'Missing gender');
    }

    if (issues.length === 0) {
        return {
            status: 'complete',
            label: term('audit-complete') || 'Complete',
            issues: [term('entry-complete') || 'All essential fields present'],
        };
    }

    // Determine severity: critical vs partial
    const hasCritical = !hasDef || (!hasRoot && !isLoan && isMajorPos) || !normPos;

    return {
        status: hasCritical ? 'action-needed' : 'partial',
        label: hasCritical ? (term('action-needed') || 'Action Needed') : (term('partial') || 'Incomplete'),
        issues,
    };
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
        return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
}

