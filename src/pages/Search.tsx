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
        <div className="bg-white rounded-xl border border-black/8 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[11rem_5rem_1fr_11rem] min-h-[5rem]">

                {/* Col 1: Index number | headword + root */}
                <div className="px-4 py-4 flex items-start gap-2">
                    <span className="text-xs text-black/30 font-sans w-5 shrink-0 pt-1">{index}.</span>
                    <div>
                        <Link to={`/entry/${result.id}`}
                            className="font-serif font-extrabold text-[1.35rem] leading-tight text-[#000] hover:underline block">
                            {result.headword}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                            <Link to={`/root/${result.rootSlug}`}
                                style={{ color: EGYPTIAN_BLUE }}
                                className="text-xs hover:underline font-sans">
                                {result.root}
                            </Link>
                            {result.gender && (
                                <Link to={`/search?gender=${result.gender}`}
                                    style={{ color: EGYPTIAN_BLUE }}
                                    className="text-xs hover:underline font-sans">
                                    {term(result.gender)}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Col 2: POS block */}
                <div className="px-4 py-4 flex flex-col gap-0.5">
                    <span className="text-xs text-[#000] font-sans uppercase tracking-wide leading-snug">
                        {term(result.pos)}
                    </span>
                    {result.formLines.map(line => (
                        <span key={line} className="text-xs text-[#000] font-sans uppercase tracking-wide leading-snug">
                            {line}
                        </span>
                    ))}
                </div>

                {/* Col 3: Definitions */}
                <div className="px-5 py-4">
                    {result.definitions.length === 1 ? (
                        <p className="text-sm text-[#000]">{result.definitions[0]}</p>
                    ) : (
                        <ol className="space-y-0.5 list-none">
                            {result.definitions.map((def, i) => (
                                <li key={i} className="text-sm text-[#000]">
                                    {i + 1}. {def}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* Col 4: Inflections */}
                <div className="px-4 py-4 space-y-1">
                    {result.inflections.map((row, i) => (
                        <div key={i} className="flex items-baseline gap-3">
                            <span className="text-xs text-black/55 font-sans w-[4.5rem] shrink-0 leading-snug">
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

    return (
        <div style={bgStyle}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

                {/* ── Page heading ── */}
                <div className="mb-6">
                    {submitted ? (
                        <>
                            <h1 className="font-serif font-medium text-[2rem] leading-tight text-[#000]">
                                {term('results-for').replace('{q}', submitted)}
                            </h1>
                            <p className="text-black/40 text-sm font-sans mt-1">
                                {term('entries-shown').replace('{count}', results.length.toString()).replace('{total}', total.toString())}
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="font-serif font-medium text-[2rem] leading-tight text-[#000]">
                                {term('search-results')}
                            </h1>
                            <p className="text-black/40 text-sm font-sans mt-2">
                                {term('search-desc')}
                            </p>
                        </>
                    )}
                </div>

                {/* ── Inline search bar ── */}
                <form onSubmit={handleSearch} className="max-w-2xl mb-8 relative">
                    <div className="flex items-center bg-white border border-black/10 rounded-lg overflow-hidden shadow-sm">
                        {/* Keyboard toggle */}
                        <button
                            ref={kbRef}
                            type="button"
                            onClick={() => setKbOpen(o => !o)}
                            className={cn(
                                'flex items-center gap-1 px-3 border-r border-black/10 shrink-0 py-2.5 transition-colors',
                                kbOpen ? 'text-[#000] bg-black/5' : 'text-[#555] hover:text-[#000]',
                            )}
                            aria-label={term('toggle-picker')}
                        >
                            <Keyboard size={14} />
                            <span className="text-xs text-[#aaa]">›</span>
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={term('search') + '…'}
                            className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none font-sans text-[#000]"
                        />
                        <button type="submit"
                            className="px-3 py-2.5 text-[#555] hover:text-[#000] transition-colors shrink-0"
                            aria-label={term('search')}>
                            <SearchIcon size={16} />
                        </button>
                    </div>
                    <MalteseCharPicker
                        open={kbOpen}
                        onOpenChange={setKbOpen}
                        onInsert={insertChar}
                        triggerRef={kbRef}
                    />
                </form>

                {/* ── Two-column layout ── */}
                <div className="flex gap-6 items-start">

                    {/* Filters sidebar */}
                    <aside className="w-64 shrink-0 bg-white rounded-xl border border-black/8 shadow-sm p-5 space-y-4 sticky top-20">
                        <h2 className="font-sans font-semibold text-sm text-[#000]">{term('filters')}</h2>

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

                        <div className="border-t border-black/8 pt-4 space-y-2.5">
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
                    </aside>

                    {/* Results list */}
                    <div className="flex-1 space-y-3 min-w-0">
                        {results.length === 0 && !loading && isSearchPerformed && (
                            <div className="bg-white/50 rounded-xl border border-white/40 shadow-sm p-10 text-left">
                                <p className="text-sm text-[#000] mb-2">
                                    {term('no-results-found').replace('{q}', submitted)}
                                </p>
                                <p className="text-xs text-black/40 mt-1 mb-4">
                                    {term('include-suggested-desc')}
                                </p>
                                <p className="text-black/40 text-sm mb-6 max-w-md">
                                    {term('no-results-desc')}
                                </p>
                                <div className="flex items-center justify-end gap-3">
                                    <Link to={`/suggest?q=${submitted}`} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium">
                                        <MessageSquare size={16} />
                                        {term('suggest-entry')}
                                    </Link>
                                    <Link to="/random" className="flex items-center gap-2 px-4 py-2 border border-black/10 text-black rounded-lg hover:bg-black/5 transition-colors text-sm font-medium">
                                        <Layers size={16} />
                                        {term('każwali')}
                                    </Link>
                                </div>
                            </div>
                        )}
                        {loading && (
                            <div className="flex justify-center p-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
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
