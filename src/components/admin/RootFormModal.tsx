import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Trash2 } from 'lucide-react';

export interface RootFormData {
    consonants: string;
    glosses: string[]; // up to 10
    etymology: {
        language: string;
        term: string;
        definition: string;
    };
    source: string;
    strength: string;
    weak_class?: string;
}

interface RootFormModalProps {
    data: RootFormData;
    onClose: () => void;
    onSaved: (newData: RootFormData) => void;
    saving?: boolean;
}

export function RootFormModal({ data, onClose, onSaved, saving }: RootFormModalProps) {
    const { t } = useLanguage();
    const [form, setForm] = useState<RootFormData>(data);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaved(form);
    };

    const setEtymology = (key: string, value: string) => {
        setForm(f => ({ ...f, etymology: { ...f.etymology, [key]: value } }));
    };

    const updateGloss = (index: number, val: string) => {
        const newGlosses = [...form.glosses];
        newGlosses[index] = val;
        setForm({ ...form, glosses: newGlosses });
    };

    const addGloss = () => {
        if (form.glosses.length < 10) {
            setForm({ ...form, glosses: [...form.glosses, ''] });
        }
    };

    const removeGloss = (index: number) => {
        if (form.glosses.length > 1) {
            setForm({ ...form, glosses: form.glosses.filter((_, i) => i !== index) });
        }
    };

    // Auto-calculate type based on consonants
    const consonantsArray = form.consonants.split('-').filter(Boolean);
    const rootClass = consonantsArray.length === 4 ? 'QUADRILITERAL' : 'TRILITTERAL';

    const inp = "w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black placeholder:text-black/20";
    const sel = inp + " cursor-pointer";
    const label = "block text-xs font-semibold text-black uppercase tracking-wider mb-1";

    return (
        <Modal open onClose={onClose} title={t('Edit Root Info', 'Editja l-Info tal-Għerq')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                {/* Consonants & Type */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className={label}>{t('Root Consonants', 'Konsonanti')}</label>
                        <input className={inp} value={form.consonants} onChange={e => setForm({ ...form, consonants: e.target.value })} placeholder="e.g. f-għ-l" />
                    </div>
                    <div>
                        <label className={label}>{t('Root Class', 'Klassi tal-Għerq')}</label>
                        <div className="px-3 py-2 text-sm font-semibold text-black/40 bg-black/5 rounded-lg border border-black/5 h-[38px] flex items-center">
                            {rootClass}
                        </div>
                    </div>
                </div>

                {/* Glosses List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className={label}>{t('Glosses', 'Tifsiriet')}</label>
                        {form.glosses.length < 10 && (
                            <button type="button" onClick={addGloss} className="text-[0.65rem] font-bold text-[#1034A6] uppercase hover:underline flex items-center gap-1">
                                <Plus size={10} /> Add Gloss
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {form.glosses.map((g, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-xs font-serif text-black/30 w-4">{i + 1}.</span>
                                <input
                                    className={inp}
                                    value={g}
                                    onChange={e => updateGloss(i, e.target.value)}
                                    placeholder={i === 0 ? "Primary gloss" : "Secondary gloss"}
                                />
                                {form.glosses.length > 1 && (
                                    <button type="button" onClick={() => removeGloss(i)} className="p-2 text-black/20 hover:text-red-600 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Etymology Section */}
                <fieldset className="border border-[#ede9e1] rounded-xl p-4 pt-3">
                    <legend className="text-[0.65rem] font-bold text-black px-2 uppercase tracking-widest">{t('Etymology', 'Etimoloġija')}</legend>
                    <div className="grid grid-cols-3 gap-3 mt-1">
                        <div>
                            <label className={label}>{t('Language', 'Lingwa')}</label>
                            <input className={inp} value={form.etymology.language} onChange={e => setEtymology('language', e.target.value)} placeholder="e.g. Arabic" />
                        </div>
                        <div>
                            <label className={label}>{t('Term', 'Kelma')}</label>
                            <input className={inp} value={form.etymology.term} onChange={e => setEtymology('term', e.target.value)} placeholder="e.g. bada'a" />
                        </div>
                        <div>
                            <label className={label}>{t('Definition', 'Tifsira')}</label>
                            <input className={inp} value={form.etymology.definition} onChange={e => setEtymology('definition', e.target.value)} placeholder="e.g. to begin" />
                        </div>
                    </div>
                </fieldset>

                {/* Source & Strength */}
                <div className="space-y-4">
                    <div>
                        <label className={label}>{t('Source Citation', 'Sors')}</label>
                        <input className={inp} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. Aquilina2006" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={label}>{t('Strength', 'Qawwa')}</label>
                            <select
                                className={sel}
                                value={form.strength === 'strong' ? 'strong' : 'weak'}
                                onChange={e => setForm({ ...form, strength: e.target.value })}
                            >
                                <option value="strong">Strong</option>
                                <option value="weak">Weak</option>
                            </select>
                        </div>
                        {form.strength !== 'strong' && (
                            <div>
                                <label className={label}>{t('Weak Class', 'Klassi dgħajfa')}</label>
                                <select
                                    className={sel}
                                    value={form.weak_class || ''}
                                    onChange={e => setForm({ ...form, weak_class: e.target.value })}
                                >
                                    <option value="">—</option>
                                    <option value="defective">Defective</option>
                                    <option value="hollow">Hollow</option>
                                    <option value="assimilative">Assimilative</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                    <Button type="button" variant="ghost" onClick={onClose}>{t('Cancel', 'Ikkanċella')}</Button>
                    <Button type="submit" loading={saving}>{t('Save Changes', 'Issejva l-Bidliet')}</Button>
                </div>
            </form>
        </Modal>
    );
}
