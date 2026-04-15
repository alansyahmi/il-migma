import { Download, HelpCircle, Plus, RefreshCw, RotateCcw, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import type { AdminCategory } from '@/lib/adminCategoryRegistry';
import { cn } from '@/lib/utils';

interface AdminSettingsToolbarProps {
    activeCategory: AdminCategory | null;
    categoryLabel: string;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    posFilter: string;
    onPosFilterChange: (value: string) => void;
    roleFilter: string;
    onRoleFilterChange: (value: string) => void;
    posOptions: string[];
    syncLoading: boolean;
    loading: boolean;
    onRefresh: () => void;
    onAdd: () => void;
    onExportTerminology: () => void;
    onImportTerminology: () => void;
    onSyncPatterns: () => void;
}

export function AdminSettingsToolbar({
    activeCategory,
    categoryLabel,
    searchTerm,
    onSearchTermChange,
    posFilter,
    onPosFilterChange,
    roleFilter,
    onRoleFilterChange,
    posOptions,
    syncLoading,
    loading,
    onRefresh,
    onAdd,
    onExportTerminology,
    onImportTerminology,
    onSyncPatterns,
}: AdminSettingsToolbarProps) {
    const { term } = useLinguisticMode();
    const isPattern = activeCategory?.editorType === 'pattern';
    const hasPosFilter = Boolean(activeCategory?.hasPosFilter);
    const isUiTerminology = activeCategory?.id === 'ui_terminology';

    return (
        <div className="sticky top-2 z-10 bg-[#f7f6f3]/90 backdrop-blur border border-black/5 rounded-2xl p-3 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-black">{categoryLabel}</h2>

                <div className="flex items-center gap-2">
                    {isUiTerminology && (
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onExportTerminology}
                                disabled={syncLoading}
                                leftIcon={syncLoading ? <RotateCcw className="animate-spin" size={14} /> : <Download size={14} />}
                            >
                                {term('export-to-ts')}
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onImportTerminology}
                                disabled={syncLoading}
                                leftIcon={syncLoading ? <RotateCcw className="animate-spin" size={14} /> : <Upload size={14} />}
                            >
                                {term('import-from-source')}
                            </Button>
                        </div>
                    )}

                    {isPattern && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onSyncPatterns}
                        disabled={syncLoading}
                        leftIcon={<RotateCcw className={cn(syncLoading && 'animate-spin')} size={14} />}
                    >
                            {term('sync-from-entries')}
                        </Button>
                    )}

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onRefresh}
                        disabled={loading || syncLoading}
                        leftIcon={<RefreshCw className={cn((loading || syncLoading) && 'animate-spin')} size={14} />}
                    >
                        {term('refresh')}
                    </Button>
                    <Button size="sm" onClick={onAdd} leftIcon={<Plus size={14} />}>{term('add-new')}</Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-white border border-black/10 rounded-lg px-2 py-1 shadow-sm">
                    <Search size={14} className="text-black/30" />
                    <input
                        type="text"
                        placeholder={term('search-items')}
                        className="bg-transparent border-none text-xs focus:outline-none w-36 focus:w-56 transition-all"
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                    />
                </div>

                {isPattern && (
                    <select
                        className="bg-white border border-black/10 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        value={roleFilter}
                        onChange={(e) => onRoleFilterChange(e.target.value)}
                    >
                        <option value="all">{term('any-role')}</option>
                        <option value="broken_plural">{term('broken-plural')}</option>
                        <option value="sound_plural">{term('sound-plural')}</option>
                        <option value="feminine_singular">{term('feminine-singular')}</option>
                        <option value="diminutive">{term('diminutive')}</option>
                        <option value="elative">{term('elative')}</option>
                        <option value="verbal_noun">{term('verbal-noun')}</option>
                    </select>
                )}

                {hasPosFilter && (
                    <select
                        className="bg-white border border-black/10 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        value={posFilter}
                        onChange={(e) => onPosFilterChange(e.target.value)}
                    >
                        <option value="all">{term('all-pos-label')}</option>
                        {posOptions.map((option) => (
                            <option key={option} value={option}>{option.toUpperCase()}</option>
                        ))}
                    </select>
                )}
            </div>

            {import.meta.env.DEV && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                    <HelpCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-blue-800 leading-relaxed">
                        <p className="font-bold mb-1">{term('development-tip-sync-to-code')}</p>
                        <p>
                            To persist these changes in source code, update
                            {' '}
                            <code className="bg-blue-100 px-1 rounded">src/lib/terminology.ts</code>
                            {' '}
                            manually.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
