import type { LinguisticMode } from '@/types';

// ─── Terminology Map ───────────────────────────────────────────────────────
// Maps a term key to its Standard and Arabised Maltese equivalents.
// Standard column: English or Standard Maltese linguistic term.
// Arabised column: Arabised Maltese calque / borrowed term.

export const TERMINOLOGY: Record<string, { standard: string; arabised: string }> = {
    // Example: (term('entrati').charAt(0).toUpperCase() + term('entrati').slice(1))
    // Morphological patterns
    'cv-pattern': { standard: 'CV Pattern', arabised: 'Wiżen Pattern' },
    'mudell-cv': { standard: "Mudell ta' CV", arabised: "Xbieha ta' Wiżen" },
    'demonym': { standard: 'Demonym', arabised: 'Nisba' },
    // TODO: confirm Ġidra vs Ġadar for root
    'Għerq': { standard: 'Għerq', arabised: 'Ġidra' },
    'Dgħajjef': { standard: 'Dgħajjef', arabised: 'Magħlul' },
    'Trux': { standard: 'Trux', arabised: 'Imżewweġ' },
    'FORMA': { standard: 'FORMA', arabised: 'SURA' },

    // Parts of Speech
    'verb': { standard: 'Verb', arabised: 'Fagħal' },
    'nom': { standard: 'Nom', arabised: 'Isem' },
    'aġġettiv': { standard: 'Aġġettiv', arabised: 'Isem Fissieri' },
    'avverbju': { standard: 'Avverbju', arabised: 'Għatu' },
    'partiklu': { standard: 'Partiklu', arabised: 'Ntejfa' },
    'prepożizzjoni': { standard: 'Prepożizzjoni', arabised: 'Ntejfa Ġarrari' },
    'konġunzjoni': { standard: 'Konġunzjoni', arabised: 'Ntejfa Għaqqadi' },
    'artiklu': { standard: 'Artiklu', arabised: 'Għodda tat-Tagħrif' },
    'interrogattiv': { standard: 'Interrogattiv', arabised: 'Għodda Saqsejja' },
    'pronom': { standard: 'Pronom', arabised: 'Dmir' },
    'partiċipju': { standard: 'Partiċipju', arabised: 'Xerriek' },
    'numerali': { standard: 'Numerali', arabised: 'Għaddi' },
    'interjezzjoni': { standard: 'Interjezzjoni', arabised: 'Tagħġiba' },

    // Morphosyntactic categories
    'parti tad-diskors': { standard: 'Parti tad-Diskors', arabised: 'Qasam tat-Tħaddit' },
    'Tabella tal-': { standard: 'Tabella tal-', arabised: 'Tabella tat-' },
    'konjugazzjoni': { standard: 'Konjugazzjoni', arabised: 'Tisrif' },
    'sintassi': { standard: 'Sintassi', arabised: 'Naħu' },
    'sentenza': { standard: 'Sentenza', arabised: 'Sensiela tal-Kliem Sħiħ' },

    // Affixes
    'prefiss': { standard: 'Prefiss', arabised: 'Qagħda Quddimija' },
    'suffiss': { standard: 'Suffiss', arabised: 'Qagħda Warranija' },

    // Number
    'singular': { standard: 'Singular', arabised: 'Fard' },
    'plural': { standard: 'Plural', arabised: 'Ġmigħ' },
    //'dual': { standard: 'Dual', arabised: 'Mtenni' },

    // Gender
    'maskili': { standard: 'maskili', arabised: 'mdakkar' },
    'femminil': { standard: 'femminil', arabised: 'mmarri' },

    // Phonology
    'konsonanti': { standard: 'konsonanti', arabised: 'ħossi' },
    'vokali': { standard: 'vokali', arabised: 'leħni' },

    // Grammar roles
    'suġġett': { standard: 'suġġett', arabised: 'fiegħel' },
    'oġġett': { standard: 'oġġett', arabised: 'mifgħul' },

    // UI labels
    'search': { standard: 'Search', arabised: 'Tfittxija' },
    'definitions': { standard: 'Definitions', arabised: 'Tifsiriet' },
    'etymology': { standard: 'Etymology', arabised: 'Oriġini' },
    'examples': { standard: 'Examples', arabised: 'Eżempji' },
    'dialect': { standard: 'Dialect', arabised: 'Djalett' },
    'reliability': { standard: 'Reliability', arabised: 'Affidabilità' },
    'sors': { standard: 'Sors', arabised: "Mirġgħa" },
    'sorsi': { standard: 'Sorsi', arabised: "Imrieġa'" },
    'Massimu ta\' Riżultati': { standard: 'Massimu ta\' Riżultati', arabised: 'L-ogħla ta\' Ħsiliet' },
    'Tabella ta\'': { standard: 'Tabella tal-', arabised: 'Tabella tat-' },
    'Arabic': { standard: 'Għarbi', arabised: 'Għarbi' },
    'Sicilian': { standard: 'Sqalli', arabised: 'Sqalli' },
    'Italian': { standard: 'Taljan', arabised: 'Taljan' },
    'Latin': { standard: 'Latin', arabised: 'Latini' },
    'French': { standard: 'Franċiż', arabised: 'Franċiż' },
    'English': { standard: 'Ingliż', arabised: 'Ingliż' },
    'Spanish': { standard: 'Spanjol', arabised: 'Spanjol' },
    'Berber': { standard: 'Berberu', arabised: 'Berberu' },
    'Greek': { standard: 'Grieg', arabised: 'Grieg' },

    // Dictionary UI components
    "Semitiku": { standard: 'Semitiku', arabised: 'Siemi' },
    "Rumanz": { standard: 'Rumanz', arabised: 'Rumanzi' },
    "Semitika": { standard: 'Semitika', arabised: 'Semija' },
    "Rumanza": { standard: 'Rumanza', arabised: 'Rumanzija' },
    "l-awdjo tiegħu": { standard: 'l-awdjo tiegħu', arabised: 'ħossu' },
    "l-Awdjo": { standard: 'l-Awdjo', arabised: 'il-Ħoss' },
    "Pronunzja": { standard: 'Pronunzja', arabised: 'Tlissin' },
    'entrata': { standard: 'entrata', arabised: 'madħla' },
    'entrati': { standard: 'entrati', arabised: 'madħliet' },
    'forma': { standard: 'forma', arabised: 'sura' },
    'infletta': { standard: 'infletta', arabised: 'msarrfa' },
    'terminu': { standard: 'terminu', arabised: 'magħlqa' },
    'Każwali': { standard: 'Każwali', arabised: 'Kif Ġie Ġie' },
    'każwali': { standard: 'każwali', arabised: 'kif ġie ġie' },
    'Tiftix Avvanzat': { standard: 'Tiftix Avvanzat', arabised: 'Tiftix Mitqaddam' },
    'Issuġġerixxi Entrata': { standard: 'Issuġġerixxi Entrata', arabised: 'Ressaq Madħla' },
    'Informazzjoni': { standard: 'Informazzjoni', arabised: 'Tagħrif' },
    'Dizzjunarju': { standard: 'Dizzjunarju', arabised: 'Miklem' },
    'Komprensiv': { standard: 'Komprensiv', arabised: 'Wesgħani' },
    'Diġitali': { standard: 'Diġitali', arabised: 'Għaddieni' },
    'onlajn': { standard: 'onlajn', arabised: 'fuq linja' },
    'riċerkaturi': { standard: 'riċerkaturi', arabised: 'fittixin' },
    'djaletti': { standard: 'djaletti', arabised: 'lsejnin' },

    // Advanced Search
    'Mudell tal-Imtenni': { standard: 'Mudell tal-Imtenni', arabised: 'Sura tal-Imtenni' },
    'Mudell tal-Plural': { standard: 'Mudell tal-Plural', arabised: 'Sura tal-Ġmigħ' },
    'Konsonanti tal-Għerq': { standard: 'Konsonanti tal-Għerq', arabised: 'Ittri Wieqaf tal-Ġidra' },
    'Sett ta\' Vokali': { standard: 'Sett ta\' Vokali', arabised: 'Ġmejgħa ta\' Ittri Miexi' },

    // Entry View
    "Etimoloġija": { standard: 'Etimoloġija', arabised: 'Tinsil' },
    "Nom Verbali": { standard: 'Nom Verbali', arabised: 'Misder' },
    "Partiċipju Passiv": { standard: 'Partiċipju Passiv', arabised: 'Mifgħul' },
    "Partiċipju Attiv": { standard: 'Partiċipju Attiv', arabised: 'Fiegħel' },
    "Imperattiv": { standard: 'Imperattiv', arabised: 'Amar' },
    "Tifsira": { standard: 'Tifsira', arabised: 'Tagħliq' },
    "Entrati Relatati": { standard: 'Entrati Relatati', arabised: 'Madħliet Marbutin' },
    "Polarità": { standard: 'Polarità', arabised: 'Għamudija' },
    "Oġġett Dirett": { standard: 'Oġġett Dirett', arabised: 'Mifgħul Bih' },
    "Oġġett Indirett": { standard: 'Oġġett Indirett', arabised: 'Mifgħul Bih it-Tieni' },
    "Tranżittività": { standard: 'Tranżittività', arabised: 'Tgħaddija' },
    "Tranżittiv": { standard: 'Tranżittiv', arabised: 'Mitgħaddi' },
    "Intranżittiv": { standard: 'Intranżittiv', arabised: 'Lieżem' },
    "Positive": { standard: 'Pożittiv', arabised: 'Qagħdi' },
    "Negative": { standard: 'Negattiv', arabised: 'Ċaħdi' },
    "Fonetika AFI": { standard: 'Fonetika AFI', arabised: 'Ħossija AFI' },
    "Perfett": { standard: 'Perfett', arabised: 'Mgħoddi' },
    "Imperfett": { standard: 'Imperfett', arabised: 'Maħdur' },
    "(Past)": { standard: '(Passat)', arabised: '(Mgħoddi)' },
    "(Present)": { standard: '(Preżent)', arabised: '(Maħdur)' },
    "Persuna": { standard: 'Persuna', arabised: 'Nifs' },
};

/** Resolve a term key against the current linguistic mode */
export function resolveTerm(key: string, mode: LinguisticMode): string {
    const entry = TERMINOLOGY[key];
    if (!entry) return key;
    return mode === 'arabised' ? entry.arabised : entry.standard;
}

/** Get the POS display label for a given POS key + mode */
export function getPOSLabel(pos: string, mode: LinguisticMode): string {
    return resolveTerm(pos, mode);
}
