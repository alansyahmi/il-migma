/**
 * src/lib/prepositionArticleMatrix.ts
 * Generates the definite article cliticization / assimilation matrix
 * (Prepożizzjonijiet Magħquda / Fused Article Forms) for standard Maltese prepositions.
 */

export interface ArticleTransformationItem {
    letter: string;
    rule: string;
    example: string;
    result: string;
    cliticForm: string; // e.g. "taċ-", "tal-", "mill-"
}

export interface PrepositionArticleMatrix {
    headword: string;
    basePrefix: string;
    sunTransformations: ArticleTransformationItem[];
    moonTransformations: ArticleTransformationItem[];
    vowelTransformation: ArticleTransformationItem;
}

interface PrepositionConfig {
    canonicalHeadword: string;
    basePrefix: string;
    displayHeadword: string;
    geminateMoonL: boolean;
}

const PREPOSITION_CONFIGS: Record<string, PrepositionConfig> = {
    "ta'": {
        canonicalHeadword: "ta'",
        basePrefix: 'ta',
        displayHeadword: "ta'",
        geminateMoonL: false,
    },
    "ma'": {
        canonicalHeadword: "ma'",
        basePrefix: 'ma',
        displayHeadword: "ma'",
        geminateMoonL: false,
    },
    fi: {
        canonicalHeadword: 'fi',
        basePrefix: 'fi',
        displayHeadword: 'fi',
        geminateMoonL: false,
    },
    bi: {
        canonicalHeadword: 'bi',
        basePrefix: 'bi',
        displayHeadword: 'bi',
        geminateMoonL: false,
    },
    minn: {
        canonicalHeadword: 'minn',
        basePrefix: 'mi',
        displayHeadword: 'minn',
        geminateMoonL: true,
    },
    lil: {
        canonicalHeadword: 'lil',
        basePrefix: 'li',
        displayHeadword: 'lil',
        geminateMoonL: true,
    },
    għal: {
        canonicalHeadword: 'għal',
        basePrefix: 'għa',
        displayHeadword: 'għal',
        geminateMoonL: true,
    },
    sa: {
        canonicalHeadword: 'sa',
        basePrefix: 'sa',
        displayHeadword: 'sa',
        geminateMoonL: false,
    },
    bħal: {
        canonicalHeadword: 'bħal',
        basePrefix: 'bħa',
        displayHeadword: 'bħal',
        geminateMoonL: true,
    },
};

const SUN_LETTERS: Array<{ letter: string; example: string }> = [
    { letter: 'ċ', example: 'ċertu' },
    { letter: 'd', example: 'dar' },
    { letter: 'n', example: 'nar' },
    { letter: 'r', example: 'raġel' },
    { letter: 's', example: 'sema' },
    { letter: 't', example: 'tarġa' },
    { letter: 'x', example: 'xemx' },
    { letter: 'ż', example: 'żarbun' },
    { letter: 'z', example: 'zokkor' },
];

const MOON_LETTERS: Array<{ letter: string; example: string }> = [
    { letter: 'b', example: 'bieb' },
    { letter: 'f', example: 'fenek' },
    { letter: 'g', example: 'gżira' },
    { letter: 'ġ', example: 'ġurnata' },
    { letter: 'għ', example: 'għasfur' },
    { letter: 'h', example: 'hena' },
    { letter: 'ħ', example: 'ħobż' },
    { letter: 'j', example: 'jum' },
    { letter: 'k', example: 'klieb' },
    { letter: 'l', example: 'lejl' },
    { letter: 'm', example: 'mejda' },
    { letter: 'p', example: 'pjanu' },
    { letter: 'q', example: 'qamar' },
    { letter: 'v', example: 'vapur' },
    { letter: 'w', example: 'werqa' },
];

/**
 * Normalizes a headword string to match one of the 9 clitic preposition keys.
 */
export function resolvePrepositionCliticKey(headword?: string | null, pos?: string | null): string | null {
    if (!headword) return null;
    const clean = headword.trim().toLowerCase().normalize('NFC');
    const cleanPos = (pos || '').toLowerCase().trim();

    // Do not capture the definite article entries "il-", "l-"
    if (cleanPos === 'article' || clean === 'il-' || clean === 'il' || clean === 'l-') {
        return null;
    }

    if (clean === "ta'" || clean === 'ta' || clean === "t'") return "ta'";
    if (clean === "ma'" || clean === 'ma' || clean === "m'") return "ma'";
    if (clean === 'fi' || clean === "f'") return 'fi';
    if (clean === 'bi' || clean === "b'") return 'bi';
    if (clean === 'minn') return 'minn';
    if (clean === 'lil' || clean === "l'" || clean === "'l") return 'lil';
    if (clean === 'għal' || clean === 'għall-') return 'għal';
    if (clean === 'sa') return 'sa';
    if (clean === 'bħal' || clean === 'bħall-') return 'bħal';

    return null;
}

/**
 * Generates the complete Sun/Moon/Vowel cliticization matrix for a preposition.
 */
export function getPrepositionArticleMatrix(headword?: string | null, pos?: string | null): PrepositionArticleMatrix | null {
    const key = resolvePrepositionCliticKey(headword, pos);
    if (!key) return null;

    const config = PREPOSITION_CONFIGS[key];
    if (!config) return null;

    const { basePrefix, displayHeadword, geminateMoonL } = config;
    const standardMoonClitic = geminateMoonL ? `${basePrefix}ll-` : `${basePrefix}l-`;

    const sunTransformations: ArticleTransformationItem[] = SUN_LETTERS.map(({ letter, example }) => {
        const cliticForm = `${basePrefix}${letter}-`;
        return {
            letter,
            rule: `${displayHeadword} + i${letter}- → ${cliticForm}`,
            example,
            result: `${cliticForm}${example}`,
            cliticForm,
        };
    });

    const moonTransformations: ArticleTransformationItem[] = MOON_LETTERS.map(({ letter, example }) => {
        if (letter === 'l') {
            // Before letter 'l', the fused preposition always takes a single 'l' in Maltese orthography (e.g. mil-lejl, għal-lejl)
            const cliticForm = `${basePrefix}l-`;
            return {
                letter,
                rule: `${displayHeadword} + il- → ${cliticForm}`,
                example,
                result: `${cliticForm}${example}`,
                cliticForm,
            };
        }

        if (letter === 'għ' || letter === 'h') {
            // Għ and H take l- as the article; the preposition fuses to standard moon form
            return {
                letter,
                rule: `${displayHeadword} + l- → ${standardMoonClitic}`,
                example,
                result: `${standardMoonClitic}${example}`,
                cliticForm: standardMoonClitic,
            };
        }

        return {
            letter,
            rule: `${displayHeadword} + il- → ${standardMoonClitic}`,
            example,
            result: `${standardMoonClitic}${example}`,
            cliticForm: standardMoonClitic,
        };
    });

    const vowelTransformation: ArticleTransformationItem = {
        letter: 'a, e, i, o, u',
        rule: `${displayHeadword} + l- → ${standardMoonClitic}`,
        example: 'omm',
        result: `${standardMoonClitic}omm`,
        cliticForm: standardMoonClitic,
    };

    return {
        headword: config.canonicalHeadword,
        basePrefix,
        sunTransformations,
        moonTransformations,
        vowelTransformation,
    };
}
