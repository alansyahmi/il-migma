import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Keyboard, MessageSquare, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { apiSearch } from '@/lib/api';
import { useAdminConfig } from '@/lib/adminConfig';

// ── Colours ────────────────────────────────────────────────────────────────
const EGYPTIAN_BLUE = '#1034A6';

// ── Types ──────────────────────────────────────────────────────────────────
interface InflectionRow {
    label: string;
    form: string;
    hasPage: boolean;
    marker?: '*' | '✦'; // these + labels appear at black/55
}

interface SearchResult {
    id: string;
    headword: string;
    root: string;
    rootSlug: string;
    gender?: string;    // shown as Egyptian Blue below root
    pos: string;
    formLines: string[];
    definitions: string[];
    inflections: InflectionRow[];
}

// ── Filter state ───────────────────────────────────────────────────────────
interface Filters {
    maxResults: string;
    pos: string;
    rootType: string;
    source: string;
    searchLemma: boolean;
    searchWordForms: boolean;
    searchEnglishGloss: boolean;
    includeSuggested: boolean;
    includePending: boolean;
}

const DEFAULT_FILTERS: Filters = {
    maxResults: '25',
    pos: '',
    rootType: '',
    source: '',
    searchLemma: false,
    searchWordForms: false,
    searchEnglishGloss: false,
    includeSuggested: false,
    includePending: true,
};

// ── Sub-components ─────────────────────────────────────────────────────────
function FilterSelect({
    label, value, onChange, options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selectedLabel = options.find(o => o.value === value)?.label ?? options[0]?.label;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div>
            <p className="text-xs font-medium text-[#000] mb-1.5">{label}</p>
            <div ref={ref} className="relative">
                {/* Trigger */}
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between bg-white border border-black/10 rounded-md px-3 py-2 text-sm text-[#000] focus:outline-none focus:ring-1 focus:ring-black/20 cursor-pointer text-left"
                >
                    <span>{selectedLabel}</span>
                    <span
                        className="text-[#999] text-xs transition-transform duration-200 ml-2 shrink-0"
                        style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                        ▲
                    </span>
                </button>

                {/* Options list */}
                {open && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-black/10 rounded-md shadow-md overflow-hidden text-sm">
                        {options.map(o => (
                            <li
                                key={o.value}
                                onClick={() => { onChange(o.value); setOpen(false); }}
                                className={cn(
                                    'px-3 py-2 cursor-pointer hover:bg-black/5 transition-colors',
                                    o.value === value ? 'font-medium text-[#000]' : 'text-[#333]',
                                )}
                            >
                                {o.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function FilterCheckbox({
    label, checked, onChange,
}: {
    label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
                className={cn(
                    'w-4 h-4 border rounded-sm flex items-center justify-center shrink-0 transition-colors',
                    checked ? 'bg-[#000] border-[#000]' : 'bg-white border-black/25',
                )}
                onClick={() => onChange(!checked)}
            >
                {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
            <span className="text-sm text-[#000]">{label}</span>
        </label>
    );
}

function InflectionCell({ row }: { row: InflectionRow }) {
    const markerEl = row.marker && (
        <span className="text-black/55 mr-0.5">{row.marker}</span>
    );

    if (row.hasPage) {
        return (
            <Link to={`/entry/${row.form}`} style={{ color: EGYPTIAN_BLUE }}
                className="text-sm hover:underline">
                {markerEl}{row.form}
            </Link>
        );
    }
    if (row.marker) {
        return (
            <span className="text-sm text-black/55">
                {markerEl}{row.form}
            </span>
        );
    }
    return <span className="text-sm text-[#000]">{row.form}</span>;
}

function EntryCard({ result, index }: { result: SearchResult; index: number }) {
    const { term } = useLinguisticMode();
    return (
        <div className="bg-white rounded-xl border border-black/8 shadow-sm overflow-hidden hover:border-black/20 transition-colors">
            <div className="flex flex-col md:grid md:grid-cols-[14rem_6rem_1fr_12rem] min-h-[5rem]">

                {/* Col 1: Index number | headword + root */}
                <div className="px-4 py-4 flex items-start gap-2 border-b md:border-b-0 md:border-r border-black/[0.03]">
                    <span className="text-xs text-black/30 font-sans w-5 shrink-0 pt-1">{index}.</span>
                    <div>
                        <Link to={`/entry/${result.id}`}
                            className="font-serif font-extrabold text-[1.5rem] md:text-[1.35rem] leading-tight text-[#000] hover:underline block">
                            {result.headword}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-2 mt-1">
                            <Link to={`/root/${result.rootSlug}`}
                                style={{ color: EGYPTIAN_BLUE }}
                                className="text-xs hover:underline font-sans font-medium">
                                {result.root}
                            </Link>
                            {result.gender && (
                                <Link to={`/search?gender=${result.gender}`}
                                    style={{ color: EGYPTIAN_BLUE }}
                                    className="text-xs hover:underline font-sans font-medium">
                                    {term(result.gender)}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Col 2: POS block */}
                <div className="px-4 py-3 md:py-4 flex md:flex-col items-center md:items-start gap-2 border-b md:border-b-0 md:border-r border-black/[0.03] bg-black/[0.01] md:bg-transparent">
                    <span className="text-[10px] md:text-xs text-[#000] font-sans font-bold uppercase tracking-wider leading-none md:leading-snug bg-black/5 md:bg-transparent px-1.5 py-0.5 md:p-0 rounded">
                        {term(result.pos)}
                    </span>
                    {result.formLines.map(line => (
                        <span key={line} className="text-[10px] md:text-xs text-[#000] font-sans uppercase tracking-wide leading-snug hidden md:block opacity-60">
                            {line}
                        </span>
                    ))}
                </div>

                {/* Col 3: Definitions */}
                <div className="px-5 py-4 md:py-4 border-b md:border-b-0 md:border-r border-black/[0.03]">
                    {result.definitions.length === 1 ? (
                        <p className="text-base md:text-sm text-[#000] leading-relaxed">{result.definitions[0]}</p>
                    ) : (
                        <ol className="space-y-1 md:space-y-0.5 list-none">
                            {result.definitions.map((def, i) => (
                                <li key={i} className="text-base md:text-sm text-[#000] leading-relaxed">
                                    <span className="text-black/30 mr-1.5 font-sans text-xs">{i + 1}.</span> {def}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* Col 4: Inflections */}
                <div className="px-5 py-4 bg-black/[0.01] md:bg-transparent space-y-2 md:space-y-1">
                    {result.inflections.map((row, i) => (
                        <div key={i} className="flex items-baseline gap-3">
                            <span className="text-[10px] md:text-xs text-black/40 font-sans w-20 md:w-[4.5rem] shrink-0 leading-snug uppercase tracking-tighter">
                                {row.label}
                            </span>
                            <InflectionCell row={row} />
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────
export function Search() {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { getOptions } = useAdminConfig();
    const [searchParams, setSearchParams] = useSearchParams();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    const POS_FILTER_OPTIONS = useMemo(() => [
        { value: '', label: term('all') },
        ...getOptions('pos', mode, language)
    ], [getOptions, mode, language, term]);

    const ROOT_TYPE_FILTER_OPTIONS = useMemo(() => [
        { value: '', label: term('all') },
        ...getOptions('verb_class', mode, language)
    ], [getOptions, mode, language, term]);

    const isSearchPerformed = searchParams.has('q') || searchParams.has('pos') || searchParams.has('type');
    const submitted = searchParams.get('q') ?? '';

    // Effect to fetch from API
    useEffect(() => {
        if (!isSearchPerformed) {
            setResults([]);
            setTotal(0);
            return;
        }

        setLoading(true);
        const q = searchParams.get('q') ?? '';
        const pos = searchParams.get('pos') ?? '';
        const limit = Number(searchParams.get('limit') ?? DEFAULT_FILTERS.maxResults);

        apiSearch(q, { pos, limit })
            .then(res => {
                setTotal(res.total);
                // Map API results to the local SearchResult interface
                const mapped: SearchResult[] = res.results.map((r: any) => {
                    const inflections: InflectionRow[] = [];
                    const formLines: string[] = [];

                    if (r.verb_morphology) {
                        const vm = r.verb_morphology;
                        if (vm.form) formLines.push(`${term('form')} ${vm.form}`);
                        if (vm.transitivity) formLines.push(term(vm.transitivity.toLowerCase()));

                        if (r.verb_perfective_3sgm) {
                            inflections.push({ label: term('perfett'), form: r.verb_perfective_3sgm, hasPage: true });
                        }
                    }

                    return {
                        id: r.id,
                        headword: r.headword,
                        root: r.root_pattern_form?.root?.consonants || '',
                        rootSlug: r.root_pattern_form?.root?.consonants || '',
                        gender: r.noun_gender || (r.pos === 'adjective' ? 'masculine' : undefined),
                        pos: r.pos,
                        formLines,
                        definitions: r.definition_en ? [r.definition_en] : [],
                        inflections,
                    };
                });
                setResults(mapped);
            })
            .catch(err => {
                console.error("Search fetch error:", err);
                setResults([]);
            })
            .finally(() => setLoading(false));
    }, [searchParams, isSearchPerformed, term]);

    // Filter and map results (Now handled by API effect, this useMemo is mostly for query state tracking)
    useEffect(() => {
        const q = searchParams.get('q') ?? '';
        setQuery(q);
    }, [searchParams]);

    const [query, setQuery] = useState(searchParams.get('q') ?? '');
    const [filters, setFilters] = useState<Filters>(() => {
        const f = { ...DEFAULT_FILTERS };
        if (searchParams.has('pos')) f.pos = searchParams.get('pos')!;
        if (searchParams.has('type')) f.rootType = searchParams.get('type')!;
        return f;
    });

    useEffect(() => {
        if (query) {
            document.title = `${term('search')}: ${query} | Il-Miġma'`;
        } else {
            document.title = `${term('search')} | Il-Miġma'`;
        }
    }, [query, term]);

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        const params: Record<string, string> = { q: query.trim() };
        if (filters.pos) params.pos = filters.pos;
        if (filters.rootType) params.type = filters.rootType;
        setSearchParams(params);
    };

    // Global Enter key listener
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                if (document.activeElement?.tagName !== 'BUTTON' && document.activeElement?.tagName !== 'A') {
                    handleSearch();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [query, filters]);

    const bgStyle = {
        background: `linear-gradient(rgba(244,243,240,0.88), rgba(244,243,240,0.88)),
                 url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    const [kbOpen, setKbOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const kbRef = useRef<HTMLButtonElement>(null);

    const insertChar = (char: string) => {
        const input = inputRef.current;
        if (!input) { setQuery(q => q + char); return; }
        const start = input.selectionStart ?? query.length;
        const end = input.selectionEnd ?? query.length;
        const next = query.slice(0, start) + char + query.slice(end);
        setQuery(next);
        requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(start + char.length, start + char.length);
        });
    };

    const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
        setFilters(f => ({ ...f, [key]: value }));

    const [showFilters, setShowFilters] = useState(false);

    return (
        <div style={bgStyle}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

                {/* ── Page heading ── */}
                <div className="mb-6">
                    {submitted ? (
                        <>
                            <h1 className="font-serif font-medium text-[2.2rem] sm:text-[2.5rem] leading-tight text-[#000]">
                                {term('results-for').replace('{q}', submitted)}
                            </h1>
                            <p className="text-black/40 text-sm font-sans mt-1">
                                {term('entries-shown').replace('{count}', results.length.toString()).replace('{total}', total.toString())}
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="font-serif font-medium text-[2.2rem] sm:text-[2.5rem] leading-tight text-[#000]">
                                {term('search-results')}
                            </h1>
                            <p className="text-black/40 text-sm font-sans mt-2 italic shadow-sm inline-block">
                                {term('search-desc')}
                            </p>
                        </>
                    )}
                </div>

                {/* ── Inline search bar ── */}
                <form onSubmit={handleSearch} className="max-w-3xl mb-8 relative">
                    <div className="flex items-center bg-white border border-[#d8cfc0] rounded-xl overflow-hidden shadow-lg shadow-black/5 focus-within:ring-2 focus-within:ring-[#1034A6]/20 transition-all">
                        {/* Keyboard toggle */}
                        <button
                            ref={kbRef}
                            type="button"
                            onClick={() => setKbOpen(o => !o)}
                            className={cn(
                                'flex items-center gap-1.5 px-4 border-r border-[#d8cfc0] shrink-0 py-3.5 transition-colors',
                                kbOpen ? 'text-[#1034A6] bg-black/5' : 'text-[#555] hover:text-[#000]',
                            )}
                            aria-label={term('toggle-picker')}
                        >
                            <Keyboard size={18} />
                            <span className="text-xs text-[#aaa]">›</span>
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={term('search') + '…'}
                            className="flex-1 px-4 py-3.5 text-base sm:text-lg bg-transparent focus:outline-none font-sans text-[#000] placeholder:text-gray-400"
                        />
                        <button type="submit"
                            className="px-5 py-3.5 text-[#1034A6] hover:bg-black/5 transition-colors shrink-0"
                            aria-label={term('search')}>
                            <SearchIcon size={20} />
                        </button>
                    </div>
                    <MalteseCharPicker
                        open={kbOpen}
                        onOpenChange={setKbOpen}
                        onInsert={insertChar}
                        triggerRef={kbRef}
                    />
                </form>

                {/* ── Mobile Filters Toggle ── */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden w-full mb-6 py-3 px-4 bg-white border border-[#d8cfc0] rounded-xl text-[#1034A6] font-bold text-sm flex items-center justify-between shadow-sm active:bg-black/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Layers size={16} />
                        {term('filters')}
                    </div>
                    <span>{showFilters ? '−' : '+'}</span>
                </button>

                {/* ── Two-column layout ── */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* Filters sidebar */}
                    <aside className={cn(
                        "w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-[#d8cfc0]/40 shadow-sm p-6 space-y-6 sticky top-24 transition-all duration-300",
                        !showFilters && "hidden lg:block"
                    )}>
                        <h2 className="font-sans font-bold text-base text-[#000] border-b border-[#d8cfc0]/30 pb-3 hidden lg:block">{term('filters')}</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 sm:gap-4 lg:gap-6">
                            <FilterSelect
                                label={term("max-results")}
                                value={filters.maxResults}
                                onChange={v => setFilter('maxResults', v)}
                                options={[
                                    { value: '10', label: '10' },
                                    { value: '25', label: '25' },
                                    { value: '50', label: '50' },
                                    { value: '100', label: '100' },
                                ]}
                            />

                            <FilterSelect
                                label={term("part-of-speech")}
                                value={filters.pos}
                                onChange={v => setFilter('pos', v)}
                                options={POS_FILTER_OPTIONS}
                            />

                            <FilterSelect
                                label={term("root") + " (" + term("form") + ")"}
                                value={filters.rootType}
                                onChange={v => setFilter('rootType', v)}
                                options={ROOT_TYPE_FILTER_OPTIONS}
                            />

                            <FilterSelect
                                label={term("source")}
                                value={filters.source}
                                onChange={v => setFilter('source', v)}
                                options={[
                                    { value: '', label: term('all') },
                                    { value: 'spagnol2011', label: 'Spagnol (2011)' },
                                    { value: 'mayer2013', label: 'Mayer (2013)' },
                                    { value: 'borg1997', label: 'Borg & Azzopardi-Alexander (1997)' },
                                    { value: 'maltese-academy', label: term('maltese-academy') },
                                ]}
                            />
                        </div>

                        <div className="border-t border-[#d8cfc0]/30 pt-6 space-y-3">
                            <FilterCheckbox label={term('search-lemma')}
                                checked={filters.searchLemma} onChange={v => setFilters(f => ({ ...f, searchLemma: v }))} />
                            <FilterCheckbox label={term('search-word-forms')}
                                checked={filters.searchWordForms} onChange={v => setFilters(f => ({ ...f, searchWordForms: v }))} />
                            <FilterCheckbox label={term('search-english-gloss')}
                                checked={filters.searchEnglishGloss} onChange={v => setFilters(f => ({ ...f, searchEnglishGloss: v }))} />
                            <FilterCheckbox label={term('include-suggested')}
                                checked={filters.includeSuggested} onChange={v => setFilters(f => ({ ...f, includeSuggested: v }))} />
                            <FilterCheckbox label={term('include-pending')}
                                checked={filters.includePending}
                                onChange={v => setFilter('includePending', v)} />
                        </div>

                        <button
                            onClick={() => { handleSearch(); if (window.innerWidth < 1024) setShowFilters(false); }}
                            className="w-full py-3 bg-[#1034A6] text-white rounded-xl font-bold text-sm hover:bg-[#0c268c] transition-colors shadow-lg shadow-[#1034A6]/20"
                        >
                            {term('apply-filters')}
                        </button>
                    </aside>

                    {/* Results list */}
                    <div className="flex-1 space-y-4 min-w-0 w-full">
                        {results.length === 0 && !loading && isSearchPerformed && (
                            <div className="bg-white/50 rounded-2xl border border-[#d8cfc0]/30 shadow-sm p-8 sm:p-12 text-left">
                                <p className="text-lg text-[#000] font-sans font-medium mb-3">
                                    {term('no-results-found').replace('{q}', submitted)}
                                </p>
                                <p className="text-sm text-black/40 mt-1 mb-6 leading-relaxed">
                                    {term('include-suggested-desc')} {term('no-results-desc')}
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-start gap-3">
                                    <Link to={`/suggest?q=${submitted}`} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-black/90 transition-colors text-sm font-bold">
                                        <MessageSquare size={18} />
                                        {term('suggest-entry')}
                                    </Link>
                                    <Link to="/search?q=a&random=1" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-black/10 text-black rounded-xl hover:bg-black/5 transition-colors text-sm font-bold bg-white">
                                        <Layers size={18} />
                                        {term('każwali')}
                                    </Link>
                                </div>
                            </div>
                        )}
                        {loading && (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1034A6]"></div>
                                <span className="text-xs font-bold text-[#1034A6] uppercase tracking-widest">{term('loading')}...</span>
                            </div>
                        )}
                        {!loading && results.map((r, i) => (
                            <EntryCard key={r.id} result={r} index={i + 1} />
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
