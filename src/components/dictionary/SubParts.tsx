import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { type Entry } from '@/types';

interface SubPartsProps {
    entry: Entry;
    showTransitivity?: boolean;
    layout?: 'dots' | 'lines';
}

export function SubParts({ entry, showTransitivity = false, layout = 'dots' }: SubPartsProps) {
    const { term } = useLinguisticMode();
    if (!entry.verb_morphology) return null;

    const vm = entry.verb_morphology;
    const strengthRaw = entry.verb_class || entry.root_pattern_form?.root?.strength || 'strong';
    const strengthLabel = term(strengthRaw === 'strong-hybrid' ? 'strong-hybrid' : strengthRaw);
    const weakClassRaw = entry.verb_weak_class || entry.root_pattern_form?.root?.weak_class || vm.weak_class;
    const weakClassLabel = weakClassRaw ? term(weakClassRaw) : null;

    const parts = [
        term(entry.pos).toUpperCase(),
        vm.form ? `${term('form-label')} ${vm.form}`.toUpperCase() : null,
        strengthLabel?.toUpperCase(),
        weakClassLabel?.toUpperCase(),
        ...(vm.root_tags ?? [])
            .filter(tag => {
                const upperTag = tag.toUpperCase();
                return upperTag !== 'STRONG' && upperTag !== 'WEAK' && upperTag !== strengthRaw.toUpperCase() && upperTag !== (weakClassRaw?.toUpperCase() ?? '');
            })
            .map(tag => term(tag).toUpperCase())
    ].filter(Boolean) as string[];

    if (showTransitivity && vm.transitivity) {
        parts.push(term(vm.transitivity.toLowerCase()).toUpperCase());
    }

    if (layout === 'lines') {
        return (
            <>
                {parts.map((p, i) => (
                    <span key={p} className={i === 0
                        ? "text-xs text-black font-sans uppercase tracking-wide leading-snug font-bold md:font-normal"
                        : "text-[10px] md:text-xs text-black font-sans uppercase tracking-wide leading-snug opacity-60 md:opacity-100 bg-black/5 md:bg-transparent px-1 md:px-0 rounded md:rounded-none"
                    }>
                        {p}
                    </span>
                ))}
            </>
        );
    }

    const transPart = showTransitivity && vm.transitivity ? term(vm.transitivity.toLowerCase()).toUpperCase() : null;
    const otherParts = showTransitivity && vm.transitivity ? parts.slice(0, -1) : parts;

    return (
        <div className="space-y-0.5">
            <p className="text-xs font-sans text-black/40 tracking-[0.18em] mt-0">
                — {otherParts.join(' • ')} —
            </p>
            {transPart && (
                <p className="text-xs font-sans text-black/40 tracking-[0.18em] mt-0">
                    — {transPart} —
                </p>
            )}
        </div>
    );
}
