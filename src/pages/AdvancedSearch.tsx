import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Keyboard, Filter, ChevronDown, ChevronUp, MessageSquare, Shuffle } from 'lucide-react';
import { generateRootForms, markGeneratedForms, getAttestedEntries } from '@/lib/conjugationEngine';
import { cn } from '@/lib/utils';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useAdminConfig } from '@/lib/adminConfig';
import { apiSearch } from '@/lib/api';
import { derivePattern } from '@/lib/maltesePhonology';
import { SubParts } from '@/components/dictionary/SubParts';
import { resolveEntryGender } from '@/lib/gender';

// ── Colour tokens ──────────────────────────────────────────────────────────
const CREAM_RGBA = 'rgba(244,243,240,0.88)';
const EGYPTIAN_BLUE = '#1034A6';

// ── Types ──────────────────────────────────────────────────────────────────
interface InflectionRow {
    label: string;
    form: string;
    hasPage: boolean;
    entryId?: string;
    marker?: 'plain' | 'theoretical' | 'auto_generated'; // matching Search.tsx
}

interface SearchResult {
    id: string;
    headword: string;
    root: string;
    rootSlug: string;
    gender?: string;    // shown as Egyptian Blue below root
    pos: string;
    definitions: string[];
    inflections: InflectionRow[];
    entry: any;         // matching Search.tsx
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FilterSelect({
    label, value, onChange, options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selectedLabel = options.find(o => o.value === value)?.label ?? options[0]?.label;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div>
            <p className="text-xs font-medium text-black mb-1.5">{label}</p>
            <div ref={ref} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between bg-white border border-black/10 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black/20 cursor-pointer text-left"
                >
                    <span>{selectedLabel}</span>
                    <span
                        className="text-[#999] text-xs transition-transform duration-200 ml-2 shrink-0"
                        style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                        ▲
                    </span>
                </button>
                {open && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-black/10 rounded-md shadow-md overflow-hidden text-sm max-h-48 overflow-y-auto">
                        {options.map(o => (
                            <li
                                key={o.value}
                                onClick={() => { onChange(o.value); setOpen(false); }}
                                className={cn(
                                    'px-3 py-2 cursor-pointer hover:bg-black/5 transition-colors',
                                    o.value === value ? 'font-medium text-black' : 'text-[#333]',
                                )}
                            >
                                {o.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function FilterText({
    label, value, onChange, placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <p className="text-xs font-medium text-black mb-1.5">{label}</p>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white border border-black/10 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black/20 placeholder:text-black/25"
            />
        </div>
    );
}

function FilterCheckbox({
    label, checked, onChange,
}: {
    label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
                className={cn(
                    'w-4 h-4 border rounded-sm flex items-center justify-center shrink-0 transition-colors',
                    checked ? 'bg-black border-black' : 'bg-white border-black/25',
                )}
                onClick={() => onChange(!checked)}
            >
                {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
            <span className="text-sm text-black">{label}</span>
        </label>
    );
}

function FilterHybrid({
    label, value, onChange, options, placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div>
            <p className="text-xs font-medium text-black mb-1.5">{label}</p>
            <div ref={ref} className="relative group">
                <div className="flex items-center bg-white border border-black/10 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-black/20">
                    <input
                        type="text"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-2 text-sm text-black focus:outline-none placeholder:text-black/25 min-w-0"
                    />
                    <button
                        type="button"
                        onClick={() => setOpen(o => !o)}
                        className="px-2 py-2 text-[#999] hover:text-black border-l border-black/5 transition-colors"
                    >
                        <span className="text-[12px] block transform transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▲
                        </span>
                    </button>
                </div>

                {open && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-black/10 rounded-md shadow-md overflow-hidden text-sm max-h-40 overflow-y-auto">
                        {options.map(opt => (
                            <li
                                key={opt}
                                onClick={() => { onChange(opt); setOpen(false); }}
                                className="px-3 py-2 cursor-pointer hover:bg-black/5 transition-colors text-[#333]"
                            >
                                {opt}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function InflectionCell({ row }: { row: InflectionRow }) {
    const markerEl = row.marker === 'theoretical' ? (
        <span className="text-black/55 mr-0.5">*</span>
    ) : row.marker === 'auto_generated' ? (
        <span className="text-black/55 mr-0.5">✦</span>
    ) : null;

    if (row.hasPage || row.entryId) {
        return (
            <Link to={`/entry/${row.entryId || row.form}`} style={{ color: EGYPTIAN_BLUE }}
                className="text-sm hover:underline">
                {markerEl}{row.form}
            </Link>
        );
    }
    return (
        <span className={cn("text-sm", row.marker ? "text-black/55" : "text-black")}>
            {markerEl}{row.form}
        </span>
    );
}


function EntryCard({ result, index }: { result: SearchResult; index: number }) {
    const { term } = useLinguisticMode();
    return (
        <div className="bg-white rounded-xl border border-black/8 shadow-sm overflow-hidden mb-3 w-full">
            <div className="flex flex-col md:grid md:grid-cols-[12rem_8rem_1fr_16rem] min-h-20">

                {/* Col 1: Index number | headword + root */}
                <div className="px-5 py-4 flex items-start gap-2 border-b md:border-b-0 md:border-r border-black/5">
                    <span className="text-xs text-black/30 font-sans w-5 shrink-0 pt-1">{index}.</span>
                    <div>
                        <Link to={`/entry/${result.id}`}
                            className="font-serif font-extrabold text-[1.35rem] leading-tight text-black hover:underline block">
                            {result.headword}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                            <Link to={`/search?root=${result.rootSlug}`}
                                style={{ color: EGYPTIAN_BLUE }}
                                className="text-xs hover:underline font-sans">
                                {result.root}
                            </Link>
                            {result.gender && (
                                <Link to={`/search?gender=${result.gender}`}
                                    style={{ color: EGYPTIAN_BLUE }}
                                    className="text-xs hover:underline font-sans">
                                    {term(result.gender)}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Col 2: POS block */}
                <div className="px-5 py-3 md:py-4 flex flex-row md:flex-col flex-wrap gap-2 md:gap-0.5 border-b md:border-b-0 md:border-r border-black/5 bg-black/1 md:bg-transparent">
                    <SubParts entry={result.entry} layout="lines" showTransitivity />
                </div>

                {/* Col 3: Definitions */}
                <div className="px-5 py-4 border-b md:border-b-0 md:border-r border-black/5">
                    {result.definitions.length === 1 ? (
                        <p className="text-sm text-black leading-relaxed">{result.definitions[0]}</p>
                    ) : (
                        <ol className="space-y-1 md:space-y-0.5 list-none">
                            {result.definitions.map((def, i) => (
                                <li key={i} className="text-sm text-black">
                                    <span className="text-black/30 mr-1.5 font-sans text-xs">{i + 1}.</span> {def}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* Col 4: Inflections */}
                <div className="px-5 py-4 space-y-2 md:space-y-1 bg-black/1 md:bg-transparent">
                    {result.inflections.map((row, i) => (
                        <div key={i} className="flex items-baseline gap-3">
                            <span className="text-[10px] md:text-xs text-black/40 md:text-black/55 font-sans w-24 shrink-0 leading-snug uppercase tracking-tight md:tracking-normal">
                                {row.label}
                            </span>
                            <InflectionCell row={row} />
                        </div>
                    ))}
                </div>

            </div>

        </div>
    );
}

// ── Root radical slot ──────────────────────────────────────────────────────
function RootRadicalsInput({
    label, values, onChange,
}: {
    label: string;
    values: string[];
    onChange: (i: number, v: string) => void;
}) {
    return (
        <div>
            <p className="text-xs font-medium text-black mb-1.5">{label}</p>
            <div className="flex gap-1.5">
                {values.map((v, i) => (
                    <input
                        key={i}
                        type="text"
                        maxLength={2}
                        value={v}
                        onChange={e => onChange(i, e.target.value)}
                        className="w-10 text-center bg-white border border-black/10 rounded-md px-1 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black/20"
                        placeholder="—"
                    />
                ))}
            </div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────
interface AdvancedFilters {
    maxResults: string;
    pos: string;
    rootType: string;
    source: string;
    rootRadicals: string[];
    wizenPattern: string;
    vowelSet: string;
    dualPattern: string;
    pluralPattern: string;
    lemmaPattern: string;
    femininePattern: string;
    masculinePattern: string;
    vowelSetSg: string;
    vowelSetOpp: string;
    vowelSetPl: string;
    searchLemma: boolean;
    searchWordForms: boolean;
    searchEnglishGloss: boolean;
    includeSuggested: boolean;
    includePending: boolean;
    isRegex: boolean;
}

const DEFAULT_FILTERS: AdvancedFilters = {
    maxResults: '25',
    pos: '',
    rootType: '',
    source: '',
    rootRadicals: ['', '', '', ''],
    wizenPattern: '',
    vowelSet: '',
    dualPattern: '',
    pluralPattern: '',
    lemmaPattern: '',
    femininePattern: '',
    masculinePattern: '',
    vowelSetSg: '',
    vowelSetOpp: '',
    vowelSetPl: '',
    searchLemma: false,
    searchWordForms: false,
    searchEnglishGloss: false,
    includeSuggested: false,
    includePending: true,
    isRegex: false,
};

export function AdvancedSearch() {
    const { language } = useLanguage();
    const { term, mode } = useLinguisticMode();
    const { getOptions } = useAdminConfig();
    const [searchParams, setSearchParams] = useSearchParams();

    // Dynamic options
    const POS_FILTER_OPTIONS = useMemo(() => [
        { value: '', label: term('all') },
        ...getOptions('pos', mode, language)
    ], [getOptions, mode, language, term]);

    const ROOT_TYPE_FILTER_OPTIONS = useMemo(() => [
        { value: '', label: term('all') },
        ...getOptions('verb_class', mode, language)
    ], [getOptions, mode, language, term]);

    // Local state for UI controls
    const [query, setQuery] = useState(searchParams.get('q') ?? '');
    const [filters, setFilters] = useState<AdvancedFilters>(() => {
        const f = { ...DEFAULT_FILTERS };
        if (searchParams.has('pos')) f.pos = searchParams.get('pos')!;
        if (searchParams.has('type')) f.rootType = searchParams.get('type')!;
        if (searchParams.has('v')) f.vowelSet = searchParams.get('v')!;
        if (searchParams.has('wizen')) f.wizenPattern = searchParams.get('wizen')!;
        if (searchParams.has('lp')) f.lemmaPattern = searchParams.get('lp')!;
        if (searchParams.has('fp')) f.femininePattern = searchParams.get('fp')!;
        if (searchParams.has('mp')) f.masculinePattern = searchParams.get('mp')!;
        if (searchParams.has('pp')) f.pluralPattern = searchParams.get('pp')!;
        if (searchParams.has('dp')) f.dualPattern = searchParams.get('dp')!;
        if (searchParams.has('vs_sg')) f.vowelSetSg = searchParams.get('vs_sg')!;
        if (searchParams.has('vs_opp')) f.vowelSetOpp = searchParams.get('vs_opp')!;
        if (searchParams.has('vs_pl')) f.vowelSetPl = searchParams.get('vs_pl')!;
        if (searchParams.has('source')) f.source = searchParams.get('source')!;
        if (searchParams.has('r1')) f.rootRadicals[0] = searchParams.get('r1')!;
        if (searchParams.has('r2')) f.rootRadicals[1] = searchParams.get('r2')!;
        if (searchParams.has('r3')) f.rootRadicals[2] = searchParams.get('r3')!;
        if (searchParams.has('r4')) f.rootRadicals[3] = searchParams.get('r4')!;
        if (searchParams.has('regex')) f.isRegex = searchParams.get('regex') === 'true';
        if (searchParams.has('lemma')) f.searchLemma = searchParams.get('lemma') === 'true';
        if (searchParams.has('word_forms')) f.searchWordForms = searchParams.get('word_forms') === 'true';
        if (searchParams.has('gloss')) f.searchEnglishGloss = searchParams.get('gloss') === 'true';
        if (searchParams.has('suggested')) f.includeSuggested = searchParams.get('suggested') === 'true';
        if (searchParams.has('pending')) f.includePending = searchParams.get('pending') !== 'false';
        return f;
    });

    // Effective results state
    const [results, setResults] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const submitted = searchParams.get('q') ?? '';
    const isSearchPerformed = searchParams.has('q') ||
        searchParams.has('pos') ||
        searchParams.has('type') ||
        searchParams.has('v') ||
        searchParams.has('wizen') ||
        searchParams.has('lp') ||
        searchParams.has('fp') ||
        searchParams.has('mp') ||
        searchParams.has('pp') ||
        searchParams.has('dp') ||
        searchParams.has('vs_sg') ||
        searchParams.has('vs_opp') ||
        searchParams.has('vs_pl') ||
        searchParams.has('source') ||
        searchParams.has('gender') ||
        searchParams.has('r1');

    useEffect(() => {
        const q = searchParams.get('q') ?? '';
        setQuery(q);
        document.title = q.trim()
            ? `${term('advanced-search-title')}: ${q} | Il-Miġma'`
            : `${term('advanced-search-title')} | Il-Miġma'`;

        setLoading(true);
        const pos = searchParams.get('pos') || undefined;
        const rootType = searchParams.get('type') || undefined;
        const vowelSet = searchParams.get('v') || undefined;
        const wizen = searchParams.get('wizen') || undefined;
        const source = searchParams.get('source') || undefined;
        const gender = searchParams.get('gender') || undefined;
        const lemmaPatternFilter = searchParams.get('lp') || '';
        const femininePatternFilter = searchParams.get('fp') || '';
        const masculinePatternFilter = searchParams.get('mp') || '';
        const pluralPatternFilter = searchParams.get('pp') || '';
        const dualPatternFilter = searchParams.get('dp') || '';
        const vowelSetSgFilter = searchParams.get('vs_sg') || '';
        const vowelSetOppFilter = searchParams.get('vs_opp') || '';
        const vowelSetPlFilter = searchParams.get('vs_pl') || '';
        const radicals = [
            searchParams.get('r1') || '',
            searchParams.get('r2') || '',
            searchParams.get('r3') || '',
            searchParams.get('r4') || '',
        ];

        apiSearch(q, {
            pos,
            type: rootType,
            wizen: wizen || undefined,
            source: source || undefined,
            gender,
            limit: parseInt(filters.maxResults),
            v: vowelSet,
            random: searchParams.get('random') || undefined,
            radicals: radicals.some(r => r) ? radicals : undefined,
            regex: searchParams.get('regex') === 'true',
            searchLemma: searchParams.get('lemma') === 'true',
            searchWordForms: searchParams.get('word_forms') === 'true',
            searchEnglishGloss: searchParams.get('gloss') === 'true',
            includeSuggested: searchParams.get('suggested') === 'true',
            includePending: searchParams.get('pending') !== 'false',
            lp: lemmaPatternFilter || undefined,
            fp: femininePatternFilter || undefined,
            mp: masculinePatternFilter || undefined,
            pp: pluralPatternFilter || undefined,
            dp: dualPatternFilter || undefined,
        })
            .then(res => {
                setTotal(res.total);
                const mapped: SearchResult[] = res.results.map((r: any) => {
                    const inflections: InflectionRow[] = [];
                    const vm = r.verb_morphology;
                    let generated: any = null;

                    if (vm) {
                        const rc = r.root_pattern_form?.root?.consonants;
                        if (rc) {
                            try {
                                const forms = generateRootForms(
                                    rc,
                                    vm.vowel_set_perfect || 'a-a',
                                    vm.vowel_set_imperfect || 'i-a',
                                    r.verb_class || r.root_pattern_form.root.strength || 'strong',
                                    r.verb_weak_class || r.root_pattern_form.root.weak_class,
                                    r.root_pattern_form.root.is_imala_blocked || /[\u0127q]|g\u0127|h/i.test(rc)
                                );
                                const attestedEntries = getAttestedEntries(r.root_pattern_form?.root?.entries || [r]);
                                const marked = markGeneratedForms(forms, attestedEntries);
                                generated = marked.find((f: any) => f.form === vm.form);
                            } catch (e) {
                                console.warn("Advanced search conjugation error:", e);
                            }
                        }

                        const pushMarked = (label: string, data: any) => {
                            if (!data || data.value === '-') return;
                            inflections.push({
                                label,
                                form: data.value,
                                hasPage: !!data.entryId,
                                entryId: data.entryId,
                                marker: data.marker,
                            });
                        };

                        if (generated?.imperfect) {
                            inflections.push({
                                label: term('imperfect'),
                                form: generated.imperfect.value,
                                hasPage: false,
                            });
                        }
                        if (generated?.imperative && generated.imperative.value !== '-') {
                            inflections.push({
                                label: term('imperative'),
                                form: generated.imperative.value,
                                hasPage: false,
                            });
                        }
                        pushMarked(term('passive'), generated?.passiveParticiple);
                        pushMarked(term('verbal-noun'), generated?.verbalNoun && {
                            ...generated.verbalNoun,
                            marker: generated.verbalNoun.entryId ? undefined : 'theoretical'
                        });
                    } else if (r.noun_morphology || r.noun_plural_forms?.length) {
                        const nm = r.noun_morphology;
                        const pluralForms = r.noun_plural_forms || nm?.plural_forms;
                        if (pluralForms?.length) {
                            inflections.push({ label: term('plural'), form: pluralForms[0], hasPage: false });
                        }
                    }

                    return {
                        id: r.id,
                        headword: r.headword,
                        root: r.root_pattern_form?.root?.consonants || '',
                        rootSlug: r.root_pattern_form?.root?.consonants || '',
                        gender: resolveEntryGender(r) || undefined,
                        pos: r.pos,
                        definitions: r.definition_en ? [r.definition_en] : (r.definitions?.length ? r.definitions.map((d: any) => d.text_en) : []),
                        inflections,
                        entry: r,
                    };
                });

                const norm = (s: unknown) => String(s || '').trim().toLowerCase();
                const includesPattern = (candidate: unknown, expected: string) => {
                    if (!expected) return true;
                    return norm(candidate).includes(norm(expected));
                };

                const filtered = mapped.filter((result) => {
                    const entry = result.entry || {};
                    const isNonVerb = entry.pos !== 'verb';

                    const hasNonVerbFormFilters = Boolean(
                        lemmaPatternFilter || femininePatternFilter || masculinePatternFilter ||
                        vowelSetSgFilter || vowelSetOppFilter || vowelSetPlFilter
                    );

                    if (hasNonVerbFormFilters && !isNonVerb) return false;
                    if (!isNonVerb) return true;

                    const root = entry.root_pattern_form?.root?.consonants || entry.root_consonants || '';
                    const inferPattern = (surface: string, fallback = '') => {
                        if (!surface || !root) return fallback;
                        const inferred = derivePattern(surface, root);
                        return inferred || fallback;
                    };

                    const lemmaPattern = entry.cv_pattern || inferPattern(entry.lemma_base || entry.headword);
                    const femininePattern = entry.form_fem_pattern || inferPattern(entry.form_fem);
                    const masculinePattern = entry.form_masc_pattern || inferPattern(entry.form_masc);

                    const pluralForms = Array.isArray(entry.noun_plural_forms)
                        ? entry.noun_plural_forms
                        : (Array.isArray(entry.inflections_pl) ? entry.inflections_pl : []);
                    const pluralPatterns = [
                        entry.morph_pattern,
                        ...pluralForms.map((pf: string) => inferPattern(pf)).filter(Boolean),
                    ].filter(Boolean);

                    const matchesPluralPattern = !filters.pluralPattern || pluralPatterns.some((p) => includesPattern(p, filters.pluralPattern));

                    return (
                        includesPattern(lemmaPattern, lemmaPatternFilter) &&
                        includesPattern(femininePattern, femininePatternFilter) &&
                        includesPattern(masculinePattern, masculinePatternFilter) &&
                        matchesPluralPattern &&
                        includesPattern(entry.vowel_set_sg, vowelSetSgFilter) &&
                        includesPattern(entry.vowel_set_opp, vowelSetOppFilter) &&
                        includesPattern(entry.vowel_set_pl, vowelSetPlFilter)
                    );
                });

                setResults(filtered);
                setTotal(filtered.length);
            })
            .catch(err => {
                console.error("Advanced Search fetch error:", err);
                setResults([]);
            })
            .finally(() => setLoading(false));
    }, [searchParams.toString(), term, isSearchPerformed, filters.maxResults]);


    const [kbOpen, setKbOpen] = useState(false);
    const [showFiltersMobile, setShowFiltersMobile] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const kbRef = useRef<HTMLButtonElement>(null);

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        const params: Record<string, string> = { q: query.trim() };
        if (filters.pos) params.pos = filters.pos;
        if (filters.rootType) params.type = filters.rootType;
        if (filters.vowelSet) params.v = filters.vowelSet;
        if (filters.wizenPattern) params.wizen = filters.wizenPattern;
        if (filters.lemmaPattern) params.lp = filters.lemmaPattern;
        if (filters.femininePattern) params.fp = filters.femininePattern;
        if (filters.masculinePattern) params.mp = filters.masculinePattern;
        if (filters.pluralPattern) params.pp = filters.pluralPattern;
        if (filters.dualPattern) params.dp = filters.dualPattern;
        if (filters.vowelSetSg) params.vs_sg = filters.vowelSetSg;
        if (filters.vowelSetOpp) params.vs_opp = filters.vowelSetOpp;
        if (filters.vowelSetPl) params.vs_pl = filters.vowelSetPl;
        if (filters.source) params.source = filters.source;
        filters.rootRadicals.forEach((r, i) => {
            if (r) params[`r${i + 1}`] = r;
        });
        if (filters.isRegex) params.regex = 'true';
        if (filters.searchLemma) params.lemma = 'true';
        if (filters.searchWordForms) params.word_forms = 'true';
        if (filters.searchEnglishGloss) params.gloss = 'true';
        if (filters.includeSuggested) params.suggested = 'true';
        if (!filters.includePending) params.pending = 'false';
        setSearchParams(params);
        setShowFiltersMobile(false);
    };

    const insertChar = (char: string) => {
        const input = inputRef.current;
        if (!input) { setQuery(q => q + char); return; }
        const start = input.selectionStart ?? query.length;
        const end = input.selectionEnd ?? query.length;
        const next = query.slice(0, start) + char + query.slice(end);
        setQuery(next);
        requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(start + char.length, start + char.length);
        });
    };

    // Global Enter key listener
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                // If focus is NOT in another button or picker, trigger search
                if (document.activeElement?.tagName !== 'BUTTON' && document.activeElement?.tagName !== 'A') {
                    handleSearch();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [query, filters]);

    const setFilter = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) =>
        setFilters(f => ({ ...f, [key]: value }));

    const setRadical = (i: number, v: string) =>
        setFilters(f => {
            const next = [...f.rootRadicals];
            next[i] = v;
            return { ...f, rootRadicals: next };
        });

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}),
                 url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    const cvPatternLabel = term('cv-pattern');

    return (
        <div style={bgStyle}>
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8">

                {/* ── Page header ── */}
                <div className="mb-6">
                    {submitted ? (
                        <>
                            <h1 className="font-serif font-medium text-4xl leading-tight text-black">
                                {term('results-for').replace('{q}', submitted)}
                            </h1>
                            <p className="text-sm text-black/40 font-sans mt-1">
                                {term('entries-shown-simple').replace('{count}', total.toString())}
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="font-serif font-medium text-4xl leading-tight text-black">
                                {term('advanced-search-title')}
                            </h1>
                            <p className="text-sm text-black/40 font-sans mt-2">
                                {results.length > 0 && !submitted && !isSearchPerformed
                                    ? term('random-entries-desc')
                                    : term('advanced-search-desc')}
                            </p>
                        </>
                    )}
                </div>

                {/* ── Search bar ── */}
                <form onSubmit={handleSearch} className="w-full md:max-w-2xl mb-8 relative">
                    <div className="flex items-center bg-white border border-black/10 rounded-lg overflow-hidden shadow-sm">
                        {/* Keyboard toggle */}
                        <button
                            ref={kbRef}
                            type="button"
                            onClick={() => setKbOpen(o => !o)}
                            className={cn(
                                'flex items-center gap-1 px-3 border-r border-black/10 shrink-0 py-2.5 transition-colors',
                                kbOpen ? 'text-black bg-black/5' : 'text-[#555] hover:text-black',
                            )}
                            aria-label={term('toggle-picker')}
                        >
                            <Keyboard size={14} />
                            <span className="text-xs text-[#aaa]">›</span>
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={term('search') + '…'}
                            className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none font-sans text-black"
                            aria-label={term('search')}
                        />
                        <button
                            type="submit"
                            className="px-3 py-2.5 text-[#555] hover:text-black transition-colors shrink-0"
                            aria-label={term('search')}
                        >
                            <SearchIcon size={16} />
                        </button>
                    </div>
                    <MalteseCharPicker
                        open={kbOpen}
                        onOpenChange={setKbOpen}
                        onInsert={insertChar}
                        triggerRef={kbRef}
                    />

                    <div className="mt-3 px-1 space-y-3">
                        <FilterCheckbox
                            label={term('use-regular-expression') || 'Use Regular Expression'}
                            checked={filters.isRegex}
                            onChange={v => setFilter('isRegex', v)}
                        />
                        {filters.isRegex && (
                            <div className="bg-white/80 border border-black/10 rounded-md p-3 text-sm text-black/70 shadow-sm">
                                <p className="font-semibold mb-1 text-black">Regex Search Help</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Use <code className="bg-black/5 px-1 rounded text-[#1034A6]">^</code> to match the beginning of a word (e.g., <code className="bg-black/5 px-1 rounded text-[#1034A6]">^s.*</code>).</li>
                                    <li>Use <code className="bg-black/5 px-1 rounded text-[#1034A6]">$</code> to match the end of a word (e.g., <code className="bg-black/5 px-1 rounded text-[#1034A6]">.*iet$</code>).</li>
                                    <li>Use <code className="bg-black/5 px-1 rounded text-[#1034A6]">.</code> for any single character.</li>
                                    <li>Use <code className="bg-black/5 px-1 rounded text-[#1034A6]">.*</code> for any sequence of characters.</li>
                                    <li><i>Note: Full-text search sorting and fuzziness are disabled when Regex is active.</i></li>
                                </ul>
                            </div>
                        )}
                    </div>
                </form>

                {/* ── Two-column layout ── */}
                <div className="flex flex-col md:flex-row gap-8 md:items-start w-full">

                    {/* Filter Sidebar Container (Unified on Mobile) */}
                    <div className="w-full md:w-64 shrink-0 flex flex-col md:sticky md:top-20">
                        {/* Mobile Filter Toggle */}
                        <div className="md:hidden w-full">
                            <button
                                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                                className={cn(
                                    "w-full flex items-center justify-between bg-white border border-black/10 px-5 py-4 shadow-sm transition-all",
                                    showFiltersMobile ? "rounded-t-xl border-b-0" : "rounded-xl"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Filter size={18} className="text-[#1034A6]" />
                                    <span className="font-sans font-semibold text-sm text-black">
                                        {term('filter-options')}
                                    </span>
                                </div>
                                {showFiltersMobile ? <ChevronUp size={18} className="text-black/30" /> : <ChevronDown size={18} className="text-black/30" />}
                            </button>
                        </div>

                        {/* ── Filter sidebar ── */}
                        <aside className={cn(
                            "w-full bg-white border border-black/10 md:border-black/8 shadow-sm p-5 space-y-4 transition-all duration-300 overflow-hidden",
                            "md:rounded-xl md:block",
                            showFiltersMobile ? "rounded-b-xl block" : "hidden"
                        )}>
                            <h2 className="hidden md:block font-sans font-semibold text-sm text-black">
                                {term('filters')}
                            </h2>

                            <FilterSelect
                                label={term("max-results")}
                                value={filters.maxResults}
                                onChange={v => setFilter('maxResults', v)}
                                options={[
                                    { value: '10', label: '10' },
                                    { value: '25', label: '25' },
                                    { value: '50', label: '50' },
                                    { value: '100', label: '100' },
                                ]}
                            />

                            <FilterSelect
                                label={term("part-of-speech")}
                                value={filters.pos}
                                onChange={v => setFilter('pos', v)}
                                options={POS_FILTER_OPTIONS}
                            />

                            <FilterSelect
                                label={term("root") + " (" + term("form") + ")"}
                                value={filters.rootType}
                                onChange={v => setFilter('rootType', v)}
                                options={ROOT_TYPE_FILTER_OPTIONS}
                            />

                            <FilterSelect
                                label={term("source")}
                                value={filters.source}
                                onChange={v => setFilter('source', v)}
                                options={[
                                    { value: '', label: term('all') },
                                    { value: 'spagnol2011', label: 'Spagnol (2011)' },
                                    { value: 'mayer2013', label: 'Mayer (2013)' },
                                    { value: 'borg1997', label: 'Borg & Azzopardi-Alexander (1997)' },
                                    { value: 'maltese-academy', label: term('maltese-academy') },
                                ]}
                            />

                            <RootRadicalsInput
                                label={term('root-radicals')}
                                values={filters.rootRadicals}
                                onChange={setRadical}
                            />

                            <FilterText
                                label={cvPatternLabel}
                                value={filters.wizenPattern}
                                onChange={v => setFilter('wizenPattern', v)}
                                placeholder="e.g. CVCC"
                            />

                            <FilterHybrid
                                label={term('vowel-set')}
                                value={filters.vowelSet}
                                onChange={v => setFilter('vowelSet', v)}
                                placeholder="e.g. i–e"
                                options={['--a', '--e', '--i', '--o', '--u', 'i–e', 'a–a', 'a-e', 'i-a', 'ie-e', 'a–i', 'e-a', 'e-e', 'e-i', 'o–o', 'i-i', 'i-u', 'u-u']}
                            />

                            <FilterHybrid
                                label={term('dual-pattern')}
                                value={filters.dualPattern}
                                onChange={v => setFilter('dualPattern', v)}
                                options={['-ejn', '-ajn', '-tejn', '-tajn']}
                            />

                            <FilterHybrid
                                label={term('plural-pattern')}
                                value={filters.pluralPattern}
                                onChange={v => setFilter('pluralPattern', v)}
                                options={['-i', '-iet', '-at', '-ijiet', 'Break Plural']}
                            />

                            <FilterText
                                label={term('cv-pattern') + ' (' + term('singular') + ')'}
                                value={filters.lemmaPattern}
                                onChange={v => setFilter('lemmaPattern', v)}
                                placeholder="e.g. CVCVC"
                            />

                            <FilterText
                                label={term('cv-pattern') + ' (' + term('feminine') + ')'}
                                value={filters.femininePattern}
                                onChange={v => setFilter('femininePattern', v)}
                                placeholder="e.g. CVCVC"
                            />

                            <FilterText
                                label={term('cv-pattern') + ' (' + term('masculine') + ')'}
                                value={filters.masculinePattern}
                                onChange={v => setFilter('masculinePattern', v)}
                                placeholder="e.g. CVCVC"
                            />

                            <FilterText
                                label={term('vowel-set') + ' (' + term('singular') + ')'}
                                value={filters.vowelSetSg}
                                onChange={v => setFilter('vowelSetSg', v)}
                                placeholder="e.g. i-a"
                            />

                            <FilterText
                                label={term('vowel-set') + ' (' + term('feminine') + '/' + term('masculine') + ')'}
                                value={filters.vowelSetOpp}
                                onChange={v => setFilter('vowelSetOpp', v)}
                                placeholder="e.g. i-e"
                            />

                            <FilterText
                                label={term('vowel-set') + ' (' + term('plural') + ')'}
                                value={filters.vowelSetPl}
                                onChange={v => setFilter('vowelSetPl', v)}
                                placeholder="e.g. u-a"
                            />

                            <div className="border-t border-black/8 pt-4 space-y-2.5">
                                <FilterCheckbox
                                    label={term('search-lemma')}
                                    checked={filters.searchLemma}
                                    onChange={v => setFilter('searchLemma', v)}
                                />
                                <FilterCheckbox
                                    label={term('search-word-forms')}
                                    checked={filters.searchWordForms}
                                    onChange={v => setFilter('searchWordForms', v)}
                                />
                                <FilterCheckbox
                                    label={term('search-english-gloss')}
                                    checked={filters.searchEnglishGloss}
                                    onChange={v => setFilter('searchEnglishGloss', v)}
                                />
                                <FilterCheckbox
                                    label={term('include-suggested')}
                                    checked={filters.includeSuggested}
                                    onChange={v => setFilter('includeSuggested', v)}
                                />
                                <FilterCheckbox
                                    label={term('include-pending')}
                                    checked={filters.includePending}
                                    onChange={v => setFilter('includePending', v)}
                                />
                            </div>
                        </aside>
                    </div>

                    {/* ── Results area ── */}
                    <div className="flex-1 space-y-3 min-w-0 w-full">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white rounded-xl border border-black/5 h-24 animate-pulse" />
                                ))}
                            </div>
                        ) : results.length > 0 ? (
                            results.map((r, i) => (
                                <EntryCard key={r.id} result={r} index={i + 1} />
                            ))
                        ) : (
                            <div className="bg-white/50 rounded-xl border border-white/40 shadow-sm p-10 text-left">
                                <p className="text-sm text-black mb-2">
                                    {term('no-results-found').replace('{q}', submitted || '...')}
                                </p>
                                <p className="text-xs text-black/40 mt-1 mb-4">
                                    {term('include-suggested-desc')}
                                </p>
                                <p className="text-black/40 text-sm mb-6 max-w-md">
                                    {term('no-results-desc')}
                                </p>
                                <div className="flex items-center justify-end gap-3">
                                    <Link to={`/suggest?q=${submitted}`} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium">
                                        <MessageSquare size={16} />
                                        {term('suggest-entry')}
                                    </Link>
                                    <button
                                        onClick={() => setSearchParams({ random: 'true' })}
                                        className="flex items-center gap-2 px-4 py-2 border border-black/10 text-black rounded-lg hover:bg-black/5 transition-colors text-sm font-medium"
                                    >
                                        <Shuffle size={16} />
                                        {term('random')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
