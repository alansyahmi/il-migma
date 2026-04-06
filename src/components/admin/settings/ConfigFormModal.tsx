import { useRef, useState, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from 'react';
import { Keyboard, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useAdminConfig, type ConfigItem } from '@/lib/adminConfig';
import { getCategoryById } from '@/lib/adminCategoryRegistry';
import {
    getPatternApplicabilitySummary,
    getPatternMetadataSummary,
    PATTERN_POS_OPTIONS,
    PATTERN_POS_SCHEMA,
    type PatternApplicability,
    type PatternFieldSpec,
    type PatternPos,
    normalizePatternFormValue,
} from '@/lib/patternMetadata';
import { cn } from '@/lib/utils';

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
    const [key, setKey] = useState(item?.key ?? '');
    const [value, setValue] = useState<FormValue>(() => {
        if (item) return item.value;
        const registry = getCategoryById(category);
        return (registry ? registry.defaultValueFactory() : { en: '', mt_standard: '', mt_arabised: '' }) as FormValue;
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
    const applicabilitySummaries = isPatternEditor ? getPatternApplicabilitySummary(value) : [];
    const patternKeyPreview = derivedPatternKey || 'Set CV and Wizen to generate the key';
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
            setError(isPatternEditor ? 'CV or Wizen is required' : 'Key is required');
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
        ? (isPatternEditor ? 'Edit Pattern' : `Edit ${categoryLabel}`)
        : (isPatternEditor ? 'Add Pattern' : `Add New ${categoryLabel}`);

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
                                        <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">Pattern Identity</h4>
                                        <p className="text-[11px] text-black/50 max-w-xl leading-snug">
                                            The saved key is composed from the surface forms below, so the record stays aligned with the pattern it describes.
                                        </p>
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#1034A6]/10 bg-white/90 px-2.5 py-1 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Derived Key</span>
                                        <span className="font-mono text-[11px] font-semibold text-[#1034A6]">{patternKeyPreview}</span>
                                    </div>
                                </div>
                                {patternSummary && (
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center rounded-full border border-[#1034A6]/10 bg-[#1034A6]/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#1034A6]">
                                            {patternSummary.bucketLabel}
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
                                        {applicabilitySummaries.map((app) => (
                                            <span key={app.pos} className="inline-flex items-center gap-1 rounded-full border border-[#1034A6]/10 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black/45">
                                                <span className="text-[#1034A6]">{app.label}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <section className="rounded-2xl border border-black/5 bg-white/80 p-3.5 shadow-sm space-y-3">
                                <div className="flex items-end justify-between gap-3 flex-wrap">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">Shared Pattern Base</h4>
                                        <p className="text-[11px] text-black/45 mt-1 leading-snug">
                                            CV, Wizen, stress, and description stay shared while POS applicability is edited below.
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
                                            <span>POS Applicability</span>
                                            <span className="rounded-full border border-black/5 bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black/35">
                                                Per POS
                                            </span>
                                        </div>
                                        <span className="text-black/30">Rendered from the selected POS schema</span>
                                    </summary>
                                    <div className="border-t border-black/5 px-3.5 py-3.5 space-y-3.5">
                                        {selectedPosTypes.length === 0 && (
                                            <p className="text-xs text-black/45">Pick one or more POS above to edit their metadata.</p>
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
                                <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">Identity</h4>
                                <div className="max-w-md">
                                    <label className={labelClass}>In-code ID / Key</label>
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
                            <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">Specific Configuration</h4>
                            <VerbPresetSection value={value} setValue={setValue} inputClass={inputClass} />
                        </section>
                    )}
                </div>

                <div className="sticky bottom-0 z-20 shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-black/5 bg-slate-50/95 rounded-b-2xl backdrop-blur-sm">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving} leftIcon={saving ? <RotateCcw className="animate-spin" size={14} /> : <Save size={14} />}>
                        {saving ? 'Saving...' : 'Save Config'}
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
    const en = typeof value.en === 'string' ? value.en : '';
    const mtStandard = typeof value.mt_standard === 'string' ? value.mt_standard : '';
    const mtArabised = typeof value.mt_arabised === 'string' ? value.mt_arabised : '';

    return (
        <section className="space-y-4 pt-4 border-t border-black/5">
            <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">Translations / Display Labels</h4>
            <div>
                <label className={labelClass}>English Label {category === 'verb_preset' ? '(Form Name)' : ''}</label>
                <input
                    className={inputClass}
                    value={en}
                    onChange={(e) => {
                        setValue({ ...value, en: e.target.value });
                    }}
                    placeholder={category === 'verb_preset' ? 'e.g. Form I' : 'English display name...'}
                />
            </div>

            {!hideMaltese && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Maltese (CV / Standard) {category === 'verb_preset' ? '(Form Name)' : ''}</label>
                        <input
                            className={inputClass}
                            value={mtStandard}
                            onChange={(e) => {
                                setValue({ ...value, mt_standard: e.target.value });
                            }}
                            placeholder={category === 'verb_preset' ? 'e.g. Forma I' : 'Standard Maltese label...'}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Maltese (Wizen / Arabised) {category === 'verb_preset' ? '(Form Name)' : ''}</label>
                        <input
                            className={inputClass}
                            value={mtArabised}
                            onChange={(e) => {
                                setValue({ ...value, mt_arabised: e.target.value });
                            }}
                            placeholder={category === 'verb_preset' ? 'e.g. Forma I' : 'Arabised Maltese label...'}
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
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {['perfect', 'passive', 'active', 'verbal'].map((form) => (
                <div key={form} className="space-y-2 border-l-2 border-slate-100 pl-3">
                    <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">{form}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-black/50 block mb-1">Standard (CV)</label>
                            <input className={inputClass} value={value[form]?.cv || ''} onChange={(e) => setValue({ ...value, [form]: { ...value[form], cv: e.target.value } })} placeholder="CV notation" />
                        </div>
                        <div>
                            <label className="text-[10px] text-black/50 block mb-1">Arabised (Wizen)</label>
                            <input className={inputClass} value={value[form]?.wizen || ''} onChange={(e) => setValue({ ...value, [form]: { ...value[form], wizen: e.target.value } })} placeholder="Wizen name" />
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
    const selectedPosTypes = Array.isArray(value.pos_types)
        ? value.pos_types.filter((pos): pos is string => typeof pos === 'string' && posOptions.includes(pos))
        : [];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3.5">
                <div className="space-y-1.5">
                    <label className={labelClass}>Maltese (CV / Standard) <span className="text-black/30 normal-case font-normal">(v = short, V = long vowel)</span></label>
                    <input
                        className={inputClass}
                        value={value.cv || ''}
                        onChange={(e) => setValue({ ...value, cv: e.target.value })}
                        onFocus={(e) => {
                            setActiveInput('cv');
                            activeInputRef.current = e.target;
                        }}
                        placeholder="e.g. CvCVC"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className={labelClass}>Maltese (Wizen / Arabised)</label>
                    <input
                        className={inputClass}
                        value={value.wizen || ''}
                        onChange={(e) => setValue({ ...value, wizen: e.target.value })}
                        onFocus={(e) => {
                            setActiveInput('wizen');
                            activeInputRef.current = e.target;
                        }}
                        placeholder="e.g. faghal"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                    <label className={labelClass}>Stress (syllable from end)</label>
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
                        <label className={labelClass}>Keyboard Helper</label>
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
                            <Keyboard size={12} /> {kbOpen ? 'Close Keyboard' : 'Open Keyboard'}
                        </button>
                        <div className="relative">
                            <MalteseCharPicker open={kbOpen} onOpenChange={setKbOpen} onInsert={insertChar} triggerRef={kbTriggerRef} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className={labelClass}>Description</label>
                <textarea
                    className={cn(inputClass, 'min-h-[84px] resize-y')}
                    value={value.description || ''}
                    onChange={(e) => setValue({ ...value, description: e.target.value })}
                    placeholder="Optional pattern description..."
                    rows={3}
                />
            </div>

            {showPosFilter && (
                <div className="rounded-2xl border border-black/5 bg-slate-50/70 p-3 space-y-2.5">
                    <div className="flex items-end justify-between gap-3 flex-wrap">
                        <div>
                            <label className={labelClass}>Apply to POS</label>
                        </div>
                        <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-black/40">
                            {selectedPosTypes.length} selected
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
                                    {String(pos).toUpperCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function createBlankApplicability(pos: PatternPos): PatternApplicability {
    return {
        pos: pos as PatternApplicability['pos'],
        linguisticRole: '',
        gender: '',
        notes: '',
        metadata: {},
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

function updatePatternField(
    setValue: Dispatch<SetStateAction<FormValue>>,
    pos: PatternPos,
    field: PatternFieldSpec,
    rawValue: string,
) {
    updateApplicability(setValue, pos, (current) => {
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

function getApplicabilityForPos(value: FormValue, pos: PatternPos) {
    const normalized = normalizePatternFormValue(value, 'cv_wizen_pattern');
    return normalized.applicabilities?.find((app) => app.pos === pos) || createBlankApplicability(pos);
}

function updateApplicability(
    setValue: Dispatch<SetStateAction<FormValue>>,
    pos: PatternPos,
    updater: (current: Record<string, any>) => Record<string, any>,
) {
    setValue((prev) => {
        const normalized = normalizePatternFormValue(prev, 'cv_wizen_pattern');
        const applicabilities = Array.isArray(normalized.applicabilities) ? normalized.applicabilities : [];
        const current = getApplicabilityForPos(prev, pos);
        const next = updater({
            ...current,
            metadata: { ...(current.metadata || {}) },
        });

        const nextApplicabilities = applicabilities.filter((item) => item.pos !== pos);
        nextApplicabilities.push({
            pos,
            linguisticRole: String(next.linguisticRole || '').trim(),
            gender: String(next.gender || '').trim(),
            notes: String(next.notes || '').trim(),
            metadata: next.metadata || {},
        });

        return {
            ...prev,
            pos_types: Array.from(new Set([...(normalized.pos_types || []), pos].filter((item) => nextApplicabilities.some((app) => app.pos === item)))),
            applicabilities: nextApplicabilities,
        };
    });
}

function removeApplicability(setValue: Dispatch<SetStateAction<FormValue>>, pos: PatternPos) {
    setValue((prev) => {
        const normalized = normalizePatternFormValue(prev, 'cv_wizen_pattern');
        const nextApplicabilities = (normalized.applicabilities || []).filter((item) => item.pos !== pos);
        return {
            ...prev,
            pos_types: (normalized.pos_types || []).filter((item) => item !== pos),
            applicabilities: nextApplicabilities,
        };
    });
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
    const { getValues } = useAdminConfig();
    const app = getApplicabilityForPos(value, pos);
    const schema = PATTERN_POS_SCHEMA[pos];

    return (
        <div className="rounded-2xl border border-black/5 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#1034A6]">{schema?.label || pos}</h5>
                    <p className="text-[11px] text-black/40">Metadata for this POS only</p>
                </div>
                <button
                    type="button"
                    onClick={() => removeApplicability(setValue, pos)}
                    className="text-[10px] font-bold uppercase tracking-widest text-black/35 hover:text-red-600 transition-colors"
                >
                    Remove
                </button>
            </div>
            <div className="grid grid-cols-1 gap-3.5">
                {(schema?.fields || []).map((field) => {
                    if (field.showWhen && !field.showWhen(app)) {
                        return null;
                    }

                    const fieldValue = getPatternFieldValue(app, field);
                    const options = getFieldOptions(field, getValues);

                    return (
                        <div
                            key={field.key}
                            className={field.kind === 'textarea' ? 'space-y-1 md:col-span-3' : 'space-y-1'}
                        >
                            <label className={labelClass}>{field.label}</label>
                            {field.kind === 'select' && (
                                <select
                                    className={inputClass}
                                    value={fieldValue}
                                    onChange={(e) => updatePatternField(setValue, pos, field, e.target.value)}
                                >
                                    <option value="">{field.emptyLabel || '-- Select --'}</option>
                                    {options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            )}
                            {field.kind === 'text' && (
                                <input
                                    className={inputClass}
                                    value={fieldValue}
                                    onChange={(e) => updatePatternField(setValue, pos, field, e.target.value)}
                                    placeholder={field.placeholder}
                                />
                            )}
                            {field.kind === 'textarea' && (
                                <textarea
                                    className={cn(inputClass, 'min-h-[84px] resize-y')}
                                    value={fieldValue}
                                    onChange={(e) => updatePatternField(setValue, pos, field, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={field.rows || 3}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
