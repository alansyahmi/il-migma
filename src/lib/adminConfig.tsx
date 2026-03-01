import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminListConfig, adminCreateConfig, adminUpdateConfig, adminDeleteConfig } from './api';
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
}

const AdminConfigContext = createContext<AdminConfigContextType | undefined>(undefined);

// Fallbacks for critical lists
const FALLBACKS: Record<string, string[]> = {
    pos: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'particle', 'article', 'pronoun', 'interrogative', 'numeral', 'interjection', 'participle'],
    gender: ['masculine', 'feminine', 'common'],
    verb_class: ['strong', 'weak', 'doubled', 'quadrilateral', 'loan'],
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
            const token = await getToken();
            if (token) {
                const res = await adminListConfig(token);
                const parsed = res.config.map(item => ({
                    ...item,
                    value: typeof item.value === 'string' ? JSON.parse(item.value) : item.value
                }));
                setConfig(parsed);
            }
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
            return items.map(i => i.value);
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
