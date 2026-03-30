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
 * ── Stem Types Theory & Clitic Attachment Logic ────────────────────────────
 *
 * To support object pronoun (clitic) attachment, the engine pre-calculates
 * differentiated stems based on phonological conditioning:
 *
 * 1. Type 1 (Full/Attached):
 *    - Used for consonant-initial suffixes (e.g., -ni, -ha, -hom).
 *    - Logic: Preserves the theme vowel but typically shifts the grade (e -> i)
 *      to buffer the consonant cluster (e.g., jikteb -> jiktib-ni).
 *
 * 2. Type 2 (Syncopated/Shifted):
 *    - Used for vowel-initial suffixes (e.g., -u, -ek).
 *    - Logic: Drops the theme vowel (syncopation) to avoid vowel clusters,
 *      or shifts it (metathesis) before C2 if C2 is a liquid/guttural
 *      (e.g., jikteb -> jiktb-u vs jaħrab -> jaħarb-u).
 */

import type {
    VerbConjugationTable,
    ConjugationRow,
    VerbStrength,
    WeakClass,
} from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConjugationInput {
    /** Hyphen-separated root consonants, e.g. "k-t-b" */
    root: string;
    /** Verb form: "I", "II", "III", etc. */
    form: string;
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
    impfType1: (person: number) => string; // Attached form (e -> i shift)
    impfType2: (person: number) => string; // Syncopated form (before vowel suffixes)
    impfPlural: (person: number) => string; // Plural form (endsWith -u)

    // Negative overrides
    negM?: string;
    negF?: string;

    // Stem type overrides
    perfType1Builder?: (perfRow: string, pIdx: number) => string;

    // Imperative
    impSg: string;
    impPl: string;
    impSgStems?: { impfType1: string; impfType2: string };
    impPlStems?: { impfType1: string; impfType2: string };

    // Metadata
    blocksImala: boolean;
}

// ── Engine Core ────────────────────────────────────────────────────────────

function buildConjugationTable(
    recipe: StemRecipe,
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
    const stemsList: any[] = [];

    for (let i = 0; i < 7; i++) {
        // Build Base Imperfect
        const base = i >= 4 ? recipe.impfPlural(i) : recipe.impfBase(i);
        impfForms.push(base);

        // perfType1: Attached version (e -> i shift usually) unless overridden
        let p1 = recipe.perfType1Builder
            ? recipe.perfType1Builder(perfRows[i], i)
            : perfRows[i].replace(/e([^aeiou])$/, "i$1");

        // perfType2: Syncopated version
        let p2 = i === 2 ? recipe.perfSync : perfRows[i];
        if (recipe.perfType1Builder && i === 3) {
            p2 = recipe.perfType1Builder(perfRows[i], i);
        }

        stemsList.push({
            impfType1: i >= 4 ? recipe.impfPlural(i) : recipe.impfType1(i),
            impfType2: i >= 4 ? recipe.impfPlural(i) : recipe.impfType2(i),
            perfType1: p1,
            perfType2: p2,
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
        perfect_neg:
            i === 2 ? negM : i === 3 ? negF : perfRows[i].replace("ie", "e"),
        stems: stemsList[i],
    }));

    return {
        rows,
        imperative_sg: recipe.impSg,
        imperative_pl: recipe.impPl,
        imperative_sg_stems: recipe.impSgStems ?? {
            impfType1: recipe.impSg,
            impfType2: recipe.impSg,
        },
        imperative_pl_stems: recipe.impPlStems ?? {
            impfType1: recipe.impPl.replace("ie", "e"),
            impfType2: recipe.impPl,
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
): VerbConjugationTable {
    const mapRow = (row: ConjugationRow, pIdx: number): ConjugationRow => ({
        ...row,
        perfect: perfPrefix + row.perfect,
        perfect_neg: row.perfect_neg
            ? `${perfPrefix}${row.perfect_neg.replace(/^ma /, "")}`
            : undefined,
        imperfect: impfTransform(row.imperfect, pIdx),
        imperfect_attached: row.imperfect_attached
            ? impfTransform(row.imperfect_attached, pIdx)
            : undefined,
        stems: row.stems
            ? {
                impfType1: impfTransform(row.stems.impfType1, pIdx),
                impfType2: impfTransform(row.stems.impfType2, pIdx),
                perfType1: perfPrefix + row.stems.perfType1,
                perfType2: perfPrefix + row.stems.perfType2,
            }
            : undefined,
    });

    return {
        ...base,
        rows: base.rows.map(mapRow),
        imperative_sg: perfPrefix + base.imperative_sg,
        imperative_pl: perfPrefix + base.imperative_pl,
        imperative_sg_neg: base.imperative_sg_neg
            ? `la ${impfTransform(base.imperative_sg_neg.replace(/^la /, ""), 1)}`
            : undefined,
        imperative_pl_neg: base.imperative_pl_neg
            ? `la ${impfTransform(base.imperative_pl_neg.replace(/^la /, ""), 5)}`
            : undefined,
        imperative_sg_stems: base.imperative_sg_stems
            ? {
                impfType1: perfPrefix + base.imperative_sg_stems.impfType1,
                impfType2: perfPrefix + base.imperative_sg_stems.impfType2,
            }
            : undefined,
        imperative_pl_stems: base.imperative_pl_stems
            ? {
                impfType1: perfPrefix + base.imperative_pl_stems.impfType1,
                impfType2: perfPrefix + base.imperative_pl_stems.impfType2,
            }
            : undefined,
    };
}

// ── Vowel helpers ──────────────────────────────────────────────────────────

function parseVset(vset: string): { v1: string; v2: string } {
    const parts = vset.split("-");
    return { v1: parts[0] ?? "i", v2: parts[1] ?? "" };
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

/**
 * Normalizes theme vowels for base lemma generation,
 * ensuring pharyngeal compatibility (e.g. laqqa' instead of laqqe').
 */
function cleanThemeVowel(vowel: string, C3?: string): string {
    if (C3 === "għ") return "a";
    return vowel;
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
    const isGutturalLocal = (c: string) => ["għ", "ħ", "q"].includes(c);

    const perfSyncRoot = `${C1}${pv1}${C2}${C3}`;
    const perfRedRoot = `${C1}${C2}${pv1}${C3}`;
    const perfFull = `${C1}${pv1}${C2}${pv2}${C3}`;

    const impfT1 = (pfx: string) =>
        `${pfx}${C1}${C2}${applyAttachedShift(iv2 || "", C3)}${C3}`;
    const impfT2 = (pfx: string) => {
        const theme = iv2 || "i";
        if (isGutturalLocal(C2) || isSonorant(C2))
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

    const impfBase = (person: number) => {
        const pfx = buildPrefix(person, vsetImpf);
        const pfxCons = pfx.replace(/[aeiou]+$/, "");
        const stem = `${C2}${iv2}${C3}`;
        return person >= 4
            ? combinePrefixPlural(pfxCons, `${C2}${C3}`, "u")
            : combinePrefix(pfxCons, stem);
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
            impfBase,
            impfType1: (i) => {
                const p = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
                return combinePrefix(
                    p,
                    `${C2}${applyAttachedShift(iv2 || "", C3)}${C3}`,
                );
            },
            impfType2: (i) => {
                const p = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
                return combinePrefix(p, `${C2}${C3}`);
            },
            impfPlural: (i) => {
                const p = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
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
    const [C1, _C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1 } = parseVset(vsetImpf);

    const longV = pv2 || pv1;
    const shortV = pv1;

    const perfFull = `${C1}${longV}${C3}`;
    const perfReduced = `${C1}${shortV}${C3}`;

    const impfBase = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `${C1}${iv1}${C3}`;
        return combinePrefix(pfxCons, stem);
    };

    const { v1: impV1 } = parseVset(vsetImp);
    const pfx1 = buildPrefix(1, vsetImpf);
    const impSg = impfBase(1).replace(pfx1, impV1);
    const impPl = impfBase(5).replace(pfx1, impV1);

    return buildConjugationTable(
        {
            perfFull,
            perfSync: perfFull,
            perfReduced,
            perf3f: `${perfFull}et`,
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
                impfType1: impfBase(1).replace(pfx1, impV1),
                impfType2: impfBase(1).replace(pfx1, impV1),
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
    const pfx1 = buildPrefix(1, vsetImpf);
    const impSg = impfBase(1).replace(pfx1, impV1);
    const impPl = impfBase(5).replace(pfx1, impV1);

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
                impfType1: impfBase(1).replace(pfx1, impV1),
                impfType2: impfBase(1).replace(pfx1, impV1),
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
        ? `${C1}e${pv1}${C2}${pv2}`
        : `${C1}${pv1}${C2}${pv2}`;
    const perfSync = isGuttural(C1)
        ? `${C1}e${pv1}${C2}${pv2}`
        : `${C1}${C2}${pv2}`;
    const perfReduced = isGuttural(C1) ? `${C1}e${C2}` : `${C1}${C2}${pv1}j`;

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
            perf3f: pv2 === "a" ? `${perfSync}t` : `${perfSync}et`,
            perfType1Builder: (perfRow, pIdx) => {
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

function genDefective(
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

    const perfFull = `${C1}${pv1}${C2}${pv2}`;
    const perf3f = pv1 === "a" && pv2 === "a" ? `${C1}${C2}at` : `${C1}${C2}iet`;
    const perfReduced = isPharyngeal(C1)
        ? `${C1}${pv1}${C2}${pv1}`
        : `${C1}${C2}${pv1}`;

    const imalaBlocked = isImalaBlocked;
    const attV = applyAttachedShift(iv2 || "a", C3, true);
    const attVj = attV === "ie" ? "iej" : imalaBlocked ? "aj" : "ij";

    const impfBase = (person: number) => {
        const prefix = buildPrefix(person, vsetImpf);
        const themeEnd = iv2 || "a";
        return `${prefix}${C1}${C2}${themeEnd}`;
    };
    const impfPlural = (person: number) => {
        const prefix = buildPrefix(person, vsetImpf);
        const suffix = iv1 === "i" ? "u" : iv1 === "a" && iv2 === "a" ? "aw" : "ew";
        return `${prefix}${C1}${C2}${suffix}`;
    };

    const impfType1 = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, vsetImpf)}${C1}${C2}${attV}`;
    };

    const impfType2 = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, vsetImpf)}${C1}${C2}${attVj}`;
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const suffix = iv1 === "i" ? "u" : iv1 === "a" && iv2 === "a" ? "aw" : "ew";
    const impSg = `${impV1}${C1}${C2}${impV2}`;
    const impPl = `${impV1}${C1}${C2}${suffix}`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: `${perfReduced}`,
            perfReduced: `${perfReduced}j`,
            perf3f,
            perfType1Builder: (perfRow, pIdx) => {
                if (pIdx === 2 && pv2 === "a") return `${C1}${pv1}${C2}ie`;
                else if (pIdx === 3) return `${perf3f.slice(0, -1)}t`;
                return perfRow;
            },
            impfBase,
            impfType1,
            impfType2,
            impfPlural,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${impV1}${C1}${C2}${attV}`,
                impfType2: `${impV1}${C1}${C2}${attVj}`,
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

// ── FORM II STRONG ─────────────────────────────────────────────────────────
// Doubled C2: CvCCvC pattern (e.g. fettaħ / jfettaħ)

function genFormIIStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;

    const perfFull = `${C1}${pv1}${C2D}${cleanThemeVowel(pv2, C3)}${C3}`;
    const perfSync = `${C1}${pv1}${C2D}${C3}`;

    const impfT1stem = `${C1}${iv1}${C2D}${applyAttachedShift(iv2, C3)}${C3}`;
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
            perfReduced: `${C1}${pv1}${C2D}${applyAttachedShift(pv2, C3)}${C3}`,
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
                impfType1: `${C1}${impV1}${C2D}${applyAttachedShift(impV2, C3)}${C3}`,
                impfType2: `${C1}${impV1}${C2D}${C3}`,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
        },
        C3,
        verbForm,
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
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;

    const perfFull = `${C1}${pv1}${C2D}${cleanThemeVowel(pv2, C3)}${C3}`;
    const perfSync = `${C1}${pv1}${C2}${C3}`;

    const impfT1stem = `${C1}${iv1}${C2D}${applyAttachedShift(iv2, C3)}${C3}`;
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
            perfReduced: `${C1}${pv1}${C2D}${applyAttachedShift(pv2, C3)}${C3}`,
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
                impfType1: `${C1}${impV1}${C2D}${applyAttachedShift(impV2, C3)}${C3}`,
                impfType2: `${C1}${impV1}${C2}${C3}`,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
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

    const perfFull = `${C1}${pv1}${C2D}${pv2}`; // nessa
    const perf3f = `${C1}${pv1}${C2D}iet`; // nessiet
    const perfReduced = `${C1}${pv1}${C2D}`; // -ness-

    const imalaBlocked = isImalaBlocked;
    const attV = applyAttachedShift(iv2 || "a", C3, true);
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

    const impfType1 = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}${perfReduced}${attV}`;
    };

    const impfType2 = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}${perfReduced}${attVj}`;
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const suffix = impV2 === "i" ? "u" : pv1 === "a" && pv2 === "a" ? "aw" : "ew";
    const impSg = `${perfReduced}${impV2}`;
    const impPl = `${perfReduced}${suffix}`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: `${perfReduced}`,
            perfReduced: `${perfReduced}ej`,
            perf3f,
            perfType1Builder: (perfRow, pIdx) => {
                if (pIdx === 2 && pv2 === "a") return `${C1}${pv1}${C2D}a`;
                else if (pIdx === 3) return `${perf3f.slice(0, -1)}t`;
                else if (pIdx === 7) return `${perfReduced}ew`;
                return perfRow;
            },
            impfBase,
            impfType1,
            impfType2,
            impfPlural,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${impV1}${C1}${C2}${attV}`,
                impfType2: `${impV1}${C1}${C2}${attVj}`,
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
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const ImalaBlockedVowel = pv1 === "ie" ? "e" : "a";

    const perfFull = `${C1}${pv1}${C2}${pv2}${C3}`;
    const perfSync = `${C1}${pv1}${C2}${C3}`;
    const perfImalaBlocked = `${C1}${ImalaBlockedVowel}${C2}i${C3}`;

    const impfT1stem = `${C1}${iv1 === "ie" ? "e" : iv1}${C2}${applyAttachedShift(iv2, C3)}${C3}`;
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
            perfType1Builder: (perfRow, pIdx) => {
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
                impfType1: `${C1}${impV1 === "ie" ? "e" : impV1}${C2}${applyAttachedShift(impV2, C3)}${C3}`,
                impfType2: `${C1}${impV1}${C2}${C3}`,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
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
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
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

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2}${impV2}`;
    const impPl = `${C1}${impV1}${C2}u`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: perfImalaBlocked,
            perfReduced: perfImalaBlocked + "ej",
            perf3f: `${perfImalaBlocked}iet`,
            perfType1Builder: (perfRow, pIdx) => {
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
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `${pv1}${C1}${C2}${pv2}${C3}`;
    const perfSync = `${pv1}${C1}${C2}${C3}`;

    const impfStemT1 = `${C1}${C2}${applyAttachedShift(iv2, C3, true)}${C3}`;
    const impfStemSync = `${C1}${C2}${C3}`;

    const impfBase = (i: number) => {
        const pfx = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, "");
        const stem = `${iv1}${C1}${C2}${iv2}${C3}`;
        const sync = `${iv1}${C1}${C2}${C3}`;
        return i >= 4
            ? combinePrefixPlural(pfx, sync, "u")
            : combinePrefix(pfx, stem);
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${impV1}${C1}${C2}${impV2}${C3}`;
    const impPl = `${impV1}${C1}${C2}${C3}u`;

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
                    `${iv1}${impfStemSync}`,
                ),
            impfPlural: (i) =>
                combinePrefixPlural(
                    buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, ""),
                    `${iv1}${impfStemSync}`,
                    "u",
                ),
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${impV1}${C1}${C2}${applyAttachedShift(impV2, C3, true)}${C3}`,
                impfType2: `${impV1}${C1}${C2}${C3}`,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
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
): VerbConjugationTable {
    const baseTable = genFormIIStrong(C, vsetPerf, vsetImpf, vsetImp, verbForm);
    return deriveTable(baseTable, "t", (str) => str[0] + "it" + str.slice(1));
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
    return deriveTable(baseTable, "t", (str) => str[0] + "it" + str.slice(1));
}

// ── FORM VI ────────────────────────────────────────────────────────────────
// t- + Form III: tC1ieC2vC3 / jitC1ieC2vC3 (e.g. tqatel / jitqatel)
function genFormVI(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const baseTable = genFormIIIStrong(C, vsetPerf, vsetImpf, vsetImp, verbForm);
    return deriveTable(baseTable, "t", (str) => str[0] + "it" + str.slice(1));
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
    return deriveTable(baseTable, "t", (str) => str[0] + "it" + str.slice(1));
}

// ── FORM VII ───────────────────────────────────────────────────────────────
// n- + Form I: nC1vC2vC3 / jinC1vC2vC3 (e.g. nkiteb / jinkiteb)
function genFormVII(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `n${C1}${pv1}${C2}${pv2}${C3}`;
    const perfSync = `n${C1}${pv1}${C2}${C3}`;

    const impfStemT1 = `n${C1}${iv1}${C2}${applyAttachedShift(iv2, C3)}${C3}`;
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
            perfReduced: `n${C1}${pv1}${C2}${applyAttachedShift(pv2, C3)}${C3}`,
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
                impfType1: `n${C1}${impV1}${C2}${applyAttachedShift(impV2, C3)}${C3}`,
                impfType2: `n${C1}${impV1}${C2}${C3}`,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
        },
        C3,
        verbForm,
    );
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
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const pharyngealC1 = isPharyngeal(C1);
    const gutturalC1 = isGuttural(C1);
    const pfxV = gutturalC1 ? "e" : "i";

    const perfFull = pharyngealC1
        ? `e${C1}t${pv1}${C2}${pv2}${C3}`
        : `${C1}t${pv1}${C2}${pv2}${C3}`;
    const perfSync = pharyngealC1
        ? `e${C1}t${pv1}${C2}${C3}`
        : `${C1}t${pv1}${C2}${C3}`;

    const impfCoreT1 = `${C1}t${iv1}${C2}${applyAttachedShift(iv2, C3)}${C3}`;
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
                ? `e${C1}t${pv1}${C2}${applyAttachedShift(pv2, C3)}${C3}`
                : `${C1}t${pv1}${C2}${applyAttachedShift(pv2, C3)}${C3}`,
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
                    applyAttachedShift(impV2, C3, true) +
                    C3,
                impfType2: (pharyngealC1 ? "e" : "") + C1 + "t" + impV1 + C2 + C3,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
        },
        C3,
        verbForm,
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

    const perfBase = pharyngealC1 ? `${C1}e${C2}ie${C3}` : `${C1}${C2}ie${C3}`;
    const perfSync = pharyngealC1 ? `${C1}e${C2}i${C3}` : `${C1}${C2}i${C3}`;

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
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `st${pv1}${C1}${C2}${pv2}${C3}`;
    const perfSync = `st${pv1}${C1}${C2}${C3}`;

    const impfStemT1 = `st${iv1}${C1}${C2}${applyAttachedShift(iv2, C3)}${C3}`;
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
            perfReduced: `st${pv1}${C1}${C2}${applyAttachedShift(pv2, C3)}${C3}`,
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
                impfType1: `st${impV1}${C1}${C2}${applyAttachedShift(impV2, C3)}${C3}`,
                impfType2: `st${impV1}${C1}${C2}${C3}`,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
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

    const impfStemT1 = `st${iv1}${C1}${C2}${applyAttachedShift(iv2, C3)}${C3}`;
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
            perfReduced: `st${pv1}${C1}${C2}${applyAttachedShift(pv2, C3)}${C3}`,
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
                impfType1: `st${impV1}${C1}${C2}${applyAttachedShift(impV2, C3)}${C3}`,
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
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;

    const perfFull = `st${C1}${pv1}${C2D}${cleanThemeVowel(pv2, C3)}${C3}`;
    const perfSync = `st${C1}${pv1}${C2D}${C3}`;

    const impfT1stem = `ist${C1}${iv1}${C2D}${applyAttachedShift(iv2, C3)}${C3}`;
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
            perfReduced: `st${C1}${pv1}${C2D}${applyAttachedShift(pv2, C3)}${C3}`,
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
                impfType1: `st${C1}${impV1}${C2D}${applyAttachedShift(impV2, C3)}${C3}`,
                impfType2: `st${C1}${impV1}${C2D}${C3}`,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
        },
        C3,
        verbForm,
    );
}
// ── FORM Xb Hollow ─────────────────────────────────────────────────────────
// Doubled C2: stCvCCvC pattern (e.g. stħajjel / jistħajjel)

function genFormXbHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const C2D = C2 + C2;

    const perfFull = `st${C1}${pv1}${C2D}${cleanThemeVowel(pv2, C3)}${C3}`;
    const perfSync = `st${C1}${pv1}${C2}${C3}`;

    const impfT1stem = `ist${C1}${iv1}${C2D}${applyAttachedShift(iv2, C3)}${C3}`;
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
            perfReduced: `st${C1}${pv1}${C2D}${applyAttachedShift(pv2, C3)}${C3}`,
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
                impfType1: `st${C1}${impV1}${C2D}${applyAttachedShift(impV2, C3)}${C3}`,
                impfType2: `st${C1}${impV1}${C2}${C3}`,
            },
            blocksImala:
                C3 === "għ" && (vsetImpf.endsWith("a") || vsetPerf.endsWith("a")),
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
    const attV = applyAttachedShift(iv2 || "a", C3, true);
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

    const impfType1 = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}i${perfReduced}${attV}`;
    };

    const impfType2 = (person: number) => {
        if (person >= 4) return impfPlural(person);
        return `${buildPrefix(person, "")}${perfReduced}${attVj}`;
    };

    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const suffix = impV2 === "i" ? "u" : pv1 === "a" && pv2 === "a" ? "aw" : "ew";
    const impSg = `${perfReduced}${impV2}`;
    const impPl = `${perfReduced}${suffix}`;

    return buildConjugationTable(
        {
            perfFull,
            perfSync: `${perfReduced}`,
            perfReduced: `${perfReduced}ej`,
            perf3f,
            perfType1Builder: (perfRow, pIdx) => {
                if (pIdx === 2 && pv2 === "a") return `st${C1}${pv1}${C2D}ie`;
                else if (pIdx === 3) return `${perf3f.slice(0, -1)}t`;
                else if (pIdx === 7) return `${perfReduced}ew`;
                return perfRow;
            },
            impfBase,
            impfType1,
            impfType2,
            impfPlural,
            impSg,
            impPl,
            impSgStems: {
                impfType1: `${impV1}st${C1}${C2}${attV}`,
                impfType2: `${impV1}st${C1}${C2}${attVj}`,
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
                const [C1, C2, C3] = consonants;
                const { v1: pv1 } = parseVset(input.vowelSetPerfect);
                return buildWeakQuadriliteralDefectiveConjugation(
                    `${C1}${pv1}${C2}${C3}`,
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
                const [C1, C2, C3] = consonants;
                const { v1: pv1 } = parseVset(input.vowelSetPerfect);
                return buildWeakQuadriliteralDefectiveConjugation(
                    `${C1}${pv1}${C2}${C3}`,
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
                    );
                default:
                    throw new Error(
                        `Unknown weak classification for Form I: ${weakClass}`,
                    );
            }
        }
    }

    if (form === "II") {
        if (strength === "strong") {
            return genFormIIStrong(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
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
                );
            }
            if (weakClass === "hollow") {
                return genFormIIHollow(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
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
            );
        }
    }

    if (form === "III") {
        if (strength === "strong") {
            return genFormIIIStrong(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
            );
        }
        if (strength === "weak") {
            if (weakClass === "assimilative") {
                return genFormIIIStrong(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
                );
            }
            if (weakClass === "hollow") {
                return genFormIIIStrong(
                    consonants,
                    input.vowelSetPerfect,
                    input.vowelSetImperfect,
                    input.vowelSetImperative,
                    form,
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
    }

    // ── Higher forms (IV–Xb) — class-neutral ────────────────────────────
    if (form === "IV")
        return genFormIV(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
        );
    if (form === "V") {
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
        return genFormVStrong(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
        );
    }
    if (form === "VI") {
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
        return genFormVI(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
        );
    }
    if (form === "VII")
        return genFormVII(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
        );
    if (form === "VIII")
        return genFormVIII(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
        );
    if (form === "IX")
        return genFormIX(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
        );
    if (form === "Xa") {
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
        if (strength === "geminated") {
            return genFormXaGeminated(
                consonants,
                input.vowelSetPerfect,
                input.vowelSetImperfect,
                input.vowelSetImperative,
                form,
            );
        }
        return genFormXaStrong(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
        );
    }
    if (form === "Xb") {
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
            );
        }
        return genFormXbStrong(
            consonants,
            input.vowelSetPerfect,
            input.vowelSetImperfect,
            input.vowelSetImperative,
            form,
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

    const f5_perf = `t${f2_perf}`;
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        imperative: f5_perf,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}`,
    });

    const f6_perf = `t${f3_perf}`;
    const e1 = hasIorE(pv1) ? "ie" : "a";
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        imperative: f6_perf,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${e1}${C2}i${C3}`,
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

    const f5_perf = `t${f2_perf}`;
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}`,
    });

    const f6_perf = `t${f3_perf}`;
    const e1 = ["i", "e"].includes(pv1) ? "ie" : "a";
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${e1}${C2}i${C3}`,
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
    _C3: string,
    pv1: string,
    pv2: string,
    ipv1: string,
    ipv2: string,
    _isImalaBlocked: boolean = false,
): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const f1_perf = `${C1}${pv1}${C2}${pv2}`;
    const f1_impf = `j${ipv1}${C1}${C2}${ipv2}`;
    const f1_pass = `m${ipv1}${C1}${C2}${ipv2}`;
    const a1 = hasIorE(pv1) ? "ie" : "a";
    const f1_act = `${C1}${a1}${C2}i`;
    const f1_vn = `${C1}i${C2}i`;
    const f1_impv = `${ipv1}${C1}${C2}${ipv2}`;

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
    const f2_impf = `j${C1}${pv1}${C2}${C2}i`;
    const f2_pass = `m${C1}${pv1}${C2}${C2}i`;
    const b1 = isGuttural(C2) ? "a" : "e";
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}j`; // beddej
    const vnv1 = isGuttural(C1) ? "a" : "i";
    const f2_vn = `t${vnv1}${C1}${C2}ija`; // tibdija
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
        perfect: f3 + pv2,
        imperfect: `j${f3}i`,
        passiveParticiple: `m${f3}i`,
        activeParticiple: "-",
        verbalNoun: "-",
    });

    const f4_perf = `${ipv1}${C1}${C2}${ipv2}`;
    const f4_impf = `jo${C1}${C2}${ipv2}`;
    const f4_act = `mi${C1}${C2}${ipv2}`;
    const h1 = C1 === "w" ? "u" : "i";
    const h2 = pv1 === "a" && pv2 === "a" ? "a" : "ie";
    const f4_vn = `${h1}${C1}${C2}${h2}ja`;
    forms.push({
        form: "IV",
        perfect: f4_perf,
        imperfect: f4_impf,
        passiveParticiple: "-",
        activeParticiple: f4_act,
        verbalNoun: f4_vn,
    });

    const f5_perf = `t${f2_perf}`;
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${pv1}${C2}${C2}ija`,
    });

    const f6_perf = `t${f3}${pv2}`;
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${f3}ija`,
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

    const f8_perf = `${C1}t${pv1}${C2}${pv2}`;
    forms.push({
        form: "VIII",
        perfect: f8_perf,
        imperfect: `ji${f8_perf}`,
        passiveParticiple: `mi${f8_perf}`,
        activeParticiple: "-",
        verbalNoun: `${C1}t${pv1}${C2}ija`,
    });

    const f9_perf = `${C1}${C2}${c1}`;
    forms.push({
        form: "IX",
        perfect: f9_perf,
        imperfect: `ji${f9_perf}`,
        passiveParticiple: `mu${f9_perf}`,
        activeParticiple: "-",
        verbalNoun: f9_perf,
    });

    const f10a_perf = `st${pv1}${C1}${C2}${pv2}`;
    forms.push({
        form: "Xa",
        perfect: f10a_perf,
        imperfect: `ji${f10a_perf}`,
        passiveParticiple: `mi${f10a_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${pv1}${C1}${C2}ija`,
    });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}`;
    forms.push({
        form: "Xb",
        perfect: f10b_perf,
        imperfect: `ji${f10b_perf}`,
        passiveParticiple: `mi${f10b_perf}`,
        activeParticiple: "-",
        verbalNoun: `st${C1}${pv1}${C2}${C2}ija`,
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

    const f5_perf = `t${f2_perf}`;
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}`,
    });

    const f6_perf = `t${f3_perf}`;
    const e1 = ["i", "e"].includes(pv1) ? "e" : "a";
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${e1}${C2}i${C3}`,
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

    const f1_perf = `${C1}${pv1}${C2}${pv2}`;
    const f1_impf = `j${ipv1}${C1}${C2}${ipv2}`;
    const f1_pass = `m${ipv1}${C1}${C2}${isImalaBlocked ? "a" : "i"}`; // Rough approximation
    const f1_act = `${C1}${hasIorE(pv1) ? "ie" : "a"}${C2}i`;
    const f1_vn = `${C1}${pv1}${C2}u`;
    const f1_impv = `${ipv1}${C1}${C2}${ipv2}`;

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

    const f5_perf = `t${C1}${pv1}${C2}${C2}${pv2}`;
    forms.push({
        form: "V",
        perfect: f5_perf,
        imperfect: `ji${f5_perf}`,
        imperative: f5_perf,
        passiveParticiple: `mi${f5_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}a`.replace(/undefined/g, ""),
    });

    const f6_perf = `t${f3_perf}`;
    const e1 = ["i", "e"].includes(pv1) ? "e" : "a";
    forms.push({
        form: "VI",
        perfect: f6_perf,
        imperfect: `ji${f6_perf}`,
        imperative: f6_perf,
        passiveParticiple: `mi${f6_perf}`,
        activeParticiple: "-",
        verbalNoun: `t${C1}${e1}${C2}i${C3}a`.replace(/undefined/g, ""),
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

const QUADRILITERAL_PERSONS = [
    { id: "1s", mt: "jiena", en: "I", prefix: "n" },
    { id: "2s", mt: "inti", en: "you (sg.)", prefix: "t" },
    { id: "3ms", mt: "huwa", en: "he", prefix: "j" },
    { id: "3fs", mt: "hija", en: "she", prefix: "t" },
    { id: "1p", mt: "aħna", en: "we", prefix: "n" },
    { id: "2p", mt: "intom", en: "you (pl.)", prefix: "t" },
    { id: "3p", mt: "huma", en: "they", prefix: "j" },
] as const;

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

function deriveQuadriliteralCliticStems(surface: string): { impfType1: string; impfType2: string } {
    return {
        impfType1: deriveQuadriliteralAttachedStem(surface),
        impfType2: deriveQuadriliteralSyncopatedStem(surface),
    };
}

function buildWeakQuadriliteralDefectiveConjugation(
    rootStem: string,
    isImalaBlocked: boolean,
    form: "I" | "II",
): VerbConjugationTable {
    const formIPerfect = [
        `${rootStem}ejt`,
        `${rootStem}ejt`,
        `${rootStem}a`,
        `${rootStem}iet`,
        `${rootStem}ejna`,
        `${rootStem}ejtu`,
        `${rootStem}ew`,
    ];
    const formIImperfect = [
        `n${rootStem}i`,
        combinePrefix("t", `${rootStem}i`),
        `j${rootStem}i`,
        combinePrefix("t", `${rootStem}i`),
        `n${rootStem}u`,
        combinePrefix("t", `${rootStem}u`),
        `j${rootStem}u`,
    ];
    const formIImperative = `${rootStem}i`;
    const formIImperativePl = `${rootStem}u`;

    const makeRows = (
        perfectRows: string[],
        imperfectRows: string[],
        useCliticStems: boolean,
    ): ConjugationRow[] =>
        QUADRILITERAL_PERSONS.map((person, idx) => ({
            person_mt: person.id,
            person_en: person.en,
            perfect: perfectRows[idx],
            imperfect: imperfectRows[idx],
            perfect_neg: perfectRows[idx],
              stems: useCliticStems
                  ? {
                      impfType1: deriveQuadriliteralCliticStems(imperfectRows[idx]).impfType1,
                      impfType2: deriveQuadriliteralCliticStems(imperfectRows[idx]).impfType2,
                      ...deriveWeakQuadriliteralPerfectCliticStems(rootStem, idx, perfectRows[idx]),
                  }
                  : {
                      impfType1: imperfectRows[idx],
                      impfType2: imperfectRows[idx],
                    perfType1: perfectRows[idx],
                    perfType2: perfectRows[idx],
                },
        }));

    const baseTable: VerbConjugationTable = {
        rows: makeRows(formIPerfect, formIImperfect, form === "I"),
        imperative_sg: formIImperative,
        imperative_pl: formIImperativePl,
        imperative_sg_stems: {
            impfType1: form === "I"
                ? deriveQuadriliteralCliticStems(formIImperative).impfType1
                : formIImperative,
            impfType2: form === "I"
                ? deriveQuadriliteralCliticStems(formIImperative).impfType2
                : formIImperative,
        },
        imperative_pl_stems: {
            impfType1: form === "I"
                ? deriveQuadriliteralCliticStems(formIImperativePl).impfType1
                : formIImperativePl,
            impfType2: form === "I"
                ? deriveQuadriliteralCliticStems(formIImperativePl).impfType2
                : formIImperativePl,
        },
        blocksImala: isImalaBlocked,
    };

    if (form === "I") {
        return baseTable;
    }

    return deriveQuadriliteralFormII(baseTable);
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

function deriveQuadriliteralImperfectStem(stem: string): string {
    return `ji${deriveQuadriliteralAssimilatedStem(stem)}`;
}

function deriveWeakQuadriliteralPerfectCliticStems(
    rootStem: string,
    rowIndex: number,
    perfectRow: string,
): { perfType1: string; perfType2: string } {
    if (rowIndex === 2) {
        return {
            perfType1: `${rootStem}i`,
            perfType2: `${rootStem}i`,
        };
    }

    if (rowIndex === 3) {
        return {
            perfType1: `${rootStem}it`,
            perfType2: `${rootStem}it`,
        };
    }

    return {
        perfType1: deriveQuadriliteralCliticStems(perfectRow).impfType1,
        perfType2: deriveQuadriliteralCliticStems(perfectRow).impfType2,
    };
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
    const rootClusterStem = `${C1}${pv1}${C2}${C3}${C4}`;
    const pluralStem = `${C1}${pv1}${C2}${C3}${C4}`;
    const perfect3fs = `${rootClusterStem}et`;

    const rows: ConjugationRow[] = [
        {
            person_mt: "1s",
            person_en: "I",
            perfect: `${rootStem}t`,
            imperfect: `n${rootStem}`,
            perfect_neg: `${rootStem}t`,
            stems: {
                impfType1: deriveQuadriliteralCliticStems(`n${rootStem}`).impfType1,
                impfType2: deriveQuadriliteralCliticStems(`n${rootStem}`).impfType2,
                perfType1: deriveQuadriliteralCliticStems(`${rootStem}t`).impfType1,
                perfType2: deriveQuadriliteralCliticStems(`${rootStem}t`).impfType2,
            },
        },
        {
            person_mt: "2s",
            person_en: "you (sg.)",
            perfect: `${rootStem}t`,
            imperfect: `t${rootStem}`,
            perfect_neg: `${rootStem}t`,
            stems: {
                impfType1: deriveQuadriliteralCliticStems(`t${rootStem}`).impfType1,
                impfType2: deriveQuadriliteralCliticStems(`t${rootStem}`).impfType2,
                perfType1: deriveQuadriliteralCliticStems(`${rootStem}t`).impfType1,
                perfType2: deriveQuadriliteralCliticStems(`${rootStem}t`).impfType2,
            },
        },
        {
            person_mt: "3ms",
            person_en: "he",
            perfect: rootStem,
            imperfect: `j${rootStem}`,
            perfect_neg: rootStem,
            stems: {
                impfType1: deriveQuadriliteralCliticStems(`j${rootStem}`).impfType1,
                impfType2: deriveQuadriliteralCliticStems(`j${rootStem}`).impfType2,
                perfType1: deriveQuadriliteralCliticStems(rootStem).impfType1,
                perfType2: deriveQuadriliteralCliticStems(rootStem).impfType2,
            },
        },
        {
            person_mt: "3fs",
            person_en: "she",
            perfect: perfect3fs,
            imperfect: `t${rootStem}`,
            perfect_neg: `${rootClusterStem}it`,
            stems: {
                impfType1: deriveQuadriliteralCliticStems(`t${rootStem}`).impfType1,
                impfType2: deriveQuadriliteralCliticStems(`t${rootStem}`).impfType2,
                // Derive the clitic stem from the surface form so qartset -> qartsit
                // and għargħret -> għargħrit.
                perfType1: perfect3fs.replace(/et$/, "it"),
                perfType2: perfect3fs.replace(/et$/, "it"),
            },
        },
        {
            person_mt: "1p",
            person_en: "we",
            perfect: `${rootStem}na`,
            imperfect: `n${pluralStem}u`,
            perfect_neg: `${rootStem}na`,
            stems: {
                impfType1: deriveQuadriliteralCliticStems(`n${pluralStem}u`).impfType1,
                impfType2: deriveQuadriliteralCliticStems(`n${pluralStem}u`).impfType2,
                perfType1: deriveQuadriliteralCliticStems(`${rootStem}na`).impfType1,
                perfType2: deriveQuadriliteralCliticStems(`${rootStem}na`).impfType2,
            },
        },
        {
            person_mt: "2p",
            person_en: "you (pl.)",
            perfect: `${rootStem}tu`,
            imperfect: `t${pluralStem}u`,
            perfect_neg: `${rootStem}tu`,
            stems: {
                impfType1: deriveQuadriliteralCliticStems(`t${pluralStem}u`).impfType1,
                impfType2: deriveQuadriliteralCliticStems(`t${pluralStem}u`).impfType2,
                perfType1: deriveQuadriliteralCliticStems(`${rootStem}tu`).impfType1,
                perfType2: deriveQuadriliteralCliticStems(`${rootStem}tu`).impfType2,
            },
        },
        {
            person_mt: "3p",
            person_en: "they",
            perfect: `${pluralStem}u`,
            imperfect: `j${pluralStem}u`,
            perfect_neg: `${pluralStem}u`,
            stems: {
                impfType1: deriveQuadriliteralCliticStems(`j${pluralStem}u`).impfType1,
                impfType2: deriveQuadriliteralCliticStems(`j${pluralStem}u`).impfType2,
                perfType1: deriveQuadriliteralCliticStems(`${pluralStem}u`).impfType1,
                perfType2: deriveQuadriliteralCliticStems(`${pluralStem}u`).impfType2,
            },
        },
    ];

    return {
        rows,
        imperative_sg: rootStem,
        imperative_pl: `${rootClusterStem}u`,
        imperative_sg_stems: {
            impfType1: deriveQuadriliteralCliticStems(rootStem).impfType1,
            impfType2: deriveQuadriliteralCliticStems(rootStem).impfType2,
        },
        imperative_pl_stems: {
            impfType1: deriveQuadriliteralCliticStems(`${rootClusterStem}u`).impfType1,
            impfType2: deriveQuadriliteralCliticStems(`${rootClusterStem}u`).impfType2,
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
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);

    const rootStem = `${C1}${pv1}${C2}${C3}`;
    const perfect = `${rootStem}${pv2}`;
    const imperfect = `j${rootStem}i`;

    const formI: GeneratedVerbForm = {
        form: "I",
        perfect,
        imperfect,
        imperative: `${rootStem}i`,
        passiveParticiple: `m${rootStem}i`,
        activeParticiple: `${rootStem}ej`,
        verbalNoun: `${rootStem}i`,
    };
    return [formI, buildQuadriliteralFormII(formI, "weak-defective")];
}

function deriveQuadriliteralFormII(base: VerbConjugationTable): VerbConjugationTable {
    const rows = base.rows.map((row) => {
        const perfect = deriveQuadriliteralAssimilatedStem(row.perfect);
        const imperfectStem = row.imperfect.startsWith("j")
            ? row.imperfect.slice(1)
            : row.imperfect;
        const imperfect = `ji${deriveQuadriliteralAssimilatedStem(imperfectStem)}`;

        return {
            ...row,
            form: "II" as const,
            perfect,
            imperfect,
            perfect_neg: row.perfect_neg ? deriveQuadriliteralAssimilatedStem(row.perfect_neg) : undefined,
            stems: row.stems
                ? {
                    impfType1: deriveQuadriliteralImperfectStem(row.stems.impfType1),
                    impfType2: deriveQuadriliteralImperfectStem(row.stems.impfType2),
                    perfType1: deriveQuadriliteralAssimilatedStem(row.stems.perfType1),
                    perfType2: deriveQuadriliteralAssimilatedStem(row.stems.perfType2),
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
                impfType1: deriveQuadriliteralImperfectStem(base.imperative_sg_stems.impfType1),
                impfType2: deriveQuadriliteralImperfectStem(base.imperative_sg_stems.impfType2),
            }
            : undefined,
        imperative_pl_stems: base.imperative_pl_stems
            ? {
                impfType1: deriveQuadriliteralImperfectStem(base.imperative_pl_stems.impfType1),
                impfType2: deriveQuadriliteralImperfectStem(base.imperative_pl_stems.impfType2),
            }
            : undefined,
    };
}

type QuadriliteralFormIIMode = "strong" | "weak-defective";

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

    const strength = strengthStr.toLowerCase();
    const weakClass = weakClassStr?.toLowerCase();

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

function matchesAttestedCriteria(
    entry: AttestedEntry,
    criteria: AttestedEntryMatchCriteria,
    includeSurface: boolean,
): boolean {
    if (includeSurface && normalizeMatchKey(entry.word) !== normalizeMatchKey(criteria.surface)) {
        return false;
    }

    if (criteria.form && normalizeMatchKey(entry.form) !== normalizeMatchKey(criteria.form)) {
        return false;
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
        const form = e.verb_morphology?.form || e._formLabel || "";
        if (!form) return;
        const root = getEntryRootKey(e);
        const stem = getEntryStemKey(e);

        // 1. Link the entry itself based on its POS
        if (e.pos === "verb") {
            attested.push({ word: e.headword, id: e.id, form, pos: e.pos, root, stem, type: "lemma" });
        } else if (e.pos === "participle") {
            const pt =
                e.verb_morphology?.participle_type || e.participle_type || "active";
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
        } else if (e.pos === "noun") {
            attested.push({ word: e.headword, id: e.id, form, pos: e.pos, root, stem, type: "noun" });
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
        if (e.verb_morphology?.imperfective_3sg_m) {
            attested.push({
                word: e.verb_morphology.imperfective_3sg_m,
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
                const subForm = sub.verb_morphology?.form || sub._formLabel || form;
                if (sub.pos === "noun") {
                    attested.push({ word: sub.headword, id: sub.id, form: subForm, pos: sub.pos, root: getEntryRootKey(sub) || root, stem: getEntryStemKey(sub) || stem, type: "noun" });
                } else if (sub.pos === "participle") {
                    const pt =
                        sub.verb_morphology?.participle_type ||
                        sub.participle_type ||
                        "active";
                    attested.push({
                        word: sub.headword,
                        id: sub.id,
                        form: subForm,
                        pos: sub.pos,
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
