import { useEffect, useState, type FormEvent } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import type { SuffixCatalogItem } from '@/lib/api';
import { normalizeSuffixText } from '@/lib/suffixMatching';

type SuffixKind = 'nominal' | 'derivational';

interface SuffixCatalogFormModalProps {
    item: SuffixCatalogItem | null;
    initialKind?: SuffixKind;
    onClose: () => void;
    onSave: (value: { kind: SuffixKind; suffix: string; label: string }) => Promise<void>;
}

export function SuffixCatalogFormModal({
    item,
    initialKind = 'nominal',
    onClose,
    onSave,
}: SuffixCatalogFormModalProps) {
    const { term } = useLinguisticMode();
    const [kind, setKind] = useState<SuffixKind>(item?.kind ?? initialKind);
    const [suffix, setSuffix] = useState(item?.suffix ?? '');
    const [label, setLabel] = useState(item?.label ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setKind(item?.kind ?? initialKind);
        setSuffix(item?.suffix ?? '');
        setLabel(item?.label ?? '');
        setError(null);
    }, [initialKind, item]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const nextKind = kind === 'derivational' ? 'derivational' : 'nominal';
        const nextSuffix = normalizeSuffixText(suffix);
        const nextLabel = label.trim();

        if (!nextSuffix) {
            setError(term('suffix-is-required'));
            return;
        }

        if (!nextLabel) {
            setError(term('label-is-required'));
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave({
                kind: nextKind,
                suffix: nextSuffix,
                label: nextLabel,
            });
        } catch (submitError: unknown) {
            setError(submitError instanceof Error ? submitError.message : String(submitError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open onClose={onClose} title={item ? term('edit-suffix') : term('add-suffix')} size="md">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">{term('suffix-kind')}</label>
                        <select
                            className="w-full rounded-lg border border-[#d8cfc0] bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#1034A6]"
                            value={kind}
                            onChange={(e) => setKind(e.target.value === 'derivational' ? 'derivational' : 'nominal')}
                        >
                            <option value="nominal">{term('nominal')}</option>
                            <option value="derivational">{term('derivational')}</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">{term('suffix-label')}</label>
                        <input
                            className="w-full rounded-lg border border-[#d8cfc0] bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#1034A6]"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder={term('suffix-example-placeholder')}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">{term('suffix')}</label>
                    <input
                        className="w-full rounded-lg border border-[#d8cfc0] bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#1034A6]"
                        value={suffix}
                        onChange={(e) => setSuffix(e.target.value)}
                        placeholder="-iet"
                    />
                    <p className="text-[11px] text-black/35">
                        {term('suffix-surface-form-note')}
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        {term('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={saving}
                        leftIcon={saving ? <RotateCcw className="animate-spin" size={14} /> : <Save size={14} />}
                    >
                        {saving ? term('saving') : term('save-suffix')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
