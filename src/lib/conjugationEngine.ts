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
 *    - Used for vowel-initial suffixes (e.g., -u, -ok).
 *    - Logic: Drops the theme vowel (syncopation) to avoid vowel clusters,
 *      or shifts it (metathesis) before C2 if C2 is a liquid/guttural
 *      (e.g., jikteb -> jiktb-u vs jaħrab -> jaħarb-u).
 */

import type { VerbConjugationTable, ConjugationRow } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

export type VerbClass =
    | 'strong'
    | 'assimilative'
    | 'defective-għ'
    | 'defective-j/w'
    | 'defective-gem'
    | 'hollow'
    | 'geminated'
    | 'form-ii-strong'
    | 'form-ii-defective'
    | 'form-ii-hollow';

export interface ConjugationInput {
    /** Hyphen-separated root consonants, e.g. "k-t-b" */
    root: string;
    verbClass: VerbClass;
    /** Vowel set for the perfect tense, e.g. "i-e" */
    vowelSetPerfect: string;
    /** Vowel set for the imperfect tense, e.g. "i-e" */
    vowelSetImperfect: string;
    /** Vowel set for the imperative, e.g. "i-e" */
    vowelSetImperative: string;
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
function applyAttachedShift(vowel: string, C3?: string): string {
    if (C3 === 'għ' && vowel === 'a') return 'a'; // exception for CvCv'
    if (vowel === 'a') return 'ie';
    if (vowel === 'e') return 'i';
    return vowel;
}

function negPerfect3sg(m3: string, f3: string, C3?: string): { m: string; f: string } {
    const shift = (s: string) => {
        if (C3 === 'għ' && s.endsWith("'")) return s.replace(/'$/, '');
        // handle a -> ie
        if (s.endsWith('a')) return s.replace(/a$/, 'ie');
        // handle e -> i (Strong/Assimilative)
        return s.replace(/e([^aeiou])$/, 'i$1');
    };
    return { m: shift(m3), f: shift(f3) };
}

// ── STRONG class ───────────────────────────────────────────────────────────

function genStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
): VerbConjugationTable {
    const [C1, C2, C3] = C;
    const { v1: pv1, v2: pv2 } = parseVset(vsetPerf);
    const { v2: iv2 } = parseVset(vsetImpf);
    const isGuttural = (c: string) => ['għ', 'ħ', 'q'].includes(c);

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

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perf3f, C3);

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
        perfect_neg: i === 2 ? negM : i === 3 ? negF : perfRows[i],
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
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
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

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perfSyncRoot + 'it', C3);

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
        perfect_neg: i === 2 ? negM : i === 3 ? negF : perfRows[i],
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
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
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

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perf3f);

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
        perfect_neg: i === 2 ? negM : i === 3 ? negF : perfRows[i],
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: {
            impfType1: stemsList[1].impfType1.replace(pfx, impV1),
            impfType2: stemsList[1].impfType2.replace(pfx, impV1),
        },
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
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

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perf3f);

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
        perfect_neg: i === 2 ? negM : i === 3 ? negF : perfRows[i],
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
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
        blocksImala: (typeof C3 !== 'undefined' && C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}

// ── DEFECTIVE-GĦ class ──────────────────────────────────────────────────
// C3 = għ (perfect: surfaces as trailing -a, imperfect: acts like strong)

function genDefectiveGħ(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
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
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
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

    const { m: negM, f: negF } = negPerfect3sg(perfFull, perf3f, C3);

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
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
        blocksImala: (typeof C3 !== 'undefined' && C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}

// ── FORM II STRONG ─────────────────────────────────────────────────────────
// Doubled C2: CvCCvC pattern (e.g. fettaħ / jfettaħ)

function genFormIIStrong(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
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
        perfect_neg: i === 2 ? negM : i === 3 ? negF : perfRows[i],
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: { impfType1: impSg, impfType2: impSg.replace(/a([^aeiou])$/, '$1') },
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
        blocksImala: (C3 === 'għ' && (vsetImpf.endsWith('a') || vsetPerf.endsWith('a')))
    };
}
// ── FORM II Hollow ─────────────────────────────────────────────────────────
// Doubled C2: CvCCvC pattern (e.g. dawwar / jdawwar)

function genFormIIHollow(
    C: string[],
    vsetPerf: string,
    vsetImpf: string,
    vsetImp: string,
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
        perfect_neg: i === 2 ? negM : i === 3 ? negF : perfRows[i],
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: { impfType1: impSg, impfType2: impSg.replace(/a([^aeiou])$/, '$1') },
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
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
    vsetImp: string,
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
        perfect_neg: i === 2 ? negM : i === 3 ? negF : perfRows[i],
        stems: stemsList[i]
    }));

    return {
        rows,
        imperative_sg: impSg,
        imperative_pl: impPl,
        imperative_sg_stems: { impfType1: impSg, impfType2: impSg.replace(/a([^aeiou])$/, '$1') },
        imperative_pl_stems: { impfType1: impPl, impfType2: impPl },
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

    switch (input.verbClass) {
        case 'strong':
            return genStrong(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        case 'assimilative':
            return genAssimilative(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        case 'hollow':
            return genHollow(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        case 'geminated':
            return genGeminated(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        case 'defective-għ':
            return genDefectiveGħ(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        case 'defective-j/w':
        case 'defective-gem':
            return genDefective(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        case 'form-ii-strong':
            return genFormIIStrong(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        case 'form-ii-defective':
            return genFormIIDefective(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        case 'form-ii-hollow':
            return genFormIIHollow(consonants, input.vowelSetPerfect, input.vowelSetImperfect, input.vowelSetImperative);
        default:
            throw new Error(`Unknown verb class: ${input.verbClass}`);
    }
}
