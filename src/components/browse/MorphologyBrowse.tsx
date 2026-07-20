import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { apiListPatterns, type PatternApiItem } from '@/lib/api';
import { getPatternMetadataSummary } from '@/lib/patternMetadata';
import { cn } from '@/lib/utils';
import { useCatalogRefresh } from '@/hooks/useCatalogRefresh';
import { convertCVTo1V } from '@/lib/maltesePhonology';

const BUCKET_ORDER = [
    'cv_wizen_pattern',
    'broken_pattern',
    'feminine_pattern',
    'sound_suffix',
    'diminutive_pattern',
    'adjective_pattern',
] as const;

type BucketKey = 'all' | typeof BUCKET_ORDER[number] | 'other';

type PatternRow = {
    category?: string;
    pos?: string;
    role?: string;
    gender?: string;
    stress?: number;
    sort_order?: number;
};

type PatternCardData = PatternApiItem & { applicability: PatternRow[] };

type MorphologySection = {
    bucketId: BucketKey;
    label: string;
    patterns: PatternCardData[];
};

const BUCKET_LABEL_KEYS: Record<Exclude<BucketKey, 'all' | 'other'>, string> = {
    cv_wizen_pattern: 'canonical-patterns',
    broken_pattern: 'broken-plural',
    feminine_pattern: 'feminine-singular',
    sound_suffix: 'sound-plural-suffix',
    diminutive_pattern: 'diminutive',
    adjective_pattern: 'elative',
};

const TAB_BASE = 'inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-link/25 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
const TAB_ACTIVE = 'bg-link text-white border-link shadow-sm shadow-link/20';
const TAB_INACTIVE = 'bg-white/75 text-black/55 border-black/5 hover:text-black hover:border-black/10';

function normalizeToken(value: unknown) {
    return String(value || '').trim().toLowerCase();
}

function isBucketKey(value: string | null): value is BucketKey {
    return Boolean(value && (value === 'all' || value === 'other' || BUCKET_ORDER.includes(value as typeof BUCKET_ORDER[number])));
}

function getApplicabilities(pattern: PatternCardData): PatternRow[] {
    const rows = Array.isArray(pattern.applicability) ? pattern.applicability : [];
    return rows.map((row) => ({
        category: normalizeToken(row.category),
        pos: normalizeToken(row.pos),
        role: normalizeToken(row.role),
        gender: normalizeToken(row.gender),
        stress: Number.isFinite(Number(row.stress)) ? Number(row.stress) : undefined,
        sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : undefined,
    }));
}

function getBucketKeys(pattern: PatternCardData): BucketKey[] {
    const categories = Array.from(
        new Set(
            getApplicabilities(pattern)
                .map((row) => row.category)
                .filter((category): category is string => Boolean(category)),
        ),
    );

    if (categories.length === 0) return ['other'];

    return Array.from(new Set(categories.map((category) => (
        BUCKET_ORDER.includes(category as typeof BUCKET_ORDER[number]) ? category as BucketKey : 'other'
    ))));
}

function getBucketLabel(bucketId: BucketKey, term: (key: string) => string) {
    if (bucketId === 'all') return term('all');
    if (bucketId === 'other') return term('other');
    return term(BUCKET_LABEL_KEYS[bucketId] || bucketId);
}

function PatternCard({
    pattern,
    bucketId,
}: {
    pattern: PatternCardData;
    bucketId: BucketKey;
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
        <Card className="border border-black/5 bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
            <Link to={`/pattern/${pattern.id}`} className="block p-6 group hover:bg-white/70 transition-colors h-full">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h3 className="font-serif text-2xl font-bold text-black group-hover:text-link transition-colors">
                            {mode !== 'arabised' ? convertCVTo1V(pattern.cv_notation) : pattern.cv_notation}
                        </h3>
                        <p className="text-sm italic text-black/50 mt-1">{pattern.wizen_notation}</p>
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

export function MorphologyBrowse() {
    const { term } = useLinguisticMode();
    const [searchParams, setSearchParams] = useSearchParams();
    const [patterns, setPatterns] = useState<PatternCardData[]>([]);
    const [loading, setLoading] = useState(true);

    const rawBucket = searchParams.get('bucket');
    const selectedBucket = isBucketKey(rawBucket) ? rawBucket : 'all';

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        apiListPatterns()
            .then((res) => {
                if (cancelled) return;
                setPatterns(
                    res.patterns.map((pattern) => ({
                        ...pattern,
                        applicability: Array.isArray(pattern.applicability) ? pattern.applicability : [],
                    })),
                );
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error('Failed to fetch patterns:', err);
                    setPatterns([]);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useCatalogRefresh(() => {
        setLoading(true);
        return apiListPatterns()
            .then((res) => {
                setPatterns(
                    res.patterns.map((pattern) => ({
                        ...pattern,
                        applicability: Array.isArray(pattern.applicability) ? pattern.applicability : [],
                    })),
                );
            })
            .catch((err) => {
                console.error('Failed to fetch patterns:', err);
                setPatterns([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, { intervalMs: 60_000 });

    const bucketMap = useMemo(() => {
        const map = new Map<BucketKey, PatternCardData[]>();

        patterns.forEach((pattern) => {
            getBucketKeys(pattern).forEach((bucketId) => {
                const next = map.get(bucketId) ?? [];
                if (!next.some((item) => item.id === pattern.id)) {
                    map.set(bucketId, [...next, pattern]);
                }
            });
        });

        return map;
    }, [patterns]);

    const tabs = useMemo(() => {
        const items: Array<{ key: BucketKey; label: string }> = [{ key: 'all', label: term('all') }];

        BUCKET_ORDER.forEach((bucketId) => {
            if ((bucketMap.get(bucketId) ?? []).length > 0) {
                items.push({ key: bucketId, label: getBucketLabel(bucketId, term) });
            }
        });

        if ((bucketMap.get('other') ?? []).length > 0) {
            items.push({ key: 'other', label: term('other') });
        }

        return items;
    }, [bucketMap, term]);

    const activeBucket = selectedBucket === 'all' || tabs.some((tab) => tab.key === selectedBucket)
        ? selectedBucket
        : 'all';

    const sections = useMemo<MorphologySection[]>(() => {
        if (activeBucket !== 'all') {
            const items = bucketMap.get(activeBucket) ?? [];
            return items.length > 0
                ? [{ bucketId: activeBucket, label: getBucketLabel(activeBucket, term), patterns: items }]
                : [];
        }

        return [
            ...BUCKET_ORDER
                .map((bucketId) => ({
                    bucketId,
                    label: getBucketLabel(bucketId, term),
                    patterns: bucketMap.get(bucketId) ?? [],
                }))
                .filter((section) => section.patterns.length > 0),
            ...((bucketMap.get('other') ?? []).length > 0
                ? [{
                    bucketId: 'other' as const,
                    label: term('other'),
                    patterns: bucketMap.get('other') ?? [],
                }]
                : []),
        ];
    }, [activeBucket, bucketMap, term]);

    const setBucket = (bucketId: BucketKey) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', 'morphology');
        if (bucketId === 'all') nextParams.delete('bucket');
        else nextParams.set('bucket', bucketId);
        setSearchParams(nextParams);
    };

    return (
        <div className="space-y-8">
            <div
                role="tablist"
                aria-label="Browse by morphology"
                className="flex flex-wrap items-center gap-2"
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeBucket === tab.key}
                        onClick={() => setBucket(tab.key)}
                        className={cn(
                            TAB_BASE,
                            'min-h-10 px-4 py-2',
                            activeBucket === tab.key ? TAB_ACTIVE : TAB_INACTIVE,
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-link" />
                </div>
            ) : sections.length > 0 ? (
                <div className="space-y-16 mb-20">
                    {sections.map((section) => (
                        <section key={section.bucketId} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <h2 className="font-serif text-2xl font-bold text-black border-l-4 border-link pl-4">
                                    {section.label}
                                </h2>
                                <div className="h-px flex-1 bg-black/5" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {section.patterns.map((pattern) => (
                                    <PatternCard
                                        key={pattern.id}
                                        pattern={pattern}
                                        bucketId={section.bucketId}
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

        </div>
    );
}
