import { Navigate, useSearchParams } from 'react-router-dom';

export function StemSearch() {
    const [searchParams] = useSearchParams();
    const params = new URLSearchParams(searchParams);
    params.set('mode', 'stem');

    return <Navigate to={`/root-search?${params.toString()}`} replace />;
}
