import { useEffect, useRef, useState, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from 'react';
import { Keyboard, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useAdminConfig, type ConfigItem } from '@/lib/adminConfig';
import { getCategoryById } from '@/lib/adminCategoryRegistry';
import {
    getPatternApplicabilitySummary,
    getPatternMetadataSummary,
    PATTERN_LINGUISTIC_ROLE_OPTIONS,
    PATTERN_POS_OPTIONS,
    PATTERN_POS_SCHEMA,
    normalizePatternLinguisticRoleValue,
    type PatternApplicability,
    type PatternFieldSpec,
    type PatternPos,
    normalizePatternFormValue,
} from '@/lib/patternMetadata';
import { cn } from '@/lib/utils';

const PATTERN_BUCKET_LABEL_KEYS: Record<string, string> = {
    cv_wizen_pattern: 'canonical-patterns',
    broken_pattern: 'broken-plural',
    feminine_pattern: 'feminine-singular',
    sound_suffix: 'sound-plural-suffix',
    derivational_suffix: 'derivational-suffixes',
    dual_suffix: 'dual-suffix',
    diminutive_pattern: 'diminutive',
    adjective_pattern: 'elative',
    plural_pattern: 'legacy-plural-bucket',
};

interface ConfigFormModalProps {
    item: ConfigItem | null;
    category: string;
    onClose: () => void;
    onSave: (val: { key: string; value: unknown }) => Promise<void>;
}
type FormValue = Record<string, any>;

function buildPatternKey(value: FormValue) {
    const cv = typeof value.cv === 'string' ? value.cv.trim() : '';
    const wizen = typeof value.wizen === 'string' ? value.wizen.trim() : '';
    if (!cv && !wizen) return '';
    return `${cv}/${wizen}`;
}

export function ConfigFormModal({ item, category, onClose, onSave }: ConfigFormModalProps) {
    const { term } = useLinguisticMode();
    const [key, setKey] = useState(item?.key ?? '');
    const [value, setValue] = useState<FormValue>(() => {
        const baseValue = item
            ? item.value
            : (getCategoryById(category)?.defaultValueFactory() || { en: '', mt_standard: '', mt_arabised: '' });
        return attachApplicabilityClientIds(baseValue as FormValue);
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [kbOpen, setKbOpen] = useState(false);
    const [activeInput, setActiveInput] = useState<'key' | 'cv' | 'wizen' | null>(null);

    const activeInputRef = useRef<HTMLInputElement | null>(null);
    const kbTriggerRef = useRef<HTMLButtonElement>(null);

    const activeRegistry = getCategoryById(category);
    const isPatternEditor = activeRegistry?.editorType === 'pattern';
    const isVerbPresetEditor = activeRegistry?.editorType === 'verb_preset';
    const hasSpecialLayout = isPatternEditor || isVerbPresetEditor;
    const categoryLabel = activeRegistry?.label || category;
    const normalizedPatternValue = isPatternEditor ? normalizePatternFormValue(value) : null;
    const selectedPosTypes = (normalizedPatternValue?.pos_types || []).filter(
        (pos): pos is PatternPos => PATTERN_POS_OPTIONS.includes(pos as PatternPos),
    );
    const derivedPatternKey = isPatternEditor ? buildPatternKey(value) : '';
    const patternSummary = isPatternEditor ? getPatternMetadataSummary(value, item?.category) : null;
    const patternBucketLabel = patternSummary
        ? term(PATTERN_BUCKET_LABEL_KEYS[item?.category || ''] || patternSummary.bucketLabel)
        : null;
    const applicabilitySummaries = isPatternEditor ? getPatternApplicabilitySummary(value) : [];
    const patternKeyPreview = derivedPatternKey || term('set-cv-and-wizen-to-generate-the-key');
    const patternPosOptions = [...PATTERN_POS_OPTIONS];

    const inputClass = 'w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black';
    const labelClass = 'block text-xs font-bold text-black/40 uppercase tracking-widest mb-1.5';

    const insertChar = (char: string) => {
        const el = activeInputRef.current;
        if (!el) return;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const currentValue = el.value;
        const nextValue = currentValue.slice(0, start) + char + currentValue.slice(end);

        if (activeInput === 'key') setKey(nextValue);
        if (activeInput === 'cv' || activeInput === 'wizen') setValue({ ...value, [activeInput]: nextValue });

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + char.length, start + char.length);
        }, 0);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const submissionKey = isPatternEditor ? derivedPatternKey : key.trim();
        if (!submissionKey.trim()) {
            setError(isPatternEditor ? term('cv-or-wizen-is-required') : term('key-is-required'));
            return;
        }

        setSaving(true);
        try {
            await onSave({ key: submissionKey, value });
        } catch (submitError: unknown) {
            setError(submitError instanceof Error ? submitError.message : String(submitError));
        } finally {
            setSaving(false);
        }
    };

    const modalTitle = item
        ? (isPatternEditor ? term('edit-pattern') : `Edit ${categoryLabel}`)
        : (isPatternEditor ? term('add-pattern') : `Add New ${categoryLabel}`);

    return (
        <Modal open onClose={onClose} title={modalTitle} size={hasSpecialLayout ? 'lg' : 'md'}>
            <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 max-h-[85vh] overflow-hidden">
                {error && <div className="px-6 py-3"><div className="bg-red-50 text-red-800 p-3 rounded-xl text-sm border border-red-100">{error}</div></div>}

                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3.5 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
                    {isPatternEditor ? (
                        <>
                            <div className="rounded-2xl border border-[#1034A6]/10 bg-gradient-to-br from-[#1034A6]/5 via-white to-[#f7f3ec] px-3 py-3 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-2.5">
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">{term('pattern-identity')}</h4>
                                        <p className="text-[11px] text-black/50 max-w-xl leading-snug">
                                            {term('pattern-identity-desc')}
                                        </p>
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#1034A6]/10 bg-white/90 px-2.5 py-1 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">{term('derived-key')}</span>
                                        <span className="font-mono text-[11px] font-semibold text-[#1034A6]">{patternKeyPreview}</span>
                                    </div>
                                </div>
                                {patternSummary && (
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center rounded-full border border-[#1034A6]/10 bg-[#1034A6]/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#1034A6]">
                                            {patternBucketLabel}
                                        </span>
                                        {patternSummary.posTypes.map((pos) => (
                                            <span key={pos} className="inline-flex items-center rounded-full border border-black/5 bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black/40">
                                                {pos}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {applicabilitySummaries.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {applicabilitySummaries.map((app, index) => (
                                            <span key={`${app.pos}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-[#1034A6]/10 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black/45">
                                                <span className="text-[#1034A6]">{app.label}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <section className="rounded-2xl border border-black/5 bg-white/80 p-3.5 shadow-sm space-y-3">
                                <div className="flex items-end justify-between gap-3 flex-wrap">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">{term('shared-pattern-base')}</h4>
                                        <p className="text-[11px] text-black/45 mt-1 leading-snug">
                                            {term('shared-pattern-base-desc')}
                                        </p>
                                    </div>
                                </div>
                                <PatternSection
                                    value={value}
                                    setValue={setValue}
                                    inputClass={inputClass}
                                    labelClass={labelClass}
                                    kbOpen={kbOpen}
                                    setKbOpen={setKbOpen}
                                    kbTriggerRef={kbTriggerRef}
                                    insertChar={insertChar}
                                    setActiveInput={setActiveInput}
                                    activeInputRef={activeInputRef}
                                    posOptions={patternPosOptions}
                                    showPosFilter={Boolean(activeRegistry?.hasPosFilter)}
                                />
                            </section>

                            {isPatternEditor && (
                                <details className="group rounded-2xl border border-black/5 bg-white/75 shadow-sm" open>
                                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-3.5 py-2.5 text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <span>{term('pos-applicability')}</span>
                                            <span className="rounded-full border border-black/5 bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black/35">
                                                {term('per-pos')}
                                            </span>
                                        </div>
                                        <span className="text-black/30">{term('pos-applicability-desc')}</span>
                                    </summary>
                                    <div className="border-t border-black/5 px-3.5 py-3.5 space-y-3.5">
                                        {selectedPosTypes.length === 0 && (
                                            <p className="text-xs text-black/45">{term('pick-one-or-more-pos-above-to-edit-their-metadata')}</p>
                                        )}
                                        {selectedPosTypes.map((pos) => (
                                            <ApplicabilitySection
                                                key={pos}
                                                pos={pos}
                                                value={value}
                                                setValue={setValue}
                                                labelClass={labelClass}
                                                inputClass={inputClass}
                                            />
                                        ))}
                                    </div>
                                </details>
                            )}
                        </>
                    ) : (
                        <>
                            <section className="space-y-3">
                                <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">{term('identity')}</h4>
                                <div className="max-w-md">
                                    <label className={labelClass}>{term('in-code-id-key')}</label>
                                    <input
                                        className={inputClass}
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        onFocus={(e) => {
                                            setActiveInput('key');
                                            activeInputRef.current = e.target;
                                        }}
                                        placeholder="e.g. noun, transitive, I..."
                                    />
                                </div>
                            </section>

                            <TranslationSection
                                category={category}
                                value={value}
                                setValue={setValue}
                                labelClass={labelClass}
                                inputClass={inputClass}
                                hideMaltese={false}
                            />
                        </>
                    )}

                    {isVerbPresetEditor && (
                        <section className="pt-4 border-t border-black/5 space-y-4">
                            <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">{term('specific-configuration')}</h4>
                            <VerbPresetSection value={value} setValue={setValue} inputClass={inputClass} />
                        </section>
                    )}
                </div>

                <div className="sticky bottom-0 z-20 shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-black/5 bg-slate-50/95 rounded-b-2xl backdrop-blur-sm">
                    <Button type="button" variant="ghost" onClick={onClose}>{term('cancel')}</Button>
                    <Button type="submit" disabled={saving} leftIcon={saving ? <RotateCcw className="animate-spin" size={14} /> : <Save size={14} />}>
                        {saving ? term('saving') : term('save-config')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function TranslationSection({
    category,
    value,
    setValue,
    labelClass,
    inputClass,
    hideMaltese,
}: {
    category: string;
    value: FormValue;
    setValue: Dispatch<SetStateAction<FormValue>>;
    labelClass: string;
    inputClass: string;
    hideMaltese: boolean;
}) {
    const { term } = useLinguisticMode();
    const en = typeof value.en === 'string' ? value.en : '';
    const mtStandard = typeof value.mt_standard === 'string' ? value.mt_standard : '';
    const mtArabised = typeof value.mt_arabised === 'string' ? value.mt_arabised : '';

    return (
        <section className="space-y-4 pt-4 border-t border-black/5">
            <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">{term('translations-display-labels')}</h4>
            <div>
                <label className={labelClass}>{term('english-label')} {category === 'verb_preset' ? `(${term('form-name')})` : ''}</label>
                <input
                    className={inputClass}
                    value={en}
                    onChange={(e) => {
                        setValue({ ...value, en: e.target.value });
                    }}
                    placeholder={category === 'verb_preset' ? 'e.g. Form I' : term('english-display-name')}
                />
            </div>

            {!hideMaltese && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>{term('maltese-standard-label')} {category === 'verb_preset' ? `(${term('form-name')})` : ''}</label>
                        <input
                            className={inputClass}
                            value={mtStandard}
                            onChange={(e) => {
                                setValue({ ...value, mt_standard: e.target.value });
                            }}
                            placeholder={category === 'verb_preset' ? 'e.g. Forma I' : term('standard-maltese-label')}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>{term('maltese-arabised-label')} {category === 'verb_preset' ? `(${term('form-name')})` : ''}</label>
                        <input
                            className={inputClass}
                            value={mtArabised}
                            onChange={(e) => {
                                setValue({ ...value, mt_arabised: e.target.value });
                            }}
                            placeholder={category === 'verb_preset' ? 'e.g. Forma I' : term('arabised-maltese-label')}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

function VerbPresetSection({
    value,
    setValue,
    inputClass,
}: {
    value: FormValue;
    setValue: Dispatch<SetStateAction<FormValue>>;
    inputClass: string;
}) {
    const { term } = useLinguisticMode();
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {['perfect', 'passive', 'active', 'verbal'].map((form) => (
                <div key={form} className="space-y-2 border-l-2 border-slate-100 pl-3">
                    <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">{form}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-black/50 block mb-1">{term('standard-cv')}</label>
                            <input className={inputClass} value={value[form]?.cv || ''} onChange={(e) => setValue({ ...value, [form]: { ...value[form], cv: e.target.value } })} placeholder={term('cv-notation')} />
                        </div>
                        <div>
                            <label className="text-[10px] text-black/50 block mb-1">{term('arabised-wizen')}</label>
                            <input className={inputClass} value={value[form]?.wizen || ''} onChange={(e) => setValue({ ...value, [form]: { ...value[form], wizen: e.target.value } })} placeholder={term('wizen-name')} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PatternSection({
    value,
    setValue,
    inputClass,
    labelClass,
    kbOpen,
    setKbOpen,
    kbTriggerRef,
    insertChar,
    setActiveInput,
    activeInputRef,
    posOptions,
    showPosFilter,
}: {
    value: FormValue;
    setValue: Dispatch<SetStateAction<FormValue>>;
    inputClass: string;
    labelClass: string;
    kbOpen: boolean;
    setKbOpen: (open: boolean) => void;
    kbTriggerRef: MutableRefObject<HTMLButtonElement | null>;
    insertChar: (char: string) => void;
    setActiveInput: (input: 'key' | 'cv' | 'wizen' | null) => void;
    activeInputRef: MutableRefObject<HTMLInputElement | null>;
    posOptions: string[];
    showPosFilter: boolean;
}) {
    const { term } = useLinguisticMode();
    const selectedPosTypes = Array.isArray(value.pos_types)
        ? value.pos_types.filter((pos): pos is string => typeof pos === 'string' && posOptions.includes(pos))
        : [];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3.5">
                <div className="space-y-1.5">
                    <label className={labelClass}>{term('maltese-standard-label')} <span className="text-black/30 normal-case font-normal">{term('maltese-standard-label-hint')}</span></label>
                    <input
                        className={inputClass}
                        value={value.cv || ''}
                        onChange={(e) => setValue({ ...value, cv: e.target.value })}
                        onFocus={(e) => {
                            setActiveInput('cv');
                            activeInputRef.current = e.target;
                        }}
                        placeholder={term('cv-notation')}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>{term('maltese-arabised-label')}</label>
                    <input
                        className={inputClass}
                        value={value.wizen || ''}
                        onChange={(e) => setValue({ ...value, wizen: e.target.value })}
                        onFocus={(e) => {
                            setActiveInput('wizen');
                            activeInputRef.current = e.target;
                        }}
                        placeholder={term('wizen-name')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                    <label className={labelClass}>{term('stress-label')}</label>
                    <input
                        className={inputClass}
                        type="number"
                        min={1}
                        max={5}
                        value={value.stress ?? 2}
                        onChange={(e) => setValue({ ...value, stress: parseInt(e.target.value, 10) || 2 })}
                    />
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-end justify-between gap-3">
                        <label className={labelClass}>{term('keyboard-helper')}</label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            ref={kbTriggerRef}
                            type="button"
                            onClick={() => setKbOpen(!kbOpen)}
                            className={cn(
                                'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-sm',
                                kbOpen ? 'bg-[#1034A6] text-white border-[#1034A6]' : 'bg-white text-black/45 border-black/10 hover:border-black/20',
                            )}
                        >
                            <Keyboard size={12} /> {kbOpen ? term('close-keyboard') : term('open-keyboard')}
                        </button>
                        <div className="relative">
                            <MalteseCharPicker open={kbOpen} onOpenChange={setKbOpen} onInsert={insertChar} triggerRef={kbTriggerRef} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className={labelClass}>{term('description')}</label>
                <textarea
                    className={cn(inputClass, 'min-h-[84px] resize-y')}
                    value={value.description || ''}
                    onChange={(e) => setValue({ ...value, description: e.target.value })}
                    placeholder={term('optional-pattern-description')}
                    rows={3}
                />
            </div>

            {showPosFilter && (
                <div className="rounded-2xl border border-black/5 bg-slate-50/70 p-3 space-y-2.5">
                    <div className="flex items-end justify-between gap-3 flex-wrap">
                        <div>
                            <label className={labelClass}>{term('apply-to-pos')}</label>
                        </div>
                        <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-black/40">
                            {term('selected-count', { count: selectedPosTypes.length })}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {posOptions.map((pos) => {
                            const isSelected = selectedPosTypes.includes(pos);
                            return (
                                <button
                                    key={pos}
                                    type="button"
                                    onClick={() => {
                                        setValue((prev) => {
                                            const normalized = normalizePatternFormValue(prev);
                                            const current = Array.isArray(normalized.pos_types) ? normalized.pos_types : [];
                                            const next = isSelected ? current.filter((x: string) => x !== pos) : [...current, pos];
                                            const existingApplicabilities = Array.isArray(normalized.applicabilities) ? normalized.applicabilities : [];
                                            const nextApplicabilities = existingApplicabilities.filter((item) => next.includes(item.pos));
                                            if (!isSelected && !nextApplicabilities.some((item) => item.pos === pos)) {
                                                nextApplicabilities.push(createBlankApplicability(pos as PatternPos));
                                            }

                                            return {
                                                ...prev,
                                                pos_types: next,
                                                applicabilities: nextApplicabilities,
                                            };
                                        });
                                    }}
                                    className={cn(
                                        'px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all',
                                        isSelected ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm' : 'bg-white text-black/40 border-black/10 hover:border-black/20',
                                    )}
                                >
                                    {term(pos)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function createApplicabilityClientId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `app-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createBlankApplicability(pos: PatternPos): PatternApplicability {
    return {
        pos: pos as PatternApplicability['pos'],
        clientId: createApplicabilityClientId(),
        linguisticRole: '',
        gender: '',
        notes: '',
        metadata: {},
    };
}

function attachApplicabilityClientIds(value: FormValue) {
    const normalized = normalizePatternFormValue(value, 'cv_wizen_pattern');
    const applicabilities = Array.isArray(normalized.applicabilities)
        ? normalized.applicabilities.map((app) => ({
            ...app,
            clientId: app.clientId || createApplicabilityClientId(),
        }))
        : [];

    return {
        ...normalized,
        applicabilities,
    };
}

function getPatternFieldValue(app: PatternApplicability, field: PatternFieldSpec): string {
    const metadata = (app.metadata || {}) as Record<string, any>;
    const fieldKey = field.metadataKey || field.key;

    switch (fieldKey) {
        case 'verb_form':
            return String(metadata.verb_form || '').trim();
        case 'class_compatibility':
            return String(metadata.class_compatibility || '').trim();
        case 'participle_type':
            return String(metadata.participle_type || '').trim();
        case 'numeral_type':
            return String(metadata.numeral_type || '').trim();
        case 'linguisticRole':
        case 'linguistic_role':
            return String(app.linguisticRole || metadata.linguistic_role || '').trim();
        case 'gender':
            return String(app.gender || metadata.gender || '').trim();
        case 'notes':
            return String(app.notes || metadata.notes || '').trim();
        default:
            return '';
    }
}

function getFieldOptions(field: PatternFieldSpec, getValues: (category: string) => any[]) {
    if (field.options) return field.options;
    if (!field.optionSource) return [];

    const rawOptions = getValues(field.optionSource) || [];
    const mapped = rawOptions
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .map((value) => ({ value, label: value }));

    if (mapped.length > 0) return mapped;
    if (field.optionSource === 'gender') {
        return ['masculine', 'feminine', 'neutral'].map((value) => ({ value, label: value }));
    }

    return mapped;
}

function updateApplicability(
    setValue: Dispatch<SetStateAction<FormValue>>,
    clientId: string,
    pos: PatternPos,
    updater: (current: Record<string, any>) => Record<string, any>,
) {
    setValue((prev) => {
        const normalized = normalizePatternFormValue(prev, 'cv_wizen_pattern');
        const applicabilities = Array.isArray(normalized.applicabilities) ? [...normalized.applicabilities] : [];
        const currentIndex = applicabilities.findIndex((item) => item.clientId === clientId);
        const current = currentIndex >= 0
            ? applicabilities[currentIndex]
            : applicabilities.find((item) => item.pos === pos) || createBlankApplicability(pos);

        const next = updater({
            ...current,
            metadata: { ...(current.metadata || {}) },
            clientId: current.clientId || clientId,
        });

        const nextApplicability = {
            ...current,
            ...next,
            pos,
            clientId: current.clientId || clientId,
            metadata: next.metadata || {},
        };

        if (currentIndex >= 0) {
            applicabilities[currentIndex] = nextApplicability;
        } else {
            applicabilities.push(nextApplicability);
        }

        return {
            ...prev,
            pos_types: Array.from(new Set(applicabilities.map((item) => item.pos).filter(Boolean))),
            applicabilities,
        };
    });
}

function updatePatternField(
    setValue: Dispatch<SetStateAction<FormValue>>,
    clientId: string,
    pos: PatternPos,
    field: PatternFieldSpec,
    rawValue: string,
) {
    updateApplicability(setValue, clientId, pos, (current) => {
        const nextValue = rawValue.trim();
        const nextMetadata = { ...(current.metadata || {}) };
        const next = { ...current };
        const fieldKey = field.metadataKey || field.key;

        switch (fieldKey) {
            case 'linguisticRole':
            case 'linguistic_role':
                next.linguisticRole = nextValue;
                delete nextMetadata.linguistic_role;
                delete nextMetadata.linguisticRole;
                break;
            case 'gender':
                next.gender = nextValue;
                delete nextMetadata.gender;
                break;
            case 'notes':
                next.notes = nextValue;
                if (nextValue) nextMetadata.notes = nextValue;
                else delete nextMetadata.notes;
                break;
            case 'verb_form':
            case 'class_compatibility':
            case 'participle_type':
            case 'numeral_type':
                if (nextValue) nextMetadata[fieldKey] = nextValue;
                else delete nextMetadata[fieldKey];
                break;
        }

        next.metadata = nextMetadata;
        return next;
    });
}

function getApplicabilitiesForPos(value: FormValue, pos: PatternPos) {
    const normalized = normalizePatternFormValue(value, 'cv_wizen_pattern');
    return (normalized.applicabilities || []).filter((app) => app.pos === pos);
}

function addApplicability(setValue: Dispatch<SetStateAction<FormValue>>, pos: PatternPos) {
    setValue((prev) => {
        const normalized = normalizePatternFormValue(prev, 'cv_wizen_pattern');
        const nextApplicabilities = Array.isArray(normalized.applicabilities) ? [...normalized.applicabilities] : [];
        nextApplicabilities.push(createBlankApplicability(pos));

        return {
            ...prev,
            pos_types: Array.from(new Set([...(normalized.pos_types || []), pos])),
            applicabilities: nextApplicabilities,
        };
    });
}

function removeApplicability(setValue: Dispatch<SetStateAction<FormValue>>, clientId: string) {
    setValue((prev) => {
        const normalized = normalizePatternFormValue(prev, 'cv_wizen_pattern');
        const nextApplicabilities = (normalized.applicabilities || []).filter((item) => item.clientId !== clientId);

        return {
            ...prev,
            pos_types: Array.from(new Set(nextApplicabilities.map((item) => item.pos).filter(Boolean))),
            applicabilities: nextApplicabilities,
        };
    });
}

function ApplicabilityCard({
    pos,
    app,
    setValue,
    labelClass,
    inputClass,
}: {
    pos: PatternPos;
    app: PatternApplicability;
    setValue: Dispatch<SetStateAction<FormValue>>;
    labelClass: string;
    inputClass: string;
}) {
    const { term } = useLinguisticMode();
    const { getValues } = useAdminConfig();
    const schema = PATTERN_POS_SCHEMA[pos];
    const fields = schema?.fields || [];
    const hasMetadataFields = fields.length > 0;
    const clientId = app.clientId || '';
    const [customRoleMode, setCustomRoleMode] = useState(() => {
        const initialRole = normalizePatternLinguisticRoleValue(app.linguisticRole);
        return Boolean(initialRole) && !PATTERN_LINGUISTIC_ROLE_OPTIONS.some((option) => option.value === initialRole);
    });

    useEffect(() => {
        const currentRole = normalizePatternLinguisticRoleValue(app.linguisticRole);
        if (!currentRole) return;

        if (PATTERN_LINGUISTIC_ROLE_OPTIONS.some((option) => option.value === currentRole)) {
            setCustomRoleMode(false);
        } else {
            setCustomRoleMode(true);
        }
    }, [app.linguisticRole]);

    return (
        <div className="rounded-xl border border-black/5 bg-white/70 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                <div>
                    <h6 className="text-[10px] font-bold uppercase tracking-widest text-[#1034A6]">
                        {schema?.label || pos}
                    </h6>
                    <p className="text-[11px] text-black/40">
                        {hasMetadataFields ? term('metadata-for-this-role') : term('pattern-only-role')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => removeApplicability(setValue, clientId)}
                    className="text-[10px] font-bold uppercase tracking-widest text-black/35 hover:text-red-600 transition-colors"
                >
                    {term('remove-role')}
                </button>
            </div>
            {hasMetadataFields ? (
                <div className="grid grid-cols-1 gap-3.5">
                    {fields.map((field) => {
                        if (field.showWhen && !field.showWhen(app)) {
                            return null;
                        }

                        const fieldValue = getPatternFieldValue(app, field);
                        const options = getFieldOptions(field, getValues);
                        const isLinguisticRoleField = field.key === 'linguisticRole';
                        const normalizedRoleValue = normalizePatternLinguisticRoleValue(fieldValue);
                        const selectedRoleValue = options.some((opt) => opt.value === normalizedRoleValue) ? normalizedRoleValue : '';

                        return (
                            <div
                                key={field.key}
                                className={field.kind === 'textarea' ? 'space-y-1 md:col-span-3' : 'space-y-1'}
                            >
                                <label className={labelClass}>{field.label}</label>
                                {field.kind === 'select' && !isLinguisticRoleField && (
                                    <select
                                        className={inputClass}
                                        value={fieldValue}
                                        onChange={(e) => updatePatternField(setValue, clientId, pos, field, e.target.value)}
                                    >
                                        <option value="">{field.emptyLabel || term('select-placeholder')}</option>
                                        {options.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                )}
                                {field.kind === 'select' && isLinguisticRoleField && (
                                    <div className="space-y-2">
                                        <select
                                            className={inputClass}
                                            value={customRoleMode ? '__custom__' : selectedRoleValue}
                                            onChange={(e) => {
                                                const nextValue = e.target.value;
                                                if (!nextValue) {
                                                    setCustomRoleMode(false);
                                                    updatePatternField(setValue, clientId, pos, field, '');
                                                    return;
                                                }

                                                if (nextValue === '__custom__') {
                                                    setCustomRoleMode(true);
                                                    updatePatternField(setValue, clientId, pos, field, '');
                                                    return;
                                                }

                                                setCustomRoleMode(false);
                                                updatePatternField(setValue, clientId, pos, field, nextValue);
                                            }}
                                        >
                                    <option value="">{field.emptyLabel || term('select-placeholder')}</option>
                                    {options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                            <option value="__custom__">{term('custom-role')}</option>
                                        </select>

                                        {customRoleMode && (
                                            <input
                                                className={inputClass}
                                                value={fieldValue}
                                                onChange={(e) => updatePatternField(setValue, clientId, pos, field, e.target.value)}
                                                placeholder={term('type-a-new-linguistic-role')}
                                            />
                                        )}
                                    </div>
                                )}
                                {field.kind === 'text' && (
                                    <input
                                        className={inputClass}
                                        value={fieldValue}
                                        onChange={(e) => updatePatternField(setValue, clientId, pos, field, e.target.value)}
                                        placeholder={field.placeholder}
                                    />
                                )}
                                {field.kind === 'textarea' && (
                                    <textarea
                                        className={cn(inputClass, 'min-h-[84px] resize-y')}
                                        value={fieldValue}
                                        onChange={(e) => updatePatternField(setValue, clientId, pos, field, e.target.value)}
                                        placeholder={field.placeholder}
                                        rows={field.rows || 3}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-black/10 bg-white/60 px-3 py-2 text-[11px] text-black/40">
                    {term('pattern-role-no-extra-metadata')}
                </div>
            )}
        </div>
    );
}

function ApplicabilitySection({
    pos,
    value,
    setValue,
    labelClass,
    inputClass,
}: {
    pos: PatternPos;
    value: FormValue;
    setValue: Dispatch<SetStateAction<FormValue>>;
    labelClass: string;
    inputClass: string;
}) {
    const { term } = useLinguisticMode();
    const schema = PATTERN_POS_SCHEMA[pos];
    const apps = getApplicabilitiesForPos(value, pos);

    return (
        <div className="rounded-2xl border border-black/5 bg-slate-50/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#1034A6]">{schema?.label || pos}</h5>
                    <p className="text-[11px] text-black/40">
                        {apps.length > 1
                            ? term('roles-in-this-pos', { count: apps.length })
                            : term('metadata-for-this-pos')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => addApplicability(setValue, pos)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#1034A6] hover:text-[#0b2f86] transition-colors"
                >
                    {term('add-role')}
                </button>
            </div>
            {apps.length > 0 ? (
                <div className="space-y-3.5">
                    {apps.map((app) => (
                        <ApplicabilityCard
                            key={app.clientId || `${pos}-${app.linguisticRole || app.gender || 'role'}`}
                            pos={pos}
                            app={app}
                            setValue={setValue}
                            labelClass={labelClass}
                            inputClass={inputClass}
                        />
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-black/10 bg-white/60 px-3 py-2 text-[11px] text-black/40">
                    {term('no-roles-yet-for-this-pos')}
                </div>
            )}
        </div>
    );
}
