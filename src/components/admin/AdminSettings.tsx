import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Settings } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAdminConfig, type ConfigItem } from '@/lib/adminConfig';
import {
    ADMIN_CATEGORY_GROUPS,
    getCategoryById,
    SIDEBAR_CATEGORIES,
    type AdminCategory,
    type AdminCategoryGroupId,
} from '@/lib/adminCategoryRegistry';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { TERMINOLOGY } from '@/lib/terminology';
import { normalizePatternFormValue, PATTERN_BUCKET_LABELS } from '@/lib/patternMetadata';
import { isDashMarkedSuffix } from '@/lib/suffixMatching';
import { cn } from '@/lib/utils';
import { AdminSettingsSidebar } from './settings/AdminSettingsSidebar';
import { AdminSettingsToolbar } from './settings/AdminSettingsToolbar';
import { AdminSettingsItemList } from './settings/AdminSettingsItemList';
import { AdminSettingsSyncBanner } from './settings/AdminSettingsSyncBanner';
import { ConfigFormModal } from './settings/ConfigFormModal';
import { filterSettingsItems } from './settings/selectors';

const GROUP_STORAGE_KEY = 'admin-settings-expanded-groups-v1';

type SyncResult = { success?: number; errors?: string[] } | null;
type ApiData = Record<string, unknown> | null;
type ClerkWindow = Window & {
    Clerk?: {
        session?: {
            getToken?: () => Promise<string | null>;
        };
    };
};

const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
};

const parseJsonObject = (raw: string): ApiData => {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
        return null;
    } catch {
        return null;
    }
};

const getClerkToken = async (): Promise<string | null | undefined> => {
    const clerkWindow = window as ClerkWindow;
    return clerkWindow.Clerk?.session?.getToken?.();
};

export function AdminSettings() {
    const { config, loading, getCategoryItems, deleteItem, createItem, updateItem, refresh } = useAdminConfig();
    const { language, setLanguage, t } = useLanguage();
    const { mode, setMode, term } = useLinguisticMode();
    const { user } = useUser();

    const [activeTab, setActiveTab] = useState('pos');
    const [editItem, setEditItem] = useState<ConfigItem | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [posFilter, setPosFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult>(null);

    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
    const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        if (typeof window === 'undefined') return {};
        const raw = window.localStorage.getItem(GROUP_STORAGE_KEY);
        if (!raw) return {};
        try {
            return JSON.parse(raw) as Record<string, boolean>;
        } catch {
            return {};
        }
    });
    const savedCategoryOrder = user?.unsafeMetadata?.adminCategoryOrder as string[] | undefined;

    useEffect(() => {
        if (savedCategoryOrder) {
            setCategoryOrder(savedCategoryOrder);
        } else {
            setCategoryOrder(SIDEBAR_CATEGORIES.map((cat) => cat.id));
        }
    }, [savedCategoryOrder, user?.id]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(expandedGroups));
        }
    }, [expandedGroups]);

    const sortedCategories = useMemo(() => {
        const visibleCategories = SIDEBAR_CATEGORIES;
        const orderMap = new Map(categoryOrder.map((id, index) => [id, index]));
        return [...visibleCategories].sort((a, b) => {
            const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return indexA - indexB;
        });
    }, [categoryOrder]);

    const canonicalPatternShortcuts = useMemo(() => {
        const canonicalItems = getCategoryItems('cv_wizen_pattern');
        const posOrder = new Map(getCategoryItems('pos').map((item, index) => [item.key, index]));
        const counts = new Map<string, number>();

        canonicalItems.forEach((item) => {
            const normalized = normalizePatternFormValue(item.value);
            const posTypes = (normalized.pos_types?.length ? normalized.pos_types : normalized.applicabilities?.map((app) => app.pos) || [])
                .filter((pos): pos is string => typeof pos === 'string' && pos.trim().length > 0);
            Array.from(new Set(posTypes)).forEach((pos) => {
                counts.set(pos, (counts.get(pos) || 0) + 1);
            });
        });

        return Array.from(counts.entries())
            .sort((a, b) => (posOrder.get(a[0]) ?? Number.MAX_SAFE_INTEGER) - (posOrder.get(b[0]) ?? Number.MAX_SAFE_INTEGER))
            .map(([pos, count]) => ({ pos, count }));
    }, [getCategoryItems]);

    const canonicalRoleShortcuts = useMemo(() => {
        const canonicalItems = getCategoryItems('cv_wizen_pattern');
        const preferredOrder = ['broken_pattern', 'sound_suffix', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern', 'cv_wizen_pattern'];
        const counts = new Map<string, number>();

        canonicalItems.forEach((item) => {
            const category = String(item.category || '').trim();
            if (!category) return;
            counts.set(category, (counts.get(category) || 0) + 1);
        });

        return Array.from(counts.entries())
            .sort((a, b) => {
                const indexA = preferredOrder.indexOf(a[0]);
                const indexB = preferredOrder.indexOf(b[0]);
                if (indexA !== -1 || indexB !== -1) {
                    return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
                }
                return a[0].localeCompare(b[0]);
            })
            .map(([role, count]) => ({ role, label: PATTERN_BUCKET_LABELS[role] || role, count }));
    }, [getCategoryItems]);

    const resolveCreateCategory = (category: AdminCategory | null, value: unknown) => {
        const fallback = category?.storageCategories?.[0] ?? activeTab;
        if (category?.id !== 'plural_pattern') return fallback;

        const patternValue = value as Record<string, unknown> | null;
        const cv = String(patternValue?.cv || '').trim();

        if (isDashMarkedSuffix(cv)) {
            return 'sound_suffix';
        }

        return 'broken_pattern';
    };

    const groupedCategories = useMemo(() => {
        const groups = new Map<AdminCategoryGroupId, AdminCategory[]>();

        sortedCategories.forEach((category) => {
            if (!groups.has(category.groupId)) groups.set(category.groupId, []);
            groups.get(category.groupId)?.push(category);
        });

        return Array.from(groups.entries())
            .sort((a, b) => ADMIN_CATEGORY_GROUPS[a[0]].order - ADMIN_CATEGORY_GROUPS[b[0]].order)
            .map(([groupId, categories]) => ({
                groupId,
                groupLabel: ADMIN_CATEGORY_GROUPS[groupId].label,
                categories,
            }));
    }, [sortedCategories]);

    const activeCategory = getCategoryById(activeTab);
    const activeCategoryLabel = activeCategory
        ? (activeCategory.id === 'root_relationship'
            ? t(activeCategory.label, term('etymological-relationships'))
            : t(activeCategory.label, term(activeCategory.label)))
        : activeTab;
    const currentItems = getCategoryItems(activeTab);

    const filteredItems = useMemo(() => {
        return filterSettingsItems(
            currentItems,
            { searchTerm, posFilter, roleFilter },
            activeCategory,
        );
    }, [activeCategory, currentItems, posFilter, roleFilter, searchTerm]);

    if (loading && config.length === 0) {
        return <div className="flex justify-center py-20"><Spinner /></div>;
    }

    const handleDelete = async (id: string, key: string) => {
        if (!confirm(`Are you sure you want to delete "${key}"?`)) return;
        try {
            await deleteItem(id);
        } catch (e: unknown) {
            alert(toErrorMessage(e));
        }
    };

    const summarizeRawError = (raw: string): string => {
        const trimmed = raw?.trim() || '';
        if (!trimmed) return '';
        const lower = trimmed.toLowerCase();
        if (!lower.startsWith('<!doctype html') && !lower.startsWith('<html')) {
            return trimmed;
        }

        try {
            const doc = new DOMParser().parseFromString(trimmed, 'text/html');
            const msgNode = doc.querySelector('#error-message span:last-child');
            const titleNode = doc.querySelector('#error-title');
            const text = msgNode?.textContent?.trim() || titleNode?.textContent?.trim() || '';
            return text ? `Server HTML error: ${text}` : 'Server returned an HTML error page (see dev API logs).';
        } catch {
            return 'Server returned an HTML error page (see dev API logs).';
        }
    };

    const buildErrorLines = (data: ApiData, raw: string, fallback: string): string[] => {
        const lines: string[] = [];
        if (data?.error) lines.push(String(data.error));
        else if (raw?.trim()) lines.push(summarizeRawError(raw));
        else lines.push(fallback);
        if (data?.code) lines.push(`Code: ${data.code}`);
        if (data?.upstream_status) lines.push(`Upstream status: ${data.upstream_status}`);
        if (data?.hint) lines.push(`Hint: ${data.hint}`);
        return lines;
    };

    const handleExportTerminology = async () => {
        setSyncLoading(true);
        try {
            const token = await getClerkToken();
            const res = await fetch('/api/admin/sync-terminology', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const raw = await res.text();
            const data = parseJsonObject(raw);

            if (!res.ok || data?.error) {
                throw new Error(buildErrorLines(data, raw, 'Export failed').join('\n'));
            }

            if (!data?.terminology || typeof data.terminology !== 'object') {
                throw new Error('Export response did not include a valid terminology object');
            }

            const tsSnippet = `export const TERMINOLOGY: Record<string, { en?: string; standard: string; arabised: string }> = ${JSON.stringify(data.terminology, null, 4)};`;
            const blob = new Blob([tsSnippet], { type: 'text/typescript' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'terminology_export.ts';
            link.click();
            URL.revokeObjectURL(url);
        } catch (e: unknown) {
            alert(`Export failed: ${toErrorMessage(e)}`);
        } finally {
            setSyncLoading(false);
        }
    };

    const handleImportTerminology = async () => {
        if (!confirm('This will upsert labels from the in-code TERMINOLOGY into the database. Existing database labels for these keys will be overwritten. Proceed?')) return;

        setSyncLoading(true);
        setSyncResult(null);
        try {
            const token = await getClerkToken();
            const res = await fetch('/api/admin/sync-terminology', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ terminology: TERMINOLOGY }),
            });
            const raw = await res.text();
            const data = parseJsonObject(raw);

            if (!res.ok || !data || data.error) {
                throw new Error(buildErrorLines(data, raw, 'Import failed').join('\n'));
            }

            const upserted = Number(data.upserted || 0);
            const errors = Array.isArray(data.errors) ? data.errors.map((item) => String(item)) : [];

            if (upserted === 0 && errors.length === 0) {
                throw new Error('Import returned 0 upserted rows. Check API connectivity and terminology payload.');
            }

            setSyncResult({ success: upserted, errors });
            if (upserted > 0) await refresh();
        } catch (e: unknown) {
            const message = toErrorMessage(e) || 'Import failed';
            setSyncResult({ errors: message.split('\n').map((line) => line.trim()).filter(Boolean) });
        } finally {
            setSyncLoading(false);
        }
    };

    const handleSyncPatterns = async () => {
        if (!confirm('This will scan all dictionary entries and add any new patterns to the registry. Proceed?')) return;

        setSyncLoading(true);
        setSyncResult(null);
        try {
            const token = await getClerkToken();
            const res = await fetch('/api/admin/migrate-patterns', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'sync-from-entries', commit: true }),
            });
            const raw = await res.text();
            const data = parseJsonObject(raw);

            if (!res.ok || !data || data.error) {
                throw new Error(buildErrorLines(data, raw, 'Sync failed').join('\n'));
            }

            const added = Number(data.added || 0);
            const errors = Array.isArray(data.errors) ? data.errors.map((item) => String(item)) : [];
            const skipped = Number(data.skipped || 0);

            if (errors.length > 0 && added === 0) {
                throw new Error(errors.join('\n'));
            }

            setSyncResult({ success: added, errors });
            if (added > 0 || skipped > 0) await refresh();
        } catch (e: unknown) {
            const message = toErrorMessage(e) || 'Sync failed';
            setSyncResult({ errors: message.split('\n').map((line) => line.trim()).filter(Boolean) });
        } finally {
            setSyncLoading(false);
        }
    };

    const handleDragStart = (id: string, e: React.DragEvent) => {
        setDraggedCatId(id);
        e.dataTransfer.effectAllowed = 'move';
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (targetId: string, e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedCatId || draggedCatId === targetId) return;

        const draggedCategory = getCategoryById(draggedCatId);
        const targetCategory = getCategoryById(targetId);
        if (!draggedCategory || !targetCategory || draggedCategory.groupId !== targetCategory.groupId) {
            return;
        }

        const newOrder = [...categoryOrder];
        const oldIndex = newOrder.indexOf(draggedCatId);
        const newIndex = newOrder.indexOf(targetId);
        if (oldIndex === -1 || newIndex === -1) return;

        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, draggedCatId);
        setCategoryOrder(newOrder);

        if (user) {
            try {
                await user.update({
                    unsafeMetadata: {
                        ...user.unsafeMetadata,
                        adminCategoryOrder: newOrder,
                    },
                });
            } catch (err) {
                console.error('Failed to save category order:', err);
            }
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedCatId(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const toggleGroup = (groupId: AdminCategoryGroupId) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [groupId]: !(prev[groupId] ?? true),
        }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <AdminSettingsSidebar
                groupedCategories={groupedCategories}
                expandedGroups={expandedGroups}
                onToggleGroup={toggleGroup}
                activeTab={activeTab}
                activePosFilter={posFilter}
                activeRoleFilter={roleFilter}
                draggedCatId={draggedCatId}
                onSelectCategory={setActiveTab}
                onSelectCanonicalPattern={(filters) => {
                    setActiveTab('cv_wizen_pattern');
                    setPosFilter(filters?.pos ?? 'all');
                    setRoleFilter(filters?.role ?? 'all');
                }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                getItemCount={(categoryId) => getCategoryItems(categoryId).length}
                canonicalPatternShortcuts={canonicalPatternShortcuts}
                canonicalRoleShortcuts={canonicalRoleShortcuts}
                language={language}
                setLanguage={setLanguage}
                mode={mode}
                setMode={setMode}
                t={t}
                term={term}
            />

            <section className="md:col-span-3 space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                        <Settings className="text-[#1034A6]" size={24} /> Admin Settings
                    </h2>
                </div>

                <AdminSettingsToolbar
                    activeCategory={activeCategory}
                    categoryLabel={activeCategoryLabel}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    posFilter={posFilter}
                    onPosFilterChange={setPosFilter}
                    roleFilter={roleFilter}
                    onRoleFilterChange={setRoleFilter}
                    posOptions={getCategoryItems('pos').map((item) => item.key)}
                    syncLoading={syncLoading}
                    loading={loading}
                    onRefresh={refresh}
                    onAdd={() => setShowAdd(true)}
                    onExportTerminology={handleExportTerminology}
                    onImportTerminology={handleImportTerminology}
                    onSyncPatterns={handleSyncPatterns}
                />

                {syncResult && (
                    <AdminSettingsSyncBanner result={syncResult} onClose={() => setSyncResult(null)} />
                )}

                <AdminSettingsItemList
                    items={filteredItems}
                    activeCategory={activeCategory}
                    onEdit={setEditItem}
                    onDelete={handleDelete}
                />

                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refresh}
                        disabled={loading || syncLoading}
                        leftIcon={<RotateCcw className={cn((loading || syncLoading) && 'animate-spin')} size={14} />}
                    >
                        Reload Data
                    </Button>
                </div>
            </section>

            {(showAdd || editItem) && (
                <ConfigFormModal
                    item={editItem}
                    category={activeTab}
                    onClose={() => {
                        setShowAdd(false);
                        setEditItem(null);
                    }}
                    onSave={async (val) => {
                        if (editItem) {
                            await updateItem({ ...editItem, ...val });
                        } else {
                            // Composite tabs (like plural patterns) display items from multiple
                            // storage categories, so new rows need to be written to a real
                            // underlying category instead of the logical tab id.
                            await createItem({ category: resolveCreateCategory(activeCategory, val.value), ...val });
                        }
                        setShowAdd(false);
                        setEditItem(null);
                    }}
                />
            )}
        </div>
    );
}
