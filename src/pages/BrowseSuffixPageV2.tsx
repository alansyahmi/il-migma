export { BrowseSuffixCatalogPage, BrowseSuffixCatalogPage as BrowseSuffixPageV2 } from './BrowseSuffixCatalogPage';
/*

type SuffixGroup = 'all' | 'nominal' | 'derivational';

function normalizeSuffixParam(value: string | null): string {
    return String(value ?? '')
        .trim()
        .normalize('NFC')
        .replace(/[–—−]/g, '-');
}

function suffixQueryString(item: SuffixCatalogItem) {
    const params = new URLSearchParams();
    params.set('suffix', item.suffix);
    params.set('suffix_kind', item.kind);
    return params.toString();
}

function EntryCard({ entry }: { entry: SearchResult }) {
    return (
        <Card className="border border-black/5 bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden flex flex-col min-h-[240px] group transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
            <div className="p-8 flex flex-col h-full">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="font-serif text-2xl font-bold text-black group-hover:text-link transition-colors">
                            <Link to={`/entry/${entry.id}`} className="hover:underline">
                                {entry.headword}
                            </Link>
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/30 mt-2">
                            {entry.pos}
                        </p>
                    </div>
                </div>

                <div className="flex-1">
                    {(entry.definition_en || (entry.definitions && entry.definitions[0])) ? (
                        <p className="text-sm text-text-muted italic leading-relaxed line-clamp-4">
                            {entry.definition_en || entry.definitions[0].text_en}
                        </p>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center opacity-30">
                            <SearchIcon size={28} className="mb-2" />
                            <p className="text-xs font-medium uppercase tracking-wider">No gloss available</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-black/5">
                    <Link
                        to={`/entry/${entry.id}`}
                        className="inline-flex items-center gap-2 text-xs font-bold text-link hover:underline uppercase tracking-wider"
                    >
                        View entry <ArrowRight size={12} />
                    </Link>
                </div>
            </div>
        </Card>
    );
}

function SuffixCard({
    item,
    active,
    onSelect,
    kindLabel,
}: {
    item: SuffixCatalogItem;
    active: boolean;
    onSelect: (item: SuffixCatalogItem) => void;
    kindLabel: string;
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
                'group text-left rounded-3xl border bg-white/65 backdrop-blur-md p-6 min-h-[220px] transition-all duration-300 hover:shadow-lg hover:shadow-black/5',
                active
                    ? 'border-link/40 ring-1 ring-link/20 shadow-lg shadow-link/10'
                    : 'border-black/5 hover:border-black/10',
            )}
        >
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/30">
                        {kindLabel}
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
                {active ? 'Selected' : 'Browse'} <ArrowRight size={12} />
            </div>
        </button>
    );
}

export function BrowseSuffixPage() {
    const { t } = useLanguage();
    const { term } = useLinguisticMode();
    const [searchParams, setSearchParams] = useSearchParams();
    const [catalog, setCatalog] = useState<SuffixCatalogItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [resultsLoading, setResultsLoading] = useState(true);

    const activeGroup = useMemo<SuffixGroup>(() => {
        const group = searchParams.get('group');
        return group === 'nominal' || group === 'derivational' ? group : 'all';
    }, [searchParams]);

    const selectedSuffixParam = normalizeSuffixParam(searchParams.get('suffix'));
    const selectedKindParam = searchParams.get('suffix_kind')?.trim().toLowerCase();

    const visibleCatalog = useMemo(() => {
        if (activeGroup === 'nominal' || activeGroup === 'derivational') {
            return catalog.filter((item) => item.kind === activeGroup);
        }
        return catalog;
    }, [activeGroup, catalog]);

    const selectedItem = useMemo(() => {
        if (selectedSuffixParam) {
            const exact = catalog.find((item) => {
                if (item.suffix !== selectedSuffixParam) return false;
                if (selectedKindParam !== 'nominal' && selectedKindParam !== 'derivational') return true;
                return item.kind === selectedKindParam;
            });
            if (exact) return exact;
        }

        return visibleCatalog[0] ?? catalog[0] ?? null;
    }, [catalog, selectedKindParam, selectedSuffixParam, visibleCatalog]);

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

    useEffect(() => {
        document.title = `${t('Browse by Suffix', 'Ibbrawżja skont is-Suffiss')} | Il-Miġma'`;
    }, [t]);

    useEffect(() => {
        let cancelled = false;

        setCatalogLoading(true);
        apiGetSuffixCatalog()
            .then((items) => {
                if (!cancelled) setCatalog(items);
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error('Failed to fetch suffix catalog:', err);
                    setCatalog([]);
                }
            })
            .finally(() => {
                if (!cancelled) setCatalogLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        if (!selectedItem) {
            setResults([]);
            setTotal(0);
            setResultsLoading(false);
            return () => {
                cancelled = true;
            };
        }

        setResultsLoading(true);
        apiSearch('', {
            suffix: selectedItem.suffix,
            suffix_kind: selectedItem.kind,
            limit: 6,
            includePending: true,
            includeSuggested: true,
        })
            .then((res) => {
                if (cancelled) return;
                setResults(res.results);
                setTotal(res.total);
                setResultsLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Failed to fetch suffix browse results:', err);
                setResults([]);
                setTotal(0);
                setResultsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedItem?.kind, selectedItem?.suffix]);

    const setGroup = (group: SuffixGroup) => {
        const nextVisible = group === 'all' ? catalog : catalog.filter((item) => item.kind === group);
        if (!nextVisible.length) return;

        const nextSelected =
            selectedItem && (group === 'all' || selectedItem.kind === group)
                ? selectedItem
                : nextVisible[0];

        const nextParams = new URLSearchParams(searchParams);
        if (group === 'all') nextParams.delete('group');
        else nextParams.set('group', group);
        nextParams.set('suffix', nextSelected.suffix);
        nextParams.set('suffix_kind', nextSelected.kind);
        setSearchParams(nextParams);
    };

    const selectSuffix = (item: SuffixCatalogItem) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('group', item.kind);
        nextParams.set('suffix', item.suffix);
        nextParams.set('suffix_kind', item.kind);
        setSearchParams(nextParams);
    };

    const selectedSummary = resultsLoading
        ? 'Loading entries...'
        : total > 0
            ? term('browse-suffix-summary')
                .replace('{count}', total.toLocaleString())
                .replace('{suffix}', selectedItem?.suffix ?? '')
            : term('browse-suffix-empty');

    const renderCards = (items: SuffixCatalogItem[], kindLabel: string) => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
                <SuffixCard
                    key={`${item.kind}:${item.suffix}:${item.label}`}
                    item={item}
                    kindLabel={kindLabel}
                    active={selectedItem?.suffix === item.suffix && selectedItem?.kind === item.kind}
                    onSelect={selectSuffix}
                />
            ))}
        </div>
    );

    return (
        <div className="space-y-10">
            <BrowsePageHeader active="suffix" description={term('browse-by-suffix-desc')} />

            <div className="flex flex-wrap items-center gap-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setGroup(tab.id)}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all',
                            activeGroup === tab.id
                                ? 'bg-link text-white border-link shadow-sm shadow-link/20'
                                : 'bg-white/75 text-black/55 border-black/5 hover:text-black hover:border-black/10',
                        )}
                    >
                        <span>{tab.label}</span>
                        <span className="text-[10px] opacity-80">{tab.count}</span>
                    </button>
                ))}
            </div>

            {catalogLoading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-link" />
                </div>
            ) : visibleCatalog.length > 0 ? (
                <div className="space-y-8">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/35">
                                {activeGroup === 'all'
                                    ? t('Browse by Suffix', 'Ibbrawżja skont is-Suffiss')
                                    : activeGroup === 'nominal'
                                        ? t('Nominal Suffixes', 'Suffissi Nominali')
                                        : t('Derivational Suffixes', 'Suffissi Dderivati')}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">
                                {selectedItem
                                    ? term('browse-suffix-summary')
                                        .replace('{count}', selectedItem.count.toLocaleString())
                                        .replace('{suffix}', selectedItem.suffix)
                                    : term('browse-suffix-empty')}
                            </p>
                        </div>

                        {selectedItem ? (
                            <Link
                                to={`/search?${suffixQueryString(selectedItem)}`}
                                className="inline-flex items-center gap-2 text-xs font-bold text-link hover:underline uppercase tracking-wider"
                            >
                                {term('view-all')} <ArrowRight size={12} />
                            </Link>
                        ) : null}
                    </div>

                    {activeGroup === 'all' ? (
                        <>
                            {catalog.some((item) => item.kind === 'nominal') ? (
                                <section className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="border-l-4 border-link pl-5">
                                            <h2 className="font-serif text-3xl font-bold text-black">
                                                {t('Nominal Suffixes', 'Suffissi Nominali')}
                                            </h2>
                                        </div>
                                        <div className="h-px flex-1 bg-black/8" />
                                    </div>
                                    {renderCards(
                                        catalog.filter((item) => item.kind === 'nominal'),
                                        t('Nominal Suffixes', 'Suffissi Nominali'),
                                    )}
                                </section>
                            ) : null}

                            {catalog.some((item) => item.kind === 'derivational') ? (
                                <section className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="border-l-4 border-link pl-5">
                                            <h2 className="font-serif text-3xl font-bold text-black">
                                                {t('Derivational Suffixes', 'Suffissi Dderivati')}
                                            </h2>
                                        </div>
                                        <div className="h-px flex-1 bg-black/8" />
                                    </div>
                                    {renderCards(
                                        catalog.filter((item) => item.kind === 'derivational'),
                                        t('Derivational Suffixes', 'Suffissi Dderivati'),
                                    )}
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
                            {renderCards(
                                visibleCatalog,
                                activeGroup === 'nominal' ? t('Nominal Suffixes', 'Suffissi Nominali') : t('Derivational Suffixes', 'Suffissi Dderivati'),
                            )}
                        </section>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <SearchIcon size={40} className="text-black/20 mb-4" />
                    <h2 className="font-serif text-2xl font-bold text-black">No suffixes found</h2>
                    <p className="mt-2 text-sm text-text-muted max-w-md">
                        {term('browse-suffix-empty')}
                    </p>
                </div>
            )}

            <div className="mt-4 mb-20">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/35">
                            {t('Suffix', 'Suffiss')}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">{selectedSummary}</p>
                    </div>

                    {selectedItem ? (
                        <span className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                            {selectedItem.label}
                        </span>
                    ) : null}
                </div>

                {resultsLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-link" />
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {results.map((entry) => (
                            <EntryCard key={entry.id} entry={entry} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <SearchIcon size={40} className="text-black/20 mb-4" />
                        <h2 className="font-serif text-2xl font-bold text-black">No entries found</h2>
                        <p className="mt-2 text-sm text-text-muted max-w-md">
                            {term('browse-suffix-empty')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
*/
