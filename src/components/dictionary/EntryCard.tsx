import React, { useState } from 'react';
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
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { cn } from '@/lib/utils';
import type { Entry } from '@/types';

interface EntryCardProps {
    entry: Entry;
    compact?: boolean;       // compact = search result card, no tabs
    linkToFull?: boolean;    // if compact, show link to full entry
}

const ENTRY_TABS = [
    { id: 'definitions', label: 'Tifsiriet' },
    { id: 'morphology', label: 'Morfoloġija' },
    { id: 'etymology', label: 'Oriġini' },
];

export function EntryCard({ entry, compact = false, linkToFull = false }: EntryCardProps) {
    const { term } = useLinguisticMode();
    const [activeTab, setActiveTab] = useState('definitions');
    const [saved, setSaved] = useState(false);

    const primaryIPA = entry.phonetics?.find(p => p.dialect === 'Standard')?.ipa
        ?? entry.phonetics?.[0]?.ipa;
    const primaryAttestation = entry.etymologies?.[0]?.attestation;

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
                                    className="font-serif text-xl font-bold text-[#1034A6] hover:underline leading-tight"
                                >
                                    {entry.headword}
                                </Link>
                            ) : (
                                <span className="font-serif text-xl font-bold text-[#1B4D3E]">{entry.headword}</span>
                            )}
                            {primaryIPA && (
                                <span className="ipa text-sm">[{primaryIPA}]</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="pos">{term(entry.pos)}</Badge>
                            {entry.noun_morphology?.gender && (
                                <Badge variant="tag">{term(entry.noun_morphology.gender)}</Badge>
                            )}
                            <RootPatternBadge form={entry.root_pattern_form} size="sm" />
                        </div>

                        {/* First definition */}
                        {entry.definitions[0] && (
                            <p className="text-sm text-[#000] mt-2 line-clamp-2">
                                <span className="text-[#A07030] font-semibold mr-1">1.</span>
                                {entry.definitions[0].text_en}
                            </p>
                        )}
                    </div>

                    {/* Right: reliability compact */}
                    {primaryAttestation && (
                        <div className="flex-shrink-0 pt-1">
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
            <div className="bg-white rounded-xl border border-[#d8cfc0] shadow-sm p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="font-serif text-4xl font-bold text-[#1B4D3E] leading-tight">
                            {entry.headword}
                        </h1>

                        {primaryIPA && (
                            <p className="ipa text-base text-[#4a4a4a] mt-1">[{primaryIPA}]</p>
                        )}

                        {/* Audio */}
                        {(entry.audio?.length ?? 0) > 0 && (
                            <div className="mt-3">
                                <AudioPlayer
                                    audio={entry.audio!}
                                    entryId={entry.id}
                                    ipa={primaryIPA}
                                />
                            </div>
                        )}

                        {/* Badges row */}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                            <Badge variant="pos" className="text-sm px-2.5 py-1">{term(entry.pos)}</Badge>
                            {entry.noun_morphology?.gender && (
                                <Badge variant="tag">{term(entry.noun_morphology.gender)}</Badge>
                            )}
                            {entry.is_loanword && entry.source_language && (
                                <Badge variant="source">← {entry.source_language}</Badge>
                            )}
                            <RootPatternBadge form={entry.root_pattern_form} />
                            {entry.tags?.map(t => (
                                <Badge key={t} variant="tag">{t}</Badge>
                            ))}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setSaved(s => !s)}
                            className="p-2 rounded-md hover:bg-[#1B4D3E]/10 text-[#1B4D3E] transition-colors"
                            aria-label={saved ? 'Remove from list' : 'Save to list'}
                            title={saved ? 'Remove from list' : 'Save to list'}
                        >
                            {saved ? <BookmarkCheck size={18} className="fill-[#1B4D3E]" /> : <Bookmark size={18} />}
                        </button>
                        <button
                            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                            aria-label="Share"
                            title="Aqsam"
                        >
                            <Share2 size={18} />
                        </button>
                        <button
                            className="p-2 rounded-md hover:bg-red-50 text-gray-500 hover:text-[#B22222] transition-colors"
                            aria-label="Report"
                            title="Irrapporta"
                        >
                            <Flag size={18} />
                        </button>
                    </div>
                </div>

                {/* Attestation bar */}
                {primaryAttestation && (
                    <div className="mt-5 pt-4 border-t border-[#ede9e1]">
                        <AttestationReliability data={primaryAttestation} />
                    </div>
                )}
            </div>

            {/* ── Tab content block ────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-[#d8cfc0] shadow-sm overflow-hidden">
                <Tabs tabs={ENTRY_TABS} activeTab={activeTab} onChange={setActiveTab} />

                {/* Definitions tab */}
                <TabContent tabId="definitions" activeTab={activeTab}>
                    <div className="p-5 sm:p-6 space-y-4">
                        {entry.definitions.map((def) => (
                            <div key={def.id} className="flex gap-3">
                                <span className="text-[#A07030] font-bold text-sm min-w-[20px] mt-0.5">
                                    {def.sense_number}.
                                </span>
                                <div className="flex-1 space-y-1">
                                    <p className="text-[#000]">{def.text_en}</p>
                                    {def.text_mt && (
                                        <p className="text-sm text-[#4a4a4a] italic">{def.text_mt}</p>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {def.register && <Badge variant="register">{def.register}</Badge>}
                                        {def.field && <Badge variant="tag">{def.field}</Badge>}
                                    </div>
                                    {def.example_sentences?.map(ex => (
                                        <div key={ex.id} className="mt-2 pl-3 border-l-2 border-[#C9A84C]/30">
                                            <p className="text-sm italic text-[#000]">"{ex.maltese}"</p>
                                            {ex.english && (
                                                <p className="text-sm text-[#4a4a4a] mt-0.5">"{ex.english}"</p>
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
                            <div className="pt-4 border-t border-[#ede9e1]">
                                <h3 className="text-xs font-semibold text-[#1B4D3E] uppercase tracking-wider mb-3">
                                    Taħt din il-Kelma
                                </h3>
                                <div className="space-y-2">
                                    {entry.subentries
                                        .sort((a, b) => a.sort_order - b.sort_order)
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
                        {entry.etymologies && entry.etymologies.length > 0 ? (
                            <EtymologyChain etymologies={entry.etymologies} />
                        ) : (
                            <p className="text-sm text-gray-400 italic">L-oriġini mhux disponibbli.</p>
                        )}
                    </div>
                </TabContent>
            </div>
        </article>
    );
}
