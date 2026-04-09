import { useMemo, useState, isValidElement, type ReactNode } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useHideTheoreticalForms } from '@/contexts/HideTheoreticalFormsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { type Entry } from '@/types';
import { useStemData } from '@/hooks/useStemData';
import { EntryShell, type EntryViewModel, EtymologySentence, SideCard } from '@/components/dictionary/EntryShell';
import { FunctionWordEntryView } from './Entry';
import { getGloss } from '@/lib/utils';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { StemFormModal } from '@/components/admin/StemFormModal';
import { adminDeleteEntry } from '@/lib/api';
import { buildStemMorphologyViewModel } from '@/lib/stemMorphology';
import { normalizeStemEtymologyChain } from '@/lib/adminUtils';
import { normalizeDictionaryEtymologyChain } from '@/components/dictionary/etymology';
import { MorphologyProvenanceRows } from '@/components/dictionary/EntryMorphology';
import { VerbFormsTable, StackedSurface } from '@/components/dictionary/VerbFormsTable';
import { resolveAttestedEntryFromEntries } from '@/lib/conjugationEngine';
import { isHiddenTag } from '@/lib/tagLabel';
import { shouldHideSurface } from '@/lib/theoreticalForms';

const BLUE = '#1034A6';

function MarkedCell({
    data,
    isAdmin,
    onEdit,
    onDelete,
    noLink,
    hideWhenHidden,
}: {
    data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string };
    isAdmin?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    noLink?: boolean;
    hideWhenHidden?: boolean;
}) {
    const { term } = useLinguisticMode();
    const { hideTheoreticalForms } = useHideTheoreticalForms();
    const rawValue = String(data.value || '').trim();
    const hasMarkerPrefix = rawValue.startsWith('*') || rawValue.startsWith('✦');
    const hidden = hideTheoreticalForms && (data.marker !== 'plain' || rawValue.startsWith('*') || rawValue.startsWith('✦'));
    if (data.value === '-') return <span className="opacity-40">-</span>;
    if (hidden) return hideWhenHidden ? null : <span className="opacity-40">-</span>;
    const displayValue = hideTheoreticalForms ? rawValue.replace(/^[*✦]+\s*/, '').trim() : data.value;
    const markerPrefix = data.marker === 'theoretical'
        ? '*'
        : (data.marker === 'auto_generated' ? '✦' : '');

    const content = (data.marker === 'plain' && !noLink) ? (
        <Link to={`/entry/${data.entryId || data.value}`} className="text-[#1034A6] hover:underline">
            {displayValue}
        </Link>
    ) : (
        <span className={data.marker === 'plain' ? 'text-black' : 'opacity-45'}>
            {markerPrefix && !hasMarkerPrefix ? markerPrefix : ''}{displayValue}
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
    const { hideTheoreticalForms } = useHideTheoreticalForms();
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
        stemMorphology: stemMorphologySource,
        source_languages,
        entries,
        stem,
        loading,
        refetch
    } = useStemData(id);

    const stemMorphology = useMemo(() => buildStemMorphologyViewModel(stemMorphologySource), [
        stemMorphologySource?.stem_string,
        stemMorphologySource?.class_type,
        stemMorphologySource?.is_hybrid,
        stemMorphologySource?.root,
        stemMorphologySource?.agentive_suffix,
    ]);

    const stemAdverbEntry = useMemo(() => {
        if (!entries) return null;
        const adverbEntries = entries.filter(e => (e.pos || '').toLowerCase() === 'adverb') as Entry[];
        if (adverbEntries.length === 0) return null;

        return (
            adverbEntries.find(e => (e as any)?.zokk_morphology?.stem_string === stem_string) ||
            adverbEntries.find(e => (e as any)?.zokk_morphology) ||
            adverbEntries[0] ||
            null
        );
    }, [entries, stem_string]);

    const stemAdverbDisplayEntry = useMemo(() => {
        if (!stemAdverbEntry) return null;
        return stemAdverbEntry as Entry;
    }, [stemAdverbEntry]);

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
        background: 'linear-gradient(rgba(244,243,240,0.88), rgba(244,243,240,0.88)), url("/bg-pattern.png") center/cover no-repeat',
        minHeight: '100vh',
    };

    const glossList = useMemo(() => {
        const canonicalGlosses = Array.isArray(stem?.glosses) ? stem.glosses : [];
        if (canonicalGlosses.length > 0) {
            return canonicalGlosses
                .map((g: any) => (language === 'en' ? g?.en : g?.mt))
                .filter(Boolean);
        }

        if (!entries) return [];
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

        if (canonicalTags.length > 0) return canonicalTags.filter((tag: string) => !isHiddenTag(tag));
        if (!entries) return [];
        return entries.flatMap(e => (e as any).tags || []).filter((v, i, a) => a.indexOf(v) === i && !isHiddenTag(v));
    }, [entries, stem]);

    const etymologyItems = useMemo(() => {
        const chain = normalizeStemEtymologyChain(stem?.etymology);
        const layered = chain.filter((step) => step && (step.language || step.term || step.definition));

        if (layered.length > 0) {
            return normalizeDictionaryEtymologyChain(layered, (language) => term(language));
        }

        return source_languages.map(language => ({ language }));
    }, [source_languages, stem?.etymology, term]);

    const zokkForms = stemMorphology?.forms;
    const displayStem = stemMorphology?.displayStem || stem_string || '';
    const hybridForms = zokkForms?.hybrid_forms;
    const passiveAlternates = zokkForms?.passive_participle?.alternates?.masc || [];
    const passiveAlternateEntries = useMemo(() => {
        return passiveAlternates
            .map((alt: string) => resolveAttestedEntryFromEntries(entries, {
                surface: alt,
                form: 'I',
                pos: 'participle',
                type: 'passive',
                participleType: 'passive',
                root: root || undefined,
                stem: stem_string || undefined,
            }) || entries.find(e => e.headword === alt) || { headword: alt })
            .filter(Boolean) as Array<{ id?: string; headword: string; gloss_en?: string; gloss_mt?: string }>;
    }, [entries, passiveAlternates, root, stem_string]);
    const resolveStemCellEntry = (
        value: string,
        opts?: {
            type?: 'lemma' | 'passive' | 'active' | 'noun' | 'imperfect' | 'imperative';
            form?: 'I' | 'II';
            pos?: string;
            participleType?: 'passive' | 'active';
        }
    ) => resolveAttestedEntryFromEntries(entries, {
        surface: value,
        form: opts?.form,
        pos: opts?.pos,
        type: opts?.type,
        participleType: opts?.participleType,
        root: root || undefined,
        stem: stem_string || undefined,
    });
      const makeCellData = (
          value: string,
          opts?: {
              theoretical?: boolean;
              type?: 'lemma' | 'passive' | 'active' | 'noun' | 'imperfect' | 'imperative';
              form?: 'I' | 'II';
              pos?: string;
              participleType?: 'passive' | 'active';
              parentMarker?: 'plain' | 'theoretical' | 'auto_generated';
          }
      ) => {
          if (opts?.type === 'imperfect') {
              return {
                  value,
                  marker: opts?.parentMarker ?? ('auto_generated' as const),
              };
          }
          const entry = resolveStemCellEntry(value, opts);
        if (entry) {
            return { value: entry.word, marker: 'plain' as const, entryId: entry.id };
        }
        return {
            value,
              marker: opts?.theoretical ? 'theoretical' as const : 'auto_generated' as const
          };
      };

      const getParentVerbMarker = (surface: string, form: 'I' | 'II') =>
          makeCellData(surface, { type: 'lemma', form, pos: 'verb' }).marker;

    const renderPassiveCell = (surface: string) => {
        const primaryData = makeCellData(surface, { type: 'passive', form: 'I', pos: 'participle', participleType: 'passive' });
        const visibleAlternateEntries = hideTheoreticalForms
            ? passiveAlternateEntries.filter((item) => !shouldHideSurface(item, hideTheoreticalForms))
            : passiveAlternateEntries;
        const primary = (
            <MarkedCell
                data={primaryData}
                isAdmin={isActualAdmin}
                hideWhenHidden
                onDelete={() => {
                    const existing = resolveStemCellEntry(surface, { form: 'I', pos: 'participle', participleType: 'passive' });
                    if (existing?.id) handleDeleteEntry(existing.id);
                }}
                onEdit={() => openEntryEditor(surface, { type: 'passive', pos: 'participle', participle_type: 'passive', form: 'I' })}
            />
        );

        if (hideTheoreticalForms && shouldHideSurface(primaryData, hideTheoreticalForms) && visibleAlternateEntries.length === 0) {
            return null;
        }

        if (visibleAlternateEntries.length === 0) {
            return primary;
        }

        return (
            <StackedSurface
                primary={primary}
                alternates={visibleAlternateEntries.map((item) => {
                    const existing = item.id ? entries.find(e => e.id === item.id) : entries.find(e => e.headword === item.headword);

                    return (
                        <MarkedCell
                            key={item.id || item.headword}
                            data={
                                existing
                                    ? { value: existing.headword, marker: 'plain' as const, entryId: existing.id }
                                    : makeCellData(item.headword, { type: 'passive', form: 'I', pos: 'participle', participleType: 'passive' })
                            }
                            isAdmin={isActualAdmin}
                            onDelete={existing ? () => handleDeleteEntry(existing.id) : undefined}
                            onEdit={() => openEntryEditor(item.headword, { type: 'passive', pos: 'participle', participle_type: 'passive', form: 'I' })}
                        />
                    );
                })}
            />
        );
    };

    const toVerbCell = (
        node: ReactNode | null | undefined,
        marker?: 'plain' | 'theoretical' | 'auto_generated',
        placeholder?: boolean,
    ) => {
        if (node === null || node === undefined) {
            if (hideTheoreticalForms && (marker ?? 'plain') !== 'plain') {
                return {
                    value: '-',
                    marker: marker || 'plain',
                    hidden: true,
                    placeholder: true,
                };
            }
            return undefined;
        }
        const inferredPlaceholder =
            placeholder ??
            (isValidElement(node) &&
                typeof (node.props as any)?.data?.value === 'string' &&
                String((node.props as any).data.value).trim() === '-');
        return {
            value: node,
            marker: marker || 'plain',
            hidden: hideTheoreticalForms && (marker ?? 'plain') !== 'plain',
            placeholder: !!inferredPlaceholder,
        };
    };

    const viewModel: EntryViewModel = {
        title: displayStem,
        headerAccessory: isActualAdmin ? (
            <button
                onClick={() => setShowStemModal(true)}
                className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                title={term('edit-root-metadata')}
            >
                <Edit2 size={16} />
            </button>
        ) : undefined,
        subtitle: glossList[0] ? (
            <p className="text-sm font-serif text-black/55 mt-2 uppercase tracking-widest text-center">"{glossList[0]}"</p>
        ) : undefined,
        meta: (
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
        ),
    };

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
            type?: 'lemma' | 'passive' | 'active' | 'noun' | 'imperfect' | 'imperative';
            pos: string;
            form?: 'I' | 'II';
            participle_type?: string;
            noLink?: boolean;
        }
    ) => {
        const existingMatch = resolveStemCellEntry(value, {
            type: config.type,
            form: config.form,
            pos: config.pos,
            participleType: config.participle_type as 'passive' | 'active' | undefined,
        });
        const existing = existingMatch?.id ? entries.find(e => e.id === existingMatch.id) : null;
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
                        {isActualAdmin && (
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
                        )}
                        <Link
                            to="/root-search?mode=stem"
                            className="w-full sm:w-auto bg-white text-black text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                        >
                            {term('search-another-stem') || term('back-to-search')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (stemAdverbDisplayEntry) {
        return (
            <>
                <FunctionWordEntryView
                    entry={stemAdverbDisplayEntry}
                    onRefetch={refetch}
                    stemDisplayValue={stem_string || stemAdverbDisplayEntry.headword}
                    rootDisplayValue={root || undefined}
                    rootHref={root ? `/root/${root}` : undefined}
                    classType={class_type || undefined}
                    isHybrid={!!is_hybrid}
                />
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
            </>
        );
    }

    return (
        <EntryShell viewModel={viewModel}>
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

                        <div className="space-y-4 px-1">
                            <MorphologyProvenanceRows
                                source={stemMorphology?.source}
                                rootDisplayValue={root || undefined}
                            />
                        </div>

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

                        <VerbFormsTable
                            title={term('verbal-forms')}
                            hideTheoreticalForms={hideTheoreticalForms}
                            columnLabels={{
                                form: term('form'),
                                lemma: term('lemma'),
                                imperfect: term('imperfect'),
                                imperative: term('imperative'),
                                passive: term('passive'),
                                active: term('active'),
                                verbalNoun: term('verbal-noun'),
                            }}
                            rows={[
                                {
                                    key: 'I',
                                    form: <span className="font-serif font-bold text-[#1034A6]">I</span>,
                                    lemma: toVerbCell(
                                        <MarkedCell
                                            data={makeCellData(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || '', { type: 'lemma', form: 'I', pos: 'verb' })}
                                            isAdmin={isActualAdmin}
                                            hideWhenHidden
                                            onDelete={() => {
                                                const existing = resolveStemCellEntry(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || '', { type: 'lemma', form: 'I', pos: 'verb' });
                                                if (existing?.id) handleDeleteEntry(existing.id);
                                            }}
                                            onEdit={() => openEntryEditor(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || '', { type: 'lemma', pos: 'verb', form: 'I' })}
                                        />,
                                        makeCellData(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || '', { type: 'lemma', form: 'I', pos: 'verb' }).marker,
                                    ),
                                    imperfect: toVerbCell(<MarkedCell data={makeCellData(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.imperfect || '', { type: 'imperfect', form: 'I', pos: 'verb', parentMarker: getParentVerbMarker(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || '', 'I') })} hideWhenHidden noLink />, makeCellData(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.imperfect || '', { type: 'imperfect', form: 'I', pos: 'verb', parentMarker: getParentVerbMarker(zokkForms?.conjugation?.rows.find(r => r.person_mt === '3ms')?.perfect || '', 'I') }).marker),
                                    imperative: toVerbCell(<MarkedCell data={makeCellData(zokkForms?.conjugation?.imperative_sg || '', { type: 'imperative', form: 'I', pos: 'verb' })} hideWhenHidden />, makeCellData(zokkForms?.conjugation?.imperative_sg || '', { type: 'imperative', form: 'I', pos: 'verb' }).marker),
                                    passive: toVerbCell(
                                        renderPassiveCell(zokkForms?.passive_participle?.masc || ''),
                                        makeCellData(zokkForms?.passive_participle?.masc || '', { type: 'passive', form: 'I', pos: 'participle', participleType: 'passive' }).marker,
                                    ),
                                    active: toVerbCell(
                                        <MarkedCell
                                            data={makeCellData(zokkForms?.agentive?.masc || '', { type: 'active', form: 'I', pos: 'participle', participleType: 'active' })}
                                            isAdmin={isActualAdmin}
                                            hideWhenHidden
                                            onDelete={() => {
                                                const existing = resolveStemCellEntry(zokkForms?.agentive?.masc || '', { form: 'I', pos: 'participle', participleType: 'active' });
                                                if (existing?.id) handleDeleteEntry(existing.id);
                                            }}
                                            onEdit={() => openEntryEditor(zokkForms?.agentive?.masc || '', { type: 'active', pos: 'participle', participle_type: 'active', form: 'I' })}
                                        />,
                                        makeCellData(zokkForms?.agentive?.masc || '', { type: 'active', form: 'I', pos: 'participle', participleType: 'active' }).marker,
                                    ),
                                    verbalNoun: toVerbCell(
                                        <MarkedCell
                                            data={makeCellData(zokkForms?.verbal_noun || '', { type: 'noun', form: 'I', pos: 'noun' })}
                                            isAdmin={isActualAdmin}
                                            hideWhenHidden
                                            onDelete={() => {
                                                const existing = resolveStemCellEntry(zokkForms?.verbal_noun || '', { form: 'I', pos: 'noun' });
                                                if (existing?.id) handleDeleteEntry(existing.id);
                                            }}
                                            onEdit={() => openEntryEditor(zokkForms?.verbal_noun || '', { type: 'noun', pos: 'noun', form: 'I' })}
                                        />,
                                        makeCellData(zokkForms?.verbal_noun || '', { type: 'noun', form: 'I', pos: 'noun' }).marker,
                                    ),
                                },
                                ...(is_hybrid && zokkForms?.hybrid_forms ? [{
                                    key: 'II',
                                    form: <span className="font-serif font-bold text-[#1034A6]">II</span>,
                                    lemma: toVerbCell(<MarkedCell data={makeCellData(hybridForms?.form_ii || '', { type: 'lemma', form: 'II', pos: 'verb' })} hideWhenHidden />, makeCellData(hybridForms?.form_ii || '', { type: 'lemma', form: 'II', pos: 'verb' }).marker),
                                    imperfect: hybridForms?.form_ii_imperfect ? (
                                        toVerbCell(<MarkedCell data={makeCellData(hybridForms.form_ii_imperfect, { type: 'imperfect', form: 'II', pos: 'verb', parentMarker: getParentVerbMarker(hybridForms?.form_ii || '', 'II') })} hideWhenHidden noLink />, makeCellData(hybridForms.form_ii_imperfect, { type: 'imperfect', form: 'II', pos: 'verb', parentMarker: getParentVerbMarker(hybridForms?.form_ii || '', 'II') }).marker)
                                    ) : (
                                        undefined
                                    ),
                                    imperative: hybridForms?.form_ii_imperative ? (
                                        toVerbCell(<MarkedCell data={makeCellData(hybridForms.form_ii_imperative, { type: 'imperative', form: 'II', pos: 'verb' })} hideWhenHidden />, makeCellData(hybridForms.form_ii_imperative, { type: 'imperative', form: 'II', pos: 'verb' }).marker)
                                    ) : (
                                        undefined
                                    ),
                                    passive: hybridForms?.form_ii_passive_participle ? (
                                        toVerbCell(
                                            <MarkedCell
                                            data={makeCellData(hybridForms.form_ii_passive_participle, { type: 'passive', form: 'II', pos: 'participle', participleType: 'passive' })}
                                            isAdmin={isActualAdmin}
                                            hideWhenHidden
                                            noLink
                                            onEdit={() => openEntryEditor(hybridForms.form_ii_passive_participle || '', { type: 'passive', pos: 'participle', participle_type: 'passive', form: 'II' })}
                                        />,
                                            makeCellData(hybridForms.form_ii_passive_participle, { type: 'passive', form: 'II', pos: 'participle', participleType: 'passive' }).marker,
                                        )
                                    ) : (
                                        toVerbCell(
                                            <MarkedCell
                                            data={makeCellData(hybridForms?.semitic_passive_participle || '', { type: 'passive', form: 'II', pos: 'participle', participleType: 'passive' })}
                                            isAdmin={isActualAdmin}
                                            hideWhenHidden
                                            noLink
                                            onEdit={() => openEntryEditor(hybridForms?.semitic_passive_participle || '', { type: 'passive', pos: 'participle', participle_type: 'passive', form: 'II' })}
                                        />,
                                            makeCellData(hybridForms?.semitic_passive_participle || '', { type: 'passive', form: 'II', pos: 'participle', participleType: 'passive' }).marker,
                                        )
                                    ),
                                    active: hybridForms?.form_ii_active_participle ? (
                                        toVerbCell(<MarkedCell data={makeCellData(hybridForms.form_ii_active_participle, { type: 'active', form: 'II', pos: 'participle', participleType: 'active' })} hideWhenHidden />, makeCellData(hybridForms.form_ii_active_participle, { type: 'active', form: 'II', pos: 'participle', participleType: 'active' }).marker)
                                    ) : (
                                        undefined
                                    ),
                                    verbalNoun: hybridForms?.form_ii_verbal_noun ? (
                                        toVerbCell(<MarkedCell data={makeCellData(hybridForms.form_ii_verbal_noun, { type: 'noun', form: 'II', pos: 'noun' })} hideWhenHidden />, makeCellData(hybridForms.form_ii_verbal_noun, { type: 'noun', form: 'II', pos: 'noun' }).marker)
                                    ) : (
                                        undefined
                                    ),
                                }] : []),
                            ]}
                        />

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
                                                    data={makeCellData(zokkForms?.verbal_noun || '', { type: 'noun', form: 'I', pos: 'noun' })}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = resolveStemCellEntry(zokkForms?.verbal_noun || '', { form: 'I', pos: 'noun' });
                                                        if (existing?.id) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.verbal_noun || '', { type: 'noun', pos: 'noun', form: 'I' })}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-sans text-[10px] uppercase font-bold text-black/30 tracking-tight">{term('verbal-noun')}</td>
                                            <td className="py-2.5 font-sans text-blue-800">-{class_type}</td>
                                        </tr>
                                        <tr className="border-b border-black/4 hover:bg-black/2 transition-colors">
                                            <td className="py-2.5 pr-4 font-serif font-bold text-blue-900">
                                                {renderPassiveCell(zokkForms?.passive_participle?.masc || '')}
                                            </td>
                                            <td className="py-2.5 pr-4 font-sans text-[10px] uppercase font-bold text-black/30 tracking-tight">{term('passive-participle')}</td>
                                            <td className="py-2.5 font-sans text-blue-800">-{class_type === 'ar' ? 'at' : 'it'}</td>
                                        </tr>
                                        <tr className="border-b border-black/4 hover:bg-black/2 transition-colors">
                                            <td className="py-2.5 pr-4 font-serif font-bold text-blue-900">
                                                <MarkedCell
                                                    data={makeCellData(zokkForms?.agentive?.masc || '', { type: 'active', form: 'I', pos: 'participle', participleType: 'active' })}
                                                    isAdmin={isActualAdmin}
                                                    onDelete={() => {
                                                        const existing = resolveStemCellEntry(zokkForms?.agentive?.masc || '', { form: 'I', pos: 'participle', participleType: 'active' });
                                                        if (existing?.id) handleDeleteEntry(existing.id);
                                                    }}
                                                    onEdit={() => openEntryEditor(zokkForms?.agentive?.masc || '', { type: 'active', pos: 'participle', participle_type: 'active', form: 'I' })}
                                                />
                                            </td>
                                            <td className="py-2.5 pr-4 font-sans text-[10px] uppercase font-bold text-black/30 tracking-tight">{term('agentive')}</td>
                                            <td className="py-2.5 font-sans text-blue-800">-{agentive_suffix || (class_type === 'ar' ? 'atur' : 'itur')}</td>
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
        </EntryShell>
    );
}
