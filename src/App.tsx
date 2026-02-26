
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { LinguisticModeProvider } from '@/contexts/LinguisticModeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DarkModeProvider } from '@/contexts/DarkModeContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Home } from '@/pages/Home';
import { Search } from '@/pages/Search';
import { Entry } from '@/pages/Entry';
import { Chatbot } from '@/pages/Chatbot';
import { Dashboard } from '@/pages/Dashboard';
import { Conjugator } from '@/pages/Conjugator';
import { IsSemmej } from '@/pages/IsSemmej';
import { Blog, BlogPost } from '@/pages/Blog';
import { Course } from '@/pages/Course';
import { NotFound } from '@/pages/NotFound';
import { Admin } from '@/pages/Admin';
import { AdvancedSearch } from '@/pages/AdvancedSearch';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!PUBLISHABLE_KEY) {
  console.warn('[Il-Miġma] Missing VITE_CLERK_PUBLISHABLE_KEY — Auth will not function.');
}

/** The layout shell: Navbar + <Outlet> + Footer */
function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F3F0]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY ?? 'pk_test_placeholder'}>
      <DarkModeProvider>
        <LanguageProvider>
          <LinguisticModeProvider>
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route index element={<Home />} />
                    <Route path="search" element={<Search />} />
                    <Route path="entry/:id" element={<Entry />} />
                    <Route path="chatbot" element={<Chatbot />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="conjugator" element={<Conjugator />} />
                    <Route path="semmej" element={<IsSemmej />} />
                    <Route path="blog" element={<Blog />} />
                    <Route path="blog/:slug" element={<BlogPost />} />
                    <Route path="course" element={<Course />} />
                    <Route path="admin" element={<Admin />} />
                    <Route path="advanced-search" element={<AdvancedSearch />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </LinguisticModeProvider>
        </LanguageProvider>
      </DarkModeProvider>
    </ClerkProvider>
  );
}
