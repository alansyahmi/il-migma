import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { generateZokkForms } from '@/lib/zokkEngine';
import { useStemData } from '@/hooks/useStemData';
import { SideCard, CREAM_RGBA, EtymologySentence } from './Entry';
import { getGloss } from '@/lib/utils';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { StemFormModal } from '@/components/admin/StemFormModal';
import { formatStemDisplay } from '@/lib/stemDefaults';
import { adminDeleteEntry } from '@/lib/api';

const BLUE = '#1034A6';

function MarkedCell({
    data,
    isAdmin,
    onEdit,
    onDelete,
    noLink
}: {
    data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string };
    isAdmin?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    noLink?: boolean;
}) {
    const { term } = useLinguisticMode();
    if (data.value === '-') return <span className="opacity-40">-</span>;

    const content = (data.marker === 'plain' && !noLink) ? (
        <Link to={`/entry/${data.entryId || data.value}`} className="text-[#1034A6] hover:underline">
            {data.value}
        </Link>
    ) : (
        <span className={data.marker === 'plain' ? 'text-black' : 'opacity-45'}>
            {data.marker === 'theoretical' ? '*' : (data.marker === 'auto_generated' ? '✦' : '')}{data.value}
        </span>
    );

    return (
        <div className="group flex items-center gap-1.5">
            {content}
            {isAdmin && onEdit && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                        className="p-0.5 rounded hover:bg-black/5 text-black/55 transition-all"
                        title={data.marker === 'plain' ? term('edit-entry') : term('add-entry')}
                    >
                        {data.marker === 'plain' ? <Edit2 size={12} /> : <Plus size={12} />}
                    </button>
                    {data.marker === 'plain' && onDelete && (
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                            className="p-0.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                            title={term('delete-entry')}
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export function Stem() {
    const { id } = useParams<{ id: string }>();
    const { mode, term } = useLinguisticMode();
    const { language } = useLanguage();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();
    const [showStemModal, setShowStemModal] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);
    
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
        stem,
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

    const stemEntryDefaults = useMemo(() => ({
        is_loanword: true,
        prefer_zokk: true,
        zokk_stem: stem_string || id || '',
        zokk_class: class_type || '',
        zokk_is_hybrid: !!is_hybrid,
        zokk_root: root || '',
        zokk_agentive_suffix: agentive_suffix || '',
    }), [agentive_suffix, class_type, id, is_hybrid, root, stem_string]);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    const glossList = useMemo(() => {
        const canonicalGlosses = Array.isArray(stem?.glosses) ? stem.glosses : [];
        if (canonicalGlosses.length > 0) {
            return canonicalGlosses
                .map((g: any) => (language === 'en' ? g?.en : g?.mt))
                .filter(Boolean);
        }

        const entryWithDef = entries.find(e => e.definitions && e.definitions.length > 0);
        if (entryWithDef) {
            return entryWithDef.definitions.map(d => (language === 'en' ? d.text_en : d.text_mt)).filter(Boolean);
        }
        return [];
    }, [entries, language, stem]);

    const linguisticTags = useMemo(() => {
        const canonicalTags = Array.isArray(stem?.tags)
            ? stem.tags
            : typeof stem?.tags === 'string'
                ? stem.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [];

        if (canonicalTags.length > 0) return canonicalTags;
        return entries.flatMap(e => (e as any).tags || []).filter((v, i, a) => a.indexOf(v) === i);
    }, [entries, stem]);

    const etymologyItems = useMemo(() => {
        const parsedEtymology = stem?.etymology || null;
        if (
            parsedEtymology &&
            (parsedEtymology.language || parsedEtymology.term || parsedEtymology.pronunciation || parsedEtymology.definition)
        ) {
            return [{
                language: parsedEtymology.language || '',
                form: parsedEtymology.term || undefined,
                pronunciation: parsedEtymology.pronunciation || undefined,
                definition: parsedEtymology.definition || undefined,
            }];
        }

        return source_languages.map(language => ({ language }));
    }, [source_languages, stem]);

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm(term('confirm-delete-entry'))) return;
        try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await adminDeleteEntry(token, entryId);
            refetch();
        } catch (err: any) {
            alert(term('failed-delete-entry') + err.message);
        }
    };

    const openEntryEditor = (
        value: string,
        config: {
            pos: string;
            participle_type?: string;
            noLink?: boolean;
        }
    ) => {
        const existing = entries.find(e => e.headword === value);
        if (existing) {
            setEditEntry(existing as AdminEntry);
            setInitialFormData(null);
        } else {
            setEditEntry(null);
            setInitialFormData({
                headword: value,
                pos: config.pos,
                participle_type: config.participle_type,
                ...stemEntryDefaults,
            });
        }
        setShowForm(true);
    };

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
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-10 max-w-lg w-full">
                    <h2 className="font-serif text-2xl font-bold text-black mb-3">
                        {term('stem-not-found')}
                    </h2>
                    <p className="text-text-muted text-sm mb-8 leading-relaxed">
                        {term('stem-not-found-desc') || 'This stem does not exist yet.'}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        {isActualAdmin ? (
                            <>
                                <Link
                                    to={`/admin?tab=stems&create=1&stem_string=${encodeURIComponent(id)}`}
                                    className="w-full sm:w-auto bg-link text-white text-sm font-sans font-medium px-6 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-link/20"
                                >
                                    {term('new-stem') || 'New Stem'}
                                </Link>
                                <Link
                                    to={`/admin?tab=entries&create=1&headword=${encodeURIComponent(id)}`}
                                    className="w-full sm:w-auto bg-white text-black text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                                >
                                    {term('new-entry')}
                                </Link>
                            </>
                        ) : (
                            <Link
                                to="/stem-search"
                                className="w-full sm:w-auto bg-link text-white text-sm font-sans font-medium px-6 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-link/20"
                            >
                                {term('back-to-search')}
                            </Link>
                        )}
                        <Link
                            to="/stem-search"
                            className="w-full sm:w-auto bg-white text-black text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                        >
                            {term('search-another-stem') || term('back-to-search')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const displayStem = formatStemDisplay(stem_string);
    const hybridForms = zokkForms?.hybrid_forms;
    const makeCellData = (value: string, opts?: { theoretical?: boolean }) => {
        const entry = entries.find(e => e.headword === value);
        if (entry) {
            return { value, marker: 'plain' as const, entryId: entry.id };
        }
        return {
            value,
            marker: opts?.theoretical ? 'theoretical' as const : 'auto_generated' as const
        };
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">

                {/* Header */}
                <div className="text-center mb-12 relative group max-w-fit mx-auto">
                    <div className="relative inline-flex items-center justify-center">
                        <h1 className="font-serif font-bold text-[3rem] leading-none text-black tracking-tight">{displayStem}</h1>
                        {isActualAdmin && (
                            <button
                                onClick={() => setShowStemModal(true)}
                                className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                title={term('edit-root-metadata')}
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                    </div>
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
                        {etymologyItems.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <EtymologySentence prefix={term('from')} items={etymologyItems} />
                            </SideCard>
                        )}

                        {stem?.source && (
                            <div className="pt-2 px-1">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-black/30 mb-0.5">{term('source').toUpperCase()}</p>
                                <p className="font-serif text-sm text-black/70 tracking-tight">{stem.source}</p>
                            </div>
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
                                {linguisticTags.map((tag: string) => (
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
                                                <MarkedCell
                                                    data={makeCellData(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || '')}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = entries.find(e => e.headword === (zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || ''));
                                                        if (existing) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || '', { pos: 'verb' })}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <MarkedCell data={makeCellData(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.imperfect || '')} />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <MarkedCell data={makeCellData(zokkForms?.conjugation?.imperative_sg || '')} />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <MarkedCell
                                                    data={makeCellData(zokkForms?.passive_participle?.masc || '')}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = entries.find(e => e.headword === (zokkForms?.passive_participle?.masc || ''));
                                                        if (existing) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.passive_participle?.masc || '', { pos: 'participle', participle_type: 'passive' })}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif text-black">
                                                <MarkedCell
                                                    data={makeCellData(zokkForms?.agentive?.masc || '')}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = entries.find(e => e.headword === (zokkForms?.agentive?.masc || ''));
                                                        if (existing) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.agentive?.masc || '', { pos: 'participle', participle_type: 'active' })}
                                                />
                                            </td>
                                            <td className="py-2.5 font-serif text-black">
                                                <MarkedCell
                                                    data={makeCellData(zokkForms?.verbal_noun || '')}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = entries.find(e => e.headword === (zokkForms?.verbal_noun || ''));
                                                        if (existing) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.verbal_noun || '', { pos: 'noun' })}
                                                />
                                            </td>
                                        </tr>
                                        {/* Form II - Hybrid Reanalysis */}
                                        {is_hybrid && zokkForms?.hybrid_forms && (
                                            <tr className="border-b border-black/4 last:border-0 hover:bg-black/2 transition-colors bg-black/5 italic">
                                                <td className="py-2.5 pr-4 font-serif font-bold text-[#1034A6]">II</td>
                                                <td className="py-2.5 pr-4 font-serif text-black/60">
                                                    <MarkedCell data={makeCellData(hybridForms?.form_ii || '')} />
                                                </td>
                                                <td className="py-2.5 pr-4 font-serif text-black/30">-</td>
                                                <td className="py-2.5 pr-4 font-serif text-black/30">-</td>
                                                <td className="py-2.5 pr-4 font-serif text-black/60">
                                                    <MarkedCell
                                                        data={makeCellData(hybridForms?.semitic_passive_participle || '', { theoretical: true })}
                                                        isAdmin={isActualAdmin}
                                                        noLink
                                                        onEdit={() => openEntryEditor(hybridForms?.semitic_passive_participle || '', { pos: 'participle', participle_type: 'passive' })}
                                                    />
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
                                        <p className="font-serif text-xl text-orange-900">*{hybridForms?.semitic_passive_participle}</p>
                                    </div>
                                    <div className="bg-white/40 p-3 rounded-lg border border-white/50 backdrop-blur-[2px]">
                                        <p className="text-[10px] uppercase tracking-widest text-orange-900/40 mb-1 font-bold">{term('form-ii')}</p>
                                        <p className="font-serif text-xl text-orange-900">{hybridForms?.form_ii}</p>
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
                                            <td className="py-2.5 pr-4 font-serif font-bold text-blue-900">
                                                <MarkedCell
                                                    data={makeCellData(zokkForms?.verbal_noun || '')}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = entries.find(e => e.headword === (zokkForms?.verbal_noun || ''));
                                                        if (existing) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.verbal_noun || '', { pos: 'noun' })}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-sans text-[10px] uppercase font-bold text-black/30 tracking-tight">{term('verbal-noun')}</td>
                                            <td className="py-2.5 font-sans text-blue-800">-{class_type}</td>
                                        </tr>
                                        <tr className="border-b border-black/4 hover:bg-black/2 transition-colors">
                                            <td className="py-2.5 pr-4 font-serif font-bold text-blue-900">
                                                <MarkedCell
                                                    data={makeCellData(zokkForms?.passive_participle?.masc || '')}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = entries.find(e => e.headword === (zokkForms?.passive_participle?.masc || ''));
                                                        if (existing) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.passive_participle?.masc || '', { pos: 'participle', participle_type: 'passive' })}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-sans text-[10px] uppercase font-bold text-black/30 tracking-tight">{term('passive-participle')}</td>
                                            <td className="py-2.5 font-sans text-blue-800">-{class_type === 'ar' ? 'at' : 'it'}</td>
                                        </tr>
                                        <tr className="border-b border-black/4 hover:bg-black/2 transition-colors">
                                            <td className="py-2.5 pr-4 font-serif font-bold text-blue-900">
                                                <MarkedCell
                                                    data={makeCellData(zokkForms?.agentive?.masc || '')}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = entries.find(e => e.headword === (zokkForms?.agentive?.masc || ''));
                                                        if (existing) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.agentive?.masc || '', { pos: 'participle', participle_type: 'active' })}
                                                />
                                            </td>
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
                    data={stem || {
                        stem_string: id || '',
                        class_type: class_type || 'ar',
                        is_hybrid: !!is_hybrid,
                        root: root || null,
                        agentive_suffix: agentive_suffix || null,
                    }}
                    onClose={() => setShowStemModal(false)}
                    onSaved={() => {
                        setShowStemModal(false);
                        refetch();
                    }}
                    getToken={getToken}
                />
            )}
            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    initialForm={initialFormData}
                    onClose={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                    }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        refetch();
                    }}
                    getToken={getToken}
                />
            )}
        </div>
    );
}
