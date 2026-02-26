import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { MOCK_ENTRIES } from '@/data/mockData';
import { generateRootForms, markGeneratedForms, type FormMarker } from '@/lib/rootGenerator';

const MAX_RADICALS = 4;

function MarkedCell({ data }: { data: { value: string; marker: FormMarker } }) {
    if (data.value === '-') return <span className="opacity-40">-</span>;
    if (data.marker === 'plain') {
        return (
            <Link to={`/search?q=${data.value}`} key={data.value} className="text-[#1034A6] hover:underline">
                {data.value}
            </Link>
        );
    }
    const mark = data.marker === 'theoretical' ? '*' : '✦';
    return (
        <span className="opacity-55 text-[#000]" title={data.marker === 'theoretical' ? 'Theoretical' : 'Auto-generated'}>
            {mark}{data.value}
        </span>
    );
}

function RootResultView({ rootRadicals }: { rootRadicals: string[] }) {
    // Unique matching roots by consonants string
    const matchingRootsMap = new Map<string, any>();

    MOCK_ENTRIES.forEach(e => {
        const r = e.root_pattern_form?.root;
        if (!r || !r.consonant_array) return;

        // Check each filled radical slot
        const isMatch = rootRadicals.every((rad, i) => {
            if (!rad) return true; // Slot not provided, any radical matches
            return r.consonant_array[i] === rad;
        });

        if (isMatch) {
            if (!matchingRootsMap.has(r.consonants)) {
                matchingRootsMap.set(r.consonants, {
                    rootObj: r,
                    verbs: []
                });
            }
            if (e.pos === 'verb') {
                matchingRootsMap.get(r.consonants).verbs.push(e);
            }
        }
    });

    const matchingRoots = Array.from(matchingRootsMap.values());

    if (matchingRoots.length === 0) {
        const joined = rootRadicals.filter(Boolean).join('-');
        if (!joined) return null; // Don't show anything if search is completely empty

        return (
            <div className="bg-white rounded-xl border border-black/8 shadow-sm p-6 mt-8 text-center max-w-2xl mx-auto">
                <p className="text-sm text-black/55">No attested data for root {joined}.</p>
                <Link to={`/root/${joined}`} className="text-xs font-semibold text-[#1034A6] mt-2 block hover:underline">
                    Attempt to view root page anyway →
                </Link>
            </div>
        );
    }

    const formLabels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'Xa', 'Xb'];

    return (
        <div className="bg-white rounded-xl border border-black/8 shadow-sm overflow-hidden mt-8 max-w-screen-xl mx-auto">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-black/5 border-b border-black/10 text-black/40">
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Root</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Class</th>
                            {formLabels.map(f => (
                                <th key={f} className="px-4 py-3 text-[10px] font-bold tracking-wider">{f}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matchingRoots.map(({ rootObj, verbs }) => {
                            const primaryVerb = verbs.find((v: any) => v.verb_morphology?.form === 'I') || verbs[0];
                            const vm = primaryVerb?.verb_morphology || { vowel_set_perfect: 'a-a', vowel_set_imperfect: 'i-a' };

                            const rawGen = generateRootForms(
                                rootObj.consonants,
                                rootObj.strength,
                                rootObj.weak_class,
                                vm.vowel_set_perfect || 'a-a',
                                vm.vowel_set_imperfect || 'i-a'
                            );

                            const attestedLabels = new Set<string>();
                            verbs.forEach((v: any) => {
                                if (v.verb_morphology?.perfective_3sg_m) attestedLabels.add(v.verb_morphology.perfective_3sg_m);
                                if (v.headword) attestedLabels.add(v.headword);
                                v.subentries?.forEach((s: any) => attestedLabels.add(s.headword));
                            });

                            const rowsData = markGeneratedForms(rawGen, attestedLabels);
                            const strengthLabel = rootObj.strength.toUpperCase();

                            return (
                                <tr key={rootObj.id || rootObj.consonants} className="hover:bg-black/[0.01] transition-colors border-b border-black/5 last:border-0">
                                    <td className="px-4 py-4">
                                        <Link to={`/root/${rootObj.consonants}`} className="font-serif font-bold text-lg text-[#000] hover:underline">
                                            {rootObj.consonants}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-[10px] bg-black/5 px-1.5 py-0.5 rounded text-black/50 font-bold tracking-wider">
                                            {strengthLabel}{rootObj.weak_class && ` • ${rootObj.weak_class.toUpperCase()}`}
                                        </span>
                                    </td>
                                    {formLabels.map(fl => {
                                        const rData = rowsData.find(r => r.form === fl);
                                        return (
                                            <td key={fl} className="px-4 py-4 text-sm font-serif min-w-[60px]">
                                                {rData ? <MarkedCell data={rData.perfect} /> : '—'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
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
        <div className="flex flex-col items-center">
            <p className="text-xs font-medium text-[#000] mb-2">{label}</p>
            <div className="flex gap-2">
                {values.map((v, i) => (
                    <input
                        key={i}
                        type="text"
                        maxLength={2}
                        value={v}
                        onChange={e => onChange(i, e.target.value)}
                        className="w-12 h-12 text-center bg-white border border-black/10 rounded-lg text-lg text-[#000] font-serif shadow-sm focus:outline-none focus:border-[#1034A6] focus:ring-1 focus:ring-[#1034A6]"
                        placeholder="—"
                    />
                ))}
            </div>
        </div>
    );
}

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

export function RootSearch() {
    const { t } = useLanguage();
    const { term } = useLinguisticMode();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Parse filters from URL
    const parseRadicals = () => {
        const rads = Array(MAX_RADICALS).fill('');
        for (let i = 0; i < MAX_RADICALS; i++) {
            rads[i] = searchParams.get(`r${i + 1}`) || '';
        }
        return rads;
    };

    const [rootRadicals, setRootRadicals] = useState<string[]>(parseRadicals());
    const [searchedRadicals, setSearchedRadicals] = useState<string[]>(parseRadicals());
    const [hasSearched, setHasSearched] = useState(false);

    // Sync with URL changes (e.g., back navigation)
    useEffect(() => {
        const rads = parseRadicals();
        setRootRadicals(rads);
        setSearchedRadicals(rads);
        const hasContent = rads.some(r => r.trim() !== '');
        if (hasContent) {
            setHasSearched(true);
        }
    }, [searchParams]);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Sync to URL
        const params = new URLSearchParams();
        rootRadicals.forEach((rad, i) => {
            if (rad.trim()) params.set(`r${i + 1}`, rad.trim());
        });

        // Use Navigate instead of direct history manipulation so router knows
        navigate(`/root-search?${params.toString()}`);
        setSearchedRadicals([...rootRadicals]);
        setHasSearched(true);
    };

    // Global Enter key listener for root search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const target = e.target as HTMLElement;
                const isFormInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

                // Allow enter to trigger search if not focused on another interactive element,
                // OR if focused on one of the root radical inputs.
                if (!isFormInput || target.closest('.root-radical-input-group')) {
                    e.preventDefault();
                    handleSearch();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [rootRadicals]);

    const handleRootRadicalChange = (index: number, val: string) => {
        const newRads = [...rootRadicals];
        newRads[index] = val.toLowerCase();
        setRootRadicals(newRads);
    };

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}),
                 url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: 'calc(100vh - 56px)', // Adjust for navbar height (h-14 = 56px)
    };

    return (
        <div style={bgStyle}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
                <h1 className="text-3xl font-serif font-bold text-[#000] mb-2 text-center">
                    {t('Root Search', term('Tiftix tal-Għeruq'))}
                </h1>
                <p className="text-sm text-black/60 mb-8 max-w-2xl mx-auto text-center leading-relaxed">
                    {t('Explore the morphological derivation of verbs and nouns from their base triliteral and quadriliteral roots. Enter consonants below to find matching root families.',
                        'Esplora d-derivazzjoni morfoloġika ta\' verbi u nomi mill-għeruq bażiċi trilitteri u kwadrilitteri. Daħħal il-konsonanti hawn taħt biex issib familji ta\' għeruq kompatibbli.')}
                </p>

                {/* Horizontal Filter Bar */}
                <div className="bg-[#F4F3F0] border border-[#d8cfc0] rounded-xl p-6 shadow-sm max-w-2xl mx-auto mb-8">
                    <form onSubmit={handleSearch} className="root-radical-input-group flex flex-col items-center gap-6">
                        <RootRadicalsInput
                            label={t('Root Radicals', 'Konsonanti tal-Għerq')}
                            values={rootRadicals}
                            onChange={handleRootRadicalChange}
                        />

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setRootRadicals(Array(MAX_RADICALS).fill(''));
                                    navigate('/root-search');
                                    setHasSearched(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-black/60 bg-white border border-[#d8cfc0] rounded-md hover:bg-black/5 transition-colors"
                            >
                                {t('Clear', 'Naddaf')}
                            </button>
                            <button
                                type="submit"
                                className="bg-[#1034A6] text-white px-8 py-2 rounded-md font-medium text-sm hover:bg-[#1034A6]/90 transition-colors shadow-sm"
                            >
                                {t('Search Roots', 'Fittex l-Għeruq')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Results Area (Full Width) */}
                {hasSearched && (
                    <RootResultView rootRadicals={searchedRadicals} />
                )}
            </div>
        </div>
    );
}
