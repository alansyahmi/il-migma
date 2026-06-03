import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { BrowsePageHeader } from '@/components/browse/BrowsePageHeader';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { apiSearch } from '@/lib/api';
import { cn } from '@/lib/utils';

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

function isPOSKey(value: string | null): value is POSKey {
    return Boolean(value && POS_LIST.some((pos) => pos.key === value));
}

interface SubcategoryData {
    label: string;
    group?: string;
    filter: Record<string, string>;
    forms?: string[];
    entries: any[];
    total: number;
    loading: boolean;
}

function buildSearchParams(subcategory: Pick<SubcategoryData, 'filter' | 'forms'>) {
    const params = new URLSearchParams();

    Object.entries(subcategory.filter).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });

    const forms = subcategory.forms ?? (subcategory.filter.form ? [subcategory.filter.form] : []);
    forms.forEach((form) => params.append('form', form));

    return params.toString();
}

export function BrowseHome() {
    const { term } = useLinguisticMode();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedPOS, setSelectedPOS] = useState<POSKey>(() => {
        const initialPOS = searchParams.get('pos');
        return isPOSKey(initialPOS) ? initialPOS : DEFAULT_POS;
    });
    const [subcategories, setSubcategories] = useState<SubcategoryData[]>([]);
    const [counts, setCounts] = useState<{ total: number }>({ total: 0 });

    const ALPHABET = [
        'A', 'B', 'Ċ', 'D', 'E', 'F', 'Ġ', 'G', 'GĦ', 'H', 'Ħ', 'I', 'IE', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Ż', 'Z',
    ];
    const TAB_CLASS =
        'relative -mb-px border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-link/25 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
    useEffect(() => {
        document.title = `${term('browse-entries')} | Il-Miġma'`;
    }, [term]);

    useEffect(() => {
        const nextPOS = searchParams.get('pos');
        if (isPOSKey(nextPOS) && nextPOS !== selectedPOS) {
            setSelectedPOS(nextPOS);
        } else if (!nextPOS && selectedPOS !== DEFAULT_POS) {
            setSelectedPOS(DEFAULT_POS);
        }
    }, [searchParams, selectedPOS]);

    const handlePOSChange = (nextPOS: POSKey) => {
        setSelectedPOS(nextPOS);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('pos', nextPOS);
        setSearchParams(nextParams);
    };

    useEffect(() => {
        let isActive = true;
        let configs: { label: string; filter: Record<string, string>; group?: string; forms?: string[] }[] = [];

        if (selectedPOS === 'all') {
            configs = [
                { label: term('verb'), filter: { pos: 'verb' } },
                { label: term('noun'), filter: { pos: 'noun' } },
                { label: term('adjective'), filter: { pos: 'adjective' } },
                { label: term('adverb'), filter: { pos: 'adverb' } },
                { label: term('numeral'), filter: { pos: 'numeral' } },
                { label: term('other'), filter: { pos: 'other' } },
            ];
        } else if (selectedPOS === 'verb') {
            const triForms = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
            const triConfigs = triForms.map((f) => ({
                label: `Form ${f}`,
                group: term('triliteral'),
                filter: { pos: 'verb', form: f, verb_type: 'triliteral' },
            }));

            const formXConfig = {
                label: 'Form X',
                group: term('triliteral'),
                filter: { pos: 'verb', verb_type: 'triliteral' },
                forms: ['X', 'Xa', 'Xb'],
            };

            const quadForms = ['I', 'II'];
            const quadConfigs = quadForms.map((f) => ({
                label: `Form ${f}`,
                group: term('quadriliteral'),
                filter: { pos: 'verb', form: f, verb_type: 'quadriliteral' },
            }));

            configs = [...triConfigs, formXConfig, ...quadConfigs];
        } else if (selectedPOS === 'noun') {
            configs = [
                { label: term('masculine'), filter: { pos: 'noun', gender: 'masculine' } },
                { label: term('feminine'), filter: { pos: 'noun', gender: 'feminine' } },
                { label: term('semitic'), filter: { pos: 'noun', type: 'semitic' } },
                { label: term('romance'), filter: { pos: 'noun', type: 'romance' } },
            ];
        } else if (selectedPOS === 'other') {
            configs = [
                { label: term('preposition'), filter: { pos: 'preposition' } },
                { label: term('conjunction'), filter: { pos: 'conjunction' } },
                { label: term('particle'), filter: { pos: 'particle' } },
                { label: term('article'), filter: { pos: 'article' } },
                { label: term('interjection'), filter: { pos: 'interjection' } },
            ];
        } else {
            configs = [{ label: term(selectedPOS), filter: { pos: selectedPOS } }];
        }

        const initialSubcategories = configs.map((c) => ({
            ...c,
            entries: [],
            total: 0,
            loading: true,
        }));

        setSubcategories(initialSubcategories);

        initialSubcategories.forEach((sub, index) => {
            apiSearch('', {
                ...sub.filter,
                limit: 3,
                includePending: true,
                includeSuggested: true,
                ...(sub.forms?.length ? { forms: sub.forms } : {}),
            })
                .then((res) => {
                    if (!isActive) return;
                    setSubcategories((prev) => {
                        if (!isActive) return prev;
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
                    if (!isActive) return;
                    console.error(`Failed to fetch ${sub.label}:`, err);
                    setSubcategories((prev) => {
                        if (!isActive) return prev;
                        const next = [...prev];
                        if (next[index]) {
                            next[index] = {
                                ...next[index],
                                loading: false,
                            };
                        }
                        return next;
                    });
                });
        });

        return () => {
            isActive = false;
        };
    }, [selectedPOS, term]);

    useEffect(() => {
        apiSearch('', { limit: 0 })
            .then((res) => setCounts({ total: res.total }))
            .catch((err) => console.error('Failed to fetch browse count:', err));
    }, []);

    return (
        <>
            <BrowsePageHeader
                active="entries"
                description={term('home-desc', {
                    count: counts.total > 0 ? counts.total.toLocaleString() : '—',
                })}
            />

            <div className="mb-10">
                <div
                    role="tablist"
                    aria-label={term('browse-by-pos')}
                    className="flex flex-wrap items-end gap-1 border-b border-black/10"
                >
                    {POS_LIST.map((pos) => {
                        const isActive = selectedPOS === pos.key;

                        return (
                            <button
                                key={pos.key}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => handlePOSChange(pos.key)}
                                className={cn(
                                    TAB_CLASS,
                                    isActive
                                        ? 'border-link text-black'
                                        : 'border-transparent text-black/50 hover:border-black/20 hover:text-black',
                                )}
                            >
                                {term(pos.label)}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-16 mb-20">
                {(() => {
                    const groups: { name?: string; subs: SubcategoryData[] }[] = [];
                    subcategories.forEach((sub) => {
                        const lastGroup = groups[groups.length - 1];
                        if (!lastGroup || lastGroup.name !== sub.group) {
                            groups.push({ name: sub.group, subs: [sub] });
                        } else {
                            lastGroup.subs.push(sub);
                        }
                    });

                    return groups.map((g, gi) => (
                        <div key={gi} className="space-y-8">
                            {g.name && (
                                <div className="flex items-center gap-4">
                                    <h2 className="font-serif text-2xl font-bold text-black border-l-4 border-link pl-4">
                                        {g.name}
                                    </h2>
                                    <div className="h-px flex-1 bg-black/5" />
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {g.subs.map((sub, i) => {
                                    const searchHref = buildSearchParams(sub);

                                    return (
                                        <Card key={i} className="border border-black/5 bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden flex flex-col min-h-[300px] group transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
                                            <div className="p-8 flex flex-col h-full">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="font-serif text-2xl font-bold text-black group-hover:text-link transition-colors">
                                                        <Link to={`/search?${searchHref}`} className="hover:underline">
                                                            {sub.label}
                                                        </Link>
                                                    </h3>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/30">{term('total')}</p>
                                                        <p className="text-sm font-bold text-black">{sub.total.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    {sub.loading ? (
                                                        <div className="space-y-4">
                                                            {[...Array(3)].map((_, j) => (
                                                                <div key={j} className="h-12 bg-black/5 rounded-xl animate-pulse" />
                                                            ))}
                                                        </div>
                                                    ) : sub.entries.length > 0 ? (
                                                        <div className="space-y-5">
                                                            {sub.entries.map((entry) => (
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
                                                            <p className="text-xs font-medium uppercase tracking-wider">{term('no-entries-yet')}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {!sub.loading && sub.total > 0 && (
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
                        </div>
                    ));
                })()}
            </div>

            <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-10 border border-black/5">
                <h2 className="font-serif text-2xl font-bold text-black mb-8 flex items-center justify-center sm:justify-start gap-3">
                    {term('browse-by-letter')}
                </h2>

                <div className="flex flex-wrap gap-2.5 justify-center">
                    {ALPHABET.map((letter) => (
                        <Link
                            key={letter}
                            to={`/search?q=${letter}&lemma=true`}
                            className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-white border border-black/5 text-lg font-serif font-bold text-black hover:bg-link hover:text-white hover:border-link transition-all duration-200 shadow-sm hover:shadow-link/20"
                        >
                            {letter}
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}
