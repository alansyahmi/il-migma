import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_ENTRIES } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { type Entry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { buildVerbForm, buildPerfectForm, getDoLabels, getIoLabels } from '@/lib/suffixEngine';
import { generateConjugation, generateRootForms, markGeneratedForms, getAttestedEntries } from '@/lib/conjugationEngine';
import { applyInflectionTableSuffix } from '@/lib/inflectionTable';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Edit2, ArrowLeft, Search, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { EntryFormModal, type AdminEntry } from '@/components/admin/EntryFormModal';
import { apiGetEntry, adminUpdateEntry } from '@/lib/api';
import { useRootData } from '@/hooks/useRootData';
import { useAdminConfig } from '@/lib/adminConfig';
import { cn, getGloss } from '@/lib/utils';
import { SubParts } from '@/components/dictionary/SubParts';
import { generateTheoreticalDual, generateFeminineDualFromMasculineWithHint, generateElative, generateNumeralForms, generateDiminutiveForm, generateDiminutiveSoundPlural, generateFeminineDiminutiveSoundPlural, type NumeralAutoForms } from '@/lib/maltesePhonology';
import { isHiddenTag, resolveTagLabel, stripTagPrefixes } from '@/lib/tagLabel';
import { resolveStemDefaults } from '@/lib/stemDefaults';
import { MorphologyProvenanceRows } from '@/components/dictionary/EntryMorphology';
import { BLUE, CREAM_RGBA, GOLD, EtymologySentence, PropRow, SideCard } from '@/components/dictionary/EntryShell';
import { normalizeDictionaryEtymologyChain } from '@/components/dictionary/etymology';
import { StackedSurface } from '@/components/dictionary/VerbFormsTable';
import { compactPluralRows, normalizePluralFormRows } from '@/lib/pluralForms';

export { BLUE, CREAM_RGBA, GOLD, EntryShell, EtymologySentence, PropRow, SideCard } from '@/components/dictionary/EntryShell';

const MarkedValue = ({ val, theoretical, showMarker = true }: { val: string | React.ReactNode | { value: React.ReactNode, theoretical: boolean }, theoretical?: boolean, showMarker?: boolean }) => {
    const isObj = typeof val === 'object' && val !== null && 'value' in val;
    let v = isObj ? (val as any).value : val;
    let isT = isObj ? (val as any).theoretical : theoretical;

    // If the value is a string and starts with an asterisk, treat it as theoretical
    if (typeof v === 'string' && v.trim().startsWith('*')) {
        isT = true;
        v = v.trim().substring(1).trim();
    } else if (typeof v === 'string') {
        v = v.trim();
    }

    if (!v || v === '-') return <span className="opacity-40">-</span>;
    return (
        <span className={cn("font-serif", isT && "text-black/55")}>
            {isT && showMarker ? '*' : ''}{v}
        </span>
    );
};

function buildDisplayEtymologyItems(chain: any, translateLanguage: (language: string) => string) {
    return normalizeDictionaryEtymologyChain(chain, translateLanguage);
}

function MorphologyTable({
    title,
    rows,
    displayPattern,
    labelHeader,
}: {
    title: string;
    rows: Array<SectionRow | MorphologyDisplayRow>;
    displayPattern?: (p?: string) => string;
    labelHeader?: string;
}) {
    const { term } = useLinguisticMode();
    const sectionRows = rows.filter((row): row is SectionRow => 'kind' in row);
    const dataRows = rows.filter(
        (row): row is MorphologyDisplayRow =>
            !('kind' in row) && row.show !== false && !!row.value && row.value !== '-',
    );
    if (dataRows.length === 0) return null;
    const headerLabel = labelHeader || term('feature') || 'Feature';
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        sectionRows.forEach((row) => {
            initial[row.id] = row.defaultOpen ?? false;
        });
        return initial;
    });

    useEffect(() => {
        setOpenSections((prev) => {
            const next = { ...prev };
            let changed = false;
            sectionRows.forEach((row) => {
                if (!(row.id in next)) {
                    next[row.id] = row.defaultOpen ?? false;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [rows]);

    const toggleSection = (id: string) => {
        setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const renderedRows: React.ReactNode[] = [];
    const sectionStack: Array<{ id: string; depth: number; open: boolean }> = [];

    rows.forEach((row, idx) => {
        if ('kind' in row) {
            const depth = row.depth ?? 0;
            while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].depth >= depth) {
                sectionStack.pop();
            }
            const ancestorsOpen = sectionStack.every((section) => section.open);
            const isOpen = openSections[row.id] ?? row.defaultOpen ?? false;
            sectionStack.push({ id: row.id, depth, open: isOpen });
            if (!ancestorsOpen) return;

            renderedRows.push(
                <tr key={`section-${row.id}-${idx}`} className="border-b border-black/4 bg-black/[0.02]">
                    <td colSpan={3} className={`py-2.5 ${depth > 0 ? 'pl-6' : 'pl-3'} pr-3`}>
                        <button
                            type="button"
                            onClick={() => toggleSection(row.id)}
                            className="flex w-full items-center justify-between gap-3 text-left font-sans uppercase tracking-[0.14em] text-black/60 text-[10px] hover:text-black/80 transition-colors"
                            aria-expanded={isOpen}
                        >
                            <span>{row.label}</span>
                            {isOpen ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
                        </button>
                    </td>
                </tr>,
            );
            return;
        }

        const ancestorsOpen = sectionStack.every((section) => section.open);
        if (!ancestorsOpen) return;
        if (!(row.value && row.value !== '-')) return;
        const rowPath = sectionStack.map((section) => section.id).join('>');

        renderedRows.push(
            <tr key={`${rowPath}|${row.label}|${idx}`} className="border-b border-black/4 group/row">
                <td className="py-2.5 pr-4 text-black/40 text-[10px] font-sans uppercase tracking-wider leading-tight">
                    {row.label}
                </td>
                <td className="py-2.5 font-serif text-black leading-normal">
                    <div className="flex items-baseline">
                        {typeof row.value === 'string' || (row.value && typeof row.value === 'object' && !React.isValidElement(row.value)) ? (
                            <MarkedValue val={row.value as any} theoretical={row.theoretical} />
                        ) : (
                            row.value
                        )}
                        {row.extra}
                    </div>
                </td>
                <td className="py-2.5 text-black/40 text-sm font-sans tracking-tight leading-normal">
                    {row.pattern ? (displayPattern ? displayPattern(row.pattern) : row.pattern) : '-'}
                </td>
            </tr>,
        );
    });

    return (
        <div className="w-full">
            <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                {title}
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-black/8 font-sans">
                            <th className="text-left font-semibold text-black pb-2 pr-4 w-32 sm:w-40">{headerLabel}</th>
                            <th className="text-left font-semibold text-black pb-2">{term('surface-form') || 'Surface Form'}</th>
                            <th className="text-left font-semibold text-black pb-2 w-24 sm:w-32">{term('pattern') || 'Pattern'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderedRows}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

type NounGenderVariant = 'masculine' | 'feminine';

type SectionRow = {
    kind: 'section';
    id: string;
    label: string;
    depth?: number;
    defaultOpen?: boolean;
};

type MorphologyDisplayRow = {
    label: string;
    value: React.ReactNode;
    show?: boolean;
    theoretical?: boolean;
    extra?: React.ReactNode;
    pattern?: string | null;
};

type NounParadigmCell = {
    value?: React.ReactNode;
    pattern?: string | null;
    theoretical?: boolean;
    stacked?: Array<{ value: string; pattern?: string | null; theoretical?: boolean }>;
};

type NounParadigmDataRow = {
    label: string;
    singular: NounParadigmCell;
    dual: NounParadigmCell;
    plural: NounParadigmCell;
};

type NounParadigmRow = NounParadigmDataRow | SectionRow;

type DiminutiveDisplayRow = {
    form: string;
    pattern: string | null;
    theoretical: boolean;
    gender?: NounGenderVariant;
};

function prepareDiminutiveStemForAttachment(word: string) {
    return String(word || '').replace(/jj/g, 'j').replace(/ww/g, 'w');
}

function getTheoreticalDualPattern(baseForm: string | null | undefined, pluralHint?: string | null, isFeminine = false) {
    if (!baseForm) return '-';
    if (isFeminine) return '-tejn';
    return generateTheoreticalDual(baseForm, pluralHint).endsWith('ajn') ? '-ajn' : '-ejn';
}

function buildDiminutivePlural(word: string) {
    return generateDiminutiveSoundPlural(word);
}

function buildFeminineDiminutivePlural(word: string) {
    return generateFeminineDiminutiveSoundPlural(word);
}

function getNormalizedPluralRows(entry: Entry, morphology: NonNullable<Entry['noun_morphology']>) {
    return compactPluralRows(normalizePluralFormRows(
        morphology.plural_forms,
        morphology.form_plural_pattern || entry.form_plural_pattern || morphology.plural_pattern || entry.plural_pattern || morphology.morph_pattern || entry.morph_pattern || null,
    )).filter(row => row.form || row.pattern);
}

function getDiminutiveRows(
    entry: Entry,
    morphology?: {
        diminutives?: Array<{ form?: string; pattern?: string | null }>;
        diminutive?: string | null;
        diminutive_pattern?: string | null;
        form_masc_pattern?: string | null;
        form_fem_pattern?: string | null;
        lemma_pattern?: string | null;
        cv_pattern?: string | null;
    },
    rootConsonants?: string | null,
    basePattern?: string | null,
): DiminutiveDisplayRow[] {
    const rows = morphology?.diminutives?.length ? morphology.diminutives : entry.diminutives || [];
    const normalizedRows = rows
        .map((row) => ({
            form: String(row?.form || '').trim(),
            pattern: String(row?.pattern || '').trim() || null,
            theoretical: false,
        }))
        .filter((row) => row.form);

    if (normalizedRows.length > 0) return normalizedRows;

    const rootValue = rootConsonants || entry.root_pattern_form?.root?.consonants || entry.root_pattern_form?.root?.consonant_array?.join('-') || (entry as any).root_consonants || null;
    const patternHint = morphology?.diminutive_pattern || entry.diminutive_pattern || null;
    const basePatternHint = basePattern || morphology?.form_masc_pattern || morphology?.form_fem_pattern || morphology?.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null;

    const generatedMasculine = generateDiminutiveForm(
        entry.headword,
        rootValue,
        patternHint,
        { basePattern: basePatternHint, gender: 'masculine' },
    );
    const generatedFeminine = generateDiminutiveForm(
        entry.headword,
        rootValue,
        patternHint,
        { basePattern: basePatternHint, gender: 'feminine' },
    );

    if (generatedMasculine && generatedFeminine && generatedMasculine.form !== generatedFeminine.form) {
        return [
            {
                form: generatedMasculine.form,
                pattern: generatedMasculine.pattern,
                theoretical: generatedMasculine.theoretical,
                gender: 'masculine',
            },
            {
                form: generatedFeminine.form,
                pattern: generatedFeminine.pattern,
                theoretical: generatedFeminine.theoretical,
                gender: 'feminine',
            },
        ];
    }

    const generated = generateDiminutiveForm(
        entry.headword,
        rootValue,
        patternHint,
        { basePattern: basePatternHint },
    );

    return generated ? [{
        form: generated.form,
        pattern: generated.pattern,
        theoretical: generated.theoretical,
    }] : [];
}

function NounParadigmCellView({
    cell,
    displayPattern,
}: {
    cell: NounParadigmCell;
    displayPattern: (pattern?: string) => string;
}) {
    if (cell.stacked && cell.stacked.length > 0) {
        return (
            <div className="leading-tight space-y-2">
                {cell.stacked.map((item, index) => {
                    const hasValue = !!(item.value && item.value !== '-');
                    return (
                        <div key={`${item.value}-${index}`} className="leading-tight">
                            {hasValue ? (
                                <>
                                    <div className="font-serif font-medium text-black">
                                        <MarkedValue val={item.value || '-'} theoretical={item.theoretical} />
                                    </div>
                                    {item.pattern && (
                                        <div className="mt-0.5 text-[11px] font-sans tracking-tight text-black/40">
                                            {displayPattern(item.pattern)}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="text-black/30">-</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    const hasValue = !!(cell.value && cell.value !== '-');

    return (
        <div className="leading-tight">
            {hasValue ? (
                <>
                    <div className="font-serif font-medium text-black">
                        <MarkedValue val={cell.value || '-'} theoretical={cell.theoretical} />
                    </div>
                    {cell.pattern && (
                        <div className="mt-0.5 text-[11px] font-sans tracking-tight text-black/40">
                            {displayPattern(cell.pattern)}
                        </div>
                    )}
                </>
            ) : (
                <span className="text-black/30">-</span>
            )}
        </div>
    );
}

function NounParadigmTable({
    title,
    rows,
    displayPattern,
}: {
    title: string;
    rows: Array<NounParadigmRow>;
    displayPattern: (pattern?: string) => string;
}) {
    const { term } = useLinguisticMode();
    const sectionRows = rows.filter((row): row is SectionRow => 'kind' in row);
    const dataRows = rows.filter((row): row is NounParadigmDataRow => !('kind' in row));
    const showPluralColumn = dataRows.some(row => !!row.plural.value || (row.plural.stacked?.length ?? 0) > 0);
    const hasRows = dataRows.some(row => (
        row.singular.value || row.dual.value || row.plural.value || (row.plural.stacked?.length ?? 0) > 0
    ));
    const formHeader = term('form') || 'Form';
    const baseLabel = term('tag-base') || 'Base';
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        sectionRows.forEach((row) => {
            initial[row.id] = row.defaultOpen ?? false;
        });
        return initial;
    });

    useEffect(() => {
        setOpenSections((prev) => {
            const next = { ...prev };
            let changed = false;
            sectionRows.forEach((row) => {
                if (!(row.id in next)) {
                    next[row.id] = row.defaultOpen ?? false;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [rows]);

    const toggleSection = (id: string) => {
        setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const renderedRows: React.ReactNode[] = [];
    const sectionStack: Array<{ id: string; depth: number; open: boolean }> = [];

    rows.forEach((row, idx) => {
        if ('kind' in row) {
            const depth = row.depth ?? 0;
            while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].depth >= depth) {
                sectionStack.pop();
            }
            const ancestorsOpen = sectionStack.every((section) => section.open);
            const isOpen = openSections[row.id] ?? row.defaultOpen ?? false;
            sectionStack.push({ id: row.id, depth, open: isOpen });
            if (!ancestorsOpen) return;

            renderedRows.push(
                <tr key={`section-${row.id}-${idx}`} className="border-b border-black/4 bg-black/[0.02]">
                    <td colSpan={showPluralColumn ? 4 : 3} className={`py-2 ${depth > 0 ? 'pl-6' : 'pl-3'} pr-3`}>
                        <button
                            type="button"
                            onClick={() => toggleSection(row.id)}
                            className="flex w-full items-center justify-between gap-3 text-left font-sans uppercase tracking-[0.14em] text-black/60 text-[10px] hover:text-black/80 transition-colors"
                            aria-expanded={isOpen}
                        >
                            <span>{row.label}</span>
                            {isOpen ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
                        </button>
                    </td>
                </tr>,
            );
            return;
        }

        const ancestorsOpen = sectionStack.every((section) => section.open);
        if (!ancestorsOpen) return;

        const rowPath = sectionStack.map((section) => section.id).join('>');
        renderedRows.push(
            <tr key={`${rowPath}|${row.label}|${idx}`} className="border-b border-black/4">
                <td className="py-1.5 pr-2 align-top text-black/40 text-xs font-sans w-24">
                    {row.label.trim() || (idx === 0 ? baseLabel : '')}
                </td>
                <td className="py-1.5 pr-2 align-top font-serif font-normal text-black">
                    <NounParadigmCellView cell={row.singular} displayPattern={displayPattern} />
                </td>
                <td className="py-1.5 pr-2 align-top font-serif font-normal text-black">
                    <NounParadigmCellView cell={row.dual} displayPattern={displayPattern} />
                </td>
                {showPluralColumn && (
                    <td className="py-1.5 align-top font-serif font-normal text-black">
                        <NounParadigmCellView cell={row.plural} displayPattern={displayPattern} />
                    </td>
                )}
            </tr>,
        );
    });

    if (!hasRows) return null;

    return (
        <div className="w-full">
            <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                {title}
            </h2>
            <div className="pb-4">
                <table className="w-full table-fixed text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                            <th className="text-left font-semibold text-black pb-2 pr-2 w-24">{formHeader}</th>
                            <th className="text-left font-semibold text-black pb-2 pr-2">Singular</th>
                            <th className="text-left font-semibold text-black pb-2 pr-2">Dual</th>
                            {showPluralColumn && <th className="text-left font-semibold text-black pb-2">Plural</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {renderedRows}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function NounMorphologySection({
    entry,
    morphology,
    rootConsonants,
    displayPattern,
}: {
    entry: Entry;
    morphology: NonNullable<Entry['noun_morphology']>;
    rootConsonants?: string | null;
    displayPattern: (pattern?: string) => string;
}) {
    const { term } = useLinguisticMode();

    const singular = (value?: string | null) => (value && value.trim()) || null;
    const primaryVariant: NounGenderVariant = morphology.gender === 'feminine' ? 'feminine' : 'masculine';
    const oppositeVariant: NounGenderVariant = primaryVariant === 'masculine' ? 'feminine' : 'masculine';

    const pluralRows = getNormalizedPluralRows(entry, morphology);
    const pluralForms = pluralRows.map(row => row.form);
    const soundPlural = singular(morphology.sound_plural || null);
    const pluralHint = pluralForms[0] || soundPlural || null;
    const diminutiveBasePattern = singular(morphology.form_masc_pattern || morphology.form_fem_pattern || morphology.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null);
    const diminutiveRows = getDiminutiveRows(entry, morphology, rootConsonants, diminutiveBasePattern);
    const dual = singular(morphology.dual || entry.dual_form || null);

    const explicitVariantForms: Record<NounGenderVariant, string | null> = {
        masculine: singular(morphology.masculine || entry.form_masc || null),
        feminine: singular(morphology.feminine || entry.form_fem || null),
    };

    const displayVariantForms: Record<NounGenderVariant, string | null> = {
        masculine: primaryVariant === 'masculine'
            ? singular(entry.headword)
            : explicitVariantForms.masculine,
        feminine: primaryVariant === 'feminine'
            ? singular(entry.headword)
            : explicitVariantForms.feminine,
    };

    const variantPatterns: Record<NounGenderVariant, string | null> = {
        masculine: singular(morphology.form_masc_pattern || entry.form_masc_pattern || morphology.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null),
        feminine: singular(morphology.form_fem_pattern || entry.form_fem_pattern || morphology.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null),
    };

    const hasOppositeGender = !!(
        explicitVariantForms.masculine &&
        explicitVariantForms.feminine &&
        explicitVariantForms.masculine !== explicitVariantForms.feminine
    );
    const variantOrder: NounGenderVariant[] = hasOppositeGender
        ? [primaryVariant, oppositeVariant]
        : [primaryVariant];
    const morphologyTitle = term('morphology') || 'Morphology';
    const makeSectionRow = (id: string, label: string, depth = 0, defaultOpen = false): SectionRow => ({ kind: 'section', id, label, depth, defaultOpen });
    const renderVariantLabel = (variant: NounGenderVariant) => term(variant) || (variant === 'masculine' ? 'Masculine' : 'Feminine');

    const buildDiminutiveTableRow = (
        rowsForTable: DiminutiveDisplayRow[],
        variant: NounGenderVariant,
        allRows: DiminutiveDisplayRow[],
    ): NounParadigmDataRow[] => {
        if (rowsForTable.length === 0) return [];
        const primaryRow = rowsForTable[0];
        const masculineRow = allRows.find((row) => row.gender === 'masculine') || rowsForTable.find((row) => row.gender === 'masculine') || primaryRow;
        const feminineRow = allRows.find((row) => row.gender === 'feminine') || rowsForTable.find((row) => row.gender === 'feminine') || primaryRow;
        const singularValue = rowsForTable.length > 1 ? (
            <div className="space-y-1">
                {rowsForTable.map((row, index) => (
                    <div key={`${row.gender || 'x'}-${row.form}-${index}`} className="leading-tight">
                        <div>{row.form}</div>
                    </div>
                ))}
            </div>
        ) : primaryRow.form;
        const primaryPattern = primaryRow.pattern || diminutiveBasePattern || null;
        return [{
            label: '',
            singular: {
                value: singularValue,
                pattern: primaryPattern,
                theoretical: !!primaryRow.theoretical,
                stacked: rowsForTable.length > 1 ? rowsForTable.map((row) => ({
                    value: row.form,
                    pattern: row.pattern || primaryPattern,
                    theoretical: !!row.theoretical,
                })) : undefined,
            },
            dual: {
                value: variant === 'feminine'
                    ? generateFeminineDualFromMasculineWithHint(masculineRow.form, pluralHint)
                    : generateTheoreticalDual(prepareDiminutiveStemForAttachment(primaryRow.form), pluralHint),
                pattern: singular(morphology.dual_pattern || entry.dual_pattern || null) || getTheoreticalDualPattern(primaryRow.form, pluralHint, variant === 'feminine'),
                theoretical: true,
            },
            plural: {
                value: variant === 'feminine'
                    ? buildFeminineDiminutivePlural(feminineRow.form)
                    : buildDiminutivePlural(primaryRow.form),
                pattern: variant === 'feminine'
                    ? (buildFeminineDiminutivePlural(feminineRow.form).endsWith('at') ? '-at' : '-iet')
                    : '-in',
                theoretical: true,
            },
        }];
    };

    const buildRows = (variant: NounGenderVariant): NounParadigmDataRow[] => {
        const baseForm = displayVariantForms[variant] || displayVariantForms[primaryVariant] || singular(entry.headword);
        const basePattern = variantPatterns[variant] || morphology.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null;
        const pluralRows = getNormalizedPluralRows(entry, morphology);
        const pluralPattern = singular(morphology.form_plural_pattern || entry.form_plural_pattern || morphology.plural_pattern || entry.plural_pattern || morphology.morph_pattern || entry.morph_pattern || null);
        const soundPluralPattern = singular(morphology.sound_suffix || entry.sound_suffix || null);
        const dualPattern = singular(morphology.dual_pattern || entry.dual_pattern || null);
        const basePlural = pluralForms[0] || soundPlural || null;
        const masculineSource = displayVariantForms.masculine || explicitVariantForms.masculine || singular(entry.headword) || '';
        const stackedPluralForms = pluralRows.length > 0
            ? pluralRows.map(row => ({
                value: row.form,
                pattern: row.pattern || pluralPattern,
                theoretical: false,
            }))
            : (basePlural ? [{
                value: basePlural,
                pattern: pluralPattern || soundPluralPattern,
                theoretical: false,
            }] : []);

        return [
            {
                label: term('tag-base') || 'Base',
                singular: {
                    value: baseForm,
                    pattern: basePattern,
                },
                dual: {
                    value: (() => {
                        if (!baseForm) return null;
                        if (variant === 'feminine' && hasOppositeGender && masculineSource) {
                            return generateFeminineDualFromMasculineWithHint(masculineSource, pluralHint);
                        }
                        if (variant === primaryVariant && dual) {
                            return dual;
                        }
                        return generateTheoreticalDual(baseForm, pluralHint);
                    })(),
                    pattern: dualPattern,
                    theoretical: !(variant === primaryVariant && !!dual) || (variant === 'feminine' && hasOppositeGender && !!masculineSource),
                },
                plural: {
                    value: basePlural,
                    pattern: pluralForms[0] ? pluralPattern : soundPluralPattern,
                    stacked: stackedPluralForms,
                },
            },
        ];
    };

    const buildCompactRows = (variant: NounGenderVariant): MorphologyDisplayRow[] => {
        const baseForm = displayVariantForms[variant] || displayVariantForms[primaryVariant] || singular(entry.headword);
        const basePattern = variantPatterns[variant] || morphology.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null;
        const pluralRows = getNormalizedPluralRows(entry, morphology);
        const pluralPattern = singular(morphology.form_plural_pattern || entry.form_plural_pattern || morphology.plural_pattern || entry.plural_pattern || morphology.morph_pattern || entry.morph_pattern || null);
        const soundPluralPattern = singular(morphology.sound_suffix || entry.sound_suffix || null);
        const dualPattern = singular(morphology.dual_pattern || entry.dual_pattern || null);
        const basePlural = pluralForms[0] || soundPlural || null;
        const masculineSource = displayVariantForms.masculine || explicitVariantForms.masculine || singular(entry.headword) || '';

        return [
            {
                label: term('tag-base') || 'Base',
                value: baseForm,
                pattern: basePattern,
            },
            {
                label: term('dual') || 'Dual',
                value: (() => {
                    if (!baseForm) return null;
                    if (variant === 'feminine' && hasOppositeGender && masculineSource) {
                        return generateFeminineDualFromMasculineWithHint(masculineSource, pluralHint);
                    }
                    if (variant === primaryVariant && dual) {
                        return dual;
                    }
                    return generateTheoreticalDual(baseForm, pluralHint);
                })(),
                pattern: dualPattern || getTheoreticalDualPattern(baseForm, pluralHint, variant === 'feminine'),
                theoretical: !(variant === primaryVariant && !!dual) || (variant === 'feminine' && hasOppositeGender && !!masculineSource),
            },
            {
                label: term('plural') || 'Plural',
                value: pluralRows.length > 0 ? (
                    <div className="space-y-1">
                        {pluralRows.map((row, index) => (
                            <div key={`${row.form}-${index}`} className="leading-tight">
                                <MarkedValue val={row.form} />
                            </div>
                        ))}
                    </div>
                ) : basePlural,
                pattern: pluralForms[0] ? pluralPattern : soundPluralPattern,
            },
        ];
    };

    const buildCompactDiminutiveRows = (
        rowsForTable: DiminutiveDisplayRow[],
        variant: NounGenderVariant,
        allRows: DiminutiveDisplayRow[],
    ): MorphologyDisplayRow[] => {
        if (rowsForTable.length === 0) return [];
        const primaryRow = rowsForTable[0];
        const masculineRow = allRows.find((row) => row.gender === 'masculine') || rowsForTable.find((row) => row.gender === 'masculine') || primaryRow;
        const feminineRow = allRows.find((row) => row.gender === 'feminine') || rowsForTable.find((row) => row.gender === 'feminine') || primaryRow;
        const singularValue = rowsForTable.length > 1 ? (
            <div className="space-y-1">
                {rowsForTable.map((row, index) => (
                    <div key={`${row.gender || 'x'}-${row.form}-${index}`} className="leading-tight">
                        <div>{row.form}</div>
                    </div>
                ))}
            </div>
        ) : primaryRow.form;
        const primaryPattern = primaryRow.pattern || diminutiveBasePattern || null;

        return [
            {
                label: term('tag-base') || 'Base',
                value: singularValue,
                pattern: primaryPattern,
                theoretical: !!primaryRow.theoretical,
            },
            {
                label: term('dual') || 'Dual',
                value: variant === 'feminine'
                    ? generateFeminineDualFromMasculineWithHint(masculineRow.form, pluralHint)
                    : generateTheoreticalDual(prepareDiminutiveStemForAttachment(primaryRow.form), pluralHint),
                pattern: singular(morphology.dual_pattern || entry.dual_pattern || null) || getTheoreticalDualPattern(primaryRow.form, pluralHint, variant === 'feminine'),
                theoretical: true,
            },
            {
                label: term('plural') || 'Plural',
                value: variant === 'feminine'
                    ? buildFeminineDiminutivePlural(feminineRow.form)
                    : buildDiminutivePlural(primaryRow.form),
                pattern: variant === 'feminine'
                    ? (buildFeminineDiminutivePlural(feminineRow.form).endsWith('at') ? '-at' : '-iet')
                    : '-in',
                theoretical: true,
            },
        ];
    };

    const combinedRows: Array<SectionRow | NounParadigmDataRow> = [];
    variantOrder.forEach((variant) => {
        combinedRows.push(makeSectionRow(`noun-${variant}`, renderVariantLabel(variant), 0, true));
        combinedRows.push(...buildRows(variant));
    });

    if (diminutiveRows.length > 0) {
        combinedRows.push(makeSectionRow('noun-diminutive', term('diminutive') || 'Diminutive'));
        const diminutiveVariants: NounGenderVariant[] = diminutiveRows.some(row => !!row.gender)
            ? (['masculine', 'feminine'] as const)
            : [primaryVariant];

        diminutiveVariants.forEach((variant) => {
            const variantDiminutives = diminutiveRows.filter(row => !row.gender || row.gender === variant);
            if (variantDiminutives.length > 0) {
                if (diminutiveRows.some(row => !!row.gender)) {
                    combinedRows.push(makeSectionRow(`noun-diminutive-${variant}`, renderVariantLabel(variant), 1, true));
                }
                combinedRows.push(...buildDiminutiveTableRow(variantDiminutives, variant, diminutiveRows));
            }
        });
    }

    const singleVariantRows = variantOrder.length === 1 ? (() => {
        const rows: Array<SectionRow | MorphologyDisplayRow> = [];
        rows.push(...buildCompactRows(primaryVariant));

        if (diminutiveRows.length > 0) {
            rows.push(makeSectionRow('noun-diminutive', term('diminutive') || 'Diminutive'));
            const diminutiveVariants: NounGenderVariant[] = diminutiveRows.some(row => !!row.gender)
                ? (['masculine', 'feminine'] as const)
                : [primaryVariant];

            diminutiveVariants.forEach((variant) => {
                const variantDiminutives = diminutiveRows.filter(row => !row.gender || row.gender === variant);
                if (variantDiminutives.length > 0) {
                    if (diminutiveRows.some(row => !!row.gender)) {
                        rows.push(makeSectionRow(`noun-diminutive-${variant}`, renderVariantLabel(variant), 1, true));
                    }
                    rows.push(...buildCompactDiminutiveRows(variantDiminutives, variant, diminutiveRows));
                }
            });
        }

        return rows;
    })() : null;

    return (
        <div className="flex flex-col space-y-12">
            {variantOrder.length > 1 ? (
                <NounParadigmTable
                    title={morphologyTitle}
                    rows={combinedRows}
                    displayPattern={displayPattern}
                />
            ) : (
                <MorphologyTable
                    title={morphologyTitle}
                    rows={singleVariantRows || []}
                    displayPattern={displayPattern}
                    labelHeader={term('form') || 'Form'}
                />
            )}
        </div>
    );
}

function AdjectiveMorphologySection({
    entry,
    morphology,
    elative,
    rootConsonants,
    displayPattern,
}: {
    entry: Entry;
    morphology: NonNullable<Entry['adjective_morphology']>;
    elative: { masculine: string | null; feminine: string | null } | null;
    rootConsonants?: string | null;
    displayPattern: (pattern?: string) => string;
}) {
    const { term } = useLinguisticMode();

    const singular = (value?: string | null) => (value && value.trim()) || null;
    const primaryVariant: NounGenderVariant = morphology.gender === 'feminine' ? 'feminine' : 'masculine';
    const oppositeVariant: NounGenderVariant = primaryVariant === 'masculine' ? 'feminine' : 'masculine';

    const explicitVariantForms: Record<NounGenderVariant, string | null> = {
        masculine: singular(morphology.masculine || (morphology.gender !== 'feminine' ? entry.headword : null)),
        feminine: singular(morphology.feminine || (morphology.gender === 'feminine' ? entry.headword : null)),
    };

    const hasOppositeGender = !!(
        explicitVariantForms.masculine &&
        explicitVariantForms.feminine &&
        explicitVariantForms.masculine !== explicitVariantForms.feminine
    );

    const variantOrder: NounGenderVariant[] = hasOppositeGender
        ? [primaryVariant, oppositeVariant]
        : [primaryVariant];

    const morphologyTitle = term('morphology') || 'Morphology';
    const makeSectionRow = (id: string, label: string, depth = 0, defaultOpen = false): SectionRow => ({ kind: 'section', id, label, depth, defaultOpen });
    const renderVariantLabel = (variant: NounGenderVariant) => term(variant) || (variant === 'masculine' ? 'Masculine' : 'Feminine');

    const pluralPattern = singular(morphology.form_plural_pattern || entry.form_plural_pattern || morphology.morph_pattern || entry.morph_pattern || null);
    const pluralHint = singular(morphology.plural || null);
    const dualPattern = singular(morphology.dual_pattern || entry.dual_pattern || null);
    const attestedElativePattern = singular(morphology.elative_pattern || entry.elative_pattern || morphology.lemma_pattern || entry.lemma_pattern || null);
    const diminutiveBasePatternHint = singular(morphology.form_masc_pattern || morphology.form_fem_pattern || morphology.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null);
    const diminutiveRows = getDiminutiveRows(entry, morphology, rootConsonants, diminutiveBasePatternHint);
    const diminutiveBasePattern = singular(diminutiveRows[0]?.pattern || morphology.diminutive_pattern || entry.diminutive_pattern || null);
    const theoreticalElativePatterns: Record<NounGenderVariant, string> = {
        masculine: 'vCCvC',
        feminine: 'CoCCa',
    };
    const basePattern = (variant: NounGenderVariant) => singular(
        variant === 'masculine'
            ? (morphology.form_masc_pattern || entry.form_masc_pattern || morphology.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null)
            : (morphology.form_fem_pattern || entry.form_fem_pattern || morphology.lemma_pattern || entry.lemma_pattern || entry.cv_pattern || null)
    );
    const isTheoreticalElative = !morphology.elative;
    const getElativePattern = (variant: NounGenderVariant) => (
        isTheoreticalElative
            ? theoreticalElativePatterns[variant]
            : attestedElativePattern
    );

    const buildRows = (variant: NounGenderVariant): Array<{ label: string; value: React.ReactNode; show?: boolean; theoretical?: boolean; extra?: React.ReactNode; pattern?: string | null }> => {
        const baseForm = explicitVariantForms[variant] || explicitVariantForms[primaryVariant] || singular(entry.headword);
        const elativeForm = variant === 'masculine' ? elative?.masculine : elative?.feminine;

        return [
            {
                label: term('tag-base') || 'Base',
                value: baseForm,
                pattern: basePattern(variant),
            },
            {
                label: term('dual') || 'Dual',
                value: (() => {
                    if (variant === 'feminine' && hasOppositeGender && explicitVariantForms.masculine) {
                        return generateFeminineDualFromMasculineWithHint(
                            explicitVariantForms.masculine,
                            pluralHint,
                        );
                    }
                    return singular(entry.dual_form || null) || (baseForm ? generateTheoreticalDual(baseForm, pluralHint) : null);
                })(),
                theoretical: variant === 'feminine' && hasOppositeGender ? true : !singular(entry.dual_form || null),
                pattern: dualPattern,
            },
            {
                label: term('plural') || 'Plural',
                value: singular(morphology.plural),
                pattern: pluralPattern,
            },
            {
                label: term('elative') || 'Elative',
                value: elativeForm,
                show: !!elativeForm,
                theoretical: isTheoreticalElative,
                pattern: getElativePattern(variant),
            },
        ];
    };

    const buildDiminutiveTableRow = (
        rowsForTable: DiminutiveDisplayRow[],
        variant: NounGenderVariant,
        allRows: DiminutiveDisplayRow[],
    ): Array<{ label: string; value: React.ReactNode; show?: boolean; theoretical?: boolean; extra?: React.ReactNode; pattern?: string | null }> => {
        if (rowsForTable.length === 0) return [];
        const primaryRow = rowsForTable[0];
        const masculineRow = allRows.find((row) => row.gender === 'masculine') || rowsForTable.find((row) => row.gender === 'masculine') || primaryRow;
        const feminineRow = allRows.find((row) => row.gender === 'feminine') || rowsForTable.find((row) => row.gender === 'feminine') || primaryRow;
        const singularValue = rowsForTable.length > 1 ? (
            <div className="space-y-1">
                {rowsForTable.map((row, index) => (
                    <div key={`${row.gender || 'x'}-${row.form}-${index}`} className="leading-tight">
                        <div>{row.form}</div>
                    </div>
                ))}
            </div>
        ) : primaryRow.form;
        const primaryPattern = primaryRow.pattern || diminutiveBasePattern || null;
        return [{
            label: term('tag-base') || 'Base',
            value: singularValue,
            pattern: primaryPattern,
            theoretical: !!primaryRow.theoretical,
        }, {
            label: term('dual') || 'Dual',
            value: variant === 'feminine'
                ? generateFeminineDualFromMasculineWithHint(masculineRow.form, pluralHint)
                : generateTheoreticalDual(prepareDiminutiveStemForAttachment(primaryRow.form), pluralHint),
            pattern: singular(morphology.dual_pattern || entry.dual_pattern || null) || getTheoreticalDualPattern(primaryRow.form, pluralHint, variant === 'feminine'),
            theoretical: true,
        }, {
            label: term('plural') || 'Plural',
            value: variant === 'feminine'
                ? buildFeminineDiminutivePlural(feminineRow.form)
                : buildDiminutivePlural(primaryRow.form),
            pattern: variant === 'feminine'
                ? (buildFeminineDiminutivePlural(feminineRow.form).endsWith('at') ? '-at' : '-iet')
                : '-in',
            theoretical: true,
        }];
    };

    const combinedRows: Array<SectionRow | { label: string; value: React.ReactNode; show?: boolean; theoretical?: boolean; extra?: React.ReactNode; pattern?: string | null }> = [];
    variantOrder.forEach((variant) => {
        combinedRows.push(makeSectionRow(`adj-${variant}`, renderVariantLabel(variant), 0, true));
        combinedRows.push(...buildRows(variant));
    });

    if (diminutiveRows.length > 0) {
        combinedRows.push(makeSectionRow('adj-diminutive', term('diminutive') || 'Diminutive'));
        const diminutiveVariants: NounGenderVariant[] = diminutiveRows.some(row => !!row.gender)
            ? (['masculine', 'feminine'] as const)
            : [primaryVariant];

        diminutiveVariants.forEach((variant) => {
            const variantDiminutives = diminutiveRows.filter(row => !row.gender || row.gender === variant);
            if (variantDiminutives.length > 0) {
                if (diminutiveRows.some(row => !!row.gender)) {
                    combinedRows.push(makeSectionRow(`adj-diminutive-${variant}`, renderVariantLabel(variant), 1, true));
                }
                combinedRows.push(...buildDiminutiveTableRow(variantDiminutives, variant, diminutiveRows));
            }
        });
    }

    return (
        <div className="flex flex-col space-y-12">
            <MorphologyTable
                title={morphologyTitle}
                labelHeader={term('form') || 'Form'}
                displayPattern={displayPattern}
                rows={combinedRows}
            />
        </div>
    );
}

function VowelSetGrid({ morphology }: { morphology: any }) {
    const { t } = useLanguage();
    if (!morphology) return null;

    const fields = [
        { key: 'vowel_set_sg', label: 'SINGULAR' },
        { key: 'vowel_set_opp', label: morphology.gender === 'masculine' ? 'FEMININE' : 'MASCULINE' },
        { key: 'vowel_set_dual', label: 'DUAL' },
        { key: 'vowel_set_pl', label: 'PLURAL' }
    ];

    const active = fields.filter(f => morphology[f.key]);
    if (active.length === 0) return null;

    return (
        <PropRow label={t('Vowel Set', 'Sett ta\' Vokali')}>
            <div className="grid grid-cols-1 gap-x-2 gap-y-1 mt-0.5">
                {active.map(f => (
                    <div key={f.key} className="flex items-center text-[13px]">
                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter pr-1 shrink-0">{f.label}:</span>
                        <span className="font-mono font-regular" style={{ color: 'black' }}>{morphology[f.key]}</span>
                    </div>
                ))}
            </div>
        </PropRow>
    );
}

function UsageExampleBlock({ entry }: { entry: Entry }) {
    const { term } = useLinguisticMode();

    const primaryMaltese = (entry.usage_example || '').trim();
    const primaryEnglish = (entry.usage_example_en || '').trim();
    const fallbackExample = entry.definitions?.[0]?.example_sentences?.[0];
    const fallbackMaltese = (fallbackExample?.maltese || '').trim();
    const fallbackEnglish = (fallbackExample?.english || '').trim();

    const malteseText = primaryMaltese || fallbackMaltese;
    const englishText = primaryEnglish || fallbackEnglish;

    if (!malteseText && !englishText) return null;

    return (
        <div className="w-full">
            <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">
                {term('usage-example')}
            </h2>
            {malteseText && (
                <p className="font-serif flex flex-col sm:flex-row gap-8 sm:gap-16 text-m mt-3 items-center md:items-start text-center md:text-left">
                    {malteseText}
                </p>
            )}
            {englishText && (
                <p className="font-serif italic text-black/55 text-m md:items-start leading-tight text-center md:text-left mt-1">
                    {englishText}
                </p>
            )}
        </div>
    );
}

function RelatedGlossRow({
    item,
    language,
    mode,
    isAdmin,
    onEdit,
    onDelete,
}: {
    item: { id: string; headword: string; gloss_en?: string; gloss_mt?: string };
    language: 'en' | 'mt';
    mode: 'standard' | 'arabised';
    isAdmin?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    const gloss = getGloss(item, language, mode).trim();

    if (!item?.id || !item?.headword) return null;

    return (
        <div className="group flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <Link to={`/entry/${item.id}`} style={{ color: BLUE }} className="block text-sm font-serif hover:underline">
                {item.headword}
            </Link>
            {gloss && (
                <span className="opacity-55 font-sans text-xs text-black">
                    &quot;{gloss}&quot;
                </span>
            )}
            {isAdmin && (onEdit || onDelete) && (
                <AdminActionButtons onEdit={onEdit} onDelete={onDelete} />
            )}
        </div>
    );
}

function RelatedGlossGroup({
    title,
    items,
    language,
    mode,
    isAdmin,
    onEditItem,
    onDeleteItem,
    wrapperClassName = 'w-full',
}: {
    title: string;
    items: { id: string; headword: string; gloss_en?: string; gloss_mt?: string }[];
    language: 'en' | 'mt';
    mode: 'standard' | 'arabised';
    isAdmin?: boolean;
    onEditItem?: (item: { id: string; headword: string; gloss_en?: string; gloss_mt?: string }) => void;
    onDeleteItem?: (item: { id: string; headword: string; gloss_en?: string; gloss_mt?: string }) => void;
    wrapperClassName?: string;
}) {
    if (!items || items.length === 0) return null;

    return (
        <div className={wrapperClassName}>
            <p className="font-semibold text-black mb-1.5 font-sans">{title}</p>
            <div className="space-y-1.5">
                {items.map(item => (
                    <RelatedGlossRow
                        key={item.id}
                        item={item}
                        language={language}
                        mode={mode}
                        isAdmin={isAdmin}
                        onEdit={onEditItem ? () => onEditItem(item) : undefined}
                        onDelete={onDeleteItem ? () => onDeleteItem(item) : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

export function TagChips({ entry }: { entry: Entry }) {
    const { term } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const isActualAdmin = isAdmin && adminViewEnabled;
    const rawTags = entry.tags || [];
    if (!rawTags.length) return null;

    const chips = rawTags
        .filter(t => !t.includes('THEORETICAL'))
        .filter(t => isActualAdmin || !isHiddenTag(t))
        .map(tag => {
            const isTitle = tag.startsWith('\\');
            const clean = stripTagPrefixes(tag);
            return { raw: tag, rawLabel: clean, label: resolveTagLabel(tag, term), isTitle };
        })
        .filter(c => c.rawLabel && c.rawLabel !== '$');

    if (!chips.length) return null;

    return (
        <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
            {chips
                .filter(c => !c.isTitle)
                .map(c => (
                    <span
                        key={c.raw}
                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/3 text-[11px] font-sans text-black/70 border border-black/5"
                    >
                        {c.label}
                    </span>
                ))}
        </div>
    );
}

function TogglePill<T extends string>({
    options, active, onChange, labels,
}: { options: T[]; active: T; onChange: (v: T) => void; labels?: string[] }) {
    return (
        <div className="inline-flex rounded-md border border-black/10 overflow-hidden text-xs">
            {options.map((opt, i) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`px-3 py-1 transition-colors font-sans ${active === opt
                        ? 'bg-[#1034A6] text-white'
                        : 'bg-white text-[#555] hover:bg-black/5'
                        }`}
                >
                    {labels ? labels[i] : opt}
                </button>
            ))}
        </div>
    );
}

function SuffixStrip({ labels, activeIdx, onToggle, disabledIndices = [] }: {
    labels: string[];
    activeIdx: number | null;
    onToggle: (i: number) => void;
    disabledIndices?: number[];
}) {
    const dis = disabledIndices || [];

    // Split into 4 and 3 for mobile layout
    const firstRow = labels.slice(0, 4);
    const secondRow = labels.slice(4);

    const renderRow = (rowLabels: string[], offset: number, isMobile: boolean = false) => (
        <div className={`${isMobile ? 'flex w-full' : 'inline-flex'} rounded-md border border-black/10 overflow-hidden text-[11px]`}>
            {rowLabels.map((lbl, i) => {
                const actualIdx = i + offset;
                const isDisabled = dis.includes(actualIdx);
                return (
                    <button
                        key={lbl}
                        disabled={isDisabled}
                        onClick={() => onToggle(actualIdx)}
                        className={`px-0.5 py-2 transition-colors font-mono border-r border-black/5 last:border-r-0 flex items-center justify-center text-center ${isMobile ? 'flex-1 h-6' : 'px-1'} ${activeIdx === actualIdx
                            ? 'bg-[#1034A6] text-white border-[#1034A6]'
                            : isDisabled
                                ? 'bg-black/5 text-black/20 cursor-not-allowed'
                                : 'bg-white text-[#555] hover:bg-black/5'
                            }`}
                    >
                        <span className="leading-tight">{lbl}</span>
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row flex-wrap gap-2 w-full md:w-auto">
            {/* Desktop View: Single Row */}
            <div className="hidden md:flex">
                {renderRow(labels, 0)}
            </div>

            {/* Mobile View: Two Rows */}
            <div className="flex md:hidden flex-col items-start gap-1 w-full">
                {renderRow(firstRow, 0, true)}
                {renderRow(secondRow, 4, true)}
            </div>
        </div>
    );
}

function DerivedTermLink({
    label,
    data,
    gloss,
    isAdmin,
    onEdit,
    onDelete
}: {
    label: string;
    data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string };
    gloss?: string;
    isAdmin?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    if (data.value === '-') return null;

    const content = (data.marker === 'plain' && data.entryId) ? (
        <Link to={`/entry/${data.entryId}`} style={{ color: BLUE }} className="font-serif hover:underline">
            {data.value}
        </Link>
    ) : (
        <span className={`font-serif ${data.marker !== 'plain' ? 'opacity-45' : ''} text-black`}>
            {data.marker === 'theoretical' ? '*' : (data.marker === 'auto_generated' ? '✦' : '')}{(data.value || '').trim()}
        </span>
    );

    return (
        <div className="group relative">
            <p className="text-xs text-black/55 mb-1.5 font-sans">{label}</p>
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                {content}
                {gloss && (
                    <span className="opacity-55 font-sans text-xs text-black">
                        &quot;{gloss}&quot;
                    </span>
                )}
                {isAdmin && onEdit && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.preventDefault(); onEdit(); }}
                            className="p-1 rounded hover:bg-black/5 text-black/55 transition-all"
                            title={data.marker === 'plain' ? 'Edit Entry' : 'Add Entry'}
                        >
                            {data.marker === 'plain' ? <Edit2 size={12} /> : <Plus size={12} />}
                        </button>
                        {data.marker === 'plain' && data.entryId && onDelete && (
                            <button
                                onClick={(e) => { e.preventDefault(); onDelete(); }}
                                className="p-1 rounded hover:bg-black/5 text-red-400 hover:text-red-600 transition-all"
                                title="Delete Entry"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function AdminActionButtons({ onEdit, onDelete, isAdd = false }: { onEdit?: () => void, onDelete?: () => void, isAdd?: boolean }) {
    const { term } = useLinguisticMode();
    return (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
                <button
                    onClick={(e) => { e.preventDefault(); onEdit(); }}
                    className="p-1 rounded hover:bg-black/5 text-black/55 transition-all outline-none"
                    title={isAdd ? term('add-entry') : term('edit-entry')}
                >
                    {isAdd ? <Plus size={12} /> : <Edit2 size={12} />}
                </button>
            )}
            {onDelete && (
                <button
                    onClick={(e) => { e.preventDefault(); onDelete(); }}
                    className="p-1 rounded hover:bg-black/5 text-red-400 hover:text-red-600 transition-all outline-none"
                    title={term('remove-relationship') || 'Remove Relationship'}
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
}

function removeRelationshipFromEntry(entry: Entry, targetId: string): Entry {
    const updated = JSON.parse(JSON.stringify(entry)) as Entry;

    // POS-specific morphology arrays
    if (updated.noun_morphology) {
        const m = updated.noun_morphology;
        if (m.related_entries) m.related_entries = m.related_entries.filter((r: any) => r.id !== targetId);
        if (m.synonyms) m.synonyms = m.synonyms.filter((s: any) => s.id !== targetId);
        if (m.antonyms) m.antonyms = m.antonyms.filter((a: any) => a.id !== targetId);
    }
    if (updated.verb_morphology) {
        const m = updated.verb_morphology;
        if (m.related_entries) m.related_entries = m.related_entries.filter((r: any) => r.id !== targetId);
        if (m.synonyms) m.synonyms = m.synonyms.filter((s: any) => s.id !== targetId);
        if (m.antonyms) m.antonyms = m.antonyms.filter((a: any) => a.id !== targetId);
    }
    if (updated.adjective_morphology) {
        const m = updated.adjective_morphology;
        if (m.related_entries) m.related_entries = m.related_entries.filter((r: any) => r.id !== targetId);
        if (m.synonyms) m.synonyms = m.synonyms.filter((s: any) => s.id !== targetId);
        if (m.antonyms) m.antonyms = m.antonyms.filter((a: any) => a.id !== targetId);
    }
    if (updated.numeral_morphology) {
        const m = updated.numeral_morphology;
        if (m.related_entries) m.related_entries = m.related_entries.filter((r: any) => r.id !== targetId);
        if (m.synonyms) m.synonyms = m.synonyms.filter((s: any) => s.id !== targetId);
        if (m.antonyms) m.antonyms = m.antonyms.filter((a: any) => a.id !== targetId);
    }

    // Top-level arrays (fallback or primary for Participle/FunctionWord)
    if (Array.isArray((updated as any).alternative_forms)) {
        (updated as any).alternative_forms = (updated as any).alternative_forms.filter((a: any) => a.id !== targetId);
    }
    if (Array.isArray((updated as any).related_entries)) {
        (updated as any).related_entries = (updated as any).related_entries.filter((r: any) => r.id !== targetId);
    }
    if (Array.isArray((updated as any).synonyms)) {
        (updated as any).synonyms = (updated as any).synonyms.filter((s: any) => s.id !== targetId);
    }
    if (Array.isArray((updated as any).antonyms)) {
        (updated as any).antonyms = (updated as any).antonyms.filter((a: any) => a.id !== targetId);
    }

    return updated;
}

// ── Noun View ──────────────────────────────────────────────────────────────

function NounEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;
    const nm = entry.noun_morphology!;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = nm.related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const isTheoretical = nm.is_inflectable === false || (nm.is_inflectable as any) === 0 || entry.is_inflectable === false || (entry.is_inflectable as any) === 0;
    const pluralRows = getNormalizedPluralRows(entry, nm);
    const trimOrNull = (value?: string | null) => (value && value.trim()) || null;
    const pluralPattern = trimOrNull(nm.form_plural_pattern || entry.form_plural_pattern || nm.plural_pattern || entry.plural_pattern || nm.morph_pattern || entry.morph_pattern || null);
    const soundPluralPattern = trimOrNull(nm.sound_suffix || entry.sound_suffix || null);
    const pluralInflectionRows = pluralRows.filter(row => !!row.form);
    const pluralInflectionRowsWithFallback = pluralInflectionRows.length > 0
        ? pluralInflectionRows
        : ((nm.plural_forms?.[0] || nm.sound_plural)
            ? [{
                form: trimOrNull(nm.plural_forms?.[0] || nm.sound_plural || null) || '',
                pattern: pluralPattern || soundPluralPattern || '',
            }]
            : []);

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;
    const thirdRadical = rootConsonants?.split('-')?.[2] || rootConsonants?.[2] || '';

    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern(pattern?.cv_notation);

    const POSSESSIVE_SUFFIX_KEYS = ['pos-1s', 'pos-2s', 'pos-3ms', 'pos-3fs', 'pos-1p', 'pos-2p', 'pos-3p'];

    const applySuffix = (base: string, idx: number, theoreticalOverride?: boolean, customPattern?: string) => {
        const isT = theoreticalOverride ?? isTheoretical;
        // Use the passed customPattern (for plurals) or the entry's cv_pattern
        const activePattern = customPattern || (entry as any).cv_pattern || (entry.root_pattern_form?.pattern?.cv_notation);
        const result = applyInflectionTableSuffix(
            base,
            idx as any,
            nm.gender === 'feminine' ? 'feminine' : 'masculine',
            activePattern,
            thirdRadical,
        );

        if (result === '-') return { value: '-', theoretical: false };

        const parts = result.split(' / ');
        if (parts.length > 1) {
            return {
                value: <StackedSurface primary={parts[0]} alternates={parts.slice(1)} />,
                theoretical: isT
            };
        }
        return { value: result, theoretical: isT };
    };

    const renderPluralInflection = (idx: number) => {
        if (pluralInflectionRowsWithFallback.length === 0) return '-';

        const resolvedPluralForms = pluralInflectionRowsWithFallback.map(row => applySuffix(
            row.form,
            idx,
            false,
            row.pattern || pluralPattern || soundPluralPattern || undefined,
        ));

        if (resolvedPluralForms.length === 1) return <MarkedValue val={resolvedPluralForms[0]} />;

        return (
            <StackedSurface
                primary={<MarkedValue val={resolvedPluralForms[0]} />}
                alternates={resolvedPluralForms.slice(1).map((value, altIdx) => (
                    <MarkedValue key={`plural-${idx}-${altIdx}`} val={value} />
                ))}
            />
        );
    };

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <SubParts entry={entry} showGender />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="w-full md:w-64 shrink-0 space-y-4 hidden md:block">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <EtymologySentence
                                    prefix={term('from')}
                                    items={buildDisplayEtymologyItems(ety.chain, term)}
                                />
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {nm?.source_citation && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{nm.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-0 w-full">
                        <div className={cn(
                            "flex flex-col gap-8 items-start w-full",
                            !entry.zokk_morphology && "md:flex-row",
                            entry.zokk_morphology && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)_minmax(0,1.38fr)] lg:gap-10 lg:items-start"
                        )}>
                            {/* Properties */}
                            <div className={cn(
                                "w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mb-12 md:mb-0",
                                entry.zokk_morphology ? "mx-0" : "mx-auto"
                            )}>
                                {rootConsonants && !entry.zokk_morphology && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}

                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}

                                <PropRow label={term('gender')}>
                                    <span className="capitalize">{term(nm.gender)}</span>
                                </PropRow>

                                <VowelSetGrid morphology={{ ...entry, ...nm }} />
                            </div>

                            {/* Morphology + Inflection Tables */}
                            <div className="flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none space-y-12">
                                <NounMorphologySection
                                    entry={entry}
                                    morphology={nm}
                                    rootConsonants={rootConsonants}
                                    displayPattern={displayPattern}
                                />

                                {/* Inflection Table */}
                                <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                                    {term('inflection-table')}
                                </h2>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto overflow-y-hidden pb-4">
                                    <table className="w-full text-sm border-collapse md:min-w-[500px]">
                                        <thead>
                                            <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                                                <th className="text-left font-semibold text-black pb-2 pr-4 w-32">{term('person')}</th>
                                                <th className="text-left font-semibold text-black pb-2 pr-4">
                                                    {(entry as any).is_collective ? term('collective') : (entry as any).is_singulative ? term('singulative') : term('singular')}
                                                </th>
                                                <th className="text-left font-semibold text-black pb-2">
                                                    {(entry as any).is_collective || (entry as any).is_singulative ? (term('unit-form') || 'Unit Form / Pl.') : term('plural')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {POSSESSIVE_SUFFIX_KEYS.map((key, idx) => {
                                                return (
                                                    <tr key={key} className="border-b border-black/4 whitespace-nowrap">
                                                        <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">
                                                            {term(key)}
                                                        </td>
                                                        <td className="py-1.5 pr-4 font-serif font-normal text-black">
                                                            <MarkedValue val={applySuffix(entry.headword, idx)} />
                                                        </td>
                                                        <td className="py-1.5 font-serif font-normal text-black">
                                                            {renderPluralInflection(idx)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Unspooled View */}
                                <div className="block md:hidden space-y-6">
                                    <div className="w-full overflow-hidden">
                                        <table className="w-full border-collapse table-fixed">
                                            <thead>
                                                <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                                    <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                                    <th className="text-left pb-1">{(entry as any).is_collective ? term('collective') : (entry as any).is_singulative ? term('singulative') : term('singular')}</th>
                                                    <th className="text-right pb-1">{(entry as any).is_collective || (entry as any).is_singulative ? (term('unit-form') || 'Unit Form') : term('plural')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/2">
                                                {POSSESSIVE_SUFFIX_KEYS.map((key, idx) => {
                                                    return (
                                                        <tr key={`mobile-${key}`}>
                                                            <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term(key)}</td>
                                                            <td className="py-2 text-left">
                                                                <MarkedValue val={applySuffix(entry.headword, idx)} />
                                                            </td>
                                                            <td className="py-2 text-right">
                                                                {renderPluralInflection(idx)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Derived Terms, Usage, and Thesaurus regions */}
                                <div className="mt-16 md:mt-12 space-y-16 md:space-y-12">
                                    <UsageExampleBlock entry={entry} />

                                    {((nm.synonyms?.length ?? 0) > 0 || (nm.antonyms?.length ?? 0) > 0) && (
                                        <div className="w-full">
                                            <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                            <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-start text-center md:text-left">
                                                <RelatedGlossGroup
                                                    title={term('synonyms')}
                                                    items={nm.synonyms || []}
                                                    language={language}
                                                    mode={mode}
                                                    isAdmin={isActualAdmin}
                                                    onEditItem={handleEditEntry}
                                                    onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                    wrapperClassName="flex-1 min-w-[220px]"
                                                />
                                                <RelatedGlossGroup
                                                    title={term('antonyms')}
                                                    items={nm.antonyms || []}
                                                    language={language}
                                                    mode={mode}
                                                    isAdmin={isActualAdmin}
                                                    onEditItem={handleEditEntry}
                                                    onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                    wrapperClassName="flex-1 min-w-[220px]"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                        <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                            {ety && ety.chain.length > 0 && (
                                <SideCard title={term('etymology')}>
                                    <EtymologySentence
                                        prefix={term('from')}
                                        items={buildDisplayEtymologyItems(ety.chain, term)}
                                    />
                                </SideCard>
                            )}

                            {alternativeForms.length > 0 && (
                                <SideCard title={term('alternative-forms')}>
                                    <div className="space-y-1">
                                        {alternativeForms.map((alt: any) => (
                                            <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {nm?.source_citation && (
                                <SideCard title={term('sources')}>
                                    <span className="text-sm font-medium" style={{ color: GOLD }}>{nm.source_citation}</span>
                                </SideCard>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

// ── Verb View ──────────────────────────────────────────────────────────────

function VerbEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;

    const vm = entry.verb_morphology!;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = vm.related_entries || (entry as any).related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || entry.zokk_morphology?.root;
    const pattern = entry.root_pattern_form?.pattern;

    // State
    const [polarity, setPolarity] = useState<'Positive' | 'Negative'>('Positive');
    const [doIdx, setDoIdx] = useState<number | null>(null);
    const [ioIdx, setIoIdx] = useState<number | null>(null);

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const isNeg = polarity === 'Negative';
    const isTheoretical = entry.is_inflectable === false || (entry.is_inflectable as any) === 0 || vm.is_inflectable === false || (vm.is_inflectable as any) === 0 || entry.tags?.includes('THEORETICAL') || vm.root_tags?.includes('THEORETICAL');
    // Use new per-tense vowel sets
    const vsetImpf = entry.verb_vowel_impf || vm.vowel_set_imperfect;
    const vsetPerf = entry.verb_vowel_perf || vm.vowel_set_perfect;
    const vsetImp = vm.vowel_set_imperative || 'o-o';
    const stemDefaults = entry.zokk_morphology ? resolveStemDefaults(entry.zokk_morphology as any) : null;

    // Derive or use stored conjugation
    const conj = useMemo(() => {
        if (vm.conjugation) return vm.conjugation;
        // Auto-generate
        // Auto-generate using either root_pattern_form or zokk_morphology fallback
        const rootStr = entry.root_pattern_form?.root?.consonants || entry.zokk_morphology?.root;

        const rootObj = entry.root_pattern_form?.root;
        if (!rootStr) return null;

        // Resolve morphological defaults if missing (critical for stem-based verbs)
        const stemDefaults = entry.zokk_morphology ? resolveStemDefaults(entry.zokk_morphology as any) : null;


        try {
            return generateConjugation({
                root: rootStr,
                form: vm.form,
                strength: (entry.verb_class as any) || rootObj?.strength || stemDefaults?.strength || 'strong',

                weakClass: (entry.verb_weak_class as any) || rootObj?.weak_class || stemDefaults?.weak_class,
                isImalaBlocked: rootObj?.is_imala_blocked || /[\u0127q]|g\u0127|h/i.test(rootStr),
                vowelSetPerfect: vsetPerf,
                vowelSetImperfect: vsetImpf,
                vowelSetImperative: vsetImp,
            });
        } catch (e) {
            console.error("Conjugation error:", e);
            return null;
        }
    }, [vm, vsetPerf, vsetImpf, vsetImp, entry]);

    // Fetch siblings for accurate theoretical/plain markers
    const { entries: rootEntries } = useRootData(entry.root_pattern_form?.root?.id);
    const derivedRootEntries = useMemo(
        () => (rootEntries.length > 0 ? rootEntries : [entry]),
        [rootEntries, entry]
    );

    // Auto-derive root forms (verbal noun, participles) using the SAME logic as Root.tsx
    const autoDerived = useMemo(() => {
        const rootStr = entry.root_pattern_form?.root?.consonants || entry.zokk_morphology?.root;
        const rootObj = entry.root_pattern_form?.root;
        if (!rootStr || !vm.form) return null;

        // Use root-level primary vowels for auto-derivation matching Root.tsx
        const f1 = derivedRootEntries?.find(e => e.pos === 'verb' && e.verb_morphology?.form === 'I');
        const f1vm = f1?.verb_morphology;
        const pvSet = rootObj?.vowel_set_perf || entry.verb_vowel_perf || f1vm?.vowel_set_perfect || 'a-a';
        const ipvSet = rootObj?.vowel_set_impf || entry.verb_vowel_impf || f1vm?.vowel_set_imperfect || 'i-a';

        try {
            const rawGen = generateRootForms(
                rootStr,
                pvSet,
                ipvSet,
                (rootObj?.strength || f1vm?.verb_class || stemDefaults?.strength || 'strong') as any,
                (rootObj?.weak_class || f1vm?.weak_class || stemDefaults?.weak_class) as any,
                rootObj?.is_imala_blocked || /[\u0127q]|g\u0127|h/i.test(rootStr)
            );
            // Use siblings if available, otherwise just itself
            const attested = getAttestedEntries(derivedRootEntries);
            const markedTable = markGeneratedForms(rawGen, attested);
            return markedTable.find(f => f.form === vm.form);
        } catch (e) {
            console.error("Auto-derivation error:", e);
            return null;
        }
    }, [entry, derivedRootEntries, stemDefaults, vm.form]);

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditDerived = (data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string }, type: 'active' | 'passive' | 'noun') => {
        const rootObj = entry.root_pattern_form?.root;
        const existing = derivedRootEntries?.find(e => e.headword === data.value && (e.verb_morphology?.form === vm.form || e.pos !== 'verb'));

        if (existing) {
            setEditEntry({
                ...existing,
                _rootConsonants: (existing as any).root_consonants || rootObj?.consonants || '',
                _formLabel: existing.verb_morphology?.form || vm.form,
            } as any);
            setInitialFormData(null);
        } else {
            setEditEntry(null);
            setInitialFormData({
                headword: data.value,
                pos: type === 'noun' ? 'noun' : 'participle',
                participle_type: type === 'noun' ? '' : type,
                _formLabel: vm.form,
                _rootConsonants: rootObj?.consonants || '',
            });
        }
        setShowForm(true);
    };

    const getDerivedGloss = (data: { value: string; entryId?: string }) => {
        if (!data.entryId || !derivedRootEntries?.length) return '';
        const linked = derivedRootEntries.find(e => e.id === data.entryId || e.headword === data.value);
        return linked ? getGloss(linked, language, mode).trim() : '';
    };

    // Derived suffix strip labels (vowel-set sensitive)
    const rawDoLabels = getDoLabels(vsetImpf);
    const doLabels = ioIdx !== null ? rawDoLabels.map((lbl, idx) => {
        if (idx === 2) return '-hu-';   // -u -> -hu-
        if (idx === 3) return '-hie-';  // -ha -> -hie-
        if (idx === 6) return '-hom-'; // -hom -> -hom-
        return lbl;
    }) : rawDoLabels;
    const ioLabels = getIoLabels(vsetImpf);



    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern(pattern?.cv_notation);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                {/*<div className="flex items-center gap-2 mb-4">
                    <Link to="/search" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back-to-search')}
                    </Link>
                </div>*/}

                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center">
                        <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                            {isTheoretical && '*'}{entry.headword}
                        </h1>
                        {isActualAdmin && (
                            <button
                                onClick={() => {
                                    setEditEntry({
                                        ...entry,
                                        _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                    } as any);
                                    setShowForm(true);
                                }}
                                className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                title={term('edit-entry')}
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                    </div>
                    <SubParts entry={entry} showGender />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="w-full md:w-64 shrink-0 space-y-4 hidden md:block">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <EtymologySentence
                                    prefix={term('from')}
                                    items={buildDisplayEtymologyItems(ety.chain, term)}
                                />
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {vm.source_citation && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{vm.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-0 w-full">
                        <div className={cn(
                            "flex flex-col gap-8 items-start w-full",
                            "md:flex-row md:items-start"
                        )}>
                            {/* Properties */}
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto mb-12 md:mb-0">
                                {entry.zokk_morphology ? (
                                    <MorphologyProvenanceRows
                                        source={entry.zokk_morphology}
                                        rootDisplayValue={rootConsonants || entry.zokk_morphology?.root || null}
                                        rootHref={rootConsonants ? `/root/${rootConsonants}` : undefined}
                                    />
                                ) : rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => {
                                                return (
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                        {ph.dialect && ( // add this to exclude Standard dialect, && ph.dialect !== 'Standard'
                                                            <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter sm:mb-0">
                                                                {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                            </span>
                                                        )}
                                                        {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </PropRow>
                                )}

                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}
                                <PropRow label={term('transitivity')}>
                                    <span className="capitalize">{term(vm.transitivity || 'both')}</span>
                                </PropRow>

                                <PropRow label={term("vowel-set")} className="col-span-2 sm:col-span-1 md:col-span-1">
                                    <div className="space-y-0 text-sm">
                                        <p>{term('perfect')} <span className="opacity-55 text-[0.7rem]">{term('(past)')}</span>: <span className="font-mono">{vm.vowel_set_perfect}</span></p>
                                        <p>{term('imperfect')} <span className="opacity-55 text-[0.7rem]">{term('(present)')}</span>: <span className="font-mono">{vm.vowel_set_imperfect}</span></p>
                                        <p>{term('imperative')}: <span className="font-mono">{vm.vowel_set_imperative}</span></p>
                                    </div>
                                </PropRow>

                                {/* Admin / Technical Metadata */}
                                {isAdmin && entry.root_pattern_form?.root && (
                                    <div className="pt-0 border-t border-black/5">
                                        <p className="text-[10px] uppercase tracking-widest text-black/30 mb-2 font-bold">{term('internal-metadata')}</p>
                                        <div className="text-[11px] font-mono space-y-1 text-black/50">
                                            <p>{term('strength')}: {entry.verb_class || entry.root_pattern_form.root.strength}</p>
                                            {(entry.verb_weak_class || entry.root_pattern_form.root.weak_class) && <p>{term('weak-class')}: {entry.verb_weak_class || entry.root_pattern_form.root.weak_class}</p>}
                                            <p>{term('imala-blocked')}: {
                                                (entry.root_pattern_form.root.is_imala_blocked ||
                                                    /[\u0127q]|g\u0127|h/i.test(entry.root_pattern_form.root.consonants))
                                                    ? term('yes') : term('no')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conjugation Table */}
                            {conj && (
                                <div className="flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none">
                                    <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                                        {term('conjugation-table')}
                                    </h2>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto overflow-y-hidden pb-4">
                                        <table className="w-full text-sm border-collapse md:min-w-[500px]">
                                            <thead>
                                                <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                                                    <th className="text-left font-semibold text-black pb-2 pr-4 w-32">{term('person')}</th>
                                                    <th className="text-left font-semibold text-black pb-2 pr-4">
                                                        {term('imperfect')} <span className="opacity-55 font-normal text-xs">{term('(present)')}</span>
                                                    </th>
                                                    <th className="text-left font-semibold text-black pb-2">
                                                        {term('perfect')} <span className="opacity-55 font-normal text-xs">{term('(past)')}</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {conj.rows.map(row => (
                                                    <tr key={row.person_mt} className="border-b border-black/4 whitespace-nowrap">
                                                        <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">
                                                            {term(row.person_mt)}
                                                        </td>
                                                        <td className="py-1.5 pr-4 font-serif font-normal text-black">
                                                            <MarkedValue val={buildVerbForm(
                                                                row.imperfect,
                                                                isNeg,
                                                                doIdx,
                                                                ioIdx,
                                                                vsetImpf,
                                                                row.stems,
                                                                conj?.blocksImala || false,
                                                                vm.form
                                                            )} theoretical={isTheoretical} />
                                                        </td>
                                                        <td className="py-1.5 font-serif font-normal text-black">
                                                            <MarkedValue val={buildPerfectForm(
                                                                row.perfect,
                                                                row.perfect_neg ?? row.perfect,
                                                                isNeg,
                                                                doIdx,
                                                                ioIdx,
                                                                vsetPerf,
                                                                row.stems,
                                                                conj?.blocksImala || false,
                                                                vm.form
                                                            )} theoretical={isTheoretical} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm border-t border-black/8 pt-3">
                                            <p className="font-sans font-semibold text-black self-center">{term('imperative')}</p>
                                            <div>
                                                <p className="text-xs text-black/40 mb-0.5">{term('singular')}</p>
                                                <p className="font-serif font-normal text-black">
                                                    {(() => {
                                                        const row = conj.rows[1]; // inti
                                                        const base = isNeg ? row.imperfect : conj.imperative_sg;

                                                        // Prefer engine-provided stems, fallback to basic logic
                                                        const stems = isNeg ? row.stems : (conj.imperative_sg_stems || {
                                                            impfType1: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1'),
                                                            impfType2: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1')
                                                        });

                                                        const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                        const finalVal = isNeg ? result.replace(/^ma /, '') : result;
                                                        return <MarkedValue val={finalVal} theoretical={isTheoretical} />;
                                                    })()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-black/40 mb-0.5">{term('plural')}</p>
                                                <p className="font-serif font-normal text-black">
                                                    {(() => {
                                                        const row = conj.rows[5]; // intom
                                                        const base = isNeg ? row.imperfect : conj.imperative_pl;

                                                        // Prefer engine-provided stems, fallback to basic logic
                                                        const stems = isNeg ? row.stems : (conj.imperative_pl_stems || {
                                                            impfType1: conj.imperative_pl,
                                                            impfType2: conj.imperative_pl
                                                        });

                                                        const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                        const finalVal = isNeg ? result.replace(/^ma /, '') : result;
                                                        return <MarkedValue val={finalVal} theoretical={isTheoretical} />;
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Unspooled View */}
                                    <div className="block md:hidden space-y-6">
                                        {/* Perfect */}
                                        <div>
                                            <h3 className="font-sans font-semibold text-black mb-3">{term('perfect')}</h3>
                                            <div className="w-full overflow-hidden">
                                                <table className="w-full border-collapse table-fixed">
                                                    <thead>
                                                        <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                                            <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                                            <th className="text-right pb-1">{term('conjugation')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/2">
                                                        {conj.rows.map(row => (
                                                            <tr key={`perf-${row.person_mt}`}>
                                                                <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term(row.person_mt)}</td>
                                                                <td className="py-2 font-serif text-black text-right break-all text-sm">
                                                                    {isTheoretical && '*'}{buildPerfectForm(
                                                                        row.perfect,
                                                                        row.perfect_neg ?? row.perfect,
                                                                        isNeg,
                                                                        doIdx,
                                                                        ioIdx,
                                                                        vsetPerf,
                                                                        row.stems,
                                                                        conj?.blocksImala || false,
                                                                        vm.form
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Imperfect */}
                                        <div>
                                            <h3 className="font-sans font-semibold text-black mb-3">{term('imperfect')}</h3>
                                            <div className="w-full overflow-hidden">
                                                <table className="w-full border-collapse table-fixed">
                                                    <thead>
                                                        <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                                            <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                                            <th className="text-right pb-1">{term('conjugation')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/2">
                                                        {conj.rows.map(row => (
                                                            <tr key={`impf-${row.person_mt}`}>
                                                                <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term(row.person_mt)}</td>
                                                                <td className="py-2 font-serif text-black text-right break-all text-sm">
                                                                    {isTheoretical && '*'}{buildVerbForm(
                                                                        row.imperfect,
                                                                        isNeg,
                                                                        doIdx,
                                                                        ioIdx,
                                                                        vsetImpf,
                                                                        row.stems,
                                                                        conj?.blocksImala || false,
                                                                        vm.form
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Imperative */}
                                        <div>
                                            <h3 className="font-sans font-semibold text-black mb-3">{term('imperative')}</h3>
                                            <div className="w-full overflow-hidden">
                                                <table className="w-full border-collapse table-fixed">
                                                    <thead>
                                                        <tr className="border-b border-black/8 font-semibold text-[10px] uppercase tracking-wider text-black/40">
                                                            <th className="text-left pb-1 w-24 sm:w-[130px]">{term('person')}</th>
                                                            <th className="text-right pb-1">{term('conjugation')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-black/2">
                                                        <tr>
                                                            <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term('singular')}</td>
                                                            <td className="py-2 font-serif text-black text-right break-all text-sm">
                                                                {(() => {
                                                                    const row = conj.rows[1];
                                                                    const base = isNeg ? row.imperfect : conj.imperative_sg;
                                                                    const stems = isNeg ? row.stems : (conj.imperative_sg_stems || { impfType1: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1'), impfType2: conj.imperative_sg.replace(/e([^aeiou])$/, 'i$1') });
                                                                    const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                                    return (isTheoretical ? '*' : '') + (isNeg ? result.replace(/^ma /, '') : result);
                                                                })()}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-2 text-black/40 font-sans text-[11px] leading-tight truncate pr-2">{term('plural')}</td>
                                                            <td className="py-2 font-serif text-black text-right break-all text-sm">
                                                                {(() => {
                                                                    const row = conj.rows[5];
                                                                    const base = isNeg ? row.imperfect : conj.imperative_pl;
                                                                    const stems = isNeg ? row.stems : (conj.imperative_pl_stems || { impfType1: conj.imperative_pl, impfType2: conj.imperative_pl });
                                                                    const result = buildVerbForm(base, isNeg, doIdx, ioIdx, isNeg ? vsetImpf : vsetImp, stems, conj?.blocksImala || false, vm.form);
                                                                    return (isTheoretical ? '*' : '') + (isNeg ? result.replace(/^ma /, '') : result);
                                                                })()}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Controls (Polarity & Pronouns) */}
                                    <div className="mt-4 pt-6 border-t border-black/8 space-y-4 w-full max-w-[340px] mx-auto md:max-w-none md:mx-0">
                                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                            <p className="text-xs text-black font-semibold mb-1.5 font-sans">{term('polarity')}</p>
                                            <TogglePill
                                                options={['Positive', 'Negative']}
                                                active={polarity}
                                                labels={[term('positive'), term('negative')]}
                                                onChange={v => setPolarity(v as any)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                                <p className="text-xs text-black font-semibold mb-1.5 font-sans">{term('direct-object')}</p>
                                                <SuffixStrip
                                                    labels={doLabels}
                                                    activeIdx={doIdx}
                                                    disabledIndices={ioIdx !== null ? [0, 1, 4, 5] : []}
                                                    onToggle={idx => setDoIdx(prev => prev === idx ? null : idx)}
                                                />
                                            </div>
                                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                                <p className="text-xs text-black font-semibold mb-1.5 font-sans">{term('indirect-object')}</p>
                                                <SuffixStrip
                                                    labels={ioLabels}
                                                    activeIdx={ioIdx}
                                                    onToggle={idx => {
                                                        const newIoIdx = ioIdx === idx ? null : idx;
                                                        setIoIdx(newIoIdx);
                                                        if (newIoIdx !== null && doIdx !== null && [0, 1, 4, 5].includes(doIdx)) {
                                                            setDoIdx(null);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Derived Terms, Usage, and Thesaurus regions moved here to align with the Conjugation Table pillar */}
                                    <div className="mt-16 md:mt-12 space-y-16 md:space-y-12">
                                        {/* Derived Terms */}
                                        {autoDerived && (autoDerived.imperfect.value !== '-' || autoDerived.imperative.value !== '-' || autoDerived.verbalNoun.value !== '-' || autoDerived.passiveParticiple.value !== '-' || autoDerived.activeParticiple.value !== '-') && (
                                            <div className="w-full">
                                                <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('derived-terms')}</h2>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm mt-3 items-start text-center md:text-left">
                                                    {autoDerived.passiveParticiple.value !== '-' && (
                                                        <DerivedTermLink
                                                            label={term('passive')}
                                                            data={autoDerived.passiveParticiple}
                                                            gloss={getDerivedGloss(autoDerived.passiveParticiple)}
                                                            isAdmin={isActualAdmin}
                                                            onDelete={() => autoDerived!.passiveParticiple.entryId && handleRemoveRelationship(autoDerived!.passiveParticiple.entryId)}
                                                            onEdit={() => handleEditDerived(autoDerived!.passiveParticiple, 'passive')}
                                                        />
                                                    )}
                                                    {autoDerived.activeParticiple.value !== '-' && (
                                                        <DerivedTermLink
                                                            label={term('active')}
                                                            data={autoDerived.activeParticiple}
                                                            gloss={getDerivedGloss(autoDerived.activeParticiple)}
                                                            isAdmin={isActualAdmin}
                                                            onDelete={() => autoDerived!.activeParticiple.entryId && handleRemoveRelationship(autoDerived!.activeParticiple.entryId)}
                                                            onEdit={() => handleEditDerived(autoDerived!.activeParticiple, 'active')}
                                                        />
                                                    )}
                                                    {autoDerived.verbalNoun.value !== '-' && (
                                                        <DerivedTermLink
                                                            label={term('verbal-noun')}
                                                            data={autoDerived.verbalNoun}
                                                            gloss={getDerivedGloss(autoDerived.verbalNoun)}
                                                            isAdmin={isActualAdmin}
                                                            onDelete={() => autoDerived!.verbalNoun.entryId && handleRemoveRelationship(autoDerived!.verbalNoun.entryId)}
                                                            onEdit={() => handleEditDerived(autoDerived!.verbalNoun, 'noun')}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <UsageExampleBlock entry={entry} />

                                        {/* Thesaurus */}
                                        {((vm.synonyms?.length ?? 0) > 0 || (vm.antonyms?.length ?? 0) > 0 || ((entry as any).synonyms?.length ?? 0) > 0 || ((entry as any).antonyms?.length ?? 0) > 0) && (
                                            <div className="w-full">
                                                <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                                <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-start text-center md:text-left">
                                                    <RelatedGlossGroup
                                                        title={term('synonyms')}
                                                        items={vm.synonyms || (entry as any).synonyms || []}
                                                        language={language}
                                                        mode={mode}
                                                        isAdmin={isActualAdmin}
                                                        onEditItem={handleEditEntry}
                                                        onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                        wrapperClassName="flex-1 min-w-[220px]"
                                                    />
                                                    <RelatedGlossGroup
                                                        title={term('antonyms')}
                                                        items={vm.antonyms || (entry as any).antonyms || []}
                                                        language={language}
                                                        mode={mode}
                                                        isAdmin={isActualAdmin}
                                                        onEditItem={handleEditEntry}
                                                        onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                        wrapperClassName="flex-1 min-w-[220px]"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                        <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                            {ety && ety.chain.length > 0 && (
                                <SideCard title={term('etymology')}>
                                    <EtymologySentence
                                        prefix={term('from')}
                                        items={buildDisplayEtymologyItems(ety.chain, term)}
                                    />
                                </SideCard>
                            )}

                            {alternativeForms.length > 0 && (
                                <SideCard title={term('alternative-forms')}>
                                    <div className="space-y-1">
                                        {alternativeForms.map((alt: any) => (
                                            <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {vm.source_citation && (
                                <SideCard title={term('sources')}>
                                    <span className="text-sm font-medium" style={{ color: GOLD }}>{vm.source_citation}</span>
                                </SideCard>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

// ── Zokk View ───────────────────────────────────────────────────────────────

export function ZokkEntryView({
    entry,
    onRefetch,
    headerAccessory,
}: {
    entry: Entry;
    onRefetch?: () => void;
    headerAccessory?: React.ReactNode;
}) {
     const { language } = useLanguage();
     const { term, mode } = useLinguisticMode();
     const { isAdmin, adminViewEnabled } = useAuth();
     const { getToken } = useClerkAuth();

     const [showForm, setShowForm] = useState(false);
     const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
 
    const isActualAdmin = isAdmin && adminViewEnabled;
     const ety = entry.etymologies?.[0];
     const zokkEtymologyItems = useMemo(() => {
         if (ety?.chain?.length) {
             return buildDisplayEtymologyItems(ety.chain, term);
         }

         if (entry.source_language) {
             return [{
                 language: term(entry.source_language),
             }];
         }

         return [];
     }, [ety, entry.source_language, term]);

     const handleRemoveRelationship = async (targetId: string) => {
         if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
         try {
             const token = await getToken();
             const updated = removeRelationshipFromEntry(entry, targetId);
             await adminUpdateEntry(token!, updated as any);
             onRefetch?.();
         } catch (err: any) {
             alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
         }
     };

     const handleEditEntry = (target: { id: string }) => {
         setEditEntry(target as any);
         setShowForm(true);
     };
 
     const bgStyle = {
         background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
         minHeight: '100vh',
     };
 
     return (
         <div style={bgStyle} className="w-full overflow-hidden">
             <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                 {/* Header */}
                 <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                     <div className="relative inline-flex items-center justify-center flex-col gap-1">
                         <div className="relative inline-flex items-center justify-center">
                             <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                 {entry.headword}
                             </h1>
                             {(isActualAdmin || headerAccessory) && (
                                 <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 flex items-center gap-1">
                                     {isActualAdmin && (
                                         <button
                                             onClick={() => {
                                                 setEditEntry({ ...entry } as any);
                                                 setShowForm(true);
                                             }}
                                             className="p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                             title={term('edit-entry')}
                                         >
                                             <Edit2 size={16} />
                                         </button>
                                     )}
                                     {headerAccessory}
                                 </div>
                             )}
                         </div>
                     </div>
                     <SubParts entry={entry} showGender />
                 </div>
 
                 <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                     <div className="w-full md:w-64 shrink-0 space-y-4">
                         <SideCard title={term('gloss')}>
                             <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                 {entry.definitions?.map(def => (
                                     <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                 )) || <li>-</li>}
                             </ol>
                             <TagChips entry={entry} />
                         </SideCard>
 
                        {zokkEtymologyItems.length > 0 && (
                             <SideCard title={term('etymology')}>
                                 <EtymologySentence prefix={term('from')} items={zokkEtymologyItems} />
                             </SideCard>
                         )}
 
                     </div>
 
                    <div className="flex-1 min-w-0 space-y-0 w-full">
                        <div className={cn(
                            "flex flex-col gap-8 items-start w-full",
                            !entry.zokk_morphology && "md:flex-row"
                        )}>
                            <div className={cn(
                                "w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mb-12 md:mb-0",
                                "mx-0"
                            )}>
                                <MorphologyProvenanceRows
                                    source={entry.zokk_morphology}
                                    rootDisplayValue={entry.root_pattern_form?.root?.consonants || entry.zokk_morphology?.root || null}
                                    rootHref={entry.root_pattern_form?.root?.consonants ? `/root/${entry.root_pattern_form.root.consonants}` : undefined}
                                />

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}

                                {isActualAdmin && (
                                    <div className="pt-0 border-t border-black/5 col-span-full">
                                        <p className="text-[10px] uppercase tracking-widest text-black/30 mb-2 font-bold">{term('internal-metadata')}</p>
                                        <div className="text-[11px] font-mono space-y-1 text-black/50">
                                            <p>ID: {entry.id}</p>
                                            <p>Type: Zokk</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="mt-16">
                            <UsageExampleBlock entry={entry} />
                        </div>

                        {/* Thesaurus */}
                        {((entry as any).synonyms?.length || (entry as any).antonyms?.length || (entry as any).related_entries?.length) && (
                            <div className="w-full">
                                <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-start text-center md:text-left">
                                    <RelatedGlossGroup
                                        title={term('synonyms')}
                                        items={(entry as any).synonyms || []}
                                        language={language}
                                        mode={mode}
                                        isAdmin={isActualAdmin}
                                        onEditItem={handleEditEntry}
                                        onDeleteItem={item => handleRemoveRelationship(item.id)}
                                        wrapperClassName="flex-1 min-w-[220px]"
                                    />
                                    <RelatedGlossGroup
                                        title={term('antonyms')}
                                        items={(entry as any).antonyms || []}
                                        language={language}
                                        mode={mode}
                                        isAdmin={isActualAdmin}
                                        onEditItem={handleEditEntry}
                                        onDeleteItem={item => handleRemoveRelationship(item.id)}
                                        wrapperClassName="flex-1 min-w-[220px]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
 
             {showForm && (
                 <EntryFormModal
                     entry={editEntry}
                     onClose={() => { setShowForm(false); setEditEntry(null); }}
                     onSaved={() => {
                         setShowForm(false);
                         setEditEntry(null);
                         onRefetch?.();
                     }}
                     getToken={getToken}
                 />
             )}
         </div>
     );
 }
 
 // ── Numeral View ──────────────────────────────────────────────────────────

function NumeralEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;
    const nm = entry.numeral_morphology || (entry as any).numeral_morphology;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = (entry as any).related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });

    if (!entry) return null;

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;

    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern((entry as any).cv_pattern || pattern?.cv_notation);
    const { entries: rootEntries } = useRootData(entry.root_pattern_form?.root?.id);

    const autoForms = useMemo(() => {
        if (rootConsonants) {
            try {
                return generateNumeralForms(entry.headword, rootConsonants);
            } catch (e) {
                console.error("Numeral generation error:", e);
                return {} as NumeralAutoForms;
            }
        }
        return {} as NumeralAutoForms;
    }, [entry.headword, rootConsonants]);

    const markedAutoForms = useMemo(() => {
        if (!autoForms || !rootEntries) return autoForms;

        const mark = (val: string | undefined) => {
            if (!val || val === '-') return { value: '-', marker: 'plain' };
            const cleanVal = val.startsWith('*') ? val.substring(1) : val;
            const existing = rootEntries.find(e => e.headword === cleanVal);
            return {
                value: cleanVal,
                marker: existing ? 'plain' : (val.startsWith('*') ? 'theoretical' : 'auto_generated'),
                entryId: existing?.id
            } as { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string };
        };

        return {
            ordinal: mark(autoForms.ordinal),
            adverbial: mark(autoForms.adverbial),
            fractional_semitic: mark(autoForms.fractional_semitic),
            multiplier_form1: mark(autoForms.multiplier_form1),
            multiplier_form2: mark(autoForms.multiplier_form2),
            distributive: mark(autoForms.distributive),
        };
    }, [autoForms, rootEntries]);

    const handleEditNumeralForm = (data: { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string }, type: string) => {
        if (data.marker === 'plain' && data.entryId) {
            const existing = rootEntries?.find(e => e.id === data.entryId);
            if (existing) {
                setEditEntry({
                    ...existing,
                    _rootConsonants: rootConsonants || ''
                } as any);
                setInitialFormData(null);
            }
        } else {
            setEditEntry(null);
            setInitialFormData({
                headword: data.value,
                pos: type === 'ordinal' ? 'adjective' : (type === 'adverbial' ? 'adverb' : 'noun'),
                _rootConsonants: rootConsonants || ''
            });
        }
        setShowForm(true);
    };

    const renderNumeralLink = (data: any, type: string) => {
        const isM = typeof data === 'object' && data !== null && 'value' in data;
        if (!isM) return <MarkedValue val={data} theoretical={true} />;

        const { value, marker, entryId } = data as { value: string; marker: 'plain' | 'theoretical' | 'auto_generated'; entryId?: string };
        if (value === '-') return <span className="opacity-40">-</span>;

        const content = (marker === 'plain' && entryId) ? (
            <Link to={`/entry/${entryId}`} style={{ color: BLUE }} className="hover:underline">
                {value}
            </Link>
        ) : (
            <span className={cn(marker !== 'plain' && "opacity-45")}>
                {marker === 'theoretical' ? '*' : (marker === 'auto_generated' ? '✦' : '')}{value}
            </span>
        );

        if (!isActualAdmin) return content;

        return (
            <div className="flex items-center gap-2 group/btn">
                {content}
                <div className="flex items-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.preventDefault(); handleEditNumeralForm(data, type); }}
                        className="p-1 rounded hover:bg-black/5 text-black/55 transition-all"
                        title={marker === 'plain' ? 'Edit Entry' : 'Add Entry'}
                    >
                        {marker === 'plain' ? <Edit2 size={12} /> : <Plus size={12} />}
                    </button>
                    {marker === 'plain' && entryId && (
                        <button
                            onClick={(e) => { e.preventDefault(); handleRemoveRelationship(entryId); }}
                            className="p-1 rounded hover:bg-black/5 text-red-400 hover:text-red-600 transition-all"
                            title={term('remove-relationship') || 'Remove Relationship'}
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                     <div className="relative inline-flex items-center justify-center flex-col gap-1">
                         <div className="relative inline-flex items-center justify-center">
                             <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                 {entry.headword}
                             </h1>
                             {isActualAdmin && (
                                 <button
                                     onClick={() => {
                                         setEditEntry({
                                             ...entry,
                                             _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                         } as any);
                                         setShowForm(true);
                                     }}
                                     className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                     title={term('edit-entry')}
                                 >
                                     <Edit2 size={16} />
                                 </button>
                             )}
                         </div>
                     </div>
                    <SubParts entry={entry} showGender />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions?.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                )) || <li>-</li>}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="hidden md:block w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions?.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                )) || <li>-</li>}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <EtymologySentence
                                    prefix={term('from')}
                                    items={buildDisplayEtymologyItems(ety.chain, term)}
                                />
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {nm?.source_citation && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{nm.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-0 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            {/* Properties */}
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto mb-12 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}

                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}

                                <VowelSetGrid morphology={{ ...entry, ...nm }} />
                            </div>

                            {/* Morphology Table */}
                            <div className="flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none">
                                <MorphologyTable
                                    title={term('morphology')}
                                    labelHeader={term('form') || 'Form'}
                                    displayPattern={displayPattern}
                                    rows={[
                                        {
                                            label: term('tag-base') || 'Base',
                                            value: entry.headword,
                                            pattern: entry.lemma_pattern || entry.form_masc_pattern || entry.cv_pattern,
                                        },
                                        {
                                            label: term('type') || 'Type',
                                            value: <span className="capitalize">{entry.numeral_type || nm?.numeral_type || '-'}</span>,
                                            show: !!(entry.numeral_type || nm?.numeral_type)
                                        },
                                        {
                                            label: term('masculine'),
                                            value: nm?.lemma_masc || entry.form_masc || entry.headword,
                                            pattern: nm?.gender?.toLowerCase() === 'masculine' ? (nm.lemma_pattern || entry.lemma_pattern) : (nm?.form_masc_pattern || entry.form_masc_pattern)
                                        },
                                        {
                                            label: term('feminine'),
                                            value: nm?.lemma_fem || entry.form_fem,
                                            pattern: (nm?.gender?.toLowerCase() === 'feminine' && !nm.form_fem_pattern && !entry.form_fem_pattern)
                                                ? (nm.lemma_pattern || entry.lemma_pattern)
                                                : (nm?.form_fem_pattern || entry.form_fem_pattern)
                                        },
                                        {
                                            label: term('short-attributive') || 'Short',
                                            value: nm?.form_attributive_short || entry.form_attributive_short,
                                            theoretical: !nm?.form_attributive_short && !entry.form_attributive_short
                                        },
                                        {
                                            label: term('long-attributive') || 'Long',
                                            value: nm?.form_attributive_long || entry.form_attributive_long,
                                            theoretical: !nm?.form_attributive_long && !entry.form_attributive_long
                                        },
                                        {
                                            label: term('plural'),
                                            value: nm?.inflections_pl?.[0] || entry.inflections_pl?.[0] || (entry.headword === 'wieħed' ? 'uħud' : null),
                                            show: !!(nm?.inflections_pl?.[0] || entry.inflections_pl?.[0] || entry.headword === 'wieħed'),
                                            pattern: entry.morph_pattern || nm?.morph_pattern || entry.form_plural_pattern || nm?.form_plural_pattern
                                        },
                                        {
                                            label: term('ordinal') || 'Ordinal',
                                            value: renderNumeralLink(markedAutoForms.ordinal, 'ordinal'),
                                        },
                                        {
                                            label: term('adverbial') || 'Adverbial',
                                            value: renderNumeralLink(markedAutoForms.adverbial, 'adverbial'),
                                        },
                                        {
                                            label: term('fractional') || 'Fractional (Sem.)',
                                            value: renderNumeralLink(markedAutoForms.fractional_semitic, 'fractional'),
                                        },
                                        {
                                            label: term('multiplier') || 'Multiplier',
                                            value: (
                                                <div className="flex flex-col gap-1">
                                                    {renderNumeralLink(markedAutoForms.multiplier_form1, 'multiplier')}
                                                    {renderNumeralLink(markedAutoForms.multiplier_form2, 'multiplier')}
                                                </div>
                                            )
                                        },
                                        {
                                            label: term('distributive') || 'Distributive',
                                            value: renderNumeralLink(markedAutoForms.distributive, 'distributive'),
                                        }
                                    ]}
                                />

                                <div className="mt-12 space-y-12">
                                    <UsageExampleBlock entry={entry} />
                                </div>
                            </div>
                        </div>

                        {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                        <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                            {ety && ety.chain.length > 0 && (
                                <SideCard title={term('etymology')}>
                                    <EtymologySentence
                                        prefix={term('from')}
                                        items={buildDisplayEtymologyItems(ety.chain, term)}
                                    />
                                </SideCard>
                            )}

                            {alternativeForms.length > 0 && (
                                <SideCard title={term('alternative-forms')}>
                                    <div className="space-y-1">
                                        {alternativeForms.map((alt: any) => (
                                            <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {nm?.source_citation && (
                                <SideCard title={term('sources')}>
                                    <span className="text-sm font-medium" style={{ color: GOLD }}>{nm.source_citation}</span>
                                </SideCard>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

// ── Adjective View ─────────────────────────────────────────────────────────

function AdjectiveEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;
    const am = entry.adjective_morphology!;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = am.related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;

    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern((entry as any).cv_pattern || pattern?.cv_notation);
    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    const elative = useMemo(() => {
        // Disable generation if any internal elative-blocking tag is present
        const isElativeDisabled = entry.tags?.some(tag => tag.includes('$') || isHiddenTag(tag));
        if (isElativeDisabled) return null;

        const generated = rootConsonants ? generateElative(rootConsonants, entry.headword) : null;
        if (!generated) {
            return am.elative ? { masculine: am.elative, feminine: null } : null;
        }
        return {
            masculine: am.elative || generated.masculine,
            feminine: generated.feminine,
        };
    }, [am.elative, rootConsonants, entry.headword, entry.tags]);

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <SubParts entry={entry} showGender />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="hidden md:block w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <EtymologySentence
                                    prefix={term('from')}
                                    items={buildDisplayEtymologyItems(ety.chain, term)}
                                />
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {am.source_citation && (
                            <SideCard title={term('sources')}>
                                <span className="text-sm font-medium" style={{ color: GOLD }}>{am.source_citation}</span>
                            </SideCard>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="flex-1 min-w-0 space-y-0 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            {/* Properties */}
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto mb-12 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}

                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}

                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}

                                <VowelSetGrid morphology={{ ...entry, ...am }} />
                                </div>

                            {/* Morphology Table */}
                            <div className="flex-1 min-w-0 w-full max-w-[340px] mx-auto md:max-w-none">
                                <AdjectiveMorphologySection
                                    entry={entry}
                                    morphology={am}
                                    elative={elative}
                                    rootConsonants={rootConsonants}
                                    displayPattern={displayPattern}
                                />

                                <UsageExampleBlock entry={entry} />

                                {/* Thesaurus */}
                                {((am.synonyms?.length ?? 0) > 0 || (am.antonyms?.length ?? 0) > 0) && (
                                    <div className="w-full">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-start text-center md:text-left">
                                            <RelatedGlossGroup
                                                title={term('synonyms')}
                                                items={am.synonyms || []}
                                                language={language}
                                                mode={mode}
                                                isAdmin={isActualAdmin}
                                                onEditItem={handleEditEntry}
                                                onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                wrapperClassName="flex-1 min-w-[220px]"
                                            />
                                            <RelatedGlossGroup
                                                title={term('antonyms')}
                                                items={am.antonyms || []}
                                                language={language}
                                                mode={mode}
                                                isAdmin={isActualAdmin}
                                                onEditItem={handleEditEntry}
                                                onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                wrapperClassName="flex-1 min-w-[220px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                        {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                        <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                            {ety && ety.chain.length > 0 && (
                                <SideCard title={term('etymology')}>
                                    <EtymologySentence
                                        prefix={term('from')}
                                        items={buildDisplayEtymologyItems(ety.chain, term)}
                                    />
                                </SideCard>
                            )}

                            {alternativeForms.length > 0 && (
                                <SideCard title={term('alternative-forms')}>
                                    <div className="space-y-1">
                                        {alternativeForms.map((alt: any) => (
                                            <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </SideCard>
                            )}

                            {am.source_citation && (
                                <SideCard title={term('sources')}>
                                    <span className="text-sm font-medium" style={{ color: GOLD }}>{am.source_citation}</span>
                                </SideCard>
                            )}
                        </div>
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}


function ParticipleEntryView({ entry, onRefetch }: { entry: Entry; onRefetch?: () => void }) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();

    const { getValues } = useAdminConfig();
    const cvWizenMap = useMemo(() => {
        const map = new Map<string, string>();
        const categories = ['cv_wizen_pattern', 'plural_pattern', 'feminine_pattern', 'diminutive_pattern', 'adjective_pattern'];
        categories.forEach(cat => {
            const values = getValues(cat);
            if (Array.isArray(values)) {
                values.forEach(item => {
                    const cv = item?.cv || item?.cv_notation;
                    const wizen = item?.wizen || item?.wizen_notation;
                    if (cv && wizen) map.set(cv.toLowerCase().trim(), wizen.trim());
                });
            }
        });
        return map;
    }, [getValues]);

    const displayPattern = (pattern?: string) => {
        if (!pattern) return '';
        if (mode !== 'arabised') return pattern;
        return cvWizenMap.get(pattern.toLowerCase().trim()) || pattern;
    };

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const isActualAdmin = isAdmin && adminViewEnabled;
    const ety = entry.etymologies?.[0];

    const allRelatedEntries = (entry as any).related_entries || [];
    const directAlternativeForms = (entry as any).alternative_forms || [];
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });
    //const pm = entry.adjective_morphology!;

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-') || entry.root_pattern_form?.root?.consonants || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;

    const patternLabel = mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern');
    const patternValue = displayPattern((entry as any).cv_pattern || pattern?.cv_notation);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <SubParts entry={entry} showGender />
                    <div className="mt-2 text-xs font-sans uppercase tracking-[0.2em] text-[#1034A6] font-bold">
                        {entry.participle_type ? term(entry.participle_type) : term('participle')}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    {/* Top Mobile Gloss */}
                    <div className="w-full block md:hidden mb-2 max-w-[340px] mx-auto">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>
                    </div>

                    {/* Left Sidebar (Desktop Only) */}
                    <div className="hidden md:block w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions.map(def => (
                                    <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                ))}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <EtymologySentence
                                    prefix={term('from')}
                                    items={buildDisplayEtymologyItems(ety.chain, term)}
                                />
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-8 w-full">
                        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto md:max-w-none mb-12 md:mb-0">
                                {rootConsonants && (
                                    <PropRow label={term('root')}>
                                        <Link to={`/root/${rootConsonants}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {rootConsonants}
                                        </Link>
                                    </PropRow>
                                )}
                                {patternValue && (
                                    <PropRow label={patternLabel}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}
                                <VowelSetGrid morphology={entry} />

                                <div className="mt-4 border-t border-black/5" />
                            </div>

                            <div className="flex-1 min-w-0 w-full space-y-12">
                                <MorphologyTable
                                    title={term('morphology')}
                                    displayPattern={displayPattern}
                                    rows={[
                                        {
                                            label: term('gender'),
                                            value: <span className="capitalize">{entry.participle_gender ? term(entry.participle_gender) : '-'}</span>,
                                            show: !!entry.participle_gender
                                        },
                                        {
                                            label: term('masculine'),
                                            value: (entry as any).adj_masculine || (entry.participle_gender !== 'feminine' ? entry.headword : null),
                                            show: entry.participle_gender !== 'feminine' || !!(entry as any).adj_masculine,
                                            pattern: entry.participle_gender?.toLowerCase() === 'masculine' ? entry.lemma_pattern : entry.form_masc_pattern
                                        },
                                        {
                                            label: term('feminine'),
                                            value: (entry as any).adj_feminine || (entry.participle_gender === 'feminine' ? entry.headword : null),
                                            show: entry.participle_gender === 'feminine' || !!(entry as any).adj_feminine,
                                            pattern: (entry.participle_gender?.toLowerCase() === 'feminine' && !entry.form_fem_pattern)
                                                ? entry.lemma_pattern
                                                : entry.form_fem_pattern
                                        },
                                        {
                                            label: term('plural'),
                                            value: (entry as any).adj_plural,
                                            pattern: entry.form_plural_pattern || entry.morph_pattern
                                        },
                                        {
                                            label: term('elative') || 'Elative',
                                            value: (entry as any).adj_elative || entry.adjective_morphology?.elative,
                                            show: !!((entry as any).adj_elative || entry.adjective_morphology?.elative) && !entry.tags?.some(t => t.includes('$') || isHiddenTag(t))
                                        }
                                    ]}
                                />

                                <UsageExampleBlock entry={entry} />

                                {((entry as any).synonyms?.length > 0 || (entry as any).antonyms?.length > 0) && (
                                    <div className="w-full">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3">{term('thesaurus')}</h2>
                                        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-start">
                                            <RelatedGlossGroup
                                                title={term('synonyms')}
                                                items={(entry as any).synonyms || []}
                                                language={language}
                                                mode={mode}
                                                isAdmin={isActualAdmin}
                                                onEditItem={handleEditEntry}
                                                onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                wrapperClassName="flex-1 min-w-[220px]"
                                            />
                                            <RelatedGlossGroup
                                                title={term('antonyms')}
                                                items={(entry as any).antonyms || []}
                                                language={language}
                                                mode={mode}
                                                isAdmin={isActualAdmin}
                                                onEditItem={handleEditEntry}
                                                onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                wrapperClassName="flex-1 min-w-[220px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                            <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                                {ety && ety.chain.length > 0 && (
                                    <SideCard title={term('etymology')}>
                                        <EtymologySentence
                                            prefix={term('from')}
                                            items={buildDisplayEtymologyItems(ety.chain, term)}
                                        />
                                    </SideCard>
                                )}

                                {alternativeForms.length > 0 && (
                                    <SideCard title={term('alternative-forms')}>
                                        <div className="space-y-1">
                                            {alternativeForms.map((alt: any) => (
                                                <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                    {alt.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-black">
                                                        "{getGloss(alt, language, mode)}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </SideCard>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

export function FunctionWordEntryView({
    entry,
    onRefetch,
    stemDisplayValue,
    rootDisplayValue,
    rootHref,
    classType,
    isHybrid,
}: {
    entry: Entry;
    onRefetch?: () => void;
    stemDisplayValue?: string;
    rootDisplayValue?: string;
    rootHref?: string;
    classType?: string;
    isHybrid?: boolean;
}) {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { isAdmin, adminViewEnabled } = useAuth();
    const { getToken } = useClerkAuth();
    const isActualAdmin = isAdmin && adminViewEnabled;

    const [showForm, setShowForm] = useState(false);
    const [editEntry, setEditEntry] = useState<AdminEntry | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);

    const pos = (entry.pos || '').toLowerCase();
    const isInterjection = pos === 'interjection';
    const isPronoun = pos === 'pronoun';
    const isArticle = pos === 'article';
    const isInflectablePos = ['pronoun', 'particle', 'adverb', 'preposition', 'article'].includes(pos);
    const hasInflection = isInflectablePos && !(entry.is_inflectable === false || (entry.is_inflectable as any) === 0);

    const parseMaybeArray = <T,>(val: any): T[] => {
        if (Array.isArray(val)) return val as T[];
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed) return [];
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            }
            return trimmed.split(',').map(s => s.trim()).filter(Boolean) as any;
        }
        return [];
    };

    const allRelatedEntries = parseMaybeArray<any>((entry as any).related_entries);
    const directAlternativeForms = parseMaybeArray<any>((entry as any).alternative_forms);
    const markedAlternativeForms = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form';
    });
    const alternativeForms = directAlternativeForms.length > 0 ? directAlternativeForms : markedAlternativeForms;
    const relatedEntries = allRelatedEntries.filter((item: any) => {
        const kind = String(item?.relation_kind || item?.relationship_type || item?._rel || '').toLowerCase().trim();
        return !(kind === 'alternative_form' || kind === 'alternative' || kind === 'alt_form');
    });
    const synonyms = parseMaybeArray<any>((entry as any).synonyms);
    const antonyms = parseMaybeArray<any>((entry as any).antonyms);
    const inflectionPlurals = parseMaybeArray<string>((entry as any).inflections_pl);

    const ety = entry.etymologies?.[0];
    const rootConsonants = entry.root_pattern_form?.root?.consonant_array?.join('-')
        || entry.root_pattern_form?.root?.consonants
        || (entry as any).root_consonants;
    const pattern = entry.root_pattern_form?.pattern;
    const patternValue = (entry as any).cv_pattern || pattern?.cv_notation;

    const displayStem = stemDisplayValue || '';
    const displayRoot = rootDisplayValue || rootConsonants;
    const thirdRadical = rootConsonants?.split('-')?.[2] || rootConsonants?.[2] || '';
    const stemClassType: 'ar' | 'ir' = classType === 'ir' ? 'ir' : 'ar';
    const stemMetadataSource = displayStem
        ? {
            stem_string: displayStem,
            class_type: stemClassType,
            is_hybrid: !!isHybrid,
            root: displayRoot || null,
        }
        : null;

    const isIlArticle = (isArticle || pos === 'particle') && /^il-?/i.test((entry.headword || '').trim());

    const sunTransformations = [
        { letter: 'ċ', rule: 'il- → iċ-', example: 'ċertu', result: 'iċ-ċertu' },
        { letter: 'd', rule: 'il- → id-', example: 'dar', result: 'id-dar' },
        { letter: 'n', rule: 'il- → in-', example: 'nar', result: 'in-nar' },
        { letter: 'r', rule: 'il- → ir-', example: 'raġel', result: 'ir-raġel' },
        { letter: 's', rule: 'il- → is-', example: 'sema', result: 'is-sema' },
        { letter: 't', rule: 'il- → it-', example: 'tarġa', result: 'it-tarġa' },
        { letter: 'x', rule: 'il- → ix-', example: 'xemx', result: 'ix-xemx' },
        { letter: 'ż', rule: 'il- → iż-', example: 'żarbun', result: 'iż-żarbun' },
        { letter: 'z', rule: 'il- → iz-', example: 'zokkor', result: 'iz-zokkor' },
    ];

    const moonTransformations = [
        { letter: 'b', rule: 'il- → il-', example: 'bieb', result: 'il-bieb' },
        { letter: 'f', rule: 'il- → il-', example: 'fenek', result: 'il-fenek' },
        { letter: 'g', rule: 'il- → il-', example: 'gżira', result: 'il-gżira' },
        { letter: 'ġ', rule: 'il- → il-', example: 'ġurnata', result: 'il-ġurnata' },
        { letter: 'għ', rule: 'il- → l-', example: 'għasfur', result: 'l-għasfur' },
        { letter: 'h', rule: 'il- → l-', example: 'hena', result: 'l-hena' },
        { letter: 'ħ', rule: 'il- → il-', example: 'ħobż', result: 'il-ħobż' },
        { letter: 'j', rule: 'il- → il-', example: 'jum', result: 'il-jum' },
        { letter: 'k', rule: 'il- → il-', example: 'klieb', result: 'il-klieb' },
        { letter: 'l', rule: 'il- → il-', example: 'lejl', result: 'il-lejl' },
        { letter: 'm', rule: 'il- → il-', example: 'mejda', result: 'il-mejda' },
        { letter: 'p', rule: 'il- → il-', example: 'pjanu', result: 'il-pjanu' },
        { letter: 'q', rule: 'il- → il-', example: 'qamar', result: 'il-qamar' },
        { letter: 'v', rule: 'il- → il-', example: 'vapur', result: 'il-vapur' },
        { letter: 'w', rule: 'il- → il-', example: 'werqa', result: 'il-werqa' },
    ];

    const handleRemoveRelationship = async (targetId: string) => {
        if (!confirm(term('confirm-remove-relationship') || 'Are you sure you want to remove this relationship?')) return;
        try {
            const token = await getToken();
            const updated = removeRelationshipFromEntry(entry, targetId);
            await adminUpdateEntry(token!, updated as any);
            onRefetch?.();
        } catch (err: any) {
            alert((term('failed-remove-relationship') || 'Failed to remove relationship: ') + (err.message || String(err)));
        }
    };

    const handleEditEntry = (target: { id: string }) => {
        setEditEntry(target as any);
        setShowForm(true);
    };

    const POSSESSIVE_SUFFIX_KEYS = ['pos-1s', 'pos-2s', 'pos-3ms', 'pos-3fs', 'pos-1p', 'pos-2p', 'pos-3p'];
    const applySuffix = (base: string, idx: number) => {
        if (!base) return { value: '-', theoretical: false };
        const result = applyInflectionTableSuffix(
            base,
            idx as any,
            (entry.gender as any) || 'masculine',
            (entry as any).cv_pattern || pattern?.cv_notation,
            thirdRadical
        );
        if (result === '-') return { value: '-', theoretical: false };
        const parts = result.split(' / ');
        if (parts.length > 1) {
            return {
                value: <StackedSurface primary={parts[0]} alternates={parts.slice(1)} />,
                theoretical: false
            };
        }
        return { value: result, theoretical: false };
    };

    const pluralBase = isPronoun ? (inflectionPlurals[0] || '') : '';
    const showPluralColumn = isPronoun && !!pluralBase;

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle} className="w-full overflow-hidden">
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 pb-10 w-full mt-2 sm:mt-10">
                <div className="text-center mb-4 sm:mb-8 relative group max-w-fit mx-auto px-4">
                    <div className="relative inline-flex items-center justify-center flex-col gap-1">
                        <div className="relative inline-flex items-center justify-center">
                            <h1 className="font-serif font-bold text-[2rem] sm:text-[3rem] leading-tight text-black tracking-tight wrap-break-word">
                                {entry.headword}
                            </h1>
                            {isActualAdmin && (
                                <button
                                    onClick={() => {
                                        setEditEntry({
                                            ...entry,
                                            _rootConsonants: entry.root_pattern_form?.root?.consonants || ''
                                        } as any);
                                        setShowForm(true);
                                    }}
                                    className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 p-1 px-1.5 text-black/55 hover:bg-black/5 rounded transition-colors"
                                    title={term('edit-entry')}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    <SubParts entry={entry} showGender={isPronoun} />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                    <div className="w-full md:w-64 shrink-0 space-y-4">
                        <SideCard title={term('gloss')}>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-black marker:text-black/30">
                                {entry.definitions && entry.definitions.length > 0 ? (
                                    entry.definitions.map(def => (
                                        <li key={def.id}>{language === 'mt' && def.text_mt ? def.text_mt : def.text_en}</li>
                                    ))
                                ) : (
                                    <li>{language === 'mt' && (entry as any).definition_mt ? (entry as any).definition_mt : (entry as any).definition_en || '-'}</li>
                                )}
                            </ol>
                            <TagChips entry={entry} />
                        </SideCard>

                        {ety && ety.chain.length > 0 && (
                            <SideCard title={term('etymology')}>
                                <EtymologySentence
                                    prefix={term('from')}
                                    items={buildDisplayEtymologyItems(ety.chain, term)}
                                />
                            </SideCard>
                        )}

                        {alternativeForms.length > 0 && (
                            <SideCard title={term('alternative-forms')}>
                                <div className="space-y-1">
                                    {alternativeForms.map((alt: any) => (
                                        <div key={alt.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {alt.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(alt, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(alt)}
                                                    onDelete={() => handleRemoveRelationship(alt.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}

                        {relatedEntries.length > 0 && (
                            <SideCard title={term('related-entries')}>
                                <div className="space-y-1">
                                    {relatedEntries.map((rel: any) => (
                                        <div key={rel.id} className="flex items-center justify-between group">
                                            <Link to={`/entry/${rel.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                {rel.headword}{' '}
                                                <span className="opacity-55 font-sans text-xs text-black">
                                                    "{getGloss(rel, language, mode)}"
                                                </span>
                                            </Link>
                                            {isActualAdmin && (
                                                <AdminActionButtons
                                                    onEdit={() => handleEditEntry(rel)}
                                                    onDelete={() => handleRemoveRelationship(rel.id)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SideCard>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-8 w-full">
                        <div className={cn(
                            "flex flex-col gap-8 items-start w-full",
                            !entry.zokk_morphology && "md:flex-row"
                        )}>
                            <div className="w-full md:w-52 shrink-0 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8 max-w-[340px] mx-auto md:max-w-none mb-8 md:mb-0">
                                {stemMetadataSource && (
                                    <MorphologyProvenanceRows
                                        source={stemMetadataSource}
                                        rootDisplayValue={displayRoot || undefined}
                                        rootHref={rootHref}
                                    />
                                )}
                                {entry.phonetics && entry.phonetics.length > 0 && (
                                    <PropRow label={term('pronunciation')}>
                                        <div className="space-y-0 mt-1">
                                            {entry.phonetics.map((ph, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:gap-1 mb-0 last:mb-0">
                                                    {ph.dialect && (
                                                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-tighter">
                                                            {ph.dialect.replace(' (Għawdex)', '').replace(' (Arkajku)', '')}:
                                                        </span>
                                                    )}
                                                    {ph.ipa && <span className="text-[14px] tracking-tighter font-mono whitespace-nowrap">{ph.ipa}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </PropRow>
                                )}
                                {patternValue && (
                                    <PropRow label={mode === 'arabised' ? term('wizen-pattern') : term('cv-pattern')}>
                                        <Link to={`/pattern/${pattern?.id}`} style={{ color: BLUE }} className="font-sans font-regular hover:underline">
                                            {patternValue}
                                        </Link>
                                    </PropRow>
                                )}
                                {isPronoun && entry.gender && (
                                    <PropRow label={term('gender')}>
                                        <span className="capitalize">{term(entry.gender)}</span>
                                    </PropRow>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 w-full space-y-12">
                                {!isInterjection && hasInflection && (
                                    <div className="w-full overflow-x-auto">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                                            {term('inflection-table')}
                                        </h2>
                                        <table className="w-full text-sm border-collapse md:min-w-[500px]">
                                            <thead>
                                                <tr className="border-b border-black/8 font-sans whitespace-nowrap">
                                                    <th className="text-left font-semibold text-black pb-2 pr-4 w-32">{term('person')}</th>
                                                    <th className="text-left font-semibold text-black pb-2 pr-4">{term('singular')}</th>
                                                    {showPluralColumn && (
                                                        <th className="text-left font-semibold text-black pb-2">{term('plural')}</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {POSSESSIVE_SUFFIX_KEYS.map((key, idx) => (
                                                    <tr key={key} className="border-b border-black/4 whitespace-nowrap">
                                                        <td className="py-1.5 pr-4 text-black/40 text-xs font-sans">{term(key)}</td>
                                                        <td className="py-1.5 pr-4 font-serif font-normal text-black">
                                                            <MarkedValue val={applySuffix(entry.headword, idx)} />
                                                        </td>
                                                        {showPluralColumn && (
                                                            <td className="py-1.5 font-serif font-normal text-black">
                                                                <MarkedValue val={applySuffix(pluralBase, idx)} />
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {isIlArticle && (
                                    <div className="w-full">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 md:text-left text-center">
                                            {term('sun-moon-letters') || 'Sun & Moon Letters'}
                                        </h2>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm">
                                            <div className="rounded-lg border border-black/10 p-4 bg-white shadow-sm overflow-hidden">
                                                <p className="text-xs font-bold uppercase tracking-wider text-black/50 mb-3 border-b border-black/5 pb-2">
                                                    {term('sun-letters') || 'Sun Letters'} (Assimilated)
                                                </p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="text-[10px] text-black/30 uppercase tracking-widest text-left">
                                                                <th className="pb-1">Letter</th>
                                                                <th className="pb-1">Rule</th>
                                                                <th className="pb-1">Example</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-black/5">
                                                            {sunTransformations.map((t, idx) => (
                                                                <tr key={idx} className="group hover:bg-black/2">
                                                                    <td className="py-2 pr-4 font-serif font-bold text-lg text-black">{t.letter}</td>
                                                                    <td className="py-2 pr-4 font-mono text-black/40 text-[11px] whitespace-nowrap">{t.rule}</td>
                                                                    <td className="py-2 pr-2 font-serif text-black leading-tight">
                                                                        <span className="opacity-40">{t.example}</span>
                                                                        <span className="mx-2 opacity-20">→</span>
                                                                        <span className="font-bold underline decoration-black/10 underline-offset-4">{t.result}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-black/10 p-4 bg-white shadow-sm overflow-hidden">
                                                <p className="text-xs font-bold uppercase tracking-wider text-black/50 mb-3 border-b border-black/5 pb-2">
                                                    {term('moon-letters') || 'Moon Letters'} (Standard)
                                                </p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="text-[10px] text-black/30 uppercase tracking-widest text-left">
                                                                <th className="pb-1">Letter</th>
                                                                <th className="pb-1">Rule</th>
                                                                <th className="pb-1">Example</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-black/5">
                                                            {moonTransformations.map((t, idx) => (
                                                                <tr key={idx} className="group hover:bg-black/2">
                                                                    <td className="py-2 pr-4 font-serif font-bold text-lg text-black">{t.letter}</td>
                                                                    <td className="py-2 pr-4 font-mono text-black/40 text-[11px] whitespace-nowrap">{t.rule}</td>
                                                                    <td className="py-2 pr-2 font-serif text-black leading-tight">
                                                                        <span className="opacity-40">{t.example}</span>
                                                                        <span className="mx-2 opacity-20">→</span>
                                                                        <span className="font-bold underline decoration-black/10 underline-offset-4">{t.result}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <UsageExampleBlock entry={entry} />

                                {((synonyms?.length ?? 0) > 0 || (antonyms?.length ?? 0) > 0 || (relatedEntries?.length ?? 0) > 0) && (
                                    <div className="w-full">
                                        <h2 className="font-sans font-semibold text-[1.25rem] text-black mb-3 text-center md:text-left">{term('thesaurus')}</h2>
                                        <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-sm mt-3 items-start">
                                            <RelatedGlossGroup
                                                title={term('synonyms')}
                                                items={synonyms || []}
                                                language={language}
                                                mode={mode}
                                                isAdmin={isActualAdmin}
                                                onEditItem={handleEditEntry}
                                                onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                wrapperClassName="flex-1 min-w-[220px]"
                                            />
                                            <RelatedGlossGroup
                                                title={term('antonyms')}
                                                items={antonyms || []}
                                                language={language}
                                                mode={mode}
                                                isAdmin={isActualAdmin}
                                                onEditItem={handleEditEntry}
                                                onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                wrapperClassName="flex-1 min-w-[220px]"
                                            />
                                            <RelatedGlossGroup
                                                title={term('related-entries')}
                                                items={relatedEntries || []}
                                                language={language}
                                                mode={mode}
                                                isAdmin={isActualAdmin}
                                                onEditItem={handleEditEntry}
                                                onDeleteItem={item => handleRemoveRelationship(item.id)}
                                                wrapperClassName="flex-1 min-w-[220px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Etymology, Related, Source (Hidden on Desktop) */}
                            <div className="block md:hidden space-y-8 pt-8 max-w-[340px] mx-auto w-full">
                                {ety && ety.chain.length > 0 && (
                                    <SideCard title={term('etymology')}>
                                        <EtymologySentence
                                            prefix={term('from')}
                                            items={buildDisplayEtymologyItems(ety.chain, term)}
                                        />
                                    </SideCard>
                                )}

                                {alternativeForms.length > 0 && (
                                    <SideCard title={term('alternative-forms')}>
                                        <div className="space-y-1">
                                            {alternativeForms.map((alt: any) => (
                                                <Link key={alt.id} to={`/entry/${alt.id}`} className="block text-sm font-serif" style={{ color: BLUE }}>
                                                    {alt.headword}{' '}
                                                    <span className="opacity-55 font-sans text-xs text-black">
                                                        "{getGloss(alt, language, mode)}"
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </SideCard>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showForm && (
                <EntryFormModal
                    entry={editEntry}
                    onClose={() => { setShowForm(false); setEditEntry(null); setInitialFormData(null); }}
                    onSaved={() => {
                        setShowForm(false);
                        setEditEntry(null);
                        setInitialFormData(null);
                        onRefetch?.();
                    }}
                    getToken={getToken}
                    initialForm={initialFormData}
                />
            )}
        </div>
    );
}

// ── Entry Shell ────────────────────────────────────────────────────────────

export function EntryPage() {
    const { term } = useLinguisticMode();
    const { id } = useParams<{ id: string }>();
    const [entry, setEntry] = useState<Entry | null>(null);
    const [loading, setLoading] = useState(true);

    const refetch = useMemo(() => {
        return () => {
            if (id) {
                setLoading(true);
                apiGetEntry(id)
                    .then(res => setEntry(res.entry))
                    .catch(() => {
                        // Fallback to mock if API fails
                        const mock = MOCK_ENTRIES.find(e => e.id === id);
                        setEntry(mock || null);
                    })
                    .finally(() => setLoading(false));
            }
        };
    }, [id]);

    useEffect(() => {
        if (entry) {
            document.title = `${entry.headword} | Il-Miġma'`;
        } else {
            document.title = "Il-Miġma'";
        }
    }, [entry]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
        </div>
    );

    if (!entry) {
        return (
            <div style={{
                background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
                minHeight: '60vh'
            }} className="flex flex-col items-center justify-center px-4 text-center">
                <div className="flex items-center gap-2 mb-8">
                    <Link to="/search" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back-to-search')}
                    </Link>
                </div>

                <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm p-10 max-w-lg w-full">
                    <h2 className="font-serif text-2xl font-bold text-black mb-3">
                        {term('entry-not-found')}
                    </h2>
                    <p className="text-text-muted text-sm mb-8 leading-relaxed">
                        {term('entry-not-found-desc').replace('{id}', id || '')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            to={`/suggest?type=entry&q=${id}`}
                            className="w-full sm:w-auto bg-[#1034A6] text-white text-sm font-sans font-medium px-6 py-2.5 rounded-lg hover:bg-link-hover transition-colors shadow-lg shadow-[#1034A6]/20"
                        >
                            {term('suggest-adding-entry')}
                        </Link>
                        <Link
                            to="/search"
                            className="w-full sm:w-auto bg-white text-black text-sm font-sans font-medium px-6 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                        >
                            <Search size={16} className="inline mr-1" />
                            {term('search-dictionary')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const pos = (entry.pos || '').toLowerCase();
    const nm = entry.noun_morphology;
    const vm = entry.verb_morphology;
    const am = entry.adjective_morphology;


    if (pos === 'verb' && vm) {
        return <VerbEntryView entry={entry} onRefetch={refetch} />;
    }

    if (pos === 'numeral') {
        return <NumeralEntryView entry={entry} onRefetch={refetch} />;
    }

    if (pos === 'noun' && nm) {
        return <NounEntryView entry={entry} onRefetch={refetch} />;
    }

    if (pos === 'adjective' && am) {
        return <AdjectiveEntryView entry={entry} onRefetch={refetch} />;
    }

    if (pos === 'participle') {
        return <ParticipleEntryView entry={entry} onRefetch={refetch} />;
    }

    if (['pronoun', 'particle', 'adverb', 'preposition', 'interjection', 'article', 'conjunction', 'interrogative'].includes(pos)) {
        return <FunctionWordEntryView entry={entry} onRefetch={refetch} />;
    }

    if (entry.zokk_morphology) {
        return <ZokkEntryView entry={entry} onRefetch={refetch} />;
    }

    return (
        <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8">
            <p className="text-sm text-black/40 italic">
                {term('full-entry-view-coming-soon').replace('{pos}', term(entry.pos))}
            </p>
        </div>
    );
}
