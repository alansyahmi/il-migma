import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'mt';

interface LanguageContextType {
    language: Language;
    setLanguage: (l: Language) => void;
    /** Helper: returns the EN or MT string depending on current language */
    t: (en: string, mt: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => { },
    t: (en) => en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    const t = (en: string, mt: string) => language === 'en' ? en : mt;

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
