import { useState, useMemo, useEffect } from 'react';
import { ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminCreateEntry, adminUpdateEntry } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateRootForms } from '@/lib/conjugationEngine';
import type { WeakClass } from '@/types';
import { useAdminConfig } from '@/lib/adminConfig';

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
    root_consonants?: string;
    verb_form?: string;
}

export interface EntryFormModalProps {
    entry: AdminEntry | null;
    onClose: () => void;
    onSaved: () => void;
    getToken: () => Promise<string | null>;
    initialForm?: Partial<typeof INITIAL_FORM_STATE>;
}

const INITIAL_FORM_STATE = {
    id: '',
    headword: '',
    pos: 'noun',
    noun_gender: '',
    noun_singular: '',
    noun_plural_forms: '',  // comma-separated
    noun_sound_plural: '',
    noun_dual: '',
    noun_type: '',
    verb_class: '',
    verb_transitivity: '',
    verb_perfective_3sgm: '',
    verb_imperfective_3sgm: '',
    verb_verbal_noun: '',
    verb_vowel_perf: '',
    verb_vowel_impf: '',
    verb_vowel_impv: '',
    verb_active_ptcp: '',
    verb_passive_ptcp: '',
    adj_masculine: '',
    adj_feminine: '',
    adj_plural: '',
    participle_type: '' as 'active' | 'passive' | '',
    is_loanword: false,
    source_language: '',
    definitions: [
        { text_en: '', text_mt: '', register: '' }
    ],
    etymology_chain: [] as { language: string; form: string; meaning: string }[],
    phonetics: [] as { dialect: string; spelling: string; ipa: string }[],
    tags: '',
    _formLabel: '',
    _rootConsonants: '',
    _weakClass: '',
    _hasDual: false,
    _pluralType: 'none',
    cv_pattern: '',
    plural_pattern: '',
    sound_suffix: '',
    adj_pattern: '',
    noun_feminine: '',
    noun_masculine: '',
};

// Top-level PARTICIPLE_NUANCES removed to favor dynamic getValues().

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
    label = "Presets"
}: {
    options: { label: string; value: string; sub?: string }[];
    onSelect: (val: string) => void;
    currentValue?: string;
    label?: string;
}) {
    return (
        <div className="mt-2">
            <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1.5 block">{label}</label>
            <div className="flex flex-wrap gap-1.5">
                {options.map(opt => (
                    <button
                        key={opt.label}
                        type="button"
                        onClick={() => onSelect(opt.value)}
                        className={`px-2 py-0.5 text-[10px] rounded border transition-all ${currentValue === opt.value
                            ? 'bg-[#1034A6] text-white border-[#1034A6]'
                            : 'bg-white text-black/60 border-black/10 hover:border-black/30'}`}
                    >
                        {opt.label} {opt.sub && <span className="opacity-50 ml-1 font-normal">({opt.sub})</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function EntryFormModal({ entry, onClose, onSaved, getToken, initialForm }: EntryFormModalProps) {
    const { getValues } = useAdminConfig();

    // Dynamic options from admin config
    const POS_OPTIONS = getValues('pos');
    const DIALECT_OPTIONS = getValues('dialect');
    const GENDER_OPTIONS = getValues('gender');
    const VERB_CLASS_OPTIONS = getValues('verb_class');
    const REGISTER_OPTIONS = getValues('register');
    const NOUN_TYPE_OPTIONS = getValues('noun_type');
    const SOUND_SUFFIXES = getValues('sound_suffix');
    const BROKEN_PATTERNS = getValues('broken_pattern');
    const ADJECTIVE_PATTERNS = getValues('adjective_pattern');
    const VERB_PRESETS_LIST = getValues('verb_preset');
    const VERB_FORM_OPTIONS = getValues('verb_form');
    const PARTICIPLE_TYPES = ['active', 'passive'];
    const PARTICIPLE_NUANCES = getValues('participle_nuance');

    // Convert verb presets list to the Record format used by the component
    const VERB_PRESETS = useMemo(() => {
        const map: Record<string, any> = {};
        VERB_PRESETS_LIST.forEach((p: any) => {
            map[p.form] = p.data;
        });
        return map;
    }, [VERB_PRESETS_LIST]);

    const isEdit = Boolean(entry);
    const { t } = useLanguage();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isLoadingFull, setIsLoadingFull] = useState(isEdit);

    useEffect(() => {
        if (isEdit && entry?.id) {
            setIsLoadingFull(true);
            import('@/lib/api').then(({ apiGetEntry }) => {
                apiGetEntry(entry.id)
                    .then(res => {
                        if (res?.entry) {
                            const full = res.entry as any;
                            setForm(prev => ({
                                ...prev,
                                participle_type: full.participle_type || prev.participle_type,
                                definitions: full.definitions?.length ? full.definitions : prev.definitions,
                                tags: Array.isArray(full.tags) ? full.tags.join(', ') : full.tags || prev.tags,
                                noun_plural_forms: Array.isArray(full.noun_plural_forms) ? full.noun_plural_forms.join(', ') : full.noun_plural_forms || prev.noun_plural_forms,
                                _rootConsonants: full.resolved_root_consonants || full.root_consonants || prev._rootConsonants,
                                _formLabel: full.verb_form || full.verb_morphology?.form || prev._formLabel,
                                verb_class: full.verb_class || full.verb_morphology?.verb_class || prev.verb_class,
                                verb_vowel_perf: full.verb_vowel_perf || full.verb_morphology?.vowel_set_perf || prev.verb_vowel_perf,
                                verb_vowel_impf: full.verb_vowel_impf || full.verb_morphology?.vowel_set_impf || prev.verb_vowel_impf,
                                verb_vowel_impv: full.verb_vowel_impv || full.verb_morphology?.vowel_set_imperative || prev.verb_vowel_impv,
                                verb_transitivity: full.verb_transitivity || full.verb_morphology?.transitivity || prev.verb_transitivity,
                                verb_perfective_3sgm: full.verb_perfective_3sgm || full.verb_morphology?.perfective_3sg_m || prev.verb_perfective_3sgm,
                                verb_imperfective_3sgm: full.verb_imperfective_3sgm || full.verb_morphology?.imperfective_3sg_m || prev.verb_imperfective_3sgm,
                                verb_verbal_noun: full.verb_verbal_noun || full.verb_morphology?.verbal_noun || prev.verb_verbal_noun,
                                verb_active_ptcp: full.verb_active_ptcp || full.verb_morphology?.active_participle || prev.verb_active_ptcp,
                                verb_passive_ptcp: full.verb_passive_ptcp || full.verb_morphology?.passive_participle || prev.verb_passive_ptcp,
                                noun_gender: full.noun_gender || full.noun_morphology?.gender || prev.noun_gender,
                                noun_singular: full.noun_singular || full.noun_morphology?.singular || prev.noun_singular,
                                noun_sound_plural: full.noun_sound_plural || full.noun_morphology?.sound_plural || prev.noun_sound_plural,
                                noun_dual: full.noun_dual || full.noun_morphology?.dual || prev.noun_dual,
                                adj_masculine: full.adj_masculine || full.adjective_morphology?.masculine || prev.adj_masculine,
                                adj_feminine: full.adj_feminine || full.adjective_morphology?.feminine || prev.adj_feminine,
                                adj_plural: full.adj_plural || full.adjective_morphology?.plural || prev.adj_plural,
                                is_loanword: typeof full.is_loanword === 'boolean' ? full.is_loanword : prev.is_loanword,
                                source_language: full.source_language || prev.source_language,
                                phonetics: full.phonetics?.length ? full.phonetics : prev.phonetics,
                                etymology_chain: full.etymologies?.[0]?.chain?.length ? full.etymologies[0].chain : prev.etymology_chain,
                                noun_type: full.noun_type || prev.noun_type,
                                cv_pattern: full.cv_pattern || prev.cv_pattern,
                                plural_pattern: full.plural_pattern || prev.plural_pattern,
                                sound_suffix: full.sound_suffix || prev.sound_suffix,
                                adj_pattern: full.adj_pattern || prev.adj_pattern,
                                noun_feminine: full.noun_feminine || prev.noun_feminine,
                                noun_masculine: full.noun_masculine || prev.noun_masculine,
                                _hasDual: !!(full.noun_dual || full.noun_morphology?.dual),
                                _pluralType: (full.noun_plural_forms?.length || full.noun_morphology?.plural_forms?.length) && (full.noun_sound_plural || full.noun_morphology?.sound_plural) ? 'both'
                                    : (full.noun_plural_forms?.length || full.noun_morphology?.plural_forms?.length) ? 'broken'
                                        : (full.noun_sound_plural || full.noun_morphology?.sound_plural) ? 'sound'
                                            : 'none',
                            }));
                        }
                    })
                    .catch(err => console.error("Error loading full entry", err))
                    .finally(() => setIsLoadingFull(false));
            });
        }
    }, [isEdit, entry?.id]);

    const [form, setForm] = useState({
        ...INITIAL_FORM_STATE,
        id: entry?.id ?? initialForm?.id ?? '',
        headword: entry?.headword ?? initialForm?.headword ?? '',
        pos: entry?.pos ?? initialForm?.pos ?? 'noun',
        noun_gender: (entry as any)?.noun_gender ?? initialForm?.noun_gender ?? '',
        noun_singular: (entry as any)?.noun_singular ?? initialForm?.noun_singular ?? '',
        verb_class: (entry as any)?.verb_class ?? (entry as any)?.verb_morphology?.verb_class ?? initialForm?.verb_class ?? '',
        _formLabel: (entry as any)?.verb_form ?? (entry as any)?.verb_morphology?.form ?? initialForm?._formLabel ?? '',
        verb_vowel_perf: (entry as any)?.verb_vowel_perf ?? (entry as any)?.verb_morphology?.vowel_set_perf ?? initialForm?.verb_vowel_perf ?? '',
        verb_vowel_impf: (entry as any)?.verb_vowel_impf ?? (entry as any)?.verb_morphology?.vowel_set_impf ?? initialForm?.verb_vowel_impf ?? '',
        verb_vowel_impv: (entry as any)?.verb_vowel_impv ?? (entry as any)?.verb_morphology?.vowel_set_imperative ?? initialForm?.verb_vowel_impv ?? '',
        is_loanword: entry?.is_loanword ?? initialForm?.is_loanword ?? false,
        source_language: entry?.source_language ?? initialForm?.source_language ?? '',
        tags: Array.isArray((entry as any)?.tags) ? (entry as any).tags.join(', ') : ((entry as any)?.tags ?? initialForm?.tags ?? ''),
        _rootConsonants: (entry as any)?._rootConsonants ?? (entry as any)?.root_pattern_form?.root?.consonants ?? (entry as any)?.root_consonants ?? initialForm?._rootConsonants ?? '',
        _hasDual: !!((entry as any)?.noun_dual ?? initialForm?.noun_dual ?? false),
        cv_pattern: (entry as any)?.cv_pattern ?? initialForm?.cv_pattern ?? '',
        plural_pattern: (entry as any)?.plural_pattern ?? initialForm?.plural_pattern ?? '',
        sound_suffix: (entry as any)?.sound_suffix ?? initialForm?.sound_suffix ?? '',
        adj_pattern: (entry as any)?.adj_pattern ?? initialForm?.adj_pattern ?? '',
        noun_feminine: (entry as any)?.noun_feminine ?? initialForm?.noun_feminine ?? '',
        noun_masculine: (entry as any)?.noun_masculine ?? initialForm?.noun_masculine ?? '',
        _pluralType: (((entry as any)?.noun_plural_forms?.length > 0) || !!initialForm?.noun_plural_forms) && ((entry as any)?.noun_sound_plural || !!initialForm?.noun_sound_plural) ? 'both' :
            (((entry as any)?.noun_plural_forms?.length > 0) || !!initialForm?.noun_plural_forms) ? 'broken' :
                (((entry as any)?.noun_sound_plural) || !!initialForm?.noun_sound_plural) ? 'sound' : 'none',
        noun_type: (entry as any)?.noun_type ?? initialForm?.noun_type ?? '',
        definitions: (entry as any)?.definitions ?? [
            { text_en: (entry as any)?.text_en ?? '', text_mt: '', register: '' }
        ],
        ...initialForm
    });

    const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

    const moveDefinition = (index: number, direction: 'up' | 'down') => {
        const next = [...form.definitions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return;
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        set('definitions', next);
    };

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
                verb_form: form._formLabel, // Ensure Form toggle is persisted for all POS
                cv_pattern: form.cv_pattern,
                plural_pattern: form.plural_pattern,
                sound_suffix: form.sound_suffix,
                adj_pattern: form.adj_pattern,
                noun_feminine: form.noun_feminine,
                noun_masculine: form.noun_masculine,
                noun_singular: form.pos === 'noun' ? (form.noun_singular || form.headword) : form.noun_singular,
                noun_plural_forms: form.noun_plural_forms
                    ? form.noun_plural_forms.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : [],
                tags: form.tags ? form.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            };
            if (isEdit && entry) {
                payload.id = form.id;
                payload.old_id = entry.id;
            }

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
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden relative">
                {isLoadingFull && (
                    <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
                    </div>
                )}
                <div className="space-y-5 overflow-y-auto pr-2 flex-1">
                    {error && (
                        <div className="bg-red-50 text-red-800 border border-red-200 rounded px-3 py-2 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Core */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={label}>{t('Entry ID', 'ID tal-Entrata')}</label>
                            <input className={inp} value={form.id} onChange={e => set('id', e.target.value)} placeholder="e.g. kiteb-v" />
                        </div>
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
                        <div className="col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-between mb-1">
                                <label className={label + " mb-0"}>{t('Root Consonants', 'Għerq')}</label>
                                <ResetButton onClick={() => set('_rootConsonants', (entry as any)?._rootConsonants ?? (entry as any)?.root_pattern_form?.root?.consonants ?? (entry as any)?.root_consonants ?? initialForm?._rootConsonants ?? '')} title={t('Reset to original', 'Irrisettja')} />
                            </div>
                            <input className={inp} value={form._rootConsonants || ''} onChange={e => set('_rootConsonants', e.target.value)} placeholder="e.g. k-t-b" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className={label}>{t('CV Pattern / Wiżen', 'Mudell (Wiżen)')}</label>
                            <input className={inp} value={form.cv_pattern || ''} onChange={e => set('cv_pattern', e.target.value)} placeholder="e.g. Fagħal or CCvC" />

                            {/* Verb Presets based on Form */}
                            {form._formLabel && (form.pos === 'verb' || form.pos === 'participle' || (form.pos === 'noun' && form.noun_type === 'verbal')) && (
                                <MorphologyPresetSelector
                                    label={t('Verb Presets', 'Mudelli tal-Verbi')}
                                    currentValue={form.cv_pattern}
                                    onSelect={(val) => set('cv_pattern', val)}
                                    options={[
                                        { label: 'Perfect', value: VERB_PRESETS[form._formLabel]?.perfect?.cv, sub: VERB_PRESETS[form._formLabel]?.perfect?.wizen },
                                        { label: 'Passive Ptcp.', value: VERB_PRESETS[form._formLabel]?.passive?.cv, sub: VERB_PRESETS[form._formLabel]?.passive?.wizen },
                                        { label: 'Active Ptcp.', value: VERB_PRESETS[form._formLabel]?.active?.cv, sub: VERB_PRESETS[form._formLabel]?.active?.wizen },
                                        { label: 'Verbal Noun', value: VERB_PRESETS[form._formLabel]?.verbal?.cv, sub: VERB_PRESETS[form._formLabel]?.verbal?.wizen },
                                    ].filter(o => o.value)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Phonetics & Dialects Builder */}
                    <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <legend className="text-xs font-semibold text-black uppercase tracking-tight">{t('Phonetics & Dialects', 'Fonetika u Djaletti')}</legend>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                                onClick={() => set('phonetics', [...form.phonetics, { dialect: 'Standard', spelling: '', ipa: '' }])}>
                                + {t('Add Variant', 'Żid Varjant')}
                            </Button>
                        </div>

                        {form.phonetics.map((ph: any, i: number) => (
                            <div key={i} className="flex gap-2 items-end">
                                <div className="flex-1 w-1/4">
                                    {i === 0 && <label className={label}>{t('Dialect', 'Djalett')}</label>}
                                    <select className={sel} value={ph.dialect} onChange={e => {
                                        const next = [...form.phonetics];
                                        next[i].dialect = e.target.value;
                                        set('phonetics', next);
                                    }}>
                                        {DIALECT_OPTIONS.map(d => <option key={d}>{d}</option>)}
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
                                <div className="flex-1 w-2/4">
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

                    {/* Noun fields */}
                    {form.pos === 'noun' && (
                        <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-4">
                            <legend className="text-xs font-semibold text-black px-2">{t('Noun', 'Nom')}</legend>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={label}>{t('Gender', 'Ġeneru')}</label>
                                    <select className={sel} value={form.noun_gender} onChange={e => set('noun_gender', e.target.value)}>
                                        <option value="">—</option>
                                        {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
                                    </select>
                                </div>
                                {form.noun_gender === 'masculine' && (
                                    <div>
                                        <label className={label}>{t('Feminine Form', 'Femminil')}</label>
                                        <input className={inp} value={form.noun_feminine} onChange={e => set('noun_feminine', e.target.value)} placeholder={t('e.g. għalliema', 'eż. għalliema')} />
                                    </div>
                                )}
                                {form.noun_gender === 'feminine' && (
                                    <div>
                                        <label className={label}>{t('Masculine Form', 'Maskil')}</label>
                                        <input className={inp} value={form.noun_masculine} onChange={e => set('noun_masculine', e.target.value)} placeholder={t('e.g. għalliem', 'eż. għalliem')} />
                                    </div>
                                )}
                                <div>
                                    <label className={label}>{t('Noun Type', 'Tip ta\' Nom')}</label>
                                    <select className={sel} value={form.noun_type} onChange={e => set('noun_type', e.target.value)}>
                                        <option value="">—</option>
                                        {NOUN_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className={label}>{t('Form Association', 'Assoċjazzjoni mal-Forma')}</label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {(VERB_FORM_OPTIONS.length > 0 ? VERB_FORM_OPTIONS : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Xa', 'Xb']).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => set('_formLabel', form._formLabel === f ? '' : f)}
                                                className={`px-3 py-1 text-[10px] uppercase font-bold rounded border transition-all ${form._formLabel === f
                                                    ? 'bg-[#1034A6] text-white border-[#1034A6]'
                                                    : 'bg-white text-black/40 border-black/10 hover:border-black/20'
                                                    }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className={label}>{t('Singular', 'Singular')}</label>
                                    <input className={inp} value={form.noun_singular} onChange={e => set('noun_singular', e.target.value)} placeholder={form.headword || t('Same as headword', 'L-istess bħall-mamma')} />
                                </div>

                                <div className="col-span-2">
                                    <label className={label}>{t('Plural Type', 'Tip ta\' Plural')}</label>
                                    <div className="flex gap-1.5 mb-2">
                                        {['none', 'sound', 'broken', 'both'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    setForm(f => {
                                                        const next = { ...f, _pluralType: type };
                                                        if (type === 'none') {
                                                            next.noun_plural_forms = '';
                                                            next.noun_sound_plural = '';
                                                        } else if (type === 'sound') {
                                                            next.noun_plural_forms = '';
                                                        } else if (type === 'broken') {
                                                            next.noun_sound_plural = '';
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${form._pluralType === type ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm' : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20'}`}
                                            >
                                                {type === 'none' ? t('None', 'Xejn') :
                                                    type === 'sound' ? t('Sound', 'Sħiħ') :
                                                        type === 'broken' ? t('Broken', 'Miksur') :
                                                            t('Both', 'It-Tnejn')}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        {(form._pluralType === 'broken' || form._pluralType === 'both') && (
                                            <div>
                                                <label className={label}>{t('Broken Plural', 'Plural miksur')}</label>
                                                <input className={inp} value={form.noun_plural_forms}
                                                    onChange={e => set('noun_plural_forms', e.target.value)} placeholder={t('e.g. kotba', 'eż. kotba')} />

                                                <MorphologyPresetSelector
                                                    label={t('Pattern', 'Mudell')}
                                                    currentValue={form.plural_pattern}
                                                    onSelect={(val) => {
                                                        set('plural_pattern', val);
                                                        // Strategy: if plural_pattern is selected, maybe we show it somewhere or use it to suggest?
                                                        // For now just persistence as requested.
                                                    }}
                                                    options={BROKEN_PATTERNS.map(p => ({ label: p.cv, value: p.cv, sub: p.wizen }))}
                                                />
                                            </div>
                                        )}
                                        {(form._pluralType === 'sound' || form._pluralType === 'both') && (
                                            <div>
                                                <label className={label}>{t('Sound Plural', 'Plural sħiħ')}</label>
                                                <input className={inp} value={form.noun_sound_plural} onChange={e => set('noun_sound_plural', e.target.value)} placeholder={t('e.g. tfajliet', 'eż. tfajliet')} />

                                                <MorphologyPresetSelector
                                                    label={t('Suffix', 'Suffiss')}
                                                    currentValue={form.sound_suffix}
                                                    onSelect={(val) => {
                                                        set('sound_suffix', val);
                                                        if (!form.noun_sound_plural && form.headword) {
                                                            set('noun_sound_plural', form.headword + val);
                                                        }
                                                    }}
                                                    options={SOUND_SUFFIXES.map(s => ({ label: `-${s}`, value: s }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className={label}>{t('Dual', 'Imtenni')}</label>
                                    <div className="flex gap-1.5 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, _hasDual: false, noun_dual: '' }))}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${!form._hasDual ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm' : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20'}`}
                                        >
                                            {t('None', 'Xejn')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => set('_hasDual', true)}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${form._hasDual ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm' : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20'}`}
                                        >
                                            {t('Exists', 'Eżistenti')}
                                        </button>
                                    </div>
                                    {form._hasDual && (
                                        <input className={inp} value={form.noun_dual} onChange={e => set('noun_dual', e.target.value)} placeholder={t('e.g. sentejn', 'eż. sentejn')} />
                                    )}
                                </div>
                            </div>
                        </fieldset>
                    )}

                    {/* Verb fields */}
                    {form.pos === 'verb' && (
                        <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                            <legend className="text-xs font-semibold text-black px-2 text-black">{t('Verb', 'Verb')}</legend>

                            <div className="mb-4">
                                <label className={label}>{t('Form (Stem)', 'Forma (Zokk)')}</label>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {(VERB_FORM_OPTIONS.length > 0 ? VERB_FORM_OPTIONS : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Xa', 'Xb']).map(f => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => set('_formLabel', form._formLabel === f ? '' : f)}
                                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form._formLabel === f
                                                ? 'bg-[#1034A6] text-white border-[#1034A6] shadow-sm'
                                                : 'bg-white text-black/60 border-black/10 hover:bg-black/5 hover:border-black/20 text-black'
                                                }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={label}>{t('Class', 'Klassi')}</label>
                                    <select className={sel} value={form.verb_class} onChange={e => set('verb_class', e.target.value)}>
                                        <option value="">—</option>
                                        {VERB_CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                                    </select>
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
                                    <label className={label}>{t('Imperative Vowels', 'Vokali - Imperattiv')}</label>
                                    <input className={inp} value={form.verb_vowel_impv}
                                        placeholder="e.g. i-a"
                                        onChange={e => set('verb_vowel_impv', e.target.value)} />
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
                            <div className="mt-2">
                                <MorphologyPresetSelector
                                    label={t('Pattern Preset', 'Mudell Preset')}
                                    currentValue={form.adj_pattern}
                                    onSelect={(val) => {
                                        set('adj_pattern', val);
                                        const pattern = ADJECTIVE_PATTERNS.find(p => p.cv === val);
                                        if (pattern && !form.cv_pattern) {
                                            set('cv_pattern', pattern.cv);
                                        }
                                    }}
                                    options={ADJECTIVE_PATTERNS.map(p => ({ label: p.cv, value: p.cv, sub: p.wizen }))}
                                />
                            </div>
                        </fieldset>
                    )}

                    {/* Participle fields */}
                    {form.pos === 'participle' && (
                        <fieldset className="border border-[#ede9e1] rounded-lg p-4 space-y-3">
                            <legend className="text-xs font-semibold text-black px-2 text-black">{t('Participle', 'Partiċipju')}</legend>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className={label + " mb-0"}>{t('Type', 'Tip')}</label>
                                        <ResetButton onClick={() => set('participle_type', (entry as any)?.participle_type ?? initialForm?.participle_type ?? '')} title={t('Reset to original', 'Irrisettja')} />
                                    </div>
                                    <select className={sel} value={form.participle_type} onChange={e => set('participle_type', e.target.value)}>
                                        <option value="">—</option>
                                        {PARTICIPLE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={label}>{t('Feminine Form', 'Femminil')}</label>
                                    <input className={inp} value={form.adj_feminine} onChange={e => set('adj_feminine', e.target.value)} placeholder={t('e.g. miktuba', 'eż. miktuba')} />
                                </div>
                                <div>
                                    <label className={label}>{t('Plural Form', 'Plural')}</label>
                                    <input className={inp} value={form.adj_plural} onChange={e => set('adj_plural', e.target.value)} placeholder={t('e.g. miktubin', 'eż. miktubin')} />
                                </div>
                                <div>
                                    <label className={label}>{t('Form Association', 'Assoċjazzjoni mal-Forma')}</label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {(VERB_FORM_OPTIONS.length > 0 ? VERB_FORM_OPTIONS : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Xa', 'Xb']).map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => set('_formLabel', form._formLabel === f ? '' : f)}
                                                className={`px-3 py-1 text-[10px] uppercase font-bold rounded border transition-all ${form._formLabel === f
                                                    ? 'bg-[#1034A6] text-white border-[#1034A6]'
                                                    : 'bg-white text-black/40 border-black/10 hover:border-black/20'
                                                    }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
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
                                    {form.pos === 'participle' && (
                                        <div>
                                            <label className={label}>{t('Nuance', 'Sfumatura')}</label>
                                            <select className={sel} value={def.nuance || ''} onChange={e => {
                                                const next = [...form.definitions];
                                                next[i].nuance = e.target.value;
                                                set('definitions', next);
                                            }}>
                                                <option value="">—</option>
                                                {PARTICIPLE_NUANCES.map((n: string) => <option key={n}>{n}</option>)}
                                            </select>
                                        </div>
                                    )}
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

                </div>

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-black/10 shrink-0">
                    <Button type="button" variant="ghost" onClick={onClose}>{t('Cancel', 'Ikkanċella')}</Button>
                    <Button type="submit" loading={saving}>
                        {isEdit ? t('Save Changes', 'Issejva l-Bidliet') : t('Create Entry', 'Oħloq Entrata')}
                    </Button>
                </div>
            </form >
        </Modal >
    );
}
