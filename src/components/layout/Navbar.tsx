import { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Menu, X, Sun, Moon, Search, Eye, EyeOff, Shield, Keyboard } from 'lucide-react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { cn } from '@/lib/utils';

// Navigation links are now handled inside the component to support localization

export function Navbar() {
    const { mode, setMode, term } = useLinguisticMode();
    const { language, setLanguage } = useLanguage();
    const { dark, toggle: toggleDark } = useDarkMode();
    const { isTrueAdmin, adminViewEnabled, setAdminViewEnabled, tier } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [kbOpen, setKbOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const kbRef = useRef<HTMLButtonElement>(null);
    const navigate = useNavigate();

    const insertChar = (char: string) => {
        const input = inputRef.current;
        if (!input) { setSearchQuery(q => q + char); return; }
        const start = input.selectionStart ?? searchQuery.length;
        const end = input.selectionEnd ?? searchQuery.length;
        const next = searchQuery.substring(0, start) + char + searchQuery.substring(end);
        setSearchQuery(next);
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + char.length, start + char.length);
        }, 0);
    };

    const isArabised = mode === 'arabised';
    const { pathname } = useLocation();

    const showSearch = !['/', '/search', '/advanced-search'].includes(pathname);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery('');
        setMenuOpen(false);
    };

    const navLinks = [
        { label: term('advanced-search'), href: '/advanced-search' },
        { label: term('root-search'), href: '/root-search' },
        { label: term('suggest-entry'), href: '/suggest' },
        { label: term('information'), href: '/blog' },
        { label: term('help'), href: '/help' },
    ];

    return (
        <header className="sticky top-0 z-40 bg-[#F4F3F0]/95 backdrop-blur-sm border-b border-[#d8cfc0]/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

                {/* Left Section (Logo + Nav) */}
                <div className="flex items-center gap-6 lg:gap-8 shrink-0">
                    {/* Logo — Newsreader medium */}
                    <Link to="/" className="font-serif font-medium text-xl text-[#000] hover:opacity-70 transition-opacity shrink-0">
                        Il-Migma'
                    </Link>

                    {/* Desktop nav links */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map(link => {
                            const active = pathname === link.href || pathname.startsWith(link.href + '/');
                            return (
                                <Link
                                    key={link.href}
                                    to={link.href}
                                    className={cn(
                                        'text-sm text-[#000] font-sans px-3 py-1.5 rounded-md transition-all',
                                        'hover:shadow-[0_1px_6px_rgba(0,0,0,0.10)] hover:bg-white/60',
                                        active ? 'font-semibold' : 'font-normal',
                                    )}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Desktop Search Bar — Dynamic Middle Section */}
                {showSearch && (
                    <div className="hidden md:block flex-1 max-w-md mx-6">
                        <form onSubmit={handleSearch} className="relative group">
                            <div className="flex items-center bg-white/60 border border-[#d8cfc0] rounded-md overflow-hidden focus-within:bg-white focus-within:ring-1 focus-within:ring-[#1034A6] transition-all">
                                <button
                                    ref={kbRef}
                                    type="button"
                                    onClick={() => setKbOpen(o => !o)}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 border-r border-[#d8cfc0] shrink-0 py-1.5 transition-colors",
                                        kbOpen ? "text-[#1034A6] bg-black/5" : "text-gray-400 hover:text-gray-600"
                                    )}
                                    aria-label={term('toggle-picker')}
                                >
                                    <Keyboard size={12} />
                                    <span className="text-[10px] text-gray-300">›</span>
                                </button>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={term('search-placeholder')}
                                    className="flex-1 bg-transparent px-2.5 py-1.5 text-sm focus:outline-none placeholder:text-gray-500 text-[#000]"
                                />
                                <button
                                    type="submit"
                                    className="px-2.5 py-1.5 text-gray-400 hover:text-[#1034A6] transition-colors shrink-0"
                                    aria-label={term('search')}
                                >
                                    <Search size={14} />
                                </button>
                            </div>
                            <MalteseCharPicker
                                open={kbOpen}
                                onOpenChange={setKbOpen}
                                onInsert={insertChar}
                                triggerRef={kbRef}
                            />
                        </form>
                    </div>
                )}

                {/* Right controls */}
                <div className="flex items-center gap-1.5 shrink-0">



                    {/* ① وزن / CV — Arabised vs Standard terminology */}
                    <button
                        id="terminology-toggle"
                        onClick={() => setMode(isArabised ? 'standard' : 'arabised')}
                        title={isArabised ? term('toggle-terminology-standard') : term('toggle-terminology-arabised')}
                        className={cn(
                            'hidden sm:flex items-center justify-center rounded-md px-2 py-1 text-sm transition-colors',
                            'hover:bg-[#d8cfc0]/40',
                        )}
                    >
                        {/* Show Arabic وزن when in standard mode; show CV when in arabised mode */}
                        {isArabised
                            ? <span className="font-arabic text-base leading-none text-[#000]">وزن</span>
                            : <span className="font-sans font-medium text-[#000] tracking-wider text-xs">CV</span>
                        }
                    </button>

                    {/* ② EN / MT — interface language */}
                    <button
                        id="language-toggle"
                        onClick={() => setLanguage(language === 'en' ? 'mt' : 'en')}
                        title={language === 'en' ? term('toggle-language-mt') : term('toggle-language-en')}
                        className="hidden sm:flex items-center justify-center rounded-md px-2 py-1 text-sm font-sans font-medium text-[#000] hover:bg-[#d8cfc0]/40 transition-colors"
                    >
                        {language === 'en' ? 'EN' : 'MT'}
                    </button>

                    {/* ③ Sun / Moon — light / dark mode */}
                    <button
                        id="dark-mode-toggle"
                        onClick={toggleDark}
                        title={dark ? term('toggle-light-mode') : term('toggle-dark-mode')}
                        className="flex items-center justify-center w-8 h-8 rounded-full text-[#000] hover:bg-[#d8cfc0]/40 transition-colors"
                    >
                        {dark ? <Moon size={15} /> : <Sun size={15} />}
                    </button>

                    {/* ④ Admin View Toggle — Minimal version */}
                    {isTrueAdmin && (
                        <button
                            id="admin-view-toggle"
                            onClick={() => setAdminViewEnabled(!adminViewEnabled)}
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                                adminViewEnabled ? "text-[#1034A6] hover:bg-[#1034A6]/10 shadow-sm border border-[#1034A6]/20" : "text-black/40 hover:bg-black/5"
                            )}
                            title={adminViewEnabled ? term('user-view') : term('admin-view')}
                        >
                            {adminViewEnabled ? <Shield size={16} className="fill-current" /> : <Eye size={16} />}
                        </button>
                    )}

                    {/* ⑤ User avatar — Clerk */}
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button
                                id="sign-in-btn"
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#000] text-white hover:bg-[#222] transition-colors"
                                aria-label={term('sign-in')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                </svg>
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }}>
                            {isTrueAdmin && (
                                <UserButton.MenuItems>
                                    <UserButton.Action
                                        label={isTrueAdmin ? term("system-role-admin") : `${term('tier')}: ${tier.toUpperCase()}`}
                                        labelIcon={<Shield size={16} className={isTrueAdmin ? "text-amber-600" : "text-blue-600"} />}
                                        onClick={() => { }}
                                    />
                                    <UserButton.Link
                                        label={term("admin-dashboard")}
                                        labelIcon={<Shield size={16} />}
                                        href="/admin"
                                    />
                                    <UserButton.Action
                                        label={adminViewEnabled ? term('user-view') : term('admin-view')}
                                        labelIcon={adminViewEnabled ? <EyeOff size={16} /> : <Eye size={16} />}
                                        onClick={() => setAdminViewEnabled(!adminViewEnabled)}
                                    />
                                </UserButton.MenuItems>
                            )}
                        </UserButton>
                    </SignedIn>

                    {/* Hamburger — mobile only */}
                    <button
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded hover:bg-[#d8cfc0]/40 transition-colors"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label={term('toggle-menu')}
                    >
                        {menuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="md:hidden border-t border-[#d8cfc0]/50 bg-[#F4F3F0] px-4 py-4 space-y-1 animate-fade-in shadow-xl">
                    {showSearch && (
                        <div className="pb-4 mb-2 mt-1 border-b border-[#ede9e1]">
                            <form onSubmit={handleSearch} className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={term('search-placeholder')}
                                    className="w-full bg-white border border-[#d8cfc0] rounded-xl pl-10 pr-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1034A6]/20 transition-all placeholder:text-gray-400 shadow-sm"
                                />
                            </form>
                        </div>
                    )}
                    {navLinks.map(link => {
                        const active = pathname === link.href || pathname.startsWith(link.href + '/');
                        return (
                            <Link
                                key={link.href}
                                to={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={cn(
                                    'block py-3.5 px-2 text-base text-[#000] border-b border-[#ede9e1]/50 last:border-0 rounded-lg hover:bg-black/5 active:bg-black/10 transition-colors',
                                    active ? 'font-bold bg-white/40' : 'font-normal',
                                )}
                            >
                                {link.label}
                            </Link>
                        );
                    })}

                    {/* Mobile: show all three toggles in a row with better spacing */}
                    <div className="pt-6 pb-2 flex items-center justify-around bg-white/30 rounded-2xl border border-[#d8cfc0]/30 mt-4">
                        <button
                            onClick={() => setMode(isArabised ? 'standard' : 'arabised')}
                            className="flex flex-col items-center gap-1 min-w-[60px] py-1"
                        >
                            {isArabised ? <span className="font-arabic text-xl leading-none">وزن</span> : <span className="text-xs font-bold tracking-widest uppercase">CV</span>}
                            <span className="text-[10px] text-black/40 uppercase tracking-tighter">{term('mode')}</span>
                        </button>

                        <div className="w-[1px] h-8 bg-[#d8cfc0]/50"></div>

                        <button
                            onClick={() => setLanguage(language === 'en' ? 'mt' : 'en')}
                            className="flex flex-col items-center gap-1 min-w-[60px] py-1"
                        >
                            <span className="text-sm font-bold">{language === 'en' ? 'EN' : 'MT'}</span>
                            <span className="text-[10px] text-black/40 uppercase tracking-tighter">{term('language')}</span>
                        </button>

                        <div className="w-[1px] h-8 bg-[#d8cfc0]/50"></div>

                        <button
                            onClick={toggleDark}
                            className="flex flex-col items-center gap-1 min-w-[60px] py-1"
                        >
                            {dark ? <Moon size={18} /> : <Sun size={18} />}
                            <span className="text-[10px] text-black/40 uppercase tracking-tighter">{dark ? 'Dark' : 'Light'}</span>
                        </button>

                        {isTrueAdmin && (
                            <>
                                <div className="w-[1px] h-8 bg-[#d8cfc0]/50"></div>
                                <button
                                    onClick={() => setAdminViewEnabled(!adminViewEnabled)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 min-w-[60px] py-1 transition-colors",
                                        adminViewEnabled ? "text-[#1034A6]" : "text-black/40"
                                    )}
                                >
                                    {adminViewEnabled ? <Shield size={18} /> : <Eye size={18} />}
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">{adminViewEnabled ? 'Admin' : 'User'}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
