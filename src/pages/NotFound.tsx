import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Home as HomeIcon } from 'lucide-react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

export function NotFound() {
    const { term } = useLinguisticMode();

    useEffect(() => {
        document.title = `${term('page-not-found')} | Il-Miġma'`;
    }, [term]);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.webp") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="flex flex-col items-center justify-center px-4 text-center min-h-screen">
            <div className="font-serif text-9xl text-[#C9A84C]/30 mb-6 leading-none select-none">404</div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-black mb-4 tracking-tight">
                {term('page-not-found')}
            </h1>
            <p className="text-text-muted text-base mb-10 max-w-md mx-auto leading-relaxed">
                {term('page-not-found-desc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                    to="/"
                    className="flex items-center gap-2 bg-link text-white text-sm font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-link/20"
                >
                    <HomeIcon size={16} />
                    {term('go-back-home')}
                </Link>
                <Link
                    to="/search"
                    className="flex items-center gap-2 bg-white text-black text-sm font-sans font-medium px-5 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                >
                    <Search size={16} />
                    {term('search-dictionary')}
                </Link>
            </div>
        </div>
    );
}
