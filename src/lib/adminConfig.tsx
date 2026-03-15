import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminListConfig, adminCreateConfig, adminUpdateConfig, adminDeleteConfig } from './api';
import { resolveTerm as resolveHardcodedTerm } from './terminology';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

export interface ConfigItem {
    id: string;
    category: string;
    key: string;
    value: any;
    sort_order: number;
}

interface AdminConfigContextType {
    config: ConfigItem[];
    loading: boolean;
    refresh: () => Promise<void>;
    getCategoryItems: (category: string) => ConfigItem[];
    getValues: (category: string) => any[];
    createItem: (item: Partial<ConfigItem>) => Promise<void>;
    updateItem: (item: ConfigItem) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    getOptions: (category: string, mode: 'standard' | 'arabised', lang?: 'en' | 'mt') => { value: string, label: string }[];
}

const AdminConfigContext = createContext<AdminConfigContextType | undefined>(undefined);

// Fallbacks for critical lists
const FALLBACKS: Record<string, string[]> = {
    pos: ['verb', 'noun', 'adjective', 'adverb', 'preposition', 'conjunction', 'particle', 'article', 'pronoun', 'interrogative', 'numeral', 'interjection', 'participle'],
    gender: ['masculine', 'feminine', 'neutral'],
    verb_class: ['strong', 'weak', 'doubled', 'quadrilateral', 'loan'],
    verb_transitivity: ['transitive', 'intransitive', 'both', 'ditransitive'],
    register: ['formal', 'informal', 'archaic', 'obsolete', 'technical', 'dialectal', 'colloquial'],
    dialect: ['Standard', 'Qormi', 'Birkirkara', 'Żejtun', 'Żurrieq', 'Sannat', 'Mosta', 'Nadur (Għawdex)', 'Żebbuġ', 'Marsaxlokk', 'Xewkija (Għawdex)', 'Għarb', 'Victoria (Għawdex)', 'Vassalli (Arkajku)'],
};

export const AdminConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<ConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { getToken } = useClerkAuth();

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken().catch(() => null);
            const res = await adminListConfig(token || '');
            const parsed = res.config.map(item => ({
                ...item,
                value: typeof item.value === 'string' ? JSON.parse(item.value) : item.value
            }));
            setConfig(parsed);
        } catch (err) {
            console.error('Failed to fetch admin config:', err);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const getCategoryItems = (category: string) => {
        return config.filter(item => item.category === category);
    };

    const getValues = (category: string) => {
        const items = getCategoryItems(category);
        if (items.length > 0) {
            if (category === 'verb_preset') {
                return items.map(i => ({ form: i.key, data: i.value }));
            }
            if (category === 'cv_wizen_pattern' || category === 'broken_pattern' || category === 'adjective_pattern') {
                return items.map(i => i.value);
            }
            
            const first = items[0];
            const isComplex = typeof first.value === 'object' && first.value !== null && !('en' in first.value);
            if (isComplex) {
                return items.map(i => i.value);
            }
            return items.map(i => i.key);
        }
        return FALLBACKS[category] || [];
    };

    const createItem = async (item: Partial<ConfigItem>) => {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        await adminCreateConfig(token, item);
        await refresh();
    };

    const updateItem = async (item: ConfigItem) => {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        await adminUpdateConfig(token, item);
        await refresh();
    };

    const deleteItem = async (id: string) => {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        await adminDeleteConfig(token, id);
        await refresh();
    };

    const getOptions = (category: string, mode: 'standard' | 'arabised', lang: 'en' | 'mt' = 'mt'): { value: string, label: string }[] => {
        const items = getCategoryItems(category);
        if (items.length > 0) {
            return items.map(item => {
                const v = item.value;
                let label = item.key;
                if (v && typeof v === 'object') {
                    if (lang === 'en') {
                        label = v.en || item.key;
                    } else if (mode === 'arabised') {
                        label = v.mt_arabised || v.wizen || v.en || item.key;
                    } else {
                        label = v.mt_standard || v.cv || v.en || item.key;
                    }
                }
                return { value: item.key, label };
            });
        }

        // Use fallbacks if no items in DB
        const fallbacks = FALLBACKS[category] || [];
        return fallbacks.map(f => ({
            value: f,
            label: resolveHardcodedTerm(f, mode, lang)
        }));
    };

    return (
        <AdminConfigContext.Provider
            value={{
                config,
                loading,
                refresh,
                getCategoryItems,
                getValues,
                createItem,
                updateItem,
                deleteItem,
                getOptions,
            }}
        >
            {children}
        </AdminConfigContext.Provider>
    );
};

export const useAdminConfig = () => {
    const context = useContext(AdminConfigContext);
    if (!context) {
        throw new Error('useAdminConfig must be used within an AdminConfigProvider');
    }
    return context;
};
