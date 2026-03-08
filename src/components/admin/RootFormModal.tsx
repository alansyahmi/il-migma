import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Trash2, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { useAdminConfig } from '@/lib/adminConfig';
import { RelationshipEditor } from './RelationshipEditor';
import { adminCreateRoot, adminUpdateRoot } from '@/lib/api';
import { normalizeRootEtymology, normalizeRootGloss, normalizeRootRelationships, type RootFormData } from '@/lib/adminUtils';
import { buildRootPayload, ROOT_HANDLED_FIELDS } from '@/lib/adminSchema';

interface RootFormModalProps {
    data: any; // Raw data from DB (can be stringified JSONs) or RootFormData
    onClose: () => void;
    onSaved: (newData: RootFormData) => void;
    isNew?: boolean;
    getToken: () => Promise<string | null>;
}

export function RootFormModal({ data, onClose, onSaved, isNew = false, getToken }: RootFormModalProps) {
    const { getValues } = useAdminConfig();
    const RELATIONSHIP_OPTIONS = getValues('root_relationship');
    const STRENGTH_OPTIONS = getValues('root_strength');
    const WEAK_CLASS_OPTIONS = getValues('weak_class');
    const SOURCE_LANGUAGE_OPTIONS = getValues('source_language');

    const { t } = useLanguage();

    // Normalize initial state from raw data
    const initialState = useMemo<RootFormData>(() => {
        return {
            id: data.id || '',
            consonants: data.consonants || '',
            glosses: normalizeRootGloss(data.glosses || data.gloss),
            etymology: normalizeRootEtymology(data.etymology),
            source: data.source || '',
            strength: data.strength || 'strong',
            weak_class: data.weak_class || '',
            vowel_set_perf: data.vowel_set_perf || 'a-a',
            vowel_set_impf: data.vowel_set_impf || 'i-a',
            vowel_set_imp: data.vowel_set_imp || 'i-a',
            is_imala_blocked: !!data.is_imala_blocked,
            tags: Array.isArray(data.tags) ? data.tags.join(', ') : (typeof data.tags === 'string' && data.tags.startsWith('[') ? JSON.parse(data.tags).join(', ') : (data.tags || '')),
            synonyms: normalizeRootRelationships(data.synonyms),
            antonyms: normalizeRootRelationships(data.antonyms),
            related_entries: normalizeRootRelationships(data.related_entries),
        };
    }, [data]);

    const [form, setForm] = useState<RootFormData>(initialState);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.consonants.trim()) {
            setError(t('Root consonants are required', 'Konsonanti meħtieġa'));
            return;
        }

        setSaving(true);
        setError('');

        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');

            const payload = buildRootPayload(form);
            if (!isNew && initialState.id) {
                (payload as any)._oldId = initialState.id;
            }

            if (isNew) {
                try {
                    await adminCreateRoot(token, payload);
                } catch (err: any) {
                    if (err.message.includes('DUPLICATE_CONSONANTS')) {
                        const confirm = window.confirm(t(
                            `A root with consonants '${form.consonants}' already exists. Do you want to create a duplicate?`,
                            `Għerq bil-konsonanti '${form.consonants}' diġà jeżisti. Trid toħloq wieħed doppju?`
                        ));
                        if (confirm) {
                            await adminCreateRoot(token, { ...payload, force: true });
                        } else {
                            setSaving(false);
                            return;
                        }
                    } else {
                        throw err;
                    }
                }
            } else {
                await adminUpdateRoot(token, initialState.consonants, payload);
            }

            onSaved(form);
        } catch (err: any) {
            setError(err.message || 'Failed to save');
            console.error("Save root error:", err);
        } finally {
            setSaving(false);
        }
    };

    const setEtymology = (key: string, value: string) => {
        setForm(f => ({ ...f, etymology: { ...f.etymology, [key]: value } }));
    };

    const updateGloss = (index: number, lang: 'en' | 'mt', val: string) => {
        const newGlosses = [...form.glosses];
        newGlosses[index] = { ...newGlosses[index], [lang]: val };
        setForm({ ...form, glosses: newGlosses });
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
        const newGlosses = [...form.glosses];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newGlosses.length) return;
        [newGlosses[index], newGlosses[targetIndex]] = [newGlosses[targetIndex], newGlosses[index]];
        setForm({ ...form, glosses: newGlosses });
    };

    const setRelationship = (key: 'synonyms' | 'antonyms' | 'related_entries', value: any[]) => {
        setForm(f => ({ ...f, [key]: value }));
    };

    // Auto-calculate type based on consonants
    const consonantsArray = form.consonants.split('-').filter(Boolean);
    const rootClass = consonantsArray.length === 4 ? 'QUADRILITERAL' : 'TRILITERAL';

    const inp = "w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black placeholder:text-black/20";
    const sel = inp + " cursor-pointer";
    const label = "block text-xs font-semibold text-black uppercase tracking-wider mb-1";

    return (
        <Modal open onClose={onClose} title={isNew ? t('New Root', 'Għerq Ġdid') : t('Edit Root Info', 'Editja l-Info tal-Għerq')} size="lg">
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="space-y-6 overflow-y-auto pr-2 flex-1 scrollbar-thin">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                            <AlertCircle size={14} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Consonants & Type & ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-1 md:col-span-1">
                            <label className={label}>{t('Root Consonants', 'Konsonanti')}</label>
                            <input className={inp} value={form.consonants} onChange={e => setForm({ ...form, consonants: e.target.value })} placeholder="e.g. f-għ-l" />
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <label className={label}>{t('Root Class', 'Klassi tal-Għerq')}</label>
                            <div className="px-3 py-2 text-sm font-semibold text-black/40 bg-black/5 rounded-lg border border-black/5 h-[38px] flex items-center">
                                {rootClass}
                            </div>
                        </div>
                        <div className="col-span-2 md:col-span-2">
                            <label className={label}>{t('Root ID', 'ID tal-Għerq')}</label>
                            <input
                                className={inp + " font-mono text-[10px]"}
                                value={form.id}
                                onChange={e => setForm({ ...form, id: e.target.value })}
                                placeholder="e.g. k-t-b"
                            />
                        </div>
                    </div>
                    {/* Tags, Strength */}
                    <div className="space-y-4">

                        <div>
                            <label className={label}>{t('Tags (comma separated)', 'Tikketti (separati bil-virgola)')}</label>
                            <input className={inp} value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. archaic, dialectal" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={label}>{t('Strength', 'Saħħa')}</label>
                                <select
                                    className={sel}
                                    value={form.strength}
                                    onChange={e => setForm({ ...form, strength: e.target.value })}
                                >
                                    {(STRENGTH_OPTIONS.length > 0 ? STRENGTH_OPTIONS : ['strong', 'weak']).map((s: string) => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                    ))}
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
                                        {(WEAK_CLASS_OPTIONS.length > 0 ? WEAK_CLASS_OPTIONS : ['defective', 'hollow', 'assimilative']).map((wc: string) => (
                                            <option key={wc} value={wc}>{wc.charAt(0).toUpperCase() + wc.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Vowel Sets */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={label}>{t('Vowel Set (Perf)', 'Vokali (Perf)')}</label>
                            <input className={inp} value={form.vowel_set_perf || 'a-a'} onChange={e => {
                                const val = e.target.value;
                                setForm({ ...form, vowel_set_perf: val, is_imala_blocked: form.is_imala_blocked || val === 'a-a' });
                            }} placeholder="e.g. a-a" />
                        </div>
                        <div>
                            <label className={label}>{t('Vowel Set (Impf)', 'Vokali (Impf)')}</label>
                            <input className={inp} value={form.vowel_set_impf || 'i-a'} onChange={e => {
                                const val = e.target.value;
                                setForm({ ...form, vowel_set_impf: val, is_imala_blocked: form.is_imala_blocked || val === 'a-a' });
                            }} placeholder="e.g. i-a" />
                        </div>
                        <div>
                            <label className={label}>{t('Vowel Set (Imp)', 'Vokali (Imp)')}</label>
                            <input className={inp} value={form.vowel_set_imp || 'i-a'} onChange={e => {
                                const val = e.target.value;
                                setForm({ ...form, vowel_set_imp: val, is_imala_blocked: form.is_imala_blocked || val === 'a-a' });
                            }} placeholder="e.g. i-a" />
                        </div>
                        <div className="flex flex-col justify-end pb-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-black/20 text-[#1034A6] focus:ring-[#1034A6]"
                                    checked={!!form.is_imala_blocked}
                                    onChange={(e) => setForm({ ...form, is_imala_blocked: e.target.checked })}
                                />
                                <span className="text-xs font-semibold text-black uppercase tracking-wider group-hover:text-[#1034A6] transition-colors">
                                    {t('Imala Blocked', 'Imala Imblukkata')}
                                </span>
                            </label>
                            <p className="text-[9px] text-black/40 mt-1 leading-tight w-[100%]">
                                Applies 'a' instead of 'ie' to verb suffixes. Auto-checks if 'a-a' is used.
                            </p>
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
                                            <input
                                                className={inp}
                                                value={g.en}
                                                onChange={e => updateGloss(i, 'en', e.target.value)}
                                                placeholder="e.g. to write"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-black/40 uppercase ml-1">Maltese</span>
                                            <input
                                                className={inp}
                                                value={g.mt}
                                                onChange={e => updateGloss(i, 'mt', e.target.value)}
                                                placeholder="e.g. jikteb"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Etymology Section */}
                    <fieldset className="border border-[#ede9e1] rounded-xl p-4 pt-3">
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
                                <input className={inp} value={form.etymology.language} onChange={e => setEtymology('language', e.target.value)} list="language-options" placeholder="e.g. Arabic" />
                                <datalist id="language-options">
                                    {SOURCE_LANGUAGE_OPTIONS.map((l: string) => <option key={l} value={l} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className={label}>{t('Term', 'Kelma')}</label>
                                <input className={inp} value={form.etymology.term} onChange={e => setEtymology('term', e.target.value)} placeholder="e.g. bada'a" />
                            </div>
                            <div>
                                <label className={label}>Pronunciation</label>
                                <input className={inp} value={form.etymology.pronunciation || ''} onChange={e => setEtymology('pronunciation', e.target.value)} placeholder="e.g. bada'a" />
                            </div>
                            <div>
                                <label className={label}>{t('Definition', 'Tifsira')}</label>
                                <input className={inp} value={form.etymology.definition} onChange={e => setEtymology('definition', e.target.value)} placeholder="e.g. to begin" />
                            </div>
                        </div>
                    </fieldset>

                    {/* Relationships (Thesaurus & Derived Terms) */}
                    <div className="space-y-6">
                        <RelationshipEditor
                            type="derived"
                            title={t('Derived Terms', 'Termini Derivati')}
                            items={form.related_entries || []}
                            onChange={(items: any[]) => setRelationship('related_entries', items)}
                            extraActions={[
                                {
                                    label: t('New Entry', 'Entrata Ġdida'),
                                    icon: <Plus size={12} />,
                                    onClick: () => {
                                        window.open('/admin?new=entry', '_blank');
                                    }
                                }
                            ]}
                        />
                        <RelationshipEditor
                            type="thesaurus"
                            lookupType="root"
                            title={t('Synonyms', 'Sinonimi')}
                            items={form.synonyms || []}
                            onChange={(items: any[]) => setRelationship('synonyms', items)}
                            extraActions={[
                                { label: t('New Root', 'Għerq Ġdid'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=root', '_blank') }
                            ]}
                        />
                        <RelationshipEditor
                            type="thesaurus"
                            lookupType="root"
                            title={t('Antonyms', 'Antonimi')}
                            items={form.antonyms || []}
                            onChange={(items: any[]) => setRelationship('antonyms', items)}
                            extraActions={[
                                { label: t('New Root', 'Għerq Ġdid'), icon: <Plus size={12} />, onClick: () => window.open('/admin?new=root', '_blank') }
                            ]}
                        />
                    </div>

                    {/* Source */}
                    <div className="space-y-4">
                        <div>
                            <label className={label}>{t('Source Citation', 'Sors')}</label>
                            <input className={inp} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. Aquilina2006" />
                        </div>
                    </div>

                    {/* Dynamic Fields (for new DB columns) */}
                    {Object.keys(data || {}).filter(key => {
                        return !ROOT_HANDLED_FIELDS.includes(key as any);
                    }).length > 0 && (
                            <fieldset className="border border-amber-100 bg-amber-50/20 rounded-xl p-4 space-y-3">
                                <legend className="text-[10px] font-bold text-amber-600 uppercase tracking-widest px-2">{t('Additional Fields', 'Ghelta Oħra')}</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.keys(data || {}).filter(key => {
                                        return !ROOT_HANDLED_FIELDS.includes(key as any);
                                    }).map(key => (
                                        <div key={key}>
                                            <label className={label}>{key}</label>
                                            <input
                                                className={inp}
                                                value={(form as any)[key] ?? ''}
                                                onChange={e => setForm({ ...form, [key]: e.target.value })}
                                            />
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
                                        if (!token) throw new Error("Not authenticated");
                                        const payload = buildRootPayload(form);
                                        await adminCreateRoot(token, payload);
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
                        <Button type="button" variant="ghost" onClick={onClose}>{t('Cancel', 'Ikkanċella')}</Button>
                        <Button type="submit" loading={saving}>{t('Save Changes', 'Issejva l-Bidliet')}</Button>
                    </div>
                </div>
            </form>
        </Modal >
    );
}
