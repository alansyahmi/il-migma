import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { cn } from '@/lib/utils';
import { resolveEntryGender } from '@/lib/gender';
import { isHiddenTag, resolveTagLabel, stripTagPrefixes } from '@/lib/tagLabel';
import { resolveStemDefaults } from '@/lib/stemDefaults';

import { type Entry } from '@/types';

interface SubPartsProps {
    entry: Entry;
    showTransitivity?: boolean;
    layout?: 'dots' | 'lines';
    showGender?: boolean;
}

export function SubParts({ entry, showTransitivity = false, layout = 'dots', showGender = false }: SubPartsProps) {
    const { term } = useLinguisticMode();
    const location = useLocation();

    const isAdvanced = location.pathname.includes('/advanced-search');
    const basePath = isAdvanced ? '/advanced-search' : '/search';

    const tagsArr: string[] = Array.isArray(entry.tags)
        ? entry.tags
        : (typeof entry.tags === 'string' && entry.tags
            ? (() => { try { return JSON.parse(entry.tags as any); } catch { return []; } })()
            : []);

    const titleTags = tagsArr
        .filter(t => t.startsWith('!'))
        .filter(t => !isHiddenTag(t))
        .map(t => {
            const clean = stripTagPrefixes(t);
            if (!clean) return null;

            return (
                <Link
                    key={t}
                    to={`/advanced-search?tag=${encodeURIComponent(clean)}`}
                    className={cn(
                        "uppercase hover:underline"
                    )}
                >
                    {resolveTagLabel(t, term).toUpperCase()}
                </Link>
            );
        })
        .filter(Boolean);


    if (entry.pos === 'verb' && entry.verb_morphology) {
        const vm = entry.verb_morphology;
        const stemDefaults = entry.zokk_morphology ? resolveStemDefaults(entry.zokk_morphology as any) : null;
        const strengthRaw = entry.zokk_morphology
            ? stemDefaults?.strength || 'weak'
            : ((entry.verb_morphology?.verb_class) || entry.root_pattern_form?.root?.strength || 'strong');
        const strengthLabel = term(strengthRaw === 'strong-hybrid' ? 'strong-hybrid' : strengthRaw);
        const weakClassRaw = entry.zokk_morphology
            ? stemDefaults?.weak_class || 'defective'
            : ((entry.verb_morphology?.weak_class) || entry.root_pattern_form?.root?.weak_class || vm.weak_class);
        const weakClassLabel = weakClassRaw ? term(weakClassRaw) : null;

        const parts = [
            <Link key="pos" to={`${basePath}?pos=${entry.pos}`} className="hover:underline">{term(entry.pos || 'noun').toUpperCase()}</Link>,
            vm.form ? (
                <Link key="form" to={`${basePath}?form=${vm.form}`} className="hover:underline">
                    {`${term('form-label')} ${vm.form}`.toUpperCase()}
                </Link>
            ) : null,
            strengthLabel ? <Link key="strength" to={`${basePath}?type=${strengthRaw}`} className="hover:underline">{strengthLabel.toUpperCase()}</Link> : null,
            weakClassLabel ? <Link key="weak" to={`${basePath}?type=${weakClassRaw}`} className="hover:underline">{weakClassLabel.toUpperCase()}</Link> : null,
            ...(vm.root_tags ?? [])
                .filter(tag => {
                    const upperTag = tag.toUpperCase();
                    return upperTag !== 'STRONG' && upperTag !== 'WEAK' && upperTag !== strengthRaw.toUpperCase() && upperTag !== (weakClassRaw?.toUpperCase() ?? '');
                })
                .map(tag => (
                    <Link key={tag} to={`${basePath}?tag=${encodeURIComponent(tag)}`} className="hover:underline">
                        {resolveTagLabel(tag, term).toUpperCase()}
                    </Link>
                )),
            ...titleTags
        ].filter(Boolean) as ReactNode[];

        if (showTransitivity && vm.transitivity) {
            parts.push(<Link key="trans" to={`${basePath}?transitivity=${vm.transitivity.toLowerCase()}`} className="hover:underline">{term(vm.transitivity.toLowerCase()).toUpperCase()}</Link>);
        }
        return <SubPartsRenderer parts={parts} layout={layout} />;
    }

    if (entry.pos === 'participle') {
        const participleType = (entry.participle_morphology?.participle_type) ? term((entry.participle_morphology?.participle_type)).toUpperCase() : '';
        const participleLabel = term('participle').toUpperCase();
        const participlePart = (
            <span className="inline-flex flex-col items-start leading-snug">
                {participleType && (
                    <span className="text-[10px] md:text-xs font-sans uppercase tracking-wide text-black/60">
                        {participleType}
                    </span>
                )}
                <span className="text-[10px] md:text-xs font-sans uppercase tracking-wide leading-snug">
                    {participleLabel}
                </span>
            </span>
        );

        const parts = [
            <Link key="pos" to={`${basePath}?pos=${entry.pos}`} className="hover:underline">
                {participlePart}
            </Link>,
            ...titleTags,
        ].filter(Boolean) as ReactNode[];

        return <SubPartsRenderer parts={parts} layout={layout} />;
    }

    // Noun / Adjective / Other

    const gender = showGender ? resolveEntryGender(entry) : null;
    const nounType = (entry as any).noun_type || (entry as any).noun_morphology?.noun_type || '';
    const nounLabel = nounType
        ? `${term(nounType).toUpperCase()} ${term(entry.pos || 'noun').toUpperCase()}`
        : term(entry.pos || 'noun').toUpperCase();

    const parts = [
        nounType ? (
            <Link
                key="pos"
                to={`${basePath}?pos=${entry.pos}&noun_type=${encodeURIComponent(nounType)}`}
                className="hover:underline"
            >
                {nounLabel}
            </Link>
        ) : (
            <Link key="pos" to={`${basePath}?pos=${entry.pos}`} className="hover:underline">
                {nounLabel}
            </Link>
        ),
        gender ? (
            <Link key="gender" to={`${basePath}?gender=${gender}`} className="hover:underline">
                {term(gender).toUpperCase()}
            </Link>
        ) : null,
        ...titleTags
    ].filter(Boolean) as ReactNode[];

    return <SubPartsRenderer parts={parts} layout={layout} />;
}

function SubPartsRenderer({ parts, layout }: { parts: ReactNode[], layout: 'dots' | 'lines' }) {
    if (layout === 'lines') {
        return (
            <>
                {parts.map((p, i) => (
                    <span key={i} className={i === 0
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
                — {parts.map((p, i) => (
                    <span key={i}>
                        {p}{i < parts.length - 1 ? ' • ' : ''}
                    </span>
                ))} —
            </p>
        </div>
    );
}

