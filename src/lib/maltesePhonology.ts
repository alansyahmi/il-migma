/**
 * maltesePhonology.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Linguistic engine for Standard Maltese phonology, orthography, and morphology.
 */

// ── CONSTANTS ──────────────────────────────────────────────────────────────

const VOWELS = ['a', 'e', 'i', 'o', 'u', 'à', 'è', 'ì', 'ò', 'ù', 'â', 'ê', 'î', 'ô', 'û'];
const IPA_VOWELS = ['ɐ', 'ɛ', 'ɪ', 'ɔ', 'ʊ', 'i'];

// All Maltese consonant letters (grapheme level)
const MALTESE_CONSONANTS = new Set(['b', 'ċ', 'd', 'f', 'ġ', 'g', 'għ', 'h', 'ħ', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'ż', 'z']);

function isVowel(c: string): boolean { return VOWELS.includes(c.toLowerCase()); }
function isIPAVowel(c: string): boolean { return IPA_VOWELS.includes(c); }

// ── IPA ENGINE ─────────────────────────────────────────────────────────────

const GRAPHEME_MAP: Record<string, string> = {
    'ċ': 't͡ʃ',
    'ġ': 'd͡ʒ',
    'ħ': 'ħ',
    'q': 'ʔ',
    'x': 'ʃ',
    'ż': 'z',
    'z': 't͡s',
    'j': 'j',
    'a': 'ɐ',
    'e': 'ɛ',
    'i': 'ɪ',
    'o': 'ɔ',
    'u': 'ʊ',
    'â': 'ɐː',
    'ê': 'ɛː',
    'î': 'ɪː',
    'ô': 'ɔː',
    'û': 'ʊː'
};

const DEVOICING: Record<string, string> = { 'b': 'p', 'd': 't', 'ġ': 't͡ʃ', 'g': 'k', 'v': 'f', 'ż': 's' };

/**
 * Syllabify an IPA string into an array of syllables using Maximal Onset Principle.
 * Each syllable contains: (onset consonants) + vowel (+ coda consonants until next onset).
 */
function syllabifyIPA(ipa: string): string[] {
    // Tokenize into vowel/consonant segments
    const segments: { type: 'V' | 'C'; val: string }[] = [];
    let i = 0;
    while (i < ipa.length) {
        // Multi-char IPA tokens
        if (ipa[i] === 't' && ipa[i + 1] === '͡') {
            segments.push({ type: 'C', val: ipa.slice(i, i + 3) });
            i += 3;
        } else if (ipa[i] === 'd' && ipa[i + 1] === '͡') {
            segments.push({ type: 'C', val: ipa.slice(i, i + 3) });
            i += 3;
        } else if (isIPAVowel(ipa[i])) {
            // Absorb following ː
            const has_long = ipa[i + 1] === 'ː';
            segments.push({ type: 'V', val: ipa[i] + (has_long ? 'ː' : '') });
            i += has_long ? 2 : 1;
        } else {
            segments.push({ type: 'C', val: ipa[i] });
            i++;
        }
    }

    // Build syllables: each syllable = onset + nucleus + coda
    const syllables: string[] = [];
    let current = '';
    for (let j = 0; j < segments.length; j++) {
        const seg = segments[j];
        if (seg.type === 'V') {
            current += seg.val;
            // Collect coda: consonants up until the next vowel
            // Leave at least one consonant before the next vowel as its onset
            let k = j + 1;
            while (k < segments.length && segments[k].type === 'C') {
                const nextIsVowel = k + 1 < segments.length && segments[k + 1].type === 'V';
                const remainingConsonants = segments.slice(k).filter(s => s.type === 'C').length;
                // If followed by vowel and this is the last consonant before it, leave for onset
                if (nextIsVowel && remainingConsonants === 1) break;
                // If multiple consonants before vowel, split: keep 1 for onset
                if (nextIsVowel && remainingConsonants > 1 && k === j + 1) {
                    // First consonant goes to coda, rest to next onset
                    current += segments[k].val;
                    k++;
                    break;
                }
                if (!nextIsVowel) {
                    current += segments[k].val;
                    k++;
                } else {
                    break;
                }
            }
            syllables.push(current);
            current = '';
            j = k - 1; // continue from where we left off
        } else {
            current += seg.val;
        }
    }
    // Any trailing consonants belong to last syllable
    if (current) {
        if (syllables.length > 0) {
            syllables[syllables.length - 1] += current;
        } else {
            syllables.push(current);
        }
    }
    return syllables.filter(Boolean);
}

/**
 * Generate a Standard Maltese IPA transcription with stress and phonological rules.
 * @param word - The Maltese word to transcribe
 * @param stressSyllableFromEnd - Override stress position (1=last, 2=penultimate). Defaults to auto.
 * @param longVowelIdx - Override which vowel (1-indexed across word) gets ː. Derived from pattern 'V' marker.
 */
export function generateIPA(word: string, stressSyllableFromEnd?: number, longVowelIdx?: number): string {
    if (!word) return '';
    let text = word.toLowerCase().normalize('NFC');

    // 1. Multi-character grapheme substitutions
    text = text.replace(/għi/g, 'ɛj');
    text = text.replace(/għu/g, 'ɔw');

    // 2. għ and h rules
    // Word-final għ or h/ħ -> /ħ/
    text = text.replace(/(għ|h|ħ)$/, 'ħ');
    // Long ħ clusters
    text = text.replace(/(għh|hħ|ħħ)/g, 'ħː');
    // Internal għ/h -> vowel-lengthening marker
    text = text.replace(/(għ|h)/g, 'ː');

    // 3. ie -> /iː/
    text = text.replace(/ie/g, 'iː');

    // 4. Final obstruent devoicing
    const lastChar = text.charAt(text.length - 1);
    if (DEVOICING[lastChar]) {
        text = text.substring(0, text.length - 1) + DEVOICING[lastChar];
    }

    // 5. Grapheme-by-grapheme to IPA
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        result += GRAPHEME_MAP[char] ?? char;
    }

    // 6. Fix lengthening markers
    if (result.startsWith('ː')) {
        // Initial għ: move lengthening to after first vowel
        result = result.substring(1).replace(/([ɐɛɪɔʊi])/, '$1ː');
    }
    // Bind orphaned ː to preceding vowel
    result = result.replace(/([ɐɛɪɔʊi])ː/g, '$1ː');
    result = result.replace(/ː([ɐɛɪɔʊi])/g, '$1ː');

    // 7. Syllabify
    const syllables = syllabifyIPA(result);
    const numSyllables = syllables.length;

    // 8. Determine stress position
    let stressIdx = 0;
    if (numSyllables > 1) {
        if (stressSyllableFromEnd !== undefined) {
            stressIdx = numSyllables - stressSyllableFromEnd;
        } else {
            // Auto: penultimate by default
            // Ultimate if final syllable has long vowel already
            const lastSyl = syllables[numSyllables - 1];
            const hasLongVowelInLast = /[ɐɛɪɔʊi]ː/.test(lastSyl);
            stressIdx = hasLongVowelInLast ? numSyllables - 1 : numSyllables - 2;
        }
        stressIdx = Math.max(0, Math.min(stressIdx, numSyllables - 1));
    }

    // 9. Lengthen the correct vowel
    if (longVowelIdx !== undefined && longVowelIdx > 0) {
        // Explicit from pattern: lengthen the n-th vowel across all syllables
        let joined = syllables.join('·'); // temp separator (middle dot)
        let vowelCount = 0;
        joined = joined.replace(/([ɐɛɪɔʊi])(?!ː)/g, (match) => {
            vowelCount++;
            return vowelCount === longVowelIdx ? match + 'ː' : match;
        });
        const resplit = joined.split('·');
        resplit.forEach((s, i) => { syllables[i] = s; });
    }

    // 10. Write stress marker before stressed syllable and join with .
    if (numSyllables <= 1) {
        return `/${syllables.join('.')}/`;
    }

    const withStress = syllables.map((syl, idx) => idx === stressIdx ? 'ˈ' + syl : syl);
    return `/${withStress.join('.')}/`;
}

// ── PATTERN ENGINE ─────────────────────────────────────────────────────────

/**
 * Extracts the position (1-indexed) of the long vowel marker 'V' from a CV pattern string.
 * In the pattern notation, 'v' = short vowel, 'V' = long (stressed) vowel.
 * Returns undefined if no 'V' or circumflexed indicator is found.
 * 
 * Examples:
 *   extractLongVowelFromPattern('CvCVC')  -> 2  (2nd vowel is long)
 *   extractLongVowelFromPattern('fgħâl')  -> 1  (â is long)
 *   extractLongVowelFromPattern('CvC v̂ C') -> 2 (v̂ is long)
 */
export function extractLongVowelFromPattern(cvPattern: string): number | undefined {
    if (!cvPattern) return undefined;
    const normalized = cvPattern.normalize('NFC');
    let vowelIdx = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i];
        const next = normalized[i + 1];

        // Check for circumflex (either as single char or combining)
        const isCircumflex = 'âêîôû'.includes(char) || (char === 'v' && next === '\u0302') || char === 'v\u0302' || char === 'V';

        if (char === 'v' || char === 'V' || VOWELS.includes(char)) {
            vowelIdx++;
            if (isCircumflex) return vowelIdx;
        }

        // Skip combining accent in loop if we just checked it
        if (char === 'v' && next === '\u0302') i++;
    }
    return undefined;
}

/**
 * Derives the CV pattern from a typed word and root consonants.
 * Any vowel in the word is replaced with 'v'. Root consonants become 'C'.
 * Non-root consonants (prefixes/suffixes) are kept as-is.
 * 
 * e.g. derivePattern('kitba', 'k-t-b') -> 'CvCCa'  (b appears twice -> CC)
 * e.g. derivePattern('kotba', 'k-t-b') -> 'CvCCa'  (any vowel = v)
 */
export function derivePattern(word: string, rootConsonants: string): string | null {
    if (!word || !rootConsonants) return null;

    const norm = word.toLowerCase().normalize('NFC');
    // Parse root: split by '-', '.', space, or comma
    const roots = rootConsonants.toLowerCase().replace(/[-.,\s]+/g, '-').split('-').filter(Boolean);
    if (roots.length === 0) return null;

    let result = '';
    let rootIndex = 0;
    let i = 0;

    while (i < norm.length) {
        const char = norm[i];

        // Check for multi-character root consonants (għ, ħ, etc.)
        // Try to match current root consonant
        const currentRoot = rootIndex < roots.length ? roots[rootIndex] : null;
        if (currentRoot && norm.startsWith(currentRoot, i)) {
            result += 'C';
            i += currentRoot.length;
            rootIndex++;
            continue;
        }

        // Also check: did we already use all roots but char matches a later root? (doubled consonants)
        // e.g. kotba -> k=C1, o=v, t=C2, b=C3, a=v but b appeared where C3 is, t=C2
        // Actually we iterate greedily left-to-right matching root consonants in order

        if (isVowel(char)) {
            result += 'v';
            i++;
        } else {
            // Non-root consonant (prefix/suffix consonant like 't' in tCvCvC)
            // or repeated root consonant (gemination)
            // Check if this matches the CURRENT root consonant again (gemination)
            if (currentRoot && char === currentRoot[0] && currentRoot.length === 1) {
                result += 'C';
                i += currentRoot.length;
                rootIndex++;
            } else {
                // Keep as literal (don't advance rootIndex)
                result += char;
                i++;
            }
        }
    }

    return result || null;
}

// ── FEMININE ENGINE ────────────────────────────────────────────────────────

/**
 * Derives the feminine form from a masculine headword.
 */
export function deriveFeminineFromPattern(_cvPattern: string, headword: string): string | null {
    if (!headword) return null;

    const word = headword.toLowerCase();
    const v = VOWELS;

    // 1. Handle jj/ww degemination + syncopation (tfajjel -> tfajla)
    if (word.includes('jj') || word.includes('ww')) {
        let base = word.replace('jj', 'j').replace('ww', 'w');
        // If it ends in VC, drop the V (syncopation)
        if (v.includes(base[base.length - 2])) {
            return base.substring(0, base.length - 2) + base.substring(base.length - 1) + 'a';
        }
        return base + 'a';
    }

    // 2. Adjectives ending in -i -> -ija
    if (word.endsWith('i')) return word + 'ja';

    // 3. Simple syncopation for CvCvC pattern (tifel -> tifla)
    if (word.length === 5 && v.includes(word[1]) && v.includes(word[3])) {
        return word.substring(0, 3) + word.substring(4) + 'a';
    }

    // 4. Already feminine
    if (word.endsWith('a') || word.endsWith('à')) return word;

    // 5. Default: append -a
    return word + 'a';
}

/**
 * Derives a masculine form from a feminine headword (reverse of deriveFeminineFromPattern).
 */
export function deriveMasculineFromFeminine(feminine: string): string | null {
    if (!feminine) return null;
    const word = feminine.toLowerCase();

    // 1. -ija -> -i (reverse of adj -i -> -ija)
    if (word.endsWith('ija')) return word.slice(0, -3) + 'i';

    // 2. Syncopation reversal: -Cla (like tifla) -> -CelC (insert 'e' before penultimate C)
    // Pattern: (consonant)(l)(a) or (consonant)(r)(a) often syncopated
    // tifla: t-i-f-l-a  -> Check: ends in C+a where preceding is a valid C cluster
    // General rule: if word ends in CCA (2 consonants + a), insert 'e' between them
    if (word.endsWith('a') && word.length >= 4) {
        const stem = word.slice(0, -1); // remove -a: tifl
        // Check if second-to-last char is a consonant (not a vowel)
        const penult = stem[stem.length - 2];
        const last = stem[stem.length - 1];
        const vowels = VOWELS;
        if (!vowels.includes(penult) && !vowels.includes(last)) {
            // CCC ending: insert 'e' before last consonant (tifl -> tifel)
            return stem.slice(0, -1) + 'e' + last;
        }
        // Simple: just drop -a
        return stem;
    }

    return word;
}

// ── PLURAL ENGINE ──────────────────────────────────────────────────────────

export interface PluralSuggestion {
    type: 'sound' | 'broken';
    suffix?: string;
    pattern?: string;
}

/**
 * Heuristic to detect if a word likely takes a sound or broken plural.
 */
export function detectPluralType(headword: string, _soundSuffixes: string[]): PluralSuggestion | null {
    if (!headword) return null;

    // 1. Endings that strongly suggest sound plural
    const soundEndings = ['a', 'i', 'u', 'à', 'è', 'ì', 'ò', 'ù'];
    if (soundEndings.some(e => headword.endsWith(e))) {
        return { type: 'sound', suffix: 'iet' };
    }

    // 2. Short Semitic roots (≤4 characters without digraphs) -> broken plural
    const cleaned = headword.replace(/għ|[^\p{L}]/gu, (m) => m === 'għ' ? 'X' : '').length;
    if (cleaned <= 4) {
        return { type: 'broken' };
    }

    return null;
}

// ── DUAL ENGINE ────────────────────────────────────────────────────────────

/**
 * Generates a theoretical dual form for a noun.
 * Uses a synced-up stem before appending the suffix:
 * - drops final -a
 * - shortens final `ie` to `i`
 * - syncopates a final short vowel when the word has a multi-vowel stem
 * This keeps forms like għomor -> għomrejn instead of għomorejn.
 */
export function generateTheoreticalDual(word: string): string {
    if (!word) return '';
    const norm = word.toLowerCase().trim().normalize('NFC');

    const vowelRe = /[aeiouàèìòùâêîôû]/gi;
    let stem = norm;

    if (stem.endsWith('a')) {
        stem = stem.slice(0, -1);
    }

    // Syncopate the final vowel in multi-vowel stems.
    // This is intentionally conservative: words like "dar" stay untouched,
    // while words like "għomor" and "xahar" reduce to their dual stem.
    const vowelCount = stem.match(vowelRe)?.length ?? 0;
    if (vowelCount >= 2) {
        const shortenedIe = stem.replace(/ie([^aeiouàèìòùâêîôû]*)$/i, 'i$1');
        if (shortenedIe !== stem) {
            stem = shortenedIe;
        } else {
            stem = stem.replace(/([aeiouàèìòùâêîôû])([^aeiouàèìòùâêîôû]+)$/i, '$2');
        }
    }

    // Check for guttural ending (għ, ħ, q, h) after stem reduction.
    const isGuttural = stem.endsWith('għ') || stem.endsWith('ħ') || stem.endsWith('q') || stem.endsWith('h');
    const suffix = isGuttural ? 'ajn' : 'ejn';

    return stem + suffix;
}

// ── CONSONANT SET ──────────────────────────────────────────────────────────


// ── ELATIVE ENGINE ─────────────────────────────────────────────────────────

/**
 * Generates theoretical Elative forms for an adjective.
 * Masc: aCCaC, aCaCC, iCCeC/iCeCC, or iCCaC/iCaCC
 * Fem: CoCCa
 */
export function generateElative(rootConsonants: string, headword: string): { masculine: string; feminine: string } | null {
    if (!rootConsonants) return null;
    const roots = rootConsonants.toLowerCase().replace(/[-.,\s]+/g, '-').split('-').filter(Boolean);
    if (roots.length < 3) return null;

    const c1 = roots[0];
    const c2 = roots[1];
    const c3 = roots[2];
    const isGeminated = c2 === c3;
    const isGuttural = (c: string) => ['għ', 'ħ', 'q', 'h'].includes(c);
    
    // Check headword vowels
    const headwordVowels = headword.toLowerCase().split('').filter(isVowel);
    const allVowelsA = headwordVowels.length > 0 && headwordVowels.every(v => v === 'a' || v === 'à' || v === 'â');

    let masc = '';
    if (allVowelsA) {
        masc = `a${c1}${c2}a${c3}`;
    } else if (isGeminated) {
        masc = `a${c1}a${c2}${c3}`;
    } else {
        const v2 = (isGuttural(c1) || isGuttural(c2)) ? 'a' : 'e';
        // Check if we should use iCCvC or iCvCC (usually triliteral roots use iCCvC)
        // Most elatives are iCCvC (e.g. iħla, iqsar, itwal)
        // But for doubled roots we handle separately.
        masc = `i${c1}${c2}${v2}${c3}`;
    }

    const fem = `${c1}o${c2}${c3}a`;

    return { masculine: masc, feminine: fem };
}

// ── NUMERAL ENGINE ─────────────────────────────────────────────────────────

export interface NumeralAutoForms {
    ordinal?: string;
    adverbial?: string;
    fractional_semitic?: string;
    multiplier_form1?: string;
    multiplier_form2?: string;
    distributive?: string;
    attributive_short?: string;
    attributive_long?: string;
}

/**
 * Generates theoretical numeral-derived forms based on Semitic patterns.
 */
export function generateNumeralForms(masculine: string, root_consonants: string): NumeralAutoForms {
    if (!masculine || !root_consonants) return {};
    const roots = root_consonants.toLowerCase().replace(/[-.,\s]+/g, '-').split('-').filter(Boolean);
    if (roots.length < 3) return {};

    const c1 = roots[0];
    const c2 = roots[1];
    const c3 = roots[2];

    const forms: NumeralAutoForms = {};

    // 1. Ordinal: CâCeC (fâgħel)
    // Note: Irregularities like tielet (t-l-t), raba' (r-b-għ), ħames (ħ-m-s)
    forms.ordinal = `${c1}â${c2}e${c3}`;
    if (c3 === 'għ' || c3 === 'ħ' || c3 === 'q') {
        forms.ordinal = `${c1}â${c2}a${c3}`; // Guttural adjustment
    }

    // 2. Adverbial: masc form + darbiet
    forms.adverbial = `${masculine} darbiet`;

    // 3. Fractional (Semitic): CoCuC
    forms.fractional_semitic = `${c1}o${c2}u${c3}`;
    if (c3 === 'għ' || c3 === 'ħ' || c3 === 'q') {
        forms.fractional_semitic = `${c1}o${c2}u'`; // e.g. robu'
    }

    // 4. Multiplier: CCieCi or passive ptcp of Form II (mCeCCet)
    forms.multiplier_form1 = `${c1}${c2}ie${c3}i`;
    forms.multiplier_form2 = `m${c1}e${c2}${c3}${c3}et`; // simplified Form II passive ptcp logic
    if (c3 === 'għ') forms.multiplier_form2 = `m${c1}e${c2}${c2}a'`; // e.g. mrabba'

    // 5. Distributive: CCieC
    forms.distributive = `${c1}${c2}ie${c3}`;

    // 6. Attributive Forms
    // Short: masculine/lemma itself usually (e.g. tliet)
    forms.attributive_short = masculine;
    // Long: masculine/lemma + t (e.g. tlitt, erbat)
    forms.attributive_long = masculine.endsWith("'") ? masculine.slice(0, -1) + 'at' : masculine + 't';

    return forms;
}

export { MALTESE_CONSONANTS, VOWELS };
