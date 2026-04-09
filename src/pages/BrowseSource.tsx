import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { BrowsePageHeader } from '@/components/browse/BrowsePageHeader';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { apiGetDistinctValues, apiSearch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SourceBucketData {
    value: string;
    label: string;
    entries: any[];
    total: number;
    loading: boolean;
}

function buildSearchHref(sourceLanguage: string) {
    const params = new URLSearchParams();
    params.set('source_language', sourceLanguage);
    return params.toString();
}

export function BrowseSource() {
    const { term } = useLinguisticMode();
    const [sources, setSources] = useState<SourceBucketData[]>([]);
    const [loadingSources, setLoadingSources] = useState(true);

    useEffect(() => {
        let cancelled = false;

        setLoadingSources(true);
        apiGetDistinctValues('source_languages')
            .then((values) => {
                if (cancelled) return;

                const initialSources = values.map((value) => ({
                    value,
                    label: term(value.toLowerCase()),
                    entries: [],
                    total: 0,
                    loading: true,
                }));

                setSources(initialSources);

                initialSources.forEach((source, index) => {
                    apiSearch('', {
                        source_language: source.value,
                        limit: 3,
                        includePending: true,
                        includeSuggested: true,
                    })
                        .then((res) => {
                            if (cancelled) return;

                            setSources((prev) => {
                                const next = [...prev];
                                if (next[index]) {
                                    next[index] = {
                                        ...next[index],
                                        entries: res.results,
                                        total: res.total,
                                        loading: false,
                                    };
                                }
                                return next;
                            });
                        })
                        .catch((err) => {
                            console.error(`Failed to fetch source language ${source.value}:`, err);
                            if (cancelled) return;

                            setSources((prev) => {
                                const next = [...prev];
                                if (next[index]) {
                                    next[index].loading = false;
                                }
                                return next;
                            });
                        });
                });

                setLoadingSources(false);
            })
            .catch((err) => {
                console.error('Failed to fetch source languages:', err);
                if (!cancelled) {
                    setLoadingSources(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [term]);

    return (
        <div className="space-y-8">
            <BrowsePageHeader active="source" description={term('browse-by-source-desc')} />

            {loadingSources ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-link" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {sources.map((source) => {
                        const searchHref = buildSearchHref(source.value);

                        return (
                            <Card
                                key={source.value}
                                className={cn(
                                    'border border-black/5 bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden flex flex-col min-h-[280px] group transition-all duration-300 hover:shadow-xl hover:shadow-black/5',
                                )}
                            >
                                <div className="p-8 flex flex-col h-full">
                                    <div className="flex items-center justify-between gap-4 mb-6">
                                        <div>
                                            <h3 className="font-serif text-2xl font-bold text-black group-hover:text-link transition-colors">
                                                <Link to={`/search?${searchHref}`} className="hover:underline">
                                                    {source.label}
                                                </Link>
                                            </h3>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/30 mt-2">
                                                {term('primary-source-language')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/30">Total</p>
                                            <p className="text-sm font-bold text-black">{source.total.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        {source.loading ? (
                                            <div className="space-y-4">
                                                {[...Array(3)].map((_, j) => (
                                                    <div key={j} className="h-12 bg-black/5 rounded-xl animate-pulse" />
                                                ))}
                                            </div>
                                        ) : source.entries.length > 0 ? (
                                            <div className="space-y-5">
                                                {source.entries.map((entry) => (
                                                    <div key={entry.id} className="space-y-1">
                                                        <Link
                                                            to={`/entry/${entry.id}`}
                                                            className="flex items-center gap-3 group/entry py-0.5"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-black/10 group-hover/entry:bg-link transition-colors" />
                                                            <span className="font-serif text-[1.1rem] font-bold text-black group-hover/entry:text-link transition-colors">
                                                                {entry.headword}
                                                            </span>
                                                            <span className="text-[9px] text-text-muted uppercase font-sans tracking-wider opacity-60">
                                                                {entry.pos}
                                                            </span>
                                                        </Link>
                                                        {(entry.definition_en || (entry.definitions && entry.definitions[0])) && (
                                                            <p className="text-[12px] text-text-muted pl-4.5 line-clamp-1 italic">
                                                                {entry.definition_en || entry.definitions[0].text_en}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-12 text-center opacity-30">
                                                <SearchIcon size={32} className="mb-2" />
                                                <p className="text-xs font-medium uppercase tracking-wider">No entries yet</p>
                                            </div>
                                        )}
                                    </div>

                                    {!source.loading && source.total > 0 && (
                                        <div className="mt-8 pt-6 border-t border-black/5">
                                            <Link
                                                to={`/search?${searchHref}`}
                                                className="inline-flex items-center gap-2 text-xs font-bold text-link hover:underline uppercase tracking-wider"
                                            >
                                                {term('view-all')} <ArrowRight size={12} />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
