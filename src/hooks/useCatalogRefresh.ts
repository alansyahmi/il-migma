import { useEffect, useRef } from 'react';

export const CATALOG_REFRESH_EVENT = 'il-migma:catalog-refresh';

export function emitCatalogRefresh() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CATALOG_REFRESH_EVENT));
}

type UseCatalogRefreshOptions = {
    enabled?: boolean;
    intervalMs?: number;
};

export function useCatalogRefresh(
    onRefresh: () => void | Promise<void>,
    options: UseCatalogRefreshOptions = {},
) {
    const { enabled = true, intervalMs = 0 } = options;
    const refreshRef = useRef(onRefresh);
    const inFlightRef = useRef(false);

    useEffect(() => {
        refreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        if (!enabled) return;

        const triggerRefresh = () => {
            if (inFlightRef.current) return;
            inFlightRef.current = true;

            Promise.resolve(refreshRef.current())
                .catch((error) => {
                    console.error('Catalog refresh failed:', error);
                })
                .finally(() => {
                    inFlightRef.current = false;
                });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                triggerRefresh();
            }
        };

        window.addEventListener(CATALOG_REFRESH_EVENT, triggerRefresh);
        window.addEventListener('focus', triggerRefresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const timer = intervalMs > 0
            ? window.setInterval(triggerRefresh, intervalMs)
            : null;

        return () => {
            window.removeEventListener(CATALOG_REFRESH_EVENT, triggerRefresh);
            window.removeEventListener('focus', triggerRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timer !== null) window.clearInterval(timer);
        };
    }, [enabled, intervalMs]);
}
