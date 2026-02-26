import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminCreateEntry, adminDeleteEntry } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export const POS_OPTIONS = [
    'noun', 'verb', 'adjective', 'adverb', 'preposition',
    'conjunction', 'particle', 'article', 'pronoun',
    'interrogative', 'numeral', 'interjection',
];

export const GENDER_OPTIONS = ['masculine', 'feminine', 'neutral'];
export const VERB_CLASS_OPTIONS = ['strong', 'geminated', 'hollow', 'defective', 'strong-hybrid'];
export const REGISTER_OPTIONS = ['formal', 'informal', 'archaic', 'technical', 'dialectal', 'colloquial'];

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
}

export interface EntryFormModalProps {
    entry: AdminEntry | null;
    onClose: () => void;
    onSaved: () => void;
    getToken: () => Promise<string | null>;
    initialForm?: Partial<typeof INITIAL_FORM_STATE>;
}

const INITIAL_FORM_STATE = {
    headword: '',
    pos: 'noun',
    noun_gender: '',
    noun_singular: '',
    noun_plural_forms: '',  // comma-separated
    noun_sound_plural: '',
    noun_dual: '',
    verb_class: '',
    verb_transitivity: '',
    verb_perfective_3sgm: '',
    verb_imperfective_3sgm: '',
    verb_verbal_noun: '',
    adj_masculine: '',
    adj_feminine: '',
    adj_plural: '',
    is_loanword: false,
    source_language: '',
    definition_en: '',
    definition_mt: '',
    register: '',
    ipa: '',
    tags: '',
};

export function EntryFormModal({ entry, onClose, onSaved, getToken, initialForm }: EntryFormModalProps) {
    const isEdit = Boolean(entry);
    const { t } = useLanguage();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        ...INITIAL_FORM_STATE,
        headword: entry?.headword ?? initialForm?.headword ?? '',
        pos: entry?.pos ?? initialForm?.pos ?? 'noun',
        noun_gender: (entry as any)?.noun_gender ?? initialForm?.noun_gender ?? '',
        noun_singular: (entry as any)?.noun_singular ?? initialForm?.noun_singular ?? '',
        verb_class: (entry as any)?.verb_class ?? initialForm?.verb_class ?? '',
        is_loanword: entry?.is_loanword ?? initialForm?.is_loanword ?? false,
        source_language: entry?.source_language ?? initialForm?.source_language ?? '',
        definition_en: (entry as any)?.text_en ?? initialForm?.definition_en ?? '',
        ...initialForm
    });

    const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
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
            const payload: Record<string, unknown> = {
                ...form,
                noun_plural_forms: form.noun_plural_forms
                    ? form.noun_plural_forms.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : [],
                tags: form.tags ? form.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            };
            if (isEdit && entry) payload.id = entry.id;

            // If editing, we actually delete and recreate in the mock API or just update
            // For now follow the original logic in Admin.tsx
            if (isEdit && entry) {
                await adminDeleteEntry(token, entry.id);
            }
            await adminCreateEntry(token, payload);

            onSaved();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const inp = "w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black";
    const sel = inp + " cursor-pointer";
    const label = "block text-xs font-semibold text-black uppercase tracking-wider mb-1";

    return (
        <Modal
            open
            onClose={onClose}
            title={isEdit ? `${t('Edit', 'Editja')}: ${entry?.headword}` : t('New Entry', 'Entrata Ġdida')}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                {error && (
                    <div className="bg-red-50 text-red-800 border border-red-200 rounded px-3 py-2 text-sm">
                        {error}
                    </div>
                )}

                {/* Core */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className={label}>{t('Headword', 'Mamma')} *</label>
                        <input className={inp} value={form.headword} onChange={e => set('headword', e.target.value)} required />
                    </div>
                    <div>
                        <label className={label}>POS *</label>
                        <select className={sel} value={form.pos} onChange={e => set('pos', e.target.value)}>
                            {POS_OPTIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                {/* IPA */}
                <div>
                    <label className={label}>{t('IPA (Standard)', 'IPA (Standard)')}</label>
                    <input className={inp} value={form.ipa} onChange={e => set('ipa', e.target.value)}
                        placeholder={t('e.g. /ˈkɪtɛp/', 'eż. /ˈkɪtɛp/')} />
                </div>

                {/* Noun fields */}
                {form.pos === 'noun' && (
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                        <legend className="text-xs font-semibold text-black px-2 text-black">{t('Noun', 'Nom')}</legend>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={label}>{t('Gender', 'Ġeneru')}</label>
                                <select className={sel} value={form.noun_gender} onChange={e => set('noun_gender', e.target.value)}>
                                    <option value="">—</option>
                                    {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={label}>{t('Singular', 'Singular')}</label>
                                <input className={inp} value={form.noun_singular} onChange={e => set('noun_singular', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>{t('Broken Plural', 'Plural miksur')}</label>
                                <input className={inp} value={form.noun_plural_forms}
                                    onChange={e => set('noun_plural_forms', e.target.value)} placeholder={t('book, books', 'ktieb, kotba')} />
                            </div>
                            <div>
                                <label className={label}>{t('Sound Plural', 'Plural sħiħ')}</label>
                                <input className={inp} value={form.noun_sound_plural} onChange={e => set('noun_sound_plural', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>{t('Dual', 'Imtenni')}</label>
                                <input className={inp} value={form.noun_dual} onChange={e => set('noun_dual', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>
                )}

                {/* Verb fields */}
                {form.pos === 'verb' && (
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                        <legend className="text-xs font-semibold text-black px-2 text-black">{t('Verb', 'Verb')}</legend>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={label}>{t('Class', 'Klassi')}</label>
                                <select className={sel} value={form.verb_class} onChange={e => set('verb_class', e.target.value)}>
                                    <option value="">—</option>
                                    {VERB_CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={label}>{t('Perfect 3sg.m', 'Perfett 3sg.m')}</label>
                                <input className={inp} value={form.verb_perfective_3sgm}
                                    onChange={e => set('verb_perfective_3sgm', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>{t('Imperfect 3sg.m', 'Imperfett 3sg.m')}</label>
                                <input className={inp} value={form.verb_imperfective_3sgm}
                                    onChange={e => set('verb_imperfective_3sgm', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>{t('Verbal Noun', 'Nom Verbali')}</label>
                                <input className={inp} value={form.verb_verbal_noun}
                                    onChange={e => set('verb_verbal_noun', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>
                )}

                {/* Adjective fields */}
                {form.pos === 'adjective' && (
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                        <legend className="text-xs font-semibold text-black px-2 text-black">{t('Adjective', 'Aġġettiv')}</legend>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={label}>{t('Masculine', 'Maskil')}</label>
                                <input className={inp} value={form.adj_masculine} onChange={e => set('adj_masculine', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>{t('Feminine', 'Femminil')}</label>
                                <input className={inp} value={form.adj_feminine} onChange={e => set('adj_feminine', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>{t('Plural', 'Plural')}</label>
                                <input className={inp} value={form.adj_plural} onChange={e => set('adj_plural', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>
                )}

                {/* Etymology / loanword */}
                <div className="grid grid-cols-2 gap-3 text-black">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="loanword" checked={form.is_loanword}
                            onChange={e => set('is_loanword', e.target.checked)}
                            className="w-4 h-4 text-[#1034A6] rounded" />
                        <label htmlFor="loanword" className="text-sm">{t('Loanword / Borrowing', 'Self (loanword)')}?</label>
                    </div>
                    {form.is_loanword && (
                        <div>
                            <label className={label}>{t('Source Language', 'Lingwa Sors')}</label>
                            <input className={inp} value={form.source_language}
                                onChange={e => set('source_language', e.target.value)} placeholder={t('e.g. Italian', 'eż. Taljan')} />
                        </div>
                    )}
                </div>

                {/* Definition */}
                <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                    <legend className="text-xs font-semibold text-black px-2 text-black">{t('Definition (Sense 1)', 'Definizzjoni (Sens 1)')}</legend>
                    <div>
                        <label className={label}>{t('English', 'Bl-Ingliż')}</label>
                        <textarea className={inp} rows={2} value={form.definition_en}
                            onChange={e => set('definition_en', e.target.value)} />
                    </div>
                    <div>
                        <label className={label}>{t('Maltese (optional)', 'Bil-Malti (għażli)')}</label>
                        <textarea className={inp} rows={2} value={form.definition_mt}
                            onChange={e => set('definition_mt', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-black">
                        <div>
                            <label className={label}>{t('Register', 'Reġistru')}</label>
                            <select className={sel} value={form.register} onChange={e => set('register', e.target.value)}>
                                <option value="">—</option>
                                {REGISTER_OPTIONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={label}>{t('Tags (comma)', 'Tags (virgola)')}</label>
                            <input className={inp} value={form.tags} onChange={e => set('tags', e.target.value)}
                                placeholder={t('e.g. colloquial, archaic', 'eż. kollokjali, arkajku')} />
                        </div>
                    </div>
                </fieldset>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>{t('Cancel', 'Ikkanċella')}</Button>
                    <Button type="submit" loading={saving}>
                        {isEdit ? t('Save Changes', 'Issejva l-Bidliet') : t('Create Entry', 'Oħloq Entrata')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
