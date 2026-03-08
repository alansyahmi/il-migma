import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Home as HomeIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

export function NotFound() {
    const { t } = useLanguage();

    useEffect(() => {
        document.title = `404 | Il-Miġma'`;
    }, []);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="flex flex-col items-center justify-center px-4 text-center min-h-screen">
            <div className="font-serif text-9xl text-[#C9A84C]/30 mb-6 leading-none select-none">404</div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#000] mb-4 tracking-tight">
                {t('Page Not Found', 'Il-Paġna Ma Nstabetx')}
            </h1>
            <p className="text-[#4a4a4a] text-base mb-10 max-w-md mx-auto leading-relaxed">
                {t('This page does not exist. Perhaps the URL is incorrect or it has been removed.', 'Din il-paġna ma teżistix. Forsi l-url mhix korretta jew tneħħiet.')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                    to="/"
                    className="flex items-center gap-2 bg-[#1034A6] text-white text-sm font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-[#0c268c] transition-colors shadow-lg shadow-[#1034A6]/20"
                >
                    <HomeIcon size={16} />
                    {t('Go Back Home', 'Mur Lura lejn id-Dar')}
                </Link>
                <Link
                    to="/search"
                    className="flex items-center gap-2 bg-white text-[#000] text-sm font-sans font-medium px-5 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                >
                    <Search size={16} />
                    {t('Search Dictionary', 'Fittex fid-Dizzjunarju')}
                </Link>
            </div>
        </div>
    );
}
