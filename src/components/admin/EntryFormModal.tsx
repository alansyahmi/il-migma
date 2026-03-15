import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Plus, RefreshCw, RotateCcw, Keyboard, Sparkles, ArrowUp, ArrowDown, AlertTriangle
} from 'lucide-react';
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
import { entryToForm, formToPayload, INITIAL_FORM_STATE } from '@/lib/entryAdapter';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { 
    generateIPA, deriveFeminineFromPattern, deriveMasculineFromFeminine, 
    detectPluralType, derivePattern, extractLongVowelFromPattern, 
    generateNumeralForms 
} from '@/lib/maltesePhonology';
import { resolveEntryGender } from '@/lib/gender';
import { ENTRY_HANDLED_FIELDS } from '@/lib/adminSchema';

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
    root_consonants?: string;
    verb_form?: string;
    tags?: string | string[];
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


// ── Components for Morphology Fields ──────────────────────────────────────

interface MorphologyProps {
    form: any;
    set: (field: string, value: any) => void;
    t: (en: string, mt: string) => string;
    styles: {
        label: string;
        inp: string;
        sel: string;
        check: string;
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
        broken_patterns?: any[];
        cv_wizen_patterns?: any[];
        sound_suffixes?: string[];
        patterns?: { label: string; value: string; sub?: string }[];
        suggestions?: {
            broken_pattern?: string;
            feminine?: string;
            masculine?: string;
            plural?: string;
        };
        verb_presets?: Record<string, any>;
    };
    onApplyDerivedTerms?: () => void;
}

const CharRow = ({ onInsert }: { onInsert: (c: string) => void }) => (
    <div className="flex gap-1 mt-1">
        {['à', 'â', 'ċ', 'ġ', 'ħ', 'ż'].map(c => (
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

const VowelSetRow = ({ form, set, t, styles, onFocus, insertChar, fields }: MorphologyProps & { fields: { key: string; label: string; placeholder?: string }[] }) => (
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
                <CharRow onInsert={insertChar} />
            </div>
        ))}
    </div>
);

const NounFields = ({ form, set, t, styles, insertChar, onFocus, options }: MorphologyProps) => {
    const isCollectiveOrSingulative = form.is_collective || form.is_singulative;

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
                {(!form.gender || form.gender === '') && (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label className={styles.label}>{t('Masculine', 'Maskil')}</label>
                                <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} placeholder="e.g. kelliem" />
                            </div>
                            <div>
                                <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                                <input className={styles.inp} value={form.form_masc_pattern || ''} onChange={e => set('form_masc_pattern', e.target.value)} placeholder="e.g. CaCCaC" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className={styles.label}>{t('Feminine', 'Femminil')}</label>
                                <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} placeholder="e.g. kelliema" />
                            </div>
                            <div>
                                <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                                <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} placeholder="e.g. CaCCaCa" />
                            </div>
                        </div>
                    </>
                )}
                {form.gender?.toLowerCase() === 'masculine' && (
                    <>
                        <div>
                            <label className={styles.label}>{t('Feminine', 'Femminil')}</label>
                            <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} placeholder="e.g. kelliema" />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                            <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} placeholder="e.g. CaCCaCa" />
                        </div>
                    </>
                )}
                {form.gender?.toLowerCase() === 'feminine' && (
                    <>
                        <div>
                            <label className={styles.label}>{t('Masculine', 'Maskil')}</label>
                            <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} placeholder="e.g. kelliem" />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                            <input className={styles.inp} value={form.form_masc_pattern || ''} onChange={e => set('form_masc_pattern', e.target.value)} placeholder="e.g. CaCCaC" />
                        </div>
                    </>
                )}
            </div>

            <div className="flex gap-4 p-3 bg-surface-soft rounded-lg border border-border">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className={styles.check} checked={!!form.is_collective} onChange={e => set('is_collective', e.target.checked)} />
                    <span className="text-sm font-medium">{t('Collective', 'Kollettiv')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className={styles.check} checked={!!form.is_singulative} onChange={e => set('is_singulative', e.target.checked)} />
                    <span className="text-sm font-medium">{t('Singulative', 'Singolattiv')}</span>
                </label>
            </div>

            <div className={styles.grid}>
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>
                            {form.is_collective ? t('Collective Form', 'Forma Kollettiva') :
                                form.is_singulative ? t('Singulative Form', 'Forma Singulattiva') :
                                    t('Singular', 'Singular')}
                        </label>
                        <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Lemma Pattern', 'Mudell tal-Lemma')}</label>
                        <input className={styles.inp} value={form.lemma_pattern || ''} onChange={e => set('lemma_pattern', e.target.value)} placeholder="e.g. CaCC" />
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>
                            {isCollectiveOrSingulative ? t('Singulative Form', 'Forma Singulattiva') : t('Plural (Broken)', 'Plural (Miksur)')}
                        </label>
                        <input className={styles.inp} value={form.inflections_pl || ''} onChange={e => set('inflections_pl', e.target.value)} placeholder="e.g. klieb, djar" />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Plural Pattern', 'Mudell tal-Plural')}</label>
                        <input className={styles.inp} value={form.form_plural_pattern || ''} onChange={e => set('form_plural_pattern', e.target.value)} placeholder="e.g. CCieC" />
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>{t('Dual Form', 'Forma Doppja')}</label>
                        <input className={styles.inp} value={form.dual_form || ''} onChange={e => set('dual_form', e.target.value)} placeholder="e.g. xahrejn" />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Dual Pattern', 'Mudell tad-Doppja')}</label>
                        <input className={styles.inp} value={form.dual_pattern || ''} onChange={e => set('dual_pattern', e.target.value)} placeholder="e.g. CaCCejn" />
                    </div>
                </div>
                <div>
                    <label className={styles.label}>{t('Diminutive', 'Diminuttiv')}</label>
                    <input className={styles.inp} value={form.diminutive_form || ''} onChange={e => set('diminutive_form', e.target.value)} placeholder="e.g. kittejeb" />
                </div>
            </div>

            <VowelSetRow
                form={form} set={set} t={t} styles={styles} onFocus={onFocus} insertChar={insertChar}
                fields={[
                    { key: 'vowel_set_sg', label: 'Vowel Set (Singular)', placeholder: 'e.g. i-a' },
                    { key: 'vowel_set_opp', label: 'Vowel Set (Opp. Gender)', placeholder: 'e.g. i-a' },
                    { key: 'vowel_set_dual', label: 'Vowel Set (Dual)', placeholder: 'e.g. i-e' },
                    { key: 'vowel_set_pl', label: 'Vowel Set (Plural)', placeholder: 'e.g. i-ie' }
                ]}
            />

            <div className={styles.grid}>
                <div>
                    <label className={styles.label}>{t('Sound Plural', 'Plural Sħiħ')}</label>
                    <input className={styles.inp} value={form.sound_suffix || ''} onChange={e => set('sound_suffix', e.target.value)} placeholder="e.g. skieken" />
                </div>
                <div>
                    <label className={styles.label}>{t('Broken Pattern', 'Mudell miksur')}</label>
                    <input className={styles.inp} value={form.morph_pattern || ''} onChange={e => set('morph_pattern', e.target.value)} />
                    {options?.suggestions?.broken_pattern && form.morph_pattern !== options.suggestions.broken_pattern && (
                        <button type="button" onClick={() => set('morph_pattern', options.suggestions!.broken_pattern)} className="mt-1 text-[10px] text-blue-600 hover:underline">
                            {t('Suggest', 'Sugġeriment')}: {options.suggestions.broken_pattern}
                        </button>
                    )}
                </div>
            </div>

            <div>
                <label className={styles.label}>{t('Patterns', 'Mudelli')}</label>
                <div className="flex flex-wrap gap-2">
                    {options?.patterns?.map((opt: any) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => set('morph_pattern', opt.value)}
                            className={cn(
                                "px-2 py-1 text-[10px] rounded border transition-all",
                                form.morph_pattern === opt.value
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                            )}
                        >
                            {opt.label} {opt.sub && <span className="opacity-50 ml-1 font-normal">({opt.sub})</span>}
                        </button>
                    ))}
                </div>
            </div>

            <NonVerbalPatternPlacementFields form={form} set={set} t={t} styles={styles} />
        </div>
    );
};


interface NonVerbalPatternProps {
    form: any;
    set: (field: string, value: any) => void;
    t: (en: string, mt: string) => string;
    styles: { label: string; inp: string; grid: string; };
}

const NonVerbalPatternPlacementFields = ({ form, set, t, styles }: NonVerbalPatternProps) => (
    <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <label className={styles.label}>{t('Form Pattern Placements', 'Postijiet tal-Mudelli')}</label>
        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Lemma Pattern', 'Mudell tal-Lemma')}</label>
                <input className={styles.inp} value={form.lemma_pattern || ''} onChange={e => set('lemma_pattern', e.target.value)} placeholder="e.g. CvCvC" />
            </div>
            <div>
                <label className={styles.label}>{t('Feminine Pattern', 'Mudell Femminili')}</label>
                <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} placeholder="e.g. CvCvCa" />
            </div>
            <div>
                <label className={styles.label}>{t('Masculine Pattern', 'Mudell Maskili')}</label>
                <input className={styles.inp} value={form.form_masc_pattern || ''} onChange={e => set('form_masc_pattern', e.target.value)} placeholder="e.g. CvCvC" />
            </div>
            <div>
                <label className={styles.label}>{t('Plural Pattern', 'Mudell tal-Plural')}</label>
                <input className={styles.inp} value={form.form_plural_pattern || ''} onChange={e => set('form_plural_pattern', e.target.value)} placeholder="e.g. CCvC" />
            </div>
            <div>
                <label className={styles.label}>{t('Dual Pattern', 'Mudell Doppju')}</label>
                <input className={styles.inp} value={form.dual_pattern || ''} onChange={e => set('dual_pattern', e.target.value)} placeholder="e.g. CvCvCejn" />
            </div>
        </div>
    </div>
);

const AdjectiveFields = ({ form, set, t, styles, options, insertChar, onFocus }: MorphologyProps) => (
    <div className="space-y-4">
        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Gender', 'Ġens')}</label>
                <select className={styles.sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">{t('Select...', 'Agħżel...')}</option>
                    {options?.gender?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
            </div>
            {(!form.gender || form.gender === '') && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Masculine', 'Maskil')}</label>
                            <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                            <input className={styles.inp} value={form.lemma_pattern || ''} onChange={e => set('lemma_pattern', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Feminine', 'Femminil')}</label>
                            <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                            <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} />
                        </div>
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'masculine' && (
                <>
                    <div>
                        <label className={styles.label}>{t('Feminine', 'Femminil')}</label>
                        <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                        <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} />
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'feminine' && (
                <>
                    <div>
                        <label className={styles.label}>{t('Masculine', 'Maskil')}</label>
                        <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                        <input className={styles.inp} value={form.lemma_pattern || ''} onChange={e => set('lemma_pattern', e.target.value)} />
                    </div>
                </>
            )}
        </div>
        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Plural', 'Plural')}</label>
                    <input className={styles.inp} value={form.inflections_pl || ''} onChange={e => set('inflections_pl', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Plural Pattern', 'Mudell tal-Plural')}</label>
                    <input className={styles.inp} value={form.form_plural_pattern || ''} onChange={e => set('form_plural_pattern', e.target.value)} />
                </div>
            </div>
            <div>
                <label className={styles.label}>{t('Elative (Comparative)', 'Elattiv (Komparattiv)')}</label>
                <input className={styles.inp} value={form.elative_form || ''} onChange={e => set('elative_form', e.target.value)} />
            </div>
        </div>

        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Dual Form', 'Forma Doppja')}</label>
                    <input className={styles.inp} value={form.dual_form || ''} onChange={e => set('dual_form', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Dual Pattern', 'Mudell tad-Doppja')}</label>
                    <input className={styles.inp} value={form.dual_pattern || ''} onChange={e => set('dual_pattern', e.target.value)} />
                </div>
            </div>
            <div>
                <label className={styles.label}>{t('Diminutive', 'Diminuttiv')}</label>
                <input className={styles.inp} value={form.diminutive_form || ''} onChange={e => set('diminutive_form', e.target.value)} />
            </div>
        </div>

        <VowelSetRow
            form={form} set={set} t={t} styles={styles} onFocus={onFocus} insertChar={insertChar}
            fields={[
                { key: 'vowel_set_sg', label: 'Vowel Set (Singular)', placeholder: 'e.g. i-a' },
                { key: 'vowel_set_opp', label: 'Vowel Set (Opp. Gender)', placeholder: 'e.g. i-a' },
                { key: 'vowel_set_dual', label: 'Vowel Set (Dual)', placeholder: 'e.g. i-e' },
                { key: 'vowel_set_pl', label: 'Vowel Set (Plural)', placeholder: 'e.g. i-ie' }
            ]}
        />
        <div>
            <label className={styles.label}>{t('Patterns', 'Mudelli')}</label>
            <div className="flex flex-wrap gap-2">
                {options?.patterns?.map((opt: any) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('morph_pattern', opt.value)}
                        className={cn(
                            "px-2 py-1 text-[10px] rounded border transition-all",
                            form.morph_pattern === opt.value
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                        )}
                    >
                        {opt.label} {opt.sub && <span className="opacity-50 ml-1 font-normal">({opt.sub})</span>}
                    </button>
                ))}
            </div>
        </div>

        <NonVerbalPatternPlacementFields form={form} set={set} t={t} styles={styles} />
    </div>
);

const VerbFields = ({ form, set, t, styles, onFocus, options, onApplyDerivedTerms }: MorphologyProps) => {
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
                    <label className={styles.label}>{t('Class', 'Klassi')}</label>
                    <select className={styles.sel} value={form.verb_class} onChange={e => set('verb_class', e.target.value)}>
                        <option value="">{t('Select...', 'Agħżel...')}</option>
                        {options?.verb_class?.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className={styles.label}>{t('Type', 'Tip')}</label>
                    <select className={styles.sel} value={form.verb_type} onChange={e => set('verb_type', e.target.value)}>
                        <option value="">{t('Select...', 'Agħżel...')}</option>
                        {options?.verb_type?.map((cat: any) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                </div>
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
                    <input className={styles.inp} value={form.verb_vowel_perf} onChange={e => set('verb_vowel_perf', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Vowel Set (Impf)', 'Sett ta\' vokali (Impf)')}</label>
                    <input className={styles.inp} value={form.verb_vowel_impf} onChange={e => set('verb_vowel_impf', e.target.value)} />
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

const ParticipleFields = ({ form, set, t, styles, options, insertChar, onFocus }: MorphologyProps) => (
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
                            <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                            <input className={styles.inp} value={form.lemma_pattern || ''} onChange={e => set('lemma_pattern', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                            <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                            <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} />
                        </div>
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'masculine' && (
                <>
                    <div>
                        <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                        <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                        <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} />
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'feminine' && (
                <>
                    <div>
                        <label className={styles.label}>{t('Masculine Form', 'Maskil')}</label>
                        <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                        <input className={styles.inp} value={form.lemma_pattern || ''} onChange={e => set('lemma_pattern', e.target.value)} />
                    </div>
                </>
            )}
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Plural Form', 'Plural')}</label>
                    <input className={styles.inp} value={form.inflections_pl || ''} onChange={e => set('inflections_pl', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Plural Pattern', 'Mudell tal-Plural')}</label>
                    <input className={styles.inp} value={form.form_plural_pattern || ''} onChange={e => set('form_plural_pattern', e.target.value)} />
                </div>
            </div>
        </div>

        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Dual Form', 'Forma Doppja')}</label>
                    <input className={styles.inp} value={form.dual_form || ''} onChange={e => set('dual_form', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Dual Pattern', 'Mudell tad-Doppja')}</label>
                    <input className={styles.inp} value={form.dual_pattern || ''} onChange={e => set('dual_pattern', e.target.value)} />
                </div>
            </div>
            <div>
                <label className={styles.label}>{t('Diminutive', 'Diminuttiv')}</label>
                <input className={styles.inp} value={form.diminutive_form || ''} onChange={e => set('diminutive_form', e.target.value)} />
            </div>
        </div>
        
        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Elative (Comparative)', 'Elattiv (Komparattiv)')}</label>
                <input className={styles.inp} value={form.elative_form || ''} onChange={e => set('elative_form', e.target.value)} />
            </div>
        </div>

        <VowelSetRow
            form={form} set={set} t={t} styles={styles} onFocus={onFocus} insertChar={insertChar}
            fields={[
                { key: 'vowel_set_sg', label: 'Vowel Set (Singular)', placeholder: 'e.g. i-a' },
                { key: 'vowel_set_opp', label: 'Vowel Set (Opp. Gender)', placeholder: 'e.g. i-a' },
                { key: 'vowel_set_dual', label: 'Vowel Set (Dual)', placeholder: 'e.g. i-e' },
                { key: 'vowel_set_pl', label: 'Vowel Set (Plural)', placeholder: 'e.g. i-ie' }
            ]}
        />

        <NonVerbalPatternPlacementFields form={form} set={set} t={t} styles={styles} />
    </div>
);

const PronounFields = ({ form, set, t, styles, options }: MorphologyProps) => (
    <div className="space-y-4">
        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Gender', 'Ġeneru')}</label>
                <select className={styles.sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">{t('Select...', 'Agħżel...')}</option>
                    {options?.gender?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
            </div>
            {(!form.gender || form.gender === '') && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Masculine Form', 'Maskil')}</label>
                            <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                            <input className={styles.inp} value={form.form_masc_pattern || ''} onChange={e => set('form_masc_pattern', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                            <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                            <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} />
                        </div>
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'masculine' && (
                <>
                    <div>
                        <label className={styles.label}>{t('Feminine Form', 'Femminil')}</label>
                        <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                        <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} />
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'feminine' && (
                <>
                    <div>
                        <label className={styles.label}>{t('Masculine Form', 'Maskil')}</label>
                        <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                        <input className={styles.inp} value={form.form_masc_pattern || ''} onChange={e => set('form_masc_pattern', e.target.value)} />
                    </div>
                </>
            )}
        </div>
        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Plural Form', 'Plural')}</label>
                    <input className={styles.inp} value={form.inflections_pl || ''} onChange={e => set('inflections_pl', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Plural Pattern', 'Mudell tal-Plural')}</label>
                    <input className={styles.inp} value={form.form_plural_pattern || ''} onChange={e => set('form_plural_pattern', e.target.value)} />
                </div>
            </div>
            <div>
                <label className={styles.label}>{t('Lemma Pattern', 'Mudell tal-Lemma')}</label>
                <input className={styles.inp} value={form.lemma_pattern || ''} onChange={e => set('lemma_pattern', e.target.value)} />
            </div>
        </div>

        <NonVerbalPatternPlacementFields form={form} set={set} t={t} styles={styles} />
    </div>
);

const NumeralFields = ({ form, set, t, styles, options, onApplyDerivedTerms }: MorphologyProps) => (
    <div className="space-y-4">
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
        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Gender', 'Ġens')}</label>
                <select className={styles.sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">{t('Select...', 'Agħżel...')}</option>
                    {options?.gender?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
            </div>
            {(!form.gender || form.gender === '') && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Masculine', 'Maskil')}</label>
                            <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                            <input className={styles.inp} value={form.form_masc_pattern || ''} onChange={e => set('form_masc_pattern', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>{t('Feminine', 'Femminil')}</label>
                            <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                            <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} />
                        </div>
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'masculine' && (
                <>
                    <div>
                        <label className={styles.label}>{t('Feminine', 'Femminil')}</label>
                        <input className={styles.inp} value={form.form_fem || ''} onChange={e => set('form_fem', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Fem. Pattern', 'Mudell Fem.')}</label>
                        <input className={styles.inp} value={form.form_fem_pattern || ''} onChange={e => set('form_fem_pattern', e.target.value)} />
                    </div>
                </>
            )}
            {form.gender?.toLowerCase() === 'feminine' && (
                <>
                    <div>
                        <label className={styles.label}>{t('Masculine', 'Maskil')}</label>
                        <input className={styles.inp} value={form.form_masc || ''} onChange={e => set('form_masc', e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.label}>{t('Masc. Pattern', 'Mudell Mask.')}</label>
                        <input className={styles.inp} value={form.form_masc_pattern || ''} onChange={e => set('form_masc_pattern', e.target.value)} />
                    </div>
                </>
            )}
        </div>

        <div className={styles.grid}>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Singular', 'Singular')}</label>
                    <input className={styles.inp} value={form.lemma_base || ''} onChange={e => set('lemma_base', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Lemma Pattern', 'Mudell tal-Lemma')}</label>
                    <input className={styles.inp} value={form.lemma_pattern || ''} onChange={e => set('lemma_pattern', e.target.value)} />
                </div>
            </div>
            <div className="space-y-4">
                <div>
                    <label className={styles.label}>{t('Plural Form', 'Plural')}</label>
                    <input className={styles.inp} value={form.inflections_pl || ''} onChange={e => set('inflections_pl', e.target.value)} />
                </div>
                <div>
                    <label className={styles.label}>{t('Plural Pattern', 'Mudell tal-Plural')}</label>
                    <input className={styles.inp} value={form.form_plural_pattern || ''} onChange={e => set('form_plural_pattern', e.target.value)} />
                </div>
            </div>
        </div>

        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Numeral Type', 'Tip ta\' Numeral')}</label>
                <select className={styles.sel} value={form.numeral_type} onChange={e => set('numeral_type', e.target.value)}>
                    <option value="">{t('Select...', 'Agħżel...')}</option>
                    <option value="cardinal">{t('Cardinal', 'Kardinal')}</option>
                    <option value="ordinal">{t('Ordinal', 'Ordinal')}</option>
                    <option value="adverbial">{t('Adverbial', 'Adverbjali')}</option>
                    <option value="fractional">{t('Fractional', 'Frazzjonali')}</option>
                    <option value="multiplier">{t('Multiplier', 'Moltiplikattiv')}</option>
                    <option value="distributive">{t('Distributive', 'Distributtiv')}</option>
                </select>
            </div>
            <div>
                <label className={styles.label}>{t('Short Attributive', 'Attributtiv Qasir')}</label>
                <input className={styles.inp} value={form.form_attributive_short || ''} onChange={e => set('form_attributive_short', e.target.value)} />
            </div>
        </div>

        <div className={styles.grid}>
            <div>
                <label className={styles.label}>{t('Long Attributive', 'Attributtiv Twil')}</label>
                <input className={styles.inp} value={form.form_attributive_long || ''} onChange={e => set('form_attributive_long', e.target.value)} />
            </div>
        </div>

        <NonVerbalPatternPlacementFields form={form} set={set} t={t} styles={styles} />
    </div>
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

    const [form, setForm] = useState(() => entryToForm(entry, initialForm));

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
                            const parseArray = (val: any) => {
                                if (typeof val === 'string' && val.trim().startsWith('[')) {
                                    try { return JSON.parse(val); } catch { return []; }
                                }
                                return Array.isArray(val) ? val : [];
                            };

                            setForm(prev => {
                                const headword = full.headword || prev.headword;
                                const pos = full.pos || prev.pos;

                                const lemma_base = full.lemma_base || full.noun_morphology?.singular || full.adjective_morphology?.masculine || prev.lemma_base;
                                const gender = resolveEntryGender(full) || resolveEntryGender(prev) || undefined;
                                const inflections_pl_raw = parseArray(full.inflections_pl || full.noun_morphology?.plural_forms || full.adjective_morphology?.plural || prev.inflections_pl);
                                const inflections_pl = Array.isArray(inflections_pl_raw) ? inflections_pl_raw.join(', ') : (inflections_pl_raw || '');
                                const sound_suffix = full.sound_suffix || full.noun_morphology?.sound_plural || prev.sound_suffix;
                                const morph_pattern = full.morph_pattern || full.plural_pattern || full.adj_pattern || prev.morph_pattern;
                                const form_fem = full.form_fem || full.noun_morphology?.feminine || full.adjective_morphology?.feminine || prev.form_fem;
                                const form_masc = full.form_masc || full.noun_morphology?.masculine || prev.form_masc;
                                const elative_form = full.elative_form || full.adjective_morphology?.elative || prev.elative_form;
                                const dual_form = full.dual_form || full.noun_morphology?.dual || prev.dual_form;
                                const diminutive_form = full.diminutive_form || full.noun_morphology?.diminutive || prev.diminutive_form;
                                const vowel_set_sg = full.vowel_set_sg || full.noun_morphology?.vowel_set_sg || prev.vowel_set_sg;
                                const vowel_set_pl = full.vowel_set_pl || full.noun_morphology?.vowel_set_pl || prev.vowel_set_pl;
                                const vowel_set_opp = full.vowel_set_opp || prev.vowel_set_opp;
                                const vowel_set_dual = full.vowel_set_dual || prev.vowel_set_dual;

                                const hasBroken = inflections_pl?.length > 0;
                                const hasSound = sound_suffix?.length > 0;

                                const _pluralType = (hasBroken && hasSound) ? 'both'
                                    : hasBroken ? 'broken'
                                        : hasSound ? 'sound'
                                            : 'none';

                                const _adjPluralType = (pos === 'adjective' && hasBroken) ? (morph_pattern ? 'broken' : 'sound') : 'none';

                                return {
                                    ...prev,
                                    id: full.id || prev.id,
                                    headword,
                                    pos,
                                    lemma_base,
                                    gender,
                                    inflections_pl,
                                    sound_suffix,
                                    morph_pattern,
                                    form_fem,
                                    form_masc,
                                    elative_form,
                                    dual_form,
                                    diminutive_form,
                                    vowel_set_sg,
                                    vowel_set_pl,
                                    vowel_set_opp,
                                    vowel_set_dual,
                                    _hasDual: !!dual_form,
                                    participle_type: full.participle_type || prev.participle_type,
                                    definitions: parseArray(full.definitions).length ? parseArray(full.definitions) : prev.definitions,
                                    tags: Array.isArray(full.tags) ? full.tags.join(', ')
                                        : (typeof full.tags === 'string' && full.tags.startsWith('[') ? parseArray(full.tags).join(', ') : (full.tags || prev.tags)),
                                    _rootConsonants: full.resolved_root_consonants || full.root_consonants || prev._rootConsonants,
                                    _formLabel: full.verb_form || full.verb_morphology?.form || prev._formLabel,
                                    verb_class: full.verb_class || full.verb_morphology?.verb_class || prev.verb_class,
                                    _weakClass: full.verb_weak_class || full.weak_class || full.verb_morphology?.weak_class || prev._weakClass,
                                    verb_type: full.verb_type || prev.verb_type,
                                    verb_vowel_perf: full.verb_vowel_perf || full.verb_morphology?.vowel_set_perf || prev.verb_vowel_perf,
                                    verb_vowel_impf: full.verb_vowel_impf || full.verb_morphology?.vowel_set_impf || prev.verb_vowel_impf,
                                    verb_vowel_impv: full.verb_vowel_impv || full.verb_morphology?.vowel_set_imperative || prev.verb_vowel_impv,
                                    verb_transitivity: full.verb_transitivity || full.verb_morphology?.transitivity || prev.verb_transitivity,
                                    verb_perfective_3sgm: full.verb_perfective_3sgm || full.verb_morphology?.perfective_3sg_m || prev.verb_perfective_3sgm,
                                    verb_imperfective_3sgm: full.verb_imperfective_3sgm || full.verb_morphology?.imperfective_3sg_m || prev.verb_perfective_3sgm,
                                    verb_verbal_noun: full.verb_verbal_noun || full.verb_morphology?.verbal_noun || prev.verb_verbal_noun,
                                    verb_active_ptcp: full.verb_active_ptcp || full.verb_morphology?.active_participle || prev.verb_active_ptcp,
                                    verb_passive_ptcp: full.verb_passive_ptcp || full.verb_morphology?.passive_participle || prev.verb_passive_ptcp,
                                    is_loanword: typeof full.is_loanword === 'boolean' ? full.is_loanword : prev.is_loanword,
                                    source_language: full.source_language || prev.source_language,
                                    is_inflectable: typeof full.is_inflectable === 'boolean' ? full.is_inflectable : (typeof full.is_inflectable === 'number' ? full.is_inflectable === 1 : prev.is_inflectable),
                                    usage_example: full.usage_example || prev.usage_example,
                                    usage_example_en: full.usage_example_en || prev.usage_example_en,
                                    source_citation: full.source_citation || full.verb_morphology?.source_citation || full.noun_morphology?.source_citation || prev.source_citation,
                                    phonetics: parseArray(full.phonetics).length ? parseArray(full.phonetics) : prev.phonetics,
                                    etymology_chain: parseArray(full.etymology_chain).length ? parseArray(full.etymology_chain)
                                        : (full.etymologies?.[0]?.chain?.length ? full.etymologies[0].chain : prev.etymology_chain),
                                    noun_type: full.noun_type || prev.noun_type,
                                    cv_pattern: full.cv_pattern || full.cv_notation || prev.cv_pattern,
                                    _inheritedPattern: !full.cv_pattern && (full.cv_notation || full.resolved_cv),
                                    synonyms: parseArray(full.synonyms || full.verb_morphology?.synonyms || full.noun_morphology?.synonyms),
                                    antonyms: parseArray(full.antonyms || full.verb_morphology?.antonyms || full.noun_morphology?.antonyms),
                                    related_entries: parseArray(full.related_entries || full.verb_morphology?.related_entries || full.noun_morphology?.related_entries),
                                    numeral_type: full.numeral_type || full.numeral_morphology?.numeral_type || prev.numeral_type,
                                    form_attributive_short: full.form_attributive_short || full.numeral_morphology?.form_attributive_short || prev.form_attributive_short,
                                    form_attributive_long: full.form_attributive_long || full.numeral_morphology?.form_attributive_long || prev.form_attributive_long,
                                    form_opposite: full.form_opposite || full.numeral_morphology?.form_opposite || prev.form_opposite,
                                    _pluralType,
                                    _adjPluralType,
                                    extraFields: (() => {
                                        const extras: Record<string, any> = {};
                                        Object.keys(full).forEach(key => {
                                            if (!ENTRY_HANDLED_FIELDS.includes(key as any) && !key.startsWith('_')) {
                                                extras[key] = full[key];
                                            }
                                        });
                                        return extras;
                                    })(),
                                };
                            });
                            setOriginalForm(full);
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
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9àċġħżie-]/gi, '');

        const formSuffix = (form.pos === 'verb' && form._formLabel) ? `-${form._formLabel.toLowerCase()}` : '';
        const newId = `${suffix}-${safeHeadword}${formSuffix}`;
        setSuggestedId(newId);
    }, [form.pos, form.headword, form._formLabel, isEdit]);

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

    // ── AUTOMATION: Verb Type/Category from Root ──────────────────────────────
    useEffect(() => {
        if (form.pos !== 'verb') return;
        const rootClean = form._rootConsonants.replace(/-/g, '').trim();
        if (!rootClean) return;

        const detected = rootClean.length >= 4 ? 'quadrilateral' : 'triliteral';
        if (form.verb_type !== detected) {
            set('verb_type', detected);
        }
    }, [form._rootConsonants, form.pos]);

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

                        if (root.source && !prev.source_citation) {
                            next.source_citation = root.source;
                            newFilled.add('source_citation');
                            hasChanges = true;
                        }

                        if (root.etymology && (!prev.etymology_chain || prev.etymology_chain.length === 0)) {
                            try {
                                // Try parsing as JSON first
                                const parsed = JSON.parse(root.etymology);
                                if (Array.isArray(parsed)) {
                                    next.etymology_chain = parsed.map(p => ({
                                        language: p.language || '',
                                        form: p.form || '',
                                        meaning: p.meaning || ''
                                    }));
                                    newFilled.add('etymology_chain');
                                    hasChanges = true;
                                } else if (typeof parsed === 'object') {
                                    next.etymology_chain = [{
                                        language: parsed.language || '',
                                        form: parsed.form || '',
                                        meaning: parsed.meaning || ''
                                    }];
                                    newFilled.add('etymology_chain');
                                    hasChanges = true;
                                }
                            } catch (e) {
                                // Fallback to regex for plain strings
                                const match = root.etymology.match(/^([A-Za-z]+)\s+(.+)$/);
                                if (match) {
                                    next.etymology_chain = [{ language: match[1], form: match[2], meaning: '' }];
                                    newFilled.add('etymology_chain');
                                    hasChanges = true;
                                } else if (root.etymology.length > 0) {
                                    next.etymology_chain = [{ language: 'Root', form: root.etymology, meaning: '' }];
                                    newFilled.add('etymology_chain');
                                    hasChanges = true;
                                }
                            }
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
            setForm(prev => {
                const next = { ...prev };
                // For all relevant POS: if lemma_base is empty, seed it with the headword
                if (!next.lemma_base) next.lemma_base = prev.headword;
                // For feminine gender, seed form_fem with headword if empty
                if (prev.gender?.toLowerCase() === 'feminine' && !next.form_fem) {
                    next.form_fem = prev.headword;
                }
                return next;
            });
        }
    }, [form.headword, form.pos, form.gender]);

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
        const result = detectPluralType(form.headword, SOUND_SUFFIXES);
        if (!result) return null;
        // Return a string representation: e.g. "sound: -iet" or just "broken"
        if (result.type === 'sound' && result.suffix) return `${result.type}: -${result.suffix}`;
        return result.type;
    }, [form.headword, form._pluralType, SOUND_SUFFIXES]);

    // ── AUTOMATION: Invariable Tagging ──────────────────────────────────────
    useEffect(() => {
        if (!form.headword) return;

        let isInvariable = false;
        if (form.pos === 'adjective') {
            const hasFem = form.form_fem && form.form_fem !== '';
            const hasPlur = form.inflections_pl && form.inflections_pl !== '';
            const masc = form.lemma_base || '';
            if (hasFem && hasPlur && masc === form.headword && form.form_fem === form.headword && form.inflections_pl === form.headword) {
                isInvariable = true;
            }
        } else if (form.pos === 'noun') {
            const hasPlur = (form.inflections_pl || form.sound_suffix) ? true : false;
            if (hasPlur && form.lemma_base === form.headword && (form.inflections_pl === form.headword || form.sound_suffix === form.headword)) {
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
    }, [
        form.headword, form.pos, form.cv_pattern,
        form.lemma_base, form.form_fem, form.inflections_pl,
        form.sound_suffix
    ]);

    const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

    const normalizedPos = useMemo(() => form.pos?.toLowerCase() || '', [form.pos]);

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.headword.trim()) {
            setError(t('Headword is required', 'Mamma meħtieġa'));
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

            onSaved();
        } catch (err: any) {
            let msg = err.message;
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
            const auto = generateNumeralForms(form.headword, form._rootConsonants);
            setForm((f: any) => ({
                ...f,
                numeral_type: f.numeral_type || 'cardinal',
                form_attributive_short: f.form_attributive_short || auto.attributive_short || '',
                form_attributive_long: f.form_attributive_long || auto.attributive_long || '',
                // form_opposite is manual usually
            }));
            return;
        }

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
                                    placeholder={form._inheritedPattern ? `${form._inheritedPattern} (inherited)` : "e.g. Fagħal or CCvC"}
                                />
                                {form._inheritedPattern && !form.cv_pattern && (
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-black/25 font-mono text-sm">
                                        {form._inheritedPattern} <span className="text-[10px] italic">(inherited)</span>
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

                        <div>
                            <label className={label}>{t('Tags (comma separated)', 'Tikketti (separati bil-virgola)')}</label>
                            <input className={inp} value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. archaic, dialectal" />
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
                    <div className="mt-6">
                        <h3 className="text-sm font-bold text-black border-b border-border pb-2 mb-4">
                            {t('Morphology', 'Morfoloġija')}
                        </h3>

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
                                    suggestions: {
                                        broken_pattern: suggestedBrokenPattern || undefined,
                                        feminine: suggestedFeminine || undefined,
                                        masculine: suggestedMasculine || undefined,
                                        plural: pluralSuggestion || undefined
                                    }
                                }}
                                onApplyDerivedTerms={handleApplyDerivedTerms}
                            />
                        )}

                        {normalizedPos === 'pronoun' && (
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
                                    gender: GENDER_OPTIONS
                                }}
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
                                    patterns: adjPatterns
                                }}
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
                                    participle_gender: GENDER_OPTIONS
                                }}
                            />
                        )}
                    </div>

                    {/* Definitions */}
                    <fieldset className="border border-border-light rounded-lg p-4 space-y-4">
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
                                    {normalizedPos === 'participle' && (
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
                    <fieldset className="border border-border-light rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <legend className="text-xs font-semibold text-black uppercase tracking-tight">{t('Etymology Builder', 'Oriġini tal-Kelma')}</legend>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                                onClick={() => set('etymology_chain', [...form.etymology_chain, { language: '', form: '', meaning: '' }])}>
                                + {t('Add Step', 'Żid Pass')}
                            </Button>
                        </div>

                        {autoFilledFields.has('etymology_chain') && (
                            <div className="flex items-center gap-1 px-1 mb-2 text-[10px] text-blue-500 animate-pulse">
                                <span>✦</span>
                                <span>{t('Inherited from root', 'Miret mill-għerq')}</span>
                                <button type="button" className="ml-1 hover:text-blue-700 underline" onClick={() => {
                                    set('etymology_chain', []);
                                    const next = new Set(autoFilledFields);
                                    next.delete('etymology_chain');
                                    setAutoFilledFields(next);
                                }}>{t('reset', 'irrisettja')}</button>
                            </div>
                        )}

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

                        <div className="pt-2">
                            <label className={label}>{t('Source Citation', 'Sors / Referenza')}</label>
                            <input className={inp} value={form.source_citation}
                                onChange={e => {
                                    set('source_citation', e.target.value);
                                    if (autoFilledFields.has('source_citation')) {
                                        const next = new Set(autoFilledFields);
                                        next.delete('source_citation');
                                        setAutoFilledFields(next);
                                    }
                                }}
                                placeholder={t('e.g. Aquilina1987', 'eż. Aquilina1987')} />
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
                                            setAutoFilledFields(next);
                                        }}
                                    >
                                        {t('reset', 'irrisettja')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </fieldset>

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
                                        const payload = formToPayload(form);
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
