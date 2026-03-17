import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminListConfig, adminCreateConfig, adminUpdateConfig, adminDeleteConfig } from './api';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { getCategoryById, getRegistryOptions } from './adminCategoryRegistry';

export interface ConfigItem {
    id: string;
    category: string;
    key: string;
    value: any;
    sort_order: number;
}

interface AdminConfigContextType {
    config: ConfigItem[];
    byCategory: Map<string, ConfigItem[]>;
    byCategoryAndKey: Map<string, Map<string, ConfigItem>>;
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

    // Derived Indexes
    const { byCategory, byCategoryAndKey } = React.useMemo(() => {
        const catMap = new Map<string, ConfigItem[]>();
        const catKeyMap = new Map<string, Map<string, ConfigItem>>();

        config.forEach(item => {
            // By Category
            if (!catMap.has(item.category)) catMap.set(item.category, []);
            catMap.get(item.category)!.push(item);

            // By Category and Key
            if (!catKeyMap.has(item.category)) catKeyMap.set(item.category, new Map());
            catKeyMap.get(item.category)!.set(item.key.toLowerCase(), item);
        });

        return { byCategory: catMap, byCategoryAndKey: catKeyMap };
    }, [config]);

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

    const getCategoryItems = useCallback((category: string) => {
        const reg = getCategoryById(category);
        const storageCats = reg ? reg.storageCategories : [category];
        
        if (storageCats.length === 1) {
            return byCategory.get(storageCats[0]) || [];
        }

        // Combine multiple storage categories (e.g. plural_pattern)
        return storageCats.flatMap(cat => byCategory.get(cat) || []);
    }, [byCategory]);

    const getValues = useCallback((category: string) => {
        const items = getCategoryItems(category);
        const reg = getCategoryById(category);

        if (items.length > 0) {
            if (reg?.transformValue) {
                return items.map(i => reg.transformValue!(i));
            }

            const first = items[0];
            const isComplex = typeof first.value === 'object' && first.value !== null && !('en' in first.value);
            if (isComplex) {
                return items.map(i => i.value);
            }
            return items.map(i => i.key);
        }
        return FALLBACKS[category] || [];
    }, [getCategoryItems]);

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

    const getOptions = useCallback((category: string, mode: 'standard' | 'arabised', lang: 'en' | 'mt' = 'mt'): { value: string, label: string }[] => {
        const items = getCategoryItems(category);
        if (items.length > 0) {
            return items
                .map(item => getRegistryOptions(category, item, mode, lang))
                .filter(Boolean) as { value: string, label: string }[];
        }

        // Use fallbacks if no items in DB
        const fallbacks = FALLBACKS[category] || [];
        return fallbacks.map(f => {
            const mockItem = { key: f, value: null };
            const opt = getRegistryOptions(category, mockItem, mode, lang);
            return opt || { value: f, label: f };
        });
    }, [getCategoryItems]);

    return (
        <AdminConfigContext.Provider
            value={{
                config,
                byCategory,
                byCategoryAndKey,
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
