import { useRef, useState, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from 'react';
import { Keyboard, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useAdminConfig, type ConfigItem } from '@/lib/adminConfig';
import { getCategoryById } from '@/lib/adminCategoryRegistry';
import { cn } from '@/lib/utils';

interface ConfigFormModalProps {
    item: ConfigItem | null;
    category: string;
    onClose: () => void;
    onSave: (val: { key: string; value: unknown }) => Promise<void>;
}
type FormValue = Record<string, any>;

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

    const { getValues } = useAdminConfig();
    const posOptions = (getValues('pos') || []) as string[];
    const activeRegistry = getCategoryById(category);
    const isComplex = activeRegistry?.editorType !== 'simple_label';

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
        if (!key.trim()) {
            setError('Key is required');
            return;
        }

        setSaving(true);
        try {
            await onSave({ key, value });
        } catch (submitError: unknown) {
            setError(submitError instanceof Error ? submitError.message : String(submitError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onClose={onClose} title={item ? 'Edit Item' : `Add New ${category}`} size={isComplex ? 'lg' : 'md'}>
            <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 max-h-[85vh] overflow-hidden">
                {error && <div className="px-6 py-3"><div className="bg-red-50 text-red-800 p-3 rounded-xl text-sm border border-red-100">{error}</div></div>}

                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
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
                        hideMaltese={activeRegistry?.editorType === 'pattern'}
                    />

                    {isComplex && (
                        <section className="pt-4 border-t border-black/5 space-y-4">
                            <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-widest">Specific Configuration</h4>
                            {activeRegistry?.editorType === 'verb_preset' ? (
                                <VerbPresetSection value={value} setValue={setValue} inputClass={inputClass} />
                            ) : (
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
                                    posOptions={posOptions}
                                    showPosFilter={Boolean(activeRegistry?.hasPosFilter)}
                                />
                            )}
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
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                <div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
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
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-black/5">
                <div>
                    <label htmlFor="pattern-description" className={labelClass}>Linguistic Description / Role Notes</label>
                    <textarea
                        id="pattern-description"
                        className={cn(inputClass, 'resize-none h-20')}
                        value={value.description || ''}
                        onChange={(e) => setValue({ ...value, description: e.target.value })}
                        placeholder="e.g. Used for quadriliteral broken plurals..."
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="pattern-role" className={labelClass}>Explicit Linguistic Role</label>
                    <select
                        id="pattern-role"
                        className={inputClass}
                        value={value.linguistic_role || ''}
                        onChange={(e) => setValue({ ...value, linguistic_role: e.target.value })}
                    >
                        <option value="">-- None / General --</option>
                        <option value="masculine_singular">Masculine Singular</option>
                        <option value="feminine_singular">Feminine Singular</option>
                        <option value="broken_plural">Broken Plural</option>
                        <option value="sound_plural">Sound Plural</option>
                        <option value="dual">Dual</option>
                        <option value="diminutive">Diminutive</option>
                        <option value="elative_masc">Elative (Masc)</option>
                        <option value="elative_fem">Elative (Fem)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="pattern-gender" className={labelClass}>Target Gender</label>
                    <select
                        id="pattern-gender"
                        className={inputClass}
                        value={value.gender || ''}
                        onChange={(e) => setValue({ ...value, gender: e.target.value })}
                    >
                        <option value="">-- Any --</option>
                        <option value="masculine">Masculine</option>
                        <option value="feminine">Feminine</option>
                        <option value="neutral">Neutral</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-start">
                <button
                    ref={kbTriggerRef}
                    type="button"
                    onClick={() => setKbOpen(!kbOpen)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all',
                        kbOpen ? 'bg-[#1034A6] text-white border-[#1034A6]' : 'bg-white text-black/40 border-black/10 hover:border-black/20',
                    )}
                >
                    <Keyboard size={12} /> {kbOpen ? 'Close Keyboard' : 'Open Keyboard'}
                </button>
                <div className="relative">
                    <MalteseCharPicker open={kbOpen} onOpenChange={setKbOpen} onInsert={insertChar} triggerRef={kbTriggerRef} />
                </div>
            </div>

            {showPosFilter && (
                <div>
                    <label className={labelClass}>Apply to POS</label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {posOptions.map((pos) => {
                            const isSelected = (value.pos_types || []).includes(pos);
                            return (
                                <button
                                    key={pos}
                                    type="button"
                                    onClick={() => {
                                        const current = Array.isArray(value.pos_types) ? value.pos_types : [];
                                        const next = isSelected ? current.filter((x: string) => x !== pos) : [...current, pos];
                                        setValue({ ...value, pos_types: next });
                                    }}
                                    className={cn(
                                        'px-3 py-1 text-[10px] font-bold rounded-lg border transition-all',
                                        isSelected ? 'bg-[#1034A6] text-white border-[#1034A6]' : 'bg-white text-black/40 border-black/10 hover:border-black/20',
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
