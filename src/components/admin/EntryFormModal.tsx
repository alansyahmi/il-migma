import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, RotateCcw, Plus, Keyboard } from 'lucide-react';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminCreateEntry, adminUpdateEntry, apiLookupRootByConsonants } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { generateRootForms } from '@/lib/conjugationEngine';
import type { WeakClass } from '@/types';
import { useAdminConfig } from '@/lib/adminConfig';
import { RelationshipEditor } from './RelationshipEditor';
import { buildEntryPayload, ENTRY_HANDLED_FIELDS } from '@/lib/adminSchema';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { generateIPA, deriveFeminineFromPattern, deriveMasculineFromFeminine, detectPluralType, derivePattern, extractLongVowelFromPattern } from '@/lib/maltesePhonology';

export interface AdminEntry {
    id: string;
    headword: string;
    pos: string;
    noun_gender?: string;
    verb_class?: string;
    is_loanword: boolean;
    source_language?: string;
    created_at: string;
    text_en?: string;
    verb_vowel_perf?: string;
    verb_vowel_impf?: string;
    verb_transitivity?: string;
    root_consonants?: string;
    verb_form?: string;
    tags?: string | string[];
}

export interface EntryFormModalProps {
    entry: AdminEntry | null;
    onClose: () => void;
    onSaved: () => void;
    getToken: () => Promise<string | null>;
    initialForm?: Partial<typeof INITIAL_FORM_STATE>;
}

const INITIAL_FORM_STATE = {
    id: '',
    headword: '',
    pos: 'noun',
    noun_gender: '',
    noun_singular: '',
    noun_plural_forms: '',  // comma-separated
    noun_sound_plural: '',
    noun_dual: '',
    noun_type: '',
    verb_class: '',
    verb_transitivity: '',
    verb_perfective_3sgm: '',
    verb_imperfective_3sgm: '',
    verb_verbal_noun: '',
    verb_vowel_perf: '',
    verb_vowel_impf: '',
    verb_vowel_impv: '',
    verb_active_ptcp: '',
    verb_passive_ptcp: '',
    adj_masculine: '',
    adj_feminine: '',
    adj_plural: '',
    adj_comparative: '',
    adj_gender: '' as 'masculine' | 'feminine' | '',
    participle_type: '' as 'active' | 'passive' | '',
    is_loanword: false,
    source_language: '',
    definitions: [
        { text_en: '', text_mt: '', register: '' }
    ],
    etymology_chain: [] as { language: string; form: string; meaning: string }[],
    phonetics: [] as { dialect: string; spelling: string; ipa: string }[],
    tags: '',
    _formLabel: '',
    _rootConsonants: '',
    _weakClass: '',
    _hasDual: false,
    _pluralType: 'none',
    _adjPluralType: 'none',
    cv_pattern: '',
    plural_pattern: '',
    sound_suffix: '',
    _sound_suffix: '',
    _adj_sound_suffix: '',
    adj_pattern: '',
    noun_feminine: '',
    noun_masculine: '',
    synonyms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    antonyms: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
    related_entries: [] as { id: string; headword: string; gloss_en: string; gloss_mt: string }[],
};

// ── Verb CV pattern lookup ────────────────────────────────────────────────
// Returns the canonical CV notation for a verb's lemma (perfect 3sg.m) based
// on its derivation form and morphological class.
function getVerbCvSuggestion(form: string, verbClass: string): { cv: string; wizen: string } | null {
    const cls = verbClass.toLowerCase();
    const isWeak = cls === 'weak';
    const isHollow = cls === 'hollow';
    const isDefective = cls === 'defective';
    const isGeminated = cls === 'doubled' || cls === 'geminated';

    switch (form) {
        case 'I':
            if (isHollow) return { cv: 'CâC', wizen: 'fâl' };
            if (isDefective) return { cv: 'CvCa', wizen: 'fagħa' };
            if (isGeminated) return { cv: 'CvCC', wizen: 'fall' };
            if (isWeak) return { cv: 'CvCvC', wizen: 'wagħal' };
            return { cv: 'CvCvC', wizen: 'fagħal' };
        case 'II':
            if (isDefective) return { cv: 'CvCCa', wizen: 'fagħgħa' };
            return { cv: 'CvCCvC', wizen: 'fagħgħal' };
        case 'III':
            if (isDefective) return { cv: 'CâCa', wizen: 'fâgħa' };
            return { cv: 'CâCvC', wizen: 'fâgħal' };
        case 'IV':
            return { cv: 'aCvCvC', wizen: 'akbar' };
        case 'V':
            if (isDefective) return { cv: 'tCvCCa', wizen: 'tfagħgħa' };
            return { cv: 'tCvCCvC', wizen: 'tfagħgħal' };
        case 'VI':
            if (isDefective) return { cv: 'tCâCa', wizen: 'tfâgħa' };
            return { cv: 'tCâCvC', wizen: 'tfâgħal' };
        case 'VII':
            return { cv: 'nCvCvC', wizen: 'nfagħal' };
        case 'VIII':
            return { cv: 'CtCvCvC', wizen: 'ftagħal' };
        case 'IX':
            return { cv: 'CCâC', wizen: 'fgħâl' };
        case 'X':
        case 'Xa':
            return { cv: 'stvCCvC', wizen: 'stafgħal' };
        case 'Xb':
            return { cv: 'stCvCCvC', wizen: 'stfagħgħal' };
        default:
            return null;
    }
}

function ResetButton({ onClick, title = "Reset" }: { onClick: () => void, title?: string }) {
    return (
        <button type="button" onClick={onClick} className="text-slate-400 hover:text-[#1034A6] transition-colors" title={title}>
            <RotateCcw size={14} />
        </button>
    );
}

function MorphologyPresetSelector({
    options,
    onSelect,
    currentValue,
    highlightValue,
    label = "Presets"
}: {
    options: { label: string; value: string; sub?: string }[];
    onSelect: (val: string) => void;
    currentValue?: string;
    highlightValue?: string | null;
    label?: string;
}) {
    return (
        <div className="mt-2">
            <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1.5 block">{label}</label>
            <div className="flex flex-wrap gap-1.5">
                {options.map(opt => {
                    const isSelected = currentValue === opt.value;
                    const isSuggested = !isSelected && highlightValue === opt.value;
                    return (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => onSelect(opt.value)}
                            className={cn(
                                'px-2 py-0.5 text-[10px] rounded border transition-all',
                                isSelected ? 'bg-[#1034A6] text-white border-[#1034A6]' :
                                    isSuggested ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-300' :
                                        'bg-white text-black/60 border-black/10 hover:border-black/30'
                            )}
                            title={isSuggested ? 'Suggested based on headword + root' : undefined}
                        >
                            {opt.label} {opt.sub && <span className="opacity-50 ml-1 font-normal">({opt.sub})</span>}
                            {isSuggested && <span className="ml-1 text-blue-400">✦</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function EntryFormModal({ entry, onClose, onSaved, getToken, initialForm }: EntryFormModalProps) {
    const { getValues, getOptions } = useAdminConfig();
    const { mode, term } = useLinguisticMode();
    const { language, t } = useLanguage();

    // Dynamic options from admin config
    const POS_OPTIONS = useMemo(() => getOptions('pos', mode, language), [getOptions, mode, language]);
    const DIALECT_OPTIONS = useMemo(() => getOptions('dialect', mode, language), [getOptions, mode, language]);
    const GENDER_OPTIONS = useMemo(() => getOptions('gender', mode, language), [getOptions, mode, language]);
    const VERB_CLASS_OPTIONS = useMemo(() => getOptions('verb_class', mode, language), [getOptions, mode, language]);
    const REGISTER_OPTIONS = useMemo(() => getOptions('register', mode, language), [getOptions, mode, language]);
    const NOUN_TYPE_OPTIONS = useMemo(() => getOptions('noun_type', mode, language), [getOptions, mode, language]);
    const SOUND_SUFFIXES = getValues('sound_suffix');
    const VERB_PRESETS_LIST = getValues('verb_preset');
    const VERB_FORM_OPTIONS = getValues('verb_form');
    const CV_WIZEN_PATTERNS = getValues('cv_wizen_pattern');
    const BROKEN_PATTERNS = getValues('broken_pattern');
    const PARTICIPLE_NUANCES = useMemo(() => getOptions('participle_nuance', mode, language), [getOptions, mode, language]);
    const VERB_TRANSITIVITY_OPTIONS = useMemo(() => getOptions('verb_transitivity', mode, language), [getOptions, mode, language]);
    const PARTICIPLE_TYPES = useMemo(() => getOptions('participle_type', mode, language), [getOptions, mode, language]);



    const nounPatterns = useMemo(() => {
        return BROKEN_PATTERNS.filter((p: any) =>
            !p.pos_types || p.pos_types.length === 0 || p.pos_types.includes('noun')
        ).map((p: any) => ({
            label: mode === 'standard' ? p.cv : p.wizen,
            value: p.cv,
            sub: mode === 'standard' ? p.wizen : p.cv
        }));
    }, [BROKEN_PATTERNS, mode]);

    const adjPatterns = useMemo(() => {
        return BROKEN_PATTERNS.filter((p: any) =>
            !p.pos_types || p.pos_types.length === 0 || p.pos_types.includes('adjective')
        ).map((p: any) => ({
            label: mode === 'standard' ? p.cv : p.wizen,
            value: p.cv,
            sub: mode === 'standard' ? p.wizen : p.cv
        }));
    }, [BROKEN_PATTERNS, mode]);

    // Convert verb presets list to the Record format used by the component
    const VERB_PRESETS = useMemo(() => {
        const map: Record<string, any> = {};
        VERB_PRESETS_LIST.forEach((p: any) => {
            map[p.form] = p.data;
        });
        return map;
    }, [VERB_PRESETS_LIST]);

    const isEdit = Boolean(entry);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isLoadingFull, setIsLoadingFull] = useState(isEdit);
    const [originalForm, setOriginalForm] = useState<any>(null);
    const [idExists, setIdExists] = useState<boolean | null>(null);
    const [suggestedId, setSuggestedId] = useState('');
    const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

    const [kbOpen, setKbOpen] = useState(false);
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const kbTriggerRef = useRef<HTMLButtonElement>(null);
    const activeInputRef = useRef<HTMLInputElement>(null);

    const insertChar = (char: string) => {
        if (!activeInput || !activeInputRef.current) return;
        const el = activeInputRef.current;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;

        setForm((prev: any) => {
            const currentVal = prev[activeInput] || '';
            const newVal = currentVal.substring(0, start) + char + currentVal.substring(end);
            return {
                ...prev,
                [activeInput]: newVal
            };
        });

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + char.length, start + char.length);
        }, 0);
    };

    const [form, setForm] = useState({
        ...INITIAL_FORM_STATE,
        id: entry?.id ?? initialForm?.id ?? '',
        headword: entry?.headword ?? initialForm?.headword ?? '',
        pos: entry?.pos ?? initialForm?.pos ?? 'noun',
        noun_gender: (entry as any)?.noun_gender ?? initialForm?.noun_gender ?? '',
        noun_singular: (entry as any)?.noun_singular ?? initialForm?.noun_singular ?? '',
        verb_class: (entry as any)?.verb_class ?? (entry as any)?.verb_morphology?.verb_class ?? initialForm?.verb_class ?? '',
        _weakClass: (entry as any)?.verb_weak_class ?? (entry as any)?.weak_class ?? (entry as any)?.verb_morphology?.weak_class ?? initialForm?._weakClass ?? '',
        _formLabel: (entry as any)?.verb_form ?? (entry as any)?.verb_morphology?.form ?? initialForm?._formLabel ?? '',
        verb_vowel_perf: (entry as any)?.verb_vowel_perf ?? (entry as any)?.verb_morphology?.vowel_set_perf ?? initialForm?.verb_vowel_perf ?? '',
        verb_vowel_impf: (entry as any)?.verb_vowel_impf ?? (entry as any)?.verb_morphology?.vowel_set_impf ?? initialForm?.verb_vowel_impf ?? '',
        verb_vowel_impv: (entry as any)?.verb_vowel_impv ?? (entry as any)?.verb_morphology?.vowel_set_imperative ?? initialForm?.verb_vowel_impv ?? '',
        is_loanword: entry?.is_loanword ?? initialForm?.is_loanword ?? false,
        source_language: entry?.source_language ?? initialForm?.source_language ?? '',
        tags: Array.isArray((entry as any)?.tags) ? (entry as any).tags.join(', ') : ((entry as any)?.tags ?? initialForm?.tags ?? ''),
        _rootConsonants: (entry as any)?._rootConsonants ?? (entry as any)?.root_pattern_form?.root?.consonants ?? (entry as any)?.root_consonants ?? initialForm?._rootConsonants ?? '',
        _hasDual: !!((entry as any)?.noun_dual ?? initialForm?.noun_dual ?? false),
        cv_pattern: (entry as any)?.cv_pattern ?? initialForm?.cv_pattern ?? '',
        plural_pattern: (entry as any)?.plural_pattern ?? initialForm?.plural_pattern ?? '',
        sound_suffix: (entry as any)?.sound_suffix ?? initialForm?.sound_suffix ?? '',
        adj_pattern: (entry as any)?.adj_pattern ?? initialForm?.adj_pattern ?? '',
        noun_feminine: (entry as any)?.noun_feminine ?? initialForm?.noun_feminine ?? '',
        noun_masculine: (entry as any)?.noun_masculine ?? initialForm?.noun_masculine ?? '',
        _pluralType: (((entry as any)?.noun_plural_forms?.length > 0) || !!initialForm?.noun_plural_forms) && ((entry as any)?.noun_sound_plural || !!initialForm?.noun_sound_plural) ? 'both' :
            (((entry as any)?.noun_plural_forms?.length > 0) || !!initialForm?.noun_plural_forms) ? 'broken' :
                (((entry as any)?.noun_sound_plural) || !!initialForm?.noun_sound_plural) ? 'sound' : 'none',
        _adjPluralType: (((entry as any)?.adj_plural?.length > 0) || !!initialForm?.adj_plural) ? (entry as any)?.adj_pattern ? 'broken' : 'sound' : 'none',
        noun_type: (entry as any)?.noun_type ?? initialForm?.noun_type ?? '',
        definitions: (entry as any)?.definitions ?? [
            { text_en: (entry as any)?.text_en ?? '', text_mt: '', register: '' }
        ],
        synonyms: (entry as any)?.verb_morphology?.synonyms ?? initialForm?.synonyms ?? [],
        antonyms: (entry as any)?.verb_morphology?.antonyms ?? initialForm?.antonyms ?? [],
        related_entries: (entry as any)?.verb_morphology?.related_entries ?? initialForm?.related_entries ?? [],
        ...initialForm
    });

    const isDirty = useMemo(() => {
        if (!originalForm) return false;
        // Simple JSON comparison for dirty check
        return JSON.stringify(form) !== JSON.stringify(originalForm);
    }, [form, originalForm]);

    // Initialize original form for dirty tracking
    useEffect(() => {
        if (!originalForm && !isLoadingFull) {
            setOriginalForm(form);
        }
    }, [form, originalForm, isLoadingFull]);

    useEffect(() => {
        if (isEdit && entry?.id) {
            setIsLoadingFull(true);
            import('@/lib/api').then(({ apiGetEntry }) => {
                apiGetEntry(entry.id)
                    .then(res => {
                        if (res?.entry) {
                            const full = res.entry as any;
                            setForm(prev => ({
                                ...prev,
                                participle_type: full.participle_type || prev.participle_type,
                                definitions: full.definitions?.length ? full.definitions : prev.definitions,
                                tags: Array.isArray(full.tags) ? full.tags.join(', ') : full.tags || prev.tags,
                                noun_plural_forms: Array.isArray(full.noun_plural_forms) ? full.noun_plural_forms.join(', ') : full.noun_plural_forms || prev.noun_plural_forms,
                                _rootConsonants: full.resolved_root_consonants || full.root_consonants || prev._rootConsonants,
                                _formLabel: full.verb_form || full.verb_morphology?.form || prev._formLabel,
                                verb_class: full.verb_class || full.verb_morphology?.verb_class || prev.verb_class,
                                _weakClass: full.verb_weak_class || full.weak_class || full.verb_morphology?.weak_class || prev._weakClass,
                                verb_vowel_perf: full.verb_vowel_perf || full.verb_morphology?.vowel_set_perf || prev.verb_vowel_perf,
                                verb_vowel_impf: full.verb_vowel_impf || full.verb_morphology?.vowel_set_impf || prev.verb_vowel_impf,
                                verb_vowel_impv: full.verb_vowel_impv || full.verb_morphology?.vowel_set_imperative || prev.verb_vowel_impv,
                                verb_transitivity: full.verb_transitivity || full.verb_morphology?.transitivity || prev.verb_transitivity,
                                verb_perfective_3sgm: full.verb_perfective_3sgm || full.verb_morphology?.perfective_3sg_m || prev.verb_perfective_3sgm,
                                verb_imperfective_3sgm: full.verb_imperfective_3sgm || full.verb_morphology?.imperfective_3sg_m || prev.verb_imperfective_3sgm,
                                verb_verbal_noun: full.verb_verbal_noun || full.verb_morphology?.verbal_noun || prev.verb_verbal_noun,
                                verb_active_ptcp: full.verb_active_ptcp || full.verb_morphology?.active_participle || prev.verb_active_ptcp,
                                verb_passive_ptcp: full.verb_passive_ptcp || full.verb_morphology?.passive_participle || prev.verb_passive_ptcp,
                                noun_gender: full.noun_gender || full.noun_morphology?.gender || prev.noun_gender,
                                noun_singular: full.noun_singular || full.noun_morphology?.singular || prev.noun_singular,
                                noun_sound_plural: full.noun_sound_plural || full.noun_morphology?.sound_plural || prev.noun_sound_plural,
                                noun_dual: full.noun_dual || full.noun_morphology?.dual || prev.noun_dual,
                                adj_masculine: full.adj_masculine || full.adjective_morphology?.masculine || prev.adj_masculine,
                                adj_feminine: full.adj_feminine || full.adjective_morphology?.feminine || prev.adj_feminine,
                                adj_plural: full.adj_plural || full.adjective_morphology?.plural || prev.adj_plural,
                                is_loanword: typeof full.is_loanword === 'boolean' ? full.is_loanword : prev.is_loanword,
                                source_language: full.source_language || prev.source_language,
                                phonetics: full.phonetics?.length ? full.phonetics : prev.phonetics,
                                etymology_chain: full.etymologies?.[0]?.chain?.length ? full.etymologies[0].chain : prev.etymology_chain,
                                noun_type: full.noun_type || prev.noun_type,
                                cv_pattern: full.cv_pattern || prev.cv_pattern,
                                plural_pattern: full.plural_pattern || prev.plural_pattern,
                                sound_suffix: full.sound_suffix || prev.sound_suffix,
                                adj_pattern: full.adj_pattern || prev.adj_pattern,
                                noun_feminine: full.noun_feminine || prev.noun_feminine,
                                noun_masculine: full.noun_masculine || full.noun_morphology?.masculine || prev.noun_masculine,
                                synonyms: full.synonyms || full.verb_morphology?.synonyms || prev.synonyms || [],
                                antonyms: full.antonyms || full.verb_morphology?.antonyms || prev.antonyms || [],
                                related_entries: full.related_entries || full.verb_morphology?.related_entries || prev.related_entries || [],
                                _hasDual: !!(full.noun_dual || full.noun_morphology?.dual),
                                _pluralType: (full.noun_plural_forms?.length || full.noun_morphology?.plural_forms?.length) && (full.noun_sound_plural || full.noun_morphology?.sound_plural) ? 'both'
                                    : (full.noun_plural_forms?.length || full.noun_morphology?.plural_forms?.length) ? 'broken'
                                        : (full.noun_sound_plural || full.noun_morphology?.sound_plural) ? 'sound'
                                            : 'none',
                                _adjPluralType: full.adj_plural ? (full.adj_pattern ? 'broken' : 'sound') : 'none',
                            }));
                            setOriginalForm(JSON.parse(JSON.stringify(form))); // Clone for baseline
                        }
                    })
                    .catch(() => { })
                    .finally(() => setIsLoadingFull(false));
            });
        }
    }, [isEdit, entry?.id]);

    // ── AUTOMATION: Auto-ID Suggestion ──────────────────────────────────────
    useEffect(() => {
        if (isEdit || !form.headword || !form.pos) {
            setSuggestedId('');
            return;
        }

        const POS_MAP: Record<string, string> = {
            verb: 'v', noun: 'n', adjective: 'adj', adverb: 'adv',
            preposition: 'prep', conjunction: 'conj', particle: 'part',
            article: 'art', pronoun: 'pron', numeral: 'num'
        };

        const suffix = POS_MAP[form.pos] || 'entry';
        const safeHeadword = form.headword.toLowerCase()
        //.replace(/ħ/g, 'h') // Explicitly handle Latin crossed h
        //.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        //.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        const newId = `${suffix}-${safeHeadword}`;
        setSuggestedId(newId);
    }, [form.pos, form.headword, isEdit]);

    // ── AUTOMATION: ID Existence Check ──────────────────────────────────────
    useEffect(() => {
        if (!form.id || form.id === entry?.id) {
            setIdExists(null);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const token = await getToken();
                const { adminCheckIdExists } = await import('@/lib/api');
                const res = await adminCheckIdExists(token!, 'entries', form.id);
                setIdExists(res.exists);
            } catch { }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.id, getToken, entry?.id]);

    // ── AUTOMATION: Root Metadata Inheritance ───────────────────────────────
    useEffect(() => {
        const rootStr = form._rootConsonants.trim();
        if (!rootStr) return;

        const timer = setTimeout(async () => {
            try {
                const root = await apiLookupRootByConsonants(rootStr);
                if (root) {
                    const rootStrength = root.strength?.toLowerCase();
                    let suggestedClass = '';
                    if (rootStrength === 'strong') suggestedClass = 'strong';
                    else if (rootStrength === 'weak') suggestedClass = 'weak';
                    else if (rootStrength === 'geminated') suggestedClass = 'doubled';

                    setForm(prev => {
                        const next = { ...prev };
                        let hasChanges = false;
                        const newFilled = new Set(autoFilledFields);

                        if (suggestedClass && !prev.verb_class) {
                            next.verb_class = suggestedClass;
                            newFilled.add('verb_class');
                            hasChanges = true;
                        }

                        if (root.weak_class && !prev._weakClass) {
                            next._weakClass = root.weak_class;
                            newFilled.add('_weakClass');
                            hasChanges = true;
                        }

                        if (hasChanges) {
                            setTimeout(() => setAutoFilledFields(newFilled), 0);
                        }
                        return next;
                    });
                }
            } catch (err) {
                console.error('Failed to lookup root for auto-fill:', err);
            }
        }, 1000); // Debounce lookup

        return () => clearTimeout(timer);
    }, [form._rootConsonants, autoFilledFields]);

    // Reset auto-filled status when POS changes
    useEffect(() => {
        if (autoFilledFields.size > 0) {
            setAutoFilledFields(new Set());
        }
    }, [form.pos]);

    // Filtered patterns based on LIVE POS
    const filteredPatterns = useMemo(() => {
        return CV_WIZEN_PATTERNS.filter((p: any) =>
            !p.pos_types || p.pos_types.length === 0 || p.pos_types.includes(form.pos)
        ).map((p: any) => ({
            label: mode === 'standard' ? p.cv : p.wizen,
            value: p.cv,
            sub: mode === 'standard' ? p.wizen : p.cv,
            stress: p.stress as number | undefined,
        }));
    }, [CV_WIZEN_PATTERNS, form.pos, mode]);

    // ── AUTOMATION: Smart Defaults ──────────────────────────────────────────
    useEffect(() => {
        if (form.headword && (form.pos === 'noun' || form.pos === 'adjective' || form.pos === 'participle')) {
            setForm(prev => ({
                ...prev,
                // Adjective gender auto-fill: set the appropriate field from headword
                adj_masculine: (prev.pos === 'adjective' || prev.pos === 'participle')
                    ? (prev.adj_gender === 'masculine' ? prev.headword : (prev.adj_masculine || prev.headword))
                    : prev.adj_masculine,
                adj_feminine: (prev.pos === 'adjective' || prev.pos === 'participle') && prev.adj_gender === 'feminine'
                    ? prev.headword
                    : prev.adj_feminine,
            }));
        }
    }, [form.headword, form.pos, form.adj_gender]);

    // ── AUTOMATION: Pattern Auto-Suggest (from headword + root) ─────────────
    const suggestedPattern = useMemo(() => {
        if (!form.headword || !form._rootConsonants) return null;
        return derivePattern(form.headword, form._rootConsonants);
    }, [form.headword, form._rootConsonants]);

    // ── AUTOMATION: Broken Plural Pattern Auto-Suggest ───────────────────────
    const suggestedBrokenPattern = useMemo(() => {
        if (!form.noun_plural_forms || !form._rootConsonants) return null;
        // Use first comma-separated value
        const firstPlural = form.noun_plural_forms.split(',')[0].trim();
        if (!firstPlural) return null;
        return derivePattern(firstPlural, form._rootConsonants);
    }, [form.noun_plural_forms, form._rootConsonants]);

    // ── AUTOMATION: Feminine Suggestion ─────────────────────────────────────
    const suggestedFeminine = useMemo(() => {
        const isMasc = form.pos === 'noun'
            ? form.noun_gender === 'masculine'
            : (form.pos === 'adjective' || form.pos === 'participle') && form.adj_gender !== 'feminine';
        if (!form.headword || !isMasc) return null;
        if (form.pos !== 'noun' && form.pos !== 'adjective' && form.pos !== 'participle') return null;
        const base = form.adj_masculine || form.noun_singular || form.headword;
        return deriveFeminineFromPattern(form.cv_pattern, base);
    }, [form.headword, form.cv_pattern, form.pos, form.noun_gender, form.adj_gender, form.adj_masculine, form.noun_singular]);

    // ── AUTOMATION: Masculine Suggestion (for feminine adj/nouns) ────────────
    const suggestedMasculine = useMemo(() => {
        const isFem = form.pos === 'noun'
            ? form.noun_gender === 'feminine'
            : (form.pos === 'adjective' || form.pos === 'participle') && form.adj_gender === 'feminine';
        if (!form.headword || !isFem) return null;
        return deriveMasculineFromFeminine(form.headword);
    }, [form.headword, form.pos, form.noun_gender, form.adj_gender]);

    // ── AUTOMATION: IPA Suggestion ──────────────────────────────────────────
    const suggestedIPA = useMemo(() => {
        if (!form.headword || form.phonetics.some(p => p.dialect === 'Standard' && p.ipa)) return null;
        // Look up stress position and long vowel marker from selected pattern
        const patternData = CV_WIZEN_PATTERNS.find((p: any) => p.cv === form.cv_pattern);
        const stressOverride = patternData?.stress as number | undefined;
        // 'V' (uppercase) in the cv notation marks which vowel is long
        const patternToExtract = patternData?.cv || form.cv_pattern;
        const longVowelIdx = patternToExtract ? extractLongVowelFromPattern(patternToExtract as string) : undefined;
        return generateIPA(form.headword, stressOverride, longVowelIdx);
    }, [form.headword, form.phonetics, form.cv_pattern, CV_WIZEN_PATTERNS]);


    // ── AUTOMATION: Plural Type Suggestion ──────────────────────────────────
    const pluralSuggestion = useMemo(() => {
        if (!form.headword || form._pluralType !== 'none') return null;
        return detectPluralType(form.headword, SOUND_SUFFIXES);
    }, [form.headword, form._pluralType, SOUND_SUFFIXES]);

    // ── AUTOMATION: Invariable Tagging ──────────────────────────────────────
    useEffect(() => {
        if (!form.headword) return;

        let isInvariable = false;
        if (form.pos === 'adjective') {
            const hasFem = form.adj_feminine && form.adj_feminine !== '';
            const hasPlur = form.adj_plural && form.adj_plural !== '';
            if (hasFem && hasPlur && form.adj_masculine === form.headword && form.adj_feminine === form.headword && form.adj_plural === form.headword) {
                isInvariable = true;
            }
        } else if (form.pos === 'noun') {
            const hasPlur = (form.noun_plural_forms || form.noun_sound_plural) ? true : false;
            if (hasPlur && form.noun_singular === form.headword && (form.noun_plural_forms === form.headword || form.noun_sound_plural === form.headword)) {
                isInvariable = true;
            }
        }

        if (isInvariable) {
            const tags = form.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
            if (!tags.includes('Invariable')) {
                set('tags', [...tags, 'Invariable'].join(', '));
            }
        }

        // Diminutive tagging
        const isDim = form.headword.includes('ejj') || form.headword.includes('ajj') || form.cv_pattern === 'CCvjjvC';
        if (isDim) {
            const tags = form.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
            if (!tags.includes('Diminutive')) {
                set('tags', [...tags, 'Diminutive'].join(', '));
            }
        }
    }, [form.headword, form.pos, form.adj_masculine, form.adj_feminine, form.adj_plural, form.noun_singular, form.noun_plural_forms, form.noun_sound_plural, form.cv_pattern]);

    const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

    // Context-aware CV pattern suggestion for verbs
    const verbCvSuggestion = useMemo(() => {
        if (form.pos !== 'verb' && form.pos !== 'participle') return null;
        if (!form._formLabel) return null;
        return getVerbCvSuggestion(form._formLabel, form.verb_class || 'strong');
    }, [form.pos, form._formLabel, form.verb_class]);

    const suggestionDiffersFromCurrent = verbCvSuggestion && form.cv_pattern !== verbCvSuggestion.cv;

    const moveDefinition = (index: number, direction: 'up' | 'down') => {
        const next = [...form.definitions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return;
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        set('definitions', next);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.headword.trim()) {
            setError(t('Headword is required', 'Mamma meħtieġa'));
            return;
        }
        setSaving(true);
        setError('');
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const payload = buildEntryPayload(form);
            if (isEdit && entry) {
                payload.id = form.id;
                payload.old_id = entry.id;
            }

            if (isEdit && entry) {
                await adminUpdateEntry(token, payload);
            } else {
                const res = await adminCreateEntry(token, payload);
                // Feedback for auto-suffixed ID
                if (res && (res as any).id && (res as any).id !== payload.id && payload.id) {
                    alert(`${t('Duplicate ID handled:', 'ID duplikata ġiet immaniġġjata:')} ${payload.id} -> ${(res as any).id}`);
                }
            }

            onSaved();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const conjugationPreview = useMemo(() => {
        if (form.pos !== 'verb' || !form._rootConsonants || !form.verb_vowel_perf || !form.verb_vowel_impf) return null;
        if (!form.verb_vowel_perf.includes('-') || !form.verb_vowel_impf.includes('-')) return null;

        try {
            const forms = generateRootForms(
                form._rootConsonants,
                form.verb_vowel_perf,
                form.verb_vowel_impf,
                form.verb_class === 'strong' ? 'strong' : 'weak',
                form._weakClass as WeakClass
            );
            return forms.find((f: any) => f.form === (form._formLabel || 'I')) || null;
        } catch (err) {
            console.error(err);
            return null;
        }

    }, [form.pos, form._rootConsonants, form._formLabel, form.verb_class, form._weakClass, form.verb_vowel_perf, form.verb_vowel_impf]);

    const handleApplyDerivedTerms = () => {
        if (!conjugationPreview) return;
        const ptcpPass = conjugationPreview.passiveParticiple || '';
        const ptcpAct = conjugationPreview.activeParticiple || '';
        const vn = conjugationPreview.verbalNoun || '';
        setForm((f: any) => ({
            ...f,
            verb_verbal_noun: f.verb_verbal_noun || (vn !== '-' ? vn : ''),
            verb_passive_ptcp: f.verb_passive_ptcp || (ptcpPass !== '-' ? ptcpPass : ''),
            verb_active_ptcp: f.verb_active_ptcp || (ptcpAct !== '-' ? ptcpAct : '')
        }));
    };

    const inp = "w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black";
    const sel = inp + " cursor-pointer";
    const label = "block text-xs font-semibold text-black uppercase tracking-wider mb-1";

    const handleClose = () => {
        if (isDirty) {
            if (!confirm(t('You have unsaved changes. Are you sure you want to close?', 'Għandek tibdil mhux merfugħ. Żgur li trid tagħlaq?'))) {
                return;
            }
        }
        onClose();
    };

    return (
        <Modal
            open={true}
            onClose={handleClose}
            title={isEdit ? t('Edit Entry', 'Editja l-Entrata') : t('New Entry', 'Entrata Ġdida')}
            size="xl"
        >
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2 space-y-8 p-1">
                    {isLoadingFull && (
                        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 text-red-800 border border-red-200 rounded px-3 py-2 text-sm">
                            {error}
                        </div>
                    )}

                    {/* ── CORE FIELDS ──────────────────────────────────────────────── */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5 md:col-span-1">
                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest flex items-center justify-between">
                                {t('Entry ID', 'ID tal-Entrata')}
                                {idExists === true && <span className="text-red-500 lowercase font-normal italic">{t('already exists', 'diġà teżisti')}</span>}
                                {idExists === false && <span className="text-green-600 lowercase font-normal italic">{t('available', 'disponibbli')}</span>}
                            </label>
                            <input
                                value={form.id}
                                onChange={e => setForm({ ...form, id: e.target.value })}
                                className={cn(
                                    "w-full p-2 bg-white border rounded-lg text-sm transition-all font-mono",
                                    idExists === true ? "border-red-500 ring-1 ring-red-500/20" : "border-black/10 focus:border-[#1034A6]"
                                )}
                                placeholder="e.g. v-fagħal"
                            />
                            {suggestedId && form.id !== suggestedId && (
                                <button
                                    onClick={() => setForm({ ...form, id: suggestedId })}
                                    className="mt-1 text-[9px] font-bold text-[#1034A6] hover:underline flex items-center gap-1 uppercase tracking-tighter"
                                >
                                    <Plus size={10} /> {t('Suggest:', 'Suġġeriment:')} {suggestedId}
                                </button>
                            )}
                        </div>
                        <div className="space-y-1.5 md:col-span-1">
                            <label className={label}>{t('Headword', 'Mamma')} *</label>
                            <input className={inp} value={form.headword} onChange={e => set('headword', e.target.value)} required />
                        </div>
                        <div className="space-y-1.5 md:col-span-1">
                            <label className={label}>POS *</label>
                            <select className={sel} value={form.pos} onChange={e => set('pos', e.target.value)}>
                                {POS_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 md:col-span-1">
                            <div className="flex items-center justify-between mb-1">
                                <label className={label + " mb-0"}>{t('Root Consonants', 'Għerq')}</label>
                                <ResetButton onClick={() => set('_rootConsonants', (entry as any)?._rootConsonants ?? (entry as any)?.root_pattern_form?.root?.consonants ?? (entry as any)?.root_consonants ?? initialForm?._rootConsonants ?? '')} title={t('Reset to original', 'Irrisettja')} />
                            </div>
                            <input className={inp} value={form._rootConsonants || ''} onChange={e => set('_rootConsonants', e.target.value)} placeholder="e.g. k-t-b" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className={label}>{t('CV Pattern / Wiżen', 'Mudell (Wiżen)')}</label>
                            <div className="flex gap-2 relative">
                                <input
                                    className={cn(inp, "flex-1")}
                                    value={form.cv_pattern || ''}
                                    onChange={e => set('cv_pattern', e.target.value)}
                                    onFocus={(e) => {
                                        setActiveInput('cv_pattern');
                                        activeInputRef.current = e.target;
                                    }}
                                    placeholder="e.g. Fagħal or CCvC"
                                />
                                <button
                                    ref={kbTriggerRef}
                                    type="button"
                                    onClick={() => setKbOpen(!kbOpen)}
                                    className={cn(
                                        "px-3 border border-black/10 rounded-lg transition-colors shrink-0",
                                        kbOpen ? "bg-[#1034A6] text-white border-[#1034A6]" : "bg-white text-black/40 hover:text-black/60 hover:bg-black/5"
                                    )}
                                >
                                    <Keyboard size={16} />
                                </button>
                                <MalteseCharPicker
                                    open={kbOpen}
                                    onOpenChange={setKbOpen}
                                    onInsert={insertChar}
                                    triggerRef={kbTriggerRef}
                                />
                            </div>

                            {/* Context-Aware suggestion banner */}
                            {suggestionDiffersFromCurrent && (
                                <div className="mt-1.5 flex items-center gap-2 px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-md">
                                    <span className="text-[10px] text-blue-700 font-mono font-bold shrink-0">
                                        {verbCvSuggestion!.cv}
                                    </span>
                                    <span className="text-[10px] text-blue-500 shrink-0">({verbCvSuggestion!.wizen})</span>
                                    <span className="text-[10px] text-blue-400 flex-1">{t('suggested for Form', 'suġġerit għal Forma')} {form._formLabel} {form.verb_class}</span>
                                    <button
                                        type="button"
                                        onClick={() => set('cv_pattern', verbCvSuggestion!.cv)}
                                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 px-2 py-0.5 bg-blue-100 hover:bg-blue-200 rounded transition-colors shrink-0"
                                    >
                                        {t('Apply', 'Applika')}
                                    </button>
                                </div>
                            )}

                            {/* Generic/Filtered Presets */}
                            <MorphologyPresetSelector
                                label={t('Pattern Presets', 'Mudelli Presets')}
                                currentValue={form.cv_pattern}
                                highlightValue={suggestedPattern}
                                onSelect={(val) => set('cv_pattern', val)}
                                options={filteredPatterns}
                            />

                            {/* Verb Presets based on Form */}
                            {form._formLabel && (form.pos === 'verb' || form.pos === 'participle' || (form.pos === 'noun' && form.noun_type === 'verbal')) && (
                                <MorphologyPresetSelector
                                    label={t('Verb Presets', 'Mudelli tal-Verbi')}
                                    currentValue={form.cv_pattern}
                                    onSelect={(val) => set('cv_pattern', val)}
                                    options={[
                                        ...(verbCvSuggestion ? [{ label: t('Base Pattern', 'Mudell Bażi'), value: verbCvSuggestion.cv, sub: verbCvSuggestion.wizen }] : []),
                                        { label: t('Perfect', 'Perfett'), value: VERB_PRESETS[form._formLabel]?.perfect?.cv, sub: VERB_PRESETS[form._formLabel]?.perfect?.wizen },
                                        { label: t('Passive Participle', 'Partiċipju Passiv'), value: VERB_PRESETS[form._formLabel]?.passive?.cv, sub: VERB_PRESETS[form._formLabel]?.passive?.wizen },
                                        { label: t('Active Participle', 'Partiċipju Attiv'), value: VERB_PRESETS[form._formLabel]?.active?.cv, sub: VERB_PRESETS[form._formLabel]?.active?.wizen },
                                        { label: t('Verbal Noun', 'Nom Verb'), value: VERB_PRESETS[form._formLabel]?.verbal?.cv, sub: VERB_PRESETS[form._formLabel]?.verbal?.wizen },
                                    ].filter(o => o.value)}
                                />
                            )}
                        </div>
                    </section>

                    {/* Tags, Strength */}
                    <div className="space-y-4">

                        <div>
                            <label className={label}>{t('Tags (comma separated)', 'Tikketti (separati bil-virgola)')}</label>
                            <input className={inp} value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. archaic, dialectal" />
                        </div>
                    </div>

                    {/* Phonetics & Dialects Builder */}
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <legend className="text-xs font-semibold text-black uppercase tracking-tight">{t('Phonetics & Dialects', 'Fonetika u Djaletti')}</legend>
                            <div className="flex items-center gap-2">
                                {suggestedIPA && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const standard = form.phonetics.findIndex(p => p.dialect === 'Standard');
                                            if (standard !== -1) {
                                                const next = [...form.phonetics];
                                                next[standard].ipa = suggestedIPA;
                                                set('phonetics', next);
                                            } else {
                                                set('phonetics', [...form.phonetics, { dialect: 'Standard', spelling: '', ipa: suggestedIPA }]);
                                            }
                                        }}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-[10px] font-bold text-blue-700 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                    >
                                        <Sparkles size={10} /> {t('Suggest IPA:', 'Suġġerixxi IPA:')} {suggestedIPA}
                                    </button>
                                )}
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                                    onClick={() => set('phonetics', [...form.phonetics, { dialect: 'Standard', spelling: '', ipa: '' }])}>
                                    + {t('Add Variant', 'Żid Varjant')}
                                </Button>
                            </div>
                        </div>

                        {form.phonetics.map((ph: any, i: number) => (
                            <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                <div className="flex-1 w-full sm:w-1/4">
                                    {i === 0 && <label className={label}>{term('dialect')}</label>}
                                    <select className={sel} value={ph.dialect} onChange={e => {
                                        const next = [...form.phonetics];
                                        next[i].dialect = e.target.value;
                                        set('phonetics', next);
                                    }}>
                                        {DIALECT_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1 w-1/4">
                                    {i === 0 && <label className={label}>{t('Spelling', 'Kitba')}</label>}
                                    <input className={inp} value={ph.spelling} placeholder={form.headword || "Headword"} onChange={e => {
                                        const next = [...form.phonetics];
                                        next[i].spelling = e.target.value;
                                        set('phonetics', next);
                                    }} />
                                </div>
                                <div className="flex-1 w-full sm:w-2/4">
                                    {i === 0 && <label className={label}>{t('IPA', 'IPA')}</label>}
                                    <input className={inp} value={ph.ipa} placeholder="/ˈkɪtɛp/" onChange={e => {
                                        const next = [...form.phonetics];
                                        next[i].ipa = e.target.value;
                                        set('phonetics', next);
                                    }} />
                                </div>
                                <button type="button" onClick={() => set('phonetics', form.phonetics.filter((_: any, idx: number) => idx !== i))}
                                    className="mb-2 text-slate-400 hover:text-red-500 px-1 shrink-0">
                                    &times;
                                </button>
                            </div>
                        ))}
                    </fieldset>

                    {/* Noun fields */}
                    {form.pos === 'noun' && (
                        <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-4">
                            <legend className="text-xs font-semibold text-black px-2">{term('noun')}</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={label}>{term('gender')}</label>
                                    <select className={sel} value={form.noun_gender} onChange={e => set('noun_gender', e.target.value)}>
                                        <option value="">—</option>
                                        {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                    </select>
                                </div>
                                {form.noun_gender === 'masculine' && (
                                    <div>
                                        <label className={label}>{t('Feminine Form', 'Femminil')}</label>
                                        <input className={inp} value={form.noun_feminine} onChange={e => set('noun_feminine', e.target.value)} placeholder={t('e.g. għalliema', 'eż. għalliema')} />
                                    </div>
                                )}
                                {form.noun_gender === 'feminine' && (
                                    <div>
                                        <label className={label}>{t('Masculine Form', 'Maskil')}</label>
                                        <input className={inp} value={form.noun_masculine} onChange={e => set('noun_masculine', e.target.value)} placeholder={t('e.g. għalliem', 'eż. għalliem')} />
                                    </div>
                                )}
                                <div>
                                    <label className={label}>{term('noun type')}</label>
                                    <select className={sel} value={form.noun_type} onChange={e => set('noun_type', e.target.value)}>
                                        <option value="">—</option>
                                        {NOUN_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                {/* Feminine Suggestion Banner */}
                                {suggestedFeminine && (form.pos === 'noun' && !form.noun_feminine) && (
                                    <div className="mt-1.5 flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-100 rounded-md">
                                        <Sparkles size={12} className="text-purple-600" />
                                        <span className="text-[10px] text-purple-700 flex-1">{t('Suggested feminine:', 'Femminil suġġerit:')} <strong className="font-bold">{suggestedFeminine}</strong></span>
                                        <button
                                            type="button"
                                            onClick={() => set('noun_feminine', suggestedFeminine)}
                                            className="text-[10px] font-bold text-purple-700 hover:text-purple-900 px-2 py-0.5 bg-purple-100 hover:bg-purple-200 rounded transition-colors shrink-0"
                                        >
                                            {t('Apply', 'Applika')}
                                        </button>
                                    </div>
                                )}
                                {/* Masculine Suggestion Banner */}
                                {suggestedMasculine && (form.pos === 'noun' && form.noun_gender === 'feminine' && !form.noun_masculine) && (
                                    <div className="mt-1.5 flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-100 rounded-md">
                                        <Sparkles size={12} className="text-purple-600" />
                                        <span className="text-[10px] text-purple-700 flex-1">{t('Suggested masculine:', 'Maskil suġġerit:')} <strong className="font-bold">{suggestedMasculine}</strong></span>
                                        <button
                                            type="button"
                                            onClick={() => set('noun_masculine', suggestedMasculine)}
                                            className="text-[10px] font-bold text-purple-700 hover:text-purple-900 px-2 py-0.5 bg-purple-100 hover:bg-purple-200 rounded transition-colors shrink-0"
                                        >
                                            {t('Apply', 'Applika')}
                                        </button>
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <label className={label}>{t('Form Association', 'Assoċjazzjoni mal-Forma')}</label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {(VERB_FORM_OPTIONS.length > 0 ? VERB_FORM_OPTIONS : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Xa', 'Xb']).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => set('_formLabel', form._formLabel === f ? '' : f)}
                                                className={`px-3 py-1 text-[10px] uppercase font-bold rounded border transition-all ${form._formLabel === f
                                                    ? 'bg-[#1034A6] text-white border-[#1034A6]'
                                                    : 'bg-white text-black/40 border-black/10 hover:border-black/20'
                                                    }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Singular removed: headword is the singular form */}

                                <div className="col-span-2">
                                    <label className={label}>{t('Plural Type', 'Tip ta\' Plural')}</label>
                                    <div className="flex gap-1.5 mb-2">
                                        {['none', 'sound', 'broken', 'both'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    setForm(f => {
                                                        const next = { ...f, _pluralType: type };
                                                        if (type === 'none') {
                                                            next.noun_plural_forms = '';
                                                            next.noun_sound_plural = '';
                                                        } else if (type === 'sound') {
                                                            next.noun_plural_forms = '';
                                                        } else if (type === 'broken') {
                                                            next.noun_sound_plural = '';
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${form._pluralType === type ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm' : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20'}`}
                                            >
                                                {type === 'none' ? t('None', 'Xejn') :
                                                    type === 'sound' ? t('Sound', 'Sħiħ') :
                                                        type === 'broken' ? t('Broken', 'Miksur') :
                                                            t('Both', 'It-Tnejn')}
                                            </button>
                                        ))}
                                    </div>
                                    {pluralSuggestion && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <Badge className="text-[9px] py-0 border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1">
                                                <Sparkles size={8} /> {t('Likely', 'Probabbli')}: {pluralSuggestion.type.toUpperCase()}
                                            </Badge>
                                            <button
                                                type="button"
                                                onClick={() => set('_pluralType', pluralSuggestion.type)}
                                                className="text-[9px] font-bold text-[#1034A6] hover:underline uppercase"
                                            >
                                                {t('Apply', 'Applika')}
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                        {(form._pluralType === 'broken' || form._pluralType === 'both') && (
                                            <div>
                                                <label className={label}>{t('Broken Plural (comma-separated)', 'Plural Miksur (separati bil-virgola)')}</label>
                                                <input className={inp} value={form.noun_plural_forms}
                                                    onChange={e => set('noun_plural_forms', e.target.value)} placeholder={t('e.g. kotba, ktieb', 'eż. kotba, ktieb')} />

                                                <MorphologyPresetSelector
                                                    label={t('Broken Plural Pattern', 'Mudell tal-Plural Miksur')}
                                                    currentValue={form.plural_pattern}
                                                    highlightValue={suggestedBrokenPattern}
                                                    onSelect={(val) => set('plural_pattern', val)}
                                                    options={nounPatterns}
                                                />
                                            </div>
                                        )}
                                        {(form._pluralType === 'sound' || form._pluralType === 'both') && (
                                            <div>
                                                <label className={label}>{t('Sound Plural', 'Plural Sħiħ')}</label>
                                                <input className={inp} value={form.noun_sound_plural} onChange={e => set('noun_sound_plural', e.target.value)} placeholder={t('e.g. tfajliet', 'eż. tfajliet')} />

                                                <MorphologyPresetSelector
                                                    label={t('Suffix', 'Suffiss')}
                                                    currentValue={form._sound_suffix || ''}
                                                    onSelect={(val) => {
                                                        set('_sound_suffix', val);
                                                        if (form.headword) {
                                                            set('noun_sound_plural', form.headword + val);
                                                        }
                                                    }}
                                                    options={SOUND_SUFFIXES.map(s => ({
                                                        label: s.startsWith('-') ? term(s) : `-${term(s)}`,
                                                        value: s
                                                    }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className={label}>{term('dual')}</label>
                                    <div className="flex gap-1.5 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, _hasDual: false, noun_dual: '' }))}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${!form._hasDual ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm' : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20'}`}
                                        >
                                            {t('None', 'Xejn')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => set('_hasDual', true)}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${form._hasDual ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm' : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20'}`}
                                        >
                                            {t('Exists', 'Eżistenti')}
                                        </button>
                                    </div>
                                    {form._hasDual && (
                                        <input className={inp} value={form.noun_dual} onChange={e => set('noun_dual', e.target.value)} placeholder={t('e.g. sentejn', 'eż. sentejn')} />
                                    )}
                                </div>
                            </div>
                        </fieldset>
                    )}

                    {/* Verb fields */}
                    {form.pos === 'verb' && (
                        <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                            <legend className="text-xs font-semibold text-black px-2 text-black">{term('verb')}</legend>

                            <div className="mb-4">
                                <label className={label}>{t('Form (Stem)', 'Forma (Zokk)')}</label>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {(VERB_FORM_OPTIONS.length > 0 ? VERB_FORM_OPTIONS : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Xa', 'Xb']).map(f => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => set('_formLabel', form._formLabel === f ? '' : f)}
                                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form._formLabel === f
                                                ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm'
                                                : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20 text-black'
                                                }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={label}>{t('Class', 'Klassi')}</label>
                                    <select className={sel} value={form.verb_class} onChange={e => {
                                        set('verb_class', e.target.value);
                                        // Clear subclass when no longer weak
                                        if (e.target.value !== 'weak') set('_weakClass', '');

                                        if (autoFilledFields.has('verb_class')) {
                                            const next = new Set(autoFilledFields);
                                            next.delete('verb_class');
                                            setAutoFilledFields(next);
                                        }
                                    }}>
                                        <option value="">—</option>
                                        {VERB_CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                    {autoFilledFields.has('verb_class') && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-500 animate-pulse">
                                            <span>✦</span>
                                            <span>{t('Inherited from root', 'Miret mill-għerq')}</span>
                                            <button
                                                type="button"
                                                className="ml-1 hover:text-blue-700 underline"
                                                onClick={() => {
                                                    set('verb_class', '');
                                                    const next = new Set(autoFilledFields);
                                                    next.delete('verb_class');
                                                    setAutoFilledFields(next);
                                                }}
                                            >
                                                {t('reset', 'irrisettja')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {form.verb_class === 'weak' && (
                                    <div>
                                        <label className={label}>{t('Subclass', 'Sottoklassi')}</label>
                                        <div className="flex gap-1.5 mt-1">
                                            {(['assimilative', 'hollow', 'defective'] as const).map(sub => (
                                                <button
                                                    key={sub}
                                                    type="button"
                                                    onClick={() => {
                                                        set('_weakClass', form._weakClass === sub ? '' : sub);
                                                        if (autoFilledFields.has('_weakClass')) {
                                                            const next = new Set(autoFilledFields);
                                                            next.delete('_weakClass');
                                                            setAutoFilledFields(next);
                                                        }
                                                    }}
                                                    className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg border transition-all capitalize ${form._weakClass === sub
                                                        ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm'
                                                        : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20'
                                                        }`}
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {autoFilledFields.has('_weakClass') && (
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-500 animate-pulse col-span-2">
                                        <span>✦</span>
                                        <span>{t('Subclass inherited from root', 'Sottoklassi mirtet mill-għerq')}</span>
                                        <button
                                            type="button"
                                            className="ml-1 hover:text-blue-700 underline"
                                            onClick={() => {
                                                set('_weakClass', '');
                                                const next = new Set(autoFilledFields);
                                                next.delete('_weakClass');
                                                setAutoFilledFields(next);
                                            }}
                                        >
                                            {t('reset', 'irrisettja')}
                                        </button>
                                    </div>
                                )}
                                <div>
                                    <label className={label}>{t('Perfect Vowels', 'Vokali - Perfett')}</label>
                                    <input className={inp} value={form.verb_vowel_perf}
                                        placeholder="e.g. a-a"
                                        onChange={e => set('verb_vowel_perf', e.target.value)} />
                                </div>
                                <div>
                                    <label className={label}>{t('Imperfect Vowels', 'Vokali - Imperfett')}</label>
                                    <input className={inp} value={form.verb_vowel_impf}
                                        placeholder="e.g. i-a"
                                        onChange={e => set('verb_vowel_impf', e.target.value)} />
                                </div>
                                <div>
                                    <label className={label}>{t('Imperative Vowels', 'Vokali - Imperattiv')}</label>
                                    <input className={inp} value={form.verb_vowel_impv}
                                        placeholder="e.g. i-a"
                                        onChange={e => set('verb_vowel_impv', e.target.value)} />
                                </div>
                                <div>
                                    <label className={label}>{t('Transitivity', term('Tranżittività'))}</label>
                                    <select className={sel} value={form.verb_transitivity} onChange={e => {
                                        set('verb_transitivity', e.target.value);
                                        if (autoFilledFields.has('verb_transitivity')) {
                                            const next = new Set(autoFilledFields);
                                            next.delete('verb_transitivity');
                                            setAutoFilledFields(next);
                                        }
                                    }}>
                                        <option value="">—</option>
                                        {VERB_TRANSITIVITY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {conjugationPreview && (
                                <div className="mt-4 p-3 bg-blue-50/50 rounded border border-blue-100/50">
                                    <legend className="text-xs font-semibold text-blue-900 mb-2">{t('Auto-Generated Preview', 'Dehra Minn Qabel (Magna)')}</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-arabic">
                                        <div>
                                            <span className="text-xs text-blue-800/60 uppercase block mb-1">Perfect (3sg.m)</span>
                                            <strong>{conjugationPreview.perfect !== '-' ? conjugationPreview.perfect : 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-xs text-blue-800/60 uppercase block mb-1">Imperfect (3sg.m)</span>
                                            <strong>{conjugationPreview.imperfect !== '-' ? conjugationPreview.imperfect : 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-xs text-blue-800/60 uppercase block mb-1">Verbal Noun</span>
                                            <strong>{conjugationPreview.verbalNoun !== '-' ? conjugationPreview.verbalNoun : 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-xs text-blue-800/60 uppercase block mb-1">Participles</span>
                                            <strong>{conjugationPreview.activeParticiple !== '-' ? conjugationPreview.activeParticiple : 'N/A'} (Act), {conjugationPreview.passiveParticiple !== '-' ? conjugationPreview.passiveParticiple : 'N/A'} (Pass)</strong>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        <Button type="button" variant="ghost" size="sm" onClick={handleApplyDerivedTerms}>
                                            {t('Auto-Fill Derived Terms', 'Mela Traskrizzjonijiet Derivati')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </fieldset>
                    )}

                    {/* Adjective fields */}
                    {form.pos === 'adjective' && (
                        <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                            <legend className="text-xs font-semibold text-black px-2 text-black">{term('adjective')}</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Gender — determines which field is auto-filled from headword */}
                                <div>
                                    <label className={label}>{term('gender')}</label>
                                    <select className={sel} value={form.adj_gender} onChange={e => set('adj_gender', e.target.value as 'masculine' | 'feminine' | '')}>
                                        <option value="">—</option>
                                        {GENDER_OPTIONS.filter(g => g.value !== 'neutral').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                    </select>
                                </div>
                                {/* Comparative */}
                                <div>
                                    <label className={label}>{t('Comparative', 'Komparattiv')}</label>
                                    <input className={inp} value={form.adj_comparative} onChange={e => set('adj_comparative', e.target.value)} placeholder={t('e.g. akbar', 'eż. akbar')} />
                                </div>
                                {/* Masculine — shown as auto-filled when gender=masculine, or editable override when gender=feminine */}
                                {(form.adj_gender === 'masculine' || !form.adj_gender) && (
                                    <div>
                                        <label className={label}>{t('Masculine Form', 'Maskil')}</label>
                                        <input className={inp} value={form.adj_masculine} onChange={e => set('adj_masculine', e.target.value)} placeholder={form.headword} />
                                    </div>
                                )}
                                {form.adj_gender === 'feminine' && (
                                    <div>
                                        <label className={label}>{t('Masculine Form', 'Maskil')}</label>
                                        <input className={inp} value={form.adj_masculine} onChange={e => set('adj_masculine', e.target.value)} placeholder={t('e.g. kbir', 'eż. kbir')} />
                                    </div>
                                )}
                                {/* Feminine */}
                                {(form.adj_gender === 'masculine' || !form.adj_gender) && (
                                    <div>
                                        <label className={label}>{t('Feminine Form', 'Femminil')}</label>
                                        <input className={inp} value={form.adj_feminine} onChange={e => set('adj_feminine', e.target.value)} placeholder={t('e.g. kbira', 'eż. kbira')} />
                                    </div>
                                )}
                                {form.adj_gender === 'feminine' && (
                                    <div>
                                        <label className={label}>{t('Feminine Form', 'Femminil')}</label>
                                        <input className={inp} value={form.adj_feminine} onChange={e => set('adj_feminine', e.target.value)} placeholder={form.headword} />
                                    </div>
                                )}
                                {/* Plural */}
                                <div>
                                    <label className={label}>{term('plural')}</label>
                                    <input className={inp} value={form.adj_plural} onChange={e => set('adj_plural', e.target.value)} />
                                </div>
                            </div>

                            {/* Feminine suggestion (when masculine) */}
                            {suggestedFeminine && form.adj_gender !== 'feminine' && !form.adj_feminine && (
                                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-100 rounded-md">
                                    <Sparkles size={12} className="text-purple-600" />
                                    <span className="text-[10px] text-purple-700 flex-1">{t('Suggested feminine:', 'Femminil suġġerit:')} <strong>{suggestedFeminine}</strong></span>
                                    <button type="button" onClick={() => set('adj_feminine', suggestedFeminine)}
                                        className="text-[10px] font-bold text-purple-700 hover:text-purple-900 px-2 py-0.5 bg-purple-100 hover:bg-purple-200 rounded shrink-0">
                                        {t('Apply', 'Applika')}
                                    </button>
                                </div>
                            )}
                            {/* Masculine suggestion (when feminine) */}
                            {suggestedMasculine && form.adj_gender === 'feminine' && !form.adj_masculine && (
                                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-100 rounded-md">
                                    <Sparkles size={12} className="text-purple-600" />
                                    <span className="text-[10px] text-purple-700 flex-1">{t('Suggested masculine:', 'Maskil suġġerit:')} <strong>{suggestedMasculine}</strong></span>
                                    <button type="button" onClick={() => set('adj_masculine', suggestedMasculine)}
                                        className="text-[10px] font-bold text-purple-700 hover:text-purple-900 px-2 py-0.5 bg-purple-100 hover:bg-purple-200 rounded shrink-0">
                                        {t('Apply', 'Applika')}
                                    </button>
                                </div>
                            )}

                            <div className="mt-4">
                                <label className={label}>{t('Plural Type', 'Tip ta\' Plural')}</label>
                                <div className="flex gap-1.5 mb-2">
                                    {['none', 'sound', 'broken'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => {
                                                setForm(f => {
                                                    const next = { ...f, _adjPluralType: type };
                                                    if (type === 'none') {
                                                        next.adj_plural = '';
                                                        next.adj_pattern = '';
                                                        next.sound_suffix = '';
                                                    } else if (type === 'sound') {
                                                        next.adj_pattern = '';
                                                    } else if (type === 'broken') {
                                                        next.sound_suffix = '';
                                                    }
                                                    return next;
                                                });
                                            }}
                                            className={cn(
                                                "px-3 py-1 text-xs font-semibold rounded-lg border transition-colors",
                                                form._adjPluralType === type ? "bg-[#1034A6] text-white border-[#1034A6] shadow-sm" : "bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20"
                                            )}
                                        >
                                            {type === 'none' ? t('None', 'Xejn') : type === 'sound' ? t('Sound', 'Sħiħ') : t('Broken', 'Miksur')}
                                        </button>
                                    ))}
                                </div>

                                {form._adjPluralType === 'broken' && (
                                    <div className="mt-3">
                                        <MorphologyPresetSelector
                                            label={t('Broken Plural Pattern', 'Mudell tal-Plural Miksur')}
                                            currentValue={form.adj_pattern}
                                            highlightValue={suggestedBrokenPattern}
                                            onSelect={(val) => {
                                                set('adj_pattern', val);
                                                const pattern = CV_WIZEN_PATTERNS.find((p: any) => p.cv === val);
                                                if (pattern && !form.cv_pattern) {
                                                    set('cv_pattern', pattern.cv);
                                                }
                                            }}
                                            options={adjPatterns}
                                        />
                                    </div>
                                )}

                                {form._adjPluralType === 'sound' && (
                                    <div className="mt-3">
                                        <MorphologyPresetSelector
                                            label={t('Sound Plural Suffix', 'Suffiss tal-Plural Sħiħ')}
                                            currentValue={form.sound_suffix}
                                            onSelect={(val) => {
                                                set('sound_suffix', val);
                                                // Always auto-fill: headword + suffix
                                                if (form.headword) {
                                                    set('adj_plural', form.headword + val);
                                                }
                                            }}
                                            options={SOUND_SUFFIXES.map(s => ({ label: `-${s}`, value: s }))}
                                        />
                                        <MorphologyPresetSelector
                                            label={t('Suffix', 'Suffiss')}
                                            currentValue={form._adj_sound_suffix || ''}
                                            onSelect={(val) => {
                                                set('_adj_sound_suffix', val);
                                                if (form.headword) {
                                                    set('adj_sound_plural', form.headword + val);
                                                }
                                            }}
                                            options={SOUND_SUFFIXES.map(s => ({
                                                label: s.startsWith('-') ? term(s) : `-${term(s)}`,
                                                value: s
                                            }))}
                                        />
                                    </div>
                                )}
                            </div>
                        </fieldset>
                    )}

                    {/* Participle fields */}
                    {form.pos === 'participle' && (
                        <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                            <legend className="text-xs font-semibold text-black px-2 text-black">{t('Participle', 'Partiċipju')}</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className={label + " mb-0"}>{t('Type', 'Tip')}</label>
                                        <ResetButton onClick={() => set('participle_type', (entry as any)?.participle_type ?? initialForm?.participle_type ?? '')} title={t('Reset to original', 'Irrisettja')} />
                                    </div>
                                    <select className={sel} value={form.participle_type} onChange={e => set('participle_type', e.target.value)}>
                                        <option value="">—</option>
                                        {PARTICIPLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={label}>{t('Feminine Form', 'Femminil')}</label>
                                    <input className={inp} value={form.adj_feminine} onChange={e => set('adj_feminine', e.target.value)} placeholder={t('e.g. miktuba', 'eż. miktuba')} />
                                </div>
                                <div>
                                    <label className={label}>{t('Plural Form', 'Plural')}</label>
                                    <input className={inp} value={form.adj_plural} onChange={e => set('adj_plural', e.target.value)} placeholder={t('e.g. miktubin', 'eż. miktubin')} />
                                </div>
                                <div>
                                    <label className={label}>{t('Form Association', 'Assoċjazzjoni mal-Forma')}</label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {(VERB_FORM_OPTIONS.length > 0 ? VERB_FORM_OPTIONS : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Xa', 'Xb']).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => set('_formLabel', form._formLabel === f ? '' : f)}
                                                className={`px-3 py-1 text-[10px] uppercase font-bold rounded border transition-all ${form._formLabel === f
                                                    ? 'bg-[#1034A6] text-white border-[#1034A6]'
                                                    : 'bg-white text-black/40 border-black/10 hover:border-black/20'
                                                    }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    )}

                    {/* Definitions */}
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <legend className="text-xs font-semibold text-black uppercase tracking-tight">{t('Definitions', 'Definizzjonijiet')}</legend>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                                disabled={form.definitions.length >= 10}
                                onClick={() => set('definitions', [...form.definitions, { text_en: '', text_mt: '', register: '' }])}>
                                + {t('Add Sense', 'Żid Sens')}
                            </Button>
                        </div>

                        {form.definitions.map((def: any, i: number) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-md border border-slate-100 space-y-3 relative group">
                                <div className="absolute top-2 right-2 flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={() => moveDefinition(i, 'up')} disabled={i === 0}
                                        className="p-1 text-slate-400 hover:text-[#1034A6] disabled:opacity-0">
                                        <ArrowUp size={14} />
                                    </button>
                                    <button type="button" onClick={() => moveDefinition(i, 'down')} disabled={i === form.definitions.length - 1}
                                        className="p-1 text-slate-400 hover:text-[#1034A6] disabled:opacity-0">
                                        <ArrowDown size={14} />
                                    </button>
                                    {form.definitions.length > 1 && (
                                        <button type="button" onClick={() => set('definitions', form.definitions.filter((_: any, idx: number) => idx !== i))}
                                            className="p-1 text-slate-400 hover:text-red-500">
                                            <span className="sr-only">Delete</span>
                                            &times;
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className={label}>{t('Sense', 'Sens')} {i + 1}: {t('English', 'Ingliż')} *</label>
                                        <input className={inp} value={def.text_en} onChange={e => {
                                            const next = [...form.definitions];
                                            next[i].text_en = e.target.value;
                                            set('definitions', next);
                                        }} required />
                                    </div>
                                    <div>
                                        <label className={label}>{t('Maltese', 'Malti')}</label>
                                        <input className={inp} value={def.text_mt} onChange={e => {
                                            const next = [...form.definitions];
                                            next[i].text_mt = e.target.value;
                                            set('definitions', next);
                                        }} />
                                    </div>
                                    <div>
                                        <label className={label}>{term('register')}</label>
                                        <select className={sel} value={def.register} onChange={e => {
                                            const next = [...form.definitions];
                                            next[i].register = e.target.value;
                                            set('definitions', next);
                                        }}>
                                            <option value="">—</option>
                                            {REGISTER_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    {form.pos === 'participle' && (
                                        <div>
                                            <label className={label}>{t('Nuance', 'Sfumatura')}</label>
                                            <select className={sel} value={def.nuance || ''} onChange={e => {
                                                const next = [...form.definitions];
                                                next[i].nuance = e.target.value;
                                                set('definitions', next);
                                            }}>
                                                <option value="">—</option>
                                                {PARTICIPLE_NUANCES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </fieldset>

                    {/* Relationships (Thesaurus & Derived Terms) */}
                    <div className="space-y-6">
                        <RelationshipEditor
                            type="derived"
                            title={t('Derived Terms', 'Termini Derivati')}
                            items={form.related_entries || []}
                            onChange={(items) => set('related_entries', items)}
                            extraActions={[
                                { label: t('New Entry', 'Entrata Ġdida'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=entry', '_blank') },
                                { label: t('New Root', 'Għerq Ġdid'), icon: <Plus size={12} />, onClick: () => window.open('/admin?tab=roots&new=root', '_blank') }
                            ]}
                        />
                        <RelationshipEditor
                            type="thesaurus"
                            title={t('Synonyms', 'Sinonimi')}
                            items={form.synonyms || []}
                            onChange={(items) => set('synonyms', items)}
                            extraActions={[
                                { label: t('New Entry', 'Entrata Ġdida'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=entry', '_blank') }
                            ]}
                        />
                        <RelationshipEditor
                            type="thesaurus"
                            title={t('Antonyms', 'Antonimi')}
                            items={form.antonyms || []}
                            onChange={(items) => set('antonyms', items)}
                            extraActions={[
                                { label: t('New Entry', 'Entrata Ġdida'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=entry', '_blank') }
                            ]}
                        />
                    </div>

                    {/* Etymology Builder */}
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <legend className="text-xs font-semibold text-black uppercase tracking-tight">{t('Etymology Builder', 'Oriġini tal-Kelma')}</legend>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                                onClick={() => set('etymology_chain', [...form.etymology_chain, { language: '', form: '', meaning: '' }])}>
                                + {t('Add Step', 'Żid Pass')}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 px-1 mb-2">
                            <input type="checkbox" id="loanword" checked={form.is_loanword}
                                onChange={e => set('is_loanword', e.target.checked)}
                                className="w-4 h-4 text-[#1034A6] rounded" />
                            <label htmlFor="loanword" className="text-sm font-medium text-black">{t('Mark as Loanword', 'Isinja bħala Self')}?</label>
                        </div>

                        {form.etymology_chain.map((ety: any, i: number) => (
                            <div key={i} className="flex gap-2 items-end">
                                <div className="flex-1">
                                    {i === 0 && <label className={label}>{t('Language', 'Lingwa')}</label>}
                                    <input className={inp} value={ety.language} placeholder="e.g. Arabic" onChange={e => {
                                        const next = [...form.etymology_chain];
                                        next[i].language = e.target.value;
                                        set('etymology_chain', next);
                                    }} />
                                </div>
                                <div className="flex-1">
                                    {i === 0 && <label className={label}>{t('Term', 'Kelma')}</label>}
                                    <input className={inp} value={ety.form} placeholder="e.g. kataba" onChange={e => {
                                        const next = [...form.etymology_chain];
                                        next[i].form = e.target.value;
                                        set('etymology_chain', next);
                                    }} />
                                </div>
                                <div className="flex-1">
                                    {i === 0 && <label className={label}>{t('Meaning', 'Tifsira')}</label>}
                                    <input className={inp} value={ety.meaning} placeholder="e.g. to write" onChange={e => {
                                        const next = [...form.etymology_chain];
                                        next[i].meaning = e.target.value;
                                        set('etymology_chain', next);
                                    }} />
                                </div>
                                <button type="button" onClick={() => set('etymology_chain', form.etymology_chain.filter((_: any, idx: number) => idx !== i))}
                                    className="mb-2 text-slate-400 hover:text-red-500 px-1">
                                    &times;
                                </button>
                            </div>
                        ))}

                        {form.is_loanword && (
                            <div className="pt-2">
                                <label className={label}>{t('Primary Source Language', 'Lingwa Sors Prinċipali')}</label>
                                <input className={inp} value={form.source_language}
                                    onChange={e => set('source_language', e.target.value)} placeholder={t('e.g. Italian', 'eż. Taljan')} />
                            </div>
                        )}
                    </fieldset>

                    {/* Dynamic Fields (for new DB columns) */}
                    {Object.keys((entry as any) || {}).filter(key => {
                        return !ENTRY_HANDLED_FIELDS.includes(key as any) && !key.startsWith('_');
                    }).length > 0 && (
                            <fieldset className="border border-amber-100 bg-amber-50/20 rounded-lg p-4 space-y-3">
                                <legend className="text-[10px] font-bold text-amber-600 uppercase tracking-widest px-2">{t('Additional Fields', 'Ghelta Oħra')}</legend>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.keys((entry as any) || {}).filter(key => {
                                        return !ENTRY_HANDLED_FIELDS.includes(key as any) && !key.startsWith('_');
                                    }).map(key => (
                                        <div key={key}>
                                            <label className={label}>{key}</label>
                                            <input
                                                className={inp}
                                                value={(form as any)[key] ?? ''}
                                                onChange={e => set(key, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </fieldset>
                        )}
                </div>

                <div className="flex justify-between items-center pt-4 mt-4 border-t border-black/10 shrink-0">
                    <div className="flex items-center gap-3">
                        {isEdit && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="text-xs"
                                loading={saving}
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        const token = await getToken();
                                        if (!token) throw new Error("Not authenticated");
                                        const payload = buildEntryPayload(form);
                                        await adminCreateEntry(token, payload);
                                        onSaved();
                                    } catch (err: any) {
                                        setError(err.message);
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                            >
                                <Plus size={14} className="mr-1" /> {t('Duplicate as New', 'Ikkopja bħala Ġdid')}
                            </Button>
                        )}
                        {isDirty && (
                            <Badge className="bg-amber-100 text-amber-700 animate-pulse border-amber-200">
                                <AlertTriangle size={10} className="mr-1" /> {t('Unsaved Changes', 'Tibdil mhux merfugħ')}
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={handleClose}>{t('Cancel', 'Ikkanċella')}</Button>
                        <Button type="button" onClick={handleSave} loading={saving}>
                            {isEdit ? t('Save Changes', 'Issejva l-Bidliet') : t('Create Entry', 'Oħloq Entrata')}
                        </Button>
                    </div>
                </div>
            </div >
        </Modal >
    );
}
