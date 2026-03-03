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

import type { VerbConjugationTable, ConjugationRow, VerbStrength, WeakClass } from '@/types';

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

export type GenerativeVerbFormType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX' | 'X' | 'Xa' | 'Xb';

export interface GeneratedVerbForm {
    form: GenerativeVerbFormType;
    perfect: string;
    imperfect: string;
    passiveParticiple: string;
    activeParticiple: string;
    verbalNoun: string;
}

function isGuttural(c: string) {
    return ['għ', 'ħ', 'h', 'q', "'"].includes(c);
}

function isPharyngeal(c: string) {
    return ['għ'].includes(c);
}

function hasIorE(v: string) {
    return ['i', 'e'].includes(v);
}

function hasIorEorO(v: string) {
    return ['i', 'e', 'o'].includes(v);
}

// ── Vowel helpers ──────────────────────────────────────────────────────────

function parseVset(vset: string): { v1: string; v2: string } {
    const parts = vset.split('-');
    return { v1: parts[0] ?? 'i', v2: parts[1] ?? '' };
}

/** Derive the imperfect prefix vowel from the vowel set */
function prefixVowel(vset: string): string {
    const { v1 } = parseVset(vset);
    // The prefix vowel is the first character encoded in the V1 theme vowel
    return v1.charAt(0) || 'i';
}

/** Build the imperfect prefix for a given person number + vowel set */
function buildPrefix(person: number, vset: string): string {
    const v = prefixVowel(vset);
    const consonants = ['n', 't', 'j', 't', 'n', 't', 'j'];
    const pfx = consonants[person] ?? 'j';
    return pfx + v;
}

/** 
 * Safely combine a prefix (e.g. "n", "ti-") with a stem, 
 * applying assimilation rules.
 */
function combinePrefix(prefix: string, stem: string): string {
    if (!prefix || !stem) return prefix + stem;
    const pfx = prefix.replace(/[aeiou]+$/, '');
    const hasVowel = /[aeiou]/.test(prefix);

    // Assimilation only happens if the prefix consonant is directly adjacent to stem
    if (!hasVowel && pfx.length === 1) {
        // t- matches ċ, d, s, x, ż, z
        if (pfx === 't' && /^[ċdsxżzt]/.test(stem)) {
            return stem[0] + stem;
        }
        // n- optional matches r, m
        if (pfx === 'n' && /^[rm]/.test(stem)) {
            return `${stem[0]}${stem} / n${stem}`;
        }
    }

    return prefix + stem;
}

/** Parallel to combinePrefix for plural forms (handles slash variants) */
function combinePrefixPlural(prefix: string, stem: string, suffix: string): string {
    const combined = combinePrefix(prefix, stem);
    if (combined.includes(' / ')) {
        return combined.split(' / ').map(f => f + suffix).join(' / ');
    }
    return combined + suffix;
}

// ── Negative perfect vowel shift ───────────────────────────────────────────

/**
 * Handles vowel shifts for suffix attachment (clitics) and negation.
 * - Strong/Assimilative: e -> i (kiteb -> kitib-)
 * - Final-weak: a -> ie (beda -> bdie-)
 * - Pharyngeal exception: a' -> a (laqa' -> laqagħ-)
 */
function applyAttachedShift(vowel: string, C3?: string, isDerived: boolean = false): string {
    if (C3 === 'għ' && vowel === 'a') return 'a'; // exception for CvCv'
    if (vowel === 'a') return isDerived ? 'i' : 'a';
    if (vowel === 'e') return 'i';
    return vowel;
}

function negPerfect3sg(m3: string, f3: string, C3?: string, verbForm?: string): { m: string; f: string } {
    const getShortForm = (offset: number) => {
        if (verbForm === 'III' && offset < 6) return 'e';
        return 'i';
    };

    const shift = (s: string, offset: number) => {
        if (C3 === 'għ' && s.endsWith("'")) return s.replace(/'$/, '');

        // Form III / Hollow shortening: ie-vowel -> e-vowel
        // We handle both v-cons (strong) and v-vowel (defective)
        if (s.includes('ie')) {
            const shortened = s.replace('ie', getShortForm(offset));
            // If it ends in e + cons, it becomes i + cons
            if (/e([^aeiou])$/.test(shortened)) {
                return shortened.replace(/e([^aeiou])$/, 'i$1');
            }
            // If it ends in a vowel (defective), handle terminal shift
            if (shortened.endsWith('a')) {
                return shortened.replace(/a$/, 'ie');
            }
            return s;
        }

        // Generic a -> ie shift for negation
        if (s.endsWith('a')) return s.replace(/a$/, 'ie');

        // Generic e -> i shift for strong/assimilative
        return s.replace(/e([^aeiou])$/, 'i$1');
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
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v2: iv2 } = parseVset(vsetImpf);
    const isGuttural = (c: string) => ['għ', 'ħ', 'q'].includes(c);
    // @ts-ignore
    const _isPharyngeal = (c: string) => ['għ'].includes(c);

    // ── Perfect ──────────────────────────────────────────────────────────
    const perfSyncRoot = `${C1}${pv1}${C2}${C3}`; // kitb-
    const perfRedRoot = `${C1}${C2}${pv1}${C3}`;   // ktib
    const perfFull = `${C1}${pv1}${C2}${pv2}${C3}`; // kiteb
    const perf3f = `${perfSyncRoot}et`;

    const perfRows = [
        perfRedRoot + 't',    // jiena
        perfRedRoot + 't',    // inti
        perfFull,             // huwa
        perf3f,               // hija
        perfRedRoot + 'na',   // aħna
        perfRedRoot + 'tu',   // intom
        perfSyncRoot + 'u',    // huma
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perf3f, C3, verbForm);

    // ── Imperfect ────────────────────────────────────────────────────────

    const isSonorant = (c: string) => ['l', 'm', 'n', 'r'].includes(c);

    // Type 1: Attached (Prefix + C1C2 + assimilated V2 + C3)
    const getImpfT1 = (prefix: string, themeV?: string) => {
        const v = themeV !== undefined ? themeV : (iv2 || '');
        return `${prefix}${C1}${C2}${applyAttachedShift(v, C3)}${C3}`;
    };

    // Type 2: Syncopated / Shifted (Prefix + C1 + (V2 if shifted) + C2 + C3)
    const getImpfT2 = (prefix: string, themeV?: string) => {
        const theme = themeV !== undefined ? themeV : (iv2 || 'i');
        // METATHESIS: If C2 is guttural or sonorant, the vowel moves before C2 to license the cluster.
        // e.g. jifagħlu (C2=għ), jaħarbu (C2=r)
        // We do NOT add a license vowel for C3 here; that's handled by the suffix engine or plurals.
        if (isGuttural(C2) || isSonorant(C2)) {
            return `${prefix}${C1}${theme}${C2}${C3}`;
        }
        // Normal Syncopated: Prefix + C1C2 + C3
        return `${prefix}${C1}${C2}${C3}`;
    };

    const impfForms: string[] = [];
    const stemsList: any[] = [];

    // ── CLITIC ATTACHMENT STEMS ──────────────────────────────────────────
    /**
     * These stems are pre-calculated for the Suffix Engine to allow instant attachment
     * of object pronouns (clitics) without re-running morphological rules.
     * 
     * Types:
     * - impfType1: Attached version. Usually shifts theme vowel (e -> i) to license 
     *              consonant-initial suffixes like -ni, -ha, -hom (e.g. jiktib-).
     * - impfType2: Syncopated version. Drops theme vowel or applies metathesis for 
     *              vowel-initial suffixes like -u, -ok (e.g. jiktb- or jaħarb-).
     * - perfType1: Perfect vowel-shifted stem. e.g., kitbit-
     * - perfType2: Perfect base/syncopated stem. e.g., kitb-
     */
    for (let i = 0; i < 7; i++) {
        const prefix = buildPrefix(i, vsetImpf);
        const t1 = getImpfT1(prefix);
        const t2 = getImpfT2(prefix);

        // Base form uses the original iv2 (e.g. jikteb)
        const base = i >= 4 ? `${t2}u` : `${prefix}${C1}${C2}${iv2}${C3}`;
        impfForms.push(base);

        // perfType1: Attached version (e -> i shift)
        // e.g. kiteb -> kitib, kitbet -> kitbit
        const p1 = perfRows[i].replace(/e([^aeiou])$/, 'i$1');
        stemsList.push({
            impfType1: i >= 4 ? base : t1,
            impfType2: i >= 4 ? base : t2,
            perfType1: p1,
            perfType2: (i === 2) ? perfSyncRoot : perfRows[i], // perfType2 is mostly for huwa syncopation (kiteb -> kitbu)
        });
    }

    // ── Imperative ────────────────────────────────────────────────────────
    const { v1: impV1 } = parseVset(vsetImp);
    const pfx = buildPrefix(1, vsetImpf);
    const impSg = impfForms[1].replace(pfx, impV1);
    const impPl = impfForms[5].replace(pfx, impV1);

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: {
            impfType1: stemsList[1].impfType1.replace(pfx, impV1),
            impfType2: stemsList[1].impfType2.replace(pfx, impV1),
        },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (typeof C3 !== 'undefined' && C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}

// ── ASSIMILATIVE class ─────────────────────────────────────────────────────
// C1 = w or j — present in perfect, drops in imperfect

function genAssimilative(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
    verbForm: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v2: iv2 } = parseVset(vsetImpf);

    // Perfect: C1 present — CvCvC pattern
    const perfFull = `${C1}${pv1}${C2}${pv2}${C3}`; // wiret
    const perfSyncRoot = `${C1}${pv1}${C2}${C3}`; // wirt-
    const perfReduced = `${C1}${C2}${pv1}${C3}`;  // writt, C1 stays, v2 drops

    const perfRows = [
        perfReduced + 't',
        perfReduced + 't',
        perfFull,
        perfSyncRoot + 'et',
        perfReduced + 'na',
        perfReduced + 'tu',
        perfSyncRoot + 'u',
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perfSyncRoot + 'it', C3, verbForm);

    // Imperfect: C1 drops
    // Prefix: j+iv1 (e.g. ji- for wiret, je- for weħel), then C2+iv2+C3
    // Type 1: Attached (Prefix + C1C2 + assimilated V2 + C3)
    const getImpfT1 = (prefix: string, themeV?: string) => {
        const v = themeV !== undefined ? themeV : (iv2 || '');
        return `${prefix}${C2}${applyAttachedShift(v, C3)}${C3}`;
    };

    // Type 2: Syncopated / Shifted (Prefix + C1 + (V2 if shifted) + C2 + C3)
    const getImpfT2 = (prefix: string, _themeV?: string) => `${prefix}${C2}${C3}`;

    const impfForms: string[] = [];
    const stemsList: any[] = [];

    // ── CLITIC ATTACHMENT STEMS ──────────────────────────────────────────
    /**
     * Pre-calculated stems for Assimilative verbs.
     * Note: Assimilative verbs have similar stems to strong, minus the dropped C1.
     */
    for (let i = 0; i < 7; i++) {
        const prefix = buildPrefix(i, vsetImpf);
        const t1 = getImpfT1(prefix);
        const t2 = getImpfT2(prefix);

        // Base form uses the original iv2 (e.g. jiret)
        const base = i >= 4 ? `${t2}u` : `${prefix}${C2}${iv2}${C3}`;
        impfForms.push(base);

        // perfType1: Attached version (e -> i shift)
        // e.g. wiret -> wirit, wirtet -> wirtit
        const p1 = perfRows[i].replace(/e([^aeiou])$/, 'i$1');
        stemsList.push({
            impfType1: i >= 4 ? base : t1,
            impfType2: i >= 4 ? base : t2,
            perfType1: p1,
            perfType2: (i === 2) ? perfSyncRoot : perfRows[i], // perfType2 is mostly for huwa syncopation (kiteb -> kitbu)
        });
    }

    // ── Imperative ────────────────────────────────────────────────────────
    const { v1: impV1 } = parseVset(vsetImp);
    const pfx = buildPrefix(1, vsetImpf);
    const impSg = impfForms[1].replace(pfx, impV1);
    const impPl = impfForms[5].replace(pfx, impV1);

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: {
            impfType1: stemsList[1].impfType1.replace(pfx, impV1),
            impfType2: stemsList[1].impfType2.replace(pfx, impV1),
        },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (typeof C3 !== 'undefined' && C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
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
    const [C1, _C2, C3] = C; // C2 assimilates into long vowel — not used directly
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1 } = parseVset(vsetImpf);

    // Perfect: Full form uses pv2 if available (long vowel), else pv1.
    // e.g. dar/u-a -> pv2='a' is the long vowel for "dar"
    // Reduced form uses pv1.
    // e.g. dar/u-a -> pv1='u' is the reduction for "durt"
    const longV = pv2 || pv1;
    const shortV = pv1;

    const perfFull = `${C1}${longV}${C3}`;   // CvC (long v written as single in std orthography)
    const perf3f = `${C1}${longV}${C3}et`; // e.g. daret
    const perfReduced = `${C1}${shortV}${C3}`; // e.g. dur-

    const perfRows = [
        perfReduced + 't',
        perfReduced + 't',
        perfFull,
        perf3f,
        perfReduced + 'na',
        perfReduced + 'tu',
        perfFull + 'u',
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perf3f, C3, verbForm);

    // Imperfect: jCvvC (prefix + C1 + long vowel + C3)
    // No vowel between prefix and C1!
    const impfBase = (person: number) => {
        const rawPrefix = buildPrefix(person, vsetImpf);
        const pfxCons = rawPrefix.replace(/[aeiou]+$/, '');
        const stem = `${C1}${iv1}${C3}`;
        return combinePrefix(pfxCons, stem);
    };
    const impfPlural = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = `${C1}${iv1}${C3}`;
        return combinePrefixPlural(pfxCons, stem, 'u');
    };

    const impfForms: string[] = [];
    const stemsList: any[] = [];
    // ── CLITIC ATTACHMENT STEMS ──────────────────────────────────────────
    /**
     * Hollow verbs use a stable stem in the imperfect as the long vowel prevents 
     * syncopation. perfType1 handles the e->i shift for 3sg.f (daret -> darit-).
     */
    for (let i = 0; i < 7; i++) {
        const base = i >= 4 ? impfPlural(i) : impfBase(i);
        impfForms.push(base);
        const p1 = perfRows[i].replace(/e([^aeiou])$/, 'i$1');
        stemsList.push({
            impfType1: base,
            impfType2: base,
            perfType1: p1,
            perfType2: p1,
        });
    }

    // ── Imperative ────────────────────────────────────────────────────────
    const { v1: impV1 } = parseVset(vsetImp);
    const pfx = buildPrefix(1, vsetImpf);
    const impSg = impfForms[1].replace(pfx, impV1);
    const impPl = impfForms[5].replace(pfx, impV1);

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        stems: stemsList[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: {
            impfType1: stemsList[1].impfType1.replace(pfx, impV1),
            impfType2: stemsList[1].impfType2.replace(pfx, impV1),
        },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (typeof C3 !== 'undefined' && C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
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
    const [C1, C2, C3] = C; // C3 = C2
    const { v1: pv1 } = parseVset(vsetPerf);
    const { v1: iv1 } = parseVset(vsetImpf);

    // Perfect: C1-v-C2C2  e.g. dell, ħabb
    const perfFull = `${C1}${pv1}${C2}${C2}`;
    const perf3f = `${perfFull}et`;
    const perfReduced = perfFull; // geminate stem unchanged for suffixed persons

    const perfRows = [
        perfReduced + 't',
        perfReduced + 't',
        perfFull,
        perf3f,
        perfReduced + 'na',
        perfReduced + 'tu',
        perfFull + 'u',
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perf3f, C3, verbForm);

    // Imperfect: jC1vC2C2 (no vowel between prefix-cons and C1)
    // e.g. jdell, tħobb
    const impfBase = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = `${C1}${iv1}${C2}${C2}`;
        return combinePrefix(pfxCons, stem);
    };
    // Plural: geminate may reduce/remain — jdellu
    const impfPlural = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = `${C1}${iv1}${C2}${C2}`;
        return combinePrefixPlural(pfxCons, stem, 'u');
    };

    const impfForms: string[] = [];
    const stemsList: any[] = [];
    // ── CLITIC ATTACHMENT STEMS ──────────────────────────────────────────
    /**
     * Geminated stems preserve the double consonant (e.g. jdell / jdellu).
     */
    for (let i = 0; i < 7; i++) {
        const base = i >= 4 ? impfPlural(i) : impfBase(i);
        impfForms.push(base);
        stemsList.push({
            impfType1: base,
            impfType2: base,
            perfType1: perfRows[i],
            perfType2: perfRows[i],
        });
    }

    // ── Imperative ────────────────────────────────────────────────────────
    const { v1: impV1 } = parseVset(vsetImp);
    const pfx = buildPrefix(1, vsetImpf);
    const impSg = impfForms[1].replace(pfx, impV1);
    const impPl = impfForms[5].replace(pfx, impV1);

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: {
            impfType1: stemsList[1].impfType1.replace(pfx, impV1),
            impfType2: stemsList[1].impfType2.replace(pfx, impV1),
        },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (typeof C3 !== 'undefined' && C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}

// ── DEFECTIVE-GĦ class ──────────────────────────────────────────────────
// C3 = għ (perfect: surfaces as trailing -a, imperfect: acts like strong)

function genDefectiveGħ(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v2: iv2 } = parseVset(vsetImpf);

    // ── Perfect ──────────────────────────────────────────────────────────
    const perfFull = `${C1}${pv1}${C2}${pv2}`; // laqa' 
    const perf3 = `${C1}${pv1}${C2}${C3}`;       // laqgħ-
    const perfReduced = `${C1}${C2}${pv1}j`;    // lqaj-

    const perfRows = [
        perfReduced + 't',   // lqajt
        perfReduced + 't',   // lqajt
        perfFull + `'`,           // laqa'
        perf3 + 'et',       // laqgħet
        perfReduced + 'na', // lqajna
        perfReduced + 'tu', // lqajtu
        perf3 + 'u',        // laqgħu
    ];

    // negate helper: "all forms with ' only have it removed"
    const negateFull = (s: string) => `${s.replace(/'$/, '')}`;

    // ── Imperfect ────────────────────────────────────────────────────────
    const impfForms: string[] = [];
    const stemsList: any[] = [];

    for (let i = 0; i < 7; i++) {
        const pfx = buildPrefix(i, vsetImpf);

        // Singular: jilqa' | Plural: jilqgħu
        const base = (i < 4)
            ? `${pfx}${C1}${C2}${iv2}'`
            : `${pfx}${C1}${C2}${C3}u`;

        impfForms.push(base);

        // Clitic Stems
        // impfType1: Attached version (e.g. jilqagħ-ha)
        const it1 = (i < 4)
            ? `${pfx}${C1}${C2}${iv2}${C3}`
            : base;

        // impfType2: Syncopated version (e.g. jilqgħ-ek)
        const it2 = (i < 4)
            ? `${pfx}${C1}${C2}${C3}`
            : base;

        // perfType1: Attached version
        let pt1 = perfRows[i].replace(/e([^aeiou])$/, 'i$1');
        if (i === 2) pt1 = `${C1}${pv1}${C2}${pv2}${C3}`; // laqa' -> laqagħ-ha
        else if (i === 3) pt1 = perf3 + 'it'; // laqgħet -> laqgħit-ha

        // perfType2: Syncopated version (e.g. laqgħ-ek)
        let pt2 = (i === 2) ? `${C1}${pv1}${C2}${C3}` : perfRows[i];

        stemsList.push({
            impfType1: it1,
            impfType2: it2,
            perfType1: pt1,
            perfType2: pt2,
        });
    }

    // ── Imperative ────────────────────────────────────────────────────────
    const { v1: impV1 } = parseVset(vsetImp);
    const pfx2 = buildPrefix(1, vsetImpf);
    const impSg = impfForms[1].replace(pfx2, impV1);
    const impPl = impfForms[5].replace(pfx2, impV1);

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (singular)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (plural)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: negateFull(perfRows[i]),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_neg: negateFull(impSg), // ma ilqax
        imperative_pl_neg: negateFull(impPl), // ma tilqgħux
        imperative_sg_stems: {
            impfType1: stemsList[1].impfType1.replace(pfx2, impV1),
            impfType2: stemsList[1].impfType2.replace(pfx2, impV1),
        },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: true
    };
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
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1 } = parseVset(vsetPerf);
    const { v2: iv2 } = parseVset(vsetImpf);

    const perfFull = `${C1}${pv1}${C2}a`;
    const perf3f = `${C1}${C2}iet`;
    const perfReduced = `${C1}${C2}${pv1}`;

    const perfRows = [
        perfReduced + 'jt',
        perfReduced + 'jt',
        perfFull,
        perf3f,
        perfReduced + 'jna',
        perfReduced + 'jtu',
        perfReduced + 'w',
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perf3f, C3, verbForm);

    const impfBase = (person: number) => {
        const prefix = buildPrefix(person, vsetImpf);
        const themeEnd = iv2 || 'a';
        return `${prefix}${C1}${C2}${themeEnd}`;
    };
    const impfPlural = (person: number) => {
        const prefix = buildPrefix(person, vsetImpf);
        // If theme is i, plural is -ju (e.g. jaħju)
        // If theme is a, plural is -dew (e.g. jibdew)
        const suffix = (iv2 === 'i') ? 'u' : 'ew';
        return `${prefix}${C1}${C2}${suffix}`;
    };

    const impfForms: string[] = [];
    const stemsList: any[] = [];

    for (let i = 0; i < 7; i++) {
        const base = i >= 4 ? impfPlural(i) : impfBase(i);
        impfForms.push(base);
        stemsList.push({
            impfType1: base,
            impfType2: base,
            perfType1: perfRows[i],
            perfType2: perfRows[i],
        });
    }

    // ── Imperative ────────────────────────────────────────────────────────
    const { v1: impV1 } = parseVset(vsetImp);
    const pfx = buildPrefix(1, vsetImpf);
    const impSg = impfForms[1].replace(pfx, impV1);
    const impPl = impfForms[5].replace(pfx, impV1);

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: i === 2 ? `${negM}` : i === 3 ? `${negF}` : perfRows[i],
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: {
            impfType1: stemsList[1].impfType1.replace(pfx, impV1),
            impfType2: stemsList[1].impfType2.replace(pfx, impV1),
        },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (typeof C3 !== 'undefined' && C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}

// ── FORM II STRONG ─────────────────────────────────────────────────────────
// Doubled C2: CvCCvC pattern (e.g. fettaħ / jfettaħ)

function genFormIIStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    // Doubled C2
    const C2D = C2 + C2;

    // Perfect: CvCCvC pattern
    const perfFull = `${C1}${pv1}${C2D}${pv2}${C3}`; // fettaħ
    const perfSyncRoot = `${C1}${pv1}${C2D}${C3}`;   // fettħ-

    const perfRows = [
        perfFull + 't',    // jiena
        perfFull + 't',    // inti
        perfFull,          // huwa
        perfSyncRoot + 'et', // hija
        perfFull + 'na',   // aħna
        perfFull + 'tu',   // intom
        perfSyncRoot + 'u',  // huma
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perfSyncRoot + 'it', C3);

    const impfT1stem = `${C1}${iv1}${C2D}${iv2}${C3}`;
    const impfT2stem = `${C1}${iv1}${C2D}${C3}`;

    // Imperfect: prefix + CvCCvC (j-fettaħ)
    const impfBase = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT1stem;
        return combinePrefix(pfxCons, stem);
    };
    const impfSync = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT2stem;
        return combinePrefix(pfxCons, stem);
    };
    // Plural: prefix + CvCCC + suffix (j-fettħ-u)
    const impfPlural = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT2stem;
        return combinePrefixPlural(pfxCons, stem, 'u');
    };

    const impfForms: string[] = [];
    const stemsList: any[] = [];

    for (let i = 0; i < 7; i++) {
        const ipt1 = i >= 4 ? impfPlural(i) : impfBase(i);
        const ipt2 = i >= 4 ? impfPlural(i) : impfSync(i);

        impfForms.push(ipt1);

        let pt1 = perfRows[i];
        if (i === 3 && perfRows[i].endsWith('et')) {
            pt1 = perfRows[i].slice(0, -2) + 'it';
        }
        let pt2 = i === 2 ? perfSyncRoot : perfRows[i];
        if (i === 3 && perfRows[i].endsWith('et')) {
            pt2 = perfRows[i].slice(0, -2) + 'it';
        }

        stemsList.push({
            // USER: Type 1 (-ek, -u): CvCCC, Type 2 (rest): CvCCvC
            // My engine convention: Type 1 = Attached (Full), Type 2 = Syncopated
            impfType1: ipt1,
            impfType2: ipt2,
            perfType1: pt1,
            perfType2: pt2,
        });
    }

    // Imperative
    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2D}${impV2}${C3}`;
    const impPl = `${C1}${impV1}${C2D}${C3}u`;

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: { impfType1: impSg, impfType2: impSg.replace(/a([^aeiou])$/, '$1') },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}
// ── FORM II Hollow ─────────────────────────────────────────────────────────
// Doubled C2: CvCCvC pattern (e.g. dawwar / jdawwar)

function genFormIIHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    // Doubled C2
    const C2D = C2 + C2;

    // Perfect: CvCCvC pattern
    const perfFull = `${C1}${pv1}${C2D}${pv2}${C3}`; // fettaħ
    const perfSyncRoot = `${C1}${pv1}${C2}${C3}`;   // fettħ-

    const perfRows = [
        perfFull + 't',    // jiena
        perfFull + 't',    // inti
        perfFull,          // huwa
        perfSyncRoot + 'et', // hija
        perfFull + 'na',   // aħna
        perfFull + 'tu',   // intom
        perfSyncRoot + 'u',  // huma
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perfSyncRoot + 'it', C3);

    const impfT1stem = `${C1}${iv1}${C2D}${iv2}${C3}`;
    const impfT2stem = `${C1}${iv1}${C2}${C3}`;

    // Imperfect: prefix + CvCCvC (j-fettaħ)
    const impfBase = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT1stem;
        return combinePrefix(pfxCons, stem);
    };
    const impfSync = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT2stem;
        return combinePrefix(pfxCons, stem);
    };
    // Plural: prefix + CvCCC + suffix (j-fettħ-u)
    const impfPlural = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT2stem;
        return combinePrefixPlural(pfxCons, stem, 'u');
    };

    const impfForms: string[] = [];
    const stemsList: any[] = [];

    for (let i = 0; i < 7; i++) {
        const ipt1 = i >= 4 ? impfPlural(i) : impfBase(i);
        const ipt2 = i >= 4 ? impfPlural(i) : impfSync(i);

        impfForms.push(ipt1);

        let pt1 = perfRows[i];
        if (i === 3 && perfRows[i].endsWith('et')) {
            pt1 = perfRows[i].slice(0, -2) + 'it';
        }
        let pt2 = i === 2 ? perfSyncRoot : perfRows[i];
        if (i === 3 && perfRows[i].endsWith('et')) {
            pt2 = perfRows[i].slice(0, -2) + 'it';
        }

        stemsList.push({
            // USER: Type 1 (-ek, -u): CvCCC, Type 2 (rest): CvCCvC
            // My engine convention: Type 1 = Attached (Full), Type 2 = Syncopated
            impfType1: ipt1,
            impfType2: ipt2,
            perfType1: pt1,
            perfType2: pt2,
        });
    }

    // Imperative
    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2D}${impV2}${C3}`;
    const impPl = `${C1}${impV1}${C2}${C3}u`;

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: { impfType1: impSg, impfType2: impSg.replace(/a([^aeiou])$/, '$1') },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}
// ── FORM II DEFECTIVE ──────────────────────────────────────────────────────
// Defective Form II (e.g. maħħa / jmaħħi)
// C3 is dropped/vocalized.

function genFormIIDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);

    // Doubled C2
    const C2D = C2 + C2;

    // Perfect: CvCCv pattern
    const perfFull = `${C1}${pv1}${C2D}${pv2}`; // maħħa
    const perfSyncRoot = `${C1}${pv1}${C2D}`;   // maħħ-

    const perfRows = [
        perfSyncRoot + 'ejt',    // jiena
        perfSyncRoot + 'ejt',    // inti
        perfFull,          // huwa
        perfSyncRoot + 'iet', // hija
        perfSyncRoot + 'ejna',   // aħna
        perfSyncRoot + 'ejtu',   // intom
        perfSyncRoot + 'u',  // huma
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perfSyncRoot + 'it', C3);
    // If theme is i, plural is -u (e.g. jmaħħu)
    // If theme is a, plural is -ew (e.g. jmaħħew)
    const suffix = (iv2 === 'i') ? 'u' : 'ew';

    // Imperfect: prefix + CvCCvC (j-fettaħ)
    const impfFull = (pfxCons: string) => `${pfxCons}${C1}${iv1}${C2D}${iv2}`; // j-maħħ-i
    const impfSync = (pfxCons: string) => `${pfxCons}${C1}${iv1}${C2D}${suffix}`; // j-maħħ-u

    const impfForms: string[] = [];
    const stemsList: any[] = [];
    const pfxs = ['n', 't', 'j', 't', 'n', 't', 'j'];

    for (let i = 0; i < 7; i++) {
        const pfx = pfxs[i];
        const base = i >= 4 ? `${impfSync(pfx)}` : impfFull(pfx);
        impfForms.push(base);

        let pt1 = perfRows[i];
        if (i === 3 && perfRows[i].endsWith('iet')) {
            pt1 = perfRows[i].slice(0, -3) + 'it';
        }
        let pt2 = i === 2 ? perfSyncRoot : perfRows[i];
        if (i === 3 && perfRows[i].endsWith('iet')) {
            pt2 = perfRows[i].slice(0, -3) + 'it';
        }

        stemsList.push({
            // USER: Type 1 (-ek, -u): CvCCC, Type 2 (rest): CvCCvC
            // My engine convention: Type 1 = Attached (Full), Type 2 = Syncopated
            impfType1: impfSync(pfx),
            impfType2: impfFull(pfx),
            perfType1: pt1,
            perfType2: pt2,
        });
    }

    // Imperative
    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2D}${impV2}`;
    const impPl = `${C1}${impV1}${C2D}${suffix}`;

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: { impfType1: impSg, impfType2: impSg.replace(/a([^aeiou])$/, '$1') },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}

// ── FORM III STRONG ─────────────────────────────────────────────────────────
// Long vowel pattern: CieCvC (e.g. bierek / jbierek)
export function genFormIIIStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const ImalaBlockedVowel = (pv1 === 'ie') ? 'e' : 'a';

    // Perfect: CieCvC
    const perfBase = `${C1}${pv1}${C2}${pv2}${C3}`;
    const perfSync = `${C1}${pv1}${C2}${C3}`; // bierek -> bierk-et
    const perfImalaBlocked = `${C1}${ImalaBlockedVowel}${C2}i${C3}`; // bierek -> berik-t

    const perfRows = [
        perfImalaBlocked + 't',   // jiena
        perfImalaBlocked + 't',   // inti
        perfBase,         // huwa
        perfSync + 'et',  // hija
        perfImalaBlocked + 'na',  // aħna
        perfImalaBlocked + 'tu',  // intom
        perfSync + 'u',   // huma
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfBase, `${perfSync}et`, C3);

    // Imperfect: prefix + CieCvC
    const iv2Shifted = applyAttachedShift(iv2, C3, true);
    const impfT1V1 = (iv1 === 'ie') ? 'e' : iv1;
    const impfT1stem = `${C1}${impfT1V1}${C2}${iv2Shifted}${C3}`; // -berik
    const impfT2stem = `${C1}${iv1}${C2}${C3}`; // -bierk-

    const impfBase = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = `${C1}${iv1}${C2}${iv2}${C3}`; // -bierek
        return combinePrefix(pfxCons, stem);
    };
    // Syncopated: prefix + CieCC (j-berk-)
    const impfSync = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT2stem;
        return combinePrefix(pfxCons, stem);
    };
    // Plural: prefix + CieCC + suffix (j-bierk-u)
    const impfPlural = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT2stem;
        return combinePrefixPlural(pfxCons, stem, 'u');
    };

    const impfForms: string[] = [];
    const stemsList: any[] = [];

    for (let i = 0; i < 7; i++) {
        const pfxStr = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, '');
        const ipt1 = i >= 4 ? impfPlural(i) : combinePrefix(pfxStr, impfT1stem);
        const ipt2 = i >= 4 ? impfPlural(i) : impfSync(i);

        impfForms.push(i >= 4 ? ipt1 : impfBase(i));

        let pt1 = perfRows[i];
        if (i === 2) {
            pt1 = perfRows[i].replace(/e([^aeiou])$/, 'i$1').replace(/a$/, 'i');
        } else if (i === 3 && perfRows[i].endsWith('et')) {
            pt1 = perfRows[i].slice(0, -2) + 'it';
        }
        let pt2 = i === 2 ? perfSync : perfRows[i];
        if (i === 3 && perfRows[i].endsWith('et')) {
            pt2 = perfRows[i].slice(0, -2) + 'it';
        }

        stemsList.push({
            impfType1: ipt1.replace('ie', 'e'),
            impfType2: ipt2,
            perfType1: pt1.replace('ie', 'e'),
            perfType2: pt2,
        });
    }

    // Imperative
    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2}${impV2}${C3}`;
    const impPl = `${C1}${impV1}${C2}${C3}u`;

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: {
            impfType1: `${C1}${impV1 === 'ie' ? 'e' : impV1}${C2}${applyAttachedShift(impV2, C3, true)}${C3}`,
            impfType2: `${C1}${impV1}${C2}${C3}`,
        },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}
// ── FORM III Defective ─────────────────────────────────────────────────────────
// Long vowel pattern: CieCvC (e.g. bieda / jbiedi)
export function genFormIIIDefective(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v1: iv1, v2: iv2 } = parseVset(vsetImpf);
    const ImalaBlockedVowel = (pv1 === 'ie') ? 'e' : 'a';
    const suffixPV2assimilation = (pv2 === 'a') ? 'ew' : 'u';
    const suffixIV2assimilation = (iv2 === 'i') ? 'u' : 'ew';

    // Perfect: CieCv
    const perfBase = `${C1}${pv1}${C2}${pv2}`; // bieda
    const perfSync = `${C1}${pv1}${C2}`; // bieda -> bied-u
    const perfImalaBlocked = `${C1}${ImalaBlockedVowel}${C2}`; // bieda -> bed-et

    const perfRows = [
        perfImalaBlocked + 'ejt',   // jiena
        perfImalaBlocked + 'ejt',   // inti
        perfBase,         // huwa
        perfImalaBlocked + 'iet',  // hija
        perfImalaBlocked + 'ejna',  // aħna
        perfImalaBlocked + 'ejtu',  // intom
        perfImalaBlocked + suffixPV2assimilation,   // huma
    ];

    const { m: negM, f: negF } = negPerfect3sg(perfBase, `${perfSync}et`, C3);

    // Imperfect: prefix + CieCv
    const iv2Shifted = applyAttachedShift(iv2, C3, true);
    const impfT1V1 = (iv1 === 'ie') ? 'e' : iv1;
    const impfT1stem = `${C1}${impfT1V1}${C2}${iv2Shifted}`; // -bedi
    const impfT2stem = `${C1}${iv1}${C2}`; // -bied-

    const impfBase = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = `${C1}${iv1}${C2}${iv2}`; // -biedi
        return combinePrefix(pfxCons, stem);
    };
    // Syncopated: prefix + CieCC (j-bied-)
    const impfSync = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT2stem;
        return combinePrefix(pfxCons, stem);
    };
    // Plural: prefix + CieCC + suffix (j-bied-u)
    const impfPlural = (person: number) => {
        const pfxCons = buildPrefix(person, vsetImpf).replace(/[aeiou]+$/, '');
        const stem = impfT2stem;
        return combinePrefixPlural(pfxCons, stem, suffixIV2assimilation);
    };

    const impfForms: string[] = [];
    const stemsList: any[] = [];

    for (let i = 0; i < 7; i++) {
        const pfxStr = buildPrefix(i, vsetImpf).replace(/[aeiou]+$/, '');
        const ipt1 = i >= 4 ? impfPlural(i) : combinePrefix(pfxStr, impfT1stem);
        const ipt2 = i >= 4 ? impfPlural(i) : impfSync(i);

        impfForms.push(i >= 4 ? ipt1 : impfBase(i));

        let pt1 = perfRows[i];
        if (i === 2) {
            pt1 = perfRows[i].replace(/e([^aeiou])$/, 'i$1').replace(/a$/, 'i');
        } else if (i === 3 && perfRows[i].endsWith('iet')) {
            pt1 = perfRows[i].slice(0, -3) + 'it';
        }
        let pt2 = i === 2 ? perfSync : perfRows[i];
        if (i === 3 && perfRows[i].endsWith('iet')) {
            pt2 = perfRows[i].slice(0, -3) + 'it';
        }

        stemsList.push({
            impfType1: ipt1.replace('ie', 'e'),
            impfType2: ipt2,
            perfType1: pt1.replace('ie', 'e'),
            perfType2: pt2,
        });
    }

    // Imperative
    const { v1: impV1, v2: impV2 } = parseVset(vsetImp);
    const impSg = `${C1}${impV1}${C2}${impV2}`;
    const impPl = `${C1}${impV1}${C2}u`;

    const persons = [
        { mt: 'jiena', en: 'I' },
        { mt: 'inti', en: 'you (sg.)' },
        { mt: 'huwa', en: 'he' },
        { mt: 'hija', en: 'she' },
        { mt: 'aħna', en: 'we' },
        { mt: 'intom', en: 'you (pl.)' },
        { mt: 'huma', en: 'they' },
    ];

    const rows: ConjugationRow[] = persons.map((p, i) => ({
        person_mt: p.mt,
        person_en: p.en,
        imperfect: impfForms[i],
        perfect: perfRows[i],
        perfect_neg: (i === 2) ? negM : (i === 3) ? negF : perfRows[i].replace('ie', 'e'),
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: {
            impfType1: `${C1}${impV1 === 'ie' ? 'e' : impV1}${C2}${applyAttachedShift(impV2, C3, true)}`,
            impfType2: `${C1}${impV1}${C2}`,
        },
        imperative_pl_stems: { impfType1: impPl.replace('ie', 'e'), impfType2: impPl },
        blocksImala: (C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}
// ── Main entry point ───────────────────────────────────────────────────────

/**
 * Generate the full conjugation table for a Form I Maltese verb.
 * Returns a VerbConjugationTable that can be used directly in the UI.
 *
 * For verbs with manually stored conjugation data, prefer using that directly.
 */
export function generateConjugation(input: ConjugationInput): VerbConjugationTable {
    const consonants = input.root.split('-').filter(Boolean);
    const { form, strength, weakClass } = input;

    if (form === 'I') {
        if (strength === 'geminated') {
            return genGeminated(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative, form);
        }
        if (strength === 'strong') {
            return genStrong(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative, form);
        }
        if (strength === 'strong-hybrid') {
            return genDefectiveGħ(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        }
        if (strength === 'weak') {
            switch (weakClass) {
                case 'assimilative':
                    return genAssimilative(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative, form);
                case 'hollow':
                    return genHollow(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative, form);
                case 'defective':
                    return genDefective(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative, form);
                default:
                    throw new Error(`Unknown weak classification for Form I: ${weakClass}`);
            }
        }
    }

    if (form === 'II') {
        if (strength === 'strong') {
            return genFormIIStrong(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        }
        if (strength === 'weak') {
            if (weakClass === 'assimilative') {
                return genFormIIStrong(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
            }
            if (weakClass === 'hollow') {
                return genFormIIHollow(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
            }
            if (weakClass === 'defective') {
                return genFormIIDefective(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
            }
        }
    }

    if (form === 'III') {
        if (strength === 'strong') {
            return genFormIIIStrong(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        }
        if (strength === 'weak') {
            if (weakClass === 'assimilative') {
                return genFormIIIStrong(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
            }
            if (weakClass === 'hollow') {
                return genFormIIIStrong(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
            }
            if (weakClass === 'defective') {
                return genFormIIIDefective(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
            }
        }
    }

    throw new Error(`Unsupported verb configuration: Form ${form}, Strength ${strength}, WeakClass ${weakClass}`);
}

// ── Root Form Generation Engine ────────────────────────────────────────────

// Triliteral Strong (from rootGenerator.ts)
function generateTriliteralStrong(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const f1_perf = `${C1}${pv1}${C2}${pv2}${C3}`;
    const f1_impf = `j${ipv1}${C1}${C2}${ipv2}${C3}`;
    const p1 = isGuttural(C1) ? 'a' : 'i';
    const f1_pass = `m${p1}${C1}${C2}u${C3}`;
    const a1 = hasIorE(pv1) ? 'ie' : 'a';
    const a2 = isGuttural(C3) ? 'a' : 'e';
    const f1_act = `${C1}${a1}${C2}${a2}${C3}`;
    const f1_vn = isPharyngeal(C1) ? `${C1}a${C2}i${C3}` : `${C1}${C2}i${C3}`;

    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const f2_impf = `j${f2_perf}`;
    const f2_pass = `m${f2_perf}`;
    const b1 = hasIorEorO(pv1) ? 'ie' : 'a';
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}${C3}`;
    const b2 = isGuttural(C1) || (pv1 === 'a' && pv2 === 'a') ? 'a' : 'i';
    const f2_vn = `t${b2}${C1}${C2}i${C3}`;

    forms.push({ form: 'II', perfect: f2_perf, imperfect: f2_impf, passiveParticiple: f2_pass, activeParticiple: f2_act, verbalNoun: f2_vn });

    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    const f3_impf = `j${f3_perf}`;
    const f3_pass = `m${f3_perf}`;

    forms.push({ form: 'III', perfect: f3_perf, imperfect: f3_impf, passiveParticiple: f3_pass, activeParticiple: '-', verbalNoun: '-' });

    const f4_perf = `${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f4_impf = `j${ipv1}${C1}${C2}${ipv2}${C3}`;
    const f4_act = `mi${C1}${C2}e${C3}`;
    const d1 = (pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie';
    const f4_vn = isPharyngeal(C1) ? `e${C1}${C2}${d1}${C3}` : `(i)${C1}${C2}${d1}${C3}`;

    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${f2_perf}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}` });

    const f6_perf = `t${f3_perf}`;
    const e1 = hasIorE(pv1) ? 'ie' : 'a';
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}` });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}${C3}`;
    const f8_perfPharyngeal = `e${C1}t${pv1}${C2}${pv2}${C3}`;
    forms.push({ form: 'VIII', perfect: isPharyngeal(C1) ? f8_perfPharyngeal : f8_perf, imperfect: isGuttural(C1) ? `je${f8_perf}` : `ji${f8_perf}`, passiveParticiple: isGuttural(C1) ? `me${f8_perf}` : `mi${f8_perf}`, activeParticiple: '-', verbalNoun: isGuttural(C1) ? `e${C1}t${pv1}${C2}i${C3}` : `${C1}t${pv1}${C2}i${C3}` });

    const f9_perf = `${C1}${C2}${c1}${C3}`;
    const f9_perfPharyngeal = `${C1}e${C2}${c1}${C3}`;
    forms.push({ form: 'IX', perfect: isPharyngeal(C1) ? f9_perfPharyngeal : f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: isPharyngeal(C1) ? f9_perfPharyngeal : f9_perf });

    const f10a_perf = `st${pv1}${C1}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}i${C3}` });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}` });

    return forms;
}

function generateTriliteralGeminated(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, _ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const f1_perf = `${C1}${pv1}${C2}${C3}`;
    const f1_impf = `j${C1}${ipv1}${C2}${C3}`;
    const g1 = isGuttural(C1) ? 'a' : 'i';
    const f1_pass = `m${g1}${C1}${C2}u${C3}`;
    const a1 = hasIorE(pv1) ? 'ie' : 'a';
    const a2 = isGuttural(C3) ? 'a' : 'e';
    const f1_act = `${C1}${a1}${C2}${a2}${C3}`;
    const f1_vn = isGuttural(C1) ? `${C1}e${pv1}${C2}${C3}` : `${C1}${pv1}${C2}${C3}`;
    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const f2_impf = `j${f2_perf}`;
    const f2_pass = `m${f2_perf}`;
    const b1 = hasIorEorO(pv1) ? 'ie' : 'a';
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}${C3}`;
    const b2 = isGuttural(C1) || (pv1 === 'a' && pv2 === 'a') ? 'a' : 'i';
    const f2_vn = `t${b2}${C1}${C2}i${C3}`;
    forms.push({ form: 'II', perfect: f2_perf, imperfect: f2_impf, passiveParticiple: f2_pass, activeParticiple: f2_act, verbalNoun: f2_vn });

    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    forms.push({ form: 'III', perfect: f3_perf, imperfect: `j${f3_perf}`, passiveParticiple: `m${f3_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f4_perf = `a${C1}a${C2}${C3}`;
    const f4_impf = `j${C1}${ipv1}${C2}${C3}`;
    const f4_act = `mi${C1}${pv2}${C2}${C3}`;
    const d1 = (pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie';
    const f4_vn = `i${C1}${C2}${d1}${C3}`;
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${f2_perf}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}` });

    const f6_perf = `t${f3_perf}`;
    const e1 = ['i', 'e'].includes(pv1) ? 'ie' : 'a';
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}` });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f8_perf = `${C1}t${pv1}${C2}${C3}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `${C1}t${pv1}${C2}i${C3}` });

    const f9_perf = `${C1}${C2}${c1}${C3}`;
    forms.push({ form: 'IX', perfect: f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: f9_perf });

    const f10a_perf = `st${C1}${pv1}${C2}${C3}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}i${C3}` });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}` });

    return forms;
}

function generateTriliteralAssimilative(C1: string, C2: string, _C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const f1_perf = `${C1}${pv1}${C2}${pv2}`; // beda
    const f1_impf = `j${ipv1}${C1}${C2}${ipv2}`; // jibda
    const f1_pass = `m${ipv1}${C1}${C2}${ipv2}`; // mibda
    const a1 = hasIorE(pv1) ? 'ie' : 'a';
    const f1_act = `${C1}${a1}${C2}i`; // biedi
    const f1_vn = `${C1}i${C2}i`; // bidi
    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}`;
    const f2_impf = `j${C1}${pv1}${C2}${C2}i`;
    const f2_pass = `m${C1}${pv1}${C2}${C2}i`;
    const b1 = isGuttural(C2) ? 'a' : 'e';
    const f2_act = `${C1}${pv1}${C2}${C2}${b1}j`; // beddej
    const vnv1 = isGuttural(C1) ? 'a' : 'i';
    const f2_vn = `t${vnv1}${C1}${C2}ija`; // tibdija
    forms.push({ form: 'II', perfect: f2_perf, imperfect: f2_impf, passiveParticiple: f2_pass, activeParticiple: f2_act, verbalNoun: f2_vn });

    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3 = `${C1}${c1}${C2}`;
    forms.push({ form: 'III', perfect: f3 + pv2, imperfect: `j${f3}i`, passiveParticiple: `m${f3}i`, activeParticiple: '-', verbalNoun: '-' });

    const f4_perf = `i${C1}${C2}${ipv2}`;
    const f4_impf = `j${ipv1}${C1}${C2}${ipv2}`;
    const f4_act = `mi${C1}${C2}${ipv2}`;
    const h1 = C1 === 'w' ? 'u' : 'i';
    const h2 = (pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie';
    const f4_vn = `${h1}${C1}${C2}${h2}ja`;
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${f2_perf}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}ija` });

    const f6_perf = `t${f3}${pv2}`;
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${f3}ija` });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `${C1}t${pv1}${C2}ija` });

    const f9_perf = `${C1}${C2}${c1}`;
    forms.push({ form: 'IX', perfect: f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: f9_perf });

    const f10a_perf = `st${pv1}${C1}${C2}${pv2}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}ija` });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}ija` });

    return forms;
}

function generateTriliteralHollow(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const a1 = hasIorEorO(pv1) ? 'ie' : 'a';
    const f1_perf = `${C1}${a1}${C3}`;
    const f1_impf = `j${C1}${ipv1}${C3}`;
    const i1 = isGuttural(C1) ? 'a' : 'i';
    const f1_pass = `m${i1}${C1}u${C3}`;
    const i2 = hasIorE(pv1) ? 'e' : 'a';
    const f1_act = `${C1}${i2}jje${C3}`;
    const f1_vn = isGuttural(C1) ? `${C1}e${pv1}${C2}${C3}` : `${C1}${pv1}${C2}${C3}`;
    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    const b1 = hasIorEorO(pv1) ? 'ie' : 'a';
    const b2 = isGuttural(C1) || (pv1 === 'a' && pv2 === 'a') ? 'a' : 'i';
    forms.push({ form: 'II', perfect: f2_perf, imperfect: `j${f2_perf}`, passiveParticiple: `m${f2_perf}`, activeParticiple: `${C1}${pv1}${C2}${C2}${b1}${C3}`, verbalNoun: `t${b2}${C1}${C2}i${C3}` });

    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}${C3}`;
    forms.push({ form: 'III', perfect: f3_perf, imperfect: `j${f3_perf}`, passiveParticiple: `m${f3_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f4_perf = `${pv1}${C1}${C2}${pv2}${C3}`;
    const f4_impf = `jo${C1}o${C3}`;
    const f4_act = `mi${C1}i${C3}`;
    const f4_vn = `i${C1}${(pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie'}${C3}`;
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${f2_perf}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}` });

    const f6_perf = `t${f3_perf}`;
    const e1 = ['i', 'e'].includes(pv1) ? 'e' : 'a';
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}` });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f8_perf = `n${C1}t${a1}${C3}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `n${C1}t${a1}${C3}` });

    const f9_perf = `${C1}${C2}${a1}${C3}`;
    forms.push({ form: 'IX', perfect: f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: f9_perf });

    const f10a_perf = `st${pv1}${C1}${a1}${C3}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}${a1}${C3}` });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}${C3}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}` });

    return forms;
}

function generateTriliteralDefective(C1: string, C2: string, C3: string, pv1: string, pv2: string, ipv1: string, ipv2: string): GeneratedVerbForm[] {
    const forms: GeneratedVerbForm[] = [];

    const f1_perf = `${C1}${pv1}${C2}${pv2}`;
    const f1_impf = `j${ipv1}${C1}${C2}${ipv2}`;
    const f1_pass = `m${ipv1}${C1}${C2}i`;
    const f1_act = `${C1}${hasIorE(pv1) ? 'ie' : 'a'}${C2}i`;
    const f1_vn = `${C1}${pv1}${C2}u`;
    forms.push({ form: 'I', perfect: f1_perf, imperfect: f1_impf, passiveParticiple: f1_pass, activeParticiple: f1_act, verbalNoun: f1_vn });

    const f2_perf = `${C1}${pv1}${C2}${C2}${pv2}`;
    const f2_impf = `j${C1}${ipv1}${C2}${C2}${ipv2}`;
    const f2_pass = `m${C1}${ipv1}${C2}${C2}${ipv2}`;
    const f2_act = `${C1}${pv1}${C2}${C2}ej`;
    const b2 = isGuttural(C1) || (pv1 === 'a' && pv2 === 'a') ? 'a' : 'i';
    const f2_vn = `t${b2}${C1}${C2}ija`;
    forms.push({ form: 'II', perfect: f2_perf, imperfect: f2_impf, passiveParticiple: f2_pass, activeParticiple: f2_act, verbalNoun: f2_vn });

    const c1 = hasIorE(pv1) ? 'ie' : 'a';
    const f3_perf = `${C1}${c1}${C2}${pv2}`;
    const f3_impf = `j${C1}${c1}${C2}${pv2}`;
    const f3_pass = `m${C1}${c1}${C2}i`;
    forms.push({ form: 'III', perfect: f3_perf, imperfect: f3_impf, passiveParticiple: f3_pass, activeParticiple: '-', verbalNoun: '-' });

    const f4_perf = `${ipv1}${C1}${C2}${ipv2}`;
    const f4_impf = `jo${C1}${C2}i`;
    const f4_act = `mo${C1}${C2}i`;
    const h2 = (pv1 === 'a' && pv2 === 'a') ? 'a' : 'ie';
    const f4_vn = `(i)${C1}${C2}${h2}ja`;
    forms.push({ form: 'IV', perfect: f4_perf, imperfect: f4_impf, passiveParticiple: '-', activeParticiple: f4_act, verbalNoun: f4_vn });

    const f5_perf = `t${C1}${pv1}${C2}${C2}${pv2}`;
    forms.push({ form: 'V', perfect: f5_perf, imperfect: `ji${f5_perf}`, passiveParticiple: `mi${f5_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${pv1}${C2}${C2}i${C3}a`.replace(/undefined/g, '') });

    const f6_perf = `t${f3_perf}`;
    const e1 = ['i', 'e'].includes(pv1) ? 'e' : 'a';
    forms.push({ form: 'VI', perfect: f6_perf, imperfect: `ji${f6_perf}`, passiveParticiple: `mi${f6_perf}`, activeParticiple: '-', verbalNoun: `t${C1}${e1}${C2}i${C3}a`.replace(/undefined/g, '') });

    const f7_perf = `n${f1_perf}`;
    forms.push({ form: 'VII', perfect: f7_perf, imperfect: `ji${f7_perf}`, passiveParticiple: `mi${f7_perf}`, activeParticiple: '-', verbalNoun: '-' });

    const f8_perf = `${C1}t${pv1}${C2}${pv2}`;
    forms.push({ form: 'VIII', perfect: f8_perf, imperfect: `ji${f8_perf}`, passiveParticiple: `mi${f8_perf}`, activeParticiple: '-', verbalNoun: `${C1}t${pv1}${C2}${pv2}` });

    const f9_perf = `${C1}${C2}${c1}`;
    forms.push({ form: 'IX', perfect: f9_perf, imperfect: `ji${f9_perf}`, passiveParticiple: `mu${f9_perf}`, activeParticiple: '-', verbalNoun: f9_perf });

    const f10a_perf = `st${pv1}${C1}${C2}${pv2}`;
    forms.push({ form: 'Xa', perfect: f10a_perf, imperfect: `ji${f10a_perf}`, passiveParticiple: `mi${f10a_perf}`, activeParticiple: '-', verbalNoun: `st${pv1}${C1}${C2}ija` });

    const f10b_perf = `st${C1}${pv1}${C2}${C2}${pv2}`;
    forms.push({ form: 'Xb', perfect: f10b_perf, imperfect: `ji${f10b_perf}`, passiveParticiple: `mi${f10b_perf}`, activeParticiple: '-', verbalNoun: `st${C1}${pv1}${C2}${C2}i${C3}a`.replace(/undefined/g, '') });

    return forms;
}

export function generateRootForms(
    consonants: string,
    pvSet: string,
    ipvSet: string,
    strength: VerbStrength = 'strong',
    weakClass?: WeakClass
): GeneratedVerbForm[] {
    const arr = consonants.includes('-') ? consonants.split('-') : consonants.split('');
    const C1 = arr[0] || '';
    const C2 = arr[1] || '';
    const C3 = arr[2] || '';
    const [pv1 = 'a', pv2 = 'a'] = pvSet.split('-');
    const [ipv1 = 'i', ipv2 = 'a'] = ipvSet.split('-');

    if (strength === 'weak' && weakClass === 'defective') {
        return generateTriliteralDefective(C1, C2, C3, pv1, pv2, ipv1, ipv2);
    }
    if (strength === 'weak' && weakClass === 'hollow') {
        return generateTriliteralHollow(C1, C2, C3, pv1, pv2, ipv1, ipv2);
    }
    if (strength === 'weak' && weakClass === 'assimilative') {
        return generateTriliteralAssimilative(C1, C2, C3, pv1, pv2, ipv1, ipv2);
    }
    if (strength === 'geminated') {
        return generateTriliteralGeminated(C1, C2, C3, pv1, pv2, ipv1, ipv2);
    }
    return generateTriliteralStrong(C1, C2, C3, pv1, pv2, ipv1, ipv2);
}

export type FormMarker = 'plain' | 'theoretical' | 'auto_generated';

export interface MarkedVerbForm {
    form: GenerativeVerbFormType;
    perfect: { value: string; marker: FormMarker; entryId?: string };
    imperfect: { value: string; marker: FormMarker; entryId?: string };
    passiveParticiple: { value: string; marker: FormMarker; entryId?: string };
    activeParticiple: { value: string; marker: FormMarker; entryId?: string };
    verbalNoun: { value: string; marker: FormMarker; entryId?: string };
}

export interface AttestedEntry {
    word: string;
    id?: string;
    form: string;
    type: 'lemma' | 'passive' | 'active' | 'noun';
}

export function markGeneratedForms(
    generated: GeneratedVerbForm[],
    attested: AttestedEntry[]
): MarkedVerbForm[] {
    const attestedRows = new Set<GenerativeVerbFormType>();

    // First pass to find what is attested
    const attestedG = generated.map(g => {
        const isLemmaAttested = attested.some(a => a.word === g.perfect && a.form === g.form && a.type === 'lemma');
        const isPassiveAttested = attested.some(a => a.word === g.passiveParticiple && a.form === g.form && a.type === 'passive');
        const isActiveAttested = attested.some(a => a.word === g.activeParticiple && a.form === g.form && a.type === 'active');
        const isVNAttested = attested.some(a => a.word === g.verbalNoun && a.form === g.form && a.type === 'noun');

        const anyAttested = isLemmaAttested || isPassiveAttested || isActiveAttested || isVNAttested;
        if (anyAttested) attestedRows.add(g.form);
        return { form: g.form, isLemmaAttested, isPassiveAttested, isActiveAttested, isVNAttested, anyAttested };
    });

    const reconstructableForms = new Set<GenerativeVerbFormType>();

    // Dependency Logic:
    // If F1 exists -> F7 is probably reconstructable
    if (attestedRows.has('I')) reconstructableForms.add('VII');
    // If F2 exists -> F5
    if (attestedRows.has('II')) reconstructableForms.add('V');
    // If F3 exists -> F6
    if (attestedRows.has('III')) reconstructableForms.add('VI');

    // F8 -> F1
    if (attestedRows.has('VIII')) reconstructableForms.add('I');

    // NOTE: IV, IX, Xa, Xb are independent as requested.

    return generated.map((g) => {
        const ag = attestedG.find(x => x.form === g.form)!;

        // Row is theoretical if:
        // 1. Any part of the row is attested
        // 2. OR this form is reconstructable from another attested form
        let rowTheoretical = false;
        if (ag.anyAttested) rowTheoretical = true;
        if (!ag.anyAttested && reconstructableForms.has(g.form)) rowTheoretical = true;

        const applyMarker = (
            generatedVal: string,
            formType: 'lemma' | 'passive' | 'active' | 'noun',
            isImperfect: boolean = false
        ): { value: string; marker: FormMarker; entryId?: string } => {
            if (generatedVal === '-') return { value: generatedVal, marker: 'plain' };

            // The imperfect will always exist if the lemma exists.
            // We use the generated value for the imperfect column, but still want to link it to the lemma entry if it exists.
            if (isImperfect && ag.isLemmaAttested) {
                const lemmaAtt = attested.find(a => a.form === g.form && a.type === 'lemma');
                return { value: generatedVal, marker: 'plain', entryId: lemmaAtt?.id };
            }

            // Find the actual attested entry for this form and type
            const att = attested.find(a => a.form === g.form && a.type === formType);

            // If we have an exact match OR a form match, mark as plain and use the attested word/ID
            if (att) {
                return { value: att.word, marker: 'plain', entryId: att.id };
            }

            if (rowTheoretical) return { value: generatedVal, marker: 'theoretical' };
            return { value: generatedVal, marker: 'auto_generated' };
        };

        return {
            form: g.form,
            perfect: applyMarker(g.perfect, 'lemma'),
            imperfect: applyMarker(g.imperfect, 'lemma', true), // Uses same ID as lemma
            passiveParticiple: applyMarker(g.passiveParticiple, 'passive'),
            activeParticiple: applyMarker(g.activeParticiple, 'active'),
            verbalNoun: applyMarker(g.verbalNoun, 'noun'),
        };
    });
}
