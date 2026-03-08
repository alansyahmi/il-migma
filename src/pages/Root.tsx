import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { generateRootForms, markGeneratedForms, type MarkedVerbForm, type AttestedEntry } from '@/lib/conjugationEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Plus, Edit2, ArrowLeft, Trash2 } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { RootFormModal } from '@/components/admin/RootFormModal';
import { type RootFormData } from '@/lib/adminUtils';
import { RelationshipEditor } from '@/components/admin/RelationshipEditor';
import { adminUpdateRoot, adminDeleteEntry } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useRootData } from '@/hooks/useRootData';
import { type VerbStrength } from '@/types';

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

// ── Colour tokens ──────────────────────────────────────────────────────────
const CREAM_RGBA = 'rgba(244,243,240,0.88)';
const BLUE = '#1034A6';
const GOLD = '#A07030';

// ── Components ─────────────────────────────────────────────────────────────
function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-black/8 shadow-sm p-5 space-y-2">
            <h2 className="font-sans font-bold text-[0.95rem] text-[#000]">{title}</h2>
            <div>{children}</div>
        </div>
    );
}

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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

export function Root() {
    const { id } = useParams<{ id: string }>();
    const { mode, term } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const [showForm, setShowForm] = useState(false);
    const [showRootForm, setShowRootForm] = useState(false);
    const [showNewRootForm, setShowNewRootForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);
    const [activeRelEdit, setActiveRelEdit] = useState<'derived' | 'thesaurus' | null>(null);
    const [relForm, setRelForm] = useState<{ synonyms: any[], antonyms: any[], related_entries: any[] }>({ synonyms: [], antonyms: [], related_entries: [] });

    const isActualAdmin = isAdmin && adminViewEnabled;

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    const { root: dbRoot, entries: apiEntries, loading, normalized, refetch } = useRootData(id);

    useEffect(() => {
        if (dbRoot) {
            document.title = `${dbRoot.consonants} | Il-Miġma'`;
        } else {
            document.title = "Il-Miġma'";
        }
    }, [dbRoot]);

    // Use entries from hook (removed MOCK_ENTRIES filter)
    const rootEntries = apiEntries;

    // Find a primary verb entry (preferably Form I) to extract root metadata and meanings
    const primaryEntry = useMemo(() => {
        return rootEntries.find(e => e.pos === 'verb' && e.verb_morphology?.form === 'I') || rootEntries[0];
    }, [rootEntries]);

    // The root metadata to use for conjugation
    const rootObj = dbRoot || primaryEntry?.root_pattern_form?.root;

    const vm = primaryEntry?.verb_morphology;

    const glossList = useMemo(() => {
        if (normalized?.glosses) {
            return normalized.glosses.map(g => (mode === 'standard' ? g.en : (g.mt || g.en))).filter(Boolean);
        }
        return primaryEntry?.definitions?.map(d => d.text_en) || [];
    }, [normalized, primaryEntry, mode]);

    const parsedEtymology = normalized?.etymology || null;

    const rootRelationships = useMemo(() => {
        return normalized?.relationships || { synonyms: [], antonyms: [], related_entries: [] };
    }, [normalized]);

    const sourceText = useMemo(() => {
        return dbRoot?.source || primaryEntry?.verb_morphology?.source_citation || '';
    }, [dbRoot, primaryEntry]);

    const tags = normalized?.tags || [];

    // Generate engine data
    const { generatedTable, shownIds } = useMemo(() => {
        if (!rootObj) return { generatedTable: [], shownIds: new Set<string>() };
        const pvSet = rootObj.vowel_set_perf || vm?.vowel_set_perfect || 'a-a';
        const ipvSet = rootObj.vowel_set_impf || vm?.vowel_set_imperfect || 'i-a';
        const rawGen = generateRootForms(
            rootObj.consonants,
            pvSet,
            ipvSet,
            (rootObj.strength || 'strong') as VerbStrength,
            rootObj.weak_class as any
        );

        // Collect attested forms from all rootEntries
        const attested: AttestedEntry[] = [];
        rootEntries.forEach((e: any) => {
            const form = e.verb_morphology?.form || e._formLabel || '';
            if (!form) return;

            // 1. Link the entry itself based on its POS
            if (e.pos === 'verb') {
                attested.push({ word: e.headword, id: e.id, form, type: 'lemma' });
            } else if (e.pos === 'participle') {
                const pt = e.verb_morphology?.participle_type || e.participle_type || 'active';
                attested.push({ word: e.headword, id: e.id, form, type: pt === 'passive' ? 'passive' : 'active' });
            } else if (e.pos === 'noun') {
                // Nouns with an associated verb form in root view are treated as verbal nouns
                attested.push({ word: e.headword, id: e.id, form, type: 'noun' });
            }

            // 2. Also check internal participle/noun fields within the entry (e.g. for legacy verbs)
            if (e.verb_morphology?.passive_participle) {
                attested.push({ word: e.verb_morphology.passive_participle, id: e.id, form, type: 'passive' });
            }
            if (e.verb_morphology?.active_participle) {
                attested.push({ word: e.verb_morphology.active_participle, id: e.id, form, type: 'active' });
            }
            if (e.verb_morphology?.verbal_noun) {
                attested.push({ word: e.verb_morphology.verbal_noun, id: e.id, form, type: 'noun' });
            }

            // 3. Similarly check subentries
            if (e.subentries) {
                e.subentries.forEach((sub: any) => {
                    const subForm = sub.verb_morphology?.form || sub._formLabel || form;
                    if (sub.pos === 'noun') {
                        attested.push({ word: sub.headword, id: sub.id, form: subForm, type: 'noun' });
                    } else if (sub.pos === 'participle') {
                        const pt = sub.verb_morphology?.participle_type || sub.participle_type || 'active';
                        attested.push({ word: sub.headword, id: sub.id, form: subForm, type: pt === 'passive' ? 'passive' : 'active' });
                    }
                });
            }
        });

        const rowsData = markGeneratedForms(rawGen, attested);

        // Keep track of which entries are already shown in the table
        const shownIds = new Set<string>();
        rowsData.forEach(row => {
            if (row.perfect.entryId) shownIds.add(row.perfect.entryId);
            //if (row.imperfect.entryId) shownIds.add(row.imperfect.entryId); // Added imperfect
            if (row.passiveParticiple.entryId) shownIds.add(row.passiveParticiple.entryId);
            if (row.activeParticiple.entryId) shownIds.add(row.activeParticiple.entryId);
            if (row.verbalNoun.entryId) shownIds.add(row.verbalNoun.entryId);
        });

        return { generatedTable: rowsData, shownIds };
    }, [rootObj, vm, rootEntries]);

    // Derived Terms logic (gather from rootEntries)
    const derivedTerms = useMemo(() => {
        const terms: { term: string, class: string, cv: string, id: string, gloss: string }[] = [];
        const seenIds = new Set<string>();

        const getPattern = (e: any) => {
            const cv = (e as any).cv_pattern || e.root_pattern_form?.pattern?.cv_notation || '-';
            const wizen = e.root_pattern_form?.pattern?.wizen_notation || cv;
            return mode === 'standard' ? cv : wizen;
        };

        // 1. Core entries and subentries
        for (const e of rootEntries) {
            if (shownIds.has(e.id)) {
                seenIds.add(e.id);
                continue;
            }

            if (!seenIds.has(e.id)) {
                seenIds.add(e.id);
                terms.push({
                    term: e.headword,
                    class: term(e.pos || 'derived'),
                    cv: getPattern(e),
                    id: e.id,
                    gloss: mode === 'standard'
                        ? (e.definitions?.[0]?.text_en || (e as any).gloss_en || (e as any).text_en || '')
                        : (e.definitions?.[0]?.text_mt || (e as any).gloss_mt || e.definitions?.[0]?.text_en || (e as any).gloss_en || '')
                });
            }

            // Also check subentries
            if (e.subentries) {
                for (const sub of e.subentries) {
                    if (!shownIds.has(sub.id) && !seenIds.has(sub.id)) {
                        seenIds.add(sub.id);
                        terms.push({
                            term: sub.headword,
                            class: term(sub.pos || 'derived'),
                            cv: getPattern(sub),
                            id: sub.id,
                            gloss: mode === 'standard'
                                ? (sub.definitions?.[0]?.text_en || (sub as any).gloss_en || (sub as any).text_en || '')
                                : (sub.definitions?.[0]?.text_mt || (sub as any).gloss_mt || sub.definitions?.[0]?.text_en || (sub as any).gloss_en || '')
                        });
                    } else if (shownIds.has(sub.id)) {
                        seenIds.add(sub.id);
                    }
                }
            }
        }

        // 2. Add manually linked related entries only if they haven't been shown yet
        if (rootRelationships.related_entries?.length) {
            rootRelationships.related_entries.forEach((re: any) => {
                if (!seenIds.has(re.id)) {
                    seenIds.add(re.id);
                    terms.push({
                        term: re.headword,
                        class: term(re.pos || 'related'),
                        cv: mode === 'standard' ? (re.cv_pattern || re.wizen_pattern || '-') : (re.wizen_pattern || re.cv_pattern || '-'),
                        id: re.id,
                        gloss: mode === 'standard' ? (re.gloss_en || '') : (re.gloss_mt || re.gloss_en || '')
                    });
                }
            });
        }

        return terms;
    }, [rootEntries, shownIds, rootRelationships.related_entries, mode]);

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

    const handleDeleteRootRelationship = async (type: 'synonyms' | 'antonyms' | 'related_entries', targetId: string) => {
        if (!confirm(term('confirm-unlink'))) return;
        try {
            const token = await getToken();
            if (!token || !rootObj) return;

            const nextRel = { ...rootRelationships };
            nextRel[type] = nextRel[type].filter((r: any) => r.id !== targetId);

            await adminUpdateRoot(token, rootObj.id, {
                [type]: JSON.stringify(nextRel[type])
            });
            refetch();
        } catch (err: any) {
            alert(term('failed-update-rel') + err.message);
        }
    };

    if (!id) return <Navigate to="/404" replace />;

    if (loading && !rootObj) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
            </div>
        );
    }

    if (!rootObj) {
        return (
            <div style={bgStyle} className="flex flex-col items-center justify-center px-4 text-center min-h-[60vh]">
                <div className="flex items-center gap-2 mb-8">
                    <Link to="/root-search" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back-to-root-search')}
                    </Link>
                </div>

                <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-10 max-w-lg w-full">
                    <h2 className="font-serif text-2xl font-bold text-[#000] mb-3">
                        {term('root-not-found')}
                    </h2>
                    <p className="text-[#4a4a4a] text-sm mb-8 leading-relaxed">
                        {term('root-not-found-desc').replace('{id}', id || '')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            to={`/suggest?type=root&q=${id}`}
                            className="w-full sm:w-auto bg-[#1034A6] text-white text-sm font-sans font-medium px-6 py-2.5 rounded-lg hover:bg-[#0c268c] transition-colors shadow-lg shadow-[#1034A6]/20"
                        >
                            {term('suggest-adding-root')}
                        </Link>
                        <Link
                            to="/root-search"
                            className="w-full sm:w-auto bg-white text-[#000] text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                        >
                            {term('search-another-root')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const strengthRaw = rootObj.strength || 'strong';
    const strengthLabel = term(strengthRaw === 'strong-hybrid' ? 'strong-hybrid' : strengthRaw).toUpperCase();
    const weakClassLabel = rootObj.weak_class ? term(rootObj.weak_class).toUpperCase() : null;

    const rootTypeParts = [
        term('triliteral').toUpperCase(),
        (rootObj.strength !== 'geminated' ? strengthLabel : null),
        weakClassLabel,
        rootObj.strength === 'geminated' ? term('geminated').toUpperCase() : null,
        ...tags.map((tag: string) => term(tag).toUpperCase()),
    ].filter(Boolean).join(' • ');





    return (
        <div style={bgStyle}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-10">
                <div className="flex items-center gap-2 mb-8">
                    <Link to="/root-search" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back-to-root-search')}
                    </Link>
                </div>
                {/* Header */}
                <div className="text-center mb-12 relative group max-w-fit mx-auto">
                    <div className="relative inline-flex items-center justify-center">
                        <h1 className="font-serif font-bold text-[3rem] leading-none text-[#000] tracking-tight">{rootObj.consonants}</h1>
                        {isActualAdmin && (
                            <button
                                onClick={() => setShowRootForm(true)}
                                className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                title={term('edit-root-metadata')}
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                    </div>
                    <p className="text-sm font-serif text-black/55 mt-2 uppercase tracking-widest">"{glossList[0]}"</p>
                    <p className="text-xs font-sans text-black/55 tracking-[0.18em] mt-2 uppercase">
                        — {rootTypeParts} —
                    </p>
                </div>

                <div className="flex gap-10 items-start">
                    {/* Left Sidebar */}
                    <div className="w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            {glossList.length === 1 ? (
                                <p className="text-sm text-[#000]">{glossList[0]}</p>
                            ) : (
                                <ol className="list-decimal list-inside space-y-1 text-sm text-[#000] marker:text-black/30">
                                    {glossList.map((g: string, i: number) => (
                                        <li key={i}>{g}</li>
                                    ))}
                                </ol>
                            )}
                        </SideCard>

                        {parsedEtymology && (parsedEtymology.term || parsedEtymology.definition) && (
                            <SideCard title={term('etymology')}>
                                <p className="text-sm text-[#000] leading-relaxed flex flex-wrap items-center gap-1.5">
                                    {parsedEtymology.relationship && <span>{parsedEtymology.relationship}</span>}
                                    {parsedEtymology.language && (
                                        <span className={`font-semibold ${LANGUAGE_COLORS[parsedEtymology.language]?.text || 'text-gray-600'} ${LANGUAGE_COLORS[parsedEtymology.language]?.bg || 'bg-gray-100'} px-1.5 py-0.5 rounded text-[0.7rem] uppercase tracking-wider`}>
                                            {parsedEtymology.language}
                                        </span>
                                    )}
                                    {parsedEtymology.term && <span className="font-serif">{parsedEtymology.term}</span>}
                                    {parsedEtymology.pronunciation && <span className="text-black/60 italic">({parsedEtymology.pronunciation})</span>}
                                    {parsedEtymology.definition && <span>"{parsedEtymology.definition}"</span>}
                                </p>
                            </SideCard>
                        )}

                        {sourceText && (
                            <SideCard title={term('sors')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{sourceText}</span>
                            </SideCard>
                        )}

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 px-1">
                                {tags.map((tag: string) => (
                                    <span key={tag} className="px-2 py-0.5 bg-black/5 text-black/40 rounded-full text-[10px] font-bold uppercase tracking-wider border border-black/5">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {isActualAdmin && (
                            <div className="mt-8 pt-8 border-t border-black/5 space-y-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-black/30 mb-2 font-bold">{term('internal-metadata')}</p>
                                    <div className="text-[11px] font-mono space-y-1 text-black/50">
                                        <p>{term('strength')}: {rootObj.strength}</p>
                                        {rootObj.weak_class && <p>{term('weak-class')}: {rootObj.weak_class}</p>}
                                        <p>{term('vowel_set_perfect')}: {rootObj.vowel_set_perf || 'a-a'}</p>
                                        <p>{term('vowel_set_imperfect')}: {rootObj.vowel_set_impf || 'i-a'}</p>
                                        <p>{term('vowel_set_imperative')}: {rootObj.vowel_set_imp || 'o-o'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 min-w-0 space-y-12">

                        {/* Verbal Forms Table */}
                        <div className="mb-12">
                            <h2 className="font-sans font-semibold text-[1.1rem] text-[#000] mb-3">{term('verbal forms')}</h2>
                            <table className="w-full text-sm border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-black/8 font-sans text-black/80">
                                        <th className="font-semibold pb-2 pr-4 w-12">{term('forma')}</th>
                                        <th className="font-semibold pb-2 pr-4">{term('lemma')}</th>
                                        <th className="font-semibold pb-2 pr-4">{term('imperfett')}</th>
                                        <th className="font-semibold pb-2 pr-4">{term('passive')}</th>
                                        <th className="font-semibold pb-2 pr-4">{term('active')}</th>
                                        <th className="font-semibold pb-2">{term('nom')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {generatedTable.map((row: MarkedVerbForm) => (
                                        <tr key={row.form} className="border-b border-black/4 last:border-0 hover:bg-black/[0.02] transition-colors">
                                            <td className="py-2.5 pr-4 text-black/60 font-serif">{row.form}</td>
                                            <td className="py-2.5 pr-4 font-serif">
                                                <MarkedCell
                                                    data={row.perfect}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => row.perfect.entryId && handleDeleteEntry(row.perfect.entryId)}
                                                    onEdit={() => {
                                                        const existing = rootEntries.find(e => e.headword === row.perfect.value && (e.verb_morphology?.form === row.form || e.pos !== 'verb'));
                                                        if (existing) {
                                                            setEditEntry({
                                                                ...existing,
                                                                _rootConsonants: (existing as any).root_consonants || rootObj?.consonants || '',
                                                                _formLabel: existing.verb_morphology?.form || row.form,
                                                            } as any);
                                                            setInitialFormData(null);
                                                        } else {
                                                            setEditEntry(null);
                                                            setInitialFormData({
                                                                headword: row.perfect.value,
                                                                pos: 'verb',
                                                                verb_class: rootObj?.strength || '',
                                                                _rootConsonants: rootObj?.consonants || '',
                                                                _formLabel: row.form,
                                                                verb_vowel_perf: rootObj?.vowel_set_perf || '',
                                                                verb_vowel_impf: rootObj?.vowel_set_impf || '',
                                                            });
                                                        }
                                                        setShowForm(true);
                                                    }}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif">
                                                <MarkedCell data={row.imperfect} isAdmin={isActualAdmin} noLink />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif">
                                                <MarkedCell
                                                    data={row.passiveParticiple}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => row.passiveParticiple.entryId && handleDeleteEntry(row.passiveParticiple.entryId)}
                                                    onEdit={() => {
                                                        const existing = rootEntries.find(e => e.headword === row.passiveParticiple.value && (e.verb_morphology?.form === row.form || e.pos !== 'verb'));
                                                        if (existing) {
                                                            setEditEntry({
                                                                ...existing,
                                                                _rootConsonants: (existing as any).root_consonants || rootObj?.consonants || '',
                                                                _formLabel: existing.verb_morphology?.form || row.form,
                                                            } as any);
                                                            setInitialFormData(null);
                                                        } else {
                                                            setEditEntry(null);
                                                            setInitialFormData({
                                                                headword: row.passiveParticiple.value,
                                                                pos: 'participle',
                                                                participle_type: 'passive',
                                                                _formLabel: row.form,
                                                                _rootConsonants: rootObj?.consonants || '',
                                                            });
                                                        }
                                                        setShowForm(true);
                                                    }}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif">
                                                <MarkedCell
                                                    data={row.activeParticiple}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => row.activeParticiple.entryId && handleDeleteEntry(row.activeParticiple.entryId)}
                                                    onEdit={() => {
                                                        const existing = rootEntries.find(e => e.headword === row.activeParticiple.value && (e.verb_morphology?.form === row.form || e.pos !== 'verb'));
                                                        if (existing) {
                                                            setEditEntry({
                                                                ...existing,
                                                                _rootConsonants: (existing as any).root_consonants || rootObj?.consonants || '',
                                                                _formLabel: existing.verb_morphology?.form || row.form,
                                                            } as any);
                                                            setInitialFormData(null);
                                                        } else {
                                                            setEditEntry(null);
                                                            setInitialFormData({
                                                                headword: row.activeParticiple.value,
                                                                pos: 'participle',
                                                                participle_type: 'active',
                                                                _formLabel: row.form,
                                                                _rootConsonants: rootObj?.consonants || '',
                                                            });
                                                        }
                                                        setShowForm(true);
                                                    }}
                                                />
                                            </td>
                                            <td className="py-2.5 font-serif">
                                                <MarkedCell
                                                    data={row.verbalNoun}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => row.verbalNoun.entryId && handleDeleteEntry(row.verbalNoun.entryId)}
                                                    onEdit={() => {
                                                        const existing = rootEntries.find(e => e.headword === row.verbalNoun.value && (e.verb_morphology?.form === row.form || e.pos !== 'verb'));
                                                        if (existing) {
                                                            setEditEntry({
                                                                ...existing,
                                                                _rootConsonants: (existing as any).root_consonants || rootObj?.consonants || '',
                                                                _formLabel: existing.verb_morphology?.form || row.form,
                                                            } as any);
                                                            setInitialFormData(null);
                                                        } else {
                                                            setEditEntry(null);
                                                            setInitialFormData({
                                                                headword: row.verbalNoun.value,
                                                                pos: 'noun',
                                                                _formLabel: row.form,
                                                                _rootConsonants: rootObj?.consonants || '',
                                                            });
                                                        }
                                                        setShowForm(true);
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Derived Terms Table */}
                        {(derivedTerms.length > 0 || isActualAdmin) && (
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="font-sans font-semibold text-[1.1rem] text-[#000]">{term('termini derivati')}</h2>
                                    {isActualAdmin && (
                                        <button
                                            onClick={() => {
                                                setRelForm({
                                                    synonyms: rootRelationships.synonyms,
                                                    antonyms: rootRelationships.antonyms,
                                                    related_entries: rootRelationships.related_entries
                                                });
                                                setActiveRelEdit('derived');
                                            }}
                                            className="p-1 text-black/30 hover:text-[#1034A6] hover:bg-black/5 rounded transition-all"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <table className="w-full text-sm border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-black/8 font-sans text-black/80">
                                            <th className="font-semibold pb-2 pr-4">{term('term')}</th>
                                            <th className="font-semibold pb-2 pr-4">{term('class')}</th>
                                            <th className="font-semibold pb-2">
                                                {term('cv-pattern')}
                                                {rootObj.strength === 'geminated' && <span> • {term('trux').toUpperCase()}</span>}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {derivedTerms.map((termObj, idx) => (
                                            <tr key={idx} className="border-b border-black/4 last:border-0 hover:bg-black/[0.02] group transition-colors">
                                                <td className="py-1.5 pr-4 font-serif">
                                                    <div className="flex items-center gap-2">
                                                        <Link to={`/entry/${termObj.id}`} style={{ color: BLUE }} className="hover:underline">{termObj.term}</Link>
                                                        <span className="text-black/55 italic">
                                                            {termObj.gloss}
                                                        </span>
                                                        {isActualAdmin && (
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        const existing = rootEntries.find(re => re.id === termObj.id);
                                                                        if (existing) {
                                                                            setEditEntry({
                                                                                id: existing.id,
                                                                                headword: existing.headword,
                                                                                pos: existing.pos,
                                                                                created_at: '',
                                                                                is_loanword: false
                                                                            });
                                                                            setInitialFormData(null);
                                                                            setShowForm(true);
                                                                        }
                                                                    }}
                                                                    className="p-0.5 rounded hover:bg-black/5 text-black/55 transition-all"
                                                                    title={term('edit-entry')}
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.preventDefault(); handleDeleteEntry(termObj.id); }}
                                                                    className="p-0.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                                                                    title={term('delete-entry')}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-1.5 pr-4 font-sans text-black/70">{termObj.class}</td>
                                                <td className="py-1.5 font-sans" style={{ color: BLUE }}>{termObj.cv}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Thesaurus */}
                        {((vm?.synonyms?.length ?? 0) > 0 || (vm?.antonyms?.length ?? 0) > 0 || (rootRelationships.synonyms?.length ?? 0) > 0 || (rootRelationships.antonyms?.length ?? 0) > 0 || isActualAdmin) && (
                            <div className="border-t border-black/10 pt-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="font-sans font-semibold text-[1.1rem] text-[#000]">{term('tesawru')}</h2>
                                    {isActualAdmin && (
                                        <button
                                            onClick={() => {
                                                setRelForm({
                                                    synonyms: rootRelationships.synonyms,
                                                    antonyms: rootRelationships.antonyms,
                                                    related_entries: rootRelationships.related_entries
                                                });
                                                setActiveRelEdit('thesaurus');
                                            }}
                                            className="p-1 text-black/30 hover:text-[#1034A6] hover:bg-black/5 rounded transition-all"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-16 text-sm">
                                    {((vm?.synonyms && vm.synonyms.length > 0) || (rootRelationships.synonyms?.length > 0)) && (
                                        <div>
                                            <p className="font-semibold text-[#000] mb-1">{term('sinonimi')}</p>
                                            {[...(vm?.synonyms || []), ...(rootRelationships.synonyms || [])].map((s, idx) => (
                                                <div key={s.id || idx} className="mb-1 flex items-center gap-2 group">
                                                    <Link
                                                        to={s.pos === 'ROOT' ? `/root/${s.id}` : `/search?q=${s.headword}`}
                                                        style={{ color: BLUE }}
                                                        className="hover:underline font-serif"
                                                    >
                                                        -{s.headword}-
                                                    </Link>
                                                    <span className="text-black/40 italic ml-2">
                                                        "{mode === 'standard' ? s.gloss_en : (s.gloss_mt || s.gloss_en)}"
                                                    </span>
                                                    {isActualAdmin && !vm?.synonyms?.some((v: any) => v.id === s.id) && (
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); handleDeleteRootRelationship('synonyms', s.id); }}
                                                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                                                            title="Unlink Synonym"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {((vm?.antonyms && vm.antonyms.length > 0) || (rootRelationships.antonyms?.length > 0)) && (
                                        <div>
                                            <p className="font-semibold text-[#000] mb-1">{term('antonimi')}</p>
                                            {[...(vm?.antonyms || []), ...(rootRelationships.antonyms || [])].map((a, idx) => (
                                                <div key={a.id || idx} className="mb-1 flex items-center gap-2 group">
                                                    <Link
                                                        to={a.pos === 'ROOT' ? `/root/${a.id}` : `/search?q=${a.headword}`}
                                                        style={{ color: BLUE }}
                                                        className="hover:underline font-serif"
                                                    >
                                                        {a.headword}
                                                    </Link>
                                                    <span className="text-black/40 italic ml-2">
                                                        "{mode === 'standard' ? a.gloss_en : (a.gloss_mt || a.gloss_en)}"
                                                    </span>
                                                    {isActualAdmin && !vm?.antonyms?.some((v: any) => v.id === a.id) && (
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); handleDeleteRootRelationship('antonyms', a.id); }}
                                                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                                                            title="Unlink Antonym"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {activeRelEdit && (
                <Modal
                    open
                    onClose={() => setActiveRelEdit(null)}
                    title={activeRelEdit === 'derived' ? term('manage-derived') : term('manage-thesaurus')}
                    size="lg"
                >
                    <div className="space-y-5 overflow-y-auto flex-1">
                        <p className="text-xs text-black/40 leading-relaxed -mt-2">
                            {activeRelEdit === 'derived'
                                ? term('link-derived-desc')
                                : term('link-thesaurus-desc')
                            }
                        </p>

                        {activeRelEdit === 'derived' ? (
                            <RelationshipEditor
                                type="derived"
                                title={term('termini derivati')}
                                items={relForm.related_entries}
                                onChange={(items) => setRelForm(f => ({ ...f, related_entries: items }))}
                                extraActions={[
                                    {
                                        label: term('new-entry'),
                                        icon: <Plus size={12} />,
                                        onClick: () => {
                                            setEditEntry(null);
                                            setInitialFormData({ _rootConsonants: rootObj.consonants });
                                            setShowForm(true);
                                        }
                                    }
                                ]}
                            />
                        ) : (
                            <div className="space-y-6">
                                <RelationshipEditor
                                    type="thesaurus"
                                    lookupType="root"
                                    title={term('sinonimi')}
                                    items={relForm.synonyms}
                                    onChange={(items) => setRelForm(f => ({ ...f, synonyms: items }))}
                                    extraActions={[
                                        {
                                            label: term('new-root'),
                                            icon: <Plus size={12} />,
                                            onClick: () => setShowNewRootForm(true)
                                        }
                                    ]}
                                />
                                <RelationshipEditor
                                    type="thesaurus"
                                    lookupType="root"
                                    title={term('antonimi')}
                                    items={relForm.antonyms}
                                    onChange={(items) => setRelForm(f => ({ ...f, antonyms: items }))}
                                    extraActions={[
                                        {
                                            label: term('new-root'),
                                            icon: <Plus size={12} />,
                                            onClick: () => setShowNewRootForm(true)
                                        }
                                    ]}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-black/8 shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveRelEdit(null)}
                            className="px-4 py-2 text-sm font-medium text-black/60 hover:bg-black/5 rounded-md transition-colors"
                        >
                            {term('cancel')}
                        </button>
                        <Button
                            loading={saving}
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    const token = await getToken();
                                    if (!token) throw new Error('Not authenticated');
                                    await adminUpdateRoot(token, rootObj.id, {
                                        synonyms: JSON.stringify(relForm.synonyms),
                                        antonyms: JSON.stringify(relForm.antonyms),
                                        related_entries: JSON.stringify(relForm.related_entries)
                                    });
                                    refetch();
                                    setActiveRelEdit(null);
                                } catch (err: any) {
                                    alert(term('failed-save-rels') + err.message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            {term('save-changes')}
                        </Button>
                    </div>
                </Modal>
            )}

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    initialForm={initialFormData}
                    onClose={() => setShowForm(false)}
                    onSaved={() => {
                        setShowForm(false);
                        refetch();
                    }}
                    getToken={getToken}
                />
            )}

            {showRootForm && rootObj && (
                <RootFormModal
                    data={dbRoot || rootObj}
                    onClose={() => setShowRootForm(false)}
                    onSaved={(newData: RootFormData) => {
                        // Update local state without full reload
                        refetch();
                        setShowRootForm(false);
                        if (newData.consonants !== rootObj.consonants) {
                            window.location.href = `/root/${newData.id || newData.consonants}`;
                        }
                    }}
                    getToken={getToken}
                />
            )}

            {showNewRootForm && (
                <RootFormModal
                    data={{}}
                    onClose={() => setShowNewRootForm(false)}
                    onSaved={(newData) => {
                        setShowNewRootForm(false);
                        window.location.href = `/root/${newData.consonants}`;
                    }}
                    getToken={getToken}
                    isNew={true}
                />
            )}


        </div>
    );
}
