import { Tag, Users, Globe, Zap, ClipboardList, Package, Library, Settings, Puzzle, Palette, HelpCircle, Languages, Sparkles, type LucideIcon } from 'lucide-react';
import { normalizeGender } from './gender';
import { resolveTerm as resolveHardcodedTerm } from './terminology';

export type EditorType = 'simple_label' | 'pattern' | 'verb_preset' | 'ui_terminology';
export type ListStrategy = 'label_only' | 'pattern' | 'complex_object';
export type AdminCategoryGroupId = 'core_grammar' | 'patterns' | 'advanced' | 'ui_system';

export interface AdminCategoryGroup {
    id: AdminCategoryGroupId;
    label: string;
    order: number;
}

export const ADMIN_CATEGORY_GROUPS: Record<AdminCategoryGroupId, AdminCategoryGroup> = {
    core_grammar: { id: 'core_grammar', label: 'Core Grammar', order: 1 },
    patterns: { id: 'patterns', label: 'Patterns', order: 2 },
    advanced: { id: 'advanced', label: 'Advanced', order: 3 },
    ui_system: { id: 'ui_system', label: 'UI & System', order: 4 },
};

export interface AdminCategory {
    id: string;
    label: string;
    icon: LucideIcon;
    groupId: AdminCategoryGroupId;
    storageCategories: string[];
    editorType: EditorType;
    defaultValueFactory: () => unknown;
    listStrategy: ListStrategy;
    hasPosFilter?: boolean;
    visibleInSidebar?: boolean;
    transformValue?: (item: any) => unknown;
    transformOption?: (item: unknown, mode: 'standard' | 'arabised', lang: 'en' | 'mt') => { value: string, label: string } | null;
}

const DEFAULT_LABELS = { en: '', mt_standard: '', mt_arabised: '' };
const DEFAULT_PATTERN = { cv: '', wizen: '', stress: 2, pos_types: [], description: '', applicabilities: [] };

const titleCase = (value: string) => value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const defaultTransformOption = (item: unknown, mode: 'standard' | 'arabised', lang: 'en' | 'mt') => {
    const source = item as { key: string; value: unknown };
    const v = source.value as Record<string, string> | null;
    let label = source.key;
    if (v && typeof v === 'object') {
        if (lang === 'en') {
            label = v.en || source.key;
        } else if (mode === 'arabised') {
            label = v.mt_arabised || v.wizen || v.en || source.key;
        } else {
            label = v.mt_standard || v.cv || v.en || source.key;
        }
    }
    return { value: source.key, label };
};

export const ADMIN_REGISTRY: Record<string, AdminCategory> = {
    pos: {
        id: 'pos',
        label: 'Parts of Speech',
        icon: Tag,
        groupId: 'core_grammar',
        storageCategories: ['pos'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
        transformOption: (item, mode, lang) => {
            const source = item as { key: string };
            const label = resolveHardcodedTerm(source.key, mode, lang);
            return { value: source.key, label };
        }
    },
    gender: {
        id: 'gender',
        label: 'Genders',
        icon: Users,
        groupId: 'core_grammar',
        storageCategories: ['gender'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => normalizeGender(i.key) || i.key,
        transformOption: (item, mode, lang) => {
            const source = item as { key: string };
            const canonicalGender = normalizeGender(source.key);
            if (!canonicalGender) return null;
            const label = resolveHardcodedTerm(canonicalGender, mode, lang);
            return { value: canonicalGender, label };
        }
    },
    dialect: {
        id: 'dialect',
        label: 'Dialects',
        icon: Globe,
        groupId: 'core_grammar',
        storageCategories: ['dialect'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    verb_class: {
        id: 'verb_class',
        label: 'Verb Classes',
        icon: Zap,
        groupId: 'core_grammar',
        storageCategories: ['verb_class'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    register: {
        id: 'register',
        label: 'Registers',
        icon: ClipboardList,
        groupId: 'core_grammar',
        storageCategories: ['register'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    noun_type: {
        id: 'noun_type',
        label: 'Noun Types',
        icon: Package,
        groupId: 'core_grammar',
        storageCategories: ['noun_type'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    source_language: {
        id: 'source_language',
        label: 'Sources',
        icon: Library,
        groupId: 'core_grammar',
        storageCategories: ['source_language'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    numeral_type: {
        id: 'numeral_type',
        label: 'Numeral Types',
        icon: Tag,
        groupId: 'core_grammar',
        storageCategories: ['numeral_type'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
        transformOption: (item, mode, lang) => {
            const source = item as { key: string };
            const label = resolveHardcodedTerm(source.key, mode, lang);
            return { value: source.key, label: label === source.key ? titleCase(source.key) : label };
        },
    },
    verb_preset: {
        id: 'verb_preset',
        label: 'Verb Presets',
        icon: Settings,
        groupId: 'patterns',
        storageCategories: ['verb_preset'],
        editorType: 'verb_preset',
        visibleInSidebar: true,
        defaultValueFactory: () => ({
            en: '', mt_standard: '', mt_arabised: '',
            perfect: { cv: '', wizen: '' },
            passive: { cv: '', wizen: '' },
            active: { cv: '', wizen: '' },
            verbal: { cv: '', wizen: '' }
        }),
        listStrategy: 'complex_object',
        transformValue: (i) => ({ form: i.key, data: i.value }),
    },
    // Legacy storage buckets kept for backward compatibility with older rows.
    plural_pattern: {
        id: 'plural_pattern',
        label: 'Legacy Plural Bucket',
        icon: Puzzle,
        groupId: 'patterns',
        // Keep the historical `plural_pattern` bucket as a fallback so older rows
        // remain editable, while newer saves still land in the normalized tables.
        storageCategories: ['broken_pattern', 'sound_suffix', 'plural_pattern'],
        editorType: 'pattern',
        visibleInSidebar: false,
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    feminine_pattern: {
        id: 'feminine_pattern',
        label: 'Legacy Feminine Bucket',
        icon: Users,
        groupId: 'patterns',
        storageCategories: ['feminine_pattern'],
        editorType: 'pattern',
        visibleInSidebar: false,
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    cv_wizen_pattern: {
        id: 'cv_wizen_pattern',
        label: 'Canonical Patterns',
        icon: Palette,
        groupId: 'patterns',
        storageCategories: ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern', 'plural_pattern'],
        editorType: 'pattern',
        visibleInSidebar: true,
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    diminutive_pattern: {
        id: 'diminutive_pattern',
        label: 'Legacy Diminutive Bucket',
        icon: Sparkles,
        groupId: 'patterns',
        storageCategories: ['diminutive_pattern'],
        editorType: 'pattern',
        visibleInSidebar: false,
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    adjective_pattern: {
        id: 'adjective_pattern',
        label: 'Legacy Adjective Bucket',
        icon: Palette,
        groupId: 'patterns',
        storageCategories: ['adjective_pattern'],
        editorType: 'pattern',
        visibleInSidebar: false,
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    verb_form: {
        id: 'verb_form',
        label: 'Verb Forms',
        icon: Settings,
        groupId: 'core_grammar',
        storageCategories: ['verb_form'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    participle_nuance: {
        id: 'participle_nuance',
        label: 'Ptcp. Nuances',
        icon: Tag,
        groupId: 'advanced',
        storageCategories: ['participle_nuance'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    root_relationship: {
        id: 'root_relationship',
        label: 'Etymological Relationships',
        icon: Globe,
        groupId: 'advanced',
        storageCategories: ['root_relationship'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    root_strength: {
        id: 'root_strength',
        label: 'Root Strengths',
        icon: Zap,
        groupId: 'advanced',
        storageCategories: ['root_strength'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    weak_class: {
        id: 'weak_class',
        label: 'Weak Classes',
        icon: HelpCircle,
        groupId: 'advanced',
        storageCategories: ['weak_class'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    ui_terminology: {
        id: 'ui_terminology',
        label: 'UI Terminology',
        icon: Languages,
        groupId: 'ui_system',
        storageCategories: ['ui_terminology'],
        editorType: 'ui_terminology',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.value,
    },
};

export const getCategoryById = (id: string) => ADMIN_REGISTRY[id] || null;

export const getRegistryOptions = (category: string, item: unknown, mode: 'standard' | 'arabised', lang: 'en' | 'mt') => {
    const reg = getCategoryById(category);
    if (reg?.transformOption) return reg.transformOption(item, mode, lang);
    return defaultTransformOption(item, mode, lang);
};

export const CATEGORIES = Object.values(ADMIN_REGISTRY);
export const SIDEBAR_CATEGORIES = CATEGORIES.filter((category) => category.visibleInSidebar !== false);
