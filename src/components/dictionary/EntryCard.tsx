import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Share2, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent } from '@/components/ui/Tabs';
import { Card, CardBody } from '@/components/ui/Card';
import { RootPatternBadge } from './RootPatternBadge';
import { MorphologyGrid } from './MorphologyGrid';
import { AttestationReliability } from './AttestationReliability';
import { EtymologyChain } from './EtymologyChain';
import { AudioPlayer } from './AudioPlayer';
import { SubEntryBlock } from './SubEntryBlock';
import { LinkedEntryList } from './LinkedEntryList';
import { useHideTheoreticalForms } from '@/contexts/HideTheoreticalFormsContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { cn } from '@/lib/utils';
import type { Entry } from '@/types';
import { isHiddenTag, resolveTagLabel, stripTagPrefixes } from '@/lib/tagLabel';
import { shouldHideSurface, stripTheoreticalPrefix } from '@/lib/theoreticalForms';

interface EntryCardProps {
    entry: Entry;
    compact?: boolean;       // compact = search result card, no tabs
    linkToFull?: boolean;    // if compact, show link to full entry
}

const getEntryTabs = (term: (key: string) => string) => [
    { id: 'definitions', label: term('definitions') },
    { id: 'morphology', label: term('morphology') },
    { id: 'etymology', label: term('etymology') },
];

export function EntryCard({ entry, compact = false, linkToFull = false }: EntryCardProps) {
    const { term } = useLinguisticMode();
    const { hideTheoreticalForms } = useHideTheoreticalForms();
    const [activeTab, setActiveTab] = useState('definitions');
    const [saved, setSaved] = useState(false);
    const isTheoretical = entry.tags?.some(tag => tag && tag.includes('THEORETICAL')) || 
        entry.verb_morphology?.root_tags?.includes('THEORETICAL') ||
        entry.headword.startsWith('*') ||
        entry.headword.startsWith('✦');
    const primaryIPA = entry.phonetics?.find(p => p.dialect === 'Standard')?.ipa
        ?? entry.phonetics?.[0]?.ipa;
    const primaryAttestation = (entry.etymology_chain as any)?.[0]?.attestation;
    const alternativeForms = entry.alternative_forms || [];
    const relatedEntries = [
        ...(entry.verb_morphology?.related_entries || []),
        ...(entry.noun_morphology?.related_entries || []),
        ...(entry.adjective_morphology?.related_entries || []),
        ...(entry.numeral_morphology?.related_entries || []),
    ];
    const displayHeadword = hideTheoreticalForms ? stripTheoreticalPrefix(entry.headword) : entry.headword;
    const displayAlternativeForms = hideTheoreticalForms
        ? alternativeForms
            .filter((form: any) => !shouldHideSurface(form, hideTheoreticalForms))
            .map((form: any) => ({
                ...form,
                headword: stripTheoreticalPrefix(form.headword || ''),
            }))
        : alternativeForms;
    const displayRelatedEntries = hideTheoreticalForms
        ? relatedEntries
            .filter((form: any) => !shouldHideSurface(form, hideTheoreticalForms))
            .map((form: any) => ({
                ...form,
                headword: stripTheoreticalPrefix(form.headword || ''),
            }))
        : relatedEntries;
    const isMutedTheoretical = isTheoretical && !hideTheoreticalForms;

    // ── COMPACT (search result) ──────────────────────────────────────────
    if (compact) {
        return (
            <Card hoverable className="animate-fade-in">
                <CardBody className="flex items-start gap-4">
                    {/* Left: headword + meta */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                            {linkToFull ? (
                                <Link
                                    to={`/entry/${entry.id}`}
                                    className={cn(
                                        "font-serif text-xl font-bold hover:underline leading-tight",
                                        isMutedTheoretical ? "text-black/55" : "text-[#1034A6]"
                                    )}
                                >
                                    {displayHeadword}
                                </Link>
                            ) : (
                                <span className={cn(
                                    "font-serif text-xl font-bold leading-tight",
                                    isMutedTheoretical ? "text-black/55" : "text-[#1034A6]"
                                )}>
                                    {displayHeadword}
                                </span>
                            )}
                            {primaryIPA && (
                                <span className="ipa text-sm">[{primaryIPA}]</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="pos">{term(entry.pos || 'noun')}</Badge>
                            {entry.noun_morphology?.gender && (
                                <Badge variant="tag">{term(entry.noun_morphology.gender)}</Badge>
                            )}
                            <RootPatternBadge form={entry.root_pattern_form} size="sm" />
                        </div>

                        {/* First definition */}
                        {entry.definitions?.[0] && (
                            <p className="text-sm text-black mt-2 line-clamp-2">
                                <span className="text-[#A07030] font-semibold mr-1">1.</span>
                                {entry.definitions[0].text_en}
                            </p>
                        )}
                    </div>

                    {/* Right: reliability compact */}
                    {primaryAttestation && (
                        <div className="shrink-0 pt-1">
                            <AttestationReliability data={primaryAttestation} compact />
                        </div>
                    )}
                </CardBody>
            </Card>
        );
    }

    // ── FULL ENTRY ───────────────────────────────────────────────────────
    return (
        <article className="animate-fade-in space-y-5">
            {/* ── Headword block ───────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-border shadow-sm p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className={cn(
                            "font-serif text-4xl font-bold leading-tight",
                            isTheoretical ? "text-black/55" : "text-[#1034A6]"
                        )}>
                            {isTheoretical && !entry.headword.startsWith('*') && '*'}{entry.headword}
                        </h1>

                        {primaryIPA && (
                            <p className="ipa text-base text-text-muted mt-1">[{primaryIPA}]</p>
                        )}

                        {/* Audio */}
                        {(entry.audio_files?.length ?? 0) > 0 && (
                            <div className="mt-3">
                                <AudioPlayer
                                    audio={entry.audio_files!}
                                    entryId={entry.id}
                                    ipa={primaryIPA}
                                />
                            </div>
                        )}

                        {/* Badges row */}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                            <Badge variant="pos" className="text-sm px-2.5 py-1">{term(entry.pos || 'noun')}</Badge>
                            {entry.noun_morphology?.gender && (
                                <Badge variant="tag">{term(entry.noun_morphology.gender)}</Badge>
                            )}
                            {entry.is_loanword && entry.source_language && (
                                <Badge variant="source">← {entry.source_language}</Badge>
                            )}
                            <RootPatternBadge form={entry.root_pattern_form} />
                            {entry.tags?.filter(t => !t.startsWith('\\') && !isHiddenTag(t)).map(t => {
                                const clean = stripTagPrefixes(t);
                                if (!clean) return null;
                                return <Badge key={t} variant="tag">{resolveTagLabel(t, term)}</Badge>;
                            })}
                        </div>

                        {(displayAlternativeForms.length > 0 || displayRelatedEntries.length > 0) && (
                            <div className="mt-5 pt-4 border-t border-border-light grid gap-4 sm:grid-cols-2">
                                {displayAlternativeForms.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                                            {term('alternative-forms')}
                                        </h3>
                                        <LinkedEntryList items={displayAlternativeForms} />
                                    </div>
                                )}
                                {displayRelatedEntries.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider">
                                            {term('related-entries')}
                                        </h3>
                                        <LinkedEntryList items={displayRelatedEntries} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setSaved(s => !s)}
                            className="p-2 rounded-md hover:bg-[#1034A6]/10 text-[#1034A6] transition-colors"
                            aria-label={saved ? term('remove-from-list') : term('save-to-list')}
                            title={saved ? term('remove-from-list') : term('save-to-list')}
                        >
                            {saved ? <BookmarkCheck size={18} className="fill-[#1034A6]" /> : <Bookmark size={18} />}
                        </button>
                        <button
                            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                            aria-label={term('share')}
                            title={term('share')}
                        >
                            <Share2 size={18} />
                        </button>
                        <button
                            className="p-2 rounded-md hover:bg-red-50 text-gray-500 hover:text-[#B22222] transition-colors"
                            aria-label={term('report')}
                            title={term('report')}
                        >
                            <Flag size={18} />
                        </button>
                    </div>
                </div>

                {/* Attestation bar */}
                {primaryAttestation && (
                    <div className="mt-5 pt-4 border-t border-border-light">
                        <AttestationReliability data={primaryAttestation} />
                    </div>
                )}
            </div>

            {/* ── Tab content block ────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <Tabs tabs={getEntryTabs(term)} activeTab={activeTab} onChange={setActiveTab} />

                {/* Definitions tab */}
                <TabContent tabId="definitions" activeTab={activeTab}>
                    <div className="p-5 sm:p-6 space-y-4">
                        {entry.definitions?.map((def) => (
                            <div key={def.id} className="flex gap-3">
                                <span className="text-[#A07030] font-bold text-sm min-w-[20px] mt-0.5">
                                    {def.sense_number}.
                                </span>
                                <div className="flex-1 space-y-1">
                                    <p className="text-black">{def.text_en}</p>
                                    {def.text_mt && (
                                        <p className="text-sm text-text-muted italic">{def.text_mt}</p>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {def.register && <Badge variant="register">{def.register}</Badge>}
                                        {def.field && <Badge variant="tag">{def.field}</Badge>}
                                    </div>
                                    {def.example_sentences?.map(ex => (
                                        <div key={ex.id} className="mt-2 pl-3 border-l-2 border-[#C9A84C]/30">
                                            <p className="text-sm italic text-black">"{ex.maltese}"</p>
                                            {ex.english && (
                                                <p className="text-sm text-text-muted mt-0.5">"{ex.english}"</p>
                                            )}
                                            {ex.source && (
                                                <p className="text-[11px] text-[#A07030] mt-0.5">— {ex.source}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Subentries */}
                        {entry.subentries && entry.subentries.length > 0 && (
                            <div className="pt-4 border-t border-border-light">
                                <h3 className="text-xs font-semibold text-[#1034A6] uppercase tracking-wider mb-3">
                                    {term('under-this-word')}
                                </h3>
                                <div className="space-y-2">
                                    {entry.subentries
                                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                                        .map(sub => (
                                            <SubEntryBlock key={sub.id} subentry={sub} />
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TabContent>

                {/* Morphology tab */}
                <TabContent tabId="morphology" activeTab={activeTab}>
                    <div className="p-5 sm:p-6">
                        <MorphologyGrid entry={entry} />
                    </div>
                </TabContent>

                {/* Etymology tab */}
                <TabContent tabId="etymology" activeTab={activeTab}>
                    <div className="p-5 sm:p-6">
                        {entry.etymology_chain && entry.etymology_chain.length > 0 ? (
                            <EtymologyChain etymologies={[{ 
                                id: entry.id, 
                                chain: entry.etymology_chain, 
                                notes: entry.etymology_notes || undefined 
                            }]} />
                        ) : (
                            <p className="text-sm text-gray-400 italic">{term('etymology-not-available')}</p>
                        )}
                    </div>
                </TabContent>
            </div>
        </article>
    );
}
