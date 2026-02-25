import React, { createContext, useContext, useState, useEffect } from 'react';

interface DarkModeContextType {
    dark: boolean;
    toggle: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({
    dark: false,
    toggle: () => { },
});

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        if (dark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [dark]);

    return (
        <DarkModeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
            {children}
        </DarkModeContext.Provider>
    );
}

export function useDarkMode() {
    return useContext(DarkModeContext);
}
