import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Search, Keyboard, Layers, FileText,
    Database, Globe, Settings,
    ArrowRight, PlusCircle, LayoutDashboard,
    Edit3
} from 'lucide-react';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@clerk/clerk-react';
import { Card } from '@/components/ui/Card';
import { apiSearch } from '@/lib/api';
import type { Entry } from '@/types';

// ── Colour tokens ──────────────────────────────────────────────────────────
const ARAB_GREEN = '#006233';  // Semitic entries
const ROMAN_RED = '#8E001C';  // Romance entries
const IPA_GOLD = '#A07030';  // IPA & Audio

// ── Limestone Ochre background (rgba for gradient overlay) ─────────────────
const CREAM_RGBA = 'rgba(244,243,240,0.88)';


export function Home() {
    const { term } = useLinguisticMode();
    const { isAdmin } = useAuth();
    const { user } = useUser();
    const [query, setQuery] = useState('');
    const [semiticEntries, setSemiticEntries] = useState<Entry[]>([]);
    const [romanceEntries, setRomanceEntries] = useState<Entry[]>([]);
    const [loadingSemitic, setLoadingSemitic] = useState(true);
    const [loadingRomance, setLoadingRomance] = useState(true);
    const [counts, setCounts] = useState<{ semitic: number; romance: number; total: number }>({ semitic: 0, romance: 0, total: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Il-Miġma' | " + term('dictionary-title');

        // Fetch the category-specific entries directly so the cards stay populated
        apiSearch('', { type: 'semitic', limit: 3 })
            .then(res => setSemiticEntries(res.results as any))
            .catch(err => console.error("Failed to fetch semitic entries:", err))
            .finally(() => setLoadingSemitic(false));
        apiSearch('', { type: 'romance', limit: 3 })
            .then(res => setRomanceEntries(res.results as any))
            .catch(err => console.error("Failed to fetch romance entries:", err))
            .finally(() => setLoadingRomance(false));

        // Fetch counts
        apiSearch('', { type: 'semitic', limit: 0 })
            .then(res => setCounts(prev => ({ ...prev, semitic: res.total })))
            .catch(err => console.error("Failed to fetch semitic count:", err));
        apiSearch('', { type: 'romance', limit: 0 })
            .then(res => setCounts(prev => ({ ...prev, romance: res.total })))
            .catch(err => console.error("Failed to fetch romance count:", err));
        apiSearch('', { limit: 0 })
            .then(res => setCounts(prev => ({ ...prev, total: res.total })))
            .catch(err => console.error("Failed to fetch total count:", err));
    }, [term]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    };

    const [kbOpen, setKbOpen] = useState(false);
    const [kbOpen2, setKbOpen2] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const inputRef2 = useRef<HTMLInputElement>(null);
    const kbRef = useRef<HTMLButtonElement>(null);
    const kbRef2 = useRef<HTMLButtonElement>(null);

    const insertChar = (char: string, ref: React.RefObject<HTMLInputElement | null>) => {
        const input = ref.current;
        if (!input) { setQuery(q => q + char); return; }
        const start = input.selectionStart ?? query.length;
        const end = input.selectionEnd ?? query.length;
        setQuery(query.slice(0, start) + char + query.slice(end));
        requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(start + char.length, start + char.length);
        });
    };

    const handleRandom = () => navigate('/search?q=&random=1');

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}),
                 url("/bg-pattern.png") center/cover no-repeat`,
    };

    // ── ADMIN HOMEPAGE ──────────────────────────────────────────────────────
    if (isAdmin) {
        return (
            <div className="min-h-screen bg-[#F4F3F0]" style={bgStyle}>
                <div className="max-w-6xl mx-auto px-7 sm:px-8 py-12 space-y-10">

                    {/* Welcome Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-[#1034A6] font-medium text-sm tracking-widest uppercase mb-1">{term('management-panel')}</h2>
                            <h1 className="font-serif text-4xl font-bold text-black leading-tight">
                                {term('welcome-admin').replace('{name}', user?.firstName || '')}
                            </h1>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                to="/search"
                                className="px-4 py-2 bg-white border border-black/10 rounded-xl text-sm font-semibold hover:bg-black/5 transition-colors flex items-center gap-2"
                            >
                                <Globe size={16} /> {term('live-site')}
                            </Link>
                            <Link
                                to="/admin"
                                className="px-4 py-2 bg-link text-white rounded-xl text-sm font-semibold hover:bg-link-hover transition-colors flex items-center gap-2 shadow-lg shadow-link/20"
                            >
                                <Settings size={16} /> {term('admin-dashboard')}
                            </Link>
                        </div>
                    </div>

                    {/* Quick Stats / Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Database Control */}
                        <Card className="p-6 border-none shadow-sm bg-white/60 backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 text-[#1034A6]/10 group-hover:text-[#1034A6]/20 transition-colors">
                                <Database size={80} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Layers className="text-[#1034A6]" size={20} /> {term('root-management')}
                            </h3>
                            <p className="text-sm text-black/60 mb-6">{term('root-mgmt-desc')}</p>
                            <Link to="/admin?tab=roots" className="text-[#1034A6] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                {term('root-mgmt-open')} <ArrowRight size={14} />
                            </Link>
                        </Card>

                        {/* Entry Management */}
                        <Card className="p-6 border-none shadow-sm bg-white/60 backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 text-[#1034A6]/10 group-hover:text-[#1034A6]/20 transition-colors">
                                <FileText size={80} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <PlusCircle className="text-[#1034A6]" size={20} /> {term('word-entries')}
                            </h3>
                            <p className="text-sm text-black/60 mb-6">
                                {counts.total > 0
                                    ? term('word-entries-desc').replace('300k+', (Math.floor(counts.total / 1000) + 'k+'))
                                    : term('word-entries-desc')}
                            </p>
                            <Link to="/admin" className="text-[#1034A6] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                {term('manage-entries')} <ArrowRight size={14} />
                            </Link>
                        </Card>

                        {/* Interactive Tools */}
                        <Card className="p-6 border-none shadow-sm bg-white/60 backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 text-[#1034A6]/10 group-hover:text-[#1034A6]/20 transition-colors">
                                <LayoutDashboard size={80} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Edit3 className="text-[#1034A6]" size={20} /> {term('content-and-blog')}
                            </h3>
                            <p className="text-sm text-black/60 mb-6">{term('content-blog-desc')}</p>
                            <Link to="/blog" className="text-[#1034A6] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                {term('edit-blog')} <ArrowRight size={14} />
                            </Link>
                        </Card>
                    </div>

                    {/* Bottom Section: Search Preview */}
                    <div className="bg-[#1034A6] rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 -mr-10 -mb-10 rotate-12">
                            <h1 className="font-serif text-[12rem] select-none">M</h1>
                        </div>
                        <div className="max-w-xl relative z-10">
                            <h2 className="text-2xl font-serif mb-4">{term('quick-search-verification')}</h2>
                            <p className="text-white/70 text-sm mb-6">{term('quick-search-verification-desc')}</p>
                            <form onSubmit={handleSearch} className="flex flex-wrap gap-2 relative">
                                <div className="flex-1 flex items-center bg-white/10 border border-white/20 rounded-xl overflow-hidden focus-within:bg-white/20 transition-all">
                                    <button
                                        ref={kbRef2}
                                        type="button"
                                        onClick={() => setKbOpen2(o => !o)}
                                        className={`flex items-center gap-1 px-3 border-r border-white/10 shrink-0 py-3 transition-colors ${kbOpen2 ? 'text-white bg-white/20' : 'text-white/60 hover:text-white'}`}
                                        aria-label={term('toggle-picker')}
                                    >
                                        <Keyboard size={14} />
                                        <span className="text-xs text-white/30">›</span>
                                    </button>
                                    <input
                                        ref={inputRef2}
                                        type="text"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder={term('search-word-placeholder')}
                                        className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-white/40 text-white"
                                    />
                                </div>
                                <button type="submit" className="bg-white text-[#1034A6] px-6 py-3 rounded-xl font-bold text-sm hover:brightness-110 transition-all shrink-0">
                                    {term('check')}
                                </button>
                                <Link
                                    to="/browse"
                                    className="bg-link text-white text-sm font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-link/20 shrink-0"
                                >
                                    {term('browse-entries')}
                                </Link>
                                <MalteseCharPicker
                                    open={kbOpen2}
                                    onOpenChange={setKbOpen2}
                                    onInsert={(c) => insertChar(c, inputRef2)}
                                    triggerRef={kbRef2}
                                />
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── PUBLIC HOMEPAGE ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen">
            <div style={bgStyle}>
                {/* Hero */}
                <section className="text-center px-7 sm:px-8 pt-16 pb-14 sm:pt-24 sm:pb-20">
                    <div className="max-w-2xl mx-auto">
                        <h1 className="font-serif font-medium text-[2.6rem] sm:text-[3.2rem] leading-tight text-black mb-3">
                            {term('dictionary-title')}
                        </h1>
                        <p className="text-text-muted text-sm leading-relaxed max-w-lg mx-auto mb-10">
                            {counts.total > 0
                                ? term('home-desc').replace('300,000', counts.total.toLocaleString())
                                : term('home-desc')}
                        </p>
                    </div>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="max-w-md mx-auto mb-5 relative">
                        <div className="flex items-center bg-white border border-black/10 rounded-lg overflow-hidden shadow-sm">
                            <button
                                ref={kbRef}
                                type="button"
                                onClick={() => setKbOpen(o => !o)}
                                className={`flex items-center gap-1 px-3 border-r border-black/10 shrink-0 py-2.5 transition-colors ${kbOpen ? 'text-black bg-black/5' : 'text-[#555] hover:text-black'}`}
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
                                className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none font-sans text-black"
                                aria-label={term('search')}
                                placeholder={term('search') + '…'}
                            />
                            <button
                                type="submit"
                                className="px-3 py-2.5 text-[#555] hover:text-black transition-colors shrink-0"
                                aria-label={term('search')}
                            >
                                <Search size={16} />
                            </button>
                        </div>
                        <MalteseCharPicker
                            open={kbOpen}
                            onOpenChange={setKbOpen}
                            onInsert={(c) => insertChar(c, inputRef)}
                            triggerRef={kbRef}
                        />
                    </form>

                    <div className="flex items-center justify-center gap-3">
                        <Link
                            to="/browse"
                            className="bg-link text-white text-sm font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-link/20"
                        >
                            {term('browse-entries')}
                        </Link>
                        <button
                            onClick={handleRandom}
                            className="bg-white text-black text-sm font-sans font-medium px-5 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                        >
                            {term('random-entry')}
                        </button>
                    </div>
                </section>

                {/* Categories */}
                <section className="pb-20">
                    <div className="max-w-6xl mx-auto px-7 sm:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

                            {/* Semitic Entries */}
                            <Card className="lg:col-span-12 xl:col-span-4 border border-black/5 bg-surface-soft rounded-3xl overflow-hidden relative group transition-all duration-300 min-h-[320px]">
                                {/* Watermark */}
                                <div className="absolute right-0 bottom-0 rotate-12 -mr-8 -mb-10 pointer-events-none select-none">
                                    <span className="font-serif text-[18rem] text-black opacity-[0.03]">ع</span>
                                </div>

                                <div className="p-8 relative z-10 h-full flex flex-col">
                                    <h2 className="font-serif text-[1.8rem] font-bold mb-1" style={{ color: ARAB_GREEN }}>
                                        {term('semitic-entries-title')}
                                    </h2>
                                    <p className="text-sm text-text-muted mb-8 leading-relaxed max-w-sm">
                                        {counts.semitic.toLocaleString()} {term('entries')} {term('recorded').toLowerCase()}.
                                    </p>

                                    <div className="flex-1">
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-4">{term('recently-added')}</h3>
                                        {loadingSemitic ? (
                                            <div className="space-y-3">
                                                {[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-black/5 rounded animate-pulse" />)}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {semiticEntries.slice(0, 3).map((entry: any) => (
                                                    <div key={entry.id} className="space-y-1">
                                                        <Link
                                                            to={`/entry/${entry.id}`}
                                                            className="flex items-center gap-3 group/link py-1"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-black/10 group-hover/link:bg-link transition-colors" />
                                                            <span className="font-serif text-[1.1rem] font-bold text-black group-hover/link:text-link transition-colors">
                                                                {entry.headword}
                                                            </span>
                                                            <span className="text-[10px] text-text-muted uppercase font-sans tracking-wider opacity-60">
                                                                {entry.pos}
                                                            </span>
                                                        </Link>
                                                        {(entry.definition_en || (entry.definitions && entry.definitions[0])) && (
                                                            <p className="text-[13px] text-text-muted pl-4.5 line-clamp-1 italic">
                                                                {entry.definition_en || entry.definitions[0].text_en}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                                {semiticEntries.length > 0 && (
                                                    <Link to="/search?type=semitic" className="text-[11px] font-bold text-link hover:underline mt-2 inline-block">
                                                        {term('view-all')}
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Romance Entries */}
                            <Card className="lg:col-span-12 xl:col-span-4 border border-black/5 bg-surface-soft rounded-3xl overflow-hidden relative group transition-all duration-300 min-h-[320px]">
                                {/* Watermark */}
                                <div className="absolute right-0 bottom-0 rotate-12 -mr-6 -mb-8 pointer-events-none select-none">
                                    <span className="font-serif text-[18rem] text-black opacity-[0.03]">R</span>
                                </div>

                                <div className="p-8 relative z-10 h-full flex flex-col">
                                    <h2 className="font-serif text-[1.8rem] font-bold mb-1" style={{ color: ROMAN_RED }}>
                                        {term('romance-entries-title')}
                                    </h2>
                                    <p className="text-sm text-text-muted mb-8 leading-relaxed max-w-sm">
                                        {counts.romance.toLocaleString()} {term('entries')} {term('recorded').toLowerCase()}.
                                    </p>

                                    <div className="flex-1">
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-4">{term('recently-added')}</h3>
                                        {loadingRomance ? (
                                            <div className="space-y-3">
                                                {[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-black/5 rounded animate-pulse" />)}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {romanceEntries.slice(0, 3).map((entry: any) => (
                                                    <div key={entry.id} className="space-y-1">
                                                        <Link
                                                            to={`/entry/${entry.id}`}
                                                            className="flex items-center gap-3 group/link py-1"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-black/10 group-hover/link:bg-link transition-colors" />
                                                            <span className="font-serif text-[1.1rem] font-bold text-black group-hover/link:text-link transition-colors">
                                                                {entry.headword}
                                                            </span>
                                                            <span className="text-[10px] text-text-muted uppercase font-sans tracking-wider opacity-60">
                                                                {entry.pos}
                                                            </span>
                                                        </Link>
                                                        {(entry.definition_en || (entry.definitions && entry.definitions[0])) && (
                                                            <p className="text-[13px] text-text-muted pl-4.5 line-clamp-1 italic">
                                                                {entry.definition_en || entry.definitions[0].text_en}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                                {romanceEntries.length > 0 && (
                                                    <Link to="/search?type=romance" className="text-[11px] font-bold text-link hover:underline mt-2 inline-block">
                                                        {term('view-all')}
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* IPA & Audio (sidebar card) */}
                            <Card className="lg:col-span-12 xl:col-span-4 border border-black/5 bg-surface-soft rounded-3xl overflow-hidden relative group transition-all duration-300">
                                <div className="p-8 h-full flex flex-col">
                                    <h2 className="font-serif text-[1.4rem] font-bold mb-1" style={{ color: IPA_GOLD }}>
                                        {term('ipa-audio-title')}
                                    </h2>
                                    <p className="text-[13px] text-text-muted leading-relaxed mb-6">
                                        {term('ipa-audio-desc')}
                                    </p>
                                    <div className="mt-auto aspect-square rounded-2xl bg-linear-to-br from-[#A07030]/5 to-[#A07030]/20 flex items-center justify-center p-8 text-center group-hover:scale-[1.02] transition-transform duration-500 border border-[#A07030]/10">
                                        <div className="space-y-2">
                                            <Globe size={40} style={{ color: IPA_GOLD }} className="mx-auto opacity-30" />
                                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40" style={{ color: IPA_GOLD }}>Coming Soon</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
