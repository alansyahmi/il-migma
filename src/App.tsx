import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { HideTheoreticalFormsProvider } from '@/contexts/HideTheoreticalFormsContext';
import { LinguisticModeProvider } from '@/contexts/LinguisticModeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DarkModeProvider } from '@/contexts/DarkModeContext';
import { AdminConfigProvider } from '@/lib/adminConfig';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import ScrollToTop from '@/components/utils/ScrollToTop';
import type { ComponentType } from 'react';

function lazyNamed<TModule extends Record<string, unknown>, TExport extends keyof TModule>(
    loader: () => Promise<TModule>,
    exportName: TExport,
) {
    return lazy(() =>
        loader().then((mod) => ({
            default: mod[exportName] as ComponentType,
        })),
    );
}

const Home = lazyNamed(() => import('@/pages/Home'), 'Home');
const Search = lazyNamed(() => import('@/pages/Search'), 'Search');
const EntryPage = lazyNamed(() => import('@/pages/Entry'), 'EntryPage');
const Chatbot = lazyNamed(() => import('@/pages/Chatbot'), 'Chatbot');
const Dashboard = lazyNamed(() => import('@/pages/Dashboard'), 'Dashboard');
const IsSemmej = lazyNamed(() => import('@/pages/IsSemmej'), 'IsSemmej');
const NotFound = lazyNamed(() => import('@/pages/NotFound'), 'NotFound');
const Admin = lazyNamed(() => import('@/pages/Admin'), 'Admin');
const AdvancedSearch = lazyNamed(() => import('@/pages/AdvancedSearch'), 'AdvancedSearch');
const RootSearch = lazyNamed(() => import('@/pages/RootSearch'), 'RootSearch');
const Root = lazyNamed(() => import('@/pages/Root'), 'Root');
const Suggest = lazyNamed(() => import('@/pages/Suggest'), 'Suggest');
const Feedback = lazyNamed(() => import('@/pages/Feedback'), 'Feedback');
const Browse = lazyNamed(() => import('@/pages/Browse'), 'Browse');
const BrowseHome = lazyNamed(() => import('@/pages/BrowseHome'), 'BrowseHome');
const BrowsePatternPage = lazyNamed(() => import('@/pages/BrowsePatternPage'), 'BrowsePatternPage');
const BrowseSuffixCatalogPage = lazyNamed(() => import('@/pages/BrowseSuffixCatalogPage'), 'BrowseSuffixCatalogPage');
const BrowseSource = lazyNamed(() => import('@/pages/BrowseSource'), 'BrowseSource');
const SuffixDetailPage = lazyNamed(() => import('@/pages/Suffix'), 'SuffixDetailPage');
const Pattern = lazyNamed(() => import('@/pages/Pattern'), 'Pattern');
const StemSearch = lazyNamed(() => import('@/pages/StemSearch'), 'StemSearch');
const Stem = lazyNamed(() => import('@/pages/Stem'), 'Stem');


const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!PUBLISHABLE_KEY) {
    console.warn('[Il-Miġma] Missing VITE_CLERK_PUBLISHABLE_KEY — Auth will not function.');
}

/** The layout shell: Navbar + <Outlet> + Footer */
function AppShell() {
    const { pathname } = useLocation();
    const hideFooter = pathname === '/suggest' || pathname === '/feedback';

    return (
        <div className="min-h-screen flex flex-col bg-[#F4F3F0] overflow-x-clip">
            <Navbar />
            <main className="flex-1 min-h-0 flex flex-col">
                <Outlet />
            </main>
            {!hideFooter && <Footer />}
        </div>
    );
}

function RouteFallback() {
    return (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-muted">
            Loading...
        </div>
    );
}

export default function App() {
    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY ?? 'pk_test_placeholder'}>
            <DarkModeProvider>
                <LanguageProvider>
                    <HideTheoreticalFormsProvider>
                        <AdminConfigProvider>
                            <LinguisticModeProvider>
                                <AuthProvider>
                                    <BrowserRouter>
                                        <ScrollToTop />
                                        <Suspense fallback={<RouteFallback />}>
                                            <Routes>
                                                <Route element={<AppShell />}>
                                                    <Route index element={<Home />} />
                                                    <Route path="search" element={<Search />} />
                                                    <Route path="entry/:id" element={<EntryPage />} />
                                                    <Route path="root/:id" element={<Root />} />
                                                    <Route path="chatbot" element={<Chatbot />} />
                                                    <Route path="dashboard" element={<Dashboard />} />
                                                    <Route path="semmej" element={<IsSemmej />} />
                                                    <Route path="admin" element={<Admin />} />
                                                    <Route path="advanced-search" element={<AdvancedSearch />} />
                                                    <Route path="root-search" element={<RootSearch />} />
                                                    <Route path="suggest" element={<Suggest />} />
                                                    <Route path="feedback" element={<Feedback />} />
                                                    <Route path="browse" element={<Browse />}>
                                                        <Route index element={<BrowseHome />} />
                                                        <Route path="pattern" element={<BrowsePatternPage />} />
                                                        <Route path="suffix" element={<BrowseSuffixCatalogPage />} />
                                                        <Route path="source" element={<BrowseSource />} />
                                                    </Route>
                                                    <Route path="suffix/:kind/:suffix" element={<SuffixDetailPage />} />
                                                    <Route path="pattern/:id" element={<Pattern />} />
                                                    <Route path="stem-search" element={<StemSearch />} />
                                                    <Route path="stem/:id" element={<Stem />} />
                                                    <Route path="*" element={<NotFound />} />
                                                </Route>
                                            </Routes>
                                        </Suspense>
                                    </BrowserRouter>
                                </AuthProvider>
                            </LinguisticModeProvider>
                        </AdminConfigProvider>
                    </HideTheoreticalFormsProvider>
                </LanguageProvider>
            </DarkModeProvider>
        </ClerkProvider>
    );
}
