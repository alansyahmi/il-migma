import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname, search } = useLocation();
    const prevPathname = useRef(pathname);
    const prevSearch = useRef(search);

    useEffect(() => {
        const prevParams = new URLSearchParams(prevSearch.current);
        const currParams = new URLSearchParams(search);

        // Check if anything other than 'offset' changed
        
        prevParams.delete('offset');
        currParams.delete('offset');
        prevParams.delete('limit');
        currParams.delete('limit');
        
        const baseChanged = pathname !== prevPathname.current || prevParams.toString() !== currParams.toString();

        if (baseChanged) {
            window.scrollTo(0, 0);
        }

        prevPathname.current = pathname;
        prevSearch.current = search;
    }, [pathname, search]);

    return null;
}
