import { Link } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { normalizeStemMorphology, type StemMorphologySource } from '@/lib/stemMorphology';
import { BLUE, PropRow } from './EntryShell';

export type MorphologySource = StemMorphologySource;

export function MorphologyProvenanceRows({
    source,
    rootDisplayValue,
    rootHref,
    showClass = false,
    showHybrid = false,
    className,
}: {
    source?: Partial<MorphologySource> | null;
    rootDisplayValue?: string | null;
    rootHref?: string;
    showClass?: boolean;
    showHybrid?: boolean;
    className?: string;
}) {
    const { term } = useLinguisticMode();
    const normalized = normalizeStemMorphology(source);
    if (!normalized) return null;

    const rootValue = rootDisplayValue ?? normalized.root ?? null;

    return (
        <>
            <PropRow label={term('stem')} className={className}>
                <Link to={`/stem/${normalized.stem_string}`} className="font-serif font-medium text-link hover:underline">
                    {normalized.stem_string.startsWith('-') ? normalized.stem_string : `-${normalized.stem_string}-`}
                </Link>
            </PropRow>
            {rootValue && (
                <PropRow label={term('reanalysed-root') || term('root')} className={className}>
                    <Link to={rootHref || `/root/${rootValue}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                        {rootValue}
                    </Link>
                </PropRow>
            )}
            {showClass && (
                <PropRow label={term('class')} className={className}>
                    <span className="uppercase font-sans font-bold text-black/60">-{normalized.class_type}</span>
                </PropRow>
            )}
            {showHybrid && normalized.is_hybrid && (
                <PropRow label={term('status')} className={className}>
                    <span className="uppercase font-sans font-bold text-orange-600/70">{term('hybrid')}</span>
                </PropRow>
            )}
        </>
    );
}
