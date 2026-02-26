
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="font-arabic text-7xl text-[#C9A84C]/30 mb-4 leading-none">٤٠٤</div>
            <h1 className="font-serif text-4xl font-bold text-[#1B4D3E] mb-2">
                Il-Paġna Ma Nstabetx
            </h1>
            <p className="text-[#4a4a4a] max-w-sm mb-6">
                Din il-paġna ma teżistix. Forsi l-url mhix korretta?
            </p>
            <div className="flex gap-3">
                <Link to="/">
                    <Button variant="primary">Mur Lura lejn id-Dar</Button>
                </Link>
                <Link to="/search">
                    <Button variant="secondary" leftIcon={<Search size={14} />}>Fittex</Button>
                </Link>
            </div>
        </div>
    );
}
