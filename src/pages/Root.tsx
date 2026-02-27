import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { MOCK_ENTRIES } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { generateRootForms, markGeneratedForms, type MarkedVerbForm } from '@/lib/conjugationEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Plus, Edit2, ArrowLeft } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { RootFormModal, type RootFormData } from '@/components/admin/RootFormModal';
import { type Entry } from '@/types';
import { apiSearch, apiGetRoot } from '@/lib/api';

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
    onEdit
}: {
    data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated' };
    isAdmin?: boolean;
    onEdit?: () => void;
}) {
    if (data.value === '-') return <span className="opacity-40">-</span>;

    const content = data.marker === 'plain' ? (
        <Link to={`/search?q=${data.value}`} style={{ color: BLUE }} className="hover:underline">
            {data.value}
        </Link>
    ) : (
        <span className="opacity-55 text-[#000]">
            {data.marker === 'theoretical' ? '*' : '✦'}{data.value}
        </span>
    );

    return (
        <div className="group flex items-center gap-1.5">
            {content}
            {isAdmin && onEdit && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                    className="opacity-70 hover:opacity-100 p-0.5 rounded hover:bg-black/5 text-black/55 transition-all"
                    title={data.marker === 'plain' ? 'Edit Entry' : 'Add Entry'}
                >
                    {data.marker === 'plain' ? <Edit2 size={12} /> : <Plus size={12} />}
                </button>
            )}
        </div>
    );
}

export function Root() {
    const { id } = useParams<{ id: string }>();
    const { t } = useLanguage();
    const { term } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const [showForm, setShowForm] = useState(false);
    const [showRootForm, setShowRootForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;

    const [extraEntries, setExtraEntries] = useState<Entry[]>([]);
    const [dbRoot, setDbRoot] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            setLoading(true);
            // 1. Fetch root metadata
            apiGetRoot(id)
                .then(res => setDbRoot(res.root))
                .catch(() => setDbRoot(null));

            // 2. Search for all entries matching this root consonants
            apiSearch(id)
                .then(res => {
                    // Filter results that have the matching root consonants
                    const matched = res.results
                        .filter(r => (r as any).root_pattern_form?.root?.consonants === id) as unknown as Entry[];
                    setExtraEntries(matched);
                })
                .catch(() => { })
                .finally(() => setLoading(false));
        }
    }, [id]);

    // Find all entries associated with this root (Mock + Extra from API)
    const rootEntries = useMemo(() => {
        const mock = MOCK_ENTRIES.filter(e => e.root_pattern_form?.root?.consonants === id);
        // Deduplicate between mock and extra by ID
        const combined = [...mock];
        const seenIds = new Set(mock.map(m => m.id));
        for (const e of extraEntries) {
            if (!seenIds.has(e.id)) {
                combined.push(e);
                seenIds.add(e.id);
            }
        }
        return combined;
    }, [id, extraEntries]);

    // Find a primary verb entry (preferably Form I) to extract root metadata and meanings
    const primaryEntry = useMemo(() => {
        return rootEntries.find(e => e.pos === 'verb' && e.verb_morphology?.form === 'I') || rootEntries[0];
    }, [rootEntries]);

    // The root metadata to use for conjugation
    const rootObj = useMemo(() => {
        if (dbRoot) return dbRoot;
        return primaryEntry?.root_pattern_form?.root;
    }, [dbRoot, primaryEntry]);

    const vm = primaryEntry?.verb_morphology;

    const glossList = useMemo(() => {
        if (dbRoot?.gloss) return [dbRoot.gloss];
        return primaryEntry?.definitions?.map(d => d.text_en) || [];
    }, [dbRoot, primaryEntry]);

    const etymologyText = useMemo(() => {
        if (dbRoot?.etymology) return dbRoot.etymology;
        const ety = primaryEntry?.etymologies?.[0]?.chain?.[0];
        if (ety) return `${ety.language} ${ety.form} (${ety.meaning})`;
        return '';
    }, [dbRoot, primaryEntry]);

    const sourceText = useMemo(() => {
        return dbRoot?.source || primaryEntry?.verb_morphology?.source_citation || '';
    }, [dbRoot, primaryEntry]);

    // Generate engine data
    const generatedTable = useMemo(() => {
        if (!rootObj) return [];
        const pvSet = vm?.vowel_set_perfect || rootObj.vowel_set_perf || 'a-a';
        const ipvSet = vm?.vowel_set_imperfect || rootObj.vowel_set_impf || 'i-a';
        const rawGen = generateRootForms(
            rootObj.consonants,
            pvSet,
            ipvSet,
            rootObj.strength || 'strong',
            rootObj.weak_class
        );

        // Collect attested forms from all rootEntries
        const attestedLemmas = new Set<string>();
        for (const e of rootEntries) {
            // Include main headwords
            attestedLemmas.add(e.headword);
            // Also subentries
            if (e.subentries) {
                for (const sub of e.subentries) {
                    attestedLemmas.add(sub.headword);
                }
            }
        }

        return markGeneratedForms(rawGen, attestedLemmas);
    }, [rootObj, vm, rootEntries]);

    // Derived Terms logic (gather from rootEntries)
    // Actually, rootEntries itself contains Derived Terms (nouns, adjectives, etc.)
    const derivedTerms = useMemo(() => {
        const terms: { term: string, class: string, wizen: string, id: string }[] = [];
        for (const e of rootEntries) {
            if (e.pos !== 'verb') {
                terms.push({
                    term: e.headword,
                    class: (e.pos === 'noun' && e.root_pattern_form?.pattern?.cv_notation ? 'Noun' : 'Derived'),
                    wizen: e.root_pattern_form?.pattern?.wizen_notation || '-',
                    id: e.id
                });
            }
            if (e.subentries) {
                for (const sub of e.subentries) {
                    terms.push({
                        term: sub.headword,
                        class: sub.pos === 'noun' ? 'Noun' : (sub.pos === 'adjective' ? 'Adjective' : 'Derived'),
                        wizen: '-', // Mock subentries don't have wizen populated easily
                        id: sub.id
                    });
                }
            }
        }
        return terms;
    }, [rootEntries]);

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
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-black">
                <div className="flex items-center gap-2 mb-4">
                    <Link to="/root-search" className="text-sm text-black/40 hover:text-black flex items-center gap-1">
                        <ArrowLeft size={16} /> Lura
                    </Link>
                </div>
                <p className="text-sm text-black/40 italic">{t('Root not found in database.', 'Il-mamma ma nstabitx fid-database.')}</p>
            </div>
        );
    }

    const strengthLabel = rootObj.strength === 'strong-hybrid' ? 'STRONG' : rootObj.strength.toUpperCase();
    const rootTypeParts = [
        'TRILITTERAL', // Assuming all are triliteral for now or derived from consonants length
        strengthLabel || '',
        id?.toUpperCase() || '',
        rootObj?.weak_class?.toUpperCase() || null,
        rootObj?.is_geminate ? 'GEMINATED' : null
    ].filter(Boolean).join(' • ');

    const titleGloss = (dbRoot?.gloss || primaryEntry?.definitions?.[0]?.text_en || 'UNKNOWN').toUpperCase();


    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
                {/* Header */}
                <div className="text-center mb-12 relative group max-w-fit mx-auto">
                    <div className="flex items-center justify-center gap-4">
                        <h1 className="font-serif font-bold text-[3rem] leading-none text-[#000] tracking-tight">{rootObj.consonants}</h1>
                        {isActualAdmin && (
                            <button
                                onClick={() => setShowRootForm(true)}
                                className="p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors opacity-0 group-hover:opacity-100 translate-y-1"
                                title="Edit Root Metadata"
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                    </div>
                    <p className="text-sm font-serif text-black/60 mt-3 uppercase tracking-widest">"{titleGloss}"</p>
                    <p className="text-[0.65rem] font-sans text-black/40 tracking-[0.18em] mt-3 uppercase">
                        — {rootTypeParts} —
                    </p>
                </div>

                <div className="flex gap-10 items-start">
                    {/* Left Sidebar */}
                    <div className="w-64 shrink-0 space-y-4">
                        <SideCard title={t('Gloss', term('Tifsira'))}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-[#000] marker:text-black/30">
                                {glossList.map((g, i) => (
                                    <li key={i}>{g}</li>
                                ))}
                            </ol>
                        </SideCard>

                        {etymologyText && (
                            <SideCard title={t('Etymology', term('Etimoloġija'))}>
                                <p className="text-sm text-[#000] leading-relaxed">
                                    {etymologyText}
                                </p>
                            </SideCard>
                        )}

                        {sourceText && (
                            <SideCard title={t('Source', term('sors'))}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{sourceText}</span>
                            </SideCard>
                        )}

                        {isActualAdmin && (
                            <div className="mt-8 pt-8 border-t border-black/5 space-y-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-black/30 mb-2 font-bold">Internal Metadata</p>
                                    <div className="text-[11px] font-mono space-y-1 text-black/50">
                                        <p>Strength: {rootObj.strength}</p>
                                        {rootObj.weak_class && <p>Weak Class: {rootObj.weak_class}</p>}
                                        <p>Vow. Perf: {rootObj.vowel_set_perf || 'a-a'}</p>
                                        <p>Vow. Impf: {rootObj.vowel_set_impf || 'i-a'}</p>
                                        <p>Vow. Imp: {rootObj.vowel_set_imp || 'o-o'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 min-w-0 space-y-12">

                        {/* Verbal Forms Table */}
                        <div>
                            <h2 className="font-sans font-semibold text-[1.1rem] text-[#000] mb-4">Verbal Forms</h2>
                            <table className="w-full text-sm border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-black/8 font-sans text-black/80">
                                        <th className="font-semibold pb-2 pr-4 w-12">Form</th>
                                        <th className="font-semibold pb-2 pr-4">Lemma</th>
                                        <th className="font-semibold pb-2 pr-4">Imperfect</th>
                                        <th className="font-semibold pb-2 pr-4">Passive</th>
                                        <th className="font-semibold pb-2 pr-4">Active</th>
                                        <th className="font-semibold pb-2">Noun</th>
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
                                                    onEdit={() => {
                                                        const existing = rootEntries.find(e => e.headword === row.perfect.value);
                                                        if (existing) {
                                                            setEditEntry({
                                                                id: existing.id,
                                                                headword: existing.headword,
                                                                pos: existing.pos,
                                                                created_at: '',
                                                                is_loanword: false
                                                            });
                                                            setInitialFormData(null);
                                                        } else {
                                                            setEditEntry(null);
                                                            setInitialFormData({
                                                                headword: row.perfect.value,
                                                                pos: 'verb',
                                                                verb_class: rootObj?.strength || '',
                                                                verb_perfective_3sgm: row.perfect.value,
                                                                verb_imperfective_3sgm: row.imperfect.value,
                                                                verb_verbal_noun: row.verbalNoun.value
                                                            });
                                                        }
                                                        setShowForm(true);
                                                    }}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif">
                                                <MarkedCell data={row.imperfect} isAdmin={isActualAdmin} />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif">
                                                <MarkedCell data={row.passiveParticiple} isAdmin={isActualAdmin} />
                                            </td>
                                            <td className="py-2.5 pr-4 font-serif">
                                                <MarkedCell data={row.activeParticiple} isAdmin={isActualAdmin} />
                                            </td>
                                            <td className="py-2.5 font-serif">
                                                <MarkedCell data={row.verbalNoun} isAdmin={isActualAdmin} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Derived Terms Table */}
                        {derivedTerms.length > 0 && (
                            <div>
                                <h2 className="font-sans font-semibold text-[1.1rem] text-[#000] mb-4">Derived Terms</h2>
                                <table className="w-2/3 text-sm border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-black/8 font-sans text-black/80">
                                            <th className="font-semibold pb-2 pr-4">Term</th>
                                            <th className="font-semibold pb-2 pr-4">Class</th>
                                            <th className="font-semibold pb-2">Wiżen Pattern</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {derivedTerms.map((t, idx) => (
                                            <tr key={idx} className="border-b border-black/4 last:border-0 hover:bg-black/[0.02] group transition-colors">
                                                <td className="py-1.5 pr-4 font-serif flex items-center gap-2">
                                                    <Link to={`/entry/${t.id}`} style={{ color: BLUE }} className="hover:underline">{t.term}</Link>
                                                    {isActualAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const existing = rootEntries.find(re => re.id === t.id);
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
                                                            className="opacity-70 hover:opacity-100 p-0.5 rounded hover:bg-black/5 text-black/55 transition-all"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="py-1.5 pr-4 font-sans text-black/70">{t.class}</td>
                                                <td className="py-1.5 font-sans" style={{ color: BLUE }}>{t.wizen}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Thesaurus */}
                        {((vm?.synonyms?.length ?? 0) > 0 || (vm?.antonyms?.length ?? 0) > 0) && (
                            <div className="border-t border-black/10 pt-6">
                                <h2 className="font-sans font-semibold text-[1.1rem] text-[#000] mb-4">Thesaurus</h2>
                                <div className="flex gap-16 text-sm">
                                    {vm?.synonyms && vm.synonyms.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-[#000] mb-1">Synonyms</p>
                                            {vm.synonyms.map(s => (
                                                <div key={s.id} className="mb-1">
                                                    <Link to={`/search?q=${s.headword}`} style={{ color: BLUE }} className="hover:underline font-serif">
                                                        -{s.headword}-
                                                    </Link>
                                                    <span className="text-black/40 italic ml-2">"{s.gloss_en}"</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {vm?.antonyms && vm.antonyms.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-[#000] mb-1">Antonyms</p>
                                            {vm.antonyms.map(a => (
                                                <div key={a.id} className="mb-1">
                                                    <Link to={`/search?q=${a.headword}`} style={{ color: BLUE }} className="hover:underline font-serif">
                                                        {a.headword}
                                                    </Link>
                                                    <span className="text-black/40 italic ml-2">"{a.gloss_en}"</span>
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

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    initialForm={initialFormData}
                    onClose={() => setShowForm(false)}
                    onSaved={() => {
                        setShowForm(false);
                        // In a real app we'd re-fetch, here we just refresh
                        window.location.reload();
                    }}
                    getToken={getToken}
                />
            )}
            {showRootForm && rootObj && (
                <RootFormModal
                    data={{
                        consonants: rootObj.consonants,
                        glosses: dbRoot?.gloss ? [dbRoot.gloss] : (primaryEntry.definitions.map(d => d.text_en) || ['']),
                        etymology: {
                            language: '',
                            term: '',
                            definition: dbRoot?.etymology || primaryEntry.etymologies?.[0]?.chain[0]?.meaning || ''
                        },
                        source: dbRoot?.source || primaryEntry.verb_morphology?.source_citation || '',
                        strength: rootObj.strength,
                        weak_class: rootObj.weak_class || '',
                        vowel_set_perf: rootObj.vowel_set_perf,
                        vowel_set_impf: rootObj.vowel_set_impf,
                        vowel_set_imp: rootObj.vowel_set_imp
                    }}
                    onClose={() => setShowRootForm(false)}
                    saving={saving}
                    onSaved={async (newData: RootFormData) => {
                        setSaving(true);
                        try {
                            const token = await getToken();
                            if (!token) throw new Error('Not authenticated');

                            // Update the root record directly
                            const { adminUpdateRoot } = await import('@/lib/api');
                            await adminUpdateRoot(token, newData.consonants, {
                                strength: newData.strength,
                                weak_class: newData.weak_class,
                                gloss: newData.glosses[0] || '',
                                etymology: newData.etymology.definition,
                                source: newData.source,
                                vowel_set_perf: newData.vowel_set_perf,
                                vowel_set_impf: newData.vowel_set_impf,
                                vowel_set_imp: newData.vowel_set_imp
                            });

                            // Update local state
                            setDbRoot({
                                ...rootObj,
                                ...newData,
                                gloss: newData.glosses[0],
                                etymology: newData.etymology.definition
                            });

                            setShowRootForm(false);

                            if (newData.consonants !== rootObj.consonants) {
                                window.location.href = `/root/${newData.consonants}`;
                            }
                        } catch (err: any) {
                            console.error("Failed to save root:", err);
                            alert(`Failed to save root changes: ${err.message}`);
                        } finally {
                            setSaving(false);
                        }
                    }}
                />
            )}
        </div>
    );
}
