import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Menu, X, Sun, Moon, Search, Eye, EyeOff, Shield, Keyboard } from 'lucide-react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useHideTheoreticalForms } from '@/contexts/HideTheoreticalFormsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { cn } from '@/lib/utils';

// Navigation links are now handled inside the component to support localization

export function Navbar() {
    const { mode, setMode, term } = useLinguisticMode();
    const { hideTheoreticalForms, toggleHideTheoreticalForms } = useHideTheoreticalForms();
    const { language, setLanguage } = useLanguage();
    const { dark, toggle: toggleDark } = useDarkMode();
    const { isTrueAdmin, adminViewEnabled, setAdminViewEnabled, tier } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [kbOpen, setKbOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const kbRef = useRef<HTMLButtonElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const hamburgerRef = useRef<HTMLButtonElement>(null);
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
        { label: term('blog'), href: '/blog' },
        { label: term('help'), href: '/help' },
    ];

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (mobileMenuRef.current?.contains(e.target as Node)) return;
            if (hamburgerRef.current?.contains(e.target as Node)) return;
            setMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    return (
        <header className="sticky top-0 z-40 bg-[#F4F3F0]/95 backdrop-blur-sm border-b border-border/50">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 flex items-center justify-between h-14">

                {/* Left Section (Logo + Nav) */}
                <div className="flex items-center gap-6 lg:gap-8 shrink-0">
                    {/* Logo — Newsreader medium */}
                    <Link to="/" className="font-serif font-medium text-xl text-black hover:opacity-70 transition-opacity shrink-0">
                        {term('brand-name')}
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
                                        'text-sm text-black font-sans px-3 py-1.5 rounded-md transition-all',
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
                    <div className="hidden md:block flex-1 min-w-0 max-w-[20rem] lg:max-w-[24rem] mx-4">
                        <form onSubmit={handleSearch} className="relative group">
                            <div className="flex items-center bg-white/60 border border-border rounded-md overflow-hidden focus-within:bg-white focus-within:ring-1 focus-within:ring-[#1034A6] transition-all">
                                <button
                                    ref={kbRef}
                                    type="button"
                                    onClick={() => setKbOpen(o => !o)}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 border-r border-black/10 shrink-0 py-2 transition-colors",
                                        kbOpen ? "text-black bg-black/5" : "text-text-muted hover:text-black"
                                    )}
                                    aria-label={term('toggle-picker')}
                                >
                                    <Keyboard size={14} />
                                    <span className="text-xs text-black/30">›</span>
                                </button>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={term('search-placeholder')}
                                    className="flex-1 min-w-0 bg-transparent px-2.5 py-2 text-sm focus:outline-none placeholder:text-text-muted text-black"
                                />
                                <button
                                    type="submit"
                                    className="px-2.5 py-2 text-text-muted hover:text-black transition-colors shrink-0"
                                    aria-label={term('search')}
                                >
                                    <Search size={16} />
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
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 flex-nowrap">



                    {/* ① وزن / CV — Arabised vs Standard terminology */}
                    <button
                        id="terminology-toggle"
                        onClick={() => setMode(isArabised ? 'standard' : 'arabised')}
                        title={isArabised ? term('toggle-terminology-standard') : term('toggle-terminology-arabised')}
                        className={cn(
                            'hidden sm:flex items-center justify-center rounded-md px-2 py-1 text-sm transition-colors',
                            'hover:bg-border/40',
                        )}
                    >
                        {/* Show Arabic وزن when in standard mode; show CV when in arabised mode */}
                        {isArabised
                            ? <span className="font-arabic text-base leading-none text-black">وزن</span>
                            : <span className="font-sans font-medium text-black tracking-wider text-xs">CV</span>
                        }
                    </button>

                    {/* ② Hide / show theoretical forms */}
                    <button
                        id="hide-theoretical-toggle"
                        onClick={toggleHideTheoreticalForms}
                        title={hideTheoreticalForms ? term('show-theoretical-forms') : term('hide-theoretical-forms')}
                        aria-pressed={hideTheoreticalForms}
                        className={cn(
                            'inline-flex items-center justify-center px-1 py-0.5 text-black/70 hover:text-black transition-colors',
                        )}
                    >
                        <span className="text-[15px] leading-none">{hideTheoreticalForms ? '✧' : '✦'}</span>
                    </button>

                    {/* ③ EN / MT — interface language */}
                    <button
                        id="language-toggle"
                        onClick={() => setLanguage(language === 'en' ? 'mt' : 'en')}
                        title={language === 'en' ? term('toggle-language-mt') : term('toggle-language-en')}
                        className="hidden sm:flex items-center justify-center rounded-md px-2 py-1 text-sm font-sans font-medium text-black hover:bg-border/40 transition-colors"
                    >
                        {language === 'en' ? 'EN' : 'MT'}
                    </button>

                    {/* ④ Sun / Moon — light / dark mode */}
                    <button
                        id="dark-mode-toggle"
                        onClick={toggleDark}
                        title={dark ? term('toggle-light-mode') : term('toggle-dark-mode')}
                        className="flex items-center justify-center w-8 h-8 rounded-full text-black hover:bg-border/40 transition-colors"
                    >
                        {dark ? <Moon size={15} /> : <Sun size={15} />}
                    </button>

                    {/* ⑤ Admin View Toggle — Minimal version */}
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

                    {/* ⑥ User avatar — Clerk */}
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button
                                id="sign-in-btn"
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white hover:bg-[#222] transition-colors"
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
                        ref={hamburgerRef}
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded hover:bg-border/40 transition-colors"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label={term('toggle-menu')}
                    >
                        {menuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div
                    ref={mobileMenuRef}
                    className="md:hidden border-t border-border/50 bg-[#F4F3F0] px-4 py-3 space-y-0.5 animate-fade-in"
                >
                    {showSearch && (
                        <div className="pb-3 mb-1 mt-1 border-b border-border-light">
                            <form onSubmit={handleSearch} className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={term('search-placeholder')}
                                    className="w-full bg-white border border-border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1034A6] placeholder:text-gray-400"
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
                                    'block py-2.5 text-sm text-black border-b border-border-light last:border-0',
                                    active ? 'font-semibold' : 'font-normal',
                                )}
                            >
                                {link.label}
                            </Link>
                        );
                    })}

                    {/* Mobile: show all three toggles in a row */}
                    <div className="pt-3 flex items-center gap-3">
                        <button
                            onClick={() => setMode(isArabised ? 'standard' : 'arabised')}
                            className="text-sm font-medium text-black"
                        >
                            {isArabised ? <span className="font-arabic text-base">وزن</span> : <span className="font-sans font-medium text-sm">CV</span>}
                        </button>
                        <span className="text-border">·</span>
                        <button
                            onClick={toggleHideTheoreticalForms}
                            aria-pressed={hideTheoreticalForms}
                            title={hideTheoreticalForms ? term('show-theoretical-forms') : term('hide-theoretical-forms')}
                            className={cn(
                                'inline-flex items-center justify-center px-1 py-0.5 text-black/70 transition-colors',
                            )}
                        >
                            <span className="text-[13px] leading-none">{hideTheoreticalForms ? '✧' : '✦'}</span>
                        </button>
                        <span className="text-border">·</span>
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'mt' : 'en')}
                            className="text-sm font-medium text-black"
                        >
                            {language === 'en' ? 'EN' : 'MT'}
                        </button>
                        <span className="text-border">·</span>
                        <button onClick={toggleDark} className="text-black">
                            {dark ? <Moon size={14} /> : <Sun size={14} />}
                        </button>
                        {isTrueAdmin && (
                            <>
                                <span className="text-border">·</span>
                                <button
                                    onClick={() => setAdminViewEnabled(!adminViewEnabled)}
                                    className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                        adminViewEnabled ? "bg-[#1034A6] text-white border-[#1034A6]" : "text-black/40 border-black/10"
                                    )}
                                >
                                    {adminViewEnabled ? term('admin-view') : term('user-view')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
