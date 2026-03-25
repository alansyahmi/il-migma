import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminConfig } from '@/lib/adminConfig';
import { Plus, Trash2, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { RelationshipEditor } from './RelationshipEditor';
import { adminCreateStem, adminUpdateStem } from '@/lib/api';
import {
    normalizeStemEtymology,
    normalizeStemGloss,
    normalizeStemMorphology,
    normalizeStemRelationships,
    normalizeStemTags,
    type StemFormData
} from '@/lib/adminUtils';
import { buildStemPayload, STEM_HANDLED_FIELDS } from '@/lib/adminSchema';

interface StemFormModalProps {
    data: any;
    onClose: () => void;
    onSaved: (newData: StemFormData) => void;
    isNew?: boolean;
    getToken: () => Promise<string | null>;
}

export function StemFormModal({ data, onClose, onSaved, isNew = false, getToken }: StemFormModalProps) {
    const { getValues } = useAdminConfig();
    const RELATIONSHIP_OPTIONS = getValues('root_relationship');
    const SOURCE_LANGUAGE_OPTIONS = getValues('source_language');
    const { t } = useLanguage();

    const initialState = useMemo<StemFormData>(() => {
        const morph = normalizeStemMorphology(data, data?.stem_string || '');
        return {
            ...morph,
            tags: normalizeStemTags(data.tags).join(', '),
            source: data.source || '',
            glosses: normalizeStemGloss(data.glosses),
            etymology: normalizeStemEtymology(data.etymology),
            synonyms: normalizeStemRelationships(data.synonyms),
            antonyms: normalizeStemRelationships(data.antonyms),
            related_stems: normalizeStemRelationships(data.related_stems),
        };
    }, [data]);

    const [form, setForm] = useState<StemFormData>(initialState);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.stem_string.trim()) {
            setError(t('Stem is required', 'Iż-Żokk huwa meħtieġ'));
            return;
        }
        setSaving(true);
        setError('');

        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const payload = buildStemPayload(form);

            if (isNew) {
                await adminCreateStem(token, payload);
            } else {
                await adminUpdateStem(token, initialState.stem_string, payload);
            }

            onSaved(form);
        } catch (err: any) {
            setError(err.message || 'Failed to save stem');
        } finally {
            setSaving(false);
        }
    };

    const updateGloss = (index: number, lang: 'en' | 'mt', val: string) => {
        const next = [...form.glosses];
        next[index] = { ...next[index], [lang]: val };
        setForm({ ...form, glosses: next });
    };

    const addGloss = () => {
        if (form.glosses.length < 10) {
            setForm({ ...form, glosses: [...form.glosses, { en: '', mt: '' }] });
        }
    };

    const removeGloss = (index: number) => {
        if (form.glosses.length > 1) {
            setForm({ ...form, glosses: form.glosses.filter((_, i) => i !== index) });
        }
    };

    const moveGloss = (index: number, direction: 'up' | 'down') => {
        const next = [...form.glosses];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setForm({ ...form, glosses: next });
    };

    const setEtymology = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, etymology: { ...prev.etymology, [key]: value } }));
    };

    const setRelationship = (key: 'synonyms' | 'antonyms' | 'related_stems', value: any[]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const stemType = form.is_hybrid ? 'HYBRID' : 'STANDARD';
    const inp = 'w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black placeholder:text-black/20';
    const sel = `${inp} cursor-pointer`;
    const label = 'block text-xs font-semibold text-black uppercase tracking-wider mb-1';

    return (
        <Modal open onClose={onClose} title={isNew ? t('New Stem', 'Żokk Ġdid') : t('Edit Stem Info', 'Editja l-Info taż-Żokk')} size="lg">
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="space-y-6 overflow-y-auto pr-2 flex-1 scrollbar-thin">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                            <AlertCircle size={14} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className={label}>{t('Stem', 'Żokk')}</label>
                            <input
                                className={`${inp} font-serif`}
                                value={form.stem_string}
                                onChange={e => setForm({ ...form, stem_string: e.target.value })}
                                placeholder="e.g. kanta"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <label className={label}>{t('Stem Class', 'Klassi taż-Żokk')}</label>
                            <select
                                className={sel}
                                value={form.class_type}
                                onChange={e => setForm({ ...form, class_type: e.target.value as 'ar' | 'ir' })}
                            >
                                <option value="ar">-ar</option>
                                <option value="ir">-ir</option>
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <label className={label}>{t('Type', 'Tip')}</label>
                            <div className="px-3 py-2 text-sm font-semibold text-black/40 bg-black/5 rounded-lg border border-black/5 h-[38px] flex items-center">
                                {stemType}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={label}>{t('Tags (comma separated)', 'Tikketti (separati bil-virgola)')}</label>
                            <input className={inp} value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. archaic, loanword" />
                        </div>
                        <div>
                            <label className={label}>{t('Source Citation', 'Sors')}</label>
                            <input className={inp} value={form.source || ''} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. Aquilina2006" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={label}>{t('Agentive Suffix Override', 'Suffiss Aġentiv Override')}</label>
                            <input
                                className={inp}
                                value={form.agentive_suffix || ''}
                                onChange={e => setForm({ ...form, agentive_suffix: e.target.value || null })}
                                placeholder="e.g. atur"
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-black/20 text-[#1034A6] focus:ring-[#1034A6]"
                                    checked={form.is_hybrid}
                                    onChange={e => setForm({ ...form, is_hybrid: e.target.checked })}
                                />
                                <span className={`${label} mb-0 group-hover:text-[#1034A6] transition-colors`}>
                                    {t('Hybrid', 'Ibridu')}
                                </span>
                            </label>
                        </div>
                    </div>

                    {form.is_hybrid && (
                        <div>
                            <label className={label}>{t('Reanalysed Root', 'Għerq Reanalizzat')}</label>
                            <input
                                className={inp}
                                value={form.root || ''}
                                onChange={e => setForm({ ...form, root: e.target.value || null })}
                                placeholder="e.g. k-n-t-j"
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className={label}>{t('Glosses', 'Tifsiriet')}</label>
                            {form.glosses.length < 10 && (
                                <button type="button" onClick={addGloss} className="text-[0.65rem] font-bold text-[#1034A6] uppercase hover:underline flex items-center gap-1">
                                    <Plus size={10} /> Add Gloss
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {form.glosses.map((g, i) => (
                                <div key={i} className="flex flex-col gap-2 p-3 bg-black/5 rounded-xl relative group">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">{i === 0 ? 'Primary Sense' : `Sense ${i + 1}`}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button type="button" onClick={() => moveGloss(i, 'up')} disabled={i === 0} className="p-1 text-black/20 hover:text-[#1034A6] disabled:opacity-0">
                                                <ArrowUp size={12} />
                                            </button>
                                            <button type="button" onClick={() => moveGloss(i, 'down')} disabled={i === form.glosses.length - 1} className="p-1 text-black/20 hover:text-[#1034A6] disabled:opacity-0">
                                                <ArrowDown size={12} />
                                            </button>
                                            {form.glosses.length > 1 && (
                                                <button type="button" onClick={() => removeGloss(i)} className="p-1 text-black/20 hover:text-red-600">
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-black/40 uppercase ml-1">English</span>
                                            <input className={inp} value={g.en} onChange={e => updateGloss(i, 'en', e.target.value)} placeholder="e.g. to chant" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-black/40 uppercase ml-1">Maltese</span>
                                            <input className={inp} value={g.mt} onChange={e => updateGloss(i, 'mt', e.target.value)} placeholder="e.g. kanta" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <fieldset className="border border-border-light rounded-xl p-4 pt-3">
                        <legend className="text-[0.65rem] font-bold text-black px-2 uppercase tracking-widest">{t('Etymology', 'Etimoloġija')}</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-1">
                            <div>
                                <label className={label}>Relationship</label>
                                <select className={sel} value={form.etymology.relationship || 'From'} onChange={e => setEtymology('relationship', e.target.value)}>
                                    {(RELATIONSHIP_OPTIONS.length > 0 ? RELATIONSHIP_OPTIONS : ['From', 'Borrowed from', 'Calqued from', 'Metathesis of', 'Related to', 'Variant of']).map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={label}>{t('Language', 'Lingwa')}</label>
                                <input className={inp} value={form.etymology.language || ''} onChange={e => setEtymology('language', e.target.value)} list="stem-source-language-options" placeholder="e.g. Italian" />
                                <datalist id="stem-source-language-options">
                                    {SOURCE_LANGUAGE_OPTIONS.map((l: string) => <option key={l} value={l} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className={label}>{t('Term', 'Kelma')}</label>
                                <input className={inp} value={form.etymology.term || ''} onChange={e => setEtymology('term', e.target.value)} placeholder="e.g. cantare" />
                            </div>
                            <div>
                                <label className={label}>Pronunciation</label>
                                <input className={inp} value={form.etymology.pronunciation || ''} onChange={e => setEtymology('pronunciation', e.target.value)} placeholder="e.g. kan-ta-re" />
                            </div>
                            <div>
                                <label className={label}>{t('Definition', 'Tifsira')}</label>
                                <input className={inp} value={form.etymology.definition || ''} onChange={e => setEtymology('definition', e.target.value)} placeholder="e.g. to sing" />
                            </div>
                        </div>
                    </fieldset>

                    <div className="space-y-6">
                        <RelationshipEditor
                            type="thesaurus"
                            lookupType="stem"
                            title={t('Synonyms', 'Sinonimi')}
                            items={form.synonyms || []}
                            onChange={(items) => setRelationship('synonyms', items)}
                            enableSuggestions
                        />
                        <RelationshipEditor
                            type="thesaurus"
                            lookupType="stem"
                            title={t('Antonyms', 'Antonimi')}
                            items={form.antonyms || []}
                            onChange={(items) => setRelationship('antonyms', items)}
                            enableSuggestions
                        />
                        <RelationshipEditor
                            type="derived"
                            lookupType="stem"
                            title={t('Related Stems', 'Żkuk Relatati')}
                            items={form.related_stems || []}
                            onChange={(items) => setRelationship('related_stems', items)}
                            enableSuggestions
                        />
                    </div>

                    {Object.keys(data || {}).filter((key) => !STEM_HANDLED_FIELDS.includes(key as any)).length > 0 && (
                        <fieldset className="border border-amber-100 bg-amber-50/20 rounded-xl p-4 space-y-3">
                            <legend className="text-[10px] font-bold text-amber-600 uppercase tracking-widest px-2">{t('Additional Fields', 'Għelieqi Oħra')}</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.keys(data || {}).filter((key) => !STEM_HANDLED_FIELDS.includes(key as any)).map((key) => (
                                    <div key={key}>
                                        <label className={label}>{key}</label>
                                        <input className={inp} value={(form as any)[key] ?? ''} onChange={e => setForm({ ...(form as any), [key]: e.target.value })} />
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    )}
                </div>

                <div className="flex justify-between items-center pt-4 mt-4 border-t border-black/10 shrink-0">
                    <div>
                        {!isNew && (
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
                                        if (!token) throw new Error('Not authenticated');
                                        const payload = buildStemPayload(form);
                                        await adminCreateStem(token, { ...payload, force: true });
                                        onSaved(form);
                                    } catch (err: any) {
                                        setError(err.message || 'Failed to duplicate');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                            >
                                <Plus size={14} className="mr-1" /> {t('Duplicate as New', 'Ikkopja bħala Ġdid')}
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            {t('Cancel', 'Ikkanċella')}
                        </Button>
                        <Button type="submit" loading={saving}>
                            {t('Save Changes', 'Issejva l-Bidliet')}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
