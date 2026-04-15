import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Edit2, Plus, Trash2 } from 'lucide-react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrowsePageHeader } from '@/components/browse/BrowsePageHeader';
import { BrowseViewSwitch, type BrowseViewMode } from '@/components/browse/BrowseViewSwitch';
import { SuffixCatalogFormModal } from '@/components/admin/SuffixCatalogFormModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import {
    adminCreateSuffixCatalog,
    adminDeleteSuffixCatalog,
    adminUpdateSuffixCatalog,
    apiGetSuffixCatalog,
    type SuffixCatalogItem,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type SuffixGroup = 'all' | 'nominal' | 'derivational';
type SuffixViewMode = BrowseViewMode;
type SuffixEditorKind = 'nominal' | 'derivational';

const TAB_CLASS =
    'relative -mb-px border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-link/25 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
const POS_GROUP_ORDER = [
    'noun',
    'verb',
    'adjective',
    'adverb',
    'numeral',
    'participle',
    'pronoun',
    'preposition',
    'conjunction',
    'article',
    'interjection',
    'particle',
] as const;

function getSuffixKindLabel(kind: SuffixCatalogItem['kind']) {
    return kind === 'nominal'
        ? 'Nominal Suffixes'
        : 'Derivational Suffixes';
}

function titleCase(value: string) {
    return value
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function normalizeToken(value: unknown) {
    return String(value || '').trim().toLowerCase();
}

function getSamplePosLabel(value: string) {
    const normalized = normalizeToken(value);
    return normalized ? titleCase(normalized) : 'Other';
}

function SuffixCard({
    item,
    canEdit = false,
    onEdit,
    onDelete,
    deleting = false,
}: {
    item: SuffixCatalogItem;
    canEdit?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    deleting?: boolean;
}) {
    return (
        <Card className="relative border border-black/5 bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
            {canEdit && (
                <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEdit?.();
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/55 shadow-sm transition-colors hover:border-link hover:text-link"
                        aria-label={`Edit ${item.suffix}`}
                        title="Edit suffix"
                    >
                        <Edit2 size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete?.();
                        }}
                        disabled={deleting}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/45 shadow-sm transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                        aria-label={`Delete ${item.suffix}`}
                        title="Delete suffix"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
            <Link
                to={`/suffix/${item.kind}/${encodeURIComponent(item.suffix)}`}
                className={cn(
                    'block p-6 group hover:bg-white/70 transition-colors h-full',
                    canEdit ? 'pr-24' : '',
                )}
            >
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/30">
                            {getSuffixKindLabel(item.kind)}
                        </p>
                        <h3 className="mt-3 font-serif text-3xl font-bold text-black group-hover:text-link transition-colors">
                            {item.suffix}
                        </h3>
                    </div>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                        {item.count}
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="inline-flex max-w-full rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                        {item.label}
                    </div>
                    {item.sample_headword ? (
                        <p className="text-sm text-text-muted leading-relaxed">
                            Example: <span className="font-medium text-black">{item.sample_headword}</span>
                            {item.sample_pos ? (
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-black/35">
                                    {item.sample_pos}
                                </span>
                            ) : null}
                        </p>
                    ) : (
                        <p className="text-sm text-text-muted leading-relaxed">
                            Representative suffix form from the database.
                        </p>
                    )}
                </div>

                <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-link uppercase tracking-wider">
                    Browse <ArrowRight size={12} />
                </div>
            </Link>
        </Card>
    );
}

export function BrowseSuffixCatalogPage() {
    const { t } = useLanguage();
    const { term } = useLinguisticMode();
    const { isAdmin } = useAuth();
    const { getToken } = useClerkAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [catalog, setCatalog] = useState<SuffixCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [suffixEditor, setSuffixEditor] = useState<SuffixCatalogItem | null>(null);
    const [suffixEditorKind, setSuffixEditorKind] = useState<SuffixEditorKind>('nominal');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const modeParam = searchParams.get('mode');
    const [selectedMode, setSelectedMode] = useState<SuffixViewMode>(
        modeParam === 'pos' ? 'pos' : 'morphology',
    );

    const activeGroup = useMemo<SuffixGroup>(() => {
        const group = searchParams.get('group');
        return group === 'nominal' || group === 'derivational' ? group : 'all';
    }, [searchParams]);

    const activePosGroup = useMemo(() => {
        const group = searchParams.get('pos_group');
        const normalized = normalizeToken(group);
        return POS_GROUP_ORDER.includes(normalized as typeof POS_GROUP_ORDER[number])
            ? normalized
            : 'all';
    }, [searchParams]);

    useEffect(() => {
        document.title = `${t('Browse by Suffix', 'Ibbrawżja skont is-Suffiss')} | Il-Miġma'`;
    }, [t]);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const items = await apiGetSuffixCatalog();
            setCatalog(items);
        } catch (err) {
            console.error('Failed to fetch suffix catalog:', err);
            setCatalog([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const nextMode = searchParams.get('mode') === 'pos' ? 'pos' : 'morphology';
        if (nextMode !== selectedMode) {
            setSelectedMode(nextMode);
        }
    }, [searchParams, selectedMode]);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    const tabs = useMemo(() => {
        const nominalCount = catalog.filter((item) => item.kind === 'nominal').length;
        const derivationalCount = catalog.filter((item) => item.kind === 'derivational').length;

        return [
            { id: 'all' as const, label: t('All', 'Kollox'), count: catalog.length },
            ...(nominalCount > 0
                ? [{ id: 'nominal' as const, label: t('Nominal Suffixes', 'Suffissi Nominali'), count: nominalCount }]
                : []),
            ...(derivationalCount > 0
                ? [{ id: 'derivational' as const, label: t('Derivational Suffixes', 'Suffissi Dderivati'), count: derivationalCount }]
                : []),
        ];
    }, [catalog, t]);

    const posTabs = useMemo(() => {
        const counts = new Map<string, number>();
        catalog.forEach((item) => {
            const key = normalizeToken(item.sample_pos) || 'other';
            counts.set(key, (counts.get(key) || 0) + 1);
        });

        const entries = Array.from(counts.entries())
            .filter(([, count]) => count > 0)
            .sort((a, b) => {
                const aIndex = POS_GROUP_ORDER.indexOf(a[0] as typeof POS_GROUP_ORDER[number]);
                const bIndex = POS_GROUP_ORDER.indexOf(b[0] as typeof POS_GROUP_ORDER[number]);
                if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0]);
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });

        return [
            { id: 'all' as const, label: 'All', count: catalog.length },
            ...entries.map(([key, count]) => ({
                id: key,
                label: getSamplePosLabel(key),
                count,
            })),
        ];
    }, [catalog]);

    const posSections = useMemo(() => {
        const groups = new Map<string, SuffixCatalogItem[]>();

        catalog.forEach((item) => {
            const key = normalizeToken(item.sample_pos) || 'other';
            const next = groups.get(key) ?? [];
            groups.set(key, [...next, item]);
        });

        const ordered = posTabs
            .filter((tab) => tab.id === 'all' || (groups.get(tab.id) ?? []).length > 0)
            .map((tab) => ({
                key: tab.id,
                label: tab.label,
                items: tab.id === 'all'
                    ? catalog
                    : groups.get(tab.id) ?? [],
            }));

        if (activePosGroup !== 'all') {
            return ordered.filter((section) => section.key === activePosGroup);
        }

        return ordered;
    }, [activePosGroup, catalog, posTabs]);

    const visibleCatalog = useMemo(() => {
        if (activeGroup === 'nominal' || activeGroup === 'derivational') {
            return catalog.filter((item) => item.kind === activeGroup);
        }
        return catalog;
    }, [activeGroup, catalog]);

    const nominalItems = catalog.filter((item) => item.kind === 'nominal');
    const derivationalItems = catalog.filter((item) => item.kind === 'derivational');

    const setGroup = (group: SuffixGroup) => {
        const nextParams = new URLSearchParams(searchParams);
        if (group === 'all') nextParams.delete('group');
        else nextParams.set('group', group);
        nextParams.delete('pos_group');
        setSearchParams(nextParams);
    };

    const setPosGroup = (group: string) => {
        const nextParams = new URLSearchParams(searchParams);
        if (group === 'all') nextParams.delete('pos_group');
        else nextParams.set('pos_group', group);
        setSearchParams(nextParams);
    };

    const setMode = (nextMode: SuffixViewMode) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', nextMode);
        setSearchParams(nextParams);
    };

    const openSuffixEditor = (item?: SuffixCatalogItem) => {
        setSuffixEditor(item ?? null);
        setSuffixEditorKind(item?.kind ?? (activeGroup === 'derivational' ? 'derivational' : 'nominal'));
    };

    const closeSuffixEditor = () => {
        setSuffixEditor(null);
    };

    const saveSuffixEditor = async (value: { kind: SuffixEditorKind; suffix: string; label: string }) => {
        const token = await getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const nextSortOrder = suffixEditor?.sort_order ?? (catalog.reduce((max, item) => Math.max(max, Number(item.sort_order ?? 0)), -1) + 1);

        if (suffixEditor?.id) {
            await adminUpdateSuffixCatalog(token, suffixEditor.id, {
                kind: value.kind,
                suffix: value.suffix,
                label: value.label,
                sort_order: nextSortOrder,
            });
        } else {
            await adminCreateSuffixCatalog(token, {
                kind: value.kind,
                suffix: value.suffix,
                label: value.label,
                sort_order: nextSortOrder,
            });
        }

        await loadCatalog();
        closeSuffixEditor();
    };

    const deleteSuffix = async (item: SuffixCatalogItem) => {
        if (!item.id) return;
        if (!confirm(`Delete "${item.label}" (${item.suffix})?`)) return;

        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            setDeletingId(item.id);
            await adminDeleteSuffixCatalog(token, item.id);
            await loadCatalog();
        } catch (error) {
            console.error('Failed to delete suffix:', error);
            alert(error instanceof Error ? error.message : String(error));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-10">
            <BrowsePageHeader active="suffix" description={term('browse-by-suffix-desc')} />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div
                    role="tablist"
                    aria-label={selectedMode === 'pos' ? 'Browse suffixes by part of speech' : 'Browse suffixes by kind'}
                    className="flex flex-wrap items-end gap-1 border-b border-black/10"
                >
                    {selectedMode === 'pos'
                        ? posTabs.map((tab) => {
                            const isActive = activePosGroup === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setPosGroup(tab.id)}
                                    className={cn(
                                        TAB_CLASS,
                                        'inline-flex items-center gap-2',
                                        isActive
                                            ? 'border-link text-black'
                                            : 'border-transparent text-black/50 hover:border-black/20 hover:text-black',
                                    )}
                                >
                                    <span>{tab.label}</span>
                                    <span className="text-[10px] opacity-80">{tab.count}</span>
                                </button>
                            );
                        })
                        : tabs.map((tab) => {
                            const isActive = activeGroup === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setGroup(tab.id)}
                                    className={cn(
                                        TAB_CLASS,
                                        'inline-flex items-center gap-2',
                                        isActive
                                            ? 'border-link text-black'
                                            : 'border-transparent text-black/50 hover:border-black/20 hover:text-black',
                                    )}
                                >
                                    <span>{tab.label}</span>
                                    <span className="text-[10px] opacity-80">{tab.count}</span>
                                </button>
                            );
                        })}
                </div>

                <BrowseViewSwitch
                    mode={selectedMode}
                    onChange={setMode}
                    ariaLabel="Browse suffix view mode"
                    className="lg:ml-auto"
                />
            </div>

            <div className="flex items-center justify-end">
                {isAdmin && (
                    <Button
                        type="button"
                        onClick={() => openSuffixEditor()}
                        leftIcon={<Plus size={14} />}
                    >
                        Add suffix
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-link" />
                </div>
            ) : selectedMode === 'morphology' ? (
                visibleCatalog.length > 0 ? (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/35">
                                {activeGroup === 'all'
                                        ? t('Browse by Suffix', 'Ibbrawżja skont is-Suffiss')
                                        : activeGroup === 'nominal'
                                            ? t('Nominal Suffixes', 'Suffissi Nominali')
                                            : t('Derivational Suffixes', 'Suffissi Dderivati')}
                            </p>
                                <p className="mt-1 text-sm text-text-muted">
                                    {activeGroup === 'all'
                                        ? `${catalog.length.toLocaleString()} suffixes in the catalog.`
                                        : `${visibleCatalog.length.toLocaleString()} ${activeGroup === 'nominal' ? 'nominal' : 'derivational'} suffixes available.`}
                                </p>
                            </div>
                        </div>

                        {activeGroup === 'all' ? (
                            <>
                                {nominalItems.length > 0 ? (
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="border-l-4 border-link pl-5">
                                                <h2 className="font-serif text-3xl font-bold text-black">
                                                    {t('Nominal Suffixes', 'Suffissi Nominali')}
                                                </h2>
                                            </div>
                                            <div className="h-px flex-1 bg-black/8" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {nominalItems.map((item) => (
                                                <SuffixCard
                                                    key={item.id ?? `${item.kind}:${item.suffix}:${item.label}`}
                                                    item={item}
                                                    canEdit={isAdmin}
                                                    deleting={Boolean(item.id && deletingId === item.id)}
                                                    onEdit={isAdmin ? () => openSuffixEditor(item) : undefined}
                                                    onDelete={isAdmin ? () => deleteSuffix(item) : undefined}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ) : null}

                                {derivationalItems.length > 0 ? (
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="border-l-4 border-link pl-5">
                                                <h2 className="font-serif text-3xl font-bold text-black">
                                                    {t('Derivational Suffixes', 'Suffissi Dderivati')}
                                                </h2>
                                            </div>
                                            <div className="h-px flex-1 bg-black/8" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {derivationalItems.map((item) => (
                                                <SuffixCard
                                                    key={item.id ?? `${item.kind}:${item.suffix}:${item.label}`}
                                                    item={item}
                                                    canEdit={isAdmin}
                                                    deleting={Boolean(item.id && deletingId === item.id)}
                                                    onEdit={isAdmin ? () => openSuffixEditor(item) : undefined}
                                                    onDelete={isAdmin ? () => deleteSuffix(item) : undefined}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ) : null}
                            </>
                        ) : (
                            <section className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="border-l-4 border-link pl-5">
                                        <h2 className="font-serif text-3xl font-bold text-black">
                                            {activeGroup === 'nominal'
                                                ? t('Nominal Suffixes', 'Suffissi Nominali')
                                                : t('Derivational Suffixes', 'Suffissi Dderivati')}
                                        </h2>
                                    </div>
                                    <div className="h-px flex-1 bg-black/8" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {visibleCatalog.map((item) => (
                                        <SuffixCard
                                            key={item.id ?? `${item.kind}:${item.suffix}:${item.label}`}
                                            item={item}
                                            canEdit={isAdmin}
                                            deleting={Boolean(item.id && deletingId === item.id)}
                                            onEdit={isAdmin ? () => openSuffixEditor(item) : undefined}
                                            onDelete={isAdmin ? () => deleteSuffix(item) : undefined}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="font-serif text-2xl font-bold text-black">No suffixes found</p>
                        <p className="mt-2 text-sm text-text-muted max-w-md">
                            {term('browse-suffix-empty')}
                        </p>
                    </div>
                )
            ) : posSections.length > 0 ? (
                <div className="space-y-8">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/35">
                                {term('part-of-speech')}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">
                                {activePosGroup === 'all'
                                    ? `${catalog.length.toLocaleString()} suffixes grouped by part of speech.`
                                    : `${posSections[0]?.items.length.toLocaleString() ?? '0'} ${getSamplePosLabel(activePosGroup)} suffixes available.`}
                            </p>
                        </div>
                    </div>

                    {posSections.map((section) => (
                        <section key={section.key} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="border-l-4 border-link pl-5">
                                    <h2 className="font-serif text-3xl font-bold text-black">
                                        {section.label}
                                    </h2>
                                </div>
                                <div className="h-px flex-1 bg-black/8" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {section.items.map((item) => (
                                    <SuffixCard
                                        key={item.id ?? `${item.kind}:${item.suffix}:${item.label}`}
                                        item={item}
                                        canEdit={isAdmin}
                                        deleting={Boolean(item.id && deletingId === item.id)}
                                        onEdit={isAdmin ? () => openSuffixEditor(item) : undefined}
                                        onDelete={isAdmin ? () => deleteSuffix(item) : undefined}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="font-serif text-2xl font-bold text-black">No suffixes found</p>
                    <p className="mt-2 text-sm text-text-muted max-w-md">
                        {term('browse-suffix-empty')}
                    </p>
                </div>
            )}

            {suffixEditor !== null && (
                <SuffixCatalogFormModal
                    item={suffixEditor}
                    initialKind={suffixEditorKind}
                    onClose={closeSuffixEditor}
                    onSave={saveSuffixEditor}
                />
            )}
        </div>
    );
}
