import React, { createContext, useContext, useState, useCallback } from 'react';
import type { LinguisticMode } from '@/types';
import { resolveTerm as resolveHardcodedTerm } from '@/lib/terminology';
import { useLanguage } from '@/contexts/LanguageContext';

type TermParams = Record<string, string | number | null | undefined>;

interface LinguisticModeContextValue {
    mode: LinguisticMode;
    setMode: (mode: LinguisticMode) => void;
    term: (key: string, params?: TermParams) => string;
}

const LinguisticModeContext = createContext<LinguisticModeContextValue | null>(null);

const STORAGE_KEY = 'il-migma:linguistic-mode';

const PLACEHOLDER_RE = /\{([a-zA-Z0-9_-]+)\}/g;

function interpolateTerm(template: string, params: TermParams, resolveNested: (key: string) => string) {
    return template.replace(PLACEHOLDER_RE, (match, token) => {
        const param = params[token];
        if (param !== undefined && param !== null) {
            return String(param);
        }

        const nested = resolveNested(token);
        return nested || match;
    });
}

export function LinguisticModeProvider({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const [mode, setModeState] = useState<LinguisticMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return (stored === 'arabised' ? 'arabised' : 'standard') as LinguisticMode;
    });

    const setMode = (newMode: LinguisticMode) => {
        setModeState(newMode);
        localStorage.setItem(STORAGE_KEY, newMode);
    };

    const resolveTermInternal = useCallback((key: string, params: TermParams, seen: Set<string>) => {
        if (!key) return '';
        const lowerKey = key.toLowerCase();
        const isEn = language === 'en';

        if (seen.has(lowerKey)) return key;

        const nextSeen = new Set(seen);
        nextSeen.add(lowerKey);
        const resolveNested = (nestedKey: string) => resolveTermInternal(nestedKey, params, nextSeen);

        return interpolateTerm(
            resolveHardcodedTerm(lowerKey, mode, isEn ? 'en' : 'mt'),
            params,
            resolveNested,
        );
    }, [language, mode]);

    const term = useCallback((key: string, params: TermParams = {}) => resolveTermInternal(key, params, new Set()), [resolveTermInternal]);

    const contextValue = React.useMemo(() => ({ mode, setMode, term }), [mode, term]);

    return (
        <LinguisticModeContext.Provider value={contextValue}>
            {children}
        </LinguisticModeContext.Provider>
    );
}

export function useLinguisticMode() {
    const ctx = useContext(LinguisticModeContext);
    if (!ctx) throw new Error('useLinguisticMode must be used within LinguisticModeProvider');
    return ctx;
}
