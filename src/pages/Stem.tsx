import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { generateZokkForms } from '@/lib/zokkEngine';
import { useStemData } from '@/hooks/useStemData';
import { SideCard, CREAM_RGBA } from './Entry';
import { getGloss, cn } from '@/lib/utils';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { type SourceLanguage } from '@/types';
import { StemFormModal } from '@/components/admin/StemFormModal';
import { normalizeStemMorphology } from '@/lib/adminUtils';

const LANGUAGE_COLORS: Record<string, { bg: string; text: string }> = {
    Arabic: { bg: 'bg-emerald-50', text: 'text-emerald-800' },
    Sicilian: { bg: 'bg-orange-50', text: 'text-orange-800' },
    Italian: { bg: 'bg-blue-50', text: 'text-blue-800' },
    Latin: { bg: 'bg-purple-50', text: 'text-purple-800' },
    French: { bg: 'bg-sky-50', text: 'text-sky-800' },
    English: { bg: 'bg-gray-100', text: 'text-gray-700' },
    Spanish: { bg: 'bg-yellow-50', text: 'text-yellow-800' },
    Berber: { bg: 'bg-amber-50', text: 'text-amber-800' },
    Greek: { bg: 'bg-indigo-50', text: 'text-indigo-800' },
    Uncertain: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const BLUE = '#1034A6';

function PlainCell({ value, entries, isTheoretical }: { value: string; entries: any[]; isTheoretical?: boolean }) {
    const entry = entries.find(e => e.headword === value);
    if (entry) {
        return (
            <Link to={`/entry/${entry.id}`} className="text-[#1034A6] hover:underline">
                {isTheoretical && '*'}
                {value}
            </Link>
        );
    }
    return <span className={isTheoretical ? 'opacity-45 italic' : 'text-black'}>{isTheoretical && '*'}{value}</span>;
}

export function Stem() {
    const { id } = useParams<{ id: string }>();
    const { mode, term } = useLinguisticMode();
    const { language } = useLanguage();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();
    const [showStemModal, setShowStemModal] = useState(false);
    
    // Admin check
    const isActualAdmin = isAdmin && adminViewEnabled;

    const {
        stem_string,
        class_type,
        is_hybrid,
        root,
        agentive_suffix,
        source_languages,
        entries,
        loading,
        refetch
    } = useStemData(id);

    const zokkForms = useMemo(() => {
        if (!stem_string || !class_type) return null;
        return generateZokkForms({
            stem_string,
            class_type,
            is_hybrid,
            root: root || undefined,
            agentive_suffix: agentive_suffix || undefined
        });
    }, [stem_string, class_type, is_hybrid, root, agentive_suffix]);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    const glossList = useMemo(() => {
        const entryWithDef = entries.find(e => e.definitions && e.definitions.length > 0);
        if (entryWithDef) {
            return entryWithDef.definitions.map(d => (language === 'en' ? d.text_en : d.text_mt)).filter(Boolean);
        }
        return [];
    }, [entries, language]);

    if (!id) return <Navigate to="/404" replace />;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
            </div>
        );
    }

    if (!stem_string) {
        return (
            <div style={bgStyle} className="flex flex-col items-center justify-center px-4 text-center min-h-[60vh]">
                <h2 className="font-serif text-2xl font-bold text-black mb-3">{term('stem-not-found')}</h2>
                <Link to="/stem-search" className="text-blue-600 hover:underline">{term('back-to-search')}</Link>
            </div>
        );
    }

    const displayStem = `-${stem_string}-`;
    const linguisticTags = entries.flatMap(e => (e as any).tags || []).filter((v, i, a) => a.indexOf(v) === i);

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">

                {/* Header */}
                <div className="text-center mb-12 relative group max-w-fit mx-auto">
                    <h1 className="font-serif font-bold text-[3rem] leading-none text-black tracking-tight flex items-center justify-center gap-4">
                        {displayStem}
                        {isActualAdmin && (
                            <button
                                onClick={() => setShowStemModal(true)}
                                className="p-2 text-black/20 hover:text-[#1034A6] hover:bg-[#1034A6]/5 rounded-full transition-all"
                                title="Edit Stem Info"
                            >
                                <Edit2 size={20} />
                            </button>
                        )}
                    </h1>
                    {glossList.length > 0 && (
                        <p className="text-sm font-serif text-black/55 mt-2 uppercase tracking-widest text-center">"{glossList[0]}"</p>
                    )}
                    <p className="text-xs font-sans text-black/40 tracking-[0.18em] mt-2 uppercase text-center">
                        — {class_type && (
                            <span className="hover:underline cursor-default">{term('class').toUpperCase()} -{class_type.toUpperCase()}</span>
                        )}
                        {is_hybrid && (
                            <>
                                {' • '}
                                <span className="hover:underline cursor-default">{term('hybrid').toUpperCase()}</span>
                            </>
                        )} —
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-start">
                    {/* Left Sidebar */}
                    <div className="w-full md:w-64 shrink-0 space-y-4">
                        {source_languages.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {source_languages.map(lang => {
                                        // Find language match (e.g. "Italian (abbandonare)" -> "Italian")
                                        const cleanLang = lang.split(' ')[0] as SourceLanguage;
                                        const colors = LANGUAGE_COLORS[cleanLang] || { bg: 'bg-blue-50', text: 'text-blue-800' };
                                        return (
                                            <span key={lang} className={`${colors.bg} ${colors.text} border border-black/5 px-1.5 py-0.5 rounded text-[0.7rem] uppercase font-bold tracking-tight`}>
                                                {lang}
                                            </span>
                                        );
                                    })}
                                </div>
                            </SideCard>
                        )}

                        {is_hybrid && (
                            <div className="pt-2 px-1">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-black/30 mb-0.5">{term('root').toUpperCase()}</p>
                                <p className="font-serif text-[1.4rem] font-medium text-blue-800 tracking-tight">
                                    {root || `${stem_string.replace(/[aeiou]/g, '')}-j`}
                                </p>
                            </div>
                        )}

                        {linguisticTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 px-1">
                                {linguisticTags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-black/5 text-black/40 rounded-full text-[10px] font-bold uppercase tracking-wider border border-black/5">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 min-w-0 space-y-12 w-full max-w-full">

                        {/* 1. Verbal Forms Table (matching Root.tsx) */}
                        <div className="mb-12 w-full max-w-full">
                            <h2 className="font-sans font-semibold text-[1.1rem] text-black mb-3">{term('verbal-forms')}</h2>
                            <div className="overflow-x-auto whitespace-nowrap pb-4 w-full">
                                <table className="w-full text-sm border-collapse text-left min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-black/8 font-sans text-black/80">
                                            <th className="font-semibold pb-2 pr-4 w-12">{term('form')}</th>
                                            <th className="font-semibold pb-2 pr-4">{term('lemma')}</th>
                                            <th className="font-semibold pb-2 pr-4">{term('imperfect')}</th>
                                            <th className="font-semibold pb-2 pr-4">{term('imperative')}</th>
                                            <th className="font-semibold pb-2 pr-4">{term('passive')}</th>
                                            <th className="font-semibold pb-2 pr-4">{term('active')}</th>
                                            <th className="font-semibold pb-2">{term('verbal-noun')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Form I - Main Zokk Verb */}
                                        <tr className="border-b border-black/4 hover:bg-black/2 transition-colors">
                                            <td className="py-2.5 pr-4 font-serif font-bold text-[#1034A6]">I</td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <PlainCell value={zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || ''} entries={entries} />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <PlainCell value={zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.imperfect || ''} entries={entries} />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <PlainCell value={zokkForms?.conjugation?.imperative_sg || ''} entries={entries} />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <PlainCell value={zokkForms?.passive_participle?.masc || ''} entries={entries} />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <PlainCell value={zokkForms?.agentive?.masc || ''} entries={entries} />
                                            </td>
                                            <td className="py-2.5 font-serif text-black">
                                                <PlainCell value={zokkForms?.verbal_noun || ''} entries={entries} />
                                            </td>
                                        </tr>
                                        {/* Form II - Hybrid Reanalysis */}
                                        {is_hybrid && zokkForms?.hybrid_forms && (
                                            <tr className="border-b border-black/4 last:border-0 hover:bg-black/2 transition-colors bg-black/5 italic">
                                                <td className="py-2.5 pr-4 font-serif font-bold text-[#1034A6]">II</td>
                                                <td className="py-2.5 pr-4 font-serif text-black/60">
                                                    <PlainCell value={zokkForms.hybrid_forms.form_ii || ''} entries={entries} />
                                                </td>
                                                <td className="py-2.5 pr-4 font-serif text-black/30">-</td>
                                                <td className="py-2.5 pr-4 font-serif text-black/30">-</td>
                                                <td className="py-2.5 pr-4 font-serif text-black/60">
                                                    <PlainCell value={zokkForms.hybrid_forms.semitic_passive_participle || ''} entries={entries} isTheoretical />
                                                </td>
                                                <td className="py-2.5 pr-4 font-serif text-black/30">-</td>
                                                <td className="py-2.5 font-serif text-black/30">-</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. Hybrid Semitic Forms Card (if hybrid) */}
                        {is_hybrid && zokkForms?.hybrid_forms && (
                            <div className="w-full bg-orange-50/30 p-6 rounded-xl border border-orange-100/50 shadow-sm shadow-orange-900/5">
                                <h2 className="font-sans font-semibold text-[1.1rem] text-orange-900 mb-4 flex items-center gap-2">
                                    <span className="text-lg">⚛</span>
                                    {term('semitic-reanalysis')}
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="bg-white/40 p-3 rounded-lg border border-white/50 backdrop-blur-[2px]">
                                        <p className="text-[10px] uppercase tracking-widest text-orange-900/40 mb-1 font-bold">{term('passive-participle')}</p>
                                        <p className="font-serif text-xl text-orange-900">*{zokkForms.hybrid_forms.semitic_passive_participle}</p>
                                    </div>
                                    <div className="bg-white/40 p-3 rounded-lg border border-white/50 backdrop-blur-[2px]">
                                        <p className="text-[10px] uppercase tracking-widest text-orange-900/40 mb-1 font-bold">{term('form-ii')}</p>
                                        <p className="font-serif text-xl text-orange-900">{zokkForms.hybrid_forms.form_ii}</p>
                                    </div>
                                    <div className="col-span-full lg:col-span-1 bg-white/40 p-3 rounded-lg border border-white/50 backdrop-blur-[2px]">
                                        <p className="text-[10px] uppercase tracking-widest text-orange-900/40 mb-1 font-bold">{term('reanalysed-root')}</p>
                                        <p className="font-sans text-sm font-medium text-orange-800">{root || `${stem_string.replace(/[aeiou]/g, '')}-j`}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Derived Terms Table (Full List) */}
                        <div className="w-full">
                            <h2 className="font-sans font-semibold text-[1.1rem] text-black mb-4">
                                {term('derived-forms-table')}
                            </h2>
                            <div className="overflow-x-auto pb-4">
                                <table className="w-full text-sm border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-black/8 font-sans text-black/80">
                                            <th className="font-semibold pb-2 pr-4">{term('term')}</th>
                                            <th className="font-semibold pb-2 pr-4">{term('class')}</th>
                                            <th className="font-semibold pb-2">{term('suffix')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Main suffixated units first */}
                                        <tr className="border-b border-black/4 hover:bg-black/2 transition-colors">
                                            <td className="py-2.5 pr-4 font-serif font-bold text-blue-900">{zokkForms?.verbal_noun}</td>
                                            <td className="py-2.5 pr-4 font-sans text-[10px] uppercase font-bold text-black/30 tracking-tight">{term('verbal-noun')}</td>
                                            <td className="py-2.5 font-sans text-blue-800">-{class_type}</td>
                                        </tr>
                                        <tr className="border-b border-black/4 hover:bg-black/2 transition-colors">
                                            <td className="py-2.5 pr-4 font-serif font-bold text-blue-900">{zokkForms?.passive_participle?.masc}</td>
                                            <td className="py-2.5 pr-4 font-sans text-[10px] uppercase font-bold text-black/30 tracking-tight">{term('passive-participle')}</td>
                                            <td className="py-2.5 font-sans text-blue-800">-{class_type === 'ar' ? 'at' : 'it'}</td>
                                        </tr>
                                        <tr className="border-b border-black/4 hover:bg-black/2 transition-colors">
                                            <td className="py-2.5 pr-4 font-serif font-bold text-blue-900">{zokkForms?.agentive?.masc}</td>
                                            <td className="py-2.5 pr-4 font-sans text-[10px] uppercase font-bold text-black/30 tracking-tight">{term('agentive')}</td>
                                            <td className="py-2.5 font-sans text-blue-800">-{agentive_suffix || (class_type === 'ar' ? 'ant' : 'ent')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 4. Thesaurus (Mirroring Root.tsx) */}
                        <div className="border-t border-black/10 pt-8 mt-12">
                            <h2 className="font-sans font-semibold text-[1.1rem] text-black mb-6">{term('thesaurus')}</h2>
                            <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm">
                                <div>
                                    <p className="font-semibold text-black mb-1">{term('synonyms')}</p>
                                    <div className="space-y-1">
                                        {entries.flatMap(e => (e as any).synonyms || []).length > 0 ? (
                                            entries.flatMap(e => (e as any).synonyms || []).map((s: any, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <Link to={`/entry/${s.id || ''}`} style={{ color: BLUE }} className="hover:underline font-serif">
                                                        {s.headword}
                                                    </Link>
                                                    <span className="text-black/40 italic ml-2">
                                                        "{getGloss(s, language, mode)}"
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-black/30 text-xs italic">{term('no-synonyms')}</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="font-semibold text-black mb-1">{term('antonyms')}</p>
                                    <div className="space-y-1">
                                        {entries.flatMap(e => (e as any).antonyms || []).length > 0 ? (
                                            entries.flatMap(e => (e as any).antonyms || []).map((a: any, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <Link to={`/entry/${a.id || ''}`} style={{ color: BLUE }} className="hover:underline font-serif">
                                                        {a.headword}
                                                    </Link>
                                                    <span className="text-black/40 italic ml-2">
                                                        "{getGloss(a, language, mode)}"
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-black/30 text-xs italic">{term('no-antonyms')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {showStemModal && (
                <StemFormModal
                    stem={normalizeStemMorphology(entries.find(e => e.zokk_morphology)?.zokk_morphology, id)}
                    entryIds={entries.map(e => e.id)}
                    onClose={() => setShowStemModal(false)}
                    onSaved={() => {
                        setShowStemModal(false);
                        refetch();
                    }}
                    getToken={getToken}
                />
            )}
        </div>
    );
}
