import { useState, useMemo, useEffect, Fragment } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateRootForms, markGeneratedForms, getAttestedEntries, type MarkedVerbForm } from '@/lib/conjugationEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { RootFormModal } from '@/components/admin/RootFormModal';
import { type RootFormData } from '@/lib/adminUtils';
import { RelationshipEditor } from '@/components/admin/RelationshipEditor';
import { adminUpdateRoot, adminDeleteEntry } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getGloss } from '@/lib/utils';
import { useRootData } from '@/hooks/useRootData';
import { type VerbStrength } from '@/types';
import { resolveTagLabel } from '@/lib/tagLabel';
import { EntryShell, type EntryViewModel, EtymologySentence, SideCard } from '@/components/dictionary/EntryShell';
import { VerbFormsTable } from '@/components/dictionary/VerbFormsTable';

// ── Colour tokens ──────────────────────────────────────────────────────────
const BLUE = '#1034A6';
const GOLD = '#A07030';

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

export function Root() {
    const { id } = useParams<{ id: string }>();
    const { mode, term } = useLinguisticMode();
    const { language } = useLanguage();
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

    const { root: dbRoot, entries: apiEntries, loading, normalized, refetch } = useRootData(id);

    useEffect(() => {
        if (dbRoot) {
            document.title = `${dbRoot.consonants} — ${term('root')} | Il-Miġma'`;
        } else {
            document.title = "Il-Miġma'";
        }
    }, [dbRoot]);

    // Use entries from hook (removed MOCK_ENTRIES filter)
    const rootEntries = apiEntries;

    const bgStyle = {
        background: 'linear-gradient(rgba(244,243,240,0.88), rgba(244,243,240,0.88)), url("/bg-pattern.png") center/cover no-repeat',
        minHeight: '100vh',
    };

    // Find a primary verb entry (preferably Form I) to extract root metadata and meanings
    const primaryEntry = useMemo(() => {
        return rootEntries.find(e => e.pos === 'verb' && e.verb_morphology?.form === 'I') || rootEntries[0];
    }, [rootEntries]);

    // The root metadata to use for conjugation
    const rootObj = dbRoot || primaryEntry?.root_pattern_form?.root;

    const vm = primaryEntry?.verb_morphology;

    const glossList = useMemo(() => {
        if (normalized?.glosses) {
            return normalized.glosses.map(g => (language === 'en' ? g.en : (g.mt || g.en))).filter(Boolean);
        }
        return primaryEntry?.definitions?.map(d => d.text_en) || [];
    }, [normalized, primaryEntry, language]);

    const parsedEtymology = normalized?.etymology || null;
    const etymologyItems = useMemo(() => {
        if (!parsedEtymology) return [];
        if (!parsedEtymology.language && !parsedEtymology.term && !parsedEtymology.pronunciation && !parsedEtymology.definition) return [];

        return [{
            language: parsedEtymology.language || '',
            form: parsedEtymology.term || undefined,
            pronunciation: parsedEtymology.pronunciation || undefined,
            definition: parsedEtymology.definition || undefined,
        }];
    }, [parsedEtymology]);

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
        const attested = getAttestedEntries(rootEntries);

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
                    gloss: getGloss({
                        gloss_en: e.definitions?.[0]?.text_en || (e as any).gloss_en || (e as any).text_en,
                        gloss_mt: e.definitions?.[0]?.text_mt || (e as any).gloss_mt
                    }, language, mode)
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
                            gloss: getGloss({
                                gloss_en: sub.definitions?.[0]?.text_en || (sub as any).gloss_en || (sub as any).text_en,
                                gloss_mt: sub.definitions?.[0]?.text_mt || (sub as any).gloss_mt
                            }, language, mode)
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
                        gloss: getGloss(re, language, mode)
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

                <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-10 max-w-lg w-full">
                    <h2 className="font-serif text-2xl font-bold text-black mb-3">
                        {term('root-not-found')}
                    </h2>
                    <p className="text-text-muted text-sm mb-8 leading-relaxed">
                        {term('root-not-found-desc').replace('{id}', id || '')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        {isActualAdmin ? (
                            <>
                                <Link
                                    to={`/admin?tab=roots&create=1&consonants=${encodeURIComponent(id)}`}
                                    className="w-full sm:w-auto bg-link text-white text-sm font-sans font-medium px-6 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-link/20"
                                >
                                    {term('new-root')}
                                </Link>
                                <Link
                                    to={`/admin?tab=entries&create=1&headword=${encodeURIComponent(id)}&root=${encodeURIComponent(id)}`}
                                    className="w-full sm:w-auto bg-white text-black text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                                >
                                    {term('new-entry')}
                                </Link>
                            </>
                        ) : (
                            <Link
                                to={`/suggest?type=root&q=${id}`}
                                className="w-full sm:w-auto bg-link text-white text-sm font-sans font-medium px-6 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-link/20"
                            >
                                {term('suggest-adding-root')}
                            </Link>
                        )}
                        <Link
                            to="/root-search"
                            className="w-full sm:w-auto bg-white text-black text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
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
    const consonantParts = Array.isArray(rootObj.consonant_array)
        ? rootObj.consonant_array.filter(Boolean)
        : typeof rootObj.consonant_array === 'string'
            ? rootObj.consonant_array.split('-').filter(Boolean)
            : (rootObj.consonants ? rootObj.consonants.split('-').filter(Boolean) : []);
    const rootLiteralityKey = consonantParts.length === 4 ? 'quadriliteral' : 'triliteral';
    const rootLiteralityLabel = term(rootLiteralityKey).toUpperCase();

    const rootTypeParts = [
        <Link key={rootLiteralityKey} to={`/search?type=${rootLiteralityKey}`} className="hover:underline">{rootLiteralityLabel}</Link>,
        (rootObj.strength !== 'geminated' && strengthRaw ? (
            <Link key="strength" to={`/search?type=${strengthRaw}`} className="hover:underline">{strengthLabel.toUpperCase()}</Link>
        ) : null),
        (rootObj.weak_class ? (
            <Link key="weak" to={`/search?type=${rootObj.weak_class}`} className="hover:underline">{weakClassLabel?.toUpperCase()}</Link>
        ) : null),
        (rootObj.strength === 'geminated' ? (
            <Link key="geminated" to="/search?type=geminated" className="hover:underline">{term('geminated').toUpperCase()}</Link>
        ) : null),
        ...tags.map((tag: string) => (
            <Link key={tag} to={`/search?tag=${encodeURIComponent(tag)}`} className="hover:underline">
                {resolveTagLabel(tag, term).toUpperCase()}
            </Link>
        )),
    ].filter(Boolean);

    const viewModel: EntryViewModel = {
        title: rootObj.consonants,
        headerAccessory: isActualAdmin ? (
            <button
                onClick={() => setShowRootForm(true)}
                className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                title={term('edit-root-metadata')}
            >
                <Edit2 size={16} />
            </button>
        ) : undefined,
        subtitle: glossList[0] ? (
            <p className="text-sm font-serif text-black/55 mt-2 uppercase tracking-widest">"{glossList[0]}"</p>
        ) : undefined,
        meta: (
            <p className="text-xs font-sans text-black/40 tracking-[0.18em] mt-2 uppercase">
                — {rootTypeParts.map((part, i) => (
                    <Fragment key={i}>
                        {part}
                        {i < rootTypeParts.length - 1 && ' • '}
                    </Fragment>
                ))} —
            </p>
        ),
    };

    return (
        <EntryShell viewModel={viewModel}>
                <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-start">
                    {/* Left Sidebar */}
                    <div className="w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            {glossList.length === 1 ? (
                                <p className="text-sm text-black">{glossList[0]}</p>
                            ) : (
                                <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                    {glossList.map((g: string, i: number) => (
                                        <li key={i}>{g}</li>
                                    ))}
                                </ol>
                            )}
                        </SideCard>

                        {etymologyItems.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <EtymologySentence prefix={term('from')} items={etymologyItems} />
                            </SideCard>
                        )}

                        {sourceText && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{sourceText}</span>
                            </SideCard>
                        )}

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 px-1">
                                {tags.map((tag: string) => (
                                    <span key={tag} className="px-2 py-0.5 bg-black/5 text-black/40 rounded-full text-[10px] font-bold uppercase tracking-wider border border-black/5">
                                        {resolveTagLabel(tag, term)}
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
                                        <p>{term('vowel-set-perfect')}: {rootObj.vowel_set_perf || 'a-a'}</p>
                                        <p>{term('vowel-set-imperfect')}: {rootObj.vowel_set_impf || 'i-a'}</p>
                                        <p>{term('vowel-set-imperative')}: {rootObj.vowel_set_imp || 'o-o'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 min-w-0 space-y-12 w-full max-w-full">

                        <VerbFormsTable
                            title={term('verbal-forms')}
                            columnLabels={{
                                form: term('form'),
                                lemma: term('lemma'),
                                imperfect: term('imperfect'),
                                imperative: term('imperative'),
                                passive: term('passive'),
                                active: term('active'),
                                verbalNoun: term('verbal-noun'),
                            }}
                            rows={generatedTable.map((row: MarkedVerbForm) => ({
                                key: row.form,
                                form: <Link to={`/search?form=${row.form}`} className="text-[#1034A6] hover:underline font-bold">{row.form}</Link>,
                                lemma: (
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
                                ),
                                imperfect: <MarkedCell data={row.imperfect} isAdmin={isActualAdmin} noLink />,
                                imperative: <MarkedCell data={row.imperative} isAdmin={isActualAdmin} noLink />,
                                passive: (
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
                                ),
                                active: (
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
                                ),
                                verbalNoun: (
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
                                ),
                            }))}
                        />

                        {/* Derived Terms Table */}
                        {(derivedTerms.length > 0 || isActualAdmin) && (
                            <div className="w-full max-w-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="font-sans font-semibold text-[1.1rem] text-black">{term('derived-terms')}</h2>
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
                                <div className="overflow-x-auto overflow-y-hidden pb-4 w-full">
                                    <table className="w-full text-sm border-collapse text-left">
                                        <thead>
                                            <tr className="border-b border-black/8 font-sans text-black/80">
                                                <th className="font-semibold pb-2 pr-4">{term('term')}</th>
                                                <th className="font-semibold pb-2 pr-4">{term('class')}</th>
                                                <th className="font-semibold pb-2">
                                                    {term('cv-pattern')}
                                                    {rootObj.strength === 'geminated' && <span> • {term('geminated').toUpperCase()}</span>}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {derivedTerms.map((termObj, idx) => (
                                                <tr key={idx} className="border-b border-black/4 last:border-0 hover:bg-black/2 group transition-colors">
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
                            </div>
                        )}

                        {/* Thesaurus */}
                        {((vm?.synonyms?.length ?? 0) > 0 || (vm?.antonyms?.length ?? 0) > 0 || (rootRelationships.synonyms?.length ?? 0) > 0 || (rootRelationships.antonyms?.length ?? 0) > 0 || isActualAdmin) && (
                            <div className="border-t border-black/10 pt-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="font-sans font-semibold text-[1.1rem] text-black">{term('thesaurus')}</h2>
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
                                <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm">
                                    {((vm?.synonyms && vm.synonyms.length > 0) || (rootRelationships.synonyms?.length > 0)) && (
                                        <div>
                                            <p className="font-semibold text-black mb-1">{term('synonyms')}</p>
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
                                                        "{getGloss(s, language, mode)}"
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
                                            <p className="font-semibold text-black mb-1">{term('antonyms')}</p>
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
                                                        "{getGloss(a, language, mode)}"
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
                                title={term('derived-terms')}
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
                            window.location.href = `/root/${newData.consonants}`;
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
        </EntryShell>
    );
}
