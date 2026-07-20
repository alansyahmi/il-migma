import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Edit2, Plus, Search as SearchIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrowsePageHeader } from '@/components/browse/BrowsePageHeader';
import { BrowseViewSwitch, type BrowseViewMode } from '@/components/browse/BrowseViewSwitch';
import { ConfigFormModal } from '@/components/admin/settings/ConfigFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminConfig, type ConfigItem } from '@/lib/adminConfig';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { apiListPatterns, type PatternApiItem } from '@/lib/api';
import { getPatternMetadataSummary } from '@/lib/patternMetadata';
import { cn } from '@/lib/utils';
import { useCatalogRefresh } from '@/hooks/useCatalogRefresh';
import { convertCVTo1V } from '@/lib/maltesePhonology';

const POS_LIST = [
    { key: 'all', label: 'all' },
    { key: 'verb', label: 'verb' },
    { key: 'noun', label: 'noun' },
    { key: 'adjective', label: 'adjective' },
    { key: 'adverb', label: 'adverb' },
    { key: 'numeral', label: 'numeral' },
    { key: 'other', label: 'other' },
] as const;

type POSKey = typeof POS_LIST[number]['key'];

const DEFAULT_POS: POSKey = 'all';
const PRIMARY_POS_SET = new Set<POSKey>(['verb', 'noun', 'adjective', 'adverb', 'numeral']);
const PATTERN_BUCKET_ORDER = [
    'cv_wizen_pattern',
    'broken_pattern',
    'feminine_pattern',
    'sound_suffix',
    'diminutive_pattern',
    'adjective_pattern',
] as const;

type PatternBucketId = typeof PATTERN_BUCKET_ORDER[number] | 'other';
type PatternViewMode = BrowseViewMode;
type MorphologyTabKey = 'all' | PatternBucketId;
type MorphologySelectedBucket = MorphologyTabKey;
type PatternEditorState = {
    item: ConfigItem | null;
} | null;

const SUFFIX_PATTERN_CATEGORIES = new Set(['sound_suffix', 'derivational_suffix', 'dual_suffix']);
const BUCKET_LABEL_KEYS: Record<PatternBucketId, string> = {
    cv_wizen_pattern: 'canonical-patterns',
    broken_pattern: 'broken-plural',
    feminine_pattern: 'feminine-singular',
    sound_suffix: 'sound-plural-suffix',
    diminutive_pattern: 'diminutive',
    adjective_pattern: 'elative',
    other: 'other',
};
const TAB_CLASS =
    'relative -mb-px border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-link/25 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

interface PatternApplicabilityRow {
    category?: string;
    pos?: string;
    role?: string;
    gender?: string;
    stress?: number;
    sort_order?: number;
}

interface PatternCardData extends PatternApiItem {
    applicability: PatternApplicabilityRow[];
}

function isPOSKey(value: string | null): value is POSKey {
    return Boolean(value && POS_LIST.some((pos) => pos.key === value));
}

function normalizeToken(value: unknown) {
    return String(value || '').trim().toLowerCase();
}

function isHyphenatedNotation(pattern: PatternCardData) {
    return [pattern.cv_notation, pattern.wizen_notation].some((value) => String(value || '').trim().startsWith('-'));
}

function getRawPatternApplicabilities(pattern: PatternCardData): PatternApplicabilityRow[] {
    const rows = Array.isArray(pattern.applicability) ? pattern.applicability : [];
    return rows
        .map((row) => ({
            category: normalizeToken(row.category),
            pos: normalizeToken(row.pos),
            role: normalizeToken(row.role),
            gender: normalizeToken(row.gender),
            stress: Number.isFinite(Number(row.stress)) ? Number(row.stress) : undefined,
            sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : undefined,
        }))
        .filter((row) => row.category || row.pos);
}

function getPatternApplicabilities(pattern: PatternApiItem): PatternApplicabilityRow[] {
    return getRawPatternApplicabilities(pattern as PatternCardData)
        .filter((row) => !SUFFIX_PATTERN_CATEGORIES.has(row.category || ''));
}

function isSuffixPattern(pattern: PatternCardData) {
    const rows = getRawPatternApplicabilities(pattern);
    const hasSuffixCategory = rows.some((row) => SUFFIX_PATTERN_CATEGORIES.has(row.category || ''));
    const hasNonSuffixCategory = rows.some((row) => row.category && !SUFFIX_PATTERN_CATEGORIES.has(row.category));

    if (hasNonSuffixCategory) return false;
    if (hasSuffixCategory) return true;
    return isHyphenatedNotation(pattern);
}

function rowMatchesPOS(row: PatternApplicabilityRow, selectedPOS: POSKey) {
    if (!row.pos) return false;
    if (selectedPOS === 'all') return row.pos === 'all';
    if (row.pos === 'all') return false;
    if (selectedPOS === 'other') return !PRIMARY_POS_SET.has(row.pos as POSKey);
    return row.pos === selectedPOS;
}

function patternMatchesPOS(pattern: PatternApiItem, selectedPOS: POSKey) {
    const rows = getPatternApplicabilities(pattern);
    return rows.some((row) => rowMatchesPOS(row, selectedPOS));
}

function getMorphologyBucketIds(pattern: PatternCardData): PatternBucketId[] {
    const categories = Array.from(
        new Set(
            getPatternApplicabilities(pattern)
                .map((row) => row.category)
                .filter((category): category is string => Boolean(category)),
        ),
    );

    if (categories.length === 0) return ['other'];

    return Array.from(
        new Set(
            categories.map((category) => (
                PATTERN_BUCKET_ORDER.includes(category as typeof PATTERN_BUCKET_ORDER[number])
                    ? (category as PatternBucketId)
                    : 'other'
            )),
        ),
    );
}

function getBucketLabel(bucketId: PatternBucketId, term: (key: string) => string) {
    return term(BUCKET_LABEL_KEYS[bucketId] || bucketId);
}

function buildPatternFormValue(pattern: PatternCardData) {
    const applicabilities = pattern.applicability.map((row) => ({
        pos: row.pos || 'noun',
        linguisticRole: row.role || '',
        gender: row.gender || '',
        notes: '',
        metadata: {
            category: row.category || '',
            stress: row.stress,
            sort_order: row.sort_order,
        },
    }));

    return {
        cv: pattern.cv_notation,
        wizen: pattern.wizen_notation,
        description: pattern.description || '',
        pos_types: Array.from(new Set(applicabilities.map((app) => app.pos).filter(Boolean))),
        applicabilities,
    };
}

function toPatternConfigKey(pattern: PatternCardData) {
    return `${pattern.cv_notation}/${pattern.wizen_notation}`;
}

function pickPatternConfigItem(pattern: PatternCardData, items: ConfigItem[]) {
    const key = toPatternConfigKey(pattern);
    const candidates = items.filter((item) => item.key === key);

    if (candidates.length === 0) return null;

    const priority: string[] = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern', 'plural_pattern'];
    return [...candidates].sort((a, b) => {
        const indexA = priority.indexOf(a.category);
        const indexB = priority.indexOf(b.category);
        if (indexA !== indexB) {
            return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
        }
        return (a.sort_order || 0) - (b.sort_order || 0);
    })[0] || null;
}

function PatternCard({
    pattern,
    bucketId,
    onEdit,
    canEdit = false,
}: {
    pattern: PatternCardData;
    bucketId: PatternBucketId;
    onEdit?: () => void;
    canEdit?: boolean;
}) {
    const { term, mode } = useLinguisticMode();
    const summary = getPatternMetadataSummary({
        cv: pattern.cv_notation,
        wizen: pattern.wizen_notation,
        pos_types: pattern.applicability.map((row) => row.pos).filter(Boolean),
        applicabilities: pattern.applicability.map((row) => ({
            pos: row.pos || 'all',
            linguistic_role: row.role || '',
            gender: row.gender || '',
            notes: row.category || '',
            metadata: {
                category: row.category || '',
                stress: row.stress,
                sort_order: row.sort_order,
            },
        })),
    }, bucketId === 'other' ? undefined : bucketId);

    return (
        <Card className="relative border border-black/5 bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
            {canEdit && onEdit && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/55 shadow-sm transition-colors hover:border-link hover:text-link"
                    aria-label={term('edit-pattern')}
                    title={term('edit-pattern')}
                >
                    <Edit2 size={15} />
                </button>
            )}
            <Link
                to={`/pattern/${pattern.id}`}
                className={cn(
                    'block p-6 group hover:bg-white/70 transition-colors h-full',
                    canEdit ? 'pr-16' : '',
                )}
            >
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h3 className="font-serif text-2xl font-bold text-black group-hover:text-link transition-colors">
                            {mode !== 'arabised' ? convertCVTo1V(pattern.cv_notation) : pattern.cv_notation}
                        </h3>
                        <p className="text-sm italic text-black/50 mt-1">
                            {pattern.wizen_notation}
                        </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-black/30 bg-black/5 px-2 py-1 rounded">
                        {getBucketLabel(bucketId, term)}
                    </span>
                </div>

                {pattern.description && (
                    <p className="text-sm text-text-muted italic leading-relaxed line-clamp-3">
                        {pattern.description}
                    </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                    {summary.posTypes.slice(0, 3).map((pos) => (
                        <span
                            key={pos}
                            className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45"
                        >
                            {term(pos)}
                        </span>
                    ))}
                    {summary.posTypes.length > 3 && (
                        <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
                            +{summary.posTypes.length - 3}
                        </span>
                    )}
                </div>

                <div className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-link uppercase tracking-wider">
                    {term('view-all')} <ArrowRight size={12} />
                </div>
            </Link>
        </Card>
    );
}

export function BrowsePatternPage() {
    const { term } = useLinguisticMode();
    const { isAdmin } = useAuth();
    const { getCategoryItems, createItem, updateItem, refresh: refreshAdminConfig } = useAdminConfig();
    const [searchParams, setSearchParams] = useSearchParams();
    const modeParam = searchParams.get('mode');
    const [selectedMode, setSelectedMode] = useState<PatternViewMode>(
        modeParam === 'morphology' ? 'morphology' : 'pos',
    );
    const [selectedPOS, setSelectedPOS] = useState<POSKey>(() => {
        const initialPOS = searchParams.get('pos');
        return isPOSKey(initialPOS) ? initialPOS : DEFAULT_POS;
    });
    const [selectedBucket, setSelectedBucket] = useState<MorphologySelectedBucket>(() => {
        const initialBucket = searchParams.get('bucket');
        return initialBucket && (initialBucket === 'other' || PATTERN_BUCKET_ORDER.includes(initialBucket as typeof PATTERN_BUCKET_ORDER[number]))
            ? (initialBucket as PatternBucketId)
            : 'all';
    });
    const [patterns, setPatterns] = useState<PatternCardData[]>([]);
    const [loadingPatterns, setLoadingPatterns] = useState(true);
    const [patternEditor, setPatternEditor] = useState<PatternEditorState>(null);

    useEffect(() => {
        document.title = `${term('browse-by-pattern')} | Il-Miġma'`;
    }, [term]);

    useEffect(() => {
        const nextMode = searchParams.get('mode') === 'morphology' ? 'morphology' : 'pos';
        if (nextMode !== selectedMode) {
            setSelectedMode(nextMode);
        }
    }, [searchParams, selectedMode]);

    useEffect(() => {
        const nextPOS = searchParams.get('pos');
        if (isPOSKey(nextPOS) && nextPOS !== selectedPOS) {
            setSelectedPOS(nextPOS);
        } else if (!nextPOS && selectedPOS !== DEFAULT_POS) {
            setSelectedPOS(DEFAULT_POS);
        }
    }, [searchParams, selectedPOS]);

    useEffect(() => {
        const nextBucket = searchParams.get('bucket');
        const normalizedBucket = nextBucket && (nextBucket === 'other' || PATTERN_BUCKET_ORDER.includes(nextBucket as typeof PATTERN_BUCKET_ORDER[number]))
            ? (nextBucket as PatternBucketId)
            : 'all';
        if (normalizedBucket !== selectedBucket) {
            setSelectedBucket(normalizedBucket);
        }
    }, [searchParams, selectedBucket]);

    const handlePOSChange = (nextPOS: POSKey) => {
        setSelectedPOS(nextPOS);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('pos', nextPOS);
        nextParams.set('mode', 'pos');
        nextParams.delete('bucket');
        setSearchParams(nextParams);
    };

    const handleBucketChange = (bucketId: MorphologySelectedBucket) => {
        setSelectedBucket(bucketId);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', 'morphology');
        if (bucketId === 'all') {
            nextParams.delete('bucket');
        } else {
            nextParams.set('bucket', bucketId);
        }
        setSearchParams(nextParams);
    };

    const handleModeChange = (nextMode: PatternViewMode) => {
        setSelectedMode(nextMode);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', nextMode);
        if (nextMode === 'pos') {
            nextParams.delete('bucket');
        }
        setSearchParams(nextParams);
    };

    const loadPatterns = useCallback(async () => {
        setLoadingPatterns(true);
        try {
            const res = await apiListPatterns();
            setPatterns(
                res.patterns.map((pattern) => ({
                    ...pattern,
                    applicability: Array.isArray(pattern.applicability) ? pattern.applicability : [],
                })),
            );
        } catch (err) {
            console.error('Failed to fetch patterns:', err);
        } finally {
            setLoadingPatterns(false);
        }
    }, []);

    useEffect(() => {
        loadPatterns();
    }, [loadPatterns]);

    useCatalogRefresh(() => loadPatterns(), { intervalMs: 60_000 });

    const patternConfigItems = useMemo(() => getCategoryItems('cv_wizen_pattern'), [getCategoryItems]);

    const openPatternEditor = (pattern?: PatternCardData) => {
        const existingItem = pattern ? pickPatternConfigItem(pattern, patternConfigItems) : null;
        setPatternEditor({
            item: existingItem ?? (pattern ? {
                id: '',
                category: 'cv_wizen_pattern',
                key: toPatternConfigKey(pattern),
                value: buildPatternFormValue(pattern),
                sort_order: 0,
            } : null),
        });
    };

    const closePatternEditor = () => setPatternEditor(null);

    const savePatternEditor = async ({ key, value }: { key: string; value: unknown }) => {
        const draft = patternEditor?.item;
        if (draft?.id) {
            await updateItem({ ...draft, key, value }, { refresh: false });
        } else {
            await createItem({ category: 'cv_wizen_pattern', key, value, sort_order: draft?.sort_order ?? 0 }, { refresh: false });
        }

        await refreshAdminConfig();
        await loadPatterns();
        closePatternEditor();
    };

    const browsePatterns = useMemo(
        () => patterns.filter((pattern) => !isSuffixPattern(pattern)),
        [patterns],
    );

    const visiblePatterns = useMemo(
        () => browsePatterns.filter((pattern) => patternMatchesPOS(pattern, selectedPOS)),
        [browsePatterns, selectedPOS],
    );

    const bucketGroups = useMemo(() => {
        const groups = new Map<PatternBucketId, PatternCardData[]>();

        visiblePatterns.forEach((pattern) => {
            const rows = getPatternApplicabilities(pattern).filter((row) => rowMatchesPOS(row, selectedPOS));
            const categories = Array.from(
                new Set(
                    rows
                        .map((row) => row.category)
                        .filter((category): category is string => Boolean(category)),
                ),
            );

            const targetCategories = categories.length > 0 ? categories : ['other'];
            targetCategories.forEach((category) => {
                const bucketId = (PATTERN_BUCKET_ORDER.includes(category as typeof PATTERN_BUCKET_ORDER[number])
                    ? category
                    : 'other') as PatternBucketId;
                const next = groups.get(bucketId) ?? [];
                if (!next.some((item) => item.id === pattern.id)) {
                    groups.set(bucketId, [...next, pattern]);
                }
            });
        });

        return [
            ...PATTERN_BUCKET_ORDER
                .map((bucketId) => ({
                    bucketId,
                    label: getBucketLabel(bucketId, term),
                    patterns: groups.get(bucketId) ?? [],
                }))
                .filter((group) => group.patterns.length > 0),
            ...(groups.has('other')
                ? [{
                    bucketId: 'other' as PatternBucketId,
                    label: term('other'),
                    patterns: groups.get('other') ?? [],
                }]
                : []),
        ];
    }, [selectedPOS, term, visiblePatterns]);

    const morphologyBuckets = useMemo(() => {
        const groups = new Map<PatternBucketId, PatternCardData[]>();

        browsePatterns.forEach((pattern) => {
            getMorphologyBucketIds(pattern).forEach((bucketId) => {
                const next = groups.get(bucketId) ?? [];
                if (!next.some((item) => item.id === pattern.id)) {
                    groups.set(bucketId, [...next, pattern]);
                }
            });
        });

        return groups;
    }, [browsePatterns]);

    const morphologyTabs = useMemo(() => {
        const tabs: Array<{ key: MorphologyTabKey; label: string }> = [{ key: 'all', label: term('all') }];

        PATTERN_BUCKET_ORDER.forEach((bucketId) => {
            if ((morphologyBuckets.get(bucketId) ?? []).length > 0) {
                tabs.push({ key: bucketId, label: getBucketLabel(bucketId, term) });
            }
        });

        if ((morphologyBuckets.get('other') ?? []).length > 0) {
            tabs.push({ key: 'other', label: term('other') });
        }

        return tabs;
    }, [morphologyBuckets, term]);

    const morphologySections = useMemo(() => {
        if (selectedBucket !== 'all') {
            const items = morphologyBuckets.get(selectedBucket) ?? [];
            return items.length > 0
                ? [{
                    bucketId: selectedBucket,
                    label: getBucketLabel(selectedBucket, term),
                    patterns: items,
                }]
                : [];
        }

        return [
            ...PATTERN_BUCKET_ORDER
                .map((bucketId) => ({
                    bucketId,
                    label: getBucketLabel(bucketId, term),
                    patterns: morphologyBuckets.get(bucketId) ?? [],
                }))
                .filter((group) => group.patterns.length > 0),
            ...((morphologyBuckets.get('other') ?? []).length > 0
                ? [{
                    bucketId: 'other' as PatternBucketId,
                    label: term('other'),
                    patterns: morphologyBuckets.get('other') ?? [],
                }]
                : []),
        ];
    }, [morphologyBuckets, selectedBucket, term]);

    const totalVisible = selectedMode === 'pos'
        ? visiblePatterns.length
        : selectedBucket === 'all'
            ? browsePatterns.length
            : (morphologyBuckets.get(selectedBucket) ?? []).length;
    const totalGroups = selectedMode === 'pos' ? bucketGroups.length : morphologySections.length;
    const summaryLabel = selectedMode === 'pos'
        ? term('pattern')
        : selectedBucket === 'all'
            ? term('pattern')
            : getBucketLabel(selectedBucket, term);

    return (
        <>
            <BrowsePageHeader active="pattern" description={term('browse-facets-desc')} />

            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div
                    role="tablist"
                    aria-label={selectedMode === 'pos' ? term('browse-by-pos') : term('browse-by-morphology')}
                    className="flex flex-wrap items-end gap-1 border-b border-black/10"
                >
                    {(selectedMode === 'pos' ? POS_LIST : morphologyTabs).map((tab) => {
                        const isActive = selectedMode === 'pos'
                            ? selectedPOS === tab.key
                            : selectedBucket === tab.key;

                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => (selectedMode === 'pos' ? handlePOSChange(tab.key as POSKey) : handleBucketChange(tab.key as PatternBucketId))}
                                className={cn(
                                    TAB_CLASS,
                                    isActive
                                        ? 'border-link text-black'
                                        : 'border-transparent text-black/50 hover:border-black/20 hover:text-black',
                                )}
                            >
                                {selectedMode === 'pos' ? term(tab.label) : tab.label}
                            </button>
                        );
                    })}
                </div>

                <BrowseViewSwitch
                    mode={selectedMode}
                    onChange={handleModeChange}
                    ariaLabel={term('browse-view-mode')}
                    className="lg:ml-auto"
                />
            </div>

            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/35">
                        {summaryLabel}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                        {totalVisible > 0
                            ? term('browse-pattern-summary', {
                                count: totalVisible.toLocaleString(),
                                groups: String(totalGroups),
                            })
                            : term('browse-pattern-empty')}
                    </p>
                </div>

                {isAdmin && (
                    <Button
                        type="button"
                        onClick={() => openPatternEditor()}
                        leftIcon={<Plus size={14} />}
                        className="sm:self-end"
                    >
                        {term('add-pattern')}
                    </Button>
                )}
            </div>

            {loadingPatterns ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-link" />
                </div>
            ) : selectedMode === 'pos' ? (
                bucketGroups.length > 0 ? (
                <div className="space-y-16 mb-20">
                    {bucketGroups.map((group) => (
                        <section key={group.bucketId} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <h2 className="font-serif text-2xl font-bold text-black border-l-4 border-link pl-4">
                                    {group.label}
                                </h2>
                                <div className="h-px flex-1 bg-black/5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                                    {group.patterns.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.patterns.map((pattern) => (
                                    <PatternCard
                                        key={pattern.id}
                                        pattern={pattern}
                                        bucketId={group.bucketId}
                                        canEdit={isAdmin}
                                        onEdit={isAdmin ? () => openPatternEditor(pattern) : undefined}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <SearchIcon size={40} className="text-black/20 mb-4" />
                        <h2 className="font-serif text-2xl font-bold text-black">{term('no-patterns-found')}</h2>
                        <p className="mt-2 text-sm text-text-muted max-w-md">
                            {term('no-patterns-found-desc')}
                        </p>
                    </div>
                )
            ) : morphologySections.length > 0 ? (
                <div className="space-y-16 mb-20">
                    {morphologySections.map((group) => (
                        <section key={group.bucketId} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <h2 className="font-serif text-2xl font-bold text-black border-l-4 border-link pl-4">
                                    {group.label}
                                </h2>
                                <div className="h-px flex-1 bg-black/5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                                    {group.patterns.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.patterns.map((pattern) => (
                                    <PatternCard
                                        key={pattern.id}
                                        pattern={pattern}
                                        bucketId={group.bucketId}
                                        canEdit={isAdmin}
                                        onEdit={isAdmin ? () => openPatternEditor(pattern) : undefined}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <SearchIcon size={40} className="text-black/20 mb-4" />
                    <h2 className="font-serif text-2xl font-bold text-black">{term('no-patterns-found')}</h2>
                    <p className="mt-2 text-sm text-text-muted max-w-md">
                        {term('no-patterns-found-desc')}
                    </p>
                </div>
            )}

            {patternEditor && (
                <ConfigFormModal
                    item={patternEditor.item}
                    category="cv_wizen_pattern"
                    onClose={closePatternEditor}
                    onSave={savePatternEditor}
                />
            )}
        </>
    );
}
