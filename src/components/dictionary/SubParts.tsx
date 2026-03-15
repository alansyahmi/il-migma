import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { type Entry } from '@/types';

interface SubPartsProps {
    entry: Entry;
    showTransitivity?: boolean;
    layout?: 'dots' | 'lines';
}

export function SubParts({ entry, showTransitivity = false, layout = 'dots' }: SubPartsProps) {
    const { term } = useLinguisticMode();

    const tagsArr: string[] = Array.isArray(entry.tags)
        ? entry.tags
        : (typeof entry.tags === 'string' && entry.tags
            ? (() => { try { return JSON.parse(entry.tags as any); } catch { return []; } })()
            : []);

    const titleTags = tagsArr
        .filter(t => t.startsWith('\\'))
        .map(t => t.slice(1).replace('$', '').trim().toUpperCase())
        .filter(Boolean);

    if (entry.pos === 'verb' && entry.verb_morphology) {
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
                .map(tag => term(tag).toUpperCase()),
            ...titleTags
        ].filter(Boolean) as string[];

        if (showTransitivity && vm.transitivity) {
            parts.push(term(vm.transitivity.toLowerCase()).toUpperCase());
        }
        return <SubPartsRenderer parts={parts} layout={layout} />;
    }

    // Noun / Adjective / Other
    // `tags` may arrive as a raw JSON string from the search API — parse it safely.

    const gender = entry.noun_morphology?.gender || 
        entry.adjective_morphology?.gender || 
        entry.participle_gender || 
        (entry as any).noun_gender || 
        (entry as any).adj_gender || 
        (entry as any).gender;

    const parts = [
        term(entry.pos).toUpperCase(),
        gender ? term(gender).toUpperCase() : null,
        (entry as any).noun_type ? term((entry as any).noun_type).toUpperCase() : null,
        ...titleTags
    ].filter(Boolean) as string[];

    return <SubPartsRenderer parts={parts} layout={layout} />;
}

function SubPartsRenderer({ parts, layout }: { parts: string[], layout: 'dots' | 'lines' }) {
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

    return (
        <div className="space-y-0.5">
            <p className="text-xs font-sans text-black/40 tracking-[0.18em] mt-0">
                — {parts.join(' • ')} —
            </p>
        </div>
    );
}

