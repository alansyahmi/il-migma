import type { ConfigItem } from '@/lib/adminConfig';
import type { AdminCategory } from '@/lib/adminCategoryRegistry';

export interface SettingsFilters {
    searchTerm: string;
    posFilter: string;
    roleFilter: string;
}

export const filterSettingsItems = (
    items: ConfigItem[],
    filters: SettingsFilters,
    activeCategory: AdminCategory | null,
): ConfigItem[] => {
    let next = items;

    if (filters.searchTerm.trim()) {
        const term = filters.searchTerm.trim().toLowerCase();
        next = next.filter((item) => {
            const value = item.value as Record<string, unknown>;
            const applicabilities = Array.isArray(value?.applicabilities) ? value.applicabilities as Record<string, unknown>[] : [];
            const metadataText = applicabilities.map((app) => JSON.stringify(app)).join(' ').toLowerCase();
            return (
                item.key.toLowerCase().includes(term) ||
                String(value?.description ?? '').toLowerCase().includes(term) ||
                String(value?.cv ?? '').toLowerCase().includes(term) ||
                String(value?.wizen ?? '').toLowerCase().includes(term) ||
                metadataText.includes(term)
            );
        });
    }

    if (filters.roleFilter !== 'all' && activeCategory?.editorType === 'pattern') {
        next = next.filter((item) => {
            return item.category === filters.roleFilter;
        });
    }

    if (filters.posFilter !== 'all' && activeCategory?.hasPosFilter) {
        next = next.filter((item) => {
            const value = item.value as Record<string, unknown>;
            const pos = Array.isArray(value?.pos_types) ? (value.pos_types as string[]) : [];
            const applicabilities = Array.isArray(value?.applicabilities) ? value.applicabilities as Record<string, unknown>[] : [];
            return pos.includes(filters.posFilter) || applicabilities.some((app) => String(app?.pos ?? '').trim() === filters.posFilter);
        });
    }

    return next;
};

export const isPatternCategory = (activeCategory: AdminCategory | null): boolean => activeCategory?.editorType === 'pattern';

export const canFilterByPos = (activeCategory: AdminCategory | null): boolean => Boolean(activeCategory?.hasPosFilter);

export const isUiTerminologyCategory = (activeCategory: AdminCategory | null): boolean => activeCategory?.id === 'ui_terminology';
