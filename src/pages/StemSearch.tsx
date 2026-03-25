import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiSearch } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import type { SearchResult } from '@/types';
import { Search, ArrowLeft } from 'lucide-react';

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

export function StemSearch() {
    const { term } = useLinguisticMode();
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [q, setQ] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const performSearch = async (query: string) => {
        setLoading(true);
        try {
            const res = await apiSearch(query, { zokk: true, limit: 50 });
            setResults(res.results);
            setHasSearched(true);
        } catch (err) {
            console.error('Stem search failed:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const query = searchParams.get('q') || '';
        setQ(query);
        performSearch(query);
        document.title = query ? `${term('stem-search')}: ${query} | Il-Miġma'` : `${term('stem-search')} | Il-Miġma'`;
    }, [searchParams, term]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        navigate(`/stem-search?${params.toString()}`);
    };

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: 'calc(100vh - 56px)',
    };

    return (
        <div style={bgStyle}>
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8 animate-fade-in">
                <div className="flex items-center gap-2 mb-8">
                    <Link to="/search" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back-to-search')}
                    </Link>
                </div>

                <h1 className="text-3xl font-serif font-bold text-black mb-2 text-center">
                    {term('stem-search') || 'Stem Search'}
                </h1>
                <p className="text-sm text-black/60 mb-8 max-w-2xl mx-auto text-center leading-relaxed">
                    {term('stem-search-desc') || 'Search for loanword verbs and other stem-based entries in the dictionary.'}
                </p>

                <div className="max-w-2xl mx-auto mb-12">
                    <form onSubmit={handleSearch} className="relative group">
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder={term('search-stems-placeholder') || 'Enter stem or headword...'}
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
                                            {res.headword}
                                        </h3>
                                        <span className="text-[10px] font-bold uppercase tracking-tighter text-black/30 bg-black/5 px-2 py-0.5 rounded">
                                            {term(res.pos)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-black/60 line-clamp-2 italic font-serif">
                                        "{language === 'mt' && res.definition_mt ? res.definition_mt : res.definition_en}"
                                    </p>
                                    {res.zokk_morphology && (
                                        <div className="mt-4 pt-4 border-t border-black/5 flex gap-4 text-[11px] font-medium text-black/40 uppercase tracking-wider">
                                            <div>
                                                <span className="opacity-50 mr-1">{term('class')}:</span>
                                                <span className="text-black/60">-{res.zokk_morphology.class_type}</span>
                                            </div>
                                            {res.zokk_morphology.is_hybrid && (
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
                                <p className="text-black/40 italic">{term('no-stems-found') || 'No stems found matching your search.'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
