import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminCreateEntry, adminUpdateEntry } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateRootForms } from '@/lib/conjugationEngine';
import type { WeakClass } from '@/types';

export const POS_OPTIONS = [
    'noun', 'verb', 'adjective', 'adverb', 'preposition',
    'conjunction', 'particle', 'article', 'pronoun',
    'interrogative', 'numeral', 'interjection',
];

export const GENDER_OPTIONS = ['masculine', 'feminine', 'common'];
export const VERB_CLASS_OPTIONS = ['strong', 'weak', 'doubled', 'quadrilateral', 'loan'];
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
    verb_vowel_perf?: string;
    verb_vowel_impf?: string;
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
    verb_vowel_perf: '',
    verb_vowel_impf: '',
    verb_active_ptcp: '',
    verb_passive_ptcp: '',
    adj_masculine: '',
    adj_feminine: '',
    adj_plural: '',
    is_loanword: false,
    source_language: '',
    definitions: [
        { text_en: '', text_mt: '', register: '' }
    ],
    etymology_chain: [] as { language: string; form: string; meaning: string }[],
    ipa: '',
    tags: '',
    _formLabel: '',
    _rootConsonants: '',
    _weakClass: '',
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
        verb_vowel_perf: (entry as any)?.verb_vowel_perf ?? initialForm?.verb_vowel_perf ?? '',
        verb_vowel_impf: (entry as any)?.verb_vowel_impf ?? initialForm?.verb_vowel_impf ?? '',
        is_loanword: entry?.is_loanword ?? initialForm?.is_loanword ?? false,
        source_language: entry?.source_language ?? initialForm?.source_language ?? '',
        definitions: (entry as any)?.definitions ?? [
            { text_en: (entry as any)?.text_en ?? '', text_mt: '', register: '' }
        ],
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

            if (isEdit && entry) {
                await adminUpdateEntry(token, payload);
            } else {
                await adminCreateEntry(token, payload);
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
                                <label className={label}>{t('Active Participle', 'Partiċipju Attiv')}</label>
                                <input className={inp} value={form.verb_active_ptcp || ''}
                                    onChange={e => set('verb_active_ptcp', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>{t('Passive Participle', 'Partiċipju Passiv')}</label>
                                <input className={inp} value={form.verb_passive_ptcp || ''}
                                    onChange={e => set('verb_passive_ptcp', e.target.value)} />
                            </div>
                            <div>
                                <label className={label}>{t('Verbal Noun', 'Nom Verbali')}</label>
                                <input className={inp} value={form.verb_verbal_noun || ''}
                                    onChange={e => set('verb_verbal_noun', e.target.value)} />
                            </div>
                        </div>

                        {conjugationPreview && (
                            <div className="mt-4 p-3 bg-blue-50/50 rounded border border-blue-100/50">
                                <legend className="text-xs font-semibold text-blue-900 mb-2">{t('Auto-Generated Preview', 'Dehra Minn Qabel (Magna)')}</legend>
                                <div className="grid grid-cols-2 gap-4 text-sm font-arabic">
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
                            {form.definitions.length > 1 && (
                                <button type="button" onClick={() => set('definitions', form.definitions.filter((_: any, idx: number) => idx !== i))}
                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors">
                                    <span className="sr-only">Delete</span>
                                    &times;
                                </button>
                            )}
                            <div className="grid grid-cols-2 gap-3">
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
                                    <label className={label}>{t('Register', 'Reġistru')}</label>
                                    <select className={sel} value={def.register} onChange={e => {
                                        const next = [...form.definitions];
                                        next[i].register = e.target.value;
                                        set('definitions', next);
                                    }}>
                                        <option value="">—</option>
                                        {REGISTER_OPTIONS.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </fieldset>

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

                {/* Tags */}
                <div className="px-1">
                    <label className={label}>{t('Tags (comma)', 'Tags (virgola)')}</label>
                    <input className={inp} value={form.tags} onChange={e => set('tags', e.target.value)}
                        placeholder={t('e.g. colloquial, archaic', 'eż. kollokjali, arkajku')} />
                </div>

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
