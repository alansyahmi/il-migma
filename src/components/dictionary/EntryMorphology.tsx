import { Link } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { normalizeStemMorphology, type StemMorphologyInput, type StemMorphologySource } from '@/lib/stemMorphology';
import { BLUE, PropRow } from './EntryShell';

export type MorphologySource = StemMorphologySource;

function readTextValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function getStemOnlyFallback(source?: StemMorphologyInput | null): string {
    if (!source) return '';
    return readTextValue(source.stem_string) || readTextValue(source.stem);
}

function getRootOnlyFallback(source?: StemMorphologyInput | null): string | null {
    if (!source) return null;
    return readTextValue(source.root) || readTextValue(source.root_consonants) || null;
}

export function MorphologyProvenanceRows({
    source,
    rootDisplayValue,
    rootHref,
    showClass = false,
    showHybrid = false,
    className,
}: {
    source?: StemMorphologyInput | null;
    rootDisplayValue?: string | null;
    rootHref?: string;
    showClass?: boolean;
    showHybrid?: boolean;
    className?: string;
}) {
    const { term } = useLinguisticMode();
    const normalized = normalizeStemMorphology(source);
    const fallbackStem = normalized ? '' : getStemOnlyFallback(source);
    if (!normalized && !fallbackStem) return null;

    const stemValue = normalized?.stem_string || fallbackStem;
    const rootValue = rootDisplayValue ?? normalized?.root ?? getRootOnlyFallback(source);

    return (
        <>
            <PropRow label={term('stem')} className={className}>
                {normalized ? (
                    <Link to={`/stem/${normalized.stem_string}`} className="font-serif font-medium text-link hover:underline">
                        {stemValue.startsWith('-') ? stemValue : `-${stemValue}-`}
                    </Link>
                ) : (
                    <span className="font-serif font-medium text-black">
                        {stemValue.startsWith('-') ? stemValue : `-${stemValue}-`}
                    </span>
                )}
            </PropRow>
            {rootValue && (
                <PropRow label={term('reanalysed-root') || term('root')} className={className}>
                    <Link to={rootHref || `/root/${rootValue}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                        {rootValue}
                    </Link>
                </PropRow>
            )}
            {showClass && normalized && (
                <PropRow label={term('class')} className={className}>
                    <span className="uppercase font-sans font-bold text-black/60">-{normalized.class_type}</span>
                </PropRow>
            )}
            {showHybrid && normalized?.is_hybrid && (
                <PropRow label={term('status')} className={className}>
                    <span className="uppercase font-sans font-bold text-orange-600/70">{term('hybrid')}</span>
                </PropRow>
            )}
        </>
    );
}
