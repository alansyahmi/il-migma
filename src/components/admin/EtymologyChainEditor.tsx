import { useId } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { EtymologyBaseStep } from '@/lib/adminUtils';
import { generateForeignScriptPronunciation } from '@/lib/foreignScriptPronunciation';

type EtymologyFieldKey = keyof EtymologyBaseStep | 'pronunciation';
type EtymologyChainItem = EtymologyBaseStep & { pronunciation?: string; script?: string };

type EtymologyChainEditorProps = {
    title: string;
    items: EtymologyChainItem[];
    onChange: (items: EtymologyChainItem[]) => void;
    showPronunciation?: boolean;
    relationshipOptions?: string[];
    sourceLanguageOptions?: string[];
    defaultRelationship?: string;
    addLabel: string;
    relationshipLabel: string;
    languageLabel: string;
    termLabel: string;
    pronunciationLabel?: string;
    pronunciationPlaceholder?: string;
    definitionLabel: string;
    labelClassName: string;
    inputClassName: string;
    selectClassName: string;
};

export function EtymologyChainEditor({
    title,
    items,
    onChange,
    showPronunciation = false,
    relationshipOptions = [],
    sourceLanguageOptions = [],
    defaultRelationship = 'From',
    addLabel,
    relationshipLabel,
    languageLabel,
    termLabel,
    pronunciationLabel,
    pronunciationPlaceholder = 'e.g. kan-ta-re',
    definitionLabel,
    labelClassName,
    inputClassName,
    selectClassName,
}: EtymologyChainEditorProps) {
    const datalistId = useId();
    const mergeRelationshipChoices = (choices: string[]) => {
        const seen = new Set<string>();
        return choices.filter((choice) => {
            const normalized = choice.trim().toLowerCase();
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    };

    const relationshipChoices = mergeRelationshipChoices(
        relationshipOptions.length > 0
            ? [...relationshipOptions, 'or', 'and']
            : [defaultRelationship, 'Borrowed from', 'Calqued from', 'Metathesis of', 'Related to', 'Variant of', 'or', 'and']
    );

    const updateStep = (index: number, key: EtymologyFieldKey, value: string) => {
        const next = [...items];
        const updated = {
            ...next[index],
            [key]: value,
        };

        if (showPronunciation && key !== 'pronunciation' && (key === 'language' || key === 'term')) {
            const generatedPronunciation = generateForeignScriptPronunciation(updated);
            if (generatedPronunciation && !String(updated.pronunciation || '').trim()) {
                updated.pronunciation = generatedPronunciation;
            }
        }

        next[index] = updated;
        onChange(next);
    };

    const addStep = () => {
        const baseStep = {
            relationship: defaultRelationship,
            language: '',
            term: '',
            definition: '',
        } as EtymologyChainItem;

        onChange([
            ...items,
            ...(showPronunciation
                ? [{ ...baseStep, pronunciation: '' } as EtymologyChainItem]
                : [baseStep]),
        ]);
    };

    const removeStep = (index: number) => {
        onChange(items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : [{
            relationship: defaultRelationship,
            language: '',
            term: '',
            definition: '',
            ...(showPronunciation ? { pronunciation: '' } : {}),
        } as EtymologyChainItem]);
    };

    return (
        <fieldset className="border border-border-light rounded-xl p-4 pt-3">
            <div className="flex justify-between items-center px-1">
                <legend className="text-[0.65rem] font-bold text-black px-2 uppercase tracking-widest">{title}</legend>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addStep}>
                    + {addLabel}
                </Button>
            </div>

            <div className="space-y-4 mt-1">
                {items.map((item, index) => (
                    <div key={index} className="relative">
                        <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="absolute right-0 -top-1 text-slate-400 hover:text-red-500 px-1"
                            aria-label={`Remove ${title.toLowerCase()} step ${index + 1}`}
                        >
                            <Trash2 size={12} />
                        </button>
                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showPronunciation ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 mt-1`}>
                            <div>
                                <label className={labelClassName}>{relationshipLabel}</label>
                                <select
                                    className={selectClassName}
                                    value={item.relationship || defaultRelationship}
                                    onChange={e => updateStep(index, 'relationship', e.target.value)}
                                >
                                    {relationshipChoices.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClassName}>{languageLabel}</label>
                                <input
                                    className={inputClassName}
                                    list={sourceLanguageOptions.length > 0 ? datalistId : undefined}
                                    value={item.language || ''}
                                    onChange={e => updateStep(index, 'language', e.target.value)}
                                    placeholder="e.g. Arabic"
                                />
                            </div>
                            <div>
                                <label className={labelClassName}>{termLabel}</label>
                                <input
                                    className={inputClassName}
                                    value={item.term || ''}
                                    onChange={e => updateStep(index, 'term', e.target.value)}
                                    placeholder="e.g. cantare"
                                />
                            </div>
                            {showPronunciation && (
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className={labelClassName}>{pronunciationLabel}</label>
                                        {generateForeignScriptPronunciation(item) && (
                                            <button
                                                type="button"
                                                className="text-[10px] font-semibold uppercase tracking-wider text-[#1034A6] hover:underline"
                                                onClick={() => updateStep(index, 'pronunciation', generateForeignScriptPronunciation(item))}
                                            >
                                                Auto
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        className={inputClassName}
                                        value={'pronunciation' in item ? item.pronunciation || '' : ''}
                                        onChange={e => updateStep(index, 'pronunciation', e.target.value)}
                                        placeholder={pronunciationPlaceholder}
                                    />
                                </div>
                            )}
                            <div>
                                <label className={labelClassName}>{definitionLabel}</label>
                                <input
                                    className={inputClassName}
                                    value={item.definition || ''}
                                    onChange={e => updateStep(index, 'definition', e.target.value)}
                                    placeholder="e.g. to sing"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {sourceLanguageOptions.length > 0 && (
                <datalist id={datalistId}>
                    {sourceLanguageOptions.map(language => (
                        <option key={language} value={language} />
                    ))}
                </datalist>
            )}
        </fieldset>
    );
}
