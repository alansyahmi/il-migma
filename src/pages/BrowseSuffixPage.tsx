import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { BrowsePageHeader } from '@/components/browse/BrowsePageHeader';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { apiSearch } from '@/lib/api';
import type { SearchResult } from '@/types';
import { cn } from '@/lib/utils';

interface SuffixOption {
    id: 'dual' | 'sound_plural_masc' | 'sound_plural_fem' | 'abstract_noun' | 'augmentative';
    groupLabelKey: 'nominal-suffixes' | 'derivational-suffixes';
    label: string;
    suffix: string;
    description: string;
}
const SUFFIX_OPTIONS: SuffixOption[] = [
    {
        id: 'dual',
        groupLabelKey: 'nominal-suffixes',
        label: 'Dual',
        suffix: '-ejn',
        description: 'Inflectional dual ending used by noun paradigms.',
    },
    {
        id: 'sound_plural_masc',
        groupLabelKey: 'nominal-suffixes',
        label: 'Sound Plural Masculine',
        suffix: '-i',
        description: 'Masculine sound plural ending.',
    },
    {
        id: 'sound_plural_fem',
        groupLabelKey: 'nominal-suffixes',
        label: 'Sound Plural Feminine',
        suffix: '-iet',
        description: 'Feminine sound plural ending.',
    },
    {
        id: 'abstract_noun',
        groupLabelKey: 'derivational-suffixes',
        label: 'Abstract Nouns',
        suffix: '-ija',
        description: 'Word-formation ending for abstract noun derivations.',
    },
    {
        id: 'augmentative',
        groupLabelKey: 'derivational-suffixes',
        label: 'Augmentatives',
        suffix: '-un',
        description: 'Derivational ending used for augmentative forms.',
    },
];
const DEFAULT_SUFFIX = SUFFIX_OPTIONS[0]?.suffix ?? '-ejn';

function isSuffixValue(value: string | null): value is string {
    return Boolean(value && SUFFIX_OPTIONS.some((option) => option.suffix === value));
}

function suffixHref(option: SuffixOption) {
    const params = new URLSearchParams();
    params.set('suffix', option.suffix);
    params.set('suffix_kind', option.groupLabelKey === 'nominal-suffixes' ? 'nominal' : 'derivational');
    return params.toString();
}

function SuffixEntryCard({ entry }: { entry: SearchResult }) {
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

function SuffixOptionCard({
    option,
    active,
    onSelect,
}: {
    option: SuffixOption;
    active: boolean;
    onSelect: (option: SuffixOption) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
                'text-left rounded-3xl border bg-white/65 backdrop-blur-md p-6 transition-all duration-300 hover:shadow-lg hover:shadow-black/5',
                active
                    ? 'border-link/40 ring-1 ring-link/20 shadow-lg shadow-link/10'
                    : 'border-black/5 hover:border-black/10',
            )}
        >
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/30">
                        {option.groupLabelKey === 'nominal-suffixes'
                            ? 'Nominal Suffix'
                            : 'Derivational Suffix'}
                    </p>
                    <h3 className="mt-2 font-serif text-3xl font-bold text-black">
                        {option.suffix}
                    </h3>
                </div>
                <span className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                    {option.label}
                </span>
            </div>

            <p className="text-sm text-text-muted leading-relaxed">
                {option.description}
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-link uppercase tracking-wider">
                {active ? 'Selected' : 'Browse'} <ArrowRight size={12} />
            </div>
        </button>
    );
}

function SelectedSuffixCard({ option }: { option: SuffixOption }) {
    const searchHref = suffixHref(option);

    return (
        <Card className="border border-black/5 bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
            <Link
                to={`/search?${searchHref}`}
                className="block p-8 group hover:bg-white/70 transition-colors"
            >
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/30">
                            {option.groupLabelKey === 'nominal-suffixes'
                                ? 'Nominal Suffix'
                                : 'Derivational Suffix'}
                        </p>
                        <h3 className="mt-2 font-serif text-5xl font-bold text-black group-hover:text-link transition-colors">
                            {option.suffix}
                        </h3>
                        <p className="mt-2 text-sm text-text-muted leading-relaxed max-w-xl">
                            {option.label} {option.description}
                        </p>
                    </div>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                        SUFFIX
                    </span>
                </div>

                <div className="inline-flex items-center gap-2 text-xs font-bold text-link uppercase tracking-wider">
                    View entries <ArrowRight size={12} />
                </div>
            </Link>
        </Card>
    );
}

export function BrowseSuffixPage() {
    const { term } = useLinguisticMode();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedSuffixValue, setSelectedSuffixValue] = useState(() => {
        const initial = searchParams.get('suffix');
        return isSuffixValue(initial) ? initial : DEFAULT_SUFFIX;
    });
    const [results, setResults] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const selectedOption = useMemo(
        () => SUFFIX_OPTIONS.find((option) => option.suffix === selectedSuffixValue) ?? SUFFIX_OPTIONS[0],
        [selectedSuffixValue],
    );

    useEffect(() => {
        document.title = `${term('browse-by-suffix')} | Il-Miġma'`;
    }, [term]);

    useEffect(() => {
        const nextSuffix = searchParams.get('suffix');
        if (isSuffixValue(nextSuffix) && nextSuffix !== selectedSuffixValue) {
            setSelectedSuffixValue(nextSuffix);
        } else if (!nextSuffix && selectedSuffixValue !== DEFAULT_SUFFIX) {
            setSelectedSuffixValue(DEFAULT_SUFFIX);
        }
    }, [searchParams, selectedSuffixValue]);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        const suffixKind = selectedOption.groupLabelKey === 'nominal-suffixes' ? 'nominal' : 'derivational';
        apiSearch('', {
            suffix: selectedOption.suffix,
            suffix_kind: suffixKind,
            limit: 6,
            includePending: true,
            includeSuggested: true,
        })
            .then((res) => {
                if (cancelled) return;
                setResults(res.results);
                setTotal(res.total);
                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Failed to fetch suffix browse results:', err);
                setResults([]);
                setTotal(0);
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedOption.groupLabelKey, selectedOption.suffix]);

    const handleSelect = (option: SuffixOption) => {
        setSelectedSuffixValue(option.suffix);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('suffix', option.suffix);
        nextParams.set('suffix_kind', option.groupLabelKey === 'nominal-suffixes' ? 'nominal' : 'derivational');
        setSearchParams(nextParams);
    };

    return (
        <div className="space-y-10">
            <BrowsePageHeader active="suffix" description={term('browse-by-suffix-desc')} />

            <div className="flex flex-wrap items-center gap-3 mb-8">
                {SUFFIX_OPTIONS.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelect(option)}
                        className={cn(
                            'inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all',
                            selectedSuffixValue === option.suffix
                                ? 'bg-link text-white border-link shadow-sm shadow-link/20'
                                : 'bg-white/75 text-black/55 border-black/5 hover:text-black hover:border-black/10',
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="space-y-8">
                <SelectedSuffixCard option={selectedOption} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {SUFFIX_OPTIONS.map((option) => (
                        <SuffixOptionCard
                            key={option.id}
                            option={option}
                            active={selectedSuffixValue === option.suffix}
                            onSelect={handleSelect}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-4 mb-20">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-black/35">
                            {term('suffix')}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                            {loading
                                ? 'Loading entries...'
                                : total > 0
                                    ? term('browse-suffix-summary')
                                        .replace('{count}', total.toLocaleString())
                                        .replace('{suffix}', selectedOption.suffix)
                                    : term('browse-suffix-empty')}
                        </p>
                    </div>

                    <span className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                        {selectedOption.label}
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-link" />
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {results.map((entry) => (
                            <SuffixEntryCard key={entry.id} entry={entry} />
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

                {!loading && total > 0 && (
                    <div className="mt-8 pt-6 border-t border-black/5">
                        <Link
                            to={`/search?${suffixHref(selectedOption)}`}
                            className="inline-flex items-center gap-2 text-xs font-bold text-link hover:underline uppercase tracking-wider"
                        >
                            {term('view-all')} <ArrowRight size={12} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
