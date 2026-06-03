import { lazy, Suspense, useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import {
    Plus, RefreshCw, RotateCcw, Keyboard, Sparkles, ArrowUp, ArrowDown, AlertTriangle
} from 'lucide-react';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminCreateEntry, adminUpdateEntry, apiLookupRootByConsonants, apiGetDistinctValues, apiGetEntry, adminCheckIdExists, invalidateDistinctValuesCache } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { generateRootForms } from '@/lib/conjugationEngine';
import type { WeakClass } from '@/types';
import { useAdminConfig } from '@/lib/adminConfig';
import { buildLoadedEntryPatch, entryToForm, formToPayload, INITIAL_FORM_STATE } from '@/lib/entryAdapter';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
    generateIPA, deriveFeminineFromPattern, deriveMasculineFromFeminine,
    detectPluralType, derivePattern, extractLongVowelFromPattern
} from '@/lib/maltesePhonology';
import { buildNumeralAutoForms, seedNumeralDerivedFields } from '@/lib/numeralMorphology';
import { normalizeEntryDefinitions, normalizeRootEtymologyChain } from '@/lib/adminUtils';
import { resolveEntryMorphologyMode } from '@/lib/adminSchema';
import { applyInflectableToggle } from '@/lib/inflectionState';
import { resolveTagLabel } from '@/lib/tagLabel';
import {
    compactPluralRows,
    normalizePluralFormRows,
    pluralRowsToLegacyForms,
    pluralRowsToLegacyPatternString,
    type PluralFormRow,
} from '@/lib/pluralForms';
import {
    buildPatternOptions,
    getPatternNotation,
    mergePatternBucketApplicabilities,
    type PatternOption,
    type PatternSourceItem,
} from '@/lib/patternBuckets';
import { buildSuggestedEntryId } from '@/lib/entryId';
import { isDashMarkedSuffix, stripLeadingDash } from '@/lib/suffixMatching';
import type { VerbMorphology } from '@/types';

export interface AdminEntry {
    id: string;
    headword: string;
    pos: string;
    gender?: string;
    verb_class?: string;
    is_loanword: boolean;
    source_language?: string;
    created_at: string;
    text_en?: string;
    verb_vowel_perf?: string;
    verb_vowel_impf?: string;
    verb_transitivity?: string;
    verb_morphology?: VerbMorphology;
    root_consonants?: string;
    verb_form?: string;
    tags?: string | string[];
    alternative_forms?: string | { id: string; headword?: string }[];
    // Noun/Adj additions
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    is_collective?: boolean;
    is_singulative?: boolean;
}

export interface EntryFormModalProps {
    entry: AdminEntry | null;
    onClose: () => void;
    onSaved: () => void;
    getToken: () => Promise<string | null>;
    initialForm?: Partial<typeof INITIAL_FORM_STATE>;
}

const LazyRelationshipEditor = lazy(() =>
    import('./RelationshipEditor').then(module => ({ default: module.RelationshipEditor }))
);

const LazyEtymologyChainEditor = lazy(() =>
    import('./EtymologyChainEditor').then(module => ({ default: module.EtymologyChainEditor }))
);

function buildFormSnapshot(form: any): string {
    return JSON.stringify(formToPayload(form));
}


// ── Components for Morphology Fields ──────────────────────────────────────

interface MorphologyProps {
    form: any;
    set: (k: string, v: any) => void;
    t: (en: string, mt: string) => string;
    styles: {
        label: string;
        inp: string;
        sel: string;
        check?: string;
        grid: string;
    };
    insertChar: (char: string) => void;
    onFocus: (fieldName: string) => void;
    options?: {
        gender?: { label: string; value: string }[];
        noun_type?: { label: string; value: string }[];
        verb_class?: { label: string; value: string }[];
        verb_type?: { label: string; value: string }[];
        verb_form?: string[];
        verb_transitivity?: { label: string; value: string }[];
        participle_type?: { label: string; value: string }[];
        participle_nuance?: { label: string; value: string }[];
        participle_gender?: { label: string; value: string }[];
        numeral_type?: { label: string; value: string }[];
        broken_patterns?: any[];
        cv_wizen_patterns?: any[];
        sound_suffixes?: string[];
        dual_suffixes?: PatternOption[];
        patterns?: PatternOption[];
        plural_patterns?: PatternOption[];
        elative_patterns?: PatternOption[];
        feminine_patterns?: PatternOption[];
        diminutive_patterns?: PatternOption[];
        derivational_suffixes?: PatternOption[];
        suggestions?: {
            broken_pattern?: string;
            feminine?: string;
            masculine?: string;
            plural?: string;
        };
        verb_presets?: Record<string, any>;
    };
    onApplyDerivedTerms?: () => void;
    suggestions?: string[];
}

const CharRow = ({ onInsert }: { onInsert: (c: string) => void }) => (
    <div className="flex gap-1 mt-1">
        {['à', 'â', 'ċ', 'ġ', 'ħ', 'ż', '–'].map(c => (
            <button
                key={c}
                type="button"
                onClick={() => onInsert(c)}
                className="px-1.5 py-0.5 text-[10px] bg-white border border-black/10 rounded hover:bg-black/5 text-black/60"
            >
                {c}
            </button>
        ))}
    </div>
);

const SuggestionRow = ({ options, onSelect, label }: { options: string[], onSelect: (v: string) => void, label?: string }) => {
    if (!options.length) return null;
    return (
        <div className="mt-1">
            {label && <p className="text-[9px] uppercase font-bold text-black/30 mb-1">{label}</p>}
            <div className="flex flex-wrap gap-1">
                {options.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onSelect(opt)}
                        className="px-1.5 py-0.5 text-[9px] bg-blue-50 border border-blue-100 rounded text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
};

const PatternPresetChips = ({
    label,
    patterns,
    value,
    onSelect,
    multi
}: {
    label: string;
    patterns?: { label: string; value: string; sub?: string }[];
    value?: string | null;
    onSelect: (v: string) => void;
    multi?: boolean;
}) => {
    if (!patterns || patterns.length === 0) return null;
    const values = multi ? (value?.split(',').map(s => s.trim()).filter(Boolean) || []) : [value];

    return (
        <div>
            <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-2 block">
                {label}
            </span>
            <div className="flex flex-wrap gap-2">
                {patterns.map(opt => {
                    const isSelected = multi ? values.includes(opt.value) : value === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                if (multi) {
                                    const next = isSelected
                                        ? values.filter(v => v !== opt.value)
                                        : [...values, opt.value];
                                    onSelect(next.join(', '));
                                } else {
                                    onSelect(opt.value);
                                }
                            }}
                            className={cn(
                                "px-2 py-1 text-[10px] rounded border transition-all",
                                isSelected
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                            )}
                        >
                            {opt.label} {opt.sub && <span className="opacity-50 ml-1 font-normal">({opt.sub})</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const PatternTagField = ({
    value,
    onChange,
    label,
    placeholder,
    presets,
    suggestion,
    onSuggest,
    styles,
    t
}: {
    value: string;
    onChange: (v: string) => void;
    label: string;
    placeholder?: string;
    presets?: { label: string; value: string; sub?: string }[];
    suggestion?: string;
    onSuggest?: () => void;
    styles: any;
    t: (en: string, mt: string) => string;
}) => {
    const values = value.split(',').map(s => s.trim()).filter(Boolean);

    return (
        <div className="space-y-2">
            <label className={styles.label}>{label}</label>
            <div className="flex flex-wrap gap-2 p-3 bg-white border border-black/10 rounded-lg min-h-[42px]">
                {values.map(val => (
                    <Badge key={val} variant="tag" className="bg-slate-100 border-slate-200 text-slate-700 pr-1">
                        {val}
                        <button
                            type="button"
                            onClick={() => onChange(values.filter(v => v !== val).join(', '))}
                            className="ml-1 hover:text-red-500"
                        >
                            &times;
                        </button>
                    </Badge>
                ))}
                <input
                    className="bg-transparent text-sm focus:outline-none min-w-[100px] flex-1 text-black"
                    placeholder={values.length === 0 ? placeholder : ''}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !values.includes(val)) {
                                onChange([...values, val].join(', '));
                                e.currentTarget.value = '';
                            }
                        }
                    }}
                    onBlur={e => {
                        const val = e.currentTarget.value.trim();
                        if (val && !values.includes(val)) {
                            onChange([...values, val].join(', '));
                        }
                        e.currentTarget.value = '';
                    }}
                />
            </div>
            {suggestion && value !== suggestion && (
                <button type="button" onClick={onSuggest} className="mt-1 text-[10px] text-blue-600 hover:underline block">
                    {t('Suggest', 'Sugġeriment')}: {suggestion}
                </button>
            )}
            {presets && presets.length > 0 && (
                <PatternPresetChips
                    label={t('Pattern Presets', 'Mudelli Presets')}
                    patterns={presets}
                    value={value}
                    onSelect={onChange}
                    multi
                />
            )}
        </div>
    );
};

const VowelSetRow = ({ form, set, t, styles, onFocus, insertChar, fields, suggestions }: MorphologyProps & { fields: { key: string; label: string; placeholder?: string }[], suggestions?: string[] }) => (
    <div className={cn(styles.grid, "bg-slate-50 p-3 rounded-lg border border-slate-100")}>
        {fields.map(f => (
            <div key={f.key}>
                <label className={styles.label}>{t(f.label, f.label)}</label>
                <input
                    className={styles.inp}
                    value={form[f.key] || ''}
                    onChange={e => set(f.key, e.target.value)}
                    onFocus={() => onFocus(f.key)}
                    placeholder={f.placeholder || "e.g. i-a"}
                />
                <div className="flex flex-col gap-1 mt-1">
                    <CharRow onInsert={insertChar} />
                    {suggestions && suggestions.length > 0 && (
                        <SuggestionRow options={suggestions.slice(0, 10)} onSelect={v => set(f.key, v)} />
                    )}
                </div>
            </div>
        ))}
    </div>
);

const PluralFormsEditor = ({
    rows,
    onChange,
    t,
    styles,
    pluralPatterns,
}: {
    rows: PluralFormRow[];
    onChange: (rows: PluralFormRow[]) => void;
    t: (en: string, mt: string) => string;
    styles: MorphologyProps['styles'];
    pluralPatterns?: { label: string; value: string; sub?: string }[];
    }) => {
    const activeRows = rows.length > 0 ? rows : [{ form: '', pattern: '' }];

    const syncRows = (nextRows: PluralFormRow[]) => {
        onChange(nextRows);
    };

    const updateRow = (index: number, key: keyof PluralFormRow, value: string) => {
        const next = [...activeRows];
        next[index] = { ...next[index], [key]: value };
        syncRows(next);
    };

    const moveRow = (index: number, direction: 'up' | 'down') => {
        const next = [...activeRows];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return;
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        syncRows(next);
    };

    return (
        <fieldset className="border border-border-light rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center px-1">
                <legend className="text-xs font-semibold text-black uppercase tracking-tight">
                    {t('Plural Forms', 'Forom tal-Plural')}
                </legend>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => syncRows([...activeRows, { form: '', pattern: '' }])}
                >
                    + {t('Add Plural', 'Żid Plural')}
                </Button>
            </div>
            <p className="px-1 -mt-2 text-[10px] text-black/40">
                {t('Add each plural form on its own row so every plural can keep its own pattern.', 'Żid kull forma tal-plural f\'riga separata sabiex kull plural ikollu mudell tiegħu.' )}
            </p>

            <div className="space-y-3">
                {activeRows.map((row, index) => (
                    <div key={index} className="bg-slate-50 p-3 rounded-md border border-slate-100 space-y-3 relative group">
                        <div className="absolute top-2 right-2 flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={() => moveRow(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-slate-400 hover:text-[#1034A6] disabled:opacity-0"
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveRow(index, 'down')}
                                disabled={index === activeRows.length - 1}
                                className="p-1 text-slate-400 hover:text-[#1034A6] disabled:opacity-0"
                            >
                                <ArrowDown size={14} />
                            </button>
                            {activeRows.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => syncRows(activeRows.filter((_, idx) => idx !== index))}
                                    className="p-1 text-slate-400 hover:text-red-500"
                                >
                                    <span className="sr-only">{t('Delete', 'Delete')}</span>
                                    &times;
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={styles.label}>
                                    {t('Plural Form', 'Forma tal-Plural')} {index + 1}
                                </label>
                                <input
                                    className={styles.inp}
                                    value={row.form}
                                    onChange={e => updateRow(index, 'form', e.target.value)}
                                    placeholder="e.g. klieb"
                                />
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <label className={styles.label}>
                                        {t('Plural Pattern', 'Mudell tal-Plural')} {index + 1}
                                    </label>
                                    <input
                                        className={styles.inp}
                                        value={row.pattern}
                                        onChange={e => updateRow(index, 'pattern', e.target.value)}
                                        placeholder="e.g. CaCCa"
                                    />
                                </div>
                                {pluralPatterns && pluralPatterns.length > 0 && (
                                    <PatternPresetChips
                                        label={t('Pattern Presets', 'Mudelli Presets')}
                                        patterns={pluralPatterns}
                                        value={row.pattern}
                                        onSelect={value => updateRow(index, 'pattern', value)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </fieldset>
    );
};

const NounFields = ({ form, set, t, styles, insertChar, onFocus, options, suggestions }: MorphologyProps) => {
    const pluralRows = Array.isArray(form.plural_forms) && form.plural_forms.length > 0
        ? form.plural_forms
        : compactPluralRows(normalizePluralFormRows(form.plural_forms, form.form_plural_pattern));
    const updatePluralRows = (rows: PluralFormRow[]) => {
        set('plural_forms', rows);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4 p-3 bg-surface-soft rounded-lg border border-border">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className={styles.check}
                        checked={!!form.is_collective}
                        onChange={e => {
                            set('is_collective', e.target.checked);
                            if (e.target.checked) {
                                set('is_singulative', false);
                                set('gender', 'masculine');
                            }
                        }}
                    />
                    <span className="text-sm font-medium">{t('Collective', 'Kollettiv')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className={styles.check}
                        checked={!!form.is_singulative}
                        onChange={e => {
                            set('is_singulative', e.target.checked);
                            if (e.target.checked) {
                                set('is_collective', false);
                                set('gender', 'feminine');
                            }
                        }}
                    />
                    <span className="text-sm font-medium">{t('Singulative', 'Singolattiv')}</span>
                </label>
            </div>

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Gender', 'Ġens')}</label>
                    <select className={styles.sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                        <option value="">{t('Select...', 'Agħżel...')}</option>
                        {options?.gender?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.grid}>
                {form.gender?.toLowerCase() === 'masculine' && (
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>
                                {form.is_collective ? t('Singulative Form', 'Forma Singulattiva') : t('Feminine Form', 'Femminil')}
                            </label>
                            <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} placeholder={form.is_collective ? "e.g. tuffieħa" : "e.g. kelliema"} />
                        </div>
                        <div>
                            <PatternTagField
                                label={form.is_collective ? t('Singulative Pattern', 'Mudell Sing.') : t('Fem. Pattern', 'Mudell Fem.')}
                                value={form.form_fem_pattern || ''}
                                onChange={v => set('form_fem_pattern', v)}
                                placeholder="e.g. CaCCaCa"
                                presets={options?.feminine_patterns}
                                suggestion={options?.suggestions?.feminine}
                                onSuggest={() => options?.suggestions?.feminine && set('form_fem_pattern', options.suggestions.feminine)}
                                styles={styles}
                                t={t}
                            />
                        </div>
                    </div>
                )}
                {form.gender?.toLowerCase() === 'feminine' && (
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>
                                {form.is_singulative ? t('Collective Form', 'Forma Kollettiva') : t('Masculine Form', 'Maskil')}
                            </label>
                            <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} placeholder={form.is_singulative ? "e.g. tuffieħ" : "e.g. kelliem"} />
                        </div>
                        <div>
                            <PatternTagField
                                label={form.is_singulative ? t('Collective Pattern', 'Mudell Kollettiv') : t('Masc. Pattern', 'Mudell Mask.')}
                                value={form.form_masc_pattern || ''}
                                onChange={v => set('form_masc_pattern', v)}
                                placeholder="e.g. CaCCaC"
                                presets={options?.patterns}
                                suggestion={options?.suggestions?.masculine}
                                onSuggest={() => options?.suggestions?.masculine && set('form_masc_pattern', options.suggestions.masculine)}
                                styles={styles}
                                t={t}
                            />
                        </div>
                    </div>
                )}
                {!form.gender && (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label className={styles.label}>{t('Masculine', 'Maskil')}</label>
                                <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} placeholder="e.g. kelliem" />
                            </div>
                            <div>
                                <PatternTagField
                                    label={t('Masc. Pattern', 'Mudell Mask.')}
                                    value={form.form_masc_pattern || ''}
                                    onChange={v => set('form_masc_pattern', v)}
                                    placeholder="e.g. CaCCaC"
                                    presets={options?.patterns}
                                    suggestion={options?.suggestions?.masculine}
                                    onSuggest={() => options?.suggestions?.masculine && set('form_masc_pattern', options.suggestions.masculine)}
                                    styles={styles}
                                    t={t}
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className={styles.label}>{t('Feminine', 'Femminil')}</label>
                                <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} placeholder="e.g. kelliema" />
                            </div>
                            <div>
                                <PatternTagField
                                    label={t('Fem. Pattern', 'Mudell Fem.')}
                                    value={form.form_fem_pattern || ''}
                                    onChange={v => set('form_fem_pattern', v)}
                                    placeholder="e.g. CaCCaCa"
                                    presets={options?.feminine_patterns}
                                    suggestion={options?.suggestions?.feminine}
                                    onSuggest={() => options?.suggestions?.feminine && set('form_fem_pattern', options.suggestions.feminine)}
                                    styles={styles}
                                    t={t}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>





            <VowelSetRow
                form={form} set={set} t={t} styles={styles} onFocus={onFocus} insertChar={insertChar}
                suggestions={suggestions}
                fields={[
                    { key: 'vowel_set_sg', label: 'Vowel Set (Singular)', placeholder: 'e.g. i-a' },
                    { key: 'vowel_set_opp', label: 'Vowel Set (Opp. Gender)', placeholder: 'e.g. i-a' },
                    { key: 'vowel_set_dual', label: 'Vowel Set (Dual)', placeholder: 'e.g. i-e' },
                    { key: 'vowel_set_pl', 'label': 'Vowel Set (Plural)', placeholder: 'e.g. i-ie' }
                ]}
            />

            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Dual', 'Imtenni')}</label>
                    <input className={styles.inp} value={form.dual_form || ''} onChange={e => set('dual_form', e.target.value)} placeholder="e.g. xahrejn" />
                </div>
                {form.dual_form && (
                    <div>
                        <PatternTagField
                            label={t('Dual Suffix', 'Suffiss Doppju')}
                            value={form.dual_pattern || ''}
                            onChange={v => set('dual_pattern', v)}
                            placeholder="e.g. CvCCejn"
                            presets={options?.dual_suffixes}
                            styles={styles}
                            t={t}
                        />
                    </div>
                )}
            </div>

            <PluralFormsEditor
                rows={pluralRows}
                onChange={updatePluralRows}
                t={t}
                styles={styles}
                pluralPatterns={options?.plural_patterns}
            />

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className={styles.grid}>
                    <div>
                        <label className={styles.label}>{t('Paucal Form', 'Forma Pawkali')}</label>
                        <input className={styles.inp} value={form.paucal_form || ''} onChange={e => set('paucal_form', e.target.value)} placeholder="e.g. ..." />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Augmentative Form', 'Forma Tkabbir')}</label>
                        <input className={styles.inp} value={form.augmentative_form || ''} onChange={e => set('augmentative_form', e.target.value)} placeholder="e.g. ..." />
                    </div>
                </div>
                <div className={styles.grid}>
                    <div>
                        <PatternTagField
                            label={t('Paucal Pattern', 'Mudell Pawkali')}
                            value={form.paucal_pattern || ''}
                            onChange={v => set('paucal_pattern', v)}
                            placeholder="e.g. CVCVC"
                            styles={styles}
                            t={t}
                        />
                    </div>
                    <div>
                        <PatternTagField
                            label={t('Augmentative Pattern', 'Mudell Tkabbir')}
                            value={form.augmentative_pattern || ''}
                            onChange={v => set('augmentative_pattern', v)}
                            placeholder="e.g. CVCVCa"
                            presets={options?.derivational_suffixes}
                            styles={styles}
                            t={t}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>{t('Diminutive', 'Diminuttiv')}</label>
                        <input className={styles.inp} value={form.diminutive_form || ''} onChange={e => set('diminutive_form', e.target.value)} placeholder="e.g. kittejeb" />
                    </div>
                    {form.diminutive_form && (
                        <div>
                            <PatternTagField
                                label={t('Diminutive Pattern', 'Mudell Diminuttiv')}
                                value={form.diminutive_pattern || ''}
                                onChange={v => set('diminutive_pattern', v)}
                                placeholder="e.g. CCvjjvC"
                                presets={options?.diminutive_patterns}
                                styles={styles}
                                t={t}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};




const AdjectiveFields = ({ form, set, t, styles, options, insertChar, onFocus, suggestions }: MorphologyProps) => (
    (() => {
        const pluralRows = Array.isArray(form.plural_forms) && form.plural_forms.length > 0
            ? form.plural_forms
            : compactPluralRows(normalizePluralFormRows(form.plural_forms, form.form_plural_pattern));
        const updatePluralRows = (rows: PluralFormRow[]) => {
            set('plural_forms', rows);
        };

        return (
    <div className="space-y-4">
        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Gender', 'Ġens')}</label>
                <select className={styles.sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">{t('Select...', 'Agħżel...')}</option>
                    {options?.gender?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
            </div>
            {form.gender?.toLowerCase() === 'masculine' && (
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                        <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                    </div>
                    <div>
                        <PatternTagField
                            label={t('Feminine Pattern', 'Mudell Fem.')}
                            value={form.form_fem_pattern || ''}
                            onChange={v => set('form_fem_pattern', v)}
                            placeholder="e.g. CVCVCa"
                            presets={options?.feminine_patterns}
                            styles={styles}
                            t={t}
                        />
                    </div>
                </div>
            )}
            {form.gender?.toLowerCase() === 'feminine' && (
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>{t('Masculine Form', 'Maskil')}</label>
                        <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                    </div>
                    <div>
                        <PatternTagField
                            label={t('Masculine Pattern', 'Mudell Mask.')}
                            value={form.form_masc_pattern || ''}
                            onChange={v => set('form_masc_pattern', v)}
                            placeholder="e.g. CVCVC"
                            presets={options?.patterns}
                            styles={styles}
                            t={t}
                        />
                    </div>
                </div>
            )}
        </div>

        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Dual', 'Imtenni')}</label>
                    <input className={styles.inp} value={form.dual_form || ''} onChange={e => set('dual_form', e.target.value)} />
                </div>
                {form.dual_form && (
                    <div>
                        <PatternTagField
                            label={t('Dual Suffix', 'Suffiss Doppju')}
                            value={form.dual_pattern || ''}
                            onChange={v => set('dual_pattern', v)}
                            placeholder="e.g. CvCCejn"
                            presets={options?.dual_suffixes}
                            styles={styles}
                            t={t}
                        />
                    </div>
                )}
            </div>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Diminutive', 'Diminuttiv')}</label>
                    <input className={styles.inp} value={form.diminutive_form || ''} onChange={e => set('diminutive_form', e.target.value)} />
                </div>
                {form.diminutive_form && (
                    <div>
                        <PatternTagField
                            label={t('Diminutive Pattern', 'Mudell Diminuttiv')}
                            value={form.diminutive_pattern || ''}
                            onChange={v => set('diminutive_pattern', v)}
                            placeholder="e.g. CCvjjvC"
                            presets={options?.diminutive_patterns}
                            styles={styles}
                            t={t}
                        />
                    </div>
                )}
            </div>
        </div>

        <VowelSetRow
            form={form} set={set} t={t} styles={styles} onFocus={onFocus} insertChar={insertChar}
            suggestions={suggestions}
            fields={[
                { key: 'vowel_set_sg', label: 'Vowel Set (Singular)', placeholder: 'e.g. i-a' },
                { key: 'vowel_set_opp', label: 'Vowel Set (Opp. Gender)', placeholder: 'e.g. i-a' },
                { key: 'vowel_set_dual', label: 'Vowel Set (Dual)', placeholder: 'e.g. i-e' },
                { key: 'vowel_set_pl', label: 'Vowel Set (Plural)', placeholder: 'e.g. i-ie' }
            ]}
        />

        <PluralFormsEditor
            rows={pluralRows}
            onChange={updatePluralRows}
            t={t}
            styles={styles}
            pluralPatterns={options?.plural_patterns}
        />

        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Elative (Comparative)', 'Elattiv (Komparattiv)')}</label>
                    <input className={styles.inp} value={form.elative_form || ''} onChange={e => set('elative_form', e.target.value)} />
                </div>
                {form.elative_form && (
                    <div>
                        <PatternTagField
                            label={t('Elative Pattern', 'Mudell Elattiv')}
                            value={form.elative_pattern || ''}
                            onChange={v => set('elative_pattern', v)}
                            placeholder="e.g. aCCaC"
                            presets={options?.elative_patterns}
                            styles={styles}
                            t={t}
                        />
                    </div>
                )}
            </div>
        </div>
    </div>
        );
    })()
);

const VerbFields = ({ form, set, t, styles, onFocus, options, onApplyDerivedTerms, suggestions }: MorphologyProps) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={onApplyDerivedTerms}
                    className="text-[10px] text-blue-600 font-medium hover:underline flex items-center gap-1"
                >
                    <RefreshCw size={10} />
                    {t('Suggest Morphology from Pattern', 'Iġġenera Morfoloġija')}
                </button>
            </div>

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Perfect (3sg.m)', 'Perfett (3sg.m)')}</label>
                    <input className={styles.inp} value={form.verb_perfective_3sgm} onChange={e => set('verb_perfective_3sgm', e.target.value)} onFocus={() => onFocus('verb_perfective_3sgm')} />
                </div>
                <div>
                    <label className={styles.label}>{t('Imperfect (3sg.m)', 'Imperfett (3sg.m)')}</label>
                    <input className={styles.inp} value={form.verb_imperfective_3sgm} onChange={e => set('verb_imperfective_3sgm', e.target.value)} onFocus={() => onFocus('verb_imperfective_3sgm')} />
                </div>
            </div>

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Vowel Set (Perf)', 'Sett ta\' vokali (Perf)')}</label>
                    <input className={styles.inp} value={form.verb_vowel_perf} onChange={e => set('verb_vowel_perf', e.target.value)} onFocus={() => onFocus('verb_vowel_perf')} />
                    <SuggestionRow options={suggestions?.slice(0, 10) || []} onSelect={v => set('verb_vowel_perf', v)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Vowel Set (Impf)', 'Sett ta\' vokali (Impf)')}</label>
                    <input className={styles.inp} value={form.verb_vowel_impf} onChange={e => set('verb_vowel_impf', e.target.value)} onFocus={() => onFocus('verb_vowel_impf')} />
                    <SuggestionRow options={suggestions?.slice(0, 10) || []} onSelect={v => set('verb_vowel_impf', v)} />
                </div>
            </div>

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Vowel Set (Impv)', 'Sett ta\' vokali (Impv)')}</label>
                    <input className={styles.inp} value={form.verb_vowel_impv} onChange={e => set('verb_vowel_impv', e.target.value)} onFocus={() => onFocus('verb_vowel_impv')} />
                    <SuggestionRow options={suggestions?.slice(0, 10) || []} onSelect={v => set('verb_vowel_impv', v)} />
                </div>
            </div>

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Verbal Noun', 'Nom Verb')}</label>
                    <input className={styles.inp} value={form.verb_verbal_noun} onChange={e => set('verb_verbal_noun', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Transitivity', 'Tranzittività')}</label>
                    <select className={styles.sel} value={form.verb_transitivity} onChange={e => set('verb_transitivity', e.target.value)}>
                        <option value="">{t('Select...', 'Agħżel...')}</option>
                        {options?.verb_transitivity?.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Active Participle', 'Partiċipju Attiv')}</label>
                    <input className={styles.inp} value={form.verb_active_ptcp} onChange={e => set('verb_active_ptcp', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Passive Participle', 'Partiċipju Passiv')}</label>
                    <input className={styles.inp} value={form.verb_passive_ptcp} onChange={e => set('verb_passive_ptcp', e.target.value)} />
                </div>
            </div>
        </div>
    );
};


const ParticipleFields = ({ form, set, t, styles, options, insertChar, onFocus, suggestions }: MorphologyProps) => (
    (() => {
        const pluralRows = Array.isArray(form.plural_forms) && form.plural_forms.length > 0
            ? form.plural_forms
            : compactPluralRows(normalizePluralFormRows(form.plural_forms, form.form_plural_pattern));
        const updatePluralRows = (rows: PluralFormRow[]) => {
            set('plural_forms', rows);
        };

        return (
    <div className="space-y-4">
        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Type', 'Tip')}</label>
                <select className={styles.sel} value={form.participle_type} onChange={e => set('participle_type', e.target.value)}>
                    <option value="">{t('Select...', 'Agħżel...')}</option>
                    {options?.participle_type?.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
            <div>
                <label className={styles.label}>{t('Gender', 'Ġens')}</label>
                <select className={styles.sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">{t('Select...', 'Agħżel...')}</option>
                    {options?.participle_gender?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
            </div>
            {(!form.gender || form.gender === '') && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Masculine Form', 'Maskil')}</label>
                            <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                        </div>
                        <div>
                            <PatternTagField
                                label={t('Masculine Pattern', 'Mudell Mask.')}
                                value={form.form_masc_pattern || ''}
                                onChange={v => set('form_masc_pattern', v)}
                                placeholder="e.g. CVCVC"
                                presets={options?.patterns}
                                styles={styles}
                                t={t}
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                            <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                        </div>
                        <div>
                            <PatternTagField
                                label={t('Fem. Pattern', 'Mudell Fem.')}
                                value={form.form_fem_pattern || ''}
                                onChange={v => set('form_fem_pattern', v)}
                                placeholder="e.g. CVCVCa"
                                presets={options?.feminine_patterns}
                                styles={styles}
                                t={t}
                            />
                        </div>
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'masculine' && (
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                        <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                    </div>
                    <div>
                        <PatternTagField
                            label={t('Feminine Pattern', 'Mudell Fem.')}
                            value={form.form_fem_pattern || ''}
                            onChange={v => set('form_fem_pattern', v)}
                            placeholder="e.g. CVCVCa"
                            presets={options?.feminine_patterns}
                            styles={styles}
                            t={t}
                        />
                    </div>
                </div>
            )}
            {form.gender?.toLowerCase() === 'feminine' && (
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>{t('Masculine Form', 'Maskil')}</label>
                        <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                    </div>
                    <div>
                        <PatternTagField
                            label={t('Masculine Pattern', 'Mudell Mask.')}
                            value={form.form_masc_pattern || ''}
                            onChange={v => set('form_masc_pattern', v)}
                            placeholder="e.g. CVCVC"
                            presets={options?.patterns}
                            styles={styles}
                            t={t}
                        />
                    </div>
                </div>
            )}
            <PluralFormsEditor
                rows={pluralRows}
                onChange={updatePluralRows}
                t={t}
                styles={styles}
                pluralPatterns={options?.plural_patterns}
            />
        </div>

        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Dual', 'Imtenni')}</label>
                    <input className={styles.inp} value={form.dual_form || ''} onChange={e => set('dual_form', e.target.value)} />
                </div>
                {form.dual_form && (
                    <div>
                        <PatternTagField
                            label={t('Dual Suffix', 'Suffiss Doppju')}
                            value={form.dual_pattern || ''}
                            onChange={v => set('dual_pattern', v)}
                            placeholder="e.g. CvCCejn"
                            presets={options?.dual_suffixes}
                            styles={styles}
                            t={t}
                        />
                    </div>
                )}
            </div>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Diminutive', 'Diminuttiv')}</label>
                    <input className={styles.inp} value={form.diminutive_form || ''} onChange={e => set('diminutive_form', e.target.value)} />
                </div>
                {form.diminutive_form && (
                    <div>
                        <PatternTagField
                            label={t('Diminutive Pattern', 'Mudell Diminuttiv')}
                            value={form.diminutive_pattern || ''}
                            onChange={v => set('diminutive_pattern', v)}
                            placeholder="e.g. CCvjjvC"
                            presets={options?.patterns}
                            styles={styles}
                            t={t}
                        />
                    </div>
                )}
            </div>
        </div>

        <VowelSetRow
            form={form} set={set} t={t} styles={styles} onFocus={onFocus} insertChar={insertChar}
            suggestions={suggestions}
            fields={[
                { key: 'vowel_set_sg', label: 'Vowel Set (Singular)', placeholder: 'e.g. i-a' },
                { key: 'vowel_set_opp', label: 'Vowel Set (Opp. Gender)', placeholder: 'e.g. i-a' },
                { key: 'vowel_set_dual', label: 'Vowel Set (Dual)', placeholder: 'e.g. i-e' },
                { key: 'vowel_set_pl', label: 'Vowel Set (Plural)', placeholder: 'e.g. i-ie' }
            ]}
        />

        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Elative (Comparative)', 'Elattiv (Komparattiv)')}</label>
                    <input className={styles.inp} value={form.elative_form || ''} onChange={e => set('elative_form', e.target.value)} />
                </div>
                {form.elative_form && (
                    <div>
                        <PatternTagField
                            label={t('Elative Pattern', 'Mudell Elattiv')}
                            value={form.elative_pattern || ''}
                            onChange={v => set('elative_pattern', v)}
                            placeholder="e.g. aCCaC"
                            presets={options?.elative_patterns}
                            styles={styles}
                            t={t}
                        />
                    </div>
                )}
            </div>
        </div>

    </div>
        );
    })()
);

const PronounFields = ({ form, set, t, styles, options }: MorphologyProps) => {
    const head = (form.headword || '').trim().toLowerCase();
    const showGender = head === 'huwa' || head === 'hija';
    const pluralRows = Array.isArray(form.plural_forms) && form.plural_forms.length > 0
        ? form.plural_forms
        : compactPluralRows(normalizePluralFormRows(form.plural_forms, form.form_plural_pattern));
    const updatePluralRows = (rows: PluralFormRow[]) => {
        set('plural_forms', rows);
    };

    return (
        <div className="space-y-4">
            {showGender && (
                <div className={styles.grid}>
                    <div>
                        <label className={styles.label}>{t('Gender', 'Ġens')}</label>
                        <select className={styles.sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                            <option value="">{t('Select...', 'Agħżel...')}</option>
                            {options?.gender?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    </div>
                    {form.gender?.toLowerCase() === 'masculine' && (
                        <div>
                            <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                            <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                        </div>
                    )}
                    {form.gender?.toLowerCase() === 'feminine' && (
                        <div>
                            <label className={styles.label}>{t('Masculine Form', 'Maskil')}</label>
                            <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} />
                        </div>
                    )}
                </div>
            )}
            <PluralFormsEditor
                rows={pluralRows}
                onChange={updatePluralRows}
                t={t}
                styles={styles}
                pluralPatterns={options?.plural_patterns}
            />
        </div>
    );
};


const NumeralFields = ({ form, set, t, styles, options, insertChar, onFocus, onApplyDerivedTerms, suggestions }: MorphologyProps) => (
    (() => {
        const pluralRows = Array.isArray(form.plural_forms) && form.plural_forms.length > 0
            ? form.plural_forms
            : compactPluralRows(normalizePluralFormRows(form.plural_forms, form.form_plural_pattern));
        const updatePluralRows = (rows: PluralFormRow[]) => {
            set('plural_forms', rows);
        };

        return (
        <div className="space-y-4">
            {(!form.numeral_type || form.numeral_type === 'cardinal') && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onApplyDerivedTerms}
                        className="text-[10px] text-blue-600 font-medium hover:underline flex items-center gap-1"
                    >
                        <RefreshCw size={10} />
                        {t('Suggest Numeral Forms', 'Iġġenera Forom tan-Numri')}
                    </button>
                </div>
            )}

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Gender', 'Ġens')}</label>
                    <select className={styles.sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                        <option value="">{t('Select...', 'Agħżel...')}</option>
                        {options?.gender?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className={styles.label}>{t('Numeral Type', 'Tip ta\' Numeral')}</label>
                    <select className={styles.sel} value={form.numeral_type} onChange={e => set('numeral_type', e.target.value)}>
                        <option value="">{t('Select...', 'Agħżel...')}</option>
                        {options?.numeral_type?.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Lemma Base', 'Lemma Bażi')}</label>
                    <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Masculine Form', 'Maskil')}</label>
                    <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} />
                </div>
            </div>

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                    <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                </div>
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>{t('Short Attributive', 'Attributtiv Qasir')}</label>
                        <input className={styles.inp} value={form.form_attributive_short || ''} onChange={e => set('form_attributive_short', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Long Attributive', 'Attributtiv Twil')}</label>
                        <input className={styles.inp} value={form.form_attributive_long || ''} onChange={e => set('form_attributive_long', e.target.value)} />
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                <div>
                    <PatternTagField
                        label={t('Masculine Pattern', 'Mudell Mask.')}
                        value={form.form_masc_pattern || ''}
                        onChange={v => set('form_masc_pattern', v)}
                        placeholder="e.g. CVCVC"
                        presets={options?.patterns}
                        styles={styles}
                        t={t}
                    />
                </div>
                <div>
                    <PatternTagField
                        label={t('Feminine Pattern', 'Mudell Fem.')}
                        value={form.form_fem_pattern || ''}
                        onChange={v => set('form_fem_pattern', v)}
                        placeholder="e.g. CVCVCa"
                        presets={options?.patterns}
                        styles={styles}
                        t={t}
                    />
                </div>
            </div>

            <VowelSetRow
                form={form}
                set={set}
                t={t}
                styles={styles}
                onFocus={onFocus}
                insertChar={insertChar}
                suggestions={suggestions}
                fields={[
                    { key: 'vowel_set_sg', label: 'Vowel Set (Singular)', placeholder: 'e.g. i-a' },
                    { key: 'vowel_set_opp', label: 'Vowel Set (Opp. Gender)', placeholder: 'e.g. i-a' },
                    { key: 'vowel_set_dual', label: 'Vowel Set (Dual)', placeholder: 'e.g. i-e' },
                    { key: 'vowel_set_pl', label: 'Vowel Set (Plural)', placeholder: 'e.g. i-ie' }
                ]}
            />

            <PluralFormsEditor
                rows={pluralRows}
                onChange={updatePluralRows}
                t={t}
                styles={styles}
                pluralPatterns={options?.plural_patterns}
            />
        </div>
        );
    })()
);

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

function StemMorphologyFields({
    form,
    set,
    t,
    styles,
    hasRootConsonants,
    sourceLanguageOptions,
}: {
    form: any;
    set: (k: string, v: any) => void;
    t: (en: string, mt: string) => string;
    styles: {
        label: string;
        inp: string;
        sel: string;
        grid: string;
    };
    hasRootConsonants: boolean;
    sourceLanguageOptions: string[];
}) {
    return (
        <div className="space-y-4 pt-2 border-t border-slate-200 mt-4 bg-blue-50/30 p-3 rounded-lg">
            <h4 className="text-xs font-bold uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                <span className="text-lg">⚙</span>
                {t('Stem Morphology', 'Morfoloġija taż-Żokk')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={styles.label}>{t('Class', 'Klassi')}</label>
                    <select className={styles.sel} value={form.zokk_class} onChange={e => set('zokk_class', e.target.value)}>
                        <option value="">{t('Select...', 'Agħżel...')}</option>
                        <option value="ar">-ar</option>
                        <option value="ir">-ir</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <input type="checkbox" id="zokk_hybrid" checked={form.zokk_is_hybrid}
                    onChange={e => set('zokk_is_hybrid', e.target.checked)}
                    className="w-4 h-4 text-[#1034A6] rounded" />
                <label htmlFor="zokk_hybrid" className="text-sm font-medium text-black">
                    {t('Is Hybrid', 'Huwa Ibridu')}?
                </label>
            </div>
            {form.zokk_is_hybrid && hasRootConsonants && (
                <div className="text-[11px] text-black/50 px-1 -mt-1">
                    {t('Reanalysed root mirrors the main root consonants.', 'L-għerq reanalizzat jirrifletti l-konsonanti tal-għerq prinċipali.')}
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={styles.label}>{t('Agentive Suffix', 'Suffiss Aġentiv')}</label>
                    <input className={styles.inp} value={form.zokk_agentive_suffix}
                        onChange={e => set('zokk_agentive_suffix', e.target.value)} placeholder="e.g. ant" />
                </div>
                <div>
                    <label className={styles.label}>{t('Source Language(s)', 'Lingwa(i) Sors')}</label>
                    <input className={styles.inp} value={form.source_language}
                        onChange={e => set('source_language', e.target.value)} list="stem-source-language-options" placeholder={t('e.g. Italian, English', 'eż. Taljan, Ingliż')} />
                    <datalist id="stem-source-language-options">
                        {sourceLanguageOptions.map((l) => <option key={l} value={l} />)}
                    </datalist>
                </div>
            </div>
        </div>
    );
}

export function EntryFormModal({ entry, onClose, onSaved, getToken, initialForm }: EntryFormModalProps) {
    const { getValues, getOptions, createItem, updateItem, refresh, byCategoryAndKey } = useAdminConfig();
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
    const DUAL_SUFFIX_OPTIONS = useMemo(() => (
        getValues('dual_suffix')
            .map(getPatternNotation)
            .filter(Boolean)
            .map((value) => ({ label: value, value }))
    ), [getValues]);
    const VERB_PRESETS_LIST = getValues('verb_preset');
    const VERB_FORM_OPTIONS = getValues('verb_form');
    const NUMERAL_TYPE_OPTIONS = useMemo(() => getOptions('numeral_type', mode, language), [getOptions, mode, language]);
    const CV_WIZEN_PATTERNS = getValues('cv_wizen_pattern') as PatternSourceItem[];
    const BROKEN_PATTERNS = getValues('broken_pattern') as PatternSourceItem[];
    const PLURAL_PATTERNS = getValues('plural_pattern') as PatternSourceItem[];
    const ELATIVE_PATTERNS_RAW = getValues('adjective_pattern') as PatternSourceItem[];
    const RELATIONSHIP_OPTIONS = getValues('root_relationship');
    const FEMININE_PATTERNS_RAW = getValues('feminine_pattern') as PatternSourceItem[];
    const DIMINUTIVE_PATTERNS_RAW = getValues('diminutive_pattern') as PatternSourceItem[];
    const SOURCE_LANGUAGE_OPTIONS = getValues('source_language');
    const PARTICIPLE_NUANCES = useMemo(() => getOptions('participle_nuance', mode, language), [getOptions, mode, language]);
    const VERB_TRANSITIVITY_OPTIONS = useMemo(() => getOptions('verb_transitivity', mode, language), [getOptions, mode, language]);
    const PARTICIPLE_TYPES = useMemo(() => getOptions('participle_type', mode, language), [getOptions, mode, language]);

    const nounPatterns = useMemo(() => (
        buildPatternOptions(BROKEN_PATTERNS, mode, {
            pos: 'noun',
            roles: ['masculine_singular'],
            gender: 'masculine',
        })
    ), [BROKEN_PATTERNS, mode]);

    const adjPatterns = useMemo(() => (
        buildPatternOptions(BROKEN_PATTERNS, mode, {
            pos: 'adjective',
            roles: ['masculine_singular'],
            gender: 'masculine',
        })
    ), [BROKEN_PATTERNS, mode]);

    const femininePatterns = useMemo(() => (
        buildPatternOptions(FEMININE_PATTERNS_RAW, mode, {
            pos: ['noun', 'adjective'],
            roles: ['feminine_singular'],
            gender: 'feminine',
        })
    ), [FEMININE_PATTERNS_RAW, mode]);

    const diminutivePatterns = useMemo(() => (
        buildPatternOptions(DIMINUTIVE_PATTERNS_RAW, mode, {
            pos: ['noun', 'adjective'],
            rolePrefix: 'diminutive',
        })
    ), [DIMINUTIVE_PATTERNS_RAW, mode]);

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
    const [isMissingEntry, setIsMissingEntry] = useState(false);
    const [isLoadingFull, setIsLoadingFull] = useState(isEdit);
    const [savedSnapshot, setSavedSnapshot] = useState('');
    const [idExists, setIdExists] = useState<boolean | null>(null);
    const [suggestedId, setSuggestedId] = useState('');
    const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
    const autoFilledFieldsRef = useRef<Set<string>>(new Set());
    const [isNotable, setIsNotable] = useState(false);

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

    const [form, setForm] = useState(() => entryToForm(entry, initialForm));
    const deferredForm = useDeferredValue(form);
    const loadRequestSeqRef = useRef(0);
    const idCheckSeqRef = useRef(0);
    const rootLookupSeqRef = useRef(0);
    const rootLookupCacheRef = useRef(new Map<string, any | null>());
    const currentSnapshot = useMemo(() => buildFormSnapshot(deferredForm), [deferredForm]);
    const isDirty = useMemo(() => {
        if (!savedSnapshot) return false;
        return currentSnapshot !== savedSnapshot;
    }, [currentSnapshot, savedSnapshot]);

    const currentEntryGender = useMemo(() => String(form.gender || '').trim().toLowerCase(), [form.gender]);
    const currentEntrySingularFilters = useMemo(() => {
        if (currentEntryGender === 'masculine') {
            return {
                roles: ['masculine_singular'],
                gender: 'masculine',
            };
        }

        if (currentEntryGender === 'feminine') {
            return {
                roles: ['feminine_singular'],
                gender: 'feminine',
            };
        }

        return {
            roles: ['masculine_singular', 'feminine_singular'],
        };
    }, [currentEntryGender]);

    const pluralPatterns = useMemo(() => (
        buildPatternOptions(PLURAL_PATTERNS, mode, {
            pos: form.pos,
        })
    ), [PLURAL_PATTERNS, form.pos, mode]);

    const elativePatterns = useMemo(() => (
        buildPatternOptions(ELATIVE_PATTERNS_RAW, mode, {
            pos: 'adjective',
            rolePrefix: 'elative',
            gender: 'masculine',
        })
    ), [ELATIVE_PATTERNS_RAW, mode]);

    const rootConsonants = (form._rootConsonants || '').trim();
    const zokkStem = (form.zokk_stem || '').trim();
    const hasRootConsonants = rootConsonants.length > 0;
    const hasZokkStem = zokkStem.length > 0;
    const hasDualMorphology = hasRootConsonants && hasZokkStem;
    const isStemMorphology = resolveEntryMorphologyMode(form) === 'stem';

    const replaceAutoFilledFields = useCallback((next: Set<string>) => {
        autoFilledFieldsRef.current = next;
        setAutoFilledFields(next);
    }, []);

    useEffect(() => {
        autoFilledFieldsRef.current = autoFilledFields;
    }, [autoFilledFields]);

    useEffect(() => {
        if (isEdit || isLoadingFull || savedSnapshot) return;
        setSavedSnapshot(buildFormSnapshot(form));
    }, [form, isEdit, isLoadingFull, savedSnapshot]);

    useEffect(() => {
        if (!hasRootConsonants && !hasZokkStem) return;
        if (form.is_loanword !== isStemMorphology) {
            set('is_loanword', isStemMorphology);
        }
    }, [hasRootConsonants, hasZokkStem, isStemMorphology]);

    useEffect(() => {
        if (!isEdit || !entry?.id) return;

        const requestSeq = ++loadRequestSeqRef.current;
        let active = true;
        setIsLoadingFull(true);

        apiGetEntry(entry.id)
            .then(res => {
                if (!active || requestSeq !== loadRequestSeqRef.current) return;

                if (res?.entry) {
                    setIsMissingEntry(false);
                    const full = res.entry as any;
                    let nextForm: any = null;

                    setForm(prev => {
                        nextForm = {
                            ...prev,
                            ...buildLoadedEntryPatch(full, prev),
                        };
                        return nextForm;
                    });

                    if (nextForm) {
                        setSavedSnapshot(buildFormSnapshot(nextForm));
                    }
                } else {
                    setIsMissingEntry(true);
                    setError(t(
                        'This entry no longer exists in the database. Use "Duplicate as New" to save your changes as a new entry.',
                        'Din l-entrata m’għadhiex teżisti fid-database. Uża "Ikkopja bħala Ġdid" biex issalva t-tibdil bħala entrata ġdida.'
                    ));
                }
            })
            .catch(() => {
                if (!active || requestSeq !== loadRequestSeqRef.current) return;
                setIsMissingEntry(true);
                setError(t(
                    'This entry no longer exists in the database. Use "Duplicate as New" to save your changes as a new entry.',
                    'Din l-entrata m’għadhiex teżisti fid-database. Uża "Ikkopja bħala Ġdid" biex issalva t-tibdil bħala entrata ġdida.'
                ));
            })
            .finally(() => {
                if (active && requestSeq === loadRequestSeqRef.current) {
                    setIsLoadingFull(false);
                }
            });

        return () => {
            active = false;
        };
    }, [isEdit, entry?.id]);

    // ── AUTOMATION: Auto-ID Suggestion ──────────────────────────────────────
    useEffect(() => {
        if (isEdit || !form.headword || !form.pos) {
            setSuggestedId('');
            return;
        }
        const newId = buildSuggestedEntryId({
            headword: form.headword,
            pos: form.pos,
            participleType: form.participle_type,
        });
        setSuggestedId(newId);
    }, [form.pos, form.headword, form.participle_type, isEdit]);

    // ── AUTOMATION: ID Existence Check ──────────────────────────────────────
    useEffect(() => {
        if (!form.id || form.id === entry?.id) {
            setIdExists(null);
            return;
        }
        const requestSeq = ++idCheckSeqRef.current;
        const timer = setTimeout(async () => {
            try {
                const token = await getToken();
                if (!token || requestSeq !== idCheckSeqRef.current) return;
                const res = await adminCheckIdExists(token, 'entries', form.id);
                if (requestSeq !== idCheckSeqRef.current) return;
                setIdExists(res.exists);
            } catch { }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.id, getToken, entry?.id]);

    // ── AUTOMATION: Verb Type/Category from Root ──────────────────────────────
    useEffect(() => {
        if (form.pos !== 'verb') return;
        const rootClean = form._rootConsonants.replace(/-/g, '').trim();
        if (!rootClean) return;

        const detected = rootClean.length >= 4 ? 'quadriliteral' : 'triliteral';
        if (form.verb_type !== detected) {
            set('verb_type', detected);
        }
    }, [form._rootConsonants, form.pos]);

    // ── AUTOMATION: Root Metadata Inheritance ───────────────────────────────
    useEffect(() => {
        const rootStr = form._rootConsonants.trim();
        if (!rootStr) return;

        const requestSeq = ++rootLookupSeqRef.current;
        const lookupKey = rootStr.toLowerCase();
        let active = true;

        const timer = setTimeout(async () => {
            try {
                let root = rootLookupCacheRef.current.get(lookupKey);
                if (root === undefined) {
                    root = await apiLookupRootByConsonants(rootStr);
                    rootLookupCacheRef.current.set(lookupKey, root);
                }

                if (!active || requestSeq !== rootLookupSeqRef.current || !root) return;

                const rootStrength = root.strength?.toLowerCase();
                let suggestedClass = '';
                if (rootStrength === 'strong') suggestedClass = 'strong';
                else if (rootStrength === 'weak') suggestedClass = 'weak';
                else if (rootStrength === 'geminated') suggestedClass = 'doubled';

                setForm(prev => {
                    let next: any = prev;
                    let hasChanges = false;
                    const newFilled = new Set(autoFilledFieldsRef.current);
                    const assign = (key: string, value: any) => {
                        if (!Object.is(next[key], value)) {
                            if (next === prev) next = { ...prev };
                            next[key] = value;
                            hasChanges = true;
                        }
                    };

                    if (suggestedClass && !prev.verb_class) {
                        newFilled.add('verb_class');
                        assign('verb_class', suggestedClass);
                    }

                    if (root.weak_class && !prev._weakClass) {
                        newFilled.add('_weakClass');
                        assign('_weakClass', root.weak_class);
                    }

                    if (root.source && !prev.source_citation) {
                        newFilled.add('source_citation');
                        assign('source_citation', root.source);
                    }

                    if (root.etymology && (!prev.etymology_chain || prev.etymology_chain.length === 0)) {
                        const normalized = normalizeRootEtymologyChain(root.etymology).map((step) => ({
                            relationship: step.relationship || 'From',
                            language: step.language || '',
                            term: step.term || '',
                            pronunciation: '',
                            definition: step.definition || '',
                        }));

                        if (normalized.length > 0) {
                            newFilled.add('etymology_chain');
                            assign('etymology_chain', normalized);
                        }
                    }

                    if (hasChanges) {
                        setTimeout(() => replaceAutoFilledFields(newFilled), 0);
                        return next;
                    }

                    return prev;
                });
            } catch (err) {
                console.error('Failed to lookup root for auto-fill:', err);
            }
        }, 1000); // Debounce lookup

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [form._rootConsonants]);

    // Reset auto-filled status when POS changes
    useEffect(() => {
        if (autoFilledFields.size > 0) {
            replaceAutoFilledFields(new Set());
        }
    }, [form.pos]);

    // Filtered patterns based on LIVE POS
    const filteredPatterns = useMemo(() => {
        const currentPos = String(form.pos || '').trim().toLowerCase();
        const shouldUseSingularFilter = currentPos === 'noun' || currentPos === 'adjective';

        return buildPatternOptions(CV_WIZEN_PATTERNS, mode, {
            pos: currentPos,
            ...(shouldUseSingularFilter ? currentEntrySingularFilters : {}),
        });
    }, [CV_WIZEN_PATTERNS, currentEntrySingularFilters, form.pos, mode]);

    // ── AUTOMATION: Smart Defaults ──────────────────────────────────────────
    useEffect(() => {
        const isMorphPos = ['noun', 'adjective', 'participle', 'numeral', 'pronoun'].includes(form.pos);
        if (form.headword && isMorphPos) {
            setForm(prev => {
                let next: any = prev;
                let hasChanges = false;
                const gender = prev.gender?.toLowerCase();
                const assign = (key: string, value: any) => {
                    if (!Object.is(next[key], value)) {
                        if (next === prev) next = { ...prev };
                        next[key] = value;
                        hasChanges = true;
                    }
                };

                // 1. Fundamental seeding
                if (!next.lemma_base) assign('lemma_base', prev.headword);
                if (!next.form_masc_pattern && prev.cv_pattern) assign('form_masc_pattern', prev.cv_pattern);

                // 2. Gender-specific proactive sync
                if (gender === 'masculine') {
                    if (prev.pos !== 'verb' && !next.form_masc) assign('form_masc', prev.headword);
                    if (!next.form_masc_pattern && prev.cv_pattern) assign('form_masc_pattern', prev.cv_pattern);
                } else if (gender === 'feminine') {
                    if (!next.form_fem) assign('form_fem', prev.headword);
                    if (!next.form_fem_pattern && prev.cv_pattern) assign('form_fem_pattern', prev.cv_pattern);
                }

                return hasChanges ? next : prev;
            });
        }
    }, [form.headword, form.pos, form.gender, form.cv_pattern]);

    // ── AUTOMATION: Pattern Auto-Suggest (from headword + root) ─────────────
    const suggestedPattern = useMemo(() => {
        if (!form.headword || !form._rootConsonants) return null;
        return derivePattern(form.headword, form._rootConsonants);
    }, [form.headword, form._rootConsonants]);

    // ── AUTOMATION: Broken Plural Pattern Auto-Suggest ───────────────────────
    const suggestedBrokenPattern = useMemo(() => {
        const pl = form.inflections_pl;
        if (!pl || !form._rootConsonants) return null;
        const firstPlural = (typeof pl === 'string' ? pl : (pl as string[]).join(','))
            .split(',')[0].trim();
        if (!firstPlural) return null;
        return derivePattern(firstPlural, form._rootConsonants);
    }, [form.inflections_pl, form._rootConsonants]);

    const soundSuffixValues = useMemo(() => {
        return SOUND_SUFFIXES
            .map(getPatternNotation)
            .map((value) => value.split('/')[0].trim().replace(/^-+/, ''))
            .filter(Boolean);
    }, [SOUND_SUFFIXES]);

    // ── AUTOMATION: Feminine Suggestion ─────────────────────────────────────
    const suggestedFeminine = useMemo(() => {
        const isMasc = form.pos === 'noun'
            ? form.gender?.toLowerCase() === 'masculine'
            : (form.pos === 'adjective' || form.pos === 'participle') && form.gender?.toLowerCase() !== 'feminine';
        if (!form.headword || !isMasc) return null;
        if (form.pos !== 'noun' && form.pos !== 'adjective' && form.pos !== 'participle') return null;
        const base = form.lemma_base || form.headword;
        return deriveFeminineFromPattern(form.cv_pattern, base);
    }, [form.headword, form.cv_pattern, form.pos, form.gender, form.lemma_base]);

    // ── AUTOMATION: Masculine Suggestion (for feminine adj/nouns) ────────────
    const suggestedMasculine = useMemo(() => {
        const isFem = form.gender?.toLowerCase() === 'feminine';
        if (!form.headword || !isFem) return null;
        return deriveMasculineFromFeminine(form.headword);
    }, [form.headword, form.pos, form.gender]);

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
        const result = detectPluralType(form.headword, soundSuffixValues);
        if (!result) return null;
        // Return a string representation: e.g. "sound: -iet" or just "broken"
        if (result.type === 'sound' && result.suffix) return `${result.type}: -${result.suffix}`;
        return result.type;
    }, [form.headword, form._pluralType, soundSuffixValues]);

    // ── AUTOMATION: No Elative Tagging ─────────────────────────────────────
    useEffect(() => {
        if (!form.headword) return;

        const pluralForms = compactPluralRows(normalizePluralFormRows(form.plural_forms, form.form_plural_pattern))
            .map(row => row.form.trim())
            .filter(Boolean);

        let isNoElative = false;
        if (form.pos === 'adjective') {
            const hasFem = form.form_fem && form.form_fem !== '';
            const hasPlur = pluralForms.length > 0;
            const masc = form.lemma_base || '';
            if (hasFem && hasPlur && masc === form.headword && form.form_fem === form.headword && pluralForms.every(pl => pl === form.headword)) {
                isNoElative = true;
            }
        } else if (form.pos === 'noun') {
            const hasPlur = pluralForms.length > 0 || !!form.sound_suffix;
            if (hasPlur && form.lemma_base === form.headword && (pluralForms.includes(form.headword) || form.sound_suffix === form.headword)) {
                isNoElative = true;
            }
        }

        if (isNoElative) {
            const tags = form.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
            const normalized = tags.filter(t => t !== '$invariable' && t !== '$no-elative');
            if (!normalized.includes('$no-elative')) {
                set('tags', [...normalized, '$no-elative'].join(', '));
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
    }, [
        form.headword, form.pos, form.cv_pattern,
        form.lemma_base, form.form_fem, form.plural_forms, form.form_plural_pattern,
        form.sound_suffix
    ]);

    const set = (k: string, v: any) => {
        setForm((f: any) => {
            let next: any = f;
            let changed = false;
            const assign = (key: string, value: any) => {
                if (!Object.is(next[key], value)) {
                    if (next === f) next = { ...f };
                    next[key] = value;
                    changed = true;
                }
            };

            assign(k, v);

            // Sync headword to lemma_base/form_fem/form_masc
            if (k === 'headword' && ['noun', 'adjective', 'participle', 'numeral'].includes(next.pos)) {
                if (next.gender?.toLowerCase() === 'feminine') {
                    assign('form_fem', v);
                } else if (next.gender?.toLowerCase() === 'masculine') {
                    assign('lemma_base', v);
                    if (next.pos === 'numeral' && !next.form_masc) {
                        assign('form_masc', v);
                    }
                } else {
                    assign('lemma_base', v);
                }
            }

            // Sync CV pattern to gender-specific pattern for relevant POS
            if (k === 'cv_pattern' && ['noun', 'adjective', 'participle', 'numeral'].includes(next.pos)) {
                if (next.gender?.toLowerCase() === 'feminine') {
                    assign('form_fem_pattern', v);
                } else {
                    assign('form_masc_pattern', v);
                }
            }

            // Sync back when gender changes
            if (k === 'gender' && ['noun', 'adjective', 'participle', 'numeral'].includes(next.pos)) {
                // When switching gender, also ensure the headword is synced to the new base
                if (v?.toLowerCase() === 'feminine') {
                    assign('form_fem', next.headword);
                    if (next.form_fem_pattern) {
                        assign('cv_pattern', next.form_fem_pattern);
                    }
                } else {
                    assign('lemma_base', next.headword);
                    if (next.pos === 'numeral' && !next.form_masc) {
                        assign('form_masc', next.headword);
                    }
                    if (next.form_masc_pattern) {
                        assign('cv_pattern', next.form_masc_pattern);
                    }
                }
            }

            if (k === 'plural_forms' || k === 'form_plural_pattern' || k === 'inflections_pl') {
                if (k === 'plural_forms') {
                    const pluralRows = Array.isArray(v)
                        ? v
                        : normalizePluralFormRows(v, next.form_plural_pattern);
                    assign('plural_forms', pluralRows);
                    const compacted = compactPluralRows(pluralRows);
                    assign('inflections_pl', pluralRowsToLegacyForms(compacted).join(', '));
                    assign('form_plural_pattern', pluralRowsToLegacyPatternString(compacted));
                } else {
                    const rawInflections = k === 'inflections_pl' ? String(v ?? '').trim() : String(next.inflections_pl || '').trim();
                    if (k === 'inflections_pl' && !rawInflections) {
                        assign('plural_forms', []);
                        assign('inflections_pl', '');
                        assign('form_plural_pattern', '');
                    } else {
                        const pluralRows = compactPluralRows(normalizePluralFormRows(
                            k === 'inflections_pl' ? v : next.plural_forms,
                            k === 'form_plural_pattern' ? v : next.form_plural_pattern,
                        ));
                        assign('plural_forms', pluralRows);
                        assign('inflections_pl', pluralRowsToLegacyForms(pluralRows).join(', '));
                        assign('form_plural_pattern', pluralRowsToLegacyPatternString(pluralRows));
                    }
                }
            }

            return changed ? next : f;
        });
    };

    const normalizedPos = useMemo(() => form.pos?.toLowerCase() || '', [form.pos]);
    const isInflectedFunctionPos = ['pronoun', 'adverb', 'preposition', 'particle', 'article'].includes(normalizedPos);

    // Context-aware CV pattern suggestion for verbs
    const verbCvSuggestion = useMemo(() => {
        if (normalizedPos !== 'verb' && normalizedPos !== 'participle') return null;
        if (!form._formLabel) return null;
        return getVerbCvSuggestion(form._formLabel, form.verb_class || 'strong');
    }, [normalizedPos, form._formLabel, form.verb_class]);

    const suggestionDiffersFromCurrent = verbCvSuggestion && form.cv_pattern !== verbCvSuggestion.cv;

    const moveDefinition = (index: number, direction: 'up' | 'down') => {
        const next = [...form.definitions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return;
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        set('definitions', next);
    };

    const updateDefinitionField = (index: number, field: 'text_en' | 'text_mt' | 'register' | 'nuance', value: string) => {
        const next = [...form.definitions];
        next[index] = { ...next[index], [field]: value };
        set('definitions', normalizeEntryDefinitions(next));
    };

    const syncPatternRegistrations = async (
        entries: Array<{ category: string; key: string }>,
        currentPos: string,
    ) => {
        const seen = new Set<string>();
        const tasks: Promise<void>[] = [];

        for (const entry of entries) {
            const key = entry.key.trim();
            if (!key) continue;

            const dedupeKey = `${entry.category}:${key.toLowerCase()}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            tasks.push((async () => {
                const catMap = byCategoryAndKey.get(entry.category);
                const existing = catMap?.get(key.toLowerCase());
                const baseValue = entry.category === 'cv_wizen_pattern'
                    ? { cv: key, wizen: '', stress: 2, pos_types: [currentPos] }
                    : entry.category === 'sound_suffix'
                        ? { cv: key, wizen: stripLeadingDash(key), pos_types: [currentPos] }
                        : entry.category === 'derivational_suffix'
                            ? { cv: key, wizen: stripLeadingDash(key), pos_types: [currentPos] }
                        : { cv: key, wizen: '', pos_types: [currentPos] };

                if (!existing) {
                    try {
                        const mergedValue = mergePatternBucketApplicabilities(baseValue, [currentPos]);
                        await createItem({
                            category: entry.category,
                            key,
                            value: mergedValue,
                        }, { refresh: false });
                    } catch (err) {
                        console.error(`Failed to register ${entry.category}:`, err);
                    }
                    return;
                }

                if (!existing.id) return;

                try {
                    const val = typeof existing.value === 'string' ? JSON.parse(existing.value) : (existing.value || {});
                    const posTypes = Array.isArray(val.pos_types) ? val.pos_types : [];
                    const applicabilities = Array.isArray(val.applicabilities) ? val.applicabilities : [];
                    const hasCurrentApplicability = applicabilities.some((item: Record<string, unknown>) => String(item.pos ?? '').trim() === currentPos);
                    if (!posTypes.includes(currentPos) || !hasCurrentApplicability) {
                        const mergedValue = mergePatternBucketApplicabilities(val, [currentPos]);
                        await updateItem({
                            ...existing,
                            value: mergedValue,
                        }, { refresh: false });
                    }
                } catch (err) {
                    console.error(`Failed to update ${entry.category}:`, err);
                }
            })());
        }

        await Promise.all(tasks);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.headword.trim()) {
            setError(t('Headword is required', 'Mamma meħtieġa'));
            return;
        }
        if (isEdit && isMissingEntry) {
            setError(t(
                'This entry no longer exists in the database. Use "Duplicate as New" to save your changes as a new entry.',
                'Din l-entrata m’għadhiex teżisti fid-database. Uża "Ikkopja bħala Ġdid" biex issalva t-tibdil bħala entrata ġdida.'
            ));
            return;
        }

        // Normalise POS to lowercase for DB compatibility
        const currentPos = normalizedPos;

        setSaving(true);
        setError('');
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');

            const payload = formToPayload({
                ...form,
                pos: currentPos
            });

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

            const patternsToSync = [
                { category: 'cv_wizen_pattern', key: form.cv_pattern },
                { category: 'feminine_pattern', key: form.form_fem_pattern },
                ...((form.form_plural_pattern || '').split(',')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s)
                    .map((s: string) => ({
                        category: isDashMarkedSuffix(s) ? 'sound_suffix' : 'broken_pattern',
                        key: s,
                    }))),
                ...((form.augmentative_pattern || '').split(',')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s)
                    .filter((s: string) => isDashMarkedSuffix(s))
                    .map((s: string) => ({
                        category: 'derivational_suffix',
                        key: s,
                    }))),
            ];
            await syncPatternRegistrations(patternsToSync, normalizedPos);
            invalidateDistinctValuesCache();
            await refresh();
            setSavedSnapshot(buildFormSnapshot({ ...form, pos: currentPos }));

            onSaved();
        } catch (err: any) {
            let msg = err.message;
            if (msg.includes('ENTRY_NOT_FOUND')) {
                setIsMissingEntry(true);
                msg = t(
                    'This entry no longer exists in the database. Use "Duplicate as New" to save your changes as a new entry.',
                    'Din l-entrata m’għadhiex teżisti fid-database. Uża "Ikkopja bħala Ġdid" biex issalva t-tibdil bħala entrata ġdida.'
                );
            }
            if (msg.includes('FOREIGN KEY constraint failed')) {
                msg = t(
                    'Database error: A referenced item (e.g. the Entry itself) was not found. If this is a mock entry, please use "Duplicate as New" instead of "Save Changes".',
                    'Żball fid-database: Oġġett referenzjat ma nstabx. Jekk din hija entrata mock, jekk jogħġbok uża "Ikkopja bħala Ġdid" minflok "Issejva l-Bidliet".'
                );
            }
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [availableVowelSets, setAvailableVowelSets] = useState<string[]>([]);
    const [availableSources, setAvailableSources] = useState<string[]>([]);

    useEffect(() => {
        let active = true;

        Promise.all([
            apiGetDistinctValues('tags'),
            apiGetDistinctValues('vowel_sets'),
            apiGetDistinctValues('sources'),
        ])
            .then(([tags, vowelSets, sources]) => {
                if (!active) return;
                setAvailableTags(tags);
                setAvailableVowelSets(vowelSets);
                setAvailableSources(sources);
            })
            .catch(e => {
                if (active) console.error('Distinct values fetch error:', e);
            });

        return () => {
            active = false;
        };
    }, []);

    const conjugationPreview = useMemo(() => {
        if (normalizedPos !== 'verb' || !form._rootConsonants || !form.verb_vowel_perf || !form.verb_vowel_impf) return null;
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

    }, [normalizedPos, form._rootConsonants, form._formLabel, form.verb_class, form._weakClass, form.verb_vowel_perf, form.verb_vowel_impf]);

    const handleApplyDerivedTerms = () => {
        if (normalizedPos === 'numeral' && form._rootConsonants) {
            const auto = buildNumeralAutoForms(form.headword, form._rootConsonants);
            setForm((f: any) => seedNumeralDerivedFields(f, auto));
            return;
        }

        if (!conjugationPreview) return;
        const ptcpPass = (conjugationPreview as any).passiveParticiple || '';
        const ptcpAct = (conjugationPreview as any).activeParticiple || '';
        const vn = (conjugationPreview as any).verbalNoun || '';
        const perf3sgm = (conjugationPreview as any).perfective_3sg_m || (conjugationPreview as any).perfect || '';
        const impf3sgm = (conjugationPreview as any).imperfective_3sg_m || (conjugationPreview as any).imperfect || '';

        setForm((f: any) => ({
            ...f,
            verb_verbal_noun: f.verb_verbal_noun || (vn !== '-' ? vn : ''),
            verb_passive_ptcp: f.verb_passive_ptcp || (ptcpPass !== '-' ? ptcpPass : ''),
            verb_active_ptcp: f.verb_active_ptcp || (ptcpAct !== '-' ? ptcpAct : ''),
            verb_perfective_3sgm: f.verb_perfective_3sgm || perf3sgm,
            verb_imperfective_3sgm: f.verb_imperfective_3sgm || impf3sgm
        }));
    };

    const renderPosMorphologyFields = () => (
        <>
            {normalizedPos === 'noun' && (
                <NounFields
                    form={form}
                    set={set}
                    t={t}
                    styles={{ label, inp, sel, check: "w-4 h-4 text-[#1034A6] rounded border-black/20 focus:ring-[#1034A6]", grid: "grid grid-cols-1 sm:grid-cols-2 gap-4" }}
                    insertChar={insertChar}
                    onFocus={setActiveInput}
                    options={{
                        gender: GENDER_OPTIONS,
                        noun_type: NOUN_TYPE_OPTIONS,
                        patterns: nounPatterns,
                        dual_suffixes: DUAL_SUFFIX_OPTIONS,
                        derivational_suffixes: getValues('derivational_suffix')
                            .map(getPatternNotation)
                            .filter(Boolean)
                            .map((value) => ({ label: value, value })),
                        plural_patterns: pluralPatterns,
                        feminine_patterns: femininePatterns,
                        diminutive_patterns: diminutivePatterns,
                        suggestions: {
                            broken_pattern: suggestedBrokenPattern || undefined,
                            feminine: suggestedFeminine || undefined,
                            masculine: suggestedMasculine || undefined,
                            plural: pluralSuggestion || undefined
                        }
                    }}
                    onApplyDerivedTerms={handleApplyDerivedTerms}
                    suggestions={availableVowelSets}
                />
            )}

            {normalizedPos === 'pronoun' && !!form.is_inflectable && (
                <PronounFields
                    form={form}
                    set={set}
                    t={t}
                    styles={{ label, inp, sel, check: "w-4 h-4 text-[#1034A6] rounded border-black/20 focus:ring-[#1034A6]", grid: "grid grid-cols-1 sm:grid-cols-2 gap-4" }}
                    insertChar={insertChar}
                    onFocus={setActiveInput}
                    options={{
                        gender: GENDER_OPTIONS
                    }}
                />
            )}

            {normalizedPos === 'numeral' && (
                <NumeralFields
                    form={form}
                    set={set}
                    t={t}
                    styles={{ label, inp, sel, check: "w-4 h-4 text-[#1034A6] rounded border-black/20 focus:ring-[#1034A6]", grid: "grid grid-cols-1 sm:grid-cols-2 gap-4" }}
                    insertChar={insertChar}
                    onFocus={setActiveInput}
                    options={{
                        gender: GENDER_OPTIONS,
                        numeral_type: NUMERAL_TYPE_OPTIONS,
                    }}
                    onApplyDerivedTerms={handleApplyDerivedTerms}
                    suggestions={availableVowelSets}
                />
            )}

            {normalizedPos === 'verb' && (
                <VerbFields
                    form={form}
                    set={set}
                    t={t}
                    styles={{ label, inp, sel, check: "w-4 h-4 text-[#1034A6] rounded border-black/20 focus:ring-[#1034A6]", grid: "grid grid-cols-1 sm:grid-cols-2 gap-4" }}
                    insertChar={insertChar}
                    onFocus={setActiveInput}
                    options={{
                        verb_class: VERB_CLASS_OPTIONS,
                        verb_type: [
                            { label: t('Strong', 'Sħiħ'), value: 'strong' },
                            { label: t('Weak', 'Dgħajjef'), value: 'weak' },
                            { label: t('Doubled', 'Irmidlat'), value: 'doubled' }
                        ],
                        verb_transitivity: VERB_TRANSITIVITY_OPTIONS,
                        verb_form: VERB_FORM_OPTIONS
                    }}
                    onApplyDerivedTerms={handleApplyDerivedTerms}
                />
            )}

            {normalizedPos === 'adjective' && (
                <AdjectiveFields
                    form={form}
                    set={set}
                    t={t}
                    styles={{ label, inp, sel, check: "w-4 h-4 text-[#1034A6] rounded border-black/20 focus:ring-[#1034A6]", grid: "grid grid-cols-1 sm:grid-cols-2 gap-4" }}
                    insertChar={insertChar}
                    onFocus={setActiveInput}
                    options={{
                        gender: GENDER_OPTIONS,
                        patterns: adjPatterns,
                        dual_suffixes: DUAL_SUFFIX_OPTIONS,
                        elative_patterns: elativePatterns,
                        plural_patterns: pluralPatterns,
                        feminine_patterns: femininePatterns,
                        diminutive_patterns: diminutivePatterns
                    }}
                    suggestions={availableVowelSets}
                />
            )}

            {normalizedPos === 'participle' && (
                <ParticipleFields
                    form={form}
                    set={set}
                    t={t}
                    styles={{ label, inp, sel, check: "w-4 h-4 text-[#1034A6] rounded border-black/20 focus:ring-[#1034A6]", grid: "grid grid-cols-1 sm:grid-cols-2 gap-4" }}
                    insertChar={insertChar}
                    onFocus={setActiveInput}
                    options={{
                        participle_type: PARTICIPLE_TYPES,
                        participle_gender: GENDER_OPTIONS,
                        patterns: adjPatterns,
                        elative_patterns: elativePatterns,
                        plural_patterns: pluralPatterns,
                        feminine_patterns: femininePatterns,
                        diminutive_patterns: diminutivePatterns
                    }}
                    suggestions={availableVowelSets}
                />
            )}

            {isInflectedFunctionPos && !form.is_inflectable && normalizedPos !== 'interjection' && (
                <p className="text-xs text-black/50 italic">
                    {t('No morphology fields when inflection is disabled.', 'L-ebda oqsma ta\' morfoloġija meta l-inflessjoni hija mitfija.')}
                </p>
            )}
        </>
    );

    const inp = "w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black";
    const sel = inp + " cursor-pointer";
    const label = "block text-xs font-semibold text-black uppercase tracking-wider mb-1";

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal
            open={true}
            onClose={handleClose}
            title={isEdit ? t('Edit Entry', 'Editja l-Entrata') : t('New Entry', 'Entrata Ġdida')}
            size="xl"
        >
            <div className="flex flex-col h-full min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-8 p-1">
                    {isLoadingFull && (
                        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
                        </div>
                    )}
                    {isEdit && isMissingEntry && (
                        <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded px-3 py-2 text-sm">
                            {t(
                                'This entry no longer exists in the database. Use "Duplicate as New" to save your changes as a new entry.',
                                'Din l-entrata m’għadhiex teżisti fid-database. Uża "Ikkopja bħala Ġdid" biex issalva t-tibdil bħala entrata ġdida.'
                            )}
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
                                onChange={e => set('id', e.target.value)}
                                className={cn(
                                    "w-full p-2 bg-white border rounded-lg text-sm transition-all font-mono",
                                    idExists === true ? "border-red-500 ring-1 ring-red-500/20" : "border-black/10 focus:border-[#1034A6]"
                                )}
                                placeholder="e.g. v-fagħal"
                            />
                            {suggestedId && form.id !== suggestedId && (
                                <button
                                    onClick={() => set('id', suggestedId)}
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
                            <label className={label}>{t('POS', 'POS')} *</label>
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
                            <div className="space-y-1.5 pt-2">
                                <label className={label}>{t('Stem', 'Żokk')}</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-serif">-</span>
                                    <input className={`${inp} pl-5 pr-5 font-serif`} value={form.zokk_stem}
                                        onChange={e => set('zokk_stem', e.target.value)} placeholder="kanta" />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-serif">-</span>
                                </div>
                            </div>
                            {hasDualMorphology && (
                                <label className="flex items-center gap-2 text-sm font-medium text-black pt-1">
                                    <input
                                        type="checkbox"
                                        checked={!!form.prefer_zokk}
                                        onChange={e => set('prefer_zokk', e.target.checked)}
                                        className="w-4 h-4 text-[#1034A6] rounded"
                                    />
                                    <span>{t('Prioritise stem (loanword)', 'Prioritizza ż-żokk (self)')}</span>
                                </label>
                            )}
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
                                    placeholder={form._inheritedPattern ? `${form._inheritedPattern} (inherited)` : "e.g. Fagħal or CCvC"}
                                />
                                {form._inheritedPattern && !form.cv_pattern && (
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-black/25 font-mono text-sm">
                                        {form._inheritedPattern} <span className="text-[10px] italic">{t('Inherited', 'Inherited')}</span>
                                    </div>
                                )}
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
                            {form._formLabel && (normalizedPos === 'verb' || normalizedPos === 'participle' || (normalizedPos === 'noun' && form.noun_type === 'verbal')) && (
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

                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-4 mb-2.5 px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isNotable}
                                        onChange={e => setIsNotable(e.target.checked)}
                                        className="w-3.5 h-3.5 text-[#1034A6] border-black/20 rounded focus:ring-0 focus:ring-offset-0"
                                    />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/60 group-hover:text-black transition-colors">{t('Notable (!)', 'Notabbli (!)')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={(typeof form.tags === 'string' ? form.tags.split(',') : (form.tags || [])).map((t: string) => t.trim()).some((t: string) => t === '$invariable' || t === '$no-elative')}
                                        onChange={e => {
                                            const tags = (typeof form.tags === 'string' ? form.tags.split(',') : (form.tags || [])).map((t: string) => t.trim()).filter(Boolean);
                                            let next;
                                            if (e.target.checked) {
                                                next = [...tags.filter(t => t !== '$invariable' && t !== '$no-elative'), '$no-elative'];
                                            } else {
                                                next = tags.filter(t => t !== '$invariable' && t !== '$no-elative');
                                            }
                                            set('tags', Array.from(new Set(next)).join(', '));
                                        }}
                                        className="w-3.5 h-3.5 text-[#1034A6] border-black/20 rounded focus:ring-0 focus:ring-offset-0"
                                    />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/60 group-hover:text-black transition-colors">{t('No Elative', 'L-ebda Elattiv')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={!!form.is_inflectable}
                                        onChange={e => setForm((current: any) => applyInflectableToggle(current, e.target.checked))}
                                        className="w-3.5 h-3.5 text-[#1034A6] border-black/20 rounded focus:ring-0 focus:ring-offset-0"
                                    />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/60 group-hover:text-black transition-colors">{t('Has Inflection', 'Għandu Inflessjoni')}</span>
                                </label>
                            </div>

                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-black/10 rounded-lg">
                                {form.tags && (typeof form.tags === 'string' ? form.tags.split(',') : form.tags).map((tag: string) => {
                                    const clean = tag.trim();
                                    if (!clean) return null;
                                    return (
                                        <Badge key={clean} variant="tag" className="bg-white border-black/10 text-black pr-1">
                                            {resolveTagLabel(clean, term)}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const tags = typeof form.tags === 'string' ? form.tags.split(',') : (form.tags || []);
                                                    set('tags', tags.map((t: string) => t.trim()).filter((t: string) => t !== clean).join(', '));
                                                }}
                                                className="ml-1 hover:text-red-500"
                                            >
                                                &times;
                                            </button>
                                        </Badge>
                                    );
                                })}
                                <input
                                    className="bg-transparent text-sm focus:outline-none min-w-[100px] flex-1 text-black"
                                    placeholder={t('Add tag...', 'Żid tikketta...')}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            let val = e.currentTarget.value.trim();
                                            if (val) {
                                                if (isNotable && !val.startsWith('!')) {
                                                    val = '!' + val;
                                                }
                                                const tags = typeof form.tags === 'string' ? form.tags.split(',') : (form.tags || []);
                                                const next = [...tags.map((t: string) => t.trim()).filter(Boolean), val];
                                                set('tags', Array.from(new Set(next)).join(', '));
                                                e.currentTarget.value = '';
                                                if (isNotable) setIsNotable(false); // Reset high-intensity prefix after use
                                            }
                                        }
                                    }}
                                    onBlur={e => {
                                        let val = e.currentTarget.value.trim();
                                        if (val) {
                                            if (isNotable && !val.startsWith('!')) {
                                                val = '!' + val;
                                            }
                                            const tags = typeof form.tags === 'string' ? form.tags.split(',') : (form.tags || []);
                                            const next = [...tags.map((t: string) => t.trim()).filter(Boolean), val];
                                            set('tags', Array.from(new Set(next)).join(', '));
                                            if (isNotable) setIsNotable(false);
                                        }
                                        e.currentTarget.value = '';
                                    }}
                                />
                            </div>
                            <SuggestionRow
                                label={t('Existing Tags', 'Tikketti Eżistenti')}
                                options={availableTags.filter(t => {
                                    const current = typeof form.tags === 'string' ? form.tags.split(',').map((s: string) => s.trim()) : (form.tags || []);
                                    return !current.includes(t);
                                }).slice(0, 15)}
                                onSelect={tag => {
                                    let finalTag = tag;
                                    if (isNotable && !finalTag.startsWith('!')) {
                                        finalTag = '!' + finalTag;
                                    }
                                    const tags = typeof form.tags === 'string' ? form.tags.split(',') : (form.tags || []);
                                    const next = [...tags.map((t: string) => t.trim()).filter(Boolean), finalTag];
                                    set('tags', Array.from(new Set(next)).join(', '));
                                    if (isNotable) setIsNotable(false);
                                }}
                            />
                        </div>
                    </div>

                    {/* Phonetics & Dialects Builder */}
                    <fieldset className="border border-border-light rounded-lg p-4 space-y-4">
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

                    {/* Morphology Section */}
                    {normalizedPos !== 'interjection' && (
                        <div className="mt-6">
                            <h3 className="text-sm font-bold text-black border-b border-border pb-2 mb-4">
                                {isStemMorphology
                                    ? t('Stem Morphology', 'Morfoloġija taż-Żokk')
                                    : t('Morphology', 'Morfoloġija')}
                            </h3>

                            {isStemMorphology ? (
                                <div className="space-y-5">
                                    <StemMorphologyFields
                                        form={form}
                                        set={set}
                                        t={t}
                                        styles={{ label, inp, sel, grid: "grid grid-cols-1 sm:grid-cols-2 gap-4" }}
                                        hasRootConsonants={hasRootConsonants}
                                        sourceLanguageOptions={SOURCE_LANGUAGE_OPTIONS}
                                    />
                                    <div className="pt-4 border-t border-slate-200">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-3">
                                            {t('Entry Morphology', 'Morfoloġija tal-Entrata')}
                                        </h4>
                                        {renderPosMorphologyFields()}
                                    </div>
                                </div>
                            ) : (
                                renderPosMorphologyFields()
                            )}
                        </div>
                    )}

                    {/* Definitions */}
                    <fieldset className="border border-border-light rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <legend className="text-xs font-semibold text-black uppercase tracking-tight">{t('Definitions', 'Definizzjonijiet')}</legend>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                                disabled={form.definitions.length >= 10}
                                onClick={() => set('definitions', [...form.definitions, { text_en: '', text_mt: '', register: '', nuance: '' }])}>
                                + {t('Add Sense', 'Żid Sens')}
                            </Button>
                        </div>
                        <p className="px-1 -mt-2 text-[10px] text-black/40">
                            {t('Use semicolons to split one sense into separate entries.', 'Uża s-semikolon biex tifred sens wieħed f\'entrati separati.')}
                        </p>

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
                                            <span className="sr-only">{t('Delete', 'Delete')}</span>
                                            &times;
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className={label}>{t('Sense', 'Sens')} {i + 1}: {t('English', 'Ingliż')} *</label>
                                        <input className={inp} value={def.text_en} onChange={e => updateDefinitionField(i, 'text_en', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className={label}>{t('Maltese', 'Malti')}</label>
                                        <input className={inp} value={def.text_mt ?? ''} onChange={e => updateDefinitionField(i, 'text_mt', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={label}>{term('register')}</label>
                                        <select className={sel} value={def.register} onChange={e => updateDefinitionField(i, 'register', e.target.value)}>
                                            <option value="">—</option>
                                            {REGISTER_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    {normalizedPos === 'participle' && (
                                        <div>
                                            <label className={label}>{t('Nuance', 'Sfumatura')}</label>
                                            <select className={sel} value={def.nuance || ''} onChange={e => updateDefinitionField(i, 'nuance', e.target.value)}>
                                                <option value="">—</option>
                                                {PARTICIPLE_NUANCES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </fieldset>

                    {/* Usage Example */}
                    <fieldset className="border border-border-light rounded-lg p-4 space-y-3">
                        <legend className="text-xs font-semibold text-black uppercase tracking-tight px-1">
                            {term('usage-example')}
                        </legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={label}>{`${term('maltese')} ${term('sentence')}`}</label>
                                <input
                                    className={inp}
                                    value={form.usage_example || ''}
                                    onChange={e => set('usage_example', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={label}>{`${term('english')} ${term('sentence')}`}</label>
                                <input
                                    className={inp}
                                    value={form.usage_example_en || ''}
                                    onChange={e => set('usage_example_en', e.target.value)}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Relationships (Thesaurus & Derived Terms) */}
                    <Suspense fallback={<div className="rounded-xl border border-border-light bg-slate-50 p-4 text-xs text-black/40">{t('Loading relationship editors…', 'Qed jitgħabbu l-editors tar-relazzjonijiet…')}</div>}>
                        <div className="space-y-6">
                            <LazyRelationshipEditor
                                type="derived"
                                title={t('Alternative Forms', 'Forom Alternattivi')}
                                items={(form as any).alternative_forms || []}
                                onChange={(items) => set('alternative_forms', items)}
                                enableSuggestions
                                suggestionScope="entries"
                                currentEntryId={form.id}
                                extraActions={[
                                    { label: t('New Entry', 'Entrata Ġdida'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=entry', '_blank') }
                                ]}
                            />
                            <LazyRelationshipEditor
                                type="derived"
                                title={t('Derived Terms', 'Termini Derivati')}
                                items={form.related_entries || []}
                                onChange={(items) => set('related_entries', items)}
                                enableSuggestions
                                suggestionScope="entries"
                                currentEntryId={form.id}
                                extraActions={[
                                    { label: t('New Entry', 'Entrata Ġdida'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=entry', '_blank') },
                                    { label: t('New Root', 'Għerq Ġdid'), icon: <Plus size={12} />, onClick: () => window.open('/admin?tab=roots&new=root', '_blank') }
                                ]}
                            />
                            <LazyRelationshipEditor
                                type="thesaurus"
                                title={t('Synonyms', 'Sinonimi')}
                                items={form.synonyms || []}
                                onChange={(items) => set('synonyms', items)}
                                enableSuggestions
                                suggestionScope="entries"
                                currentEntryId={form.id}
                                extraActions={[
                                    { label: t('New Entry', 'Entrata Ġdida'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=entry', '_blank') }
                                ]}
                            />
                            <LazyRelationshipEditor
                                type="thesaurus"
                                title={t('Antonyms', 'Antonimi')}
                                items={form.antonyms || []}
                                onChange={(items) => set('antonyms', items)}
                                enableSuggestions
                                suggestionScope="entries"
                                currentEntryId={form.id}
                                extraActions={[
                                    { label: t('New Entry', 'Entrata Ġdida'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=entry', '_blank') }
                                ]}
                            />
                        </div>
                    </Suspense>

                    {/* Etymology Builder */}
                    <Suspense fallback={<div className="rounded-xl border border-border-light bg-slate-50 p-4 text-xs text-black/40">{t('Loading etymology editor…', 'Qed jitgħabba l-editor tal-etimoloġija…')}</div>}>
                        <div className="space-y-4">
                            {autoFilledFields.has('etymology_chain') && (
                                <div className="flex items-center gap-1 px-1 mb-2 text-[10px] text-blue-500 animate-pulse">
                                    <span>✦</span>
                                    <span>{t('Inherited from root', 'Miret mill-għerq')}</span>
                                    <button
                                        type="button"
                                        className="ml-1 hover:text-blue-700 underline"
                                        onClick={() => {
                                            set('etymology_chain', []);
                                            const next = new Set(autoFilledFields);
                                            next.delete('etymology_chain');
                                            replaceAutoFilledFields(next);
                                        }}
                                    >
                                        {t('reset', 'irrisettja')}
                                    </button>
                                </div>
                            )}

                            <LazyEtymologyChainEditor
                                title={t('Etymology Builder', 'Oriġini tal-Kelma')}
                                items={form.etymology_chain}
                                onChange={(items) => set('etymology_chain', items)}
                                showPronunciation
                                relationshipOptions={RELATIONSHIP_OPTIONS}
                                sourceLanguageOptions={SOURCE_LANGUAGE_OPTIONS}
                                defaultRelationship="From"
                                addLabel={t('Add Step', 'Żid Pass')}
                                relationshipLabel={t('Relationship', 'Relazzjoni')}
                                languageLabel={t('Language', 'Lingwa')}
                                termLabel={t('Term', 'Kelma')}
                                pronunciationLabel={t('Pronunciation', 'Pronunzja')}
                                pronunciationPlaceholder={t('e.g. kan-ta-re', 'eż. kan-ta-re')}
                                definitionLabel={t('Definition', 'Tifsira')}
                                labelClassName={label}
                                inputClassName={inp}
                                selectClassName={sel}
                            />

                            <div className="pt-2">
                                <label className={label}>{t('Source Citation', 'Sors / Referenza')}</label>
                                <input
                                    className={inp}
                                    value={form.source_citation}
                                    onChange={e => {
                                        set('source_citation', e.target.value);
                                        if (autoFilledFields.has('source_citation')) {
                                            const next = new Set(autoFilledFields);
                                            next.delete('source_citation');
                                            replaceAutoFilledFields(next);
                                        }
                                    }}
                                    placeholder={t('e.g. Aquilina1987', 'eż. Aquilina1987')}
                                />
                                <SuggestionRow
                                    options={availableSources.slice(0, 10)}
                                    onSelect={src => set('source_citation', src)}
                                />
                                {autoFilledFields.has('source_citation') && (
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-500 animate-pulse">
                                        <span>✦</span>
                                        <span>{t('Inherited from root', 'Miret mill-għerq')}</span>
                                        <button
                                            type="button"
                                            className="ml-1 hover:text-blue-700 underline"
                                            onClick={() => {
                                                set('source_citation', '');
                                                const next = new Set(autoFilledFields);
                                                next.delete('source_citation');
                                                replaceAutoFilledFields(next);
                                            }}
                                        >
                                            {t('reset', 'irrisettja')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Suspense>

                    {/* Dynamic Fields (for new DB columns) */}
                    {Object.keys(form.extraFields || {}).length > 0 && (
                        <fieldset className="border border-amber-100 bg-amber-50/20 rounded-lg p-4 space-y-3">
                            <legend className="text-[10px] font-bold text-amber-600 uppercase tracking-widest px-2">{t('Additional Fields', 'Ghelta Oħra')}</legend>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(form.extraFields).map(key => (
                                    <div key={key}>
                                        <label className={label}>{key}</label>
                                        <input
                                            className={inp}
                                            value={form.extraFields[key] ?? ''}
                                            onChange={e => setForm(prev => ({
                                                ...prev,
                                                extraFields: {
                                                    ...prev.extraFields,
                                                    [key]: e.target.value
                                                }
                                            }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    )}
                </div>

                <div className="flex justify-between items-center pt-4 mt-4 border-t border-black/10 bg-white px-1 shrink-0">
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
                                    setError('');
                                    try {
                                        const token = await getToken();
                                        if (!token) throw new Error("Not authenticated");
                                        const currentPos = normalizedPos;
                                        const payload = formToPayload({
                                            ...form,
                                            pos: currentPos
                                        });
                                        if (entry && payload.id === entry.id) {
                                            delete payload.id;
                                        }
                                        await adminCreateEntry(token, payload);

                                        const syncList = [
                                            { category: 'cv_wizen_pattern', key: form.cv_pattern },
                                            { category: 'feminine_pattern', key: form.form_fem_pattern },
                                            ...((form.form_plural_pattern || '').split(',')
                                                .map((s: string) => s.trim())
                                                .filter((s: string) => s)
                                                .map((s: string) => ({
                                                    category: isDashMarkedSuffix(s) ? 'sound_suffix' : 'broken_pattern',
                                                    key: s,
                                                }))),
                                            ...((form.augmentative_pattern || '').split(',')
                                                .map((s: string) => s.trim())
                                                .filter((s: string) => s)
                                                .filter((s: string) => isDashMarkedSuffix(s))
                                                .map((s: string) => ({
                                                    category: 'derivational_suffix',
                                                    key: s,
                                                }))),
                                        ];
                                        await syncPatternRegistrations(syncList, currentPos);
                                        invalidateDistinctValuesCache();
                                        await refresh();
                                        setSavedSnapshot(buildFormSnapshot({ ...form, pos: currentPos }));

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
                        <Button type="button" onClick={handleSave} loading={saving} disabled={isEdit && isMissingEntry}>
                            {isEdit ? t('Save Changes', 'Issejva l-Bidliet') : t('Create Entry', 'Oħloq Entrata')}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
