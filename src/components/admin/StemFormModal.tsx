import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { adminDbBulkUpdate } from '@/lib/api';
import { type StemMorphology } from '@/lib/adminUtils';
import { AlertCircle } from 'lucide-react';

interface StemFormModalProps {
    stem: StemMorphology;
    entryIds: string[];
    onClose: () => void;
    onSaved: () => void;
    getToken: () => Promise<string | null>;
}

export function StemFormModal({ stem, entryIds, onClose, onSaved, getToken }: StemFormModalProps) {
    const { t } = useLanguage();
    const [form, setForm] = useState<StemMorphology>(stem);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');

            // Bulk update all associated entries
            await adminDbBulkUpdate(
                token,
                'entries',
                entryIds,
                'zokk_morphology',
                JSON.stringify(form)
            );

            onSaved();
        } catch (err: any) {
            setError(err.message || 'Failed to update stem');
        } finally {
            setSaving(false);
        }
    };

    const inp = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black";
    const labelStyle = "block text-xs font-semibold text-black uppercase tracking-wider mb-1";

    return (
        <Modal open onClose={onClose} title={t('edit-stem-info', 'Edit Stem Info')} size="md">
            <form onSubmit={handleSubmit} className="p-1 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-800 p-3 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className={labelStyle}>{t('stem', 'Stem')}</label>
                        <input
                            className={inp}
                            value={form.stem_string}
                            onChange={e => setForm({ ...form, stem_string: e.target.value })}
                            placeholder="e.g. kanta"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>{t('class', 'Class')}</label>
                            <select
                                className={inp}
                                value={form.class_type}
                                onChange={e => setForm({ ...form, class_type: e.target.value as 'ar' | 'ir' })}
                            >
                                <option value="ar">-ar</option>
                                <option value="ir">-ir</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-black/20 text-[#1034A6] focus:ring-[#1034A6]"
                                    checked={form.is_hybrid}
                                    onChange={e => setForm({ ...form, is_hybrid: e.target.checked })}
                                />
                                <span className={labelStyle + " mb-0 group-hover:text-[#1034A6] transition-colors"}>
                                    {t('hybrid', 'Hybrid')}
                                </span>
                            </label>
                        </div>
                    </div>

                    {form.is_hybrid && (
                        <div>
                            <label className={labelStyle}>{t('reanalysed-root', 'Reanalysed Root')}</label>
                            <input
                                className={inp}
                                value={form.root || ''}
                                onChange={e => setForm({ ...form, root: e.target.value || null })}
                                placeholder="e.g. k-n-t-j"
                            />
                        </div>
                    )}

                    <div>
                        <label className={labelStyle}>{t('agentive-suffix-override', 'Agentive Suffix Override')}</label>
                        <input
                            className={inp}
                            value={form.agentive_suffix || ''}
                            onChange={e => setForm({ ...form, agentive_suffix: e.target.value || null })}
                            placeholder="e.g. atur (optional)"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        {t('cancel', 'Cancel')}
                    </Button>
                    <Button type="submit" loading={saving}>
                        {t('save-changes', 'Save Changes')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
