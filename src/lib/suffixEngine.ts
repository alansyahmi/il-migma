/**
 * suffixEngine.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Pure-function module: attaches Maltese direct/indirect object pronoun
 * suffixes to verb stems using full phonological rules from verb.mt.
 *
 * Rules implemented:
 *  • DO -ek/-ok vowel-set sensitivity
 *  • IO -il- epenthesis after consonant clusters (post-syncope stems)
 *  • Combined DO+IO clitic insertion (-hu-, -hie-/-hi-, etc.)
 *  • ie-collapse in negative forms (only one 'ie' per word)
 *  • ma…x negative wrapping
 */

// ── Vowel set helpers ──────────────────────────────────────────────────────

/**
 * Returns true if the vowel set uses 'round' suffixes (-ok, -lok).
 * Triggered for: o-o, i-o, o--
 */
export function isRound(vset: string): boolean {
    return /^(o-o|i-o|o--)/.test(vset);
}

/**
 * Returns true if the stem ends in a consonant cluster (2+ consonants with
 * no intervening vowel), meaning IO suffixes -lha/-lna/-lkom/-lhom need
 * an epenthetic -il- inserted between stem and suffix.
 *
 * Cluster detection: last two chars are both consonants (not a/e/i/o/u/ie/għ).
 */
export function needsIl(stem: string): boolean {
    const s = stem.replace(/x$/, '');
    const vowels = /[aeiouàèìòùâêîôûAEIOU]/;
    if (s.length < 1) return false;

    // Special case for 'għ'
    if (s.endsWith('għ')) return true;

    const last = s[s.length - 1];
    // Any consonant-final stem needs the epenthetic -il- for complex IO clitics
    if (!vowels.test(last)) return true;

    return false;
}

/**
 * Syncopate a verb stem: drop the final theme vowel.
 * SONORANT LICENSING: If dropping the vowel creates a CRC cluster (C-Sonorant-C),
 * the vowel is preserved or an epenthetic i is inserted to license the sonorant.
 */
export function syncopateStem(stem: string): string {
    const isSonorant = (c: string) => ['l', 'm', 'n', 'r'].includes(c);
    const vowels = /[aeiouàèìòùâêîôû]/;

    // Normal syncopation candidate
    const sync = stem.replace(/([aeiou])([^aeiouàèìòùâêîôû])$/, '$2');

    // Check last 3 of syncopated version to see if we created a CRC
    if (sync.length >= 3) {
        const last3 = sync.slice(-3);
        const c1 = last3[0];
        const c2 = last3[1];
        const c3 = last3[2];
        if (!vowels.test(c1) && isSonorant(c2) && !vowels.test(c3)) {
            // Illegal CRC: Return original stem (preserves vowel as licenser)
            return stem;
        }
    }

    return sync.replace(/^(.)(.)\2$/, '$1$2$2');
}

/**
 * Reverse Imāla rule: Terminal -a or -na shifts to -ie or -nie when word-internal
 * or stressed (negative -x).
 */
export function applyReverseImala(stem: string, blocksImala: boolean = false): string {
    if (blocksImala) return stem.replace(/na$/, 'nie');
    return stem.replace(/na$/, 'nie').replace(/a$/, 'ie');
}

// ── ie-collapse ────────────────────────────────────────────────────────────

export function collapseIe(word: string, verbForm?: string): string {
    const matches = [...word.matchAll(/ie/g)];
    if (matches.length === 0) return word;

    const total = matches.length;

    /** decide whether ie should shorten to 'e' (Form III root), 'i' (clitics/standard) */
    const getShortForm = (offset: number) => {
        if (verbForm === 'III' && offset < 6) return 'e';
        return 'i';
    };

    if (total > 1) {
        let count = 0;
        return word.replace(/ie/g, (_match, offset) => {
            count++;
            if (count < total) {
                return getShortForm(offset);
            }
            return 'ie';
        });
    }

    return word;
}

// ── Negative wrap ──────────────────────────────────────────────────────────

/** Wrap a suffixed stem: "ma <stem>x" */
export function negWrap(stem: string, suffix: string, verbForm?: string): string {
    return collapseIe(`ma ${stem}${suffix}x`, verbForm);
}

// ── Suffix tables ──────────────────────────────────────────────────────────

// Direct Object — positive suffixes (index 0-6: ni, ek/ok, u, ha, na, kom, hom)
const DO_POS = ['ni', 'ek', 'u', 'ha', 'na', 'kom', 'hom'] as const;
//   negative endings (appended before x in ma…x)
const DO_NEG_INNER = ['ni', 'ek', 'u', 'hie', 'nie', 'kom', 'hom'] as const;
// Round variants for idx=1
const DO_POS_ROUND = ['ni', 'ok', 'u', 'ha', 'na', 'kom', 'hom'] as const;
const DO_NEG_ROUND_INNER = ['ni', 'ok', 'u', 'hie', 'nie', 'kom', 'hom'] as const;

// Indirect Object — positive suffixes
const IO_POS = ['li', 'lek', 'lu', 'lha', 'lna', 'lkom', 'lhom'] as const;
const IO_POS_IL = ['li', 'lek', 'lu', 'ilha', 'ilna', 'ilkom', 'ilhom'] as const;
// Round variants for idx=1
const IO_POS_ROUND = ['li', 'lok', 'lu', 'lha', 'lna', 'lkom', 'lhom'] as const;
const IO_POS_IL_ROUND = ['li', 'lok', 'lu', 'ilha', 'ilna', 'ilkom', 'ilhom'] as const;

// IO neg inner (before x): uses 'hie' for -lhiex pattern
// Index 0-6
const IO_NEG_INNER = ['li', 'lek', 'lu', 'lhie', 'lnie', 'lkom', 'lhom'] as const;
const IO_NEG_IL_INNER = ['li', 'lek', 'lu', 'ilhie', 'ilnie', 'ilkom', 'ilhom'] as const;
const IO_NEG_ROUND_INNER = ['li', 'lok', 'lu', 'lhie', 'lnie', 'lkom', 'lhom'] as const;
const IO_NEG_IL_ROUND_INNER = ['li', 'lok', 'lu', 'ilhie', 'ilnie', 'ilkom', 'ilhom'] as const;

// DO clitics used in DO+IO combined forms (positive)
const DO_CLIT_POS = ['ni', 'k', 'hu', 'hie', 'nie', 'kom', 'hom'] as const;
// DO clitics in negative (hie→hi to avoid ie duplication, handled by collapseIe)
const DO_CLIT_NEG = ['ni', 'k', 'hu', 'hie', 'nie', 'kom', 'hom'] as const;

// ── Public API ─────────────────────────────────────────────────────────────

export interface SuffixResult {
    positive: string;
    negative: string; // full "ma …x" form
}

/**
 * Apply Direct Object suffix to an attached verb stem. Also changes -u to -h.
 * @param stem  Already-processed attached stem (e.g. "niktib" not "nikteb")
 * @param doIdx 0=ni, 1=ek/ok, 2=u, 3=ha, 4=na, 5=kom, 6=hom
 * @param vset  Vowel set string, e.g. "i-e"
 */
export function applyDo(stem: string, doIdx: number, vset: string, verbForm?: string, blocksImala: boolean = false): SuffixResult {
    const round = isRound(vset);
    const last = stem[stem.length - 1];
    const isVowelEnd = /[aeiouw]/.test(last);

    // ── Vowel Hiatus Handling (for idx 1: -ek/-ok and idx 2: -u) ────────────
    if (isVowelEnd) {
        // Shared logic for -a -> -ie shift
        let modStem = stem;
        if (last === 'a') {
            if (stem.endsWith('na')) {
                modStem = stem.slice(0, -2) + 'nie';
            } else if (!blocksImala) {
                modStem = stem.slice(0, -1) + 'ie';
            }
        }

        if (doIdx === 1) { // -ek/-ok -> -k
            return {
                positive: modStem + 'k',
                negative: collapseIe(`ma ${modStem}kx`, verbForm),
            };
        }
        if (doIdx === 2) { // -u -> -h
            return {
                positive: modStem + 'h',
                negative: collapseIe(`ma ${modStem}hx`, verbForm),
            };
        }

        // For other suffixes (ha, na, kom, hom) after -a, we still shift to -ie
        // e.g. ktibna + -ha -> ktibnieha
        if (last === 'a') {
            const posSuffix = round ? DO_POS_ROUND[doIdx] : DO_POS[doIdx];
            const negInner = round ? DO_NEG_ROUND_INNER[doIdx] : DO_NEG_INNER[doIdx];
            return {
                positive: modStem + posSuffix,
                negative: collapseIe(`ma ${modStem}${negInner}x`, verbForm),
            };
        }
    }

    // ── Consonant Suffix Handling (-ni, -ha, -na, -hom) ────────────────────
    let modStem = stem;
    if (last === 'a') {
        if (stem.endsWith('na')) {
            modStem = stem.slice(0, -2) + 'nie';
        } else if (!blocksImala) {
            modStem = stem.slice(0, -1) + 'ie';
        }
    }

    const posSuffix = round ? DO_POS_ROUND[doIdx] : DO_POS[doIdx];
    const negInner = round ? DO_NEG_ROUND_INNER[doIdx] : DO_NEG_INNER[doIdx];

    return {
        positive: modStem + posSuffix,
        negative: negWrap(modStem, negInner, verbForm),
    };
}

/**
 * Apply Indirect Object suffix to an attached verb stem.
 * @param doIdx 0=li, 1=lek/lok, 2=lu, 3=lha/ilha, 4=lna/ilna, 5=lkom/ilkom, 6=lhom/ilhom
 */
export function applyIo(stem: string, ioIdx: number, vset: string, verbForm?: string, blocksImala: boolean = false): SuffixResult {
    const round = isRound(vset);
    const il = needsIl(stem);

    let posSuffix: string;
    let negInner: string;

    if (round) {
        posSuffix = il ? IO_POS_IL_ROUND[ioIdx] : IO_POS_ROUND[ioIdx];
        negInner = il ? IO_NEG_IL_ROUND_INNER[ioIdx] : IO_NEG_ROUND_INNER[ioIdx];
    } else {
        posSuffix = il ? IO_POS_IL[ioIdx] : IO_POS[ioIdx];
        negInner = il ? IO_NEG_IL_INNER[ioIdx] : IO_NEG_INNER[ioIdx];
    }

    const last = stem[stem.length - 1];
    let modStem = stem;
    if (last === 'a') {
        if (stem.endsWith('na')) {
            modStem = stem.slice(0, -2) + 'nie';
        } else if (!blocksImala) {
            modStem = stem.slice(0, -1) + 'ie';
        }
    }

    return {
        positive: modStem + posSuffix,
        negative: negWrap(modStem, negInner, verbForm),
    };
}

/**
 * Apply combined DO-clitic + IO suffix to an attached verb stem.
 * When DO=hom (idx 6), the IO-2sg suffix uses -lok even for non-round verbs.
 */
export function applyDoIo(
    stem: string,
    doIdx: number,
    ioIdx: number,
    vset: string,
    verbForm?: string,
    blocksImala: boolean = false,
): SuffixResult {
    const homDoIdx = doIdx === 6; // DO=hom needs -lok for IO=2sg
    const round = isRound(vset);

    const last = stem[stem.length - 1];
    let modStem = stem;
    if (last === 'a') {
        if (stem.endsWith('na')) {
            modStem = stem.slice(0, -2) + 'nie';
        } else if (!blocksImala) {
            modStem = stem.slice(0, -1) + 'ie';
        }
    }

    // Positive
    const clitPos = DO_CLIT_POS[doIdx];
    const midStemPos = modStem + clitPos;
    // -il- is needed only if midStemPos ends in CC cluster (not if clitic ends in vowel)
    const ilPos = needsIl(midStemPos);
    let ioPosSuffix: string;
    if (homDoIdx) {
        ioPosSuffix = ilPos ? IO_POS_IL_ROUND[ioIdx] : IO_POS_ROUND[ioIdx];
    } else {
        ioPosSuffix = round
            ? (ilPos ? IO_POS_IL_ROUND[ioIdx] : IO_POS_ROUND[ioIdx])
            : (ilPos ? IO_POS_IL[ioIdx] : IO_POS[ioIdx]);
    }
    const positive = midStemPos + ioPosSuffix;

    // Negative
    const clitNeg = DO_CLIT_NEG[doIdx];
    const midStemNeg = modStem + clitNeg;
    const ilNeg = needsIl(midStemNeg);
    let ioNegInner: string;
    if (homDoIdx) {
        ioNegInner = ilNeg ? IO_NEG_IL_ROUND_INNER[ioIdx] : IO_NEG_ROUND_INNER[ioIdx];
    } else {
        ioNegInner = round
            ? (ilNeg ? IO_NEG_IL_ROUND_INNER[ioIdx] : IO_NEG_ROUND_INNER[ioIdx])
            : (ilNeg ? IO_NEG_IL_INNER[ioIdx] : IO_NEG_INNER[ioIdx]);
    }
    const negative = collapseIe(`ma ${midStemNeg}${ioNegInner}x`, verbForm);

    return { positive, negative };
}

/**
 * Convenience: build a verb form given all toggle state.
 *
 * @param baseForm     The positive base form (e.g. "nikteb")
 * @param isNeg        Polarity toggle
 * @param doIdx        Direct object index or null
 * @param ioIdx        Indirect object index or null
 * @param vset         Vowel set string for the verb
 */
export function buildVerbForm(
    baseForm: string,
    isNeg: boolean,
    doIdx: number | null,
    ioIdx: number | null,
    vset: string,
    stems?: { impfType1: string; impfType2: string },
    blocksImala: boolean = false,
    verbForm?: string
): string {
    // ── Handle Slashed Variants (e.g. mmur / nmur) ───────────────────────
    if (baseForm.includes(' / ')) {
        const partsBase = baseForm.split(' / ');
        const partsT1 = (stems?.impfType1 || baseForm).split(' / ');
        const partsT2 = (stems?.impfType2 || baseForm).split(' / ');

        const results = partsBase.map((b, i) => {
            const s = {
                impfType1: partsT1[i] ?? partsT1[0],
                impfType2: partsT2[i] ?? partsT2[0],
            };
            return buildVerbForm(b, isNeg, doIdx, ioIdx, vset, s, blocksImala, verbForm);
        });
        return results.join(' / ');
    }

    // No suffix case
    if (doIdx === null && ioIdx === null) {
        if (isNeg) {
            // PHARYNGEAL EXCEPTION: for singular jilqa' + x -> jilqax
            // Instead of using it1 (jilqagħ) which gives ma jilqagħx
            let stem = stems?.impfType1 || baseForm;
            if (blocksImala && baseForm.endsWith("'")) {
                stem = baseForm.replace(/'$/, '');
            }
            return collapseIe(`ma ${stem}x`, verbForm);
        }
        return baseForm;
    }

    // Stem selection logic based on three-stem framework
    const t1 = stems?.impfType1 || baseForm;
    const t2 = stems?.impfType2 || baseForm;

    let result: string;
    if (doIdx !== null && ioIdx !== null) {
        // Combined DO+IO: use Type 1 stem
        const res = applyDoIo(t1, doIdx, ioIdx, vset, verbForm, blocksImala);
        result = isNeg ? res.negative : res.positive;
    } else if (doIdx !== null) {
        // DO idx 1 (-ek/-ok) and idx 2 (-u) are vowel-initial -> syncopated stem (Type 2)
        // EXCEPTION: if the base stem ends in a vowel (Defective/Perfective), syncing produces illegal clusters
        // or misses the -h/-k suffix variants. So we use t1.
        const stem = (doIdx === 1 || doIdx === 2) ? (/[aeiouwàèìòùâêîôû]$/i.test(t1) ? t1 : t2) : t1;
        const res = applyDo(stem, doIdx, vset, verbForm, blocksImala);
        result = isNeg ? res.negative : res.positive;
    } else {
        // IO only:
        // idx 3-6 (-lha/-lna/-lkom/-lhom) -> need Type 2 stem so -il- epenthesis fires
        const stem = (ioIdx! >= 3) ? t2 : t1;
        const res = applyIo(stem, ioIdx!, vset, verbForm, blocksImala);
        result = isNeg ? res.negative : res.positive;
    }

    return collapseIe(result, verbForm);
}

export function buildPerfectForm(
    perfectPos: string,
    perfectNeg: string,
    isNeg: boolean,
    doIdx: number | null,
    ioIdx: number | null,
    vset: string,
    stems?: { perfType1: string; perfType2: string },
    blocksImala: boolean = false,
    verbForm?: string
): string {
    const base = isNeg ? perfectNeg : perfectPos;

    if (doIdx === null && ioIdx === null) {
        if (isNeg) {
            return collapseIe(`ma ${applyReverseImala(perfectNeg, blocksImala)}x`, verbForm);
        }
        return perfectPos;
    }

    // Clitic attachment
    let t1 = applyReverseImala(stems?.perfType1 || base, blocksImala);
    const t2 = applyReverseImala(stems?.perfType2 || base, blocksImala);

    let finalResult: string;

    if (doIdx !== null && ioIdx !== null) {
        const result = applyDoIo(t1, doIdx, ioIdx, vset, verbForm, blocksImala);
        finalResult = isNeg ? result.negative : result.positive;
    } else if (doIdx !== null) {
        let perfBase = t1;
        if (doIdx === 2) {
            // Perfect + DO=-u: handles syncopation/shift internally or via t2
            if (base.endsWith('et') && !base.endsWith('iet')) {
                perfBase = base.slice(0, -2) + 'it';
            } else if (base.endsWith('it')) {
                perfBase = base;
            } else if (/[aeiouwàèìòùâêîôû]$/i.test(t1)) {
                perfBase = t1;
            } else if (!base.endsWith('na')) {
                perfBase = t2;
            }
        } else if (doIdx === 1) {
            perfBase = base.endsWith('na') ? t1 : t2;
        }
        const result = applyDo(perfBase, doIdx, vset, verbForm, blocksImala);
        finalResult = isNeg ? result.negative : result.positive;
    } else {
        const stem = (ioIdx! >= 3) ? (base.endsWith('na') ? t1 : t2) : t1;
        const result = applyIo(stem, ioIdx!, vset, verbForm, blocksImala);
        finalResult = isNeg ? result.negative : result.positive;
    }

    return collapseIe(finalResult, verbForm);
}

// ── Label arrays for UI strips ─────────────────────────────────────────────
// These are computed once per render based on vowel set.

export function getDoLabels(vset: string): string[] {
    const round = isRound(vset);
    return ['-ni', round ? '-ok' : '-ek', '-u', '-ha', '-na', '-kom', '-hom'];
}

export function getIoLabels(vset: string): string[] {
    const round = isRound(vset);
    return ['-li', round ? '-lok' : '-lek', '-lu', '-lha', '-lna', '-lkom', '-lhom'];
}
