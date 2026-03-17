import React, { createContext, useContext, useState, useCallback } from 'react';
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
    const { byCategoryAndKey } = useAdminConfig();
    const { language } = useLanguage();
    const [mode, setModeState] = useState<LinguisticMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return (stored === 'arabised' ? 'arabised' : 'standard') as LinguisticMode;
    });

    const setMode = (newMode: LinguisticMode) => {
        setModeState(newMode);
        localStorage.setItem(STORAGE_KEY, newMode);
    };

    const term = useCallback((key: string) => {
        if (!key) return '';
        const lowerKey = key.toLowerCase();
        const isEn = language === 'en';

        // 1. Check dynamic config via indexed maps
        // Match order: ui_terminology -> global search (legacy)
        let dynamicItem = byCategoryAndKey.get('ui_terminology')?.get(lowerKey);
        
        if (!dynamicItem) {
            // Fallback: Global search across all categories (find first match)
            for (const [cat, map] of byCategoryAndKey.entries()) {
                if (cat === 'ui_terminology') continue;
                dynamicItem = map.get(lowerKey);
                if (dynamicItem) break;
            }
        }

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
    }, [byCategoryAndKey, language, mode]);

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
