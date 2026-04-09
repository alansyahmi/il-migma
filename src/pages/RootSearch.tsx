import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideTheoreticalForms } from '@/contexts/HideTheoreticalFormsContext';
import { generateRootForms, markGeneratedForms, type FormMarker, type MarkedVerbForm, type AttestedEntry } from '@/lib/conjugationEngine';
import { apiSearch, apiSearchRoots } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import type { SearchResult } from '@/types';
import { Search } from 'lucide-react';
import { formatStemDisplay } from '@/lib/stemDefaults';
import { shouldHideSurface, stripTheoreticalPrefix } from '@/lib/theoreticalForms';

const MAX_RADICALS = 4;

function MarkedCell({ data }: { data: { value: string; marker: FormMarker } }) {
    const { term } = useLinguisticMode();
    const { hideTheoreticalForms } = useHideTheoreticalForms();
    const hidden = shouldHideSurface(data, hideTheoreticalForms);
    if (hidden || data.value === '-') return <span className="opacity-40">-</span>;
    const value = hideTheoreticalForms ? stripTheoreticalPrefix(data.value) : data.value;
    if (data.marker === 'plain') {
        return (
            <Link to={`/search?q=${value}`} key={value} className="text-[#1034A6] hover:underline">
                {value}
            </Link>
        );
    }
    const mark = data.marker === 'theoretical' ? '*' : '✦';
    return (
        <span className="opacity-55 text-black" title={data.marker === 'theoretical' ? term('theoretical') : term('auto-generated')}>
            {hideTheoreticalForms ? value : `${mark}${data.value}`}
        </span>
    );
}

function RootResultView({ rootRadicals, extraRoots = [] }: { rootRadicals: string[], extraRoots?: any[] }) {
    const { term } = useLinguisticMode();
    const { hideTheoreticalForms } = useHideTheoreticalForms();
    // Unique matching roots by consonants string
    const matchingRootsMap = new Map<string, any>();

    // 1. Process DB Data
    extraRoots.forEach(r => {
        if (!matchingRootsMap.has(r.consonants)) {
            matchingRootsMap.set(r.consonants, {
                rootObj: r,
                verbs: [] // We might not have entries yet for DB-only roots in this view
            });
        }
    });

    const matchingRoots = Array.from(matchingRootsMap.values());
    const formLabels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'Xa', 'Xb'];
    const rootRows = matchingRoots.map(({ rootObj, verbs }) => {
        const primaryVerb = verbs.find((v: any) => v.verb_morphology?.form === 'I') || verbs[0];
        const vm = primaryVerb?.verb_morphology || { vowel_set_perfect: 'a-a', vowel_set_imperfect: 'i-a' };

        const rawGen = generateRootForms(
            rootObj.consonants,
            rootObj.vowel_set_perf || vm.vowel_set_perfect || 'a-a',
            rootObj.vowel_set_impf || vm.vowel_set_imperfect || 'i-a',
            rootObj.strength,
            rootObj.weak_class
        );

        const attested: AttestedEntry[] = [];
        verbs.forEach((v: any) => {
            const form = v.verb_morphology?.form || '';
            if (!form) return;
            attested.push({ word: v.headword, id: v.id, form, type: 'lemma' });
            if (v.verb_morphology?.passive_participle) {
                attested.push({ word: v.verb_morphology.passive_participle, id: v.id, form, type: 'passive' });
            }
            if (v.verb_morphology?.active_participle) {
                attested.push({ word: v.verb_morphology.active_participle, id: v.id, form, type: 'active' });
            }
            if (v.verb_morphology?.verbal_noun) {
                attested.push({ word: v.verb_morphology.verbal_noun, id: v.id, form, type: 'noun' });
            }
        });

        return {
            rootObj,
            verbs,
            rowsData: markGeneratedForms(rawGen, attested),
        };
    });
    const visibleFormLabels = hideTheoreticalForms
        ? formLabels.filter(fl => rootRows.some(({ rowsData }) => {
            const rData = rowsData.find((r: MarkedVerbForm) => r.form === fl);
            return rData && !shouldHideSurface(rData.perfect, hideTheoreticalForms);
        }))
        : formLabels;

    if (matchingRoots.length === 0) {
        const joined = rootRadicals.filter(Boolean).join('-');
        if (!joined) return null; // Don't show anything if search is completely empty

        return (
            <div className="bg-white rounded-xl border border-black/8 shadow-sm p-6 mt-8 text-center max-w-2xl mx-auto">
                <p className="text-sm text-black/55">{term('no-attested-data').replace('{q}', joined)}</p>
                <Link to={`/root/${joined}`} className="text-xs font-semibold text-[#1034A6] mt-2 block hover:underline">
                    {term('view-root-anyway')}
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-black/8 shadow-sm overflow-hidden mt-8 max-w-7xl mx-auto">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-black/5 border-b border-black/10 text-black/40">
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap min-w-[100px]">{term('root')}</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{term('class')}</th>
                            {visibleFormLabels.map(f => (
                                <th key={f} className="px-4 py-3 text-[10px] font-bold tracking-wider">{f}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rootRows.map(({ rootObj, rowsData }) => {
                            const strengthLabel = rootObj.strength.toUpperCase();

                            return (
                                <tr key={rootObj.id || rootObj.consonants} className="hover:bg-black/1 transition-colors border-b border-black/5 last:border-0">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <Link to={`/root/${rootObj.consonants}`} className="font-serif font-bold text-xl text-black hover:underline">
                                            {rootObj.consonants}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center text-[10px] bg-black/5 px-2 py-1 rounded text-black/50 font-bold tracking-wider gap-1.5 leading-none">
                                            {rootObj.strength !== 'geminated' && <span>{strengthLabel}</span>}
                                            {rootObj.weak_class && <span>• {term(rootObj.weak_class).toUpperCase()}</span>}
                                            {rootObj.strength === 'geminated' && <span>• {term('geminated').toUpperCase()}</span>}
                                        </span>
                                    </td>
                                    {visibleFormLabels.map(fl => {
                                        const rData = rowsData.find((r: MarkedVerbForm) => r.form === fl);
                                        return (
                                            <td key={fl} className="px-4 py-4 text-sm font-serif min-w-[60px]">
                                                {rData ? <MarkedCell data={rData.perfect} /> : '—'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Root radical slot ──────────────────────────────────────────────────────
function RootRadicalsInput({
    label, values, onChange,
}: {
    label: string;
    values: string[];
    onChange: (i: number, v: string) => void;
}) {
    return (
        <div className="flex flex-col items-center">
            <p className="text-xs font-medium text-black mb-2">{label}</p>
            <div className="flex gap-2">
                {values.map((v, i) => (
                    <input
                        key={i}
                        type="text"
                        maxLength={2}
                        value={v}
                        onChange={e => onChange(i, e.target.value)}
                        className="w-12 h-12 text-center bg-white border border-black/10 rounded-lg text-lg text-black font-serif shadow-sm focus:outline-none focus:border-[#1034A6] focus:ring-1 focus:ring-[#1034A6]"
                        placeholder="—"
                    />
                ))}
            </div>
        </div>
    );
}

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

type SearchMode = 'root' | 'stem';

function SearchModeTabs({ mode }: { mode: SearchMode }) {
    const { term } = useLinguisticMode();
    const navigate = useNavigate();
    const isStem = mode === 'stem';

    return (
        <div className="flex justify-center mb-6">
            <div className="relative grid w-full max-w-[340px] grid-cols-2 rounded-full border border-black/10 bg-white/80 p-1 shadow-sm overflow-hidden">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.125rem)] rounded-full bg-[#1034A6] shadow-sm transition-transform duration-300 ease-out"
                    style={{ transform: isStem ? 'translateX(100%)' : 'translateX(0)' }}
                />
                <button
                    type="button"
                    onClick={() => navigate('/root-search')}
                    aria-pressed={mode === 'root'}
                    className="relative z-10 px-4 py-2 text-sm font-medium rounded-full text-center transition-colors duration-300"
                    style={{ color: mode === 'root' ? 'white' : 'rgba(0,0,0,0.65)' }}
                >
                    {term('root-search')}
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/root-search?mode=stem')}
                    aria-pressed={mode === 'stem'}
                    className="relative z-10 px-4 py-2 text-sm font-medium rounded-full text-center transition-colors duration-300"
                    style={{ color: mode === 'stem' ? 'white' : 'rgba(0,0,0,0.65)' }}
                >
                    {term('stem-search')}
                </button>
            </div>
        </div>
    );
}

function SearchPageShell({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
            minHeight: 'calc(100vh - 56px)',
        }}>
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8 animate-fade-in">
                {children}
            </div>
        </div>
    );
}

function RootSearchPanelContent() {
    const { term } = useLinguisticMode();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Parse filters from URL
    const parseRadicals = () => {
        const rads = Array(MAX_RADICALS).fill('');
        for (let i = 0; i < MAX_RADICALS; i++) {
            rads[i] = searchParams.get(`r${i + 1}`) || '';
        }
        return rads;
    };

    const [rootRadicals, setRootRadicals] = useState<string[]>(parseRadicals());
    const [searchedRadicals, setSearchedRadicals] = useState<string[]>(parseRadicals());
    const [hasSearched, setHasSearched] = useState(false);
    const [extraRoots, setExtraRoots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Sync with URL changes (e.g., back navigation)
    useEffect(() => {
        const rads = parseRadicals();
        setRootRadicals(rads);
        setSearchedRadicals(rads);
        const hasContent = rads.some(r => r.trim() !== '');

        if (hasContent) {
            setHasSearched(true);
            setLoading(true);
            const joined = rads.filter(Boolean).join('-');
            document.title = `${term('root-search')}: ${joined} | Il-Miġma'`;

            apiSearchRoots(rads)
                .then(res => setExtraRoots(res.roots))
                .catch(() => setExtraRoots([]))
                .finally(() => setLoading(false));
        } else {
            setHasSearched(false);
            setExtraRoots([]);
            document.title = `${term('root-search')} | Il-Miġma'`;
        }
    }, [searchParams, term]);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Sync to URL
        const params = new URLSearchParams();
        rootRadicals.forEach((rad, i) => {
            if (rad.trim()) params.set(`r${i + 1}`, rad.trim());
        });

        // Use Navigate instead of direct history manipulation so router knows
        const query = params.toString();
        navigate(query ? `/root-search?${query}` : '/root-search');
        setSearchedRadicals([...rootRadicals]);
        setHasSearched(true);
    };

    // Global Enter key listener for root search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const target = e.target as HTMLElement;
                const isFormInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

                // Allow enter to trigger search if not focused on another interactive element,
                // OR if focused on one of the root radical inputs.
                if (!isFormInput || target.closest('.root-radical-input-group')) {
                    e.preventDefault();
                    handleSearch();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [rootRadicals]);

    const handleRootRadicalChange = (index: number, val: string) => {
        const newRads = [...rootRadicals];
        newRads[index] = val.toLowerCase().trim().normalize('NFC');
        setRootRadicals(newRads);
    };

    return (
        <>
            <h1 className="text-3xl font-serif font-bold text-black mb-2 text-center">
                {term('root-search')}
            </h1>
            <p className="text-sm text-black/60 mb-8 max-w-2xl mx-auto text-center leading-relaxed">
                {term('root-search-desc')}
            </p>

            {/* Horizontal Filter Bar */}
            <div className="bg-[#F4F3F0] border border-border rounded-xl p-6 shadow-sm max-w-2xl mx-auto mb-8">
                <form onSubmit={handleSearch} className="root-radical-input-group flex flex-col items-center gap-6">
                    <RootRadicalsInput
                        label={term('root-radicals')}
                        values={rootRadicals}
                        onChange={handleRootRadicalChange}
                    />

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setRootRadicals(Array(MAX_RADICALS).fill(''));
                                navigate('/root-search');
                                setHasSearched(false);
                                setExtraRoots([]);
                            }}
                            className="px-4 py-2 text-sm font-medium text-black/60 bg-white border border-border rounded-md hover:bg-black/5 transition-colors"
                        >
                            {term('clear')}
                        </button>
                        <button
                            type="submit"
                            className="bg-[#1034A6] text-white px-8 py-2 rounded-md font-medium text-sm hover:bg-[#1034A6]/90 transition-colors shadow-sm"
                        >
                            {term('search-roots')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results Area (Full Width) */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Spinner />
                </div>
            ) : hasSearched && (
                <RootResultView rootRadicals={searchedRadicals} extraRoots={extraRoots} />
            )}
        </>
    );
}

function StemSearchPanelContent() {
    const { term } = useLinguisticMode();
    const { language } = useLanguage();
    const { hideTheoreticalForms } = useHideTheoreticalForms();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [q, setQ] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const query = searchParams.get('q') || '';
        let cancelled = false;

        setQ(query);
        setLoading(true);

        (async () => {
            try {
                const res = await apiSearch(query, { zokk: true, limit: 50 });
                if (cancelled) return;
                setResults(res.results);
                setHasSearched(true);
            } catch (err) {
                if (cancelled) return;
                console.error('Stem search failed:', err);
                setResults([]);
                setHasSearched(true);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        document.title = query ? `${term('stem-search')}: ${query} | Il-Miġma'` : `${term('stem-search')} | Il-Miġma'`;

        return () => {
            cancelled = true;
        };
    }, [searchParams, term]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        params.set('mode', 'stem');
        if (q.trim()) params.set('q', q.trim());
        navigate(`/root-search?${params.toString()}`);
    };

    return (
        <>
            <h1 className="text-3xl font-serif font-bold text-black mb-2 text-center">
                {term('stem-search')}
            </h1>
            <p className="text-sm text-black/60 mb-8 max-w-2xl mx-auto text-center leading-relaxed">
                {term('stem-search-desc')}
            </p>

            <div className="max-w-2xl mx-auto mb-12">
                <form onSubmit={handleSearch} className="relative group">
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={term('search-stems-placeholder')}
                        className="w-full bg-white border border-black/10 rounded-2xl px-6 py-4 pl-14 text-lg font-serif shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6]/20 focus:border-[#1034A6] transition-all"
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-[#1034A6] transition-colors" size={24} />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#1034A6] text-white px-6 py-2 rounded-xl font-medium text-sm hover:bg-[#1034A6]/90 transition-colors shadow-sm"
                    >
                        {term('search')}
                    </button>
                </form>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Spinner />
                </div>
            ) : hasSearched && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.length > 0 ? (
                            results.map((res) => (
                            <Link
                                key={res.id}
                                to={res.zokk_morphology ? `/stem/${res.zokk_morphology.stem_string}` : `/entry/${res.id}`}
                                className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm hover:shadow-md hover:border-[#1034A6]/20 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-serif font-bold text-black group-hover:text-[#1034A6] transition-colors line-break-anywhere">
                                        {hideTheoreticalForms ? stripTheoreticalPrefix(res.headword) : res.headword}
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-black/30 bg-black/5 px-2 py-0.5 rounded">
                                        {term(res.pos)}
                                    </span>
                                </div>
                                <p className="text-sm text-black/60 line-clamp-2 italic font-serif">
                                    "{language === 'mt' && res.definition_mt ? res.definition_mt : res.definition_en}"
                                </p>
                                {res.zokk_morphology && (
                                    <div className="mt-4 pt-4 border-t border-black/5 flex flex-wrap gap-4 text-[11px] font-medium text-black/40 uppercase tracking-wider">
                                        <div>
                                            <span className="opacity-50 mr-1">{term('stem')}:</span>
                                            <span className="text-black/60">{formatStemDisplay(res.zokk_morphology.stem_string)}</span>
                                        </div>
                                        <div>
                                            <span className="opacity-50 mr-1">{term('class')}:</span>
                                            <span className="text-black/60">-{res.zokk_morphology.class_type}</span>
                                        </div>
                                        {res.zokk_morphology.is_hybrid && !hideTheoreticalForms && (
                                            <div className="text-[#1034A6]/60 font-bold">
                                                ✦ {term('hybrid')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-white/40 shadow-sm">
                            <p className="text-black/40 italic">{term('no-stems-found')}</p>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export function RootSearch() {
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') === 'stem' ? 'stem' : 'root';
    
    return (
        <SearchPageShell>
            <SearchModeTabs mode={mode} />
            {mode === 'stem' ? <StemSearchPanelContent /> : <RootSearchPanelContent />}
        </SearchPageShell>
    );
}
