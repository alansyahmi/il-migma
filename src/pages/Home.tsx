import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Search, Keyboard, Layers, FileText,
    Database, Globe, Settings,
    ArrowRight, PlusCircle, LayoutDashboard,
    Edit3
} from 'lucide-react';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@clerk/clerk-react';
import { Card } from '@/components/ui/Card';

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

export function Home() {
    const { t } = useLanguage();
    const { term } = useLinguisticMode();
    const { isAdmin } = useAuth();
    const { user } = useUser();
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const SEMITIC_ENTRIES = getSemiticEntries(t);
    const ROMANCE_ENTRIES = getRomanceEntries(t);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    };

    const [kbOpen, setKbOpen] = useState(false);
    const [kbOpen2, setKbOpen2] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const inputRef2 = useRef<HTMLInputElement>(null);
    const kbRef = useRef<HTMLButtonElement>(null);
    const kbRef2 = useRef<HTMLButtonElement>(null);

    const insertChar = (char: string, ref: React.RefObject<HTMLInputElement | null>) => {
        const input = ref.current;
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

    // ── ADMIN HOMEPAGE ──────────────────────────────────────────────────────
    if (isAdmin) {
        return (
            <div className="min-h-screen bg-[#F4F3F0]" style={bgStyle}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">

                    {/* Welcome Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-[#1034A6] font-medium text-sm tracking-widest uppercase mb-1">{t('Management Panel', 'Panil tal-Immaniġġjar')}</h2>
                            <h1 className="font-serif text-4xl font-bold text-black leading-tight">
                                {t(`Welcome back Admin ${user?.firstName}!`, `Merħba lura Admin ${user?.firstName}!`)}
                            </h1>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                to="/search"
                                className="px-4 py-2 bg-white border border-black/10 rounded-xl text-sm font-semibold hover:bg-black/5 transition-colors flex items-center gap-2"
                            >
                                <Globe size={16} /> {t('Live Site', 'Is-Sit tal-Live')}
                            </Link>
                            <Link
                                to="/admin"
                                className="px-4 py-2 bg-[#1034A6] text-white rounded-xl text-sm font-semibold hover:bg-[#0c268c] transition-colors flex items-center gap-2 shadow-lg shadow-[#1034A6]/20"
                            >
                                <Settings size={16} /> {t('Dashboard', 'Dashboard')}
                            </Link>
                        </div>
                    </div>

                    {/* Quick Stats / Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Database Control */}
                        <Card className="p-6 border-none shadow-sm bg-white/60 backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 text-[#1034A6]/10 group-hover:text-[#1034A6]/20 transition-colors">
                                <Database size={80} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Layers className="text-[#1034A6]" size={20} /> {t('Root Management', 'Ġestjoni tal-Għeruq')}
                            </h3>
                            <p className="text-sm text-black/60 mb-6">{t('Manage your consonants, etymology, and derived roots from one point.', 'Immaniġġja l-konsonanti, l-etimoloġija, u l-għeruq derivati tiegħek minn punt wieħed.')}</p>
                            <Link to="/admin?tab=roots" className="text-[#1034A6] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                {t('Open Root Management', 'Iftaħ Ġestjoni tal-Għeruq')} <ArrowRight size={14} />
                            </Link>
                        </Card>

                        {/* Entry Management */}
                        <Card className="p-6 border-none shadow-sm bg-white/60 backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 text-[#1034A6]/10 group-hover:text-[#1034A6]/20 transition-colors">
                                <FileText size={80} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <PlusCircle className="text-[#1034A6]" size={20} /> {t('Word Entries', 'Entrati tal-Kliem')}
                            </h3>
                            <p className="text-sm text-black/60 mb-6">{t('Add new words, update meanings and IPA in your library of 300k+ entries.', 'Żid kliem ġdid, aġġorna t-tifsiriet u l-IPA fil-librerija tiegħek ta\' 300k+ entrati.')}</p>
                            <Link to="/admin" className="text-[#1034A6] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                {t('Manage Entries', 'Immaniġġja l-Entrati')} <ArrowRight size={14} />
                            </Link>
                        </Card>

                        {/* Interactive Tools */}
                        <Card className="p-6 border-none shadow-sm bg-white/60 backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 text-[#1034A6]/10 group-hover:text-[#1034A6]/20 transition-colors">
                                <LayoutDashboard size={80} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Edit3 className="text-[#1034A6]" size={20} /> {t('Content and Blog', 'Kontenut u Blog')}
                            </h3>
                            <p className="text-sm text-black/60 mb-6">{t('Publish new articles and add usage examples to enhance the user experience.', 'Ippubblika artikli ġodda u żid eżempji ta\' użu biex ttejjeb l-esperjenza tal-utent.')}</p>
                            <Link to="/blog" className="text-[#1034A6] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                {t('Edit Blog', 'Editja Blog')} <ArrowRight size={14} />
                            </Link>
                        </Card>
                    </div>

                    {/* Bottom Section: Search Preview */}
                    <div className="bg-[#1034A6] rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 -mr-10 -mb-10 rotate-12">
                            <h1 className="font-serif text-[12rem] select-none">M</h1>
                        </div>
                        <div className="max-w-xl relative z-10">
                            <h2 className="text-2xl font-serif mb-4">{t('Quick-Search Verification', 'Verifikazzjoni Tiftix-Rapidu')}</h2>
                            <p className="text-white/70 text-sm mb-6">{t('Quickly search to verify if a word is already in the database before adding it.', 'Fittex malajr biex tivverifika jekk kelma hix diġà fid-database qabel ma żżidha.')}</p>
                            <form onSubmit={handleSearch} className="flex gap-2 relative">
                                <div className="flex-1 flex items-center bg-white/10 border border-white/20 rounded-xl overflow-hidden focus-within:bg-white/20 transition-all">
                                    <button
                                        ref={kbRef2}
                                        type="button"
                                        onClick={() => setKbOpen2(o => !o)}
                                        className={`flex items-center gap-1 px-3 border-r border-white/10 shrink-0 py-3 transition-colors ${kbOpen2 ? 'text-white bg-white/20' : 'text-white/60 hover:text-white'}`}
                                        aria-label={t('Toggle Maltese character picker', 'I togglja l-għażla tal-karattri Maltin')}
                                    >
                                        <Keyboard size={14} />
                                        <span className="text-xs text-white/30">›</span>
                                    </button>
                                    <input
                                        ref={inputRef2}
                                        type="text"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder={t('Search for a word...', 'Fittex kelma...')}
                                        className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-white/40 text-white"
                                    />
                                </div>
                                <button type="submit" className="bg-white text-[#1034A6] px-6 py-3 rounded-xl font-bold text-sm hover:brightness-110 transition-all shrink-0">
                                    {t('Check', 'Iċċekkja')}
                                </button>
                                <MalteseCharPicker
                                    open={kbOpen2}
                                    onOpenChange={setKbOpen2}
                                    onInsert={(c) => insertChar(c, inputRef2)}
                                    triggerRef={kbRef2}
                                />
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── PUBLIC HOMEPAGE ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen">
            <div style={bgStyle}>
                {/* Hero */}
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
                            onInsert={(c) => insertChar(c, inputRef)}
                            triggerRef={kbRef}
                        />
                    </form>

                    {/* Buttons */}
                    <div className="flex items-center justify-center gap-3">
                        <Link
                            to="/search"
                            className="bg-[#1034A6] text-white text-sm font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-[#0c268c] transition-colors shadow-lg shadow-[#1034A6]/20"
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

                {/* Categories */}
                <section className="px-4 sm:px-6 pb-16">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Semitic Entries */}
                        <div className="bg-white rounded-xl border border-black/8 p-6 shadow-sm">
                            <h2 className="font-sans text-base font-semibold mb-1" style={{ color: ARAB_GREEN }}>
                                {t('Semitic Entries', (term('entrati').charAt(0).toUpperCase() + term('entrati').slice(1)) + ' ' + term('Semitiku'))}
                            </h2>
                            <p className="text-xs text-[#666] mb-5 leading-snug">
                                {t('Over 10,000 entries with 100,000 inflected word forms.', `Aktar minn 10,000 ${term('entrati')} b'100,000 ${term('forma')} ta' kelma ${term('infletta')}.`)}
                            </p>
                            <div className="space-y-3">
                                {SEMITIC_ENTRIES.map((e: any) => (
                                    <div key={e.word}>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <Link to={`/entry/${e.slug}`} className="font-serif text-base font-semibold leading-none" style={{ color: ARAB_GREEN }}>
                                                {e.word}
                                            </Link>
                                            {e.altForm && <span className="text-xs text-[#555] font-serif">{e.altForm}</span>}
                                        </div>
                                        <p className="text-sm text-[#000] mt-0.5">{e.def}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Romance Entries */}
                        <div className="bg-white rounded-xl border border-black/8 p-6 shadow-sm">
                            <h2 className="font-sans text-base font-semibold mb-1" style={{ color: ROMAN_RED }}>
                                {t('Romance Entries', (term('entrati').charAt(0).toUpperCase() + term('entrati').slice(1)) + ' ' + term('Rumanz'))}
                            </h2>
                            <p className="text-xs text-[#666] mb-5 leading-snug">
                                {t('Over 10,000 entries with 98,000 inflected word forms.', `Aktar minn 10,000 ${term('entrati')} bi 98,000 ${term('forma')} ta' kelma ${term('infletta')}.`)}
                            </p>
                            <div className="space-y-3">
                                {ROMANCE_ENTRIES.map((e: any) => (
                                    <div key={e.word}>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <Link to={`/entry/${e.slug}`} className="font-serif text-base font-semibold leading-none" style={{ color: ROMAN_RED }}>
                                                {e.word}
                                            </Link>
                                            {e.altForm && <span className="text-xs text-[#555] font-serif">{e.altForm}</span>}
                                        </div>
                                        <p className="text-sm text-[#000] mt-0.5">{e.def}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* IPA & Audio */}
                        <div className="bg-white rounded-xl border border-black/8 p-6 shadow-sm">
                            <h2 className="font-sans text-base font-bold mb-1" style={{ color: IPA_GOLD }}>
                                {t('IPA & Audio Pronunciation', `IPA u ${term('Pronunzja')} b${term('l-Awdjo')}`)}
                            </h2>
                            <p className="text-xs text-[#666] leading-snug">
                                {t('Every term will have its own IPA and audio to help learners.', `Kull ${term('terminu')} se jkollu l-IPA u ${term('l-awdjo tiegħu')} biex jgħin lil dawk li jitgħallmu.`)}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
