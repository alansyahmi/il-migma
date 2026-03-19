import { Tag, Users, Globe, Zap, ClipboardList, Package, Library, Settings, Puzzle, Palette, HelpCircle, Languages, Sparkles, type LucideIcon } from 'lucide-react';
import { normalizeGender } from './gender';
import { resolveTerm as resolveHardcodedTerm } from './terminology';

export type EditorType = 'simple_label' | 'pattern' | 'verb_preset' | 'ui_terminology';
export type ListStrategy = 'label_only' | 'pattern' | 'complex_object';

export interface AdminCategory {
    id: string;
    label: string;
    icon: LucideIcon;
    storageCategories: string[];
    editorType: EditorType;
    defaultValueFactory: () => any;
    listStrategy: ListStrategy;
    hasPosFilter?: boolean;
    transformValue?: (item: any) => any;
    transformOption?: (item: any, mode: 'standard' | 'arabised', lang: 'en' | 'mt') => { value: string, label: string } | null;
}

const DEFAULT_LABELS = { en: '', mt_standard: '', mt_arabised: '' };
const DEFAULT_PATTERN = { cv: '', wizen: '', stress: 2, pos_types: [], description: '', linguistic_role: '', gender: '' };

const defaultTransformOption = (item: any, mode: 'standard' | 'arabised', lang: 'en' | 'mt') => {
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
};

export const ADMIN_REGISTRY: Record<string, AdminCategory> = {
    pos: {
        id: 'pos',
        label: 'Parts of Speech',
        icon: Tag,
        storageCategories: ['pos'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    gender: {
        id: 'gender',
        label: 'Genders',
        icon: Users,
        storageCategories: ['gender'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
        transformOption: (item, mode, lang) => {
            const canonicalGender = normalizeGender(item.key);
            if (!canonicalGender) return null;
            const label = resolveHardcodedTerm(canonicalGender, mode, lang);
            return { value: canonicalGender, label };
        }
    },
    dialect: {
        id: 'dialect',
        label: 'Dialects',
        icon: Globe,
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
        storageCategories: ['verb_class'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    verb_transitivity: {
        id: 'verb_transitivity',
        label: 'Transitivity',
        icon: ClipboardList,
        storageCategories: ['verb_transitivity'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    register: {
        id: 'register',
        label: 'Registers',
        icon: ClipboardList,
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
        storageCategories: ['source_language'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    verb_preset: {
        id: 'verb_preset',
        label: 'Verb Presets',
        icon: Settings,
        storageCategories: ['verb_preset'],
        editorType: 'verb_preset',
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
    plural_pattern: {
        id: 'plural_pattern',
        label: 'Plural Patterns',
        icon: Puzzle,
        storageCategories: ['broken_pattern', 'sound_suffix'],
        editorType: 'pattern',
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    feminine_pattern: {
        id: 'feminine_pattern',
        label: 'Feminine Patterns',
        icon: Users,
        storageCategories: ['feminine_pattern'],
        editorType: 'pattern',
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    cv_wizen_pattern: {
        id: 'cv_wizen_pattern',
        label: 'Patterns',
        icon: Palette,
        storageCategories: ['cv_wizen_pattern'],
        editorType: 'pattern',
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    diminutive_pattern: {
        id: 'diminutive_pattern',
        label: 'Diminutive Patterns',
        icon: Sparkles,
        storageCategories: ['diminutive_pattern'],
        editorType: 'pattern',
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    adjective_pattern: {
        id: 'adjective_pattern',
        label: 'Adjective Patterns',
        icon: Palette,
        storageCategories: ['adjective_pattern'],
        editorType: 'pattern',
        defaultValueFactory: () => ({ ...DEFAULT_PATTERN }),
        listStrategy: 'pattern',
        hasPosFilter: true,
        transformValue: (i) => i.value,
    },
    verb_form: {
        id: 'verb_form',
        label: 'Verb Forms',
        icon: Settings,
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
        storageCategories: ['participle_nuance'],
        editorType: 'simple_label',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.key,
    },
    root_relationship: {
        id: 'root_relationship',
        label: 'Root Relationships',
        icon: Globe,
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
        storageCategories: ['ui_terminology'],
        editorType: 'ui_terminology',
        defaultValueFactory: () => ({ ...DEFAULT_LABELS }),
        listStrategy: 'label_only',
        transformValue: (i) => i.value,
    },
};

export const getCategoryById = (id: string) => ADMIN_REGISTRY[id] || null;

export const getRegistryOptions = (category: string, item: any, mode: 'standard' | 'arabised', lang: 'en' | 'mt') => {
    const reg = getCategoryById(category);
    if (reg?.transformOption) return reg.transformOption(item, mode, lang);
    return defaultTransformOption(item, mode, lang);
};

export const CATEGORIES = Object.values(ADMIN_REGISTRY);
