/**
 * conjugationEngine.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Generates the full Form I conjugation table from minimal stored data:
 *   • Root consonants (C1, C2, C3)
 *   • Three vowel set strings: perfect, imperfect, imperative
 *   • Verb class tag
 *
 * Each vowel set string is "V1-V2" where V1 is the first theme vowel and
 * V2 is the second. "--" means no second theme vowel (defective/closed).
 * The prefix vowel (ji-/ja-/jo-) is encoded as the first char of "V1".
 *
 * Supported verb classes (Form I triliteral):
 *   strong          kiteb / jikteb
 *   assimilative    wiret / jiret (C1 w/għ drops in imperfect)
 *   hollow          dar   / jdur    (C2 assimilates into long vowel)
 *   defective-għ  laqa' / jilqa' (C3 = għ, surfaces as final -a, affect 3rd sg, 1st, 2nd sg & pl only)
 *   defective-j/w   beda  / jibda or heda / jehda   (C3 = j/w)
 *   defective-gem  ħeja  / jeħji   (C3 assimilates to V2)
 *   geminated       dell  / jdell   (C2 = C3)
 *
 * ── Attached vs Syncopated Stem Logic ─────────────────────────────────────
 *
 * To support object pronoun (clitic) attachment, the engine pre-calculates
 * differentiated stems based on phonological conditioning:
 *
 * 1. Attached form:
 *    - Used for consonant-initial suffixes (e.g., -ni, -ha, -hom).
 *    - Logic: Preserves the theme vowel but typically shifts the grade (e -> i)
 *      to buffer the consonant cluster (e.g., jikteb -> jiktib-ni).
 *
 * 2. Syncopated form:
 *    - Used for vowel-initial suffixes (e.g., -u, -ek).
 *    - Logic: Drops the theme vowel (syncopation) to avoid vowel clusters,
 *      or shifts it (metathesis) before C2 if C2 is a liquid/guttural
 *      (e.g., jikteb -> jiktb-u vs jaħrab -> jaħarb-u).
 */

import type {
    VerbConjugationTable,
    ConjugationRow,
    StemVariantSet,
    VerbStrength,
    WeakClass,
} from "@/types";

type LegacyStemVariantInput = Partial<StemVariantSet> & {
    impfType1?: string;
    impfType2?: string;
    perfType1?: string;
    perfType2?: string;
};

type LegacyStemRecipeInput = {
    perfFull: string;
    perfSync: string;
    perfReduced: string;
    perf3f: string;
    impfBase: (person: number) => string;
    attachedImperfect?: (person: number) => string;
    syncopatedImperfect?: (person: number) => string;
    impfPlural: (person: number) => string;
    negM?: string;
    negF?: string;
    perfectNegBuilder?: (perfRow: string, pIdx: number) => string;
    attachedPerfectBuilder?: (perfRow: string, pIdx: number) => string;
    syncopatedPerfectBuilder?: (syncopatedPerfect: string, pIdx: number) => string;
    impSg: string;
    impPl: string;
    impSgStems?: LegacyStemVariantInput;
    impPlStems?: LegacyStemVariantInput;
    blocksImala: boolean;
    impfType1?: (person: number) => string;
    impfType2?: (person: number) => string;
    perfType1Builder?: (perfRow: string, pIdx: number) => string;
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConjugationInput {
    /** Hyphen-separated root consonants, e.g. "k-t-b" */
    root: string;
    /** Verb form: "I", "II", "III", etc. */
    form: string;
    /** Optional entry/citation form used to disambiguate roots with multiple Form VII defective surfaces */
    headword?: string;
    citationForm?: string;
    /** Strength level of the verb */
    strength: VerbStrength;
    /** Sub-class for weak verbs */
    weakClass?: WeakClass;
    /** Whether the a->ie shift should be blocked (pharyngeal-leaning) */
    isImalaBlocked: boolean;

    /** Vowel set for the perfect tense, e.g. "i-e" */
    vowelSetPerfect: string;
    /** Vowel set for the imperfect tense, e.g. "i-e" */
    vowelSetImperfect: string;
    /** Vowel set for the imperative, e.g. "i-e" */
    vowelSetImperative: string;
}

export type GenerativeVerbFormType =
    | "I"
    | "II"
    | "III"
    | "IV"
    | "V"
    | "VI"
    | "VII"
    | "VIII"
    | "IX"
    | "X"
    | "Xa"
    | "Xb";

export interface GeneratedVerbForm {
    form: GenerativeVerbFormType;
    perfect: string;
    imperfect: string;
    perfective_3sg_m?: string;
    imperfective_3sg_m?: string;
    imperative?: string;
    passiveParticiple: string;
    activeParticiple: string;
    verbalNoun: string;
}

export interface StemRecipe {
    // Perfect stems
    perfFull: string; // 3sg.m (kiteb)
    perfSync: string; // syncopated (kitbu / kitb-)
    perfReduced: string; // suffix-attached (ktib-)
    perf3f: string; // 3sg.f (kitbet)

    // Imperfect stem builders
    impfBase: (person: number) => string; // Base form for 1-3rd person sg
    attachedImperfect?: (person: number) => string; // Attached form (e -> i shift)
    syncopatedImperfect?: (person: number) => string; // Syncopated form (before vowel suffixes)
    impfPlural: (person: number) => string; // Plural form (endsWith -u)

    // Negative overrides
    negM?: string;
    negF?: string;
    perfectNegBuilder?: (perfRow: string, pIdx: number) => string;

    // Stem type overrides
    attachedPerfectBuilder?: (perfRow: string, pIdx: number) => string;
    syncopatedPerfectBuilder?: (syncopatedPerfect: string, pIdx: number) => string;
    // Imperative
    impSg: string;
    impPl: string;
    impSgStems?: Partial<StemVariantSet>;
    impPlStems?: Partial<StemVariantSet>;

    // Metadata
    blocksImala: boolean;
}

// ── Engine Core ────────────────────────────────────────────────────────────

function buildConjugationTable(
    recipe: LegacyStemRecipeInput,
    C3?: string,
    verbForm?: string,
): VerbConjugationTable {
    const perf3mpVtheme =
        verbForm != "I" && (C3 === "j" || C3 === "w") ? "e" : "";
    const perf3mpV = C3 === "j" || C3 === "w" ? "w" : "u";
    const perfRows = [
        recipe.perfReduced + "t", // jiena
        recipe.perfReduced + "t", // inti
        recipe.perfFull, // huwa
        recipe.perf3f, // hija
        recipe.perfReduced + "na", // aħna
        recipe.perfReduced + "tu", // intom
        recipe.perfSync + perf3mpVtheme + perf3mpV, // huma
    ];

    const { m: defaultNegM, f: defaultNegF } = negPerfect3sg(
        recipe.perfFull,
        recipe.perf3f,
        C3,
        verbForm,
        recipe.blocksImala,
    );
    const negM = recipe.negM ?? defaultNegM;
    const negF = recipe.negF ?? defaultNegF;

    const impfForms: string[] = [];
    const stemsList: StemVariantSet[] = [];

    for (let i = 0; i < 7; i++) {
        // Build Base Imperfect
        const base = i >= 4 ? recipe.impfPlural(i) : recipe.impfBase(i);
        impfForms.push(base);

        const attachedImperfect = recipe.attachedImperfect ?? recipe.impfType1 ?? recipe.impfBase;
        const syncopatedImperfect = recipe.syncopatedImperfect ?? recipe.impfType2 ?? recipe.impfBase;
        const hasExplicitAttachedImperfect = typeof recipe.attachedImperfect === "function";
        const hasExplicitSyncopatedImperfect = typeof recipe.syncopatedImperfect === "function";
        const attachedPerfectBuilder = recipe.attachedPerfectBuilder ?? recipe.perfType1Builder;

        // Attached perfect version (e -> i shift usually) unless overridden
        const attachedPerfect = attachedPerfectBuilder
            ? attachedPerfectBuilder(perfRows[i], i)
            : perfRows[i].replace(/e([^aeiou])$/, "i$1");

        // Syncopated perfect version
        let syncopatedPerfect = i === 2 ? recipe.perfSync : perfRows[i];
        if (attachedPerfectBuilder && i === 3) {
            syncopatedPerfect = attachedPerfectBuilder(perfRows[i], i);
        }
        if (recipe.syncopatedPerfectBuilder) {
            syncopatedPerfect = recipe.syncopatedPerfectBuilder(syncopatedPerfect, i);
        }

        stemsList.push({
            attached: hasExplicitAttachedImperfect
                ? attachedImperfect(i)
                : i >= 4 ? recipe.impfPlural(i) : attachedImperfect(i),
            syncopated: hasExplicitSyncopatedImperfect
                ? syncopatedImperfect(i)
                : i >= 4 ? recipe.impfPlural(i) : syncopatedImperfect(i),
            perfectAttached: attachedPerfect,
            perfectSyncopated: syncopatedPerfect,
        });
    }

    const persons = [
        { id: "1s", mt: "jiena", en: "I" },
        { id: "2s", mt: "inti", en: "you (sg.)" },
        { id: "3ms", mt: "huwa", en: "he" },
        { id: "3fs", mt: "hija", en: "she" },
        { id: "1p", mt: "aħna", en: "we" },
        { id: "2p", mt: "intom", en: "you (pl.)" },
        { id: "3p", mt: "huma", en: "they" },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.id,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: recipe.perfectNegBuilder
            ? recipe.perfectNegBuilder(perfRows[i], i)
            : i === 2 ? negM : i === 3 ? negF : perfRows[i].replace("ie", "e"),
        stems: stemsList[i],
    }));

    return {
        rows,
        imperative_sg: recipe.impSg,
        imperative_pl: recipe.impPl,
        imperative_sg_stems: recipe.impSgStems
            ? {
                attached: recipe.impSgStems.attached ?? recipe.impSgStems.impfType1 ?? recipe.impSg,
                syncopated: recipe.impSgStems.syncopated ?? recipe.impSgStems.impfType2 ?? recipe.impSg,
            }
            : {
                attached: recipe.impSg,
                syncopated: recipe.impSg,
            },
        imperative_pl_stems: recipe.impPlStems
            ? {
                attached: recipe.impPlStems.attached ?? recipe.impPlStems.impfType1 ?? recipe.impPl.replace("ie", "e"),
                syncopated: recipe.impPlStems.syncopated ?? recipe.impPlStems.impfType2 ?? recipe.impPl,
            }
            : {
                attached: recipe.impPl.replace("ie", "e"),
                syncopated: recipe.impPl,
            },
        blocksImala: recipe.blocksImala,
    };
}

function isGuttural(c: string) {
    return ["għ", "ħ", "h", "q", "'"].includes(c);
}

function isPharyngeal(c: string) {
    return ["għ"].includes(c);
}

function hasIorE(v: string) {
    return ["i", "e"].includes(v);
}

function hasIorEorO(v: string) {
    return ["i", "e", "o"].includes(v);
}
/**
 * deriveTable
 * Morphs a base conjugation table (e.g. Form II) into a derived one (e.g. Form V)
 * by applying string replacements or prefixes to specific columns.
 */
function deriveTable(
    base: VerbConjugationTable,
    perfPrefix: string,
    impfTransform: (baseImpf: string, pIdx: number) => string,
    options: {
        perfectTransform?: (baseSurface: string) => string;
    } = {},
): VerbConjugationTable {
    const prefixPerfect = options.perfectTransform ?? ((surface: string) => perfPrefix + surface);

    const deriveImperativeStem = (stem: string | undefined, fallback: string) => {
        const sourceStem = stem || fallback;
        if (fallback && sourceStem && sourceStem[0] !== fallback[0]) {
            return prefixPerfect(fallback);
        }
        return prefixPerfect(sourceStem);
    };

    const mapRow = (row: ConjugationRow, pIdx: number): ConjugationRow => ({
        ...row,
        perfect: prefixPerfect(row.perfect),
        perfect_neg: row.perfect_neg
            ? prefixPerfect(row.perfect_neg.replace(/^ma /, ""))
            : undefined,
        imperfect: impfTransform(row.imperfect, pIdx),
        imperfect_attached: row.imperfect_attached
            ? impfTransform(row.imperfect_attached, pIdx)
            : undefined,
        stems: row.stems
            ? {
                attached: impfTransform(row.stems.attached, pIdx),
                syncopated: impfTransform(row.stems.syncopated, pIdx),
                perfectAttached: prefixPerfect(row.stems.perfectAttached ?? row.perfect),
                perfectSyncopated: prefixPerfect(row.stems.perfectSyncopated ?? row.perfect),
            }
            : undefined,
    });

    return {
        ...base,
        rows: base.rows.map(mapRow),
        imperative_sg: prefixPerfect(base.imperative_sg),
        imperative_pl: prefixPerfect(base.imperative_pl),
        imperative_sg_neg: base.imperative_sg_neg
            ? `la ${impfTransform(base.imperative_sg_neg.replace(/^la /, ""), 1)}`
            : undefined,
        imperative_pl_neg: base.imperative_pl_neg
            ? `la ${impfTransform(base.imperative_pl_neg.replace(/^la /, ""), 5)}`
            : undefined,
        imperative_sg_stems: base.imperative_sg_stems
            ? {
                attached: deriveImperativeStem(base.imperative_sg_stems.attached, base.imperative_sg),
                syncopated: deriveImperativeStem(base.imperative_sg_stems.syncopated, base.imperative_sg),
            }
            : undefined,
        imperative_pl_stems: base.imperative_pl_stems
            ? {
                attached: prefixPerfect(base.imperative_pl_stems.attached),
                syncopated: prefixPerfect(base.imperative_pl_stems.syncopated),
            }
            : undefined,
    };
}

const IMPERFECT_PERSON_PREFIXES = ["n", "t", "j", "t", "n", "t", "j"];

function stripBaseImperfectPrefix(form: string, pIdx: number): string {
    const expectedPrefix = IMPERFECT_PERSON_PREFIXES[pIdx] ?? form[0] ?? "";
    if (expectedPrefix && form.startsWith(expectedPrefix)) {
        return form.slice(expectedPrefix.length);
    }
    if (
        expectedPrefix === "t" &&
        /^[ċdsxżzt]/.test(form) &&
        form.length > 1 &&
        form[0] === form[1]
    ) {
        return form.slice(1);
    }
    return form.slice(1);
}

function deriveTPrefixedImperfect(baseImpf: string, pIdx: number): string {
    const personPrefix = IMPERFECT_PERSON_PREFIXES[pIdx] ?? baseImpf[0] ?? "";
    return baseImpf
        .split(" / ")
        .map((part) => {
            if (!part) return part;
            const stem = stripBaseImperfectPrefix(part, pIdx);
            return `${personPrefix}i${deriveAssimilatedTPrefixedWord(stem)}`;
        })
        .join(" / ");
}

function infixAfterInitial(form: string, infix: string): string {
    return form
        .split(" / ")
        .map((part) => (part ? part[0] + infix + part.slice(1) : part))
        .join(" / ");
}

function infixAfterInitialWithMetathesis(form: string, infix: string): string {
    return form
        .split(" / ")
        .map((part) => {
            if (!part) return part;
            const stem = part.slice(1).replace(/^([aeiou]+)(.)/, "$2$1");
            return part[0] + infix + stem;
        })
        .join(" / ");
}

// ── Vowel helpers ──────────────────────────────────────────────────────────

function parseVset(vset: string): { v1: string; v2: string } {
    const parts = vset.split("-");
    return { v1: parts[0] ?? "i", v2: parts[1] ?? "" };
}

function isFinalWeakRadical(radical?: string): boolean {
    return ["w", "j", "y", "għ", "gh"].includes(String(radical || "").toLowerCase());
}

function normalizeFormIIIDefectiveVsets(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
): { perf: string; impf: string; imp: string } {
    const finalRadical = String(C[2] || "").toLowerCase();
    const defaultSecondVowel = finalRadical === "w" ? "i" : "a";
    const perf = parseVset(vsetPerf);
    const impf = parseVset(vsetImpf);
    const imp = parseVset(vsetImp);

    return {
        perf: perf.v1 === "ie" ? vsetPerf : "ie-a",
        impf: impf.v1 === "ie" ? vsetImpf : `ie-${defaultSecondVowel}`,
        imp: imp.v1 === "ie" ? vsetImp : `ie-${defaultSecondVowel}`,
    };
}

/** Derive the imperfect prefix vowel from the vowel set */
function prefixVowel(vset: string): string {
    const { v1 } = parseVset(vset);
    // The prefix vowel is the first character encoded in the V1 theme vowel
    return v1.charAt(0);
}

/** Build the imperfect prefix for a given person number + vowel set */
function buildPrefix(person: number, vset: string): string {
    const v = prefixVowel(vset);
    const consonants = ["n", "t", "j", "t", "n", "t", "j"];
    const pfx = consonants[person] ?? "j";
    return pfx + v;
}

/**
 * Safely combine a prefix (e.g. "n", "ti-") with a stem,
 * applying assimilation rules.
 */
function combinePrefix(prefix: string, stem: string): string {
    if (!prefix || !stem) return prefix + stem;
    const pfx = prefix.replace(/[aeiou]+$/, "");
    const hasVowel = /[aeiou]/.test(prefix);

    // Assimilation only happens if the prefix consonant is directly adjacent to stem
    if (!hasVowel && pfx.length === 1) {
        // t- matches ċ, d, s, x, ż, z
        if (pfx === "t" && /^[ċdsxżzt]/.test(stem)) {
            return stem[0] + stem;
        }
        // n- optional matches r, m
        if (pfx === "n" && /^[rm]/.test(stem)) {
            return `${stem[0]}${stem} / n${stem}`;
        }
    }

    return prefix + stem;
}

/** Parallel to combinePrefix for plural forms (handles slash variants) */
function combinePrefixPlural(
    prefix: string,
    stem: string,
    suffix: string,
): string {
    const combined = combinePrefix(prefix, stem);
    if (combined.includes(" / ")) {
        return combined
            .split(" / ")
            .map((f) => f + suffix)
            .join(" / ");
    }
    return combined + suffix;
}

// ── Negative perfect vowel shift ───────────────────────────────────────────

/**
 */
function applyAttachedShift(
    vowel: string,
    C3?: string,
    isFinalWeak: boolean = false,
): string {
    if (C3 === "għ" && (vowel === "a" || vowel === "e")) return "a";
    if (vowel === "a" && isFinalWeak) return "ie";
    if (vowel === "e" || vowel === "a") return "i";
    return vowel;
}

function applyAttachedShiftUnlessBlocked(
    vowel: string,
    C3: string | undefined,
    isImalaBlocked: boolean,
    isFinalWeak: boolean = false,
): string {
    return isImalaBlocked && vowel === "a"
        ? vowel
        : applyAttachedShift(vowel, C3, isFinalWeak);
}

function attachedStrongPerfectVowel(vowel: string, C3: string | undefined, isImalaBlocked: boolean): string {
    if (vowel === "a") return "a";
    return applyAttachedShiftUnlessBlocked(vowel || "i", C3, isImalaBlocked);
}

/** Preserve the full `a-a` perfect grade in attached/reduced stems. */
function attachedPerfectVowel(
    v1: string,
    v2: string,
    C3: string | undefined,
    isImalaBlocked: boolean,
): string {
    if (v1 === "a" && v2 === "a") return "a";
    return applyAttachedShiftUnlessBlocked(v2, C3, isImalaBlocked);
}

/**
 * Normalizes theme vowels for base lemma generation,
 * ensuring pharyngeal compatibility (e.g. laqqa' instead of laqqe').
 */
function cleanThemeVowel(vowel: string, C3?: string): string {
    if (C3 === "għ") return "a";
    return vowel;
}

function defectivePluralSuffix(v1: string, v2: string): string {
    return v2 === "i" ? "u" : v1 === "a" && v2 === "a" ? "aw" : "ew";
}

function negPerfect3sg(
    m3: string,
    f3: string,
    C3?: string,
    verbForm?: string,
    blocksImala: boolean = false,
): { m: string; f: string } {
    const getShortForm = (offset: number) => {
        if ((verbForm === "III" || verbForm === "VI") && offset < 6) return "e";
        return "i";
    };

    const shift = (s: string, offset: number) => {
        if (C3 === "għ" && s.endsWith("'")) return s.replace(/'$/, "");

        // Form III / Hollow shortening: ie-vowel -> e-vowel
        // We handle both v-cons (strong) and v-vowel (defective)
        if (s.includes("ie")) {
            const shortened = s.replace("ie", getShortForm(offset));
            // If it ends in e + cons, it becomes i + cons
            if (/e([^aeiou])$/.test(shortened)) {
                return shortened.replace(/e([^aeiou])$/, "i$1");
            }
            // If it ends in a vowel (defective), handle terminal shift
            if (shortened.endsWith("a")) {
                if (blocksImala) return shortened;
                return shortened.replace(/a$/, "ie");
            }
            return s;
        }

        // Generic a -> ie shift for negation
        if (s.endsWith("a")) {
            if (blocksImala) return s;
            return s.replace(/a$/, "ie");
        }

        // Generic e -> i shift for strong/assimilative
        return s.replace(/e([^aeiou])$/, "i$1");
    };
    return { m: shift(m3, 2), f: shift(f3, 3) };
}

// ── FORM I STRONG class ───────────────────────────────────────────────────────────

function genStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v2: iv2 } = parseVset(vsetImpf);

    const isSonorant = (c: string) => ["l", "m", "n", "r"].includes(c);
    const usesImperfectV2InPlural = (c: string) => c === "għ" || isSonorant(c);

    const perfSyncRoot = `${C1}${pv1}${C2}${C3}`;
    const perfRedRoot = isPharyngeal(C1)
        ? `${C1}${pv1}${C2}${attachedStrongPerfectVowel(pv2 || pv1, C3, isImalaBlocked)}${C3}`
        : `${C1}${C2}${attachedStrongPerfectVowel(pv2 || pv1, C3, isImalaBlocked)}${C3}`;
    const perfFull = `${C1}${pv1}${C2}${pv2}${C3}`;

    const impfT1 = (pfx: string) =>
        `${pfx}${C1}${C2}${applyAttachedShiftUnlessBlocked(iv2 || "", C3, isImalaBlocked)}${C3}`;
    const impfT2 = (pfx: string) => {
        const theme = iv2 || "i";
        if (isPharyngeal(C1)) return `${pfx}${C1}${C2}${C3}`;
        if (usesImperfectV2InPlural(C2))
            return `${pfx}${C1}${theme}${C2}${C3}`;
        return `${pfx}${C1}${C2}${C3}`;
    };

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf);
        return i >= 4 ? `${impfT2(pfx)}u` : `${pfx}${C1}${C2}${iv2}${C3}`;
    };

    const { v1: impV1 } = parseVset(vsetImp);
    const pfx1 = buildPrefix(1, vsetImpf);
    const impSg = impfBase(1).replace(pfx1, impV1);
    const impPl = impfBase(5).replace(pfx1, impV1);

    return buildConjugationTable(
        {
            perfFull,
            perfSync: perfSyncRoot,
            perfReduced: perfRedRoot,
            perf3f: `${perfSyncRoot}et`,
            impfBase,
            impfType1: (i) => impfT1(buildPrefix(i, vsetImpf)),
            impfType2: (i) => impfT2(buildPrefix(i, vsetImpf)),
            impfPlural: (i) => `${impfT2(buildPrefix(i, vsetImpf))}u`,
            impSg,
            impPl,
            impSgStems: {
                impfType1: impfT1(pfx1).replace(pfx1, impV1),
                impfType2: impfT2(pfx1).replace(pfx1, impV1),
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

// ── ASSIMILATIVE class ─────────────────────────────────────────────────────
// C1 = w or j — present in perfect, drops in imperfect

function genAssimilative(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `${C1}${pv1}${C2}${pv2}${C3}`;
    const perfSync = `${C1}${pv1}${C2}${C3}`;
    const perfReduced = `${C1}${C2}${pv1}${C3}`;
    const buildAssimilativePrefix = (person: number) => {
        const { v1 } = parseVset(vsetImpf);
        if (v1 === "ie") {
            const consonants = ["n", "t", "j", "t", "n", "t", "j"];
            return `${consonants[person] ?? "j"}ie`;
        }
        return buildPrefix(person, vsetImpf);
    };

    const impfBase = (person: number) => {
        const pfx = buildAssimilativePrefix(person);
        const stem = `${C2}${iv2}${C3}`;
        return person >= 4
            ? combinePrefixPlural(pfx, `${C2}${C3}`, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${impV1}${C2}${impV2}${C3}`;
    const impPl = `${impV1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) => {
                const p = buildAssimilativePrefix(i);
                return combinePrefix(
                    p,
                    `${C2}${applyAttachedShiftUnlessBlocked(iv2 || "", C3, isImalaBlocked)}${C3}`,
                );
            },
            impfType2: (i) => {
                const p = buildAssimilativePrefix(i);
                return combinePrefix(p, `${C2}${C3}`);
            },
            impfPlural: (i) => {
                const p = buildAssimilativePrefix(i);
                return combinePrefixPlural(p, `${C2}${C3}`, "u");
            },
            impSg,
            impPl,
            impSgStems: {
                impfType1: impSg,
                impfType2: impSg.replace(/[aeiou]([^aeiou]*)$/, "$1"),
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

// ── HOLLOW class ──────────────────────────────────────────────────────────
// C2 assimilates into a long vowel: dar/jdur (CvvC/jCvvC)

function genHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1 } = parseVset(vsetImpf);

    const longV = pv2 || pv1;
    const shortV = pv1;

    const perfFull = `${C1}${longV}${C3}`;
    const reducedVowel = longV === "ie" ? "i" : longV === "a" && C2 === "w" ? "o" : shortV;
    const perfReduced = `${C1}${reducedVowel}${C3}`;

    const impfBase = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `${C1}${iv1}${C3}`;
        return combinePrefix(pfxCons, stem);
    };

    const { v1: impV1 } = parseVset(vsetImp);
    const impStem = `${C1}${impV1}${C3}`;
    const impSg = impStem;
    const impPl = `${impStem}u`;
    const perfectNegStem = longV === "a" ? perfFull : perfReduced;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: perfFull,
            perfReduced,
            perf3f: `${perfFull}et`,
            perfectNegBuilder: (perfRow, pIdx) => {
                if (pIdx === 2) return perfFull;
                if (pIdx === 3) return `${perfectNegStem}it`;
                if (pIdx === 4) return `${perfReduced}nie`;
                if (pIdx === 6) return `${perfectNegStem}u`;
                return perfRow;
            },
            impfBase,
            impfType1: (i) => impfBase(i),
            impfType2: (i) => impfBase(i),
            impfPlural: (i) => {
                const p = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
                return combinePrefixPlural(p, `${C1}${iv1}${C3}`, "u");
            },
            impSg,
            impPl,
            impSgStems: {
                impfType1: impSg,
                impfType2: impSg,
            },
            impPlStems: {
                impfType1: impPl,
                impfType2: impPl,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
        },
        C3,
        verbForm,
    );
}

// ── GEMINATED class ───────────────────────────────────────────────────────
// C2 = C3: dell / jdell (CvCC / jCvCC)

function genGeminated(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1 } = parseVset(vsetPerf);
    const { v1: iv1 } = parseVset(vsetImpf);

    const perfFull = `${C1}${pv1}${C2}${C2}`;

    const impfBase = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `${C1}${iv1}${C2}${C2}`;
        return combinePrefix(pfxCons, stem);
    };

    const { v1: impV1 } = parseVset(vsetImp);
    const impV = impV1 || iv1;
    const impSg = `${C1}${impV}${C2}${C2}`;
    const impPl = `${C1}${impV}${C2}${C2}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: perfFull,
            perfReduced: perfFull,
            perf3f: `${perfFull}et`,
            impfBase,
            impfType1: (i) => impfBase(i),
            impfType2: (i) => impfBase(i),
            impfPlural: (i) => {
                const p = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
                return combinePrefixPlural(p, `${C1}${iv1}${C2}${C2}`, "u");
            },
            impSg,
            impPl,
            impSgStems: {
                impfType1: impSg,
                impfType2: impSg,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
        },
        C3,
        verbForm,
    );
}

// ── DEFECTIVE-GĦ class ──────────────────────────────────────────────────
// C3 = għ (perfect: surfaces as trailing -a, imperfect: acts like strong)

function genDefectiveGħ(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v2: iv2 } = parseVset(vsetImpf);

    const perfFull = isGuttural(C1)
        ? `${C1}e${pv1}${C2}${pv2}'`
        : `${C1}${pv1}${C2}${pv2}'`;
    const perfSync = isGuttural(C1)
        ? `${C1}e${pv1}${C2}${C3}`
        : `${C1}${pv1}${C2}${C3}`;
    const perfReduced = isGuttural(C1) ? `${C1}e${C2}` : `${C1}${C2}aj`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf);
        return i >= 4 ? `${pfx}${C1}${C2}${C3}u` : `${pfx}${C1}${C2}${iv2}'`;
    };

    const { v1: impV1 } = parseVset(vsetImp);
    const pfx1 = buildPrefix(1, vsetImpf);
    const impSg = impfBase(1).replace(pfx1, impV1);
    const impPl = impfBase(5).replace(pfx1, impV1);

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced,
            perf3f: `${perfSync}et`,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 2) return `${C1}${pv1}${C2}${pv2}${C3}`;
                if (pIdx === 3) return `${perfSync}it`;
                return perfRow.replace(/e([^aeiou])$/, "i$1");
            },
            impfBase,
            impfType1: (i) => {
                const pfx = buildPrefix(i, vsetImpf);
                return i >= 4
                    ? `${pfx}${C1}${C2}${C3}u`
                    : `${pfx}${C1}${C2}${iv2}${C3}`;
            },
            impfType2: (i) => {
                const pfx = buildPrefix(i, vsetImpf);
                return i >= 4 ? `${pfx}${C1}${C2}${C3}u` : `${pfx}${C1}${C2}${C3}`;
            },
            impfPlural: (i) => `${buildPrefix(i, vsetImpf)}${C1}${C2}${C3}u`,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${impV1}${C1}${C2}${iv2}${C3}`,
                impfType2: `${impV1}${C1}${C2}${C3}`,
            },
            blocksImala: isImalaBlocked || true,
        },
        C3,
        verbForm,
    );
}

// ── DEFECTIVE class (j/w and geminated) ────────────────────────────────────
// C3 is vocalic (j, w, or assimilated geminate)
// Examples: beda / jibda, ħeja / jaħji

type FormIDefectiveStemProfile = {
    perfFull: string;
    perfSync: string;
    perfReduced: string;
    perf3f: string;
    impfSingularStem: string;
    impfPluralStem: string;
    impSg: string;
    impPl: string;
    blocksImala: boolean;
};

function buildFormIDefectiveStemProfile(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    isImalaBlocked: boolean = false,
    citationForm: string = "",
): FormIDefectiveStemProfile {
    const [C1, C2] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const citation = citationForm.trim().toLowerCase();

    if (citation === "uża" || (C1 === "w" && C2 === "ż")) {
        return {
            perfFull: "uża",
            perfSync: "uża",
            perfReduced: "użaj",
            perf3f: "użat",
            impfSingularStem: "uża",
            impfPluralStem: "użaw",
            impSg: "uża",
            impPl: "użaw",
            blocksImala: true,
        };
    }

    if (citation === "wera" || (C1 === "w" && C2 === "r")) {
        return {
            perfFull: "wera",
            perfSync: "wre",
            perfReduced: "wrej",
            perf3f: "wriet",
            impfSingularStem: "uri",
            impfPluralStem: "uru",
            impSg: "uri",
            impPl: "uru",
            blocksImala: isImalaBlocked,
        };
    }

    if (citation === "għala" || (C1 === "għ" && C2 === "l")) {
        return {
            perfFull: "għala",
            perfSync: "għale",
            perfReduced: "għalej",
            perf3f: "għaliet",
            impfSingularStem: "agħli",
            impfPluralStem: "agħlu",
            impSg: "agħli",
            impPl: "agħlu",
            blocksImala: isImalaBlocked,
        };
    }

    if (citation === "xewa" || (C1 === "x" && C2 === "w")) {
        return {
            perfFull: "xewa",
            perfSync: "xwe",
            perfReduced: "xwej",
            perf3f: "xwiet",
            impfSingularStem: "ixwi",
            impfPluralStem: "ixwu",
            impSg: "ixwi",
            impPl: "ixwu",
            blocksImala: isImalaBlocked,
        };
    }

    if (citation === "xela" || (C1 === "x" && C2 === "l")) {
        return {
            perfFull: "xela",
            perfSync: "xle",
            perfReduced: "xlej",
            perf3f: "xliet",
            impfSingularStem: "ixli",
            impfPluralStem: "ixlu",
            impSg: "ixli",
            impPl: "ixlu",
            blocksImala: isImalaBlocked,
        };
    }

    const perfFull = `${C1}${pv1}${C2}${pv2}`;
    const perf3f = pv1 === "a" && pv2 === "a" ? `${C1}${C2}at` : `${C1}${C2}iet`;
    const perfSync = isPharyngeal(C1) ? `${C1}${pv1}${C2}${pv1}` : `${C1}${C2}${pv1}`;
    const impfPluralSuffix = defectivePluralSuffix(iv1, iv2);
    const imperativePluralSuffix = defectivePluralSuffix(impV1, impV2);

    return {
        perfFull,
        perfSync,
        perfReduced: `${perfSync}j`,
        perf3f,
        impfSingularStem: `${iv1}${C1}${C2}${iv2 || "a"}`,
        impfPluralStem: `${iv1}${C1}${C2}${impfPluralSuffix}`,
        impSg: `${impV1}${C1}${C2}${impV2}`,
        impPl: `${impV1}${C1}${C2}${imperativePluralSuffix}`,
        blocksImala:
            isImalaBlocked ||
            (C[2] === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
    };
}

function genDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
    citationForm: string = "",
): VerbConjugationTable {
    const [, , C3] = C;
    const profile = buildFormIDefectiveStemProfile(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        isImalaBlocked,
        citationForm,
    );

    const imalaBlocked = profile.blocksImala;
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const attV = applyAttachedShiftUnlessBlocked(iv2 || "a", C3, imalaBlocked, true);
    const attVj = attV === "ie" ? "iej" : imalaBlocked ? "aj" : "ij";

    const impfBase = (person: number) => {
        const prefix = IMPERFECT_PERSON_PREFIXES[person] ?? "";
        return `${prefix}${profile.impfSingularStem}`;
    };
    const impfPlural = (person: number) => {
        const prefix = IMPERFECT_PERSON_PREFIXES[person] ?? "";
        return `${prefix}${profile.impfPluralStem}`;
    };

    const attachedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        const prefix = IMPERFECT_PERSON_PREFIXES[person] ?? "";
        if (profile.impfSingularStem === `${iv1}${C[0]}${C[1]}${iv2 || "a"}`) {
            return `${prefix}${iv1}${C[0]}${C[1]}${attV}`;
        }
        return `${prefix}${profile.impfSingularStem}`;
    };

    const syncopatedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        const prefix = IMPERFECT_PERSON_PREFIXES[person] ?? "";
        if (profile.impfSingularStem === `${iv1}${C[0]}${C[1]}${iv2 || "a"}`) {
            return `${prefix}${iv1}${C[0]}${C[1]}${attVj}`;
        }
        return `${prefix}${profile.impfSingularStem}`;
    };

    return buildConjugationTable(
        {
            perfFull: profile.perfFull,
            perfSync: profile.perfSync,
            perfReduced: profile.perfReduced,
            perf3f: profile.perf3f,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 2 && profile.perfFull.endsWith("a")) {
                    return imalaBlocked ? profile.perfFull : profile.perfFull.replace(/a$/, "ie");
                }
                if (pIdx === 3) return profile.perf3f;
                return perfRow;
            },
            impfBase,
            impfType1: attachedImperfect,
            impfType2: syncopatedImperfect,
            impfPlural,
            impSg: profile.impSg,
            impPl: profile.impPl,
            impSgStems: {
                impfType1: profile.impSg,
                impfType2: profile.impSg,
            },
            impPlStems: {
                impfType1: profile.impPl,
                impfType2: profile.impPl,
            },
            blocksImala: imalaBlocked,
        },
        C3,
        verbForm,
    );
}

// ── FORM II STRONG ─────────────────────────────────────────────────────────
// Doubled C2: CvCCvC pattern (e.g. fettaħ / jfettaħ)

function genFormIIStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;
    const shiftAttachedVowel = (vowel: string) => applyAttachedShiftUnlessBlocked(vowel, C3, isImalaBlocked);

    const perfFull = `${C1}${pv1}${C2D}${cleanThemeVowel(pv2, C3)}${C3}`;
    const perfSync = `${C1}${pv1}${C2D}${C3}`;

    const impfT1stem = `${C1}${iv1}${C2D}${shiftAttachedVowel(iv2)}${C3}`;
    const impfT2stem = `${C1}${iv1}${C2D}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `${C1}${iv1}${C2D}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, impfT2stem, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2D}${impV2}${C3}`;
    const impPl = `${C1}${impV1}${C2D}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: `${C1}${pv1}${C2D}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT1stem,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${C1}${impV1}${C2D}${shiftAttachedVowel(impV2)}${C3}`,
                impfType2: `${C1}${impV1}${C2D}${C3}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

// ── FORM II STRONG-HYBRID ──────────────────────────────────────────────────
// Final-għ hybrid: rabba' / nrabba' / jrabba'

function genFormIIStrongHybrid(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    _verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2] = C;
    const C3 = "għ";
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1 } = parseVset(vsetImpf);
    const C2D = C2 + C2;

    const perfFull = `${C1}${pv1}${C2D}${pv2}'`;
    const perfSync = `${C1}${pv1}${C2D}${C3}`;
    const perfReduced = `${C1}${pv1}${C2D}aj`;

    const impfBase = (person: number) => {
        const prefix = buildPrefix(person, "");
        if (person >= 4) return `${prefix}${C1}${iv1}${C2D}għu`;
        return `${prefix}${C1}${iv1}${C2D}a'`;
    };

    const impfPlural = (person: number) => {
        const prefix = buildPrefix(person, "");
        return `${prefix}${C1}${iv1}${C2D}għu`;
    };

    const attachedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}${C1}${iv1}${C2D}agħ`;
    };

    const syncopatedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}${C1}${iv1}${C2D}għ`;
    };

    const { v1: impV1 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2D}a'`;
    const impPl = `${C1}${impV1}${C2D}għu`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced,
            perf3f: `${perfSync}et`,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 2) return `${C1}${pv1}${C2D}${pv2}${C3}`;
                return perfRow.replace(/e([^aeiou])$/, "i$1");
            },
            impfBase,
            impfType1: attachedImperfect,
            impfType2: syncopatedImperfect,
            impfPlural,
            negF: `${perfSync}et`,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${C1}${iv1}${C2D}agħ`,
                impfType2: `${C1}${iv1}${C2D}għ`,
            },
            impPlStems: {
                impfType1: `${C1}${iv1}${C2D}għu`,
                impfType2: `${C1}${iv1}${C2D}għu`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        "I",
    );
}
// ── FORM II Hollow ─────────────────────────────────────────────────────────
// Doubled C2: CvCCvC pattern (e.g. dawwar / jdawwar)

function genFormIIHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    if ((C2 === "w" || C2 === "j") && pv1 === "ie") {
        const perfFull = `${C1}${C1}${pv1}${C3}`;
        const perfReduced = `${C1}${C1}i${C3}`;
        const impfVisibleStem = `${C1}${C1}${iv1 === "i" ? "ie" : iv1}${C3}`;
        const impfAttachedStem = `${C1}${C1}i${C3}`;

        const impfBase = (person: number) =>
            combinePrefix(
                buildPrefix(person, "i-i"),
                impfVisibleStem,
            );
        const impfPlural = (person: number) =>
            combinePrefixPlural(
                buildPrefix(person, "i-i"),
                impfVisibleStem,
                "u",
            );

        const impSg = perfFull;
        const impPl = `${perfFull}u`;

        return buildConjugationTable(
            {
                perfFull,
                perfSync: perfFull,
                perfReduced,
                perf3f: `${perfFull}et`,
                attachedPerfectBuilder: (perfRow, pIdx) => {
                    if (pIdx === 3) return `${perfReduced}it`;
                    return perfRow.replace(/ie([^aeiou])$/, "i$1");
                },
                impfBase: (person) => person >= 4 ? impfPlural(person) : impfBase(person),
                impfType1: (person) =>
                    combinePrefix(
                        buildPrefix(person, "i-i"),
                        impfAttachedStem,
                    ),
                impfType2: (person) =>
                    combinePrefix(
                        buildPrefix(person, "i-i"),
                        impfAttachedStem,
                    ),
                impfPlural,
                impSg,
                impPl,
                impSgStems: {
                    impfType1: perfReduced,
                    impfType2: perfReduced,
                },
                impPlStems: {
                    impfType1: impPl,
                    impfType2: impPl,
                },
                blocksImala: isImalaBlocked,
            },
            C3,
            verbForm,
        );
    }

    const C2D = C2 + C2;
    const shiftAttachedVowel = (vowel: string) => applyAttachedShiftUnlessBlocked(vowel, C3, isImalaBlocked);

    const perfFull = `${C1}${pv1}${C2D}${cleanThemeVowel(pv2, C3)}${C3}`;
    const perfSync = `${C1}${pv1}${C2}${C3}`;

    const impfT1stem = `${C1}${iv1}${C2D}${shiftAttachedVowel(iv2)}${C3}`;
    const impfT2stem = `${C1}${iv1}${C2}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `${C1}${iv1}${C2D}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, impfT2stem, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2D}${impV2}${C3}`;
    const impPl = `${C1}${impV1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: `${C1}${pv1}${C2D}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT1stem,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${C1}${impV1}${C2D}${shiftAttachedVowel(impV2)}${C3}`,
                impfType2: `${C1}${impV1}${C2}${C3}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}
// ── FORM II DEFECTIVE ──────────────────────────────────────────────────────
// Defective Form II (e.g. maħħa / jmaħħi)
// C3 is dropped/vocalized.

function genFormIIDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: _iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;
    const shiftAttachedVowel = (vowel: string) => applyAttachedShiftUnlessBlocked(vowel, C3, isImalaBlocked, true);

    const perfFull = `${C1}${pv1}${C2D}${pv2}`; // nessa
    const perf3f = `${C1}${pv1}${C2D}iet`; // nessiet
    const perfReduced = `${C1}${pv1}${C2D}`; // -ness-

    const imalaBlocked = isImalaBlocked;
    const attV = shiftAttachedVowel(iv2 || "a");
    const attVj = attV === "ie" ? "iej" : imalaBlocked ? "aj" : "ej";

    const impfBase = (person: number) => {
        const prefix = buildPrefix(person, "");
        return `${prefix}${perfReduced}${iv2}`;
    };
    const impfPlural = (person: number) => {
        const prefix = buildPrefix(person, "");
        const suffix = iv2 === "i" ? "u" : pv1 === "a" && pv2 === "a" ? "aw" : "ew";
        return `${prefix}${perfReduced}${suffix}`;
    };

    const attachedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}${perfReduced}${attV}`;
    };

    const syncopatedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}${perfReduced}${attVj}`;
    };

    const { v2: impV2 } = parseVset(vsetImp);
    const suffix = impV2 === "i" ? "u" : pv1 === "a" && pv2 === "a" ? "aw" : "ew";
    const impSg = `${perfReduced}${impV2}`;
    const impPl = `${perfReduced}${suffix}`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: `${perfReduced}`,
            perfReduced: `${perfReduced}ej`,
            perf3f,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 2 && pv2 === "a") return `${C1}${pv1}${C2D}a`;
                else if (pIdx === 3) return `${perf3f.slice(0, -1)}t`;
                else if (pIdx === 7) return `${perfReduced}ew`;
                return perfRow;
            },
            impfBase,
            impfType1: attachedImperfect,
            impfType2: syncopatedImperfect,
            impfPlural,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${perfReduced}${attV}`,
                impfType2: `${perfReduced}${attVj}`,
            },
            impPlStems: {
                impfType1: impPl,
                impfType2: impPl,
            },
            blocksImala:
                imalaBlocked ||
                (typeof C3 !== "undefined" &&
                    C3 === "għ" &&
                    (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

// ── FORM III STRONG ─────────────────────────────────────────────────────────
// Long vowel pattern: CieCvC (e.g. bierek / jbierek)
export function genFormIIIStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const ImalaBlockedVowel = pv1 === "ie" ? "e" : "a";

    const perfFull = `${C1}${pv1}${C2}${pv2}${C3}`;
    const perfSync = `${C1}${pv1}${C2}${C3}`;
    const perfImalaBlocked = `${C1}${ImalaBlockedVowel}${C2}i${C3}`;

    const impfT1stem = `${C1}${iv1 === "ie" ? "e" : iv1}${C2}${applyAttachedShiftUnlessBlocked(iv2, C3, isImalaBlocked)}${C3}`;
    const impfT2stem = `${C1}${iv1}${C2}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `${C1}${iv1}${C2}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, impfT2stem, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2}${impV2}${C3}`;
    const impPl = `${C1}${impV1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: perfImalaBlocked,
            perf3f: `${perfSync}et`,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 2) return perfRow.replace(/e([^aeiou])$/, "i$1");
                if (pIdx === 3) return `${perfSync}it`;
                return perfRow;
            },
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT1stem,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${C1}${impV1 === "ie" ? "e" : impV1}${C2}${applyAttachedShiftUnlessBlocked(impV2, C3, isImalaBlocked)}${C3}`,
                impfType2: `${C1}${impV1}${C2}${C3}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

function genFormIIIHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    return genFormIIIStrong(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
}

// ── FORM III STRONG-HYBRID ────────────────────────────────────────────────
// Synthetic final-għ hybrid: qieta' / nqieta' / jqieta'
export function genFormIIIHybrid(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1 } = parseVset(vsetImpf);
    const { v1: impV1 } = parseVset(vsetImp);
    const C3Surface = C3 === "għ" ? "'" : C3;
    const shortenedIv1 = iv1 === "ie" ? "e" : iv1;
    const shortenedImpV1 = impV1 === "ie" ? "e" : impV1;

    const perfFull = `${C1}${pv1}${C2}${pv2}${C3Surface}`;
    const perfSync = `${C1}${pv1}${C2}${C3}`;
    const perfReduced = `${C1}${pv1}${C2}aj`;

    const impfBase = (person: number) => {
        const pfx = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, "");
        if (person >= 4) {
            return `${pfx}${C1}${iv1}${C2}għu`;
        }
        return `${pfx}${C1}${iv1}${C2}a'`;
    };

    const impfPlural = (person: number) => {
        const pfx = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, "");
        return `${pfx}${C1}${iv1}${C2}għu`;
    };

    const attachedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, "")}${C1}${iv1}${C2}agħ`;
    };

    const syncopatedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, "")}${C1}${shortenedIv1}${C2}${C3}`;
    };

    const impSg = `${C1}${impV1}${C2}a'`;
    const impPl = `${C1}${impV1}${C2}għu`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced,
            perf3f: `${perfSync}et`,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 2) return `${C1}${pv1}${C2}${pv2}${C3}`;
                return perfRow.replace(/e([^aeiou])$/, "i$1");
            },
            syncopatedPerfectBuilder: (syncopatedPerfect, pIdx) => {
                if (pIdx === 2) return `${C1}${pv1 === "ie" ? "e" : pv1}${C2}${C3}`;
                return syncopatedPerfect;
            },
            impfBase,
            impfType1: attachedImperfect,
            impfType2: syncopatedImperfect,
            impfPlural,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${C1}${impV1}${C2}agħ`,
                impfType2: `${C1}${shortenedImpV1}${C2}${C3}`,
            },
            impPlStems: {
                impfType1: `${C1}${iv1}${C2}għu`,
                impfType2: `${C1}${iv1}${C2}għu`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}
// ── FORM III Defective ─────────────────────────────────────────────────────────
// Long vowel pattern: CieCvC (e.g. bieda / jbiedi)
export function genFormIIIDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const normalizedVsets = normalizeFormIIIDefectiveVsets(C, vsetPerf, vsetImpf, vsetImp);
    const { v1: pv1, v2: pv2 } = parseVset(normalizedVsets.perf);
    const { v1: iv1, v2: iv2 } = parseVset(normalizedVsets.impf);
    const ImalaBlockedVowel = pv1 === "ie" ? "e" : "a";
    const suffixIV2assimilation = iv2 === "i" ? "u" : "ew";

    const perfFull = `${C1}${pv1}${C2}${pv2}`;
    const perfImalaBlocked = `${C1}${ImalaBlockedVowel}${C2}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
        return i >= 4
            ? `${pfx}${C1}${iv1}${C2}${suffixIV2assimilation}`
            : `${pfx}${C1}${iv1}${C2}${iv2}`;
    };

    const { v1: impV1, v2: impV2 } = parseVset(normalizedVsets.imp);
    const impSg = `${C1}${impV1}${C2}${impV2}`;
    const impPl = `${C1}${impV1}${C2}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: perfImalaBlocked,
            perfReduced: perfImalaBlocked + "ej",
            perf3f: `${perfImalaBlocked}iet`,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 3) return `${perfImalaBlocked}it`;
                return perfRow;
            },
            impfBase,
            impfType1: (i) =>
                buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "") +
                C1 +
                (iv1 === "ie" ? "e" : iv1) +
                C2 +
                (suffixIV2assimilation === "u" ? "i" : "a"),
            impfType2: (i) =>
                buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "") +
                C1 +
                iv1 +
                C2 +
                suffixIV2assimilation,
            impfPlural: (i) =>
                buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "") +
                C1 +
                iv1 +
                C2 +
                suffixIV2assimilation,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${C1}${impV1 === "ie" ? "e" : impV1}${C2}i`,
                impfType2: `${C1}${impV1}${C2}${suffixIV2assimilation}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

// ── FORM IV ────────────────────────────────────────────────────────────────
// Passive/reflexive of I: vCCvC / jvCCvC (e.g. akbar / jokbor)
// This is largely a theoretical form; concrete verbs may override via stored data.
function genFormIV(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const isSonorant = (c: string) => ["l", "m", "n", "r"].includes(c);
    const isGutturalLocal = (c: string) => ["għ", "ħ", "q"].includes(c);
    const shouldLicenseSyncopatedC2 = isGutturalLocal(C2) || isSonorant(C2);
    const buildSyncStem = (prefixVowel: string, themeVowel: string) =>
        shouldLicenseSyncopatedC2
            ? `${prefixVowel}${C1}${themeVowel || prefixVowel}${C2}${C3}`
            : `${prefixVowel}${C1}${C2}${C3}`;

    const perfFull = `${pv1}${C1}${C2}${pv2}${C3}`;
    const perfSync = buildSyncStem(pv1, pv2);

    const impfStemT1 = `${C1}${C2}${applyAttachedShiftUnlessBlocked(iv2, C3, isImalaBlocked, true)}${C3}`;
    const impfStemSync = buildSyncStem(iv1, iv2);

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `${iv1}${C1}${C2}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, impfStemSync, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${impV1}${C1}${C2}${impV2}${C3}`;
    const impSyncStem = buildSyncStem(impV1, impV2);
    const impPl = `${impSyncStem}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: perfFull,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    `${iv1}${impfStemT1}`,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfStemSync,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfStemSync,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${impV1}${C1}${C2}${applyAttachedShiftUnlessBlocked(impV2, C3, isImalaBlocked, true)}${C3}`,
                impfType2: impSyncStem,
            },
            impPlStems: {
                impfType1: impPl,
                impfType2: impPl,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

// ── FORM V ─────────────────────────────────────────────────────────────────
// t- + Form II: tC1vC2C2vC3 / jitC1vC2C2vC3 (e.g. tħabbat / jitħabbat)
function genFormVStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIStrong(C, vsetPerf, vsetImpf, vsetImp, verbForm, isImalaBlocked);
    return deriveTable(baseTable, "t", deriveTPrefixedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

function genFormVStrongHybrid(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIStrongHybrid(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "t", deriveTPrefixedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

function genFormVDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIDefective(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "t", deriveTPrefixedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

function genFormVHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIHollow(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "t", deriveTPrefixedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

function deriveFormVGeminatedImperfect(baseImpf: string, pIdx: number): string {
    const personPrefix = IMPERFECT_PERSON_PREFIXES[pIdx] ?? baseImpf[0] ?? "";
    return baseImpf
        .split(" / ")
        .map((part) => {
            if (!part) return part;
            const stem = stripBaseImperfectPrefix(part, pIdx);
            return `${personPrefix}i${stem}`;
        })
        .join(" / ");
}

function genFormVGeminated(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIHollow(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "t", deriveFormVGeminatedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

// ── FORM VI ────────────────────────────────────────────────────────────────
// t- + Form III: tC1ieC2vC3 / jitC1ieC2vC3 (e.g. tqatel / jitqatel)
function genFormVI(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIIStrong(C, vsetPerf, vsetImpf, vsetImp, verbForm, isImalaBlocked);
    return deriveTable(baseTable, "t", deriveTPrefixedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

function genFormVIStrongHybrid(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIIHybrid(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "t", deriveTPrefixedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

function genFormVIHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIIHollow(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "t", deriveTPrefixedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

// ── FORM VI DEFECTIVE ──────────────────────────────────────────────────────
// t- + Form III Defective: tC1ieC2a / jitC1ieC2ew
function genFormVIDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIIDefective(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "t", deriveTPrefixedImperfect, {
        perfectTransform: deriveAssimilatedTPrefixedWord,
    });
}

// ── FORM VII ───────────────────────────────────────────────────────────────
// n- + Form I: nC1vC2vC3 / jinC1vC2vC3 (e.g. nkiteb / jinkiteb)
function genFormVII(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `n${C1}${pv1}${C2}${pv2}${C3}`;
    const perfSync = `n${C1}${pv1}${C2}${C3}`;

    const impfStemT1 = `n${C1}${iv1}${C2}${applyAttachedShiftUnlessBlocked(iv2, C3, isImalaBlocked)}${C3}`;
    const impfStemSync = `n${C1}${iv1}${C2}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, "i-i").replace(/[aeiou]+$/, "");
        const stem = `i${impfStemSync.slice(0, -C3.length)}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, `i${impfStemSync}`, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `n${C1}${impV1}${C2}${impV2}${C3}`;
    const impPl = `n${C1}${impV1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: `n${C1}${pv1}${C2}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemT1}`,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `n${C1}${impV1}${C2}${applyAttachedShiftUnlessBlocked(impV2, C3, isImalaBlocked)}${C3}`,
                impfType2: `n${C1}${impV1}${C2}${C3}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

function genFormVIIHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, _C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const longV = pv2 || pv1;
    const shortV = longV === "ie" ? "i" : longV;

    const perfFull = `n${C1}${longV}${C3}`;
    const perfReduced = `n${C1}${shortV}${C3}`;
    const visibleStem = C1 === "z"
        ? `${C1}${C1}${longV}${C3}`
        : `n${C1}${longV}${C3}`;
    const shortStem = C1 === "z"
        ? `${C1}${C1}${shortV}${C3}`
        : `n${C1}${shortV}${C3}`;
    const perfectNegStem = longV === "a" ? perfFull : perfReduced;
    const personPrefix = (person: number) => IMPERFECT_PERSON_PREFIXES[person] ?? "j";
    const prefixed = (person: number, stem: string) => `${personPrefix(person)}i${stem}`;
    const impfBase = (person: number) => prefixed(person, visibleStem);
    const impfPlural = (person: number) => `${prefixed(person, visibleStem)}u`;
    const attachedImperfect = (person: number) =>
        person >= 4 ? `${prefixed(person, shortStem)}u` : prefixed(person, visibleStem);
    const syncopatedImperfect = (person: number) =>
        person >= 4 ? `${prefixed(person, shortStem)}u` : prefixed(person, shortStem);
    const impSg = perfFull;
    const impPl = `${perfFull}u`;
    const imperativeAttachedStem = impV2 ? `n${C1}${impV1}${C3}` : impSg;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: perfFull,
            perfReduced,
            perf3f: `${perfFull}et`,
            perfectNegBuilder: (perfRow, pIdx) => {
                if (pIdx === 2) return perfFull;
                if (pIdx === 3) return `${perfectNegStem}it`;
                if (pIdx === 4) return `${perfReduced}nie`;
                if (pIdx === 6) return `${perfectNegStem}u`;
                return perfRow;
            },
            impfBase,
            attachedImperfect,
            syncopatedImperfect,
            impfPlural,
            impSg,
            impPl,
            impSgStems: {
                impfType1: imperativeAttachedStem,
                impfType2: `n${C1}${shortV}${C3}`,
            },
            impPlStems: {
                impfType1: `${imperativeAttachedStem}u`,
                impfType2: `n${C1}${shortV}${C3}u`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

function genFormVIIAssimilative(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    _verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const personPrefix = (person: number) => buildPrefix(person, "i-i").replace(/[aeiou]+$/, "");
    const persons = [
        { id: "1s", en: "I" },
        { id: "2s", en: "you (sg.)" },
        { id: "3ms", en: "he" },
        { id: "3fs", en: "she" },
        { id: "1p", en: "we" },
        { id: "2p", en: "you (pl.)" },
        { id: "3p", en: "they" },
    ];

    const isLongVowel = pv1 === "ie" || iv1 === "ie" || impV1 === "ie";
    const isDoubledRetainedW = C1 === "w" && pv1 === "a" && pv2 === "a";
    const isRtDropped = C2 === "r" && C3 === "t";

    const buildDropped = (v1: string, v2: string) => {
        const full = `nt${v1}${C2}${v2}${C3}`;
        const sync = `nt${v1}${C2}${C3}`;
        const attached = `nt${v1}${C2}${applyAttachedShiftUnlessBlocked(v2, C3, isImalaBlocked)}${C3}`;
        const reduced = isRtDropped
            ? `nt${C2}${v1}${C3}`
            : `nt${v1}${C2}${applyAttachedShiftUnlessBlocked(v2, C3, isImalaBlocked)}${C3}`;
        return { full, sync, attached, attachedSync: sync, reduced };
    };

    const buildDoubled = (v1: string, v2: string) => {
        const full = `nt${C1}${v1}${C2}${C2}${v2}${C3}`;
        const sync = `nt${C1}${v1}${C2}${C2}${C3}`;
        return { full, sync, attached: full, attachedSync: sync, reduced: full };
    };

    const buildLong = (v1: string, v2: string) => {
        const full = `nt${C1}${v1}${C2}${v2}${C3}`;
        const sync = `nt${C1}${v1}${C2}${C3}`;
        const reducedV1 = v1 === "ie" ? "e" : v1;
        const reduced = `nt${C1}${reducedV1}${C2}${applyAttachedShiftUnlessBlocked(v2, C3, isImalaBlocked)}${C3}`;
        const attachedSync = `nt${C1}${reducedV1}${C2}${C3}`;
        return { full, sync, attached: reduced, attachedSync, reduced };
    };

    const patternBuilder = isLongVowel ? buildLong : isDoubledRetainedW ? buildDoubled : buildDropped;
    const perf = patternBuilder(pv1, pv2);
    const impf = patternBuilder(iv1, iv2);
    const imp = patternBuilder(impV1, impV2);

    const perfectRows = isDoubledRetainedW
        ? [
            `${perf.full}t`,
            `${perf.full}t`,
            perf.full,
            `${perf.sync}et`,
            `${perf.full}na`,
            `${perf.full}tu`,
            `${perf.sync}u`,
        ]
        : [
            `${perf.reduced}t`,
            `${perf.reduced}t`,
            perf.full,
            `${perf.sync}et`,
            `${perf.reduced}na`,
            `${perf.reduced}tu`,
            `${perf.sync}u`,
        ];

    const perfectNegRows = isDoubledRetainedW
        ? [
            perfectRows[0],
            perfectRows[1],
            perf.full,
            `${perf.sync}it`,
            `${perf.full}nie`,
            perfectRows[5],
            perfectRows[6],
        ]
        : [
            perfectRows[0],
            perfectRows[1],
            perf.attached,
            `${perf.attachedSync}it`,
            `${perf.reduced}nie`,
            perfectRows[5],
            `${perf.attachedSync}u`,
        ];

    const imperfectSingular = (person: number, stem: string) => combinePrefix(personPrefix(person), `i${stem}`);
    const imperfectPlural = (person: number) => combinePrefixPlural(personPrefix(person), `i${impf.sync}`, "u");
    const imperfectRows = persons.map((_, person) =>
        person >= 4 ? imperfectPlural(person) : imperfectSingular(person, impf.full)
    );

    const imperfectAttachedRows = persons.map((_, person) =>
        person >= 4 ? combinePrefixPlural(personPrefix(person), `i${impf.attachedSync}`, "u") : imperfectSingular(person, impf.attached)
    );
    const imperfectSyncopatedRows = persons.map((_, person) =>
        person >= 4 ? imperfectPlural(person) : imperfectSingular(person, impf.sync)
    );

    const rows: ConjugationRow[] = persons.map((person, index) => ({
        person_mt: person.id,
        person_en: person.en,
        imperfect: imperfectRows[index],
        perfect: perfectRows[index],
        perfect_neg: perfectNegRows[index],
        stems: {
            attached: imperfectAttachedRows[index],
            syncopated: imperfectSyncopatedRows[index],
            perfectAttached: perfectNegRows[index],
            perfectSyncopated: index === 2 ? perf.sync : perfectNegRows[index],
        },
    }));

    return {
        rows,
        imperative_sg: imp.full,
        imperative_pl: `${imp.sync}u`,
        imperative_sg_stems: {
            attached: imp.attached,
            syncopated: imp.sync,
        },
        imperative_pl_stems: {
            attached: `${imp.sync}u`,
            syncopated: `${imp.sync}u`,
        },
        blocksImala:
            isImalaBlocked ||
            (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
    };
}

function genFormVIIStrongHybrid(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genDefectiveGħ(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "n", (str) => infixAfterInitialWithMetathesis(str, "in"));
}

function genFormVIIDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    _vsetImp: string,
    _verbForm: string,
    isImalaBlocked: boolean = false,
    citationForm: string = "",
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const citation = String(citationForm || "").trim().toLowerCase().replace(/[’]/g, "'");
    const finalAVariant = pv2 === "a" && (pv1 === "a" || pv1 === "u");
    const useXtStem =
        C1 === "x" &&
        (citation.startsWith("nxt") ||
            (!citation && (C2 === "r" || C2 === "h")));
    const useDroppedWNtStem = C1 === "w" && C2 === "ż";
    const useRetainedWNtStem = C1 === "w" && C2 === "r";
    const useFullNoFinalSync = (C1 === "għ" && C2 === "t" && finalAVariant) || useDroppedWNtStem || useRetainedWNtStem;

    const perfFull = useXtStem
        ? `n${C1}t${pv1}${C2}${pv2}`
        : useDroppedWNtStem
            ? `nt${pv1}${C2}${pv2}`
            : useRetainedWNtStem
                ? `nt${C1}${pv1}${C2}${pv2}`
                : `n${C1}${pv1}${C2}${pv2}`;
    const perfFullNoFinal = pv2 && perfFull.endsWith(pv2)
        ? perfFull.slice(0, -pv2.length)
        : perfFull;
    const perfSync = useXtStem
        ? `n${C1}t${C2}`
        : useFullNoFinalSync
            ? perfFullNoFinal
            : `n${C1}${C2}`;
    const reducedTheme = finalAVariant ? "aj" : "ej";
    const pluralSuffix = finalAVariant ? "aw" : "ew";
    const feminineSuffix = finalAVariant ? "at" : "iet";
    const perfReduced = `${perfSync}${reducedTheme}`;
    const perf3f = `${perfSync}${feminineSuffix}`;
    const perf3p = `${perfSync}${pluralSuffix}`;
    const attachedSingular = finalAVariant ? perfFull : `${perfFullNoFinal}ie`;
    const personPrefix = (person: number) => buildPrefix(person, "i-i").replace(/[aeiou]+$/, "");

    const imperfectSingular = (person: number, stem: string) =>
        combinePrefix(personPrefix(person), `i${stem}`);
    const imperfectPlural = (person: number) =>
        combinePrefix(personPrefix(person), `i${perf3p}`);
    const imperfectAttached = (person: number) =>
        person >= 4 ? imperfectPlural(person) : imperfectSingular(person, attachedSingular);
    const imperfectSyncopated = (person: number) =>
        person >= 4 ? imperfectPlural(person) : imperfectSingular(person, finalAVariant ? perfFullNoFinal : `${perfSync}${pv1}`);

    const perfectRows = [
        `${perfReduced}t`,
        `${perfReduced}t`,
        perfFull,
        perf3f,
        `${perfReduced}na`,
        `${perfReduced}tu`,
        perf3p,
    ];
    const perfectNegRows = perfectRows.map((row, index) => index === 2 ? attachedSingular : row);
    const persons = [
        { id: "1s", en: "I" },
        { id: "2s", en: "you (sg.)" },
        { id: "3ms", en: "he" },
        { id: "3fs", en: "she" },
        { id: "1p", en: "we" },
        { id: "2p", en: "you (pl.)" },
        { id: "3p", en: "they" },
    ];
    const rows: ConjugationRow[] = persons.map((person, index) => ({
        person_mt: person.id,
        person_en: person.en,
        imperfect: index >= 4 ? imperfectPlural(index) : imperfectSingular(index, perfFull),
        perfect: perfectRows[index],
        perfect_neg: perfectNegRows[index],
        stems: {
            attached: imperfectAttached(index),
            syncopated: imperfectSyncopated(index),
            perfectAttached: perfectNegRows[index],
            perfectSyncopated: index === 2
                ? finalAVariant ? perfFullNoFinal : `${perfSync}${pv1}`
                : perfectNegRows[index],
        },
    }));

    const blocksImala =
        isImalaBlocked ||
        finalAVariant ||
        (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")));

    return {
        rows,
        imperative_sg: perfFull,
        imperative_pl: perf3p,
        imperative_sg_stems: {
            attached: attachedSingular,
            syncopated: finalAVariant ? perfFullNoFinal : `${perfSync}${pv1}`,
        },
        imperative_pl_stems: {
            attached: perf3p,
            syncopated: perf3p,
        },
        blocksImala,
    };
}

// ── FORM VIII ──────────────────────────────────────────────────────────────
// Infixed -t-: C1tvC2vC3 / jiC1tvC2vC3 (e.g. ftakar / jiftakar)
// Pharyngeal C1 variant: eC1tvC2vC3 (e.g. eħtaġ / jeħtieġ)
function genFormVIII(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
    strength: string = "strong",
    weakClass: string = "",
    citationForm: string = "",
): VerbConjugationTable {
    const profiledTable = genProfiledFormVIII(
        C,
        strength,
        weakClass,
        citationForm,
        isImalaBlocked,
        vsetPerf,
    );
    if (profiledTable) return profiledTable;

    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const pharyngealC1 = isPharyngeal(C1);
    const gutturalC1 = isGuttural(C1);
    const pfxV = gutturalC1 ? "e" : "i";

    // Form VIII prefixes pharyngeal C1 għ with e-: egħtażel, not *għtażel.
    const perfFull = pharyngealC1
        ? `e${C1}t${pv1}${C2}${pv2}${C3}`
        : `${C1}t${pv1}${C2}${pv2}${C3}`;
    const perfSync = pharyngealC1
        ? `e${C1}t${pv1}${C2}${C3}`
        : `${C1}t${pv1}${C2}${C3}`;

    const impfCoreT1 = `${C1}t${iv1}${C2}${applyAttachedShiftUnlessBlocked(iv2, C3, isImalaBlocked)}${C3}`;
    const impfCoreSync = `${C1}t${iv1}${C2}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, "i-i").replace(/[aeiou]+$/, "");
        const stem = `${pfxV}${C1}t${iv1}${C2}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, `${pfxV}${impfCoreSync}`, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = pharyngealC1
        ? `e${C1}t${impV1}${C2}${impV2}${C3}`
        : `${C1}t${impV1}${C2}${impV2}${C3}`;
    const impPl = pharyngealC1
        ? `e${C1}t${impV1}${C2}${C3}u`
        : `${C1}t${impV1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: pharyngealC1
                ? `e${C1}t${pv1}${C2}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`
                : `${C1}t${pv1}${C2}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `${pfxV}${impfCoreT1}`,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `${pfxV}${impfCoreSync}`,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `${pfxV}${impfCoreSync}`,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1:
                    (pharyngealC1 ? "e" : "") +
                    C1 +
                    "t" +
                    impV1 +
                    C2 +
                    applyAttachedShiftUnlessBlocked(impV2, C3, isImalaBlocked, true) +
                    C3,
                impfType2: (pharyngealC1 ? "e" : "") + C1 + "t" + impV1 + C2 + C3,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

type ProfiledConjugationInput = {
    imperfect: string[];
    imperfectAttached?: string[];
    imperfectSyncopated?: string[];
    perfect: string[];
    perfectNeg?: string[];
    imperative: [string, string];
    imperativeStems?: {
        singular?: StemVariantSet;
        plural?: StemVariantSet;
    };
    blocksImala?: boolean;
};

function buildProfiledConjugationTable(profile: ProfiledConjugationInput): VerbConjugationTable {
    const persons = [
        { id: "1s", en: "I" },
        { id: "2s", en: "you (sg.)" },
        { id: "3ms", en: "he" },
        { id: "3fs", en: "she" },
        { id: "1p", en: "we" },
        { id: "2p", en: "you (pl.)" },
        { id: "3p", en: "they" },
    ];
    const imperfectAttached = profile.imperfectAttached ?? profile.imperfect;
    const imperfectSyncopated = profile.imperfectSyncopated ?? imperfectAttached;
    const perfectNeg = profile.perfectNeg ?? profile.perfect;

    const rows: ConjugationRow[] = persons.map((person, index) => ({
        person_mt: person.id,
        person_en: person.en,
        imperfect: profile.imperfect[index],
        perfect: profile.perfect[index],
        perfect_neg: perfectNeg[index],
        stems: {
            attached: imperfectAttached[index],
            syncopated: imperfectSyncopated[index],
            perfectAttached: perfectNeg[index],
            perfectSyncopated: perfectNeg[index],
        },
    }));

    return {
        rows,
        imperative_sg: profile.imperative[0],
        imperative_pl: profile.imperative[1],
        imperative_sg_stems: profile.imperativeStems?.singular ?? {
            attached: profile.imperative[0],
            syncopated: profile.imperative[0],
        },
        imperative_pl_stems: profile.imperativeStems?.plural ?? {
            attached: profile.imperative[1],
            syncopated: profile.imperative[1],
        },
        blocksImala: profile.blocksImala,
    };
}

function formVIIIStemProfile(
    imperfectSgStem: string,
    imperfectPlStem: string,
    perfect: {
        full: string;
        reduced: string;
        feminine: string;
        plural: string;
    },
    imperative: [string, string],
    options: {
        imperfectAttachedSgStem?: string;
        imperfectAttachedPlStem?: string;
        perfectNeg3ms?: string;
        perfectNeg3fs?: string;
        perfectNeg1p?: string;
        perfectNeg3p?: string;
        blocksImala?: boolean;
    } = {},
): ProfiledConjugationInput {
    const prefix = (index: number, stem: string) => `${IMPERFECT_PERSON_PREFIXES[index] ?? "j"}${stem}`;
    const imperfect = [0, 1, 2, 3, 4, 5, 6].map((index) =>
        prefix(index, index >= 4 ? imperfectPlStem : imperfectSgStem)
    );
    const imperfectAttachedSgStem = options.imperfectAttachedSgStem ?? imperfectSgStem;
    const imperfectAttachedPlStem = options.imperfectAttachedPlStem ?? imperfectPlStem;
    const imperfectAttached = [0, 1, 2, 3, 4, 5, 6].map((index) =>
        prefix(index, index >= 4 ? imperfectAttachedPlStem : imperfectAttachedSgStem)
    );
    const perfectRows = [
        `${perfect.reduced}t`,
        `${perfect.reduced}t`,
        perfect.full,
        perfect.feminine,
        `${perfect.reduced}na`,
        `${perfect.reduced}tu`,
        perfect.plural,
    ];
    const perfectNeg = [
        perfectRows[0],
        perfectRows[1],
        options.perfectNeg3ms ?? perfect.full,
        options.perfectNeg3fs ?? perfect.feminine,
        options.perfectNeg1p ?? `${perfect.reduced}nie`,
        perfectRows[5],
        options.perfectNeg3p ?? perfect.plural,
    ];

    return {
        imperfect,
        imperfectAttached,
        perfect: perfectRows,
        perfectNeg,
        imperative,
        blocksImala: options.blocksImala,
    };
}

function buildGeminatedSurfaceProfile(
    imperfectSgStem: string,
    imperfectPlStem: string,
    perfect: {
        full: string;
        reduced: string;
        feminine: string;
        plural: string;
    },
    imperative: [string, string],
    options: {
        imperfectAttachedPlStem?: string;
        perfectNeg3fs?: string;
        perfectNeg3p?: string;
    } = {},
): VerbConjugationTable {
    return buildProfiledConjugationTable(formVIIIStemProfile(
        imperfectSgStem,
        imperfectPlStem,
        perfect,
        imperative,
        options,
    ));
}

function normalizeCitationKey(citationForm: string): string {
    return citationForm.trim().toLowerCase().replace(/[’]/g, "'");
}

function citationSurface(citationForm: string): string {
    return citationForm.trim();
}

function genFormVIIIStrongHybridProfile(
    C: string[],
    citationForm: string,
): VerbConjugationTable | null {
    const [C1, C2, C3] = C;
    if (C3 !== "għ" && C3 !== "gh") return null;

    const visibleQuote = citationForm.includes("’") ? "’" : "'";
    const full = citationSurface(citationForm) || `${C1}te${C2}a${visibleQuote}`;
    const sync = `${C1}te${C2}${C3}`;
    const reduced = `${C1}t${C2}aj`;

    return buildProfiledConjugationTable(formVIIIStemProfile(
        `i${full}`,
        `i${sync}u`,
        {
            full,
            reduced,
            feminine: `${sync}et`,
            plural: `${sync}u`,
        },
        [full, `${sync}u`],
        {
            imperfectAttachedSgStem: `i${full.replace(/[’']$/, "")}`,
            perfectNeg3ms: full.replace(/[’']$/, ""),
            blocksImala: true,
        },
    ));
}

function genFormVIIIHollowProfile(
    C: string[],
    citationForm: string,
    isImalaBlocked: boolean,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const surface = citationSurface(citationForm);
    const full = surface || (
        isImalaBlocked
            ? `${C1}ta${C3}`
            : C2 === "j"
                ? `${C1}${C3}ie${C3}`
                : `${C1}tie${C3}`
    );
    const reduced = isImalaBlocked
        ? full
        : C2 === "j"
            ? `${C1}${C3}i${C3}`
            : `${C1}ti${C3}`;
    const imperfectPrefix = isGuttural(C1) ? "e" : "i";

    return buildProfiledConjugationTable(formVIIIStemProfile(
        `${imperfectPrefix}${full}`,
        `${imperfectPrefix}${full}u`,
        {
            full,
            reduced,
            feminine: `${full}et`,
            plural: `${full}u`,
        },
        [full, `${full}u`],
        {
            imperfectAttachedPlStem: `${imperfectPrefix}${reduced}u`,
            perfectNeg3fs: `${reduced}it`,
            perfectNeg3p: `${reduced}u`,
            blocksImala: isImalaBlocked,
        },
    ));
}

function defaultFormVIIIDefectiveSurface(C: string[]): string {
    const [C1, C2] = C;
    if (C2 === "għ" || C2 === "gh") return `${C1}ta${C2}a`;
    if (C2 === "r") return `${C1}ta${C2}a`;
    return `${C1}te${C2}a`;
}

function genFormVIIIDefectiveProfile(
    C: string[],
    citationForm: string,
    isImalaBlocked: boolean,
): VerbConjugationTable {
    const [C1, C2] = C;
    const full = citationSurface(citationForm) || defaultFormVIIIDefectiveSurface(C);
    const key = normalizeCitationKey(full);
    const cluster = `${C1}t${C2}`;

    if (key.endsWith("ara")) {
        const reduced = `${cluster}aj`;
        const feminine = `${cluster}at`;
        const plural = `${cluster}aw`;
        return buildProfiledConjugationTable(formVIIIStemProfile(
            `i${cluster}i`,
            `i${cluster}u`,
            { full, reduced, feminine, plural },
            [`i${cluster}i`, `i${cluster}u`],
            {
                perfectNeg3ms: full,
                perfectNeg3fs: feminine,
                perfectNeg3p: plural,
                blocksImala: true,
            },
        ));
    }

    if (C2 === "għ" || C2 === "gh" || key.endsWith("agħa") || key.endsWith("agha")) {
        const reduced = `${cluster}aj`;
        const feminine = `${cluster}at`;
        const plural = `${cluster}aw`;
        return buildProfiledConjugationTable(formVIIIStemProfile(
            `i${full}`,
            `i${plural}`,
            { full, reduced, feminine, plural },
            [full, plural],
            {
                perfectNeg3ms: full,
                perfectNeg3fs: feminine,
                perfectNeg3p: plural,
                blocksImala: true,
            },
        ));
    }

    if (key.endsWith("eha")) {
        const reduced = `${cluster}ej`;
        const feminine = `${cluster}iet`;
        const plural = `${cluster}ew`;
        return buildProfiledConjugationTable(formVIIIStemProfile(
            `i${cluster}i`,
            `i${cluster}u`,
            { full, reduced, feminine, plural },
            [`i${cluster}i`, `i${cluster}u`],
            {
                perfectNeg3ms: `${full.slice(0, -1)}ie`,
                perfectNeg3fs: feminine,
                perfectNeg3p: plural,
            },
        ));
    }

    if (key.endsWith("ewa")) {
        const reduced = `${cluster}ej`;
        const feminine = `${cluster}iet`;
        const plural = `${cluster}ew`;
        const attachedSg = `i${full.slice(0, -1)}ie`;
        return buildProfiledConjugationTable(formVIIIStemProfile(
            `i${full}`,
            `i${plural}`,
            { full, reduced, feminine, plural },
            [full, plural],
            {
                imperfectAttachedSgStem: attachedSg,
                perfectNeg3ms: full.slice(0, -1) + "ie",
                perfectNeg3fs: feminine,
                perfectNeg3p: plural,
            },
        ));
    }

    const base = full.slice(0, -1);
    const reduced = `${base}ej`;
    const feminine = `${base}iet`;
    const plural = `${base}ew`;
    return buildProfiledConjugationTable(formVIIIStemProfile(
        `i${full}`,
        `i${plural}`,
        { full, reduced, feminine, plural },
        [full, plural],
        {
            imperfectAttachedSgStem: `i${base}ie`,
            perfectNeg3ms: `${base}ie`,
            perfectNeg3fs: feminine,
            perfectNeg3p: plural,
            blocksImala: isImalaBlocked,
        },
    ));
}

function genFormVIIIGeminatedProfile(
    C: string[],
    vsetPerf: string,
    citationForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1 } = parseVset(vsetPerf);
    const full = citationSurface(citationForm) || `${C1}t${v1}${C2}${C3}`;
    const plural = v1 === "a" ? `${full}u` : `${full}ew`;
    const reduced = `${full}ej`;

    return buildProfiledConjugationTable(formVIIIStemProfile(
        `i${full}`,
        `i${full}u`,
        { full, reduced, feminine: `${full}et`, plural },
        [full, `${full}u`],
        {
            perfectNeg3fs: `${full}it`,
            perfectNeg3p: `${full}u`,
        },
    ));
}

function genProfiledFormVIII(
    C: string[],
    strength: string,
    weakClass: string,
    citationForm: string,
    isImalaBlocked: boolean = false,
    vsetPerf: string = "a-a",
): VerbConjugationTable | null {
    const citation = normalizeCitationKey(citationForm);

    if (strength === "strong-hybrid" || citation.endsWith("a'")) {
        return genFormVIIIStrongHybridProfile(C, citationForm);
    }

    if (weakClass === "hollow" || citation === "stad" || citation === "ħtieġ" || citation === "htieg" || citation === "żdied") {
        return genFormVIIIHollowProfile(C, citationForm, isImalaBlocked);
    }

    if (strength === "geminated" || citation === "xtedd" || citation === "rtadd") {
        return genFormVIIIGeminatedProfile(C, vsetPerf, citationForm);
    }

    if (weakClass === "defective") {
        return genFormVIIIDefectiveProfile(C, citationForm, isImalaBlocked);
    }

    return null;
}

function genFormVIGeminated(C: string[]): VerbConjugationTable {
    const [C1, C2] = C;
    const full = `t${C1}a${C2}a${C2}`;
    const sync = `t${C1}a${C2}${C2}`;

    return buildGeminatedSurfaceProfile(
        `i${full}`,
        `i${sync}u`,
        {
            full,
            reduced: full,
            feminine: `${sync}et`,
            plural: `${sync}u`,
        },
        [full, `${sync}u`],
        {
            perfectNeg3fs: `${sync}it`,
        },
    );
}

function genFormVIIGeminated(C: string[], vsetPerf: string): VerbConjugationTable {
    const [C1, C2] = C;
    const { v1 } = parseVset(vsetPerf);
    const full = `n${C1}${v1}${C2}${C2}`;
    const reduced = `${full}ej`;

    return buildGeminatedSurfaceProfile(
        `i${full}`,
        `i${full}u`,
        {
            full,
            reduced,
            feminine: `${full}et`,
            plural: v1 === "e" ? `${full}u` : `${full}ew`,
        },
        [full, `${full}u`],
        {
            perfectNeg3fs: `${full}it`,
        },
    );
}

function genFormIXGeminated(C: string[], vsetPerf: string): VerbConjugationTable {
    const [C1, C2] = C;
    const { v1 } = parseVset(vsetPerf);
    const full = `${C1}${C2}${v1}${C2}`;
    const reduced = v1 === "ie" ? `${C1}${C2}i${C2}` : full;
    const plural = `${full}u`;

    return buildGeminatedSurfaceProfile(
        `i${full}`,
        `i${plural}`,
        {
            full,
            reduced,
            feminine: `${full}et`,
            plural,
        },
        [full, plural],
        {
            imperfectAttachedPlStem: v1 === "ie" ? `i${reduced}u` : undefined,
            perfectNeg3fs: `${reduced}it`,
            perfectNeg3p: `${reduced}u`,
        },
    );
}

// ── FORM IX ────────────────────────────────────────────────────────────────
// Stative/colour: C1C2ieC3 / jiC1C2ieC3 (e.g. ħmier / jiħmier)
function genFormIX(
    C: string[],
    _vsetPerf: string,
    _vsetImpf: string,
    _vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const pharyngealC1 = isPharyngeal(C1);
    const C1isAssimilative = C1 === 'w' || C1 === 'j' ? C2 : C1;

    const perfBase = pharyngealC1 ? `${C1isAssimilative}e${C2}ie${C3}` : `${C1isAssimilative}${C2}ie${C3}`
    const perfSync = pharyngealC1 ? `${C1isAssimilative}e${C2}i${C3}` : `${C1isAssimilative}${C2}i${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, "i-i").replace(/[aeiou]+$/, "");
        const stem = `i${perfBase}`;
        return combinePrefix(pfx, stem);
    };

    const impSg = perfBase;
    const impPl = perfSync + "u";

    return buildConjugationTable(
        {
            perfFull: perfBase,
            perfSync,
            perfReduced: perfSync,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${perfBase}`,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${perfSync}`,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${perfSync}`,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: { impfType1: perfSync, impfType2: perfSync },
            blocksImala: false,
        },
        C3,
        verbForm,
    );
}

// ── FORM Xa ────────────────────────────────────────────────────────────────
// Causative: stvC1C2vC3 / jistvC1C2vC3 (e.g. stagħġeb / jistagħġeb)
function genFormXaStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `st${pv1}${C1}${C2}${pv2}${C3}`;
    const perfSync = `st${pv1}${C1}${C2}${C3}`;

    const impfStemT1 = `st${iv1}${C1}${C2}${applyAttachedShiftUnlessBlocked(iv2, C3, isImalaBlocked)}${C3}`;
    const impfStemSync = `st${iv1}${C1}${C2}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, "i-i").replace(/[aeiou]+$/, "");
        const stem = `i${impfStemSync.slice(0, -C3.length)}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, `i${impfStemSync}`, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `st${impV1}${C1}${C2}${impV2}${C3}`;
    const impPl = `st${impV1}${C1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: `st${pv1}${C1}${C2}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemT1}`,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `st${impV1}${C1}${C2}${applyAttachedShiftUnlessBlocked(impV2, C3, isImalaBlocked)}${C3}`,
                impfType2: `st${impV1}${C1}${C2}${C3}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

function genFormXaStrongHybrid(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `st${pv1}${C1}${C2}${pv2}`;
    const perfSync = `st${pv1}${C1}${C2}${C3}`;
    const perfReduced = `st${pv1}${C1}${C2}${pv1}j`;
    const impfStemSync = `st${iv1}${C1}${C2}${C3}`;

    const impfBase = (person: number) => {
        const pfx = buildPrefix(person, "i-i").replace(/[aeiou]+$/, "");
        if (person >= 4) return combinePrefixPlural(pfx, `i${impfStemSync}`, "u");
        return combinePrefix(pfx, `i${impfStemSync.slice(0, -C3.length)}${iv2}'`);
    };

    const attachedImperfect = (person: number) => {
        const pfx = buildPrefix(person, "i-i").replace(/[aeiou]+$/, "");
        if (person >= 4) return combinePrefixPlural(pfx, `i${impfStemSync}`, "u");
        return combinePrefix(pfx, `i${impfStemSync.slice(0, -C3.length)}${iv2}${C3}`);
    };

    const syncopatedImperfect = (person: number) => {
        const pfx = buildPrefix(person, "i-i").replace(/[aeiou]+$/, "");
        if (person >= 4) return combinePrefixPlural(pfx, `i${impfStemSync}`, "u");
        return combinePrefix(pfx, `i${impfStemSync}`);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `st${impV1}${C1}${C2}${impV2}'`;
    const impPl = `st${impV1}${C1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced,
            perf3f: `${perfSync}et`,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 2) return `st${pv1}${C1}${C2}${pv2}${C3}`;
                return perfRow.replace(/e([^aeiou])$/, "i$1");
            },
            impfBase,
            impfType1: attachedImperfect,
            impfType2: syncopatedImperfect,
            impfPlural: (person) =>
                combinePrefixPlural(
                    buildPrefix(person, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `st${impV1}${C1}${C2}${impV2}${C3}`,
                impfType2: `st${impV1}${C1}${C2}${C3}`,
            },
            impPlStems: {
                impfType1: impPl,
                impfType2: impPl,
            },
            blocksImala: isImalaBlocked || C3 === "għ",
        },
        C3,
        verbForm,
    );
}

function genFormXaDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `st${pv1}${C1}${C2}${pv2}${C3}`;
    const perfSync = `st${pv1}${C1}${C2}${C3}`;

    const impfStemT1 = `st${iv1}${C1}${C2}${applyAttachedShiftUnlessBlocked(iv2, C3, isImalaBlocked)}${C3}`;
    const impfStemSync = `st${iv1}${C1}${C2}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, "i-i").replace(/[aeiou]+$/, "");
        const stem = `i${impfStemSync.slice(0, -C3.length)}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, `i${impfStemSync}`, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `st${impV1}${C1}${C2}${impV2}${C3}`;
    const impPl = `st${impV1}${C1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: `st${pv1}${C1}${C2}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemT1}`,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `st${impV1}${C1}${C2}${applyAttachedShiftUnlessBlocked(impV2, C3, isImalaBlocked)}${C3}`,
                impfType2: `st${impV1}${C1}${C2}${C3}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

function genFormXaHollow(C: string[]): VerbConjugationTable {
    const [, , C3] = C;
    const full = `stgħa${C3}`;

    return buildProfiledConjugationTable(formVIIIStemProfile(
        `i${full}`,
        `i${full}u`,
        {
            full,
            reduced: full,
            feminine: `${full}et`,
            plural: `${full}u`,
        },
        [full, `${full}u`],
        {
            perfectNeg3fs: `${full}it`,
        },
    ));
}

function genFormXaGeminated(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1 } = parseVset(vsetPerf);
    const { v1: iv1 } = parseVset(vsetImpf);

    const perfFull = `st${C1}${pv1}${C2}${C3}`; // stħaqq
    const perfSync = perfFull; // stħaqq

    const impfStemT1 = `st${C1}${iv1}${C2}${C3}`;
    const impfStemSync = impfStemT1;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, "i-i").replace(/[aeiou]+$/, "");
        const stem = `i${impfStemSync.slice(0, -C3.length)}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, `i${impfStemSync}`, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1 } = parseVset(vsetImp);
    const impSg = `st${C1}${impV1}${C2}${C3}`; // stħoqq
    const impPl = `st${C1}${impV1}${C2}${C3}u`; // stħoqqu

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: perfFull,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemT1}`,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, "i-i").replace(/[aeiou]+$/, ""),
                    `i${impfStemSync}`,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: impSg,
                impfType2: impSg,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
        },
        C3,
        verbForm,
    );
}

// ── FORM Xb ────────────────────────────────────────────────────────────────
// Causative intensive: stC1vC2C2vC3 / jistC1vC2C2vC3 (e.g. stħarreg / jistħarreg)
function genFormXbStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;

    const perfFull = `st${C1}${pv1}${C2D}${cleanThemeVowel(pv2, C3)}${C3}`;
    const perfSync = `st${C1}${pv1}${C2D}${C3}`;

    const impfT1stem = `ist${C1}${iv1}${C2D}${applyAttachedShiftUnlessBlocked(iv2, C3, isImalaBlocked)}${C3}`;
    const impfT2stem = `ist${C1}${iv1}${C2D}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `ist${C1}${iv1}${C2D}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, impfT2stem, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = perfFull;
    const impPl = perfSync + "u";

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: `st${C1}${pv1}${C2D}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT1stem,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `st${C1}${impV1}${C2D}${applyAttachedShiftUnlessBlocked(impV2, C3, isImalaBlocked)}${C3}`,
                impfType2: `st${C1}${impV1}${C2D}${C3}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

function genFormXbStrongHybrid(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIStrongHybrid(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "st", (str) => infixAfterInitial(str, "ist"));
}

function deriveFormXbGeminatedImperfect(baseImpf: string, pIdx: number): string {
    const personPrefix = IMPERFECT_PERSON_PREFIXES[pIdx] ?? baseImpf[0] ?? "";
    return baseImpf
        .split(" / ")
        .map((part) => {
            if (!part) return part;
            const stem = stripBaseImperfectPrefix(part, pIdx);
            const xStem = stem.startsWith("t") ? stem.slice(1) : stem;
            return `${personPrefix}ist${xStem}`;
        })
        .join(" / ");
}

function genFormXbGeminated(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const baseTable = genFormIIHollow(
        C,
        vsetPerf,
        vsetImpf,
        vsetImp,
        verbForm,
        isImalaBlocked,
    );
    return deriveTable(baseTable, "st", deriveFormXbGeminatedImperfect);
}

// ── FORM Xb Hollow ─────────────────────────────────────────────────────────
// Doubled C2: stCvCCvC pattern (e.g. stħajjel / jistħajjel)

function genFormXbHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;

    const perfFull = `st${C1}${pv1}${C2D}${cleanThemeVowel(pv2, C3)}${C3}`;
    const perfSync = `st${C1}${pv1}${C2}${C3}`;

    const impfT1stem = `ist${C1}${iv1}${C2D}${applyAttachedShiftUnlessBlocked(iv2, C3, isImalaBlocked)}${C3}`;
    const impfT2stem = `ist${C1}${iv1}${C2}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `st${C1}${iv1}${C2D}${iv2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, impfT2stem, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `st${C1}${impV1}${C2D}${impV2}${C3}`;
    const impPl = `st${C1}${impV1}${C2}${C3}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync,
            perfReduced: `st${C1}${pv1}${C2D}${attachedPerfectVowel(pv1, pv2, C3, isImalaBlocked)}${C3}`,
            perf3f: `${perfSync}et`,
            impfBase,
            impfType1: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT1stem,
                ),
            impfType2: (i) =>
                combinePrefix(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    impfT2stem,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `st${C1}${impV1}${C2D}${applyAttachedShiftUnlessBlocked(impV2, C3, isImalaBlocked)}${C3}`,
                impfType2: `st${C1}${impV1}${C2}${C3}`,
            },
            blocksImala:
                isImalaBlocked ||
                (C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}
// ── FORM Xb DEFECTIVE ──────────────────────────────────────────────────────
// Defective Form Xb (e.g. sthewwa / sthewwa)
// C3 is dropped/vocalized.

function genFormXbDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
    isImalaBlocked: boolean = false,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: _iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;

    const perfFull = `st${C1}${pv1}${C2D}${pv2}`; // nessa
    const perf3f = `st${C1}${pv1}${C2D}iet`; // nessiet
    const perfReduced = `st${C1}${pv1}${C2D}`; // -ness-

    const imalaBlocked = isImalaBlocked;
    const attV = applyAttachedShiftUnlessBlocked(iv2 || "a", C3, imalaBlocked, true);
    const attVj = attV === "ie" ? "iej" : imalaBlocked ? "aj" : "ej";

    const impfBase = (person: number) => {
        const prefix = buildPrefix(person, "");
        return `${prefix}i${perfReduced}${iv2}`;
    };
    const impfPlural = (person: number) => {
        const prefix = buildPrefix(person, "");
        const suffix =
            impV2 === "i" ? "u" : pv1 === "a" && pv2 === "a" ? "aw" : "ew";
        return `${prefix}i${perfReduced}${suffix}`;
    };

    const attachedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}i${perfReduced}${attV}`;
    };

    const syncopatedImperfect = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}${perfReduced}${attVj}`;
    };

    const { v2: impV2 } = parseVset(vsetImp);
    const suffix = impV2 === "i" ? "u" : pv1 === "a" && pv2 === "a" ? "aw" : "ew";
    const impSg = `${perfReduced}${impV2}`;
    const impPl = `${perfReduced}${suffix}`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: `${perfReduced}`,
            perfReduced: `${perfReduced}ej`,
            perf3f,
            attachedPerfectBuilder: (perfRow, pIdx) => {
                if (pIdx === 2 && pv2 === "a") return `st${C1}${pv1}${C2D}ie`;
                else if (pIdx === 3) return `${perf3f.slice(0, -1)}t`;
                else if (pIdx === 7) return `${perfReduced}ew`;
                return perfRow;
            },
            impfBase,
            impfType1: attachedImperfect,
            impfType2: syncopatedImperfect,
            impfPlural,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${perfReduced}${attV}`,
                impfType2: `${perfReduced}${attVj}`,
            },
            impPlStems: {
                impfType1: impPl,
                impfType2: impPl,
            },
            blocksImala:
                imalaBlocked ||
                (typeof C3 !== "undefined" &&
                    C3 === "għ" &&
                    (vsetImpf.endsWith("a") || vsetPerf.endsWith("a"))),
        },
        C3,
        verbForm,
    );
}

// ── Main entry point ───────────────────────────────────────────────────────

/**
 * Generate the full conjugation table for a Form I Maltese verb.
 * Returns a VerbConjugationTable that can be used directly in the UI.
 *
 * For verbs with manually stored conjugation data, prefer using that directly.
 */
export function generateConjugation(
    input: ConjugationInput,
): VerbConjugationTable {
    const consonants = input.root.split("-").filter(Boolean);
    const form = input.form;
    const strength = (input.strength || "strong").toLowerCase();
    const weakClass = input.weakClass?.toLowerCase();
    const isQuadriliteral = consonants.length === 4;

    if (isQuadriliteral) {
        if (form === "I") {
            if (strength === "weak" && weakClass === "defective") {
                return buildWeakQuadriliteralDefectiveConjugation(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.isImalaBlocked,
                    "I",
                );
            }
            return generateQuadriliteralFormI(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.isImalaBlocked,
            );
        }
        if (form === "II") {
            if (strength === "weak" && weakClass === "defective") {
                return buildWeakQuadriliteralDefectiveConjugation(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.isImalaBlocked,
                    "II",
                );
            }
            const formI = generateQuadriliteralFormI(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.isImalaBlocked,
            );
            return deriveQuadriliteralFormII(formI);
        }
    }

    if (form === "I") {
        if (strength === "geminated") {
            return genGeminated(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
            );
        }
        if (strength === "strong") {
            return genStrong(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "strong-hybrid") {
            return genDefectiveGħ(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak") {
            switch (weakClass) {
                case "assimilative":
                    return genAssimilative(
                        consonants,
                        input.vowelSetPerfect,
                        input.vowelSetImperfect,
                        input.vowelSetImperative,
                        form,
                        input.isImalaBlocked,
                    );
                case "hollow":
                    return genHollow(
                        consonants,
                        input.vowelSetPerfect,
                        input.vowelSetImperfect,
                        input.vowelSetImperative,
                        form,
                    );
                case "defective":
                    return genDefective(
                        consonants,
                        input.vowelSetPerfect,
                        input.vowelSetImperfect,
                        input.vowelSetImperative,
                        form,
                        input.isImalaBlocked,
                        input.headword || input.citationForm,
                    );
                default:
                    throw new Error(
                        `Unknown weak classification for Form I: ${weakClass}`,
                    );
            }
        }
    }

    if (form === "II") {
        if (strength === "strong-hybrid") {
            return genFormIIStrongHybrid(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "strong") {
            return genFormIIStrong(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak") {
            if (weakClass === "assimilative") {
                return genFormIIStrong(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
                    input.isImalaBlocked,
                );
            }
            if (weakClass === "hollow") {
                return genFormIIHollow(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
                    input.isImalaBlocked,
                );
            }
            if (weakClass === "defective") {
                return genFormIIDefective(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
                    input.isImalaBlocked,
                );
            }
        }
        if (strength === "geminated") {
            return genFormIIHollow(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
    }

    if (form === "III") {
        const hasFinalWeakRadical = isFinalWeakRadical(consonants[2]);
        if (strength === "strong-hybrid") {
            return genFormIIIHybrid(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "strong") {
            return genFormIIIStrong(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak") {
            if (hasFinalWeakRadical) {
                return genFormIIIDefective(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
                    input.isImalaBlocked,
                );
            }
            if (weakClass === "assimilative") {
                return genFormIIIStrong(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
                    input.isImalaBlocked,
                );
            }
            if (weakClass === "hollow") {
                return genFormIIIHollow(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
                    input.isImalaBlocked,
                );
            }
            if (weakClass === "defective") {
                return genFormIIIDefective(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
                    input.isImalaBlocked,
                );
            }
        }
        if (strength === "geminated") {
            return genFormIIIStrong(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
    }

    // ── Higher forms (IV–Xb) — class-neutral ────────────────────────────
    if (form === "IV")
        return genFormIV(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
            input.isImalaBlocked,
        );
    if (form === "V") {
        if (strength === "strong-hybrid") {
            return genFormVStrongHybrid(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "defective") {
            return genFormVDefective(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "hollow") {
            return genFormVHollow(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (
            strength === "geminated" ||
            (strength === "weak" &&
                weakClass === "assimilative" &&
                consonants[1] === consonants[2])
        ) {
            return genFormVGeminated(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        // Non-geminated weak-assimilative Form V is strong-like in the
        // available references; only assimilative C2=C3 routes as geminated.
        return genFormVStrong(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
            input.isImalaBlocked,
        );
    }
    if (form === "VI") {
        if (strength === "geminated") {
            // Form VI geminated follows the t-prefixed geminated surface profile
            // rather than the regular Form III-derived strong fallback.
            return genFormVIGeminated(consonants);
        }
        if (strength === "strong-hybrid") {
            return genFormVIStrongHybrid(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "defective") {
            return genFormVIDefective(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "hollow") {
            return genFormVIHollow(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        // Non-geminated weak-assimilative Form VI follows the strong Form VI
        // derivation in the available references.
        return genFormVI(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
            input.isImalaBlocked,
        );
    }
    if (form === "VII") {
        if (strength === "geminated") {
            // VerbMT geminated Form VII keeps the n-prefixed full stem
            // (nżamm/nxekk), with -ej- only in suffixed perfect rows.
            return genFormVIIGeminated(consonants, input.vowelSetPerfect);
        }
        if (strength === "strong-hybrid") {
            return genFormVIIStrongHybrid(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "defective") {
            return genFormVIIDefective(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
                input.headword || input.citationForm,
            );
        }
        if (strength === "weak" && weakClass === "hollow") {
            return genFormVIIHollow(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "assimilative") {
            return genFormVIIAssimilative(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        return genFormVII(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
            input.isImalaBlocked,
        );
    }
    if (form === "VIII")
        return genFormVIII(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
            input.isImalaBlocked,
            strength,
            weakClass || "",
            input.headword || input.citationForm,
        );
    if (form === "IX") {
        if (strength === "geminated") {
            // Colour/stative geminated Form IX has its own surface profile
            // (rqaq, ħfief, qliel), so avoid the generic C1C2ieC3 path.
            return genFormIXGeminated(consonants, input.vowelSetPerfect);
        }
        return genFormIX(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
        );
    }
    if (form === "Xa") {
        if (strength === "strong-hybrid") {
            return genFormXaStrongHybrid(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "defective") {
            return genFormXaDefective(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "hollow") {
            return genFormXaHollow(consonants);
        }
        if (strength === "geminated") {
            return genFormXaGeminated(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
            );
        }
        // Weak-assimilative Form Xa (e.g. stejqer) is strong-like, so it
        // intentionally falls through to the regular Xa builder.
        return genFormXaStrong(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
            input.isImalaBlocked,
        );
    }
    if (form === "Xb") {
        if (strength === "strong-hybrid") {
            return genFormXbStrongHybrid(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (strength === "weak" && weakClass === "defective") {
            return genFormXbDefective(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        } else if (strength === "weak" && weakClass === "hollow") {
            return genFormXbHollow(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        if (
            strength === "geminated" ||
            (strength === "weak" &&
                weakClass === "assimilative" &&
                consonants[1] === consonants[2])
        ) {
            return genFormXbGeminated(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
                input.isImalaBlocked,
            );
        }
        return genFormXbStrong(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
            input.isImalaBlocked,
        );
    }

    throw new Error(
        `Unsupported verb configuration: Form ${form}, Strength ${strength}, WeakClass ${weakClass}`,
    );
}

// ── Root Form Generation Engine ────────────────────────────────────────────

// Triliteral Strong (from rootGenerator.ts)
function generateTriliteralStrong(
    C1: string,
    C2: string,
    C3: string,
    pv1: string,
    pv2: string,
    ipv1: string,
    ipv2: string,
    isImalaBlocked: boolean = false,
): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const f1_perf = `${C1}${pv1}${C2}${pv2}${C3}`;
    const f1_impf = `j${ipv1}${C1}${C2}${ipv2}${C3}`;
    const p1 = isGuttural(C1) ? "a" : "i";
    const passV = isImalaBlocked ? "u" : "u"; // Simplified for now but placeholder for later if different
    const f1_pass = `m${p1}${C1}${C2}${passV}${C3}`;
    const a1 = hasIorE(pv1) ? "ie" : "a";
    const a2 = isGuttural(C3) ? "a" : "e";
    const f1_act = `${C1}${a1}${C2}${a2}${C3}`;
    const f1_vn = isPharyngeal(C1) ? `${C1}a${C2}i${C3}` : `${C1}${C2}i${C3}`;
    const f1_impv = `${ipv1}${C1}${C2}${ipv2}${C3}`;

    forms.push({
        form: "I",
        perfect: f1_perf,
        imperfect: f1_impf,
        imperative: f1_impv,
        passiveParticiple: f1_pass,
        activeParticiple: f1_act,
        verbalNoun: f1_vn,
    });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const f2_impf = `j${f2_perf}`;
    const f2_pass = `m${f2_perf}`;
    const b1 = hasIorEorO(pv1) ? "ie" : "a";
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}${C3}`;
    const b2 = isGuttural(C1) ? "a" : "i";
    const f2_vn = `t${b2}${C1}${C2}i${C3}`;

    forms.push({
        form: "II",
        perfect: f2_perf,
        imperfect: f2_impf,
        imperative: f2_perf,
        passiveParticiple: f2_pass,
        activeParticiple: f2_act,
        verbalNoun: f2_vn,
    });

    const c1 = hasIorE(pv1) ? "ie" : "a";
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    const f3_impf = `j${f3_perf}`;
    const f3_pass = `m${f3_perf}`;

    forms.push({
        form: "III",
        perfect: f3_perf,
        imperfect: f3_impf,
        imperative: f3_perf,
        passiveParticiple: f3_pass,
        activeParticiple: "-",
        verbalNoun: "-",
    });

    const f4_perf = `${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f4_impf = `jo${C1}${C2}o${C3}`;
    const f4_imp = `o${C1}${C2}o${C3}`;
    const f4_act = `mi${C1}${C2}e${C3}`;
    const d1 = pv1 === "a" && pv2 === "a" ? "a" : "ie";
    const f4_vn = isPharyngeal(C1)
        ? `e${C1}${C2}${d1}${C3}`
        : `(i)${C1}${C2}${d1}${C3}`;

    forms.push({
        form: "IV",
        perfect: f4_perf,
        imperfect: f4_impf,
        imperative: f4_imp,
        passiveParticiple: "-",
        activeParticiple: f4_act,
        verbalNoun: f4_vn,
    });

    const f5_perf = deriveAssimilatedTPrefixedWord(f2_perf);
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        imperative: f5_perf,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${pv1}${C2}${C2}i${C3}`),
    });

    const f6_perf = deriveAssimilatedTPrefixedWord(f3_perf);
    const e1 = hasIorE(pv1) ? "ie" : "a";
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        imperative: f6_perf,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${e1}${C2}i${C3}`),
    });

    const f7_perf = `n${f1_perf}`;
    forms.push({
        form: "VII",
        perfect: f7_perf,
        imperfect: `ji${f7_perf}`,
        imperative: f7_perf,
        passiveParticiple: `mi${f7_perf}`,
        activeParticiple: "-",
        verbalNoun: `n${f1_vn}`,
    });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}${C3}`;
    const f8_perfPharyngeal = `e${C1}t${pv1}${C2}${pv2}${C3}`;
    forms.push({
        form: "VIII",
        perfect: isPharyngeal(C1) ? f8_perfPharyngeal : f8_perf,
        imperfect: isGuttural(C1) ? `je${f8_perf}` : `ji${f8_perf}`,
        imperative: isPharyngeal(C1) ? f8_perfPharyngeal : f8_perf,
        passiveParticiple: isGuttural(C1) ? `me${f8_perf}` : `mi${f8_perf}`,
        activeParticiple: "-",
        verbalNoun: isGuttural(C1)
            ? `e${C1}t${pv1}${C2}i${C3}`
            : `${C1}t${pv1}${C2}i${C3}`,
    });

    const f9_perf = `${C1}${C2}${c1}${C3}`;
    const f9_perfPharyngeal = `${C1}e${C2}${c1}${C3}`;
    forms.push({
        form: "IX",
        perfect: isPharyngeal(C1) ? f9_perfPharyngeal : f9_perf,
        imperfect: `ji${f9_perf}`,
        imperative: isPharyngeal(C1) ? f9_perfPharyngeal : f9_perf,
        passiveParticiple: `mu${f9_perf}`,
        activeParticiple: "-",
        verbalNoun: isPharyngeal(C1) ? f9_perfPharyngeal : f9_perf,
    });

    const f10a_perf = `st${pv1}${C1}${C2}${pv2}${C3}`;
    forms.push({
        form: "Xa",
        perfect: f10a_perf,
        imperfect: `ji${f10a_perf}`,
        imperative: f10a_perf,
        passiveParticiple: `mi${f10a_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${pv1}${C1}${C2}i${C3}`,
    });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({
        form: "Xb",
        perfect: f10b_perf,
        imperfect: `ji${f10b_perf}`,
        imperative: f10b_perf,
        passiveParticiple: `mi${f10b_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}`,
    });

    return forms;
}

function generateTriliteralGeminated(
    C1: string,
    C2: string,
    C3: string,
    pv1: string,
    pv2: string,
    ipv1: string,
    _ipv2: string,
    _isImalaBlocked: boolean = false,
): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const f1_perf = `${C1}${pv1}${C2}${C3}`;
    const f1_impf = `j${C1}${ipv1}${C2}${C3}`;
    const g1 = isGuttural(C1) ? "a" : "i";
    const f1_pass = `m${g1}${C1}${C2}u${C3}`;
    const a1 = hasIorE(pv1) ? "ie" : "a";
    const a2 = isGuttural(C3) ? "a" : "e";
    const f1_act = `${C1}${a1}${C2}${a2}${C3}`;
    const f1_vn = isPharyngeal(C1) ? `${C1}a${C2}i${C3}` : `${C1}${C2}i${C3}`;
    const f1_impv = `${C1}${ipv1}${C2}${C3}`;

    forms.push({
        form: "I",
        perfect: f1_perf,
        imperfect: f1_impf,
        imperative: f1_impv,
        passiveParticiple: f1_pass,
        activeParticiple: f1_act,
        verbalNoun: f1_vn,
    });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const f2_impf = `j${f2_perf}`;
    const f2_pass = `m${f2_perf}`;
    const b1 = hasIorEorO(pv1) ? "ie" : "a";
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}${C3}`;
    const b2 = isGuttural(C1) ? "a" : "i";
    const f2_vn = `t${b2}${C1}${C2}i${C3}`;
    forms.push({
        form: "II",
        perfect: f2_perf,
        imperfect: f2_impf,
        passiveParticiple: f2_pass,
        activeParticiple: f2_act,
        verbalNoun: f2_vn,
    });

    const c1 = hasIorE(pv1) ? "ie" : "a";
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    forms.push({
        form: "III",
        perfect: f3_perf,
        imperfect: `j${f3_perf}`,
        passiveParticiple: `m${f3_perf}`,
        activeParticiple: "-",
        verbalNoun: "-",
    });

    const f4_perf = `a${C1}a${C2}${C3}`;
    const f4_impf = `j${C1}o${C2}${C3}`;
    const f4_act = `mi${C1}${pv2}${C2}${C3}`;
    const d1 = pv1 === "a" && pv2 === "a" ? "a" : "ie";
    const f4_vn = `i${C1}${C2}${d1}${C3}`;
    forms.push({
        form: "IV",
        perfect: f4_perf,
        imperfect: f4_impf,
        passiveParticiple: "-",
        activeParticiple: f4_act,
        verbalNoun: f4_vn,
    });

    const f5_perf = deriveAssimilatedTPrefixedWord(f2_perf);
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${pv1}${C2}${C2}i${C3}`),
    });

    const f6_perf = deriveAssimilatedTPrefixedWord(f3_perf);
    const e1 = ["i", "e"].includes(pv1) ? "ie" : "a";
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${e1}${C2}i${C3}`),
    });

    const f7_perf = `n${f1_perf}`;
    forms.push({
        form: "VII",
        perfect: f7_perf,
        imperfect: `ji${f7_perf}`,
        passiveParticiple: `mi${f7_perf}`,
        activeParticiple: "-",
        verbalNoun: `n${f1_vn}`,
    });

    const f8_perf = `${C1}t${pv1}${C2}${C3}`;
    forms.push({
        form: "VIII",
        perfect: f8_perf,
        imperfect: `ji${f8_perf}`,
        passiveParticiple: `mi${f8_perf}`,
        activeParticiple: "-",
        verbalNoun: `${C1}t${pv1}${C2}i${C3}`,
    });

    const f9_perf = `${C1}${C2}${c1}${C3}`;
    forms.push({
        form: "IX",
        perfect: f9_perf,
        imperfect: `ji${f9_perf}`,
        passiveParticiple: `mu${f9_perf}`,
        activeParticiple: "-",
        verbalNoun: f9_perf,
    });

    const f10a_perf = `st${C1}${pv1}${C2}${C3}`;
    forms.push({
        form: "Xa",
        perfect: f10a_perf,
        imperfect: `ji${f10a_perf}`,
        passiveParticiple: `mi${f10a_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${pv1}${C1}${C2}i${C3}`,
    });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({
        form: "Xb",
        perfect: f10b_perf,
        imperfect: `ji${f10b_perf}`,
        passiveParticiple: `mi${f10b_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}`,
    });

    return forms;
}

function generateTriliteralAssimilative(
    C1: string,
    C2: string,
    C3: string,
    pv1: string,
    pv2: string,
    ipv1: string,
    ipv2: string,
    _isImalaBlocked: boolean = false,
): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const f1_perf = `${C1}${pv1}${C2}${pv2}${C3}`;
    const f1_impf = `j${ipv1}${C2}${ipv2}${C3}`;
    const f1_pass = `m${ipv1}${C2}${ipv2}${C3}`;
    const a1 = hasIorE(pv1) ? "ie" : "a";
    const f1_act = `${C1}${a1}${C2}i${C3}`;
    const f1_vn = `${C1}i${C2}${C3}`;
    const f1_impv = `${ipv1}${C2}${ipv2}${C3}`;

    forms.push({
        form: "I",
        perfect: f1_perf,
        imperfect: f1_impf,
        imperative: f1_impv,
        passiveParticiple: f1_pass,
        activeParticiple: f1_act,
        verbalNoun: f1_vn,
    });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const f2_impf = `j${C1}${pv1}${C2}${C2}${ipv2}${C3}`;
    const f2_pass = `m${C1}${pv1}${C2}${C2}${ipv2}${C3}`;
    const b1 = isGuttural(C3) ? "a" : "e";
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}${C3}`;
    const vnv1 = isGuttural(C1) ? "a" : "i";
    const f2_vn = `t${vnv1}${C1}${C2}i${C3}`;
    forms.push({
        form: "II",
        perfect: f2_perf,
        imperfect: f2_impf,
        passiveParticiple: f2_pass,
        activeParticiple: f2_act,
        verbalNoun: f2_vn,
    });

    const c1 = hasIorE(pv1) ? "ie" : "a";
    const f3 = `${C1}${c1}${C2}`;
    forms.push({
        form: "III",
        perfect: `${f3}${pv2}${C3}`,
        imperfect: `j${f3}${ipv2}${C3}`,
        passiveParticiple: `m${f3}${ipv2}${C3}`,
        activeParticiple: "-",
        verbalNoun: "-",
    });

    const f4_perf = `${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f4_impf = `jo${C1}${C2}${ipv2}${C3}`;
    const f4_act = `mi${C1}${C2}${ipv2}${C3}`;
    const h1 = C1 === "w" ? "u" : "i";
    const h2 = pv1 === "a" && pv2 === "a" ? "a" : "ie";
    const f4_vn = `${h1}${C1}${C2}${h2}${C3}`;
    forms.push({
        form: "IV",
        perfect: f4_perf,
        imperfect: f4_impf,
        passiveParticiple: "-",
        activeParticiple: f4_act,
        verbalNoun: f4_vn,
    });

    const f5_perf = deriveAssimilatedTPrefixedWord(f2_perf);
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${pv1}${C2}${C2}i${C3}`),
    });

    const f6_perf = deriveAssimilatedTPrefixedWord(`${f3}${pv2}${C3}`);
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${f3}i${C3}`),
    });

    const f7_perf = `n${f1_perf}`;
    forms.push({
        form: "VII",
        perfect: f7_perf,
        imperfect: `ji${f7_perf}`,
        passiveParticiple: `mi${f7_perf}`,
        activeParticiple: "-",
        verbalNoun: `n${f1_vn}`,
    });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}${C3}`;
    forms.push({
        form: "VIII",
        perfect: f8_perf,
        imperfect: `ji${f8_perf}`,
        passiveParticiple: `mi${f8_perf}`,
        activeParticiple: "-",
        verbalNoun: `${C1}t${pv1}${C2}i${C3}`,
    });

    const f9_perf = `${C1}${C2}${c1}${C3}`;
    forms.push({
        form: "IX",
        perfect: f9_perf,
        imperfect: `ji${f9_perf}`,
        passiveParticiple: `mu${f9_perf}`,
        activeParticiple: "-",
        verbalNoun: f9_perf,
    });

    const f10a_perf = `st${pv1}${C1}${C2}${pv2}${C3}`;
    forms.push({
        form: "Xa",
        perfect: f10a_perf,
        imperfect: `ji${f10a_perf}`,
        passiveParticiple: `mi${f10a_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${pv1}${C1}${C2}i${C3}`,
    });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({
        form: "Xb",
        perfect: f10b_perf,
        imperfect: `ji${f10b_perf}`,
        passiveParticiple: `mi${f10b_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}`,
    });

    return forms;
}

function generateTriliteralHollow(
    C1: string,
    C2: string,
    C3: string,
    pv1: string,
    pv2: string,
    ipv1: string,
    _ipv2: string,
    _isImalaBlocked: boolean = false,
): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const a1 = hasIorEorO(pv1) ? "ie" : "a";
    const f1_perf = `${C1}${a1}${C3}`;
    const f1_impf = `j${C1}${ipv1}${C3}`;
    const i1 = isGuttural(C1) ? "a" : "i";
    const f1_pass = `m${i1}${C1}u${C3}`;
    const i2 = hasIorE(pv1) ? "e" : "a";
    const f1_act = `${C1}${i2}jje${C3}`;
    const f1_vn = isGuttural(C1)
        ? `${C1}e${pv1}${C2}${C3}`
        : `${C1}${pv1}${C2}${C3}`;
    const f1_impv = `${C1}${ipv1}${C3}`;

    forms.push({
        form: "I",
        perfect: f1_perf,
        imperfect: f1_impf,
        imperative: f1_impv,
        passiveParticiple: f1_pass,
        activeParticiple: f1_act,
        verbalNoun: f1_vn,
    });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const b1 = hasIorEorO(pv1) ? "ie" : "a";
    const b2 = isGuttural(C1) ? "a" : "i";
    forms.push({
        form: "II",
        perfect: f2_perf,
        imperfect: `j${f2_perf}`,
        imperative: "-",
        passiveParticiple: `m${f2_perf}`,
        activeParticiple: `${C1}${pv1}${C2}${C2}${b1}${C3}`,
        verbalNoun: `t${b2}${C1}${C2}i${C3}`,
    });

    const c1 = hasIorE(pv1) ? "ie" : "a";
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    forms.push({
        form: "III",
        perfect: f3_perf,
        imperfect: `j${f3_perf}`,
        imperative: "-",
        passiveParticiple: `m${f3_perf}`,
        activeParticiple: "-",
        verbalNoun: "-",
    });

    const f4_perf = `${pv1}${C1}${C2}${pv2}${C3}`;
    const f4_impf = `j${C1}i${C3}`;
    const f4_act = `mi${C1}i${C3}`;
    const f4_vn = `i${C1}${pv1 === "a" && pv2 === "a" ? "a" : "ie"}${C3}`;
    forms.push({
        form: "IV",
        perfect: f4_perf,
        imperfect: f4_impf,
        imperative: "-",
        passiveParticiple: "-",
        activeParticiple: f4_act,
        verbalNoun: f4_vn,
    });

    const f5_perf = deriveAssimilatedTPrefixedWord(f2_perf);
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${pv1}${C2}${C2}i${C3}`),
    });

    const f6_perf = deriveAssimilatedTPrefixedWord(f3_perf);
    const e1 = ["i", "e"].includes(pv1) ? "e" : "a";
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${e1}${C2}i${C3}`),
    });

    const f7_perf = `n${f1_perf}`;
    forms.push({
        form: "VII",
        perfect: f7_perf,
        imperfect: `ji${f7_perf}`,
        passiveParticiple: `mi${f7_perf}`,
        activeParticiple: `n${C1}${C2}i${C3}`,
        verbalNoun: `n${f1_vn}`,
    });

    const f8_perf = `n${C1}t${a1}${C3}`;
    forms.push({
        form: "VIII",
        perfect: f8_perf,
        imperfect: `ji${f8_perf}`,
        passiveParticiple: `mi${f8_perf}`,
        activeParticiple: "-",
        verbalNoun: `n${C1}t${a1}${C3}`,
    });

    const f9_perf = `${C1}${C2}${a1}${C3}`;
    forms.push({
        form: "IX",
        perfect: f9_perf,
        imperfect: `ji${f9_perf}`,
        passiveParticiple: `mu${f9_perf}`,
        activeParticiple: "-",
        verbalNoun: f9_perf,
    });

    const f10a_perf = `st${pv1}${C1}${a1}${C3}`;
    forms.push({
        form: "Xa",
        perfect: f10a_perf,
        imperfect: `ji${f10a_perf}`,
        passiveParticiple: `mi${f10a_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${pv1}${C1}${C2}${a1}${C3}`,
    });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({
        form: "Xb",
        perfect: f10b_perf,
        imperfect: `ji${f10b_perf}`,
        passiveParticiple: `mi${f10b_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}`,
    });

    return forms;
}

function generateTriliteralDefective(
    C1: string,
    C2: string,
    C3: string,
    pv1: string,
    pv2: string,
    ipv1: string,
    ipv2: string,
    isImalaBlocked: boolean = false,
): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const formIProfile = buildFormIDefectiveStemProfile(
        [C1, C2, C3],
        `${pv1}-${pv2}`,
        `${ipv1}-${ipv2}`,
        `${ipv1}-${ipv2}`,
        isImalaBlocked,
    );
    const f1_perf = formIProfile.perfFull;
    const f1_impf = `j${formIProfile.impfSingularStem}`;
    const f1_pass = `m${ipv1}${C1}${C2}${isImalaBlocked ? "a" : "i"}`; // Rough approximation
    const f1_act = `${C1}${hasIorE(pv1) ? "ie" : "a"}${C2}i`;
    const f1_vn = `${C1}${pv1}${C2}u`;
    const f1_impv = formIProfile.impSg;

    forms.push({
        form: "I",
        perfect: f1_perf,
        imperfect: f1_impf,
        imperative: f1_impv,
        passiveParticiple: f1_pass,
        activeParticiple: f1_act,
        verbalNoun: f1_vn,
    });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}`;
    const f2_impf = `j${C1}${ipv1}${C2}${C2}${ipv2}`;
    const f2_pass = `m${C1}${ipv1}${C2}${C2}${ipv2}`;
    const f2_act = `${C1}${pv1}${C2}${C2}ej`;
    const b2 = isGuttural(C1) ? "a" : "i";
    const f2_vn = `t${b2}${C1}${C2}ija`;
    forms.push({
        form: "II",
        perfect: f2_perf,
        imperfect: f2_impf,
        imperative: f2_perf,
        passiveParticiple: f2_pass,
        activeParticiple: f2_act,
        verbalNoun: f2_vn,
    });

    const c1 = hasIorE(pv1) ? "ie" : "a";
    const f3_perf = `${C1}${c1}${C2}${pv2}`;
    const f3_impf = `j${C1}${c1}${C2}${pv2}`;
    const f3_pass = `m${C1}${c1}${C2}i`;
    forms.push({
        form: "III",
        perfect: f3_perf,
        imperfect: f3_impf,
        imperative: f3_perf,
        passiveParticiple: f3_pass,
        activeParticiple: "-",
        verbalNoun: "-",
    });

    const f4_perf = `${ipv1}${C1}${C2}${ipv2}`;
    const f4_impf = `jo${C1}${C2}i`;
    const f4_act = `mo${C1}${C2}i`;
    const h2 = pv1 === "a" && pv2 === "a" ? "a" : "ie";
    const f4_vn = `(i)${C1}${C2}${h2}ja`;
    forms.push({
        form: "IV",
        perfect: f4_perf,
        imperfect: f4_impf,
        imperative: f4_perf,
        passiveParticiple: "-",
        activeParticiple: f4_act,
        verbalNoun: f4_vn,
    });

    const f5_perf = deriveAssimilatedTPrefixedWord(`${C1}${pv1}${C2}${C2}${pv2}`);
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        imperative: f5_perf,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${pv1}${C2}${C2}i${C3}a`).replace(/undefined/g, ""),
    });

    const f6_perf = deriveAssimilatedTPrefixedWord(f3_perf);
    const e1 = ["i", "e"].includes(pv1) ? "e" : "a";
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        imperative: f6_perf,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(`${C1}${e1}${C2}i${C3}a`).replace(/undefined/g, ""),
    });

    const f7_perf = `n${f1_perf}`;
    forms.push({
        form: "VII",
        perfect: f7_perf,
        imperfect: `ji${f7_perf}`,
        imperative: f7_perf,
        passiveParticiple: `mi${f7_perf}`,
        activeParticiple: `n${C1}${C2}i${C3}`,
        verbalNoun: `n${f1_vn}`,
    });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}`;
    forms.push({
        form: "VIII",
        perfect: f8_perf,
        imperfect: `ji${f8_perf}`,
        imperative: f8_perf,
        passiveParticiple: `mi${f8_perf}`,
        activeParticiple: "-",
        verbalNoun: `${C1}t${pv1}${C2}${pv2}`,
    });

    const f9_perf = `${C1}${C2}${c1}`;
    forms.push({
        form: "IX",
        perfect: f9_perf,
        imperfect: `ji${f9_perf}`,
        imperative: f9_perf,
        passiveParticiple: `mu${f9_perf}`,
        activeParticiple: "-",
        verbalNoun: f9_perf,
    });

    const f10a_perf = `st${pv1}${C1}${C2}${pv2}`;
    forms.push({
        form: "Xa",
        perfect: f10a_perf,
        imperfect: `ji${f10a_perf}`,
        imperative: f10a_perf,
        passiveParticiple: `mi${f10a_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${pv1}${C1}${C2}ija`,
    });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}`;
    forms.push({
        form: "Xb",
        perfect: f10b_perf,
        imperfect: `ji${f10b_perf}`,
        imperative: f10b_perf,
        passiveParticiple: `mi${f10b_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}a`.replace(/undefined/g, ""),
    });

    return forms;
}

function deriveAssimilatedTPrefixedWord(word: string): string {
    return combinePrefix("t", word);
}

function deriveQuadriliteralAttachedStem(surface: string): string {
    if (surface.endsWith("as")) {
        return surface.replace(/as$/, "is");
    }
    if (surface.endsWith("et")) {
        return surface.replace(/et$/, "it");
    }
    return surface;
}

function deriveQuadriliteralSyncopatedStem(surface: string): string {
    if (surface.endsWith("as")) {
        return surface.slice(0, -2) + "s";
    }
    if (surface.endsWith("sa")) {
        return surface.slice(0, -1);
    }
    if (surface.endsWith("si")) {
        return surface.slice(0, -1);
    }
    return surface;
}

function deriveQuadriliteralCliticStems(surface: string): StemVariantSet {
    return {
        attached: deriveQuadriliteralAttachedStem(surface),
        syncopated: deriveQuadriliteralSyncopatedStem(surface),
        perfectAttached: deriveQuadriliteralAttachedStem(surface),
        perfectSyncopated: deriveQuadriliteralSyncopatedStem(surface),
    };
}

function buildWeakQuadriliteralDefectiveConjugation(
    consonants: string[],
    vsetPerf: string,
    _vsetImpf: string,
    isImalaBlocked: boolean,
    form: "I" | "II",
): VerbConjugationTable {
    // Weak quadriliteral Form I follows the saqsa-style citation stem:
    // perfect 3ms is the bare stem + -a, while the other perfect forms and
    // the singular imperfect/imperative forms take fixed weak endings.
    const [C1, C2, C3] = consonants;
    const { v1: pv1 } = parseVset(vsetPerf);
    const baseStem = `${C1}${pv1}${C2}${C3}`;
    const imperfectPrefixes = ["n", "s", "j", "s", "n", "s", "j"] as const;
    const perfectSuffixes = ["ejt", "ejt", "a", "iet", "ejna", "ejtu", "ew"] as const;

    const rows: ConjugationRow[] = [
        {
            person_mt: "1s",
            person_en: "I",
            perfect: `${baseStem}${perfectSuffixes[0]}`,
            imperfect: `${imperfectPrefixes[0]}${baseStem}i`,
            perfect_neg: `${baseStem}${perfectSuffixes[0]}`,
            stems: {
                attached: `${imperfectPrefixes[0]}${baseStem}i`,
                syncopated: `${imperfectPrefixes[0]}${baseStem}i`,
                perfectAttached: `${baseStem}${perfectSuffixes[0]}`,
                perfectSyncopated: `${baseStem}${perfectSuffixes[0]}`,
            },
        },
        {
            person_mt: "2s",
            person_en: "you (sg.)",
            perfect: `${baseStem}${perfectSuffixes[1]}`,
            imperfect: `${imperfectPrefixes[1]}${baseStem}i`,
            perfect_neg: `${baseStem}${perfectSuffixes[1]}`,
            stems: {
                attached: `${imperfectPrefixes[1]}${baseStem}i`,
                syncopated: `${imperfectPrefixes[1]}${baseStem}i`,
                perfectAttached: `${baseStem}${perfectSuffixes[1]}`,
                perfectSyncopated: `${baseStem}${perfectSuffixes[1]}`,
            },
        },
        {
            person_mt: "3ms",
            person_en: "he",
            perfect: `${baseStem}${perfectSuffixes[2]}`,
            imperfect: `${imperfectPrefixes[2]}${baseStem}i`,
            perfect_neg: `${baseStem}${perfectSuffixes[2]}`,
            stems: {
                attached: `${imperfectPrefixes[2]}${baseStem}i`,
                syncopated: `${imperfectPrefixes[2]}${baseStem}i`,
                perfectAttached: `${baseStem}i`,
                perfectSyncopated: `${baseStem}i`,
            },
        },
        {
            person_mt: "3fs",
            person_en: "she",
            perfect: `${baseStem}${perfectSuffixes[3]}`,
            imperfect: `${imperfectPrefixes[3]}${baseStem}i`,
            perfect_neg: `${baseStem}${perfectSuffixes[3]}`,
            stems: {
                attached: `${imperfectPrefixes[3]}${baseStem}i`,
                syncopated: `${imperfectPrefixes[3]}${baseStem}i`,
                perfectAttached: `${baseStem}it`,
                perfectSyncopated: `${baseStem}it`,
            },
        },
        {
            person_mt: "1p",
            person_en: "we",
            perfect: `${baseStem}${perfectSuffixes[4]}`,
            imperfect: `${imperfectPrefixes[4]}${baseStem}u`,
            perfect_neg: `${baseStem}${perfectSuffixes[4]}`,
            stems: {
                attached: `${imperfectPrefixes[4]}${baseStem}u`,
                syncopated: `${imperfectPrefixes[4]}${baseStem}u`,
                perfectAttached: `${baseStem}${perfectSuffixes[4]}`,
                perfectSyncopated: `${baseStem}${perfectSuffixes[4]}`,
            },
        },
        {
            person_mt: "2p",
            person_en: "you (pl.)",
            perfect: `${baseStem}${perfectSuffixes[5]}`,
            imperfect: `${imperfectPrefixes[5]}${baseStem}u`,
            perfect_neg: `${baseStem}${perfectSuffixes[5]}`,
            stems: {
                attached: `${imperfectPrefixes[5]}${baseStem}u`,
                syncopated: `${imperfectPrefixes[5]}${baseStem}u`,
                perfectAttached: `${baseStem}${perfectSuffixes[5]}`,
                perfectSyncopated: `${baseStem}${perfectSuffixes[5]}`,
            },
        },
        {
            person_mt: "3p",
            person_en: "they",
            perfect: `${baseStem}${perfectSuffixes[6]}`,
            imperfect: `${imperfectPrefixes[6]}${baseStem}u`,
            perfect_neg: `${baseStem}${perfectSuffixes[6]}`,
            stems: {
                attached: `${imperfectPrefixes[6]}${baseStem}u`,
                syncopated: `${imperfectPrefixes[6]}${baseStem}u`,
                perfectAttached: `${baseStem}${perfectSuffixes[6]}`,
                perfectSyncopated: `${baseStem}${perfectSuffixes[6]}`,
            },
        },
    ];

    const weakBaseTable: VerbConjugationTable = {
        rows,
        imperative_sg: `${baseStem}i`,
        imperative_pl: `${baseStem}u`,
        imperative_sg_stems: {
            attached: `${baseStem}i`,
            syncopated: `${baseStem}i`,
        },
        imperative_pl_stems: {
            attached: `${baseStem}u`,
            syncopated: `${baseStem}u`,
        },
        blocksImala: isImalaBlocked,
    };

    return form === "I" ? weakBaseTable : deriveQuadriliteralFormII(weakBaseTable, "weak-defective");
}

function deriveQuadriliteralAssimilatedStem(stem: string): string {
    const stripped = stem.startsWith("j") || stem.startsWith("t") || stem.startsWith("n")
        ? stem.slice(1)
        : stem;
    const normalized = stripped.startsWith("ss")
        ? stripped.slice(1)
        : stripped;
    return deriveAssimilatedTPrefixedWord(normalized);
}

type QuadriliteralFormIIMode = "strong" | "weak-defective";

function deriveQuadriliteralImperfectStem(
    stem: string,
    personIndex: number,
    mode: QuadriliteralFormIIMode = "strong",
): string {
    if (mode !== "weak-defective") {
        return `ji${deriveQuadriliteralAssimilatedStem(stem)}`;
    }

    const personPrefix = IMPERFECT_PERSON_PREFIXES[personIndex] ?? "j";
    return `${personPrefix}i${deriveQuadriliteralAssimilatedStem(stem)}`;
}

function generateQuadriliteralFormI(
    consonants: string[],
    vsetPerf: string,
    _vsetImpf: string,
    isImalaBlocked: boolean,
): VerbConjugationTable {
    const [C1, C2, C3, C4] = consonants;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const rootStem = `${C1}${pv1}${C2}${C3}${pv2}${C4}`;

    // When C3 is a sonorant (l, m, n, r), the syncopated stem retains
    // the theme vowel by metathesis — it shifts from after C3 to before C3,
    // mirroring the triliteral Form I rule where a liquid/għ C2 shifts the
    // theme vowel before C2 (e.g. jaħrab → jaħarbu, not *jaħrbu).
    // (għ at C3 does NOT trigger this — reduplicated roots like għargħar
    // keep the plain syncopation: għargħret, not *għaragħret.)
    // Example: ċaflas (C3=l) → ċafalset / ċafalsu, not *ċaflset / *ċaflsu.
    const isSonorant = (c: string) => ["l", "m", "n", "r"].includes(c);
    const retainQuadThemeVowel = isSonorant(C3);
    const syncStem = retainQuadThemeVowel
        ? `${C1}${pv1}${C2}${pv2}${C3}${C4}`
        : `${C1}${pv1}${C2}${C3}${C4}`;
    const rootClusterStem = syncStem;
    const pluralStem = syncStem;
    const perfect3fs = `${rootClusterStem}et`;

    const rows: ConjugationRow[] = [
        {
            person_mt: "1s",
            person_en: "I",
            perfect: `${rootStem}t`,
            imperfect: combinePrefix("n", rootStem),
            perfect_neg: `${rootStem}t`,
            stems: {
                attached: deriveQuadriliteralCliticStems(combinePrefix("n", rootStem)).attached,
                syncopated: deriveQuadriliteralCliticStems(combinePrefix("n", rootStem)).syncopated,
                perfectAttached: deriveQuadriliteralCliticStems(`${rootStem}t`).attached,
                perfectSyncopated: deriveQuadriliteralCliticStems(`${rootStem}t`).syncopated,
            },
        },
        {
            person_mt: "2s",
            person_en: "you (sg.)",
            perfect: `${rootStem}t`,
            imperfect: combinePrefix("t", rootStem),
            perfect_neg: `${rootStem}t`,
            stems: {
                attached: deriveQuadriliteralCliticStems(combinePrefix("t", rootStem)).attached,
                syncopated: deriveQuadriliteralCliticStems(combinePrefix("t", rootStem)).syncopated,
                perfectAttached: deriveQuadriliteralCliticStems(`${rootStem}t`).attached,
                perfectSyncopated: deriveQuadriliteralCliticStems(`${rootStem}t`).syncopated,
            },
        },
        {
            person_mt: "3ms",
            person_en: "he",
            perfect: rootStem,
            imperfect: combinePrefix("j", rootStem),
            perfect_neg: rootStem,
            stems: {
                attached: deriveQuadriliteralCliticStems(combinePrefix("j", rootStem)).attached,
                syncopated: deriveQuadriliteralCliticStems(combinePrefix("j", rootStem)).syncopated,
                perfectAttached: deriveQuadriliteralCliticStems(rootStem).attached,
                perfectSyncopated: deriveQuadriliteralCliticStems(rootStem).syncopated,
            },
        },
        {
            person_mt: "3fs",
            person_en: "she",
            perfect: perfect3fs,
            imperfect: combinePrefix("t", rootStem),
            perfect_neg: `${rootClusterStem}it`,
            stems: {
                attached: deriveQuadriliteralCliticStems(combinePrefix("t", rootStem)).attached,
                syncopated: deriveQuadriliteralCliticStems(combinePrefix("t", rootStem)).syncopated,
                // Derive the clitic stem from the surface form so qartset -> qartsit
                // and għargħret -> għargħrit.
                perfectAttached: perfect3fs.replace(/et$/, "it"),
                perfectSyncopated: perfect3fs.replace(/et$/, "it"),
            },
        },
        {
            person_mt: "1p",
            person_en: "we",
            perfect: `${rootStem}na`,
            imperfect: combinePrefix("n", `${pluralStem}u`),
            perfect_neg: `${rootStem}na`,
            stems: {
                attached: deriveQuadriliteralCliticStems(combinePrefix("n", `${pluralStem}u`)).attached,
                syncopated: deriveQuadriliteralCliticStems(combinePrefix("n", `${pluralStem}u`)).syncopated,
                perfectAttached: deriveQuadriliteralCliticStems(`${rootStem}na`).attached,
                perfectSyncopated: deriveQuadriliteralCliticStems(`${rootStem}na`).syncopated,
            },
        },
        {
            person_mt: "2p",
            person_en: "you (pl.)",
            perfect: `${rootStem}tu`,
            imperfect: combinePrefix("t", `${pluralStem}u`),
            perfect_neg: `${rootStem}tu`,
            stems: {
                attached: deriveQuadriliteralCliticStems(combinePrefix("t", `${pluralStem}u`)).attached,
                syncopated: deriveQuadriliteralCliticStems(combinePrefix("t", `${pluralStem}u`)).syncopated,
                perfectAttached: deriveQuadriliteralCliticStems(`${rootStem}tu`).attached,
                perfectSyncopated: deriveQuadriliteralCliticStems(`${rootStem}tu`).syncopated,
            },
        },
        {
            person_mt: "3p",
            person_en: "they",
            perfect: `${pluralStem}u`,
            imperfect: combinePrefix("j", `${pluralStem}u`),
            perfect_neg: `${pluralStem}u`,
            stems: {
                attached: deriveQuadriliteralCliticStems(combinePrefix("j", `${pluralStem}u`)).attached,
                syncopated: deriveQuadriliteralCliticStems(combinePrefix("j", `${pluralStem}u`)).syncopated,
                perfectAttached: deriveQuadriliteralCliticStems(`${pluralStem}u`).attached,
                perfectSyncopated: deriveQuadriliteralCliticStems(`${pluralStem}u`).syncopated,
            },
        },
    ];

    return {
        rows,
        imperative_sg: rootStem,
        imperative_pl: `${rootClusterStem}u`,
        imperative_sg_stems: {
            attached: deriveQuadriliteralCliticStems(rootStem).attached,
            syncopated: deriveQuadriliteralCliticStems(rootStem).syncopated,
        },
        imperative_pl_stems: {
            attached: deriveQuadriliteralCliticStems(`${rootClusterStem}u`).attached,
            syncopated: deriveQuadriliteralCliticStems(`${rootClusterStem}u`).syncopated,
        },
        blocksImala: isImalaBlocked,
    };
}

function generateQuadriliteralFormIDefective(
    consonants: string[],
    vsetPerf: string,
    _vsetImpf: string,
    _isImalaBlocked: boolean,
): GeneratedVerbForm[] {
    const [C1, C2, C3] = consonants;
    const { v1: pv1 } = parseVset(vsetPerf);
    const baseStem = `${C1}${pv1}${C2}${C3}`;
    const formIForm: GeneratedVerbForm = {
        form: "I",
        perfect: `${baseStem}a`,
        imperfect: `j${baseStem}i`,
        imperative: `${baseStem}i`,
        passiveParticiple: `m${baseStem}i`,
        activeParticiple: `${baseStem}ej`,
        verbalNoun: `${baseStem}i`,
    };

    return [formIForm, buildQuadriliteralFormII(formIForm, "weak-defective")];
}

function deriveQuadriliteralFormII(
    base: VerbConjugationTable,
    mode: QuadriliteralFormIIMode = "strong",
): VerbConjugationTable {
    const rows = base.rows.map((row, personIndex) => {
        const perfect = deriveQuadriliteralAssimilatedStem(row.perfect);
        const imperfect = deriveQuadriliteralImperfectStem(row.imperfect, personIndex, mode);

        return {
            ...row,
            form: "II" as const,
            perfect,
            imperfect,
            perfect_neg: row.perfect_neg ? deriveQuadriliteralAssimilatedStem(row.perfect_neg) : undefined,
            stems: row.stems
                ? {
                    attached: deriveQuadriliteralImperfectStem(row.stems.attached, personIndex, mode),
                    syncopated: deriveQuadriliteralImperfectStem(row.stems.syncopated, personIndex, mode),
                    perfectAttached: deriveQuadriliteralAssimilatedStem(row.stems.perfectAttached ?? row.perfect),
                    perfectSyncopated: deriveQuadriliteralAssimilatedStem(row.stems.perfectSyncopated ?? row.perfect),
                }
                : undefined,
        };
    });

    return {
        ...base,
        rows,
        imperative_sg: deriveQuadriliteralAssimilatedStem(base.imperative_sg),
        imperative_pl: deriveQuadriliteralAssimilatedStem(base.imperative_pl),
        imperative_sg_stems: base.imperative_sg_stems
            ? {
                attached: deriveQuadriliteralAssimilatedStem(base.imperative_sg_stems.attached),
                syncopated: deriveQuadriliteralAssimilatedStem(base.imperative_sg_stems.syncopated),
            }
            : undefined,
        imperative_pl_stems: base.imperative_pl_stems
            ? {
                attached: deriveQuadriliteralAssimilatedStem(base.imperative_pl_stems.attached),
                syncopated: deriveQuadriliteralAssimilatedStem(base.imperative_pl_stems.syncopated),
            }
            : undefined,
    };
}

function buildQuadriliteralFormII(
    formI: GeneratedVerbForm,
    mode: QuadriliteralFormIIMode,
): GeneratedVerbForm {
    const imperfectStem = formI.imperfect.startsWith("j")
        ? formI.imperfect.slice(1)
        : formI.imperfect;
    const perfectStem = formI.perfect ?? "";
    const assimilatedPerfectStem = deriveQuadriliteralAssimilatedStem(perfectStem);
    const assimilatedImperfectStem = deriveQuadriliteralAssimilatedStem(imperfectStem);
    const verbalNounStem = mode === "weak-defective"
        ? `${imperfectStem}ja`
        : ((formI.verbalNoun || perfectStem).replace(/is$/, "ir"));

    return {
        form: "II",
        perfect: assimilatedPerfectStem,
        imperfect: `ji${assimilatedImperfectStem}`,
        imperative: assimilatedPerfectStem,
        passiveParticiple: `mi${assimilatedImperfectStem}`,
        activeParticiple: "-",
        verbalNoun: deriveAssimilatedTPrefixedWord(verbalNounStem),
    };
}

function generateQuadriliteralStrong(
    C1: string,
    C2: string,
    C3: string,
    C4: string,
    pv1: string,
    pv2: string,
    _ipv1: string,
    ipv2: string,
): GeneratedVerbForm[] {
    const perfectStem = `${C1}${pv1}${C2}${C3}${pv2}${C4}`;
    const imperfectStem = `${C1}${pv1}${C2}${C3}${ipv2}${C4}`;
    const formI: GeneratedVerbForm = {
        form: "I",
        perfect: perfectStem,
        imperfect: `j${imperfectStem}`,
        imperative: perfectStem,
        passiveParticiple: `m${perfectStem}`,
        activeParticiple: `${C1}${pv1}${C2}${C3}ie${C4}`,
        verbalNoun: `${C1}${pv1}${C2}${C3}i${C4}`,
    };

    return [formI, buildQuadriliteralFormII(formI, "strong")];
}

export function generateRootForms(
    consonants: string,
    pvSet: string,
    ipvSet: string,
    strengthStr: string = "strong",
    weakClassStr?: string,
    isImalaBlockedManual?: boolean,
): GeneratedVerbForm[] {
    const isImalaBlocked = isImalaBlockedManual || /[\u0127q]|g\u0127|h/i.test(consonants);
    const arr = consonants.includes("-")
        ? consonants.split("-")
        : consonants.split("");
    const C1 = arr[0] || "";
    const C2 = arr[1] || "";
    const C3 = arr[2] || "";
    const C4 = arr[3] || "";
    const [pv1 = "a", pv2 = "a"] = pvSet.split("-");
    const [ipv1 = "i", ipv2 = "a"] = ipvSet.split("-");

    let strength = strengthStr.toLowerCase();
    let weakClass = weakClassStr?.toLowerCase();

    // Auto-detect strength/weakClass from consonants if it's classified as strong but contains weak/geminated characteristics
    if (strength === "strong") {
        if (arr.length === 3) {
            if (C3 === "j" || C3 === "w") {
                strength = "weak";
                weakClass = "defective";
            } else if (C2 === "j" || C2 === "w") {
                strength = "weak";
                weakClass = "hollow";
            } else if (C1 === "w") {
                strength = "weak";
                weakClass = "assimilative";
            } else if (C2 === C3 && C2 !== "") {
                strength = "geminated";
            }
        } else if (arr.length === 4) {
            if (C4 === "j" || C4 === "w") {
                strength = "weak";
                weakClass = "defective";
            }
        }
    }

    if (arr.length === 4) {
        if (strength === "weak" && weakClass === "defective") {
            return generateQuadriliteralFormIDefective(
                [C1, C2, C3, C4],
                pv1 + "-" + pv2,
                ipv1 + "-" + ipv2,
                isImalaBlocked,
            );
        }
        return generateQuadriliteralStrong(C1, C2, C3, C4, pv1, pv2, ipv1, ipv2);
    }

    if (strength === "weak" && weakClass === "defective") {
        return generateTriliteralDefective(C1, C2, C3, pv1, pv2, ipv1, ipv2, isImalaBlocked);
    }
    if (strength === "weak" && weakClass === "hollow") {
        return generateTriliteralHollow(C1, C2, C3, pv1, pv2, ipv1, ipv2, isImalaBlocked);
    }
    if (strength === "weak" && weakClass === "assimilative") {
        return generateTriliteralAssimilative(C1, C2, C3, pv1, pv2, ipv1, ipv2, isImalaBlocked);
    }
    if (strength === "geminated") {
        return generateTriliteralGeminated(C1, C2, C3, pv1, pv2, ipv1, ipv2, isImalaBlocked);
    }
    return generateTriliteralStrong(C1, C2, C3, pv1, pv2, ipv1, ipv2, isImalaBlocked);
}

export type FormMarker = "plain" | "theoretical" | "auto_generated";

export interface MarkedVerbForm {
    form: GenerativeVerbFormType;
    perfect: { value: string; marker: FormMarker; entryId?: string };
    imperfect: { value: string; marker: FormMarker; entryId?: string };
    imperative: { value: string; marker: FormMarker; entryId?: string };
    passiveParticiple: { value: string; marker: FormMarker; entryId?: string };
    activeParticiple: { value: string; marker: FormMarker; entryId?: string };
    verbalNoun: { value: string; marker: FormMarker; entryId?: string };
}

export interface AttestedEntry {
    word: string;
    id?: string;
    form: string;
    pos?: string;
    root?: string;
    stem?: string;
    type: "lemma" | "passive" | "active" | "noun" | "imperfect" | "imperative";
    participleType?: "passive" | "active";
}

export interface AttestedEntryMatchCriteria {
    surface: string;
    form?: string;
    pos?: string;
    root?: string;
    stem?: string;
    type?: "lemma" | "passive" | "active" | "noun" | "imperfect" | "imperative";
    participleType?: "passive" | "active";
}

function normalizeMatchKey(value?: string | null): string {
    return (value || "").trim().toLowerCase();
}

function getEntryRootKey(entry: any): string {
    return entry?.root_pattern_form?.root?.consonant_array?.join("-")
        || entry?.root_pattern_form?.root?.consonants
        || entry?.zokk_morphology?.root
        || entry?.root_consonants
        || "";
}

function getEntryStemKey(entry: any): string {
    return entry?.zokk_morphology?.stem_string
        || entry?.stem_string
        || entry?.root_pattern_form?.derived_form
        || "";
}

export function getEntryVerbalForm(entry: any): string {
    if (!entry) return "";
    if (entry.pos === "verb") {
        return entry.verb_morphology?.form || entry._formLabel || "I";
    }
    if (entry.pos === "participle") {
        return entry.participle_morphology?.verbal_form
            || entry.verbal_form
            || entry.verb_morphology?.form
            || entry._formLabel
            || "I";
    }
    if (entry.pos === "noun" || entry.pos === "verbal_noun") {
        return entry.noun_morphology?.verbal_form
            || entry.verbal_form
            || entry.verb_morphology?.form
            || entry._formLabel
            || "I";
    }
    return entry.verb_morphology?.form || entry._formLabel || "I";
}

function matchesAttestedCriteria(
    entry: AttestedEntry,
    criteria: AttestedEntryMatchCriteria,
    includeSurface: boolean,
): boolean {
    if (includeSurface && normalizeMatchKey(entry.word) !== normalizeMatchKey(criteria.surface)) {
        return false;
    }

    if (criteria.form) {
        const entryForm = entry.form || "I";
        if (normalizeMatchKey(entryForm) !== normalizeMatchKey(criteria.form)) {
            return false;
        }
    }

    if (criteria.pos && normalizeMatchKey(entry.pos) !== normalizeMatchKey(criteria.pos)) {
        return false;
    }

    if (criteria.type && entry.type !== criteria.type) {
        return false;
    }

    if (criteria.participleType && normalizeMatchKey(entry.participleType) !== normalizeMatchKey(criteria.participleType)) {
        return false;
    }

    const rootKey = normalizeMatchKey(criteria.root);
    const stemKey = normalizeMatchKey(criteria.stem);
    if (rootKey || stemKey) {
        const entryRoot = normalizeMatchKey(entry.root);
        const entryStem = normalizeMatchKey(entry.stem);
        const rootMatches = rootKey ? entryRoot === rootKey : false;
        const stemMatches = stemKey ? entryStem === stemKey : false;

        if (rootKey && stemKey) return rootMatches || stemMatches;
        if (rootKey) return rootMatches;
        if (stemKey) return stemMatches;
    }

    return true;
}

export function resolveAttestedEntry(
    attested: AttestedEntry[],
    criteria: AttestedEntryMatchCriteria,
): AttestedEntry | null {
    const exact = attested.find((entry) => matchesAttestedCriteria(entry, criteria, true));
    if (exact) return exact;

    const fallback = attested.find((entry) => matchesAttestedCriteria(entry, criteria, false));
    return fallback || null;
}

export function resolveAttestedEntryFromEntries(
    entries: any[],
    criteria: AttestedEntryMatchCriteria,
): AttestedEntry | null {
    return resolveAttestedEntry(getAttestedEntries(entries), criteria);
}

export function markGeneratedForms(
    generated: GeneratedVerbForm[],
    attested: AttestedEntry[],
): MarkedVerbForm[] {
    const attestedRows = new Set<GenerativeVerbFormType>();
    const sharedRoot = attested.find((entry) => entry.root)?.root;
    const sharedStem = attested.find((entry) => entry.stem)?.stem;

    // First pass to find what is attested
    const attestedG = generated.map((g) => {
        const isLemmaAttested = !!resolveAttestedEntry(attested, {
            surface: g.perfect,
            form: g.form,
            type: "lemma",
            pos: "verb",
            root: sharedRoot,
            stem: sharedStem,
        });
        const isPassiveAttested = !!resolveAttestedEntry(attested, {
            surface: g.passiveParticiple,
            form: g.form,
            type: "passive",
            pos: "participle",
            participleType: "passive",
            root: sharedRoot,
            stem: sharedStem,
        });
        const isActiveAttested = !!resolveAttestedEntry(attested, {
            surface: g.activeParticiple,
            form: g.form,
            type: "active",
            pos: "participle",
            participleType: "active",
            root: sharedRoot,
            stem: sharedStem,
        });
        const isVNAttested = !!resolveAttestedEntry(attested, {
            surface: g.verbalNoun,
            form: g.form,
            type: "noun",
            pos: "noun",
            root: sharedRoot,
            stem: sharedStem,
        });

        const anyAttested =
            isLemmaAttested || isPassiveAttested || isActiveAttested || isVNAttested;
        if (anyAttested) attestedRows.add(g.form);
        return {
            form: g.form,
            isLemmaAttested,
            isPassiveAttested,
            isActiveAttested,
            isVNAttested,
            anyAttested,
        };
    });

    const reconstructableForms = new Set<GenerativeVerbFormType>();

    // Dependency Logic:
    // If F1 exists -> F7 is probably reconstructable
    if (attestedRows.has("I")) reconstructableForms.add("VII");
    // If F2 exists -> F5
    if (attestedRows.has("II")) reconstructableForms.add("V");
    // If F3 exists -> F6
    if (attestedRows.has("III")) reconstructableForms.add("VI");

    // F8 -> F1
    if (attestedRows.has("VIII")) reconstructableForms.add("I");

    // NOTE: IV, IX, Xa, Xb are independent as requested.

    return generated.map((g) => {
        const ag = attestedG.find((x) => x.form === g.form)!;

        // Row is theoretical if:
        // 1. Any part of the row is attested
        // 2. OR this form is reconstructable from another attested form
        let rowTheoretical = false;
        if (ag.anyAttested) rowTheoretical = true;
        if (!ag.anyAttested && reconstructableForms.has(g.form))
            rowTheoretical = true;

        const applyMarker = (
            generatedVal: string,
            formType: "lemma" | "passive" | "active" | "noun" | "imperfect" | "imperative",
            isImperfect: boolean = false,
        ): { value: string; marker: FormMarker; entryId?: string } => {
            if (generatedVal === "-") return { value: generatedVal, marker: "plain" };

            if (isImperfect) return { value: generatedVal, marker: "plain" };

            const att =
                formType === "lemma"
                    ? resolveAttestedEntry(attested, {
                        surface: g.perfect,
                        form: g.form,
                        type: "lemma",
                        pos: "verb",
                        root: sharedRoot,
                        stem: sharedStem,
                    })
                    : formType === "passive"
                        ? resolveAttestedEntry(attested, {
                            surface: g.passiveParticiple,
                            form: g.form,
                            type: "passive",
                            pos: "participle",
                            participleType: "passive",
                            root: sharedRoot,
                            stem: sharedStem,
                        })
                        : formType === "active"
                            ? resolveAttestedEntry(attested, {
                                surface: g.activeParticiple,
                                form: g.form,
                                type: "active",
                                pos: "participle",
                                participleType: "active",
                                root: sharedRoot,
                                stem: sharedStem,
                            })
                            : formType === "noun"
                                ? resolveAttestedEntry(attested, {
                                    surface: g.verbalNoun,
                                    form: g.form,
                                    type: "noun",
                                    pos: "noun",
                                    root: sharedRoot,
                                    stem: sharedStem,
                                })
                                : null;

            // If we have an exact match OR a metadata match, mark as plain and use the attested word/ID
            if (att) {
                return { value: att.word, marker: "plain", entryId: att.id };
            }

            if (rowTheoretical) return { value: generatedVal, marker: "theoretical" };
            return { value: generatedVal, marker: "auto_generated" };
        };

        const perfect = applyMarker(g.perfect, "lemma");
        const imperfect =
            g.imperfect === "-"
                ? { value: g.imperfect, marker: "plain" as FormMarker }
                : { value: g.imperfect, marker: perfect.marker };
        const imperative =
            (g.imperative ?? "-") === "-"
                ? { value: g.imperative ?? "-", marker: "plain" as FormMarker }
                : { value: g.imperative ?? "-", marker: perfect.marker };

        return {
            form: g.form,
            perfect,
            imperfect,
            imperative,
            passiveParticiple: applyMarker(g.passiveParticiple, "passive"),
            activeParticiple: applyMarker(g.activeParticiple, "active"),
            verbalNoun: applyMarker(g.verbalNoun, "noun"),
        };
    });
}

/**
 * Gather all attested word-to-ID mappings from an array of Entry objects,
 * including subentries and internal morphology fields, to assist markGeneratedForms.
 */
export function getAttestedEntries(entries: any[]): AttestedEntry[] {
    const attested: AttestedEntry[] = [];
    entries.forEach((e: any) => {
        const form = getEntryVerbalForm(e);
        const root = getEntryRootKey(e);
        const stem = getEntryStemKey(e);

        // 1. Link the entry itself based on its POS
        if (e.pos === "verb") {
            attested.push({ word: e.headword, id: e.id, form, pos: e.pos, root, stem, type: "lemma" });
        } else if (e.pos === "participle") {
            const pt =
                e.participle_morphology?.type ||
                e.participle_morphology?.participle_type ||
                e.verb_morphology?.participle_type ||
                e.participle_type ||
                "active";
            attested.push({
                word: e.headword,
                id: e.id,
                form,
                pos: e.pos,
                root,
                stem,
                type: pt === "passive" ? "passive" : "active",
                participleType: pt === "passive" ? "passive" : "active",
            });
        } else if (e.pos === "noun" || e.pos === "verbal_noun") {
            attested.push({ word: e.headword, id: e.id, form, pos: "noun", root, stem, type: "noun" });
        }

        // 2. Also check internal fields within the entry (e.g. for legacy verbs)
        if (e.verb_morphology?.passive_participle) {
            attested.push({
                word: e.verb_morphology.passive_participle,
                id: e.id,
                form,
                pos: "participle",
                root,
                stem,
                type: "passive",
                participleType: "passive",
            });
        }
        if (e.verb_morphology?.active_participle) {
            attested.push({
                word: e.verb_morphology.active_participle,
                id: e.id,
                form,
                pos: "participle",
                root,
                stem,
                type: "active",
                participleType: "active",
            });
        }
        if (e.verb_morphology?.verbal_noun) {
            attested.push({
                word: e.verb_morphology.verbal_noun,
                id: e.id,
                form,
                pos: "noun",
                root,
                stem,
                type: "noun",
            });
        }
        const storedImperfective3sg =
            e.verb_morphology?.imperfective_3sgm ||
            e.verb_morphology?.imperfective_3sg_m;
        if (storedImperfective3sg) {
            attested.push({
                word: storedImperfective3sg,
                id: e.id,
                form,
                pos: "verb",
                root,
                stem,
                type: "imperfect",
            });
        }
        if (e.verb_morphology?.imperative_sg) {
            attested.push({
                word: e.verb_morphology.imperative_sg,
                id: e.id,
                form,
                pos: "verb",
                root,
                stem,
                type: "imperative",
            });
        }

        // 3. Similarly check subentries
        if (e.subentries) {
            e.subentries.forEach((sub: any) => {
                const subForm = getEntryVerbalForm(sub) || form;
                const subPos = sub.pos === "verbal_noun" ? "noun" : sub.pos;
                if (subPos === "noun") {
                    attested.push({ word: sub.headword, id: sub.id, form: subForm, pos: subPos, root: getEntryRootKey(sub) || root, stem: getEntryStemKey(sub) || stem, type: "noun" });
                } else if (subPos === "participle") {
                    const pt =
                        sub.participle_morphology?.type ||
                        sub.participle_morphology?.participle_type ||
                        sub.verb_morphology?.participle_type ||
                        sub.participle_type ||
                        "active";
                    attested.push({
                        word: sub.headword,
                        id: sub.id,
                        form: subForm,
                        pos: subPos,
                        root: getEntryRootKey(sub) || root,
                        stem: getEntryStemKey(sub) || stem,
                        type: pt === "passive" ? "passive" : "active",
                        participleType: pt === "passive" ? "passive" : "active",
                    });
                } else if (sub.pos === "verb") {
                    attested.push({
                        word: sub.headword,
                        id: sub.id,
                        form: subForm,
                        pos: sub.pos,
                        root: getEntryRootKey(sub) || root,
                        stem: getEntryStemKey(sub) || stem,
                        type: sub.verb_morphology?.participle_type ? (sub.verb_morphology.participle_type === "passive" ? "passive" : "active") : "lemma",
                    });
                }
            });
        }
    });

    return attested;
}
