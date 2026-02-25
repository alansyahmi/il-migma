import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';

// ── Colour tokens ──────────────────────────────────────────────────────────
const CREAM_RGBA = 'rgba(244,243,240,0.88)';

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
            <p className="text-xs font-medium text-[#000] mb-1.5">{label}</p>
            <div ref={ref} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between bg-white border border-black/10 rounded-md px-3 py-2 text-sm text-[#000] focus:outline-none focus:ring-1 focus:ring-black/20 cursor-pointer text-left"
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
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-black/10 rounded-md shadow-md overflow-hidden text-sm">
                        {options.map(o => (
                            <li
                                key={o.value}
                                onClick={() => { onChange(o.value); setOpen(false); }}
                                className={cn(
                                    'px-3 py-2 cursor-pointer hover:bg-black/5 transition-colors',
                                    o.value === value ? 'font-medium text-[#000]' : 'text-[#333]',
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
            <p className="text-xs font-medium text-[#000] mb-1.5">{label}</p>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white border border-black/10 rounded-md px-3 py-2 text-sm text-[#000] focus:outline-none focus:ring-1 focus:ring-black/20 placeholder:text-black/25"
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
                    checked ? 'bg-[#000] border-[#000]' : 'bg-white border-black/25',
                )}
                onClick={() => onChange(!checked)}
            >
                {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
            <span className="text-sm text-[#000]">{label}</span>
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
            <p className="text-xs font-medium text-[#000] mb-1.5">{label}</p>
            <div ref={ref} className="relative group">
                <div className="flex items-center bg-white border border-black/10 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-black/20">
                    <input
                        type="text"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-2 text-sm text-[#000] focus:outline-none placeholder:text-black/25 min-w-0"
                    />
                    <button
                        type="button"
                        onClick={() => setOpen(o => !o)}
                        className="px-2 py-2 text-[#999] hover:text-[#000] border-l border-black/5 transition-colors"
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
            <p className="text-xs font-medium text-[#000] mb-1.5">{label}</p>
            <div className="flex gap-1.5">
                {values.map((v, i) => (
                    <input
                        key={i}
                        type="text"
                        maxLength={2}
                        value={v}
                        onChange={e => onChange(i, e.target.value)}
                        className="w-10 text-center bg-white border border-black/10 rounded-md px-1 py-2 text-sm text-[#000] focus:outline-none focus:ring-1 focus:ring-black/20"
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
    searchLemma: boolean;
    searchWordForms: boolean;
    searchEnglishGloss: boolean;
    includeSuggested: boolean;
    includePending: boolean;
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
    searchLemma: false,
    searchWordForms: false,
    searchEnglishGloss: false,
    includeSuggested: false,
    includePending: true,
};

export function AdvancedSearch() {
    const { t } = useLanguage();
    const { term } = useLinguisticMode();
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') ?? '');
    const [submitted, setSubmitted] = useState(searchParams.get('q') ?? '');
    const [filters, setFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);

    useEffect(() => {
        const q = searchParams.get('q') ?? '';
        setQuery(q);
        setSubmitted(q);
    }, [searchParams]);

    const [kbOpen, setKbOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const kbRef = useRef<HTMLButtonElement>(null);

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) setSearchParams({ q: query.trim() });
    };

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

    const cvPatternLabel = term('mudell-cv');

    return (
        <div style={bgStyle}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

                {/* ── Page header ── */}
                <div className="mb-6">
                    {submitted ? (
                        <>
                            <h1 className="font-serif font-medium text-[2rem] leading-tight text-[#000]">
                                {t(`Results for '${submitted}'`, `Riżultati għal '${submitted}'`)}
                            </h1>
                            <p className="text-sm text-black/40 mt-0.5">
                                {t('0 of 0 entries shown', '0 minn 0 entrati murija')}
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="font-serif font-medium text-[2rem] leading-tight text-[#000]">
                                {t('Advanced Search', term('advanced-search'))}
                            </h1>
                            <p className="text-sm text-black/40 mt-0.5">
                                {t(
                                    'Utilise our advanced search function to narrow down the search further.',
                                    'Uża l-funzjoni tat-tiftix avvanzat sabiex tnaqqas ir-riżultati.'
                                )}
                            </p>
                        </>
                    )}
                </div>

                {/* ── Search bar ── */}
                <form onSubmit={handleSearch} className="max-w-2xl mb-8 relative">
                    <div className="flex items-center bg-white border border-black/10 rounded-lg overflow-hidden shadow-sm">
                        {/* Keyboard toggle */}
                        <button
                            ref={kbRef}
                            type="button"
                            onClick={() => setKbOpen(o => !o)}
                            className={cn(
                                'flex items-center gap-1 px-3 border-r border-black/10 shrink-0 py-2.5 transition-colors',
                                kbOpen ? 'text-[#000] bg-black/5' : 'text-[#555] hover:text-[#000]',
                            )}
                            aria-label={t('Toggle Maltese character picker', 'I togglja l-għażla tal-karattri Maltin')}
                        >
                            <Keyboard size={14} />
                            <span className="text-xs text-[#aaa]">›</span>
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={t('Search…', 'Fittex…')}
                            className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none font-sans text-[#000]"
                            aria-label={t('Search the dictionary', 'Fittex fid-dizzjunarju')}
                        />
                        <button
                            type="submit"
                            className="px-3 py-2.5 text-[#555] hover:text-[#000] transition-colors shrink-0"
                            aria-label={t('Search', 'Fittex')}
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
                </form>

                {/* ── Two-column layout ── */}
                <div className="flex gap-6 items-start">

                    {/* ── Filter sidebar ── */}
                    <aside className="w-56 shrink-0 bg-white rounded-xl border border-black/8 shadow-sm p-5 space-y-4 sticky top-20">
                        <h2 className="font-sans font-semibold text-sm text-[#000]">
                            {t('Filters', 'Filtri')}
                        </h2>

                        <FilterSelect
                            label={t('Maximum Results Shown', term('Massimu ta\' Riżultati'))}
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
                            label={t('Part-of-Speech', term('parti tad-diskors'))}
                            value={filters.pos}
                            onChange={v => setFilter('pos', v)}
                            options={[
                                { value: '', label: t('All', 'Kollox') },
                                { value: 'verb', label: t('Verb', term('verb')) },
                                { value: 'noun', label: t('Noun', term('nom')) },
                                { value: 'adj', label: t('Adjective', term('aġġettiv')) },
                                { value: 'adv', label: t('Adverb', term('avverbju')) },
                                { value: 'prep', label: t('Preposition', term('prepożizzjoni')) },
                                { value: 'conj', label: t('Conjunction', term('konġunzjoni')) },
                                { value: 'particle', label: t('Particle', term('partiklu')) },
                                { value: 'pronoun', label: t('Pronoun', term('pronom')) },
                            ]}
                        />

                        <FilterSelect
                            label={t('Root Type', ('Tip ta\' ' + term('Għerq')))}
                            value={filters.rootType}
                            onChange={v => setFilter('rootType', v)}
                            options={[
                                { value: '', label: t('All', 'Kollox') },
                                { value: 'strong', label: t('Strong', 'Sħiħ') },
                                { value: 'weak', label: t('Weak', term('Dgħajjef')) },
                                { value: 'weak initial', label: t('Weak Initial', 'Xebbiehi') },
                                { value: 'weak medial', label: t('Weak Medial', 'Moħfi') },
                                { value: 'weak final', label: t('Weak Final', 'Nieqes') },
                                { value: 'geminated', label: t('Geminated', term('Trux')) },
                            ]}
                        />

                        <FilterSelect
                            label={t('Source', term('sors'))}
                            value={filters.source}
                            onChange={v => setFilter('source', v)}
                            options={[
                                { value: '', label: t('All', 'Kollox') },
                                { value: 'spagnol2011', label: 'Spagnol (2011)' },
                                { value: 'mayer2013', label: 'Mayer (2013)' },
                                { value: 'borg1997', label: 'Borg & Azzopardi-Alexander (1997)' },
                                { value: 'maltese_academy', label: t('Maltese Academy', 'Akkademja Maltija') },
                            ]}
                        />

                        <RootRadicalsInput
                            label={t('Root Radicals', term('Konsonanti tal-Għerq'))}
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
                            label={t('Vowel Set', 'Sett ta\' Vokali')}
                            value={filters.vowelSet}
                            onChange={v => setFilter('vowelSet', v)}
                            placeholder="e.g. i–e"
                            options={['--a', '--e', '--i', '--o', '--u', 'i–e', 'a–a', 'a-e', 'i-a', 'ie-e', 'a–i', 'e-a', 'e-e', 'e-i', 'o–o', 'i-i', 'i-u', 'u-u']}
                        />

                        <FilterHybrid
                            label={t('Dual Pattern', term('Mudell tal-Imtenni'))}
                            value={filters.dualPattern}
                            onChange={v => setFilter('dualPattern', v)}
                            options={['-ejn', '-ajn', '-tejn', '-tajn']}
                        />

                        <FilterHybrid
                            label={t('Plural Pattern', term('Mudell tal-Plural'))}
                            value={filters.pluralPattern}
                            onChange={v => setFilter('pluralPattern', v)}
                            options={['-i', '-iet', '-at', '-ijiet', 'Break Plural']}
                        />

                        <div className="border-t border-black/8 pt-4 space-y-2.5">
                            <FilterCheckbox
                                label={t('Search lemma', 'Fittex il-lemma')}
                                checked={filters.searchLemma}
                                onChange={v => setFilter('searchLemma', v)}
                            />
                            <FilterCheckbox
                                label={t('Search word forms only', 'Fittex forom tal-kelma biss')}
                                checked={filters.searchWordForms}
                                onChange={v => setFilter('searchWordForms', v)}
                            />
                            <FilterCheckbox
                                label={t('Search in English gloss only', 'Fittex fil-gloss bl-Ingliż biss')}
                                checked={filters.searchEnglishGloss}
                                onChange={v => setFilter('searchEnglishGloss', v)}
                            />
                            <FilterCheckbox
                                label={t('Include suggested results', 'Inkludi riżultati suġġeriti')}
                                checked={filters.includeSuggested}
                                onChange={v => setFilter('includeSuggested', v)}
                            />
                            <FilterCheckbox
                                label={t('Include pending entries', 'Inkludi entrati pendenti')}
                                checked={filters.includePending}
                                onChange={v => setFilter('includePending', v)}
                            />
                        </div>
                    </aside>

                    {/* ── Results area ── */}
                    <div className="flex-1 min-w-0">
                        {submitted ? (
                            <div className="bg-white/50 rounded-xl border border-white/40 shadow-sm p-10 text-right">
                                <p className="text-sm text-[#000] mb-2">
                                    {t(`No results found for '${submitted}'.`, `L-ebda riżultat ma nstab għal '${submitted}'.`)}
                                    {' '}
                                    {t("Try the 'include suggested results' option in the filter.", "Ipprova l-għażla 'inkludi riżultati ssuġġerew' fil-filtru.")}
                                </p>
                                <p className="text-sm text-[#000] mb-8">
                                    {t("If you think this is a mistake, feel free to suggest this term into the database.", "Jekk taħseb li dan huwa żball, tħossok liberu li tissuġġerixxi dan it-terminu fid-database.")}
                                </p>
                                <div className="flex items-center justify-end gap-3">
                                    <Link
                                        to="/suggest"
                                        className="bg-[#1034A6] text-white text-sm font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-[#0c268c] transition-colors"
                                    >
                                        {t('Suggest Entry', term('suggest-entry'))}
                                    </Link>
                                    <button
                                        className="bg-white text-[#000] text-sm font-sans font-medium px-5 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                                    >
                                        {t('Random Entry', (term('entrata').charAt(0).toUpperCase() + term('entrata').slice(1)) + " " + term('Każwali'))}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/50 rounded-xl border border-white/40 shadow-sm p-10 text-right">
                                <p className="text-sm text-black/30">
                                    {t(
                                        'Enter a search query and apply filters to begin.',
                                        'Daħħal query tat-tiftix u applika l-filtri biex tibda.'
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
