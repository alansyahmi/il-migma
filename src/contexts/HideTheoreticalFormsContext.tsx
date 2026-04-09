import React, { createContext, useContext, useMemo, useState } from 'react';

interface HideTheoreticalFormsContextValue {
    hideTheoreticalForms: boolean;
    setHideTheoreticalForms: (value: boolean) => void;
    toggleHideTheoreticalForms: () => void;
}

const STORAGE_KEY = 'il-migma:hide-theoretical-forms';

const HideTheoreticalFormsContext = createContext<HideTheoreticalFormsContextValue>({
    hideTheoreticalForms: false,
    setHideTheoreticalForms: () => { },
    toggleHideTheoreticalForms: () => { },
});

function readStoredPreference() {
    if (typeof window === 'undefined') return false;

    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function HideTheoreticalFormsProvider({ children }: { children: React.ReactNode }) {
    const [hideTheoreticalForms, setHideTheoreticalFormsState] = useState<boolean>(() => readStoredPreference());

    const setHideTheoreticalForms = (value: boolean) => {
        setHideTheoreticalFormsState(value);

        try {
            window.localStorage.setItem(STORAGE_KEY, String(value));
        } catch {
            // Ignore storage failures and keep the preference in-memory.
        }
    };

    const toggleHideTheoreticalForms = () => {
        setHideTheoreticalForms(!hideTheoreticalForms);
    };

    const value = useMemo(
        () => ({
            hideTheoreticalForms,
            setHideTheoreticalForms,
            toggleHideTheoreticalForms,
        }),
        [hideTheoreticalForms],
    );

    return (
        <HideTheoreticalFormsContext.Provider value={value}>
            {children}
        </HideTheoreticalFormsContext.Provider>
    );
}

export function useHideTheoreticalForms() {
    return useContext(HideTheoreticalFormsContext);
}
