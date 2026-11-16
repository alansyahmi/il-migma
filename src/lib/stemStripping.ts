export type AffixPosition = 'suffix' | 'prefix';

export interface StemAffixRule {
    affix: string;
    position: AffixPosition;
    category: 'inflectional' | 'numeral' | 'nominal_adjectival' | 'verbal' | 'prefix';
    descriptionEn: string;
    descriptionMt: string;
    examples: Array<{
        headword: string;
        stem: string;
    }>;
}

export interface StemAffixGroup {
    id: string;
    titleEn: string;
    titleMt: string;
    summaryEn: string;
    summaryMt: string;
    rules: StemAffixRule[];
}

/**
 * Canonical ordered registry of affixes stripped when deriving hyphen-delimited
 * Romance/English Zokk stems (`-stem-`) in Il-Miġma'.
 *
 * Semitic words never take a Zokk stem (`stem: null`); they use `root_consonants`.
 */
export const STEM_STRIPPING_AFFIX_GROUPS: StemAffixGroup[] = [
    {
        id: 'numeral',
        titleEn: 'Numeral Scale, Multiplicative & Ordinal Suffixes',
        titleMt: 'Suffissi Numeriċi ta’ Skala, Multiplikazzjoni u Ordni',
        summaryEn: 'Stripped from Romance/Latin numeral formations so cognate series share one canonical stem (e.g., -kwadr-, -kwint-, -sest-, -sett-, -ott-, -non-, -deċ-, -tri-).',
        summaryMt: 'Jitneħħew minn forom numeriċi Rumanzi sabiex serje relatati jaqsmu zokk kanoniku wieħed (eż. -kwadr-, -kwint-, -sest-, -sett-, -ott-, -non-, -deċ-, -tri-).',
        rules: [
            {
                affix: '-iljun / -ljun',
                position: 'suffix',
                category: 'numeral',
                descriptionEn: 'Large-scale cardinal numeral suffix.',
                descriptionMt: 'Suffiss għall-iskali kbar tan-numri kardinali.',
                examples: [
                    { headword: 'biljun', stem: '-bi-' },
                    { headword: 'triljun', stem: '-tri-' },
                    { headword: 'kwadriljun', stem: '-kwadr-' },
                    { headword: 'kwintiljun', stem: '-kwint-' },
                    { headword: 'sestiljun', stem: '-sest-' },
                    { headword: 'settiljun', stem: '-sett-' },
                    { headword: 'ottiljun', stem: '-ott-' },
                    { headword: 'noniljun', stem: '-non-' },
                    { headword: 'deċiljun', stem: '-deċ-' },
                ],
            },
            {
                affix: '-uplu / -plu',
                position: 'suffix',
                category: 'numeral',
                descriptionEn: 'Multiplicative numeral suffix.',
                descriptionMt: 'Suffiss għan-numri multiplikattivi.',
                examples: [
                    { headword: 'triplu', stem: '-tri-' },
                    { headword: 'kwadruplu', stem: '-kwadr-' },
                    { headword: 'kwintuplu', stem: '-kwint-' },
                    { headword: 'sestuplu', stem: '-sest-' },
                    { headword: 'settuplu', stem: '-sett-' },
                    { headword: 'ottuplu', stem: '-ott-' },
                    { headword: 'nonuplu', stem: '-non-' },
                    { headword: 'deċuplu', stem: '-deċ-' },
                    { headword: 'ċentuplu', stem: '-ċent-' },
                ],
            },
            {
                affix: '-imu / -mu / -av',
                position: 'suffix',
                category: 'numeral',
                descriptionEn: 'Romance ordinal and fractional suffixes.',
                descriptionMt: 'Suffissi Rumanzi tal-ordni u l-frazzjoni.',
                examples: [
                    { headword: 'settimu', stem: '-sett-' },
                    { headword: 'deċmu', stem: '-deċ-' },
                    { headword: 'ottav', stem: '-ott-' },
                ],
            },
        ],
    },
    {
        id: 'nominal_adjectival',
        titleEn: 'Nominal & Adjectival Derivational Suffixes',
        titleMt: 'Suffissi Derivattivi tas-Sostantivi u l-Aġġettivi',
        summaryEn: 'Productive Romance and Maltese-adapted derivational endings stripped cleanly before inflections.',
        summaryMt: 'Tmiem derivattivi Rumanzi u adattati għall-Malti li jitneħħew biex jibqa’ z-zokk bażiku.',
        rules: [
            {
                affix: '-ier / -iera',
                position: 'suffix',
                category: 'nominal_adjectival',
                descriptionEn: 'Agentive or habitual quality suffix.',
                descriptionMt: 'Suffiss aġentiv jew ta’ drawwa.',
                examples: [
                    { headword: 'ċajtier', stem: '-ċajt-' },
                ],
            },
            {
                affix: '-ali / -jali',
                position: 'suffix',
                category: 'nominal_adjectival',
                descriptionEn: 'Relational adjectival suffix.',
                descriptionMt: 'Suffiss aġġettivali ta’ relazzjoni.',
                examples: [
                    { headword: 'ċentrali', stem: '-ċentr-' },
                    { headword: 'ċelestjali', stem: '-ċelest-' },
                ],
            },
            {
                affix: '-iku / -ika',
                position: 'suffix',
                category: 'nominal_adjectival',
                descriptionEn: 'Learned/technical adjectival suffix.',
                descriptionMt: 'Suffiss aġġettivali tekniku jew akkademiku.',
                examples: [
                    { headword: 'ċentriku', stem: '-ċentr-' },
                    { headword: 'ċikloniku', stem: '-ċiklon-' },
                ],
            },
            {
                affix: '-abbli / -ibbli',
                position: 'suffix',
                category: 'nominal_adjectival',
                descriptionEn: 'Possibility/capability adjectival suffix.',
                descriptionMt: 'Suffiss aġġettivali ta’ possibbiltà.',
                examples: [
                    { headword: 'ċensurabbli', stem: '-ċensur-' },
                ],
            },
            {
                affix: '-iż / -iża',
                position: 'suffix',
                category: 'nominal_adjectival',
                descriptionEn: 'Demonym and origin adjective suffix.',
                descriptionMt: 'Suffiss ta’ nazzjonalità u oriġini.',
                examples: [
                    { headword: 'Ċiniż', stem: '-Ċina-' },
                ],
            },
            {
                affix: '-erija / -azzjoni / -izzjoni / -tura / -ità / -tà / -iżmu / -ist(a)',
                position: 'suffix',
                category: 'nominal_adjectival',
                descriptionEn: 'Abstract noun, collective place, or practitioner suffixes.',
                descriptionMt: 'Suffissi ta’ nom astratt, post kollettiv jew prattikant.',
                examples: [
                    { headword: 'ċanfrinatura', stem: '-ċanfrin-' },
                ],
            },
        ],
    },
    {
        id: 'inflectional',
        titleEn: 'Inflectional & Thematic Vowel Endings',
        titleMt: 'Tmiem Flessivi u Vokali Tematiċi',
        summaryEn: 'Terminal grammatical vowels, Romance gender endings, and plural suffixes are never kept inside a canonical stem.',
        summaryMt: 'Vokali grammatikali finali, tmiem tal-ġeneru u suffissi tal-plural qatt ma jibqgħu fiż-zokk kanoniku.',
        rules: [
            {
                affix: '-u / -o / -a / -e / -i',
                position: 'suffix',
                category: 'inflectional',
                descriptionEn: 'Singular gender/thematic terminal vowels on non-Semitic lemmas.',
                descriptionMt: 'Vokali finali tas-singular u tal-ġeneru fuq kliem mhux Semitiku.',
                examples: [
                    { headword: 'żero', stem: '-żer-' },
                    { headword: 'doppju', stem: '-doppj-' },
                    { headword: 'ċertu', stem: '-ċert-' },
                    { headword: 'ċelebri', stem: '-ċelebr-' },
                ],
            },
            {
                affix: '-i / -iet / -ijiet / -s / -es',
                position: 'suffix',
                category: 'inflectional',
                descriptionEn: 'Plural and dual inflectional endings stripped back to base stem.',
                descriptionMt: 'Tmiem tal-plural li jitneħħew lura għaz-zokk bażiku.',
                examples: [
                    { headword: 'biljuni', stem: '-bi-' },
                    { headword: 'żerijiet', stem: '-żer-' },
                ],
            },
        ],
    },
    {
        id: 'verbal',
        titleEn: 'Verbal Zokk & Participial Endings',
        titleMt: 'Tmiem tal-Verbi Zokk u tal-Partiċipji',
        summaryEn: 'Verb stems strip the citation -a / -i and loan infinitive -ar / -ir markers used by the Zokk engine.',
        summaryMt: 'Iz-zokk tal-verb ineħħi l-marki -a / -i u -ar / -ir użati mill-magna taż-Zokk.',
        rules: [
            {
                affix: '-a / -i / -ar / -ir / -ixx-',
                position: 'suffix',
                category: 'verbal',
                descriptionEn: 'Citation vowel and Romance verb conjugation class markers.',
                descriptionMt: 'Vokali taċ-ċitazzjoni u marki tal-klassi verbali.',
                examples: [
                    { headword: 'ipparkja (-ar)', stem: '-ipparkj-' },
                    { headword: 'serva (-ir)', stem: '-serv-' },
                ],
            },
            {
                affix: '-at / -it / -ant / -ent / -ment',
                position: 'suffix',
                category: 'verbal',
                descriptionEn: 'Passive participle, active participle, and deverbal noun endings.',
                descriptionMt: 'Suffissi tal-partiċipju passiv, attiv u nom verbali.',
                examples: [
                    { headword: 'ipparkjat', stem: '-ipparkj-' },
                ],
            },
        ],
    },
    {
        id: 'prefix',
        titleEn: 'Separable Derivational Prefixes',
        titleMt: 'Prefissi Derivattivi Separabbli',
        summaryEn: 'Productive prefixes stripped when an entry derives transparently from a free/attested base stem.',
        summaryMt: 'Prefissi produttivi li jitneħħew meta l-kelma tiġi b’mod trasparenti minn zokk attestat.',
        rules: [
            {
                affix: 'arċi- / anti- / dis- / eks- / in- / im- / kontra- / mikro- / pre- / ri- / re- / sotto- / super- / ultra-',
                position: 'prefix',
                category: 'prefix',
                descriptionEn: 'Loanword derivational prefixes stripped to link words under their shared lexical base.',
                descriptionMt: 'Prefissi derivattivi ta’ self li jitneħħew biex jgħaqqdu kliem taħt l-istess zokk.',
                examples: [
                    { headword: 'arċisqof', stem: '-isqof-' },
                ],
            },
        ],
    },
];

const SUFFIX_STRIPPING_PATTERNS: RegExp[] = [
    // Numeral scale, multiplicative & ordinal suffixes (longest first; split so short-stem bases fall through cleanly)
    /iljun$/i,
    /ljun$/i,
    /uplu$/i,
    /plu$/i,
    /imu$/i,
    /mu$/i,
    /av$/i,
    // Nominal / adjectival derivational suffixes (longest first)
    /azzjoni$/i,
    /izzjoni$/i,
    /abbli$/i,
    /ibbli$/i,
    /erija$/i,
    /tura$/i,
    /ment$/i,
    /iżmu$/i,
    /iera$/i,
    /ier$/i,
    /jali$/i,
    /ali$/i,
    /iku$/i,
    /ika$/i,
    /iża$/i,
    /iż$/i,
    /ista$/i,
    /ist$/i,
    /ità$/i,
    /tà$/i,
    // Plural & inflectional terminal vowels
    /ijiet$/i,
    /iet$/i,
    /[uoaei]$/i,
];

/**
 * Strips known productive Romance/loanword suffixes from a surface lemma and
 * returns hyphen-delimited canonical Zokk stem notation (`-stem-`).
 *
 * Intended as a normalization helper for loanwords; lexical stems should always
 * still verify whether a morphological base (like `-żer-` vs `-zer-` or `-bi-`)
 * is already established.
 */
export function suggestStrippedStem(
    headword: string,
    options: { includeTrailingVowels?: boolean; minBaseLength?: number } = {},
): string {
    const includeTrailingVowels = options.includeTrailingVowels ?? true;
    const minBaseLength = Math.max(options.minBaseLength ?? 2, 1);
    const cleaned = String(headword || '')
        .trim()
        .replace(/^-+/, '')
        .replace(/-+$/, '')
        .toLowerCase();

    if (!cleaned) return '';

    const HAS_VOWEL_RE = /[aeiouàèìòùâêîôû]/i;
    let base = cleaned;
    for (const pattern of SUFFIX_STRIPPING_PATTERNS) {
        if (!includeTrailingVowels && pattern.source === '[uoaei]$') continue;
        const candidate = base.replace(pattern, '');
        if (candidate !== base && candidate.length >= minBaseLength && HAS_VOWEL_RE.test(candidate)) {
            base = candidate;
            break;
        }
    }

    return `-${base}-`;
}
