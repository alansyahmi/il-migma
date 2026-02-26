import React, { createContext, useContext, useState } from 'react';
import type { LinguisticMode } from '@/types';
import { resolveTerm } from '@/lib/terminology';

interface LinguisticModeContextValue {
    mode: LinguisticMode;
    setMode: (mode: LinguisticMode) => void;
    term: (key: string) => string;
}

const LinguisticModeContext = createContext<LinguisticModeContextValue | null>(null);

const STORAGE_KEY = 'il-migma:linguistic-mode';

export function LinguisticModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<LinguisticMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return (stored === 'arabised' ? 'arabised' : 'standard') as LinguisticMode;
    });

    const setMode = (newMode: LinguisticMode) => {
        setModeState(newMode);
        localStorage.setItem(STORAGE_KEY, newMode);
    };

    const term = (key: string) => resolveTerm(key, mode);

    return (
        <LinguisticModeContext.Provider value={{ mode, setMode, term }}>
            {children}
        </LinguisticModeContext.Provider>
    );
}

export function useLinguisticMode() {
    const ctx = useContext(LinguisticModeContext);
    if (!ctx) throw new Error('useLinguisticMode must be used within LinguisticModeProvider');
    return ctx;
}
