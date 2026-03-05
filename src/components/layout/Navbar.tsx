import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Menu, X, Sun, Moon, Search, Eye, EyeOff, Shield } from 'lucide-react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Navigation links are now handled inside the component to support localization

export function Navbar() {
    const { mode, setMode, term } = useLinguisticMode();
    const { language, setLanguage, t } = useLanguage();
    const { dark, toggle: toggleDark } = useDarkMode();
    const { isTrueAdmin, adminViewEnabled, setAdminViewEnabled, tier } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

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
        { label: t('Advanced Search', term('Tiftix Avvanzat')), href: '/advanced-search' },
        { label: t('Root Search', term('Tiftix tal-Għeruq')), href: '/root-search' },
        { label: t('Suggest Entry', term('Issuġġerixxi Entrata')), href: '/suggest' },
        { label: t('Information', term('Informazzjoni')), href: '/blog' },
        { label: t('Help', 'Għajnuna'), href: '/help' },
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
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1034A6] transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Search...', 'Fittex...')}
                                className="w-full bg-white/60 border border-[#d8cfc0] rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1034A6] focus:bg-white transition-all placeholder:text-gray-500 text-[#000]"
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
                        title={isArabised
                            ? t('Switch to Standard CV terminology', 'Aqleb għat-terminoloġija Standard CV')
                            : t('Switch to Arabised وزن terminology', 'Aqleb għat-terminoloġija Għarbija وزن')}
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
                        title={t('Switch to Maltese language', 'Aqleb lill-lingwa Maltija')}
                        className="hidden sm:flex items-center justify-center rounded-md px-2 py-1 text-sm font-sans font-medium text-[#000] hover:bg-[#d8cfc0]/40 transition-colors"
                    >
                        {language === 'en' ? 'EN' : 'MT'}
                    </button>

                    {/* ③ Sun / Moon — light / dark mode */}
                    <button
                        id="dark-mode-toggle"
                        onClick={toggleDark}
                        title={dark ? t('Switch to light mode', 'Aqleb għall-mod ċar') : t('Switch to dark mode', 'Aqleb għall-mod skur')}
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
                            title={adminViewEnabled ? t('Switch to User View', 'Aqleb lill-Veduta tal-Utent') : t('Switch to Admin View', 'Aqleb lill-Veduta tal-Amministratur')}
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
                                aria-label={t('Sign in', 'Idħol')}
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
                                        label={isTrueAdmin ? t("System Role: ADMIN", "Rwol tas-Sistema: ADMIN") : `${t('Tier', 'Livell')}: ${tier.toUpperCase()}`}
                                        labelIcon={<Shield size={16} className={isTrueAdmin ? "text-amber-600" : "text-blue-600"} />}
                                        onClick={() => { }}
                                    />
                                    <UserButton.Link
                                        label={t("Admin Dashboard", "Dashboard tal-Amministratur")}
                                        labelIcon={<Shield size={16} />}
                                        href="/admin"
                                    />
                                    <UserButton.Action
                                        label={adminViewEnabled ? t("Switch to User View", "Aqleb lill-Veduta tal-Utent") : t("Switch to Admin View", "Aqleb lill-Veduta tal-Amministratur")}
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
                        aria-label={t('Toggle menu', 'I togglja l-menu')}
                    >
                        {menuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="md:hidden border-t border-[#d8cfc0]/50 bg-[#F4F3F0] px-4 py-3 space-y-0.5 animate-fade-in">
                    {showSearch && (
                        <div className="pb-3 mb-1 mt-1 border-b border-[#ede9e1]">
                            <form onSubmit={handleSearch} className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('Search...', 'Fittex...')}
                                    className="w-full bg-white border border-[#d8cfc0] rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1034A6] placeholder:text-gray-400"
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
                                    'block py-2.5 text-sm text-[#000] border-b border-[#ede9e1] last:border-0',
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
                            className="text-sm font-medium text-[#000]"
                        >
                            {isArabised ? <span className="font-arabic text-base">وزن</span> : 'CV'}
                        </button>
                        <span className="text-[#d8cfc0]">·</span>
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'mt' : 'en')}
                            className="text-sm font-medium text-[#000]"
                        >
                            {language === 'en' ? 'EN' : 'MT'}
                        </button>
                        <span className="text-[#d8cfc0]">·</span>
                        <button onClick={toggleDark} className="text-[#000]">
                            {dark ? <Moon size={14} /> : <Sun size={14} />}
                        </button>
                        {isTrueAdmin && (
                            <>
                                <span className="text-[#d8cfc0]">·</span>
                                <button
                                    onClick={() => setAdminViewEnabled(!adminViewEnabled)}
                                    className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                        adminViewEnabled ? "bg-[#1034A6] text-white border-[#1034A6]" : "text-black/40 border-black/10"
                                    )}
                                >
                                    {adminViewEnabled ? t('Admin View', 'Veduta Admin') : t('User View', 'Veduta Utent')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
