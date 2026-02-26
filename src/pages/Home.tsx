import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Keyboard } from 'lucide-react';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';

// ── Colour tokens ──────────────────────────────────────────────────────────
const ARAB_GREEN = '#006233';  // Semitic entries
const ROMAN_RED = '#8E001C';  // Romance entries
const IPA_GOLD = '#A07030';  // IPA & Audio

// ── Limestone Ochre background (rgba for gradient overlay) ─────────────────
const CREAM_RGBA = 'rgba(244,243,240,0.88)';

// ── Featured entry data ────────────────────────────────────────────────────
const getSemiticEntries = (t: (en: string, mt: string) => string) => [
    { word: "wasa'", altForm: "(wiesa')", def: t("wide; broad; spacious", "Xi ħadd jew xi ħaġa li għandu wisa."), slug: 'wasa' },
    { word: 'kiteb', altForm: '', def: t('to write', "Jifforma ittri, kliem jew simboli fuq xi wiċċ sabiex jikkomunika."), slug: 'kiteb' },
    { word: "għomor", altForm: '', def: t("age, one's lifetime", 'Età, il-ħajja ta’ wieħed.'), slug: 'ghomor' },
];

const getRomanceEntries = (t: (en: string, mt: string) => string) => [
    { word: 'rringrazzja', altForm: '', def: t('to give thanks', 'Jagħti grazzi lil xi ħadd.'), slug: 'rringrazzja' },
    { word: 'università', altForm: '', def: t('university', "Istituzzjoni ta' edukazzjoni għolja li tipprovdi faċilitajiet għat-tagħlim, ir-riċerka, u l-għoti ta' gradi akkademiċi fil-livelli ta' undergraduate, postgraduate, u spiss professjonali."), slug: 'universita' },
    { word: 'lealtà', altForm: '', def: t('loyalty', "L-istat ta' jkun leali jew fidil."), slug: 'lealta' },
];

// ── Component ──────────────────────────────────────────────────────────────
export function Home() {
    const { t } = useLanguage();
    const { term } = useLinguisticMode();
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const SEMITIC_ENTRIES = getSemiticEntries(t);
    const ROMANCE_ENTRIES = getRomanceEntries(t);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    };

    const [kbOpen, setKbOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const kbRef = useRef<HTMLButtonElement>(null);

    const insertChar = (char: string) => {
        const input = inputRef.current;
        if (!input) { setQuery(q => q + char); return; }
        const start = input.selectionStart ?? query.length;
        const end = input.selectionEnd ?? query.length;
        setQuery(query.slice(0, start) + char + query.slice(end));
        requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(start + char.length, start + char.length);
        });
    };

    const handleRandom = () => navigate('/search?q=a&random=1');

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}),
                 url("/bg-pattern.png") center/cover no-repeat`,
    };

    return (
        <div className="min-h-screen">
            {/*
        ── Single background wrapper: hero + cards sit together on the pattern.
        ── Footer sits outside this div on Limestone Ochre.
      */}
            <div style={bgStyle}>

                {/* ── Hero ─────────────────────────────────────────────────────── */}
                <section className="text-center px-4 pt-16 pb-14 sm:pt-20 sm:pb-16 max-w-2xl mx-auto">
                    <h1 className="font-serif font-medium text-[2.6rem] sm:text-[3.2rem] leading-tight text-[#000] mb-3">
                        {t('A Comprehensive Digital', `${term('Dizzjunarju')} ${term('Komprensiv')}`)}<br />{t('Maltese-English Dictionary', `Malti-Ingliż ${term('Diġitali')}`)}
                    </h1>
                    <p className="text-[#4a4a4a] text-sm leading-relaxed max-w-lg mx-auto mb-10">
                        {t(
                            'An ever-growing online tool for learners and researchers to the meaning, history, and usage of over 300,000 words in Maltese and its dialects.',
                            `Għodda ${term('online')} li dejjem tikber għal dawk li jitgħallmu u għall-${term('researchers')} dwar it-tifsira, l-istorja u l-użu ta' aktar minn 300,000 kelma bil-Malti u l-${term('dialects')} tiegħu.`
                        )}
                    </p>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="max-w-md mx-auto mb-5 relative">
                        <div className="flex items-center bg-white border border-black/10 rounded-lg overflow-hidden shadow-sm">
                            <button
                                ref={kbRef}
                                type="button"
                                onClick={() => setKbOpen(o => !o)}
                                className={`flex items-center gap-1 px-3 border-r border-black/10 shrink-0 py-2.5 transition-colors ${kbOpen ? 'text-[#000] bg-black/5' : 'text-[#555] hover:text-[#000]'}`}
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
                                className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none font-sans text-[#000]"
                                aria-label={t('Search the dictionary', 'Fittex fid-dizzjunarju')}
                                placeholder={t('Search…', 'Fittex…')}
                            />
                            <button
                                type="submit"
                                className="px-3 py-2.5 text-[#555] hover:text-[#000] transition-colors shrink-0"
                                aria-label={t('Search', 'Fittex')}
                            >
                                <Search size={16} />
                            </button>
                        </div>
                        <MalteseCharPicker
                            open={kbOpen}
                            onOpenChange={setKbOpen}
                            onInsert={insertChar}
                            triggerRef={kbRef}
                        />
                    </form>

                    {/* Buttons */}
                    <div className="flex items-center justify-center gap-3">
                        <Link
                            to="/search"
                            className="bg-[#1034A6] text-white text-sm font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-[#0c268c] transition-colors"
                        >
                            {t('Browse Entries', 'Ifli l-' + (term('entrati').charAt(0).toUpperCase() + term('entrati').slice(1)))}
                        </Link>
                        <button
                            onClick={handleRandom}
                            className="bg-white text-[#000] text-sm font-sans font-medium px-5 py-2.5 rounded-lg border border-black/15 hover:bg-black/5 transition-colors"
                        >
                            {t('Random Entry', (term('entrata').charAt(0).toUpperCase() + term('entrata').slice(1)) + " " + term('Każwali'))}
                        </button>
                    </div>
                </section>

                {/* ── Category Cards ────────────────────────────────────────────── */}
                <section className="px-4 sm:px-6 pb-16">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">

                        {/* Semitic Entries */}
                        <div className="bg-white rounded-xl border border-black/8 p-6 shadow-sm">
                            <h2
                                className="font-sans text-base font-semibold mb-1"
                                style={{ color: ARAB_GREEN }}
                            >
                                {t('Semitic Entries', (term('entrati').charAt(0).toUpperCase() + term('entrati').slice(1)) + ' ' + term('Semitiku'))}
                            </h2>
                            <p className="text-xs text-[#666] mb-5 leading-snug">
                                {t(
                                    'Over 10,000 entries with 100,000 inflected word forms.',
                                    `Aktar minn 10,000 ${term('entrati')} b'100,000 ${term('forma')} ta' kelma ${term('infletta')}.`
                                )}
                            </p>
                            <div className="space-y-3">
                                {SEMITIC_ENTRIES.map(e => (
                                    <div key={e.word}>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <Link
                                                to={`/entry/${e.slug}`}
                                                className="font-serif text-base font-semibold leading-none"
                                                style={{ color: ARAB_GREEN }}
                                            >
                                                {e.word}
                                            </Link>
                                            {e.altForm && (
                                                <span className="text-xs text-[#555] font-serif">{e.altForm}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[#000] mt-0.5">{e.def}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Romance Entries */}
                        <div className="bg-white rounded-xl border border-black/8 p-6 shadow-sm">
                            <h2
                                className="font-sans text-base font-semibold mb-1"
                                style={{ color: ROMAN_RED }}
                            >
                                {t('Romance Entries', (term('entrati').charAt(0).toUpperCase() + term('entrati').slice(1)) + ' ' + term('Rumanz'))}
                            </h2>
                            <p className="text-xs text-[#666] mb-5 leading-snug">
                                {t(
                                    'Over 10,000 entries with 98,000 inflected word forms.',
                                    `Aktar minn 10,000 ${term('entrati')} bi 98,000 ${term('forma')} ta' kelma ${term('infletta')}.`
                                )}
                            </p>
                            <div className="space-y-3">
                                {ROMANCE_ENTRIES.map(e => (
                                    <div key={e.word}>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <Link
                                                to={`/entry/${e.slug}`}
                                                className="font-serif text-base font-semibold leading-none"
                                                style={{ color: ROMAN_RED }}
                                            >
                                                {e.word}
                                            </Link>
                                            {e.altForm && (
                                                <span className="text-xs text-[#555] font-serif">{e.altForm}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[#000] mt-0.5">{e.def}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* IPA & Audio */}
                        <div className="bg-white rounded-xl border border-black/8 p-6 shadow-sm">
                            <h2
                                className="font-sans text-base font-bold mb-1"
                                style={{ color: IPA_GOLD }}
                            >
                                {t('IPA & Audio Pronunciation', `IPA u ${term('Pronunzja')} b${term('l-Awdjo')}`)}
                            </h2>
                            <p className="text-xs text-[#666] leading-snug">
                                {t(
                                    'Every term will have its own IPA and audio to help learners.',
                                    `Kull ${term('terminu')} se jkollu l-IPA u ${term('l-awdjo tiegħu')} biex jgħin lil dawk li jitgħallmu.`
                                )}
                            </p>
                        </div>

                    </div>
                </section>

            </div>{/* end background wrapper */}
        </div>
    );
}
