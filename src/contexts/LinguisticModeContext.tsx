import React, { createContext, useContext, useState } from 'react';
import type { LinguisticMode } from '@/types';
import { resolveTerm as resolveHardcodedTerm } from '@/lib/terminology';
import { useAdminConfig } from '@/lib/adminConfig';
import { useLanguage } from '@/contexts/LanguageContext';

interface LinguisticModeContextValue {
    mode: LinguisticMode;
    setMode: (mode: LinguisticMode) => void;
    term: (key: string) => string;
}

const LinguisticModeContext = createContext<LinguisticModeContextValue | null>(null);

const STORAGE_KEY = 'il-migma:linguistic-mode';

export function LinguisticModeProvider({ children }: { children: React.ReactNode }) {
    const { config } = useAdminConfig();
    const { language } = useLanguage();
    const [mode, setModeState] = useState<LinguisticMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return (stored === 'arabised' ? 'arabised' : 'standard') as LinguisticMode;
    });

    const setMode = (newMode: LinguisticMode) => {
        setModeState(newMode);
        localStorage.setItem(STORAGE_KEY, newMode);
    };

    const term = (key: string) => {
        if (!key) return '';
        const lowerKey = key.toLowerCase();
        const isEn = language === 'en';

        // 1. Check dynamic config first (case-insensitive key match)
        const dynamicItem = config.find(c => c.key.toLowerCase() === lowerKey);
        if (dynamicItem && typeof dynamicItem.value === 'object' && dynamicItem.value !== null) {
            const v = dynamicItem.value;
            if (isEn) {
                if (v.en) return v.en;
            } else if (mode === 'arabised') {
                const val = v.mt_arabised || v.wizen || v.en;
                if (val) return val;
            } else {
                const val = v.mt_standard || v.cv || v.en;
                if (val) return val;
            }
        }

        // 2. Fallback to hardcoded terminology
        return resolveHardcodedTerm(lowerKey, mode, isEn ? 'en' : 'mt');
    };

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
