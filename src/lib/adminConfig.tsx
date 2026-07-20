import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminListConfig, adminCreateConfig, adminUpdateConfig, adminDeleteConfig, invalidateDistinctValuesCache } from './api';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { getCategoryById, getRegistryOptions } from './adminCategoryRegistry';
import { emitCatalogRefresh, useCatalogRefresh } from '@/hooks/useCatalogRefresh';
import { resolveTerm as resolveHardcodedTerm } from './terminology.ts';
import { ensureVerbClassFallbackOptions, ensureVerbClassFallbackValues } from './verbClassOptions';

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
    createItem: (item: Partial<ConfigItem>, options?: { refresh?: boolean }) => Promise<void>;
    updateItem: (item: ConfigItem, options?: { refresh?: boolean }) => Promise<void>;
    deleteItem: (id: string, options?: { refresh?: boolean }) => Promise<void>;
    getOptions: (category: string, mode: 'standard' | 'arabised' | 'latinised', lang?: 'en' | 'mt') => { value: string, label: string }[];
}

const AdminConfigContext = createContext<AdminConfigContextType | undefined>(undefined);

// Fallbacks for critical lists
const FALLBACKS: Record<string, string[]> = {
    pos: ['verb', 'noun', 'adjective', 'adverb', 'preposition', 'conjunction', 'particle', 'article', 'pronoun', 'interrogative', 'numeral', 'interjection', 'participle'],
    gender: ['masculine', 'feminine', 'neutral'],
    participle_type: ['active', 'passive'],
    numeral_type: ['cardinal', 'ordinal', 'adverbial', 'fractional', 'multiplier', 'distributive', 'attributive_short', 'attributive_long'],
    verb_class: ['strong', 'strong-hybrid', 'weak', 'doubled', 'quadriliteral', 'loan'],
    verb_transitivity: ['transitive', 'intransitive', 'both', 'ditransitive'],
    register: ['formal', 'informal', 'archaic', 'obsolete', 'technical', 'dialectal', 'colloquial'],
    dialect: [
        'Standard',
        // ―― Malta ――
        // Southern Harbour
        'Birgu (Vittoriosa)', 'Bormla (Cospicua)', 'Fgura', 'Floriana',
        'Għaxaq', 'Il-Marsa', 'Il-Paola (Raħal Ġdid)', 'Isla (Senglea)',
        'Kalkara', 'Luqa', 'Marsaskala (Wied il-Għajn)',
        'Marsaxlokk', 'Mqabba', 'Qormi', 'Qrendi',
        'Safi', 'Santa Luċija', 'Tarxien', 'Valletta',
        'Xgħajra', 'Żabbar', 'Żejtun', 'Żurrieq',
        // South Eastern
        'Birżebbuġa', 'Gudja', 'Kirkop',
        // Northern Harbour
        'Birkirkara', 'Gżira', 'Ħamrun', 'Msida', 'Pembroke',
        'Pietà', 'San Ġiljan (St Julian\'s)', 'San Ġwann',
        'Santa Venera', 'Sliema', 'Swieqi', 'Ta\' Xbiex',
        // Western
        'Attard', 'Balzan', 'Dingli', 'Iklin', 'Lija',
        'Mdina', 'Mtarfa', 'Rabat', 'Siġġiewi', 'Żebbuġ',
        // Northern
        'Buġibba', 'Għargħur', 'Mellieħa', 'Mġarr',
        'Mosta', 'Naxxar', 'San Pawl il-Baħar (St Paul\'s Bay)',
        // ―― Gozo (Għawdex) ――
        'Fontana', 'Għajnsielem', 'Għarb', 'Għasri',
        'Kerċem', 'Marsalforn', 'Munxar', 'Nadur',
        'Qala', 'San Lawrenz', 'Sannat', 'Victoria (Rabat)',
        'Xagħra', 'Xewkija', 'Żebbuġ (Għawdex)',
        // ―― Historic / archaic ――
        'Vassalli (Arkajku)',
    ],
};

function optionKey(value: unknown) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `string:${value}`;
    if (typeof value === 'number') return `number:${value}`;
    if (typeof value === 'boolean') return `boolean:${value}`;
    try {
        return `json:${JSON.stringify(value)}`;
    } catch {
        return `string:${String(value)}`;
    }
}

function dedupeBy<T>(items: T[], getValue: (item: T) => unknown) {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = optionKey(getValue(item));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

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
            invalidateDistinctValuesCache();
            const token = await getToken().catch(() => null);
            const res = await adminListConfig(token || '', undefined, Date.now());
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

    useCatalogRefresh(refresh, { intervalMs: 60_000 });

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
                return dedupeBy(items.map(i => reg.transformValue!(i)), (value) => value);
            }

            const first = items[0];
            const isComplex = typeof first.value === 'object' && first.value !== null && !('en' in first.value);
            if (isComplex) {
                return dedupeBy(items.map(i => i.value), (value) => value);
            }
            const values = dedupeBy(items.map(i => i.key), (value) => value);
            return category === 'verb_class' ? ensureVerbClassFallbackValues(values) : values;
        }
        const fallbacks = FALLBACKS[category] || [];
        return category === 'verb_class' ? ensureVerbClassFallbackValues(fallbacks) : fallbacks;
    }, [getCategoryItems]);

    const createItem = async (item: Partial<ConfigItem>, options?: { refresh?: boolean }) => {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        await adminCreateConfig(token, item);
        emitCatalogRefresh();
        if (options?.refresh !== false) {
            await refresh();
        }
    };

    const updateItem = async (item: ConfigItem, options?: { refresh?: boolean }) => {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        await adminUpdateConfig(token, item);
        emitCatalogRefresh();
        if (options?.refresh !== false) {
            await refresh();
        }
    };

    const deleteItem = async (id: string, options?: { refresh?: boolean }) => {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        await adminDeleteConfig(token, id);
        emitCatalogRefresh();
        if (options?.refresh !== false) {
            await refresh();
        }
    };

    const getOptions = useCallback((category: string, mode: 'standard' | 'arabised' | 'latinised', lang: 'en' | 'mt' = 'mt'): { value: string, label: string }[] => {
        const items = getCategoryItems(category);
        const fallbacks = FALLBACKS[category] || [];

        if (items.length > 0) {
            const mapped = dedupeBy(items
                .map(item => getRegistryOptions(category, item, mode, lang))
                .filter(Boolean) as { value: string, label: string }[], (option) => option.value);

            // Merge fallback values not already in the DB so that newly-added
            // defaults (e.g. an expanded dialect list) show up immediately.
            const seen = new Set(mapped.map(m => m.value));
            for (const f of fallbacks) {
                const mockItem = { key: f, value: null };
                const opt = getRegistryOptions(category, mockItem, mode, lang) || { value: f, label: f };
                if (!seen.has(opt.value)) {
                    mapped.push(opt);
                    seen.add(opt.value);
                }
            }

            return category === 'verb_class'
                ? ensureVerbClassFallbackOptions(mapped, (value) => resolveHardcodedTerm(value, mode, lang))
                : mapped;
        }

        // Use fallbacks if no items in DB
        const mapped = dedupeBy(fallbacks.map(f => {
            const mockItem = { key: f, value: null };
            const opt = getRegistryOptions(category, mockItem, mode, lang);
            return opt || { value: f, label: f };
        }), (option) => option.value);
        return category === 'verb_class'
            ? ensureVerbClassFallbackOptions(mapped, (value) => resolveHardcodedTerm(value, mode, lang))
            : mapped;
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
