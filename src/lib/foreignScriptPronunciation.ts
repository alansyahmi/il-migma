const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const ARABIC_DIACRITIC_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/u;
const GREEK_SCRIPT_RE = /[\u0370-\u03FF\u1F00-\u1FFF]/;
const GREEK_DIACRITIC_RE = /[\u0300-\u036f]/u;
const TIFINAGH_SCRIPT_RE = /[\u2D30-\u2D7F]/;
const LATIN_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'â', 'ê', 'î', 'ô', 'û']);

type PronunciationInput = {
    language?: string;
    term?: string;
    script?: string;
};

function normalizeText(value: string | undefined | null) {
    return String(value || '').trim().normalize('NFKC');
}

function isArabicText(value: string) {
    return ARABIC_SCRIPT_RE.test(value);
}

function isGreekText(value: string) {
    return GREEK_SCRIPT_RE.test(value);
}

function isTifinaghText(value: string) {
    return TIFINAGH_SCRIPT_RE.test(value);
}

function normalizeLanguage(value: string | undefined | null) {
    return normalizeText(value).toLowerCase();
}

function isItalianLanguage(value: string | undefined | null) {
    return normalizeLanguage(value) === 'italian';
}

function isSicilianLanguage(value: string | undefined | null) {
    return normalizeLanguage(value) === 'sicilian';
}

function normalizeArabicWord(value: string) {
    return normalizeText(value).replace(/\u0640/g, '');
}

function normalizeGreekWord(value: string) {
    return normalizeText(value)
        .normalize('NFD')
        .replace(GREEK_DIACRITIC_RE, '')
        .toLowerCase();
}

function normalizeLatinRomanceWord(value: string) {
    return normalizeText(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function splitArabicClusters(word: string) {
    const clusters: string[] = [];
    let current = '';

    for (const char of Array.from(word)) {
        if (ARABIC_DIACRITIC_RE.test(char)) {
            current += char;
            continue;
        }

        if (current) clusters.push(current);
        current = char;
    }

    if (current) clusters.push(current);
    return clusters;
}

function hasMark(cluster: string, mark: string) {
    return cluster.includes(mark);
}

function baseLetter(cluster: string) {
    return Array.from(cluster)[0] || '';
}

function isArabicCarrierLetter(letter: string) {
    return ['ا', 'أ', 'إ', 'آ', 'ى', 'و', 'ي'].includes(letter);
}

function isAlifLetter(letter: string) {
    return ['ا', 'أ', 'إ', 'آ', 'ى'].includes(letter);
}

function isWawLetter(letter: string) {
    return letter === 'و';
}

function isYaLetter(letter: string) {
    return letter === 'ي';
}

function mapArabicConsonant(letter: string) {
    switch (letter) {
        case 'ء':
            return "'";
        case 'ب':
            return 'b';
        case 'ت':
            return 't';
        case 'ث':
            return 'θ';
        case 'ج':
            return 'ġ';
        case 'ح':
            return 'ħ';
        case 'خ':
            return 'kh';
        case 'د':
            return 'd';
        case 'ذ':
            return 'đ';
        case 'ر':
            return 'r';
        case 'ز':
            return 'ż';
        case 'س':
            return 's';
        case 'ش':
            return 'sh';
        case 'ص':
            return 'ṣ';
        case 'ض':
            return 'ḍ';
        case 'ط':
            return 'ṭ';
        case 'ظ':
            return 'ẓ';
        case 'ع':
            return 'għ';
        case 'غ':
            return 'gh';
        case 'ف':
            return 'f';
        case 'ق':
            return 'q';
        case 'ك':
            return 'k';
        case 'ل':
            return 'l';
        case 'م':
            return 'm';
        case 'ن':
            return 'n';
        case 'ه':
            return 'h';
        case 'ة':
            return 'ẗ';
        case 'و':
            return 'w';
        case 'ي':
            return 'y';
        case 'ا':
        case 'أ':
        case 'إ':
        case 'آ':
        case 'ى':
            return '';
        default:
            return letter;
    }
}

function isGreekLetter(letter: string) {
    return /[α-ωϐ-Ͽ]/u.test(letter);
}

function isGreekVoicelessConsonant(letter: string) {
    return ['π', 'τ', 'κ', 'ξ', 'σ', 'ς', 'φ', 'θ', 'χ', 'ψ'].includes(letter);
}

function transliterateGreekWord(word: string) {
    const plain = normalizeGreekWord(word);
    const output: string[] = [];

    for (let i = 0; i < plain.length; i++) {
        const letter = plain[i];
        const next = plain[i + 1] || '';
        const next2 = plain[i + 2] || '';
        const prev = plain[i - 1] || '';
        const atWordStart = i === 0 || !isGreekLetter(prev);

        if (!isGreekLetter(letter)) {
            output.push(letter);
            continue;
        }

        if (letter === 'α' && next === 'ι') {
            output.push('e');
            i++;
            continue;
        }
        if (letter === 'ε' && next === 'ι') {
            output.push('i');
            i++;
            continue;
        }
        if (letter === 'ο' && next === 'ι') {
            output.push('i');
            i++;
            continue;
        }
        if (letter === 'ο' && next === 'υ') {
            output.push('u');
            i++;
            continue;
        }
        if (letter === 'υ' && next === 'ι') {
            output.push('i');
            i++;
            continue;
        }
        if (letter === 'α' && next === 'υ') {
            output.push(isGreekVoicelessConsonant(next2) ? 'af' : 'av');
            i++;
            continue;
        }
        if (letter === 'ε' && next === 'υ') {
            output.push(isGreekVoicelessConsonant(next2) ? 'ef' : 'ev');
            i++;
            continue;
        }
        if (letter === 'η' && next === 'υ') {
            output.push(isGreekVoicelessConsonant(next2) ? 'if' : 'iv');
            i++;
            continue;
        }
        if (letter === 'γ' && next === 'ι') {
            output.push('j');
            i++;
            continue;
        }
        if (letter === 'γ' && ['ε', 'η', 'ι', 'υ'].includes(next)) {
            output.push('j');
            continue;
        }
        if (letter === 'μ' && next === 'π') {
            output.push(atWordStart ? 'b' : 'mb');
            i++;
            continue;
        }
        if (letter === 'ν' && next === 'τ') {
            output.push(atWordStart ? 'd' : 'nd');
            i++;
            continue;
        }
        if (letter === 'γ' && next === 'γ') {
            output.push('ng');
            i++;
            continue;
        }
        if (letter === 'γ' && next === 'κ') {
            output.push(atWordStart ? 'g' : 'ng');
            i++;
            continue;
        }
        if (letter === 'γ' && next === 'χ') {
            output.push('nħ');
            i++;
            continue;
        }
        if (letter === 'γ' && next === 'ξ') {
            output.push('nks');
            i++;
            continue;
        }
        if (letter === 'τ' && next === 'σ') {
            output.push('ċ');
            i++;
            continue;
        }
        if (letter === 'τ' && next === 'ζ') {
            output.push('ġ');
            i++;
            continue;
        }

        switch (letter) {
            case 'α':
                output.push('a');
                break;
            case 'β':
                output.push('v');
                break;
            case 'γ':
                output.push('g');
                break;
            case 'δ':
                output.push('d');
                break;
            case 'ε':
                output.push('e');
                break;
            case 'ζ':
                output.push('z');
                break;
            case 'η':
                output.push('i');
                break;
            case 'θ':
                output.push('t');
                break;
            case 'ι':
                output.push('i');
                break;
            case 'κ':
            case 'ϰ':
                output.push('k');
                break;
            case 'λ':
                output.push('l');
                break;
            case 'μ':
                output.push('m');
                break;
            case 'ν':
                output.push('n');
                break;
            case 'ξ':
                output.push('ks');
                break;
            case 'ο':
                output.push('o');
                break;
            case 'π':
                output.push('p');
                break;
            case 'ρ':
            case 'ϱ':
                output.push('r');
                break;
            case 'σ':
            case 'ς':
            case 'ϲ':
                output.push('s');
                break;
            case 'τ':
                output.push('t');
                break;
            case 'υ':
                output.push('i');
                break;
            case 'φ':
            case 'ϕ':
                output.push('f');
                break;
            case 'χ':
                output.push('ħ');
                break;
            case 'ψ':
                output.push('ps');
                break;
            case 'ω':
                output.push('o');
                break;
            case 'ϐ':
                output.push('v');
                break;
            case 'ϑ':
                output.push('t');
                break;
            default:
                output.push(letter);
                break;
        }
    }

    return output.join('');
}

function isLatinVowel(letter: string) {
    return ['a', 'e', 'i', 'o', 'u'].includes(letter);
}

function transliterateItalianWord(word: string) {
    return transliterateLatinRomanceWord(word, 'italian');
}

function transliterateSicilianWord(word: string) {
    return transliterateLatinRomanceWord(word, 'sicilian');
}

function transliterateLatinRomanceWord(word: string, language: 'italian' | 'sicilian') {
    const plain = normalizeLatinRomanceWord(word);
    const output: string[] = [];

    for (let i = 0; i < plain.length; i++) {
        const letter = plain[i];
        const next = plain[i + 1] || '';
        const next2 = plain[i + 2] || '';
        const next3 = plain[i + 3] || '';
        const prev = plain[i - 1] || '';
        const prev2 = plain[i - 2] || '';
        const beforeVowel = isLatinVowel(next);
        const beforeFrontVowel = next === 'e' || next === 'i';
        const previousWasVowel = isLatinVowel(prev);
        const previousTwoWereVowels = isLatinVowel(prev) || isLatinVowel(prev2);

        if (/\s/.test(letter) || /[-.,;:!?/\\']/u.test(letter)) {
            output.push(letter);
            continue;
        }

        if (letter === 'g' && next === 'g' && next2 === 'h') {
            output.push('ġġ');
            i += 2;
            continue;
        }

        if (letter === 'c' && next === 'c' && next2 === 'h') {
            output.push('kk');
            i += 2;
            continue;
        }

        if (letter === 'g' && next === 'n') {
            output.push('nj');
            i++;
            continue;
        }

        if (letter === 'g' && next === 'l' && next2 === 'i') {
            output.push('lj');
            i += 2;
            continue;
        }

        if (letter === 'q' && next === 'u') {
            output.push('kw');
            i++;
            continue;
        }

        if (letter === 's' && next === 'c' && next2 === 'h') {
            output.push('sk');
            i += 2;
            continue;
        }

        if (letter === 's' && next === 'c' && next2 === 'i' && isLatinVowel(next3)) {
            output.push('x');
            i += 2;
            continue;
        }

        if (letter === 's' && next === 'c' && (next2 === 'e' || next2 === 'i')) {
            output.push('x');
            i += 1;
            continue;
        }

        if (letter === 'c' && next === 'h') {
            if (beforeFrontVowel) {
                output.push('k');
                i++;
                continue;
            }
        }

        if (letter === 'g' && next === 'h') {
            if (beforeFrontVowel) {
                output.push('g');
                i++;
                continue;
            }
        }

        if (letter === 'c' && beforeFrontVowel) {
            output.push(language === 'sicilian' ? 'x' : 'ċ');
            if (next === 'i' && isLatinVowel(next2)) {
                i++;
            }
            continue;
        }

        if (letter === 'g' && beforeFrontVowel) {
            output.push('ġ');
            if (next === 'i' && isLatinVowel(next2)) {
                i++;
            }
            continue;
        }

        if (letter === 'c' && beforeVowel && next === 'i' && isLatinVowel(next2)) {
            output.push(language === 'sicilian' ? 'x' : 'ċ');
            i++;
            continue;
        }

        if (letter === 'g' && beforeVowel && next === 'i' && isLatinVowel(next2)) {
            output.push('ġ');
            i++;
            continue;
        }

        if (letter === 's' && previousWasVowel && isLatinVowel(next) && !previousTwoWereVowels) {
            output.push('z');
            continue;
        }

        switch (letter) {
            case 'a':
            case 'e':
            case 'i':
            case 'o':
            case 'u':
                output.push(letter);
                break;
            case 'b':
            case 'd':
            case 'f':
            case 'h':
            case 'j':
            case 'k':
            case 'l':
            case 'm':
            case 'n':
            case 'p':
            case 'r':
            case 't':
            case 'v':
                output.push(letter);
                break;
            case 'c':
                output.push('k');
                break;
            case 'g':
                output.push('g');
                break;
            case 's':
                output.push('s');
                break;
            case 'z':
                output.push('z');
                break;
            case 'x':
                output.push('ks');
                break;
            case 'y':
                output.push('j');
                break;
            case 'w':
                output.push('w');
                break;
            case 'ç':
                output.push('ċ');
                break;
            default:
                output.push(letter);
                break;
        }
    }

    return output.join('');
}

const TIFINAGH_MAP: Record<string, string> = {
    'ⴰ': 'a',
    'ⴱ': 'b',
    'ⴲ': 'v',
    'ⴳ': 'g',
    'ⴴ': 'gh',
    'ⴵ': 'ġ',
    'ⴶ': 'ż',
    'ⴷ': 'd',
    'ⴸ': 'd',
    'ⴹ': 'd',
    'ⴻ': 'e',
    'ⴼ': 'f',
    'ⴽ': 'k',
    'ⴾ': 'q',
    'ⴿ': 'ħ',
    'ⵀ': 'h',
    'ⵁ': 'ḥ',
    'ⵂ': 'h',
    'ⵃ': 'ħ',
    'ⵄ': 'għ',
    'ⵅ': 'ħ',
    'ⵆ': 'q',
    'ⵇ': 'q',
    'ⵉ': 'i',
    'ⵊ': 'ġ',
    'ⵋ': 'ġ',
    'ⵌ': 'ny',
    'ⵍ': 'l',
    'ⵎ': 'm',
    'ⵏ': 'n',
    'ⵐ': 'nn',
    'ⵑ': 'ng',
    'ⵒ': 'p',
    'ⵓ': 'u',
    'ⵔ': 'r',
    'ⵕ': 'r',
    'ⵖ': 'għ',
    'ⵗ': 'għ',
    'ⵘ': 'għ',
    'ⵙ': 's',
    'ⵚ': 's',
    'ⵛ': 'x',
    'ⵜ': 't',
    'ⵝ': 't',
    'ⵞ': 'ċ',
    'ⵟ': 't',
    'ⵠ': 'v',
    'ⵡ': 'w',
    'ⵢ': 'y',
    'ⵣ': 'ż',
    'ⵤ': 'ż',
    'ⵥ': 'ż',
    'ⵯ': 'w',
};

function transliterateTifinaghWord(word: string) {
    const normalized = normalizeText(word);
    const output: string[] = [];

    for (const char of Array.from(normalized)) {
        output.push(TIFINAGH_MAP[char] ?? char);
    }

    return output.join('');
}

function transliterateArabicWord(word: string) {
    const clusters = splitArabicClusters(normalizeArabicWord(word));
    const output: string[] = [];
    let lastVowelIndex = -1;
    let lastVowelKind: 'a' | 'i' | 'u' | null = null;

    const push = (segment: string) => {
        output.push(segment);
    };

    const emitVowel = (kind: 'a' | 'i' | 'u') => {
        output.push(kind);
        lastVowelIndex = output.length - 1;
        lastVowelKind = kind;
    };

    const lengthenLastVowel = (kind: 'a' | 'i' | 'u') => {
        if (lastVowelIndex < 0 || lastVowelKind !== kind) return false;

        output[lastVowelIndex] = kind === 'a' ? 'â' : kind === 'i' ? 'î' : 'û';
        lastVowelKind = kind;
        return true;
    };

    for (const [index, cluster] of clusters.entries()) {
        const letter = baseLetter(cluster);
        const isShadda = hasMark(cluster, '\u0651');
        const isSukun = hasMark(cluster, '\u0652');
        const hasFatha = hasMark(cluster, '\u064E');
        const hasDamma = hasMark(cluster, '\u064F');
        const hasKasra = hasMark(cluster, '\u0650');
        const hasTanwinF = hasMark(cluster, '\u064B');
        const hasTanwinD = hasMark(cluster, '\u064C');
        const hasTanwinK = hasMark(cluster, '\u064D');

        if (!letter) continue;

        if (isAlifLetter(letter)) {
            if (lengthenLastVowel('a')) continue;
            push(index === 0 ? 'a' : 'â');
            lastVowelKind = 'a';
            continue;
        }

        if (isWawLetter(letter) && !hasFatha && !hasDamma && !hasKasra && !isSukun) {
            if (lengthenLastVowel('u')) continue;
            push(index === 0 ? 'w' : 'û');
            lastVowelKind = 'u';
            continue;
        }

        if (isYaLetter(letter) && !hasFatha && !hasDamma && !hasKasra && !isSukun) {
            if (lengthenLastVowel('i')) continue;
            push(index === 0 ? 'y' : 'î');
            lastVowelKind = 'i';
            continue;
        }

        const mapped = mapArabicConsonant(letter);
        if (mapped) {
            push(mapped);
        }

        if (isShadda && mapped) {
            push(mapped);
        }

        if (hasTanwinF) {
            push('an');
            lastVowelIndex = output.length - 1;
            lastVowelKind = 'a';
            continue;
        }
        if (hasTanwinD) {
            push('un');
            lastVowelIndex = output.length - 1;
            lastVowelKind = 'u';
            continue;
        }
        if (hasTanwinK) {
            push('in');
            lastVowelIndex = output.length - 1;
            lastVowelKind = 'i';
            continue;
        }

        if (hasFatha) {
            emitVowel('a');
        } else if (hasDamma) {
            emitVowel('u');
        } else if (hasKasra) {
            emitVowel('i');
        } else if (!isSukun && !isArabicCarrierLetter(letter) && mapped) {
            lastVowelIndex = -1;
            lastVowelKind = null;
        }
    }

    return output.join('');
}

function transliterateSupportedForeignWord(word: string) {
    if (isArabicText(word)) return transliterateArabicWord(word);
    if (isGreekText(word)) return transliterateGreekWord(word);
    if (isTifinaghText(word)) return transliterateTifinaghWord(word);
    return word;
}

function tokeniseLatinPronunciation(text: string) {
    const tokens: Array<{ type: 'v' | 'c' | 'sep'; value: string }> = [];
    const normalized = text.normalize('NFC');

    for (let i = 0; i < normalized.length; i++) {
        const pair = normalized.slice(i, i + 2);
        if (pair === 'għ') {
            tokens.push({ type: 'c', value: pair });
            i++;
            continue;
        }

        if (pair.length === 2 && LATIN_VOWELS.has(pair[0].toLowerCase()) && pair[0].toLowerCase() === pair[1].toLowerCase()) {
            tokens.push({ type: 'v', value: pair });
            i++;
            continue;
        }

        const char = normalized[i];

        if (LATIN_VOWELS.has(char.toLowerCase())) {
            tokens.push({ type: 'v', value: char });
        } else if (/\s/.test(char) || /[.,;:!?/\\-]/.test(char)) {
            tokens.push({ type: 'sep', value: char });
        } else {
            tokens.push({ type: 'c', value: char });
        }
    }

    return tokens;
}

function hyphenateLatinPronunciation(text: string) {
    return text
        .split(/(\s+)/)
        .map((part) => {
            if (!part.trim()) return part;

            const tokens = tokeniseLatinPronunciation(part);
            const syllables: string[] = [];
            let current = '';

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (token.type === 'sep') {
                    if (current) {
                        syllables.push(current);
                        current = '';
                    }
                    syllables.push(token.value);
                    continue;
                }

                if (token.type === 'c') {
                    current += token.value;
                    continue;
                }

                current += token.value;

                let j = i + 1;
                let consonants = '';
                while (j < tokens.length && tokens[j].type === 'c') {
                    consonants += tokens[j].value;
                    j++;
                }

                if (j >= tokens.length) {
                    current += consonants;
                    syllables.push(current);
                    current = '';
                    break;
                }

                if (!consonants) {
                    syllables.push(current);
                    current = '';
                    continue;
                }

                if (consonants.length === 1) {
                    syllables.push(current);
                    current = consonants;
                } else {
                    current += consonants.slice(0, -1);
                    syllables.push(current);
                    current = consonants.slice(-1);
                }

                i = j - 1;
            }

            if (current) syllables.push(current);

            return syllables.join('-');
        })
        .join('')
        .replace(/-+/g, '-')
        .replace(/\s+-\s+/g, ' ')
        .replace(/-/g, '');
}

export function transliterateArabicToMaltesePronunciation(value: string) {
    const trimmed = normalizeText(value);
    if (!trimmed) return '';

    const words = trimmed.split(/(\s+)/);
    const transliterated = words.map((part) => {
        if (!part.trim()) return part;
        return transliterateArabicText(part);
    }).join('');

    return hyphenateLatinPronunciation(transliterated);
}

function transliterateArabicText(part: string) {
    return isArabicText(part) ? transliterateArabicWord(part) : part;
}

function transliterateSupportedLatinWord(part: string, language: string) {
    if (isItalianLanguage(language)) return transliterateItalianWord(part);
    if (isSicilianLanguage(language)) return transliterateSicilianWord(part);
    return part;
}

function transliterateForeignScriptText(value: string, language?: string) {
    const trimmed = normalizeText(value);
    if (!trimmed) return '';
    const normalizedLanguage = normalizeLanguage(language);
    const supportsLatinLanguage = isItalianLanguage(normalizedLanguage) || isSicilianLanguage(normalizedLanguage);

    const words = trimmed.split(/(\s+)/);
    let sawSupportedScript = supportsLatinLanguage && /\p{L}/u.test(trimmed);

    const transliterated = words.map((part) => {
        if (!part.trim()) return part;

        const mappedArabic = transliterateArabicText(part);
        const mappedForeignScript = mappedArabic !== part
            ? mappedArabic
            : transliterateSupportedForeignWord(part);
        const mapped = mappedForeignScript !== part
            ? mappedForeignScript
            : transliterateSupportedLatinWord(part, normalizedLanguage);

        if (mapped !== part) sawSupportedScript = true;
        return mapped;
    }).join('');

    return sawSupportedScript ? hyphenateLatinPronunciation(transliterated) : '';
}

export function generateForeignScriptPronunciation(input: PronunciationInput) {
    const candidates = [input.script, input.term].map(normalizeText).filter(Boolean);

    for (const candidate of candidates) {
        const pronunciation = transliterateForeignScriptText(candidate, input.language);
        if (pronunciation) {
            return pronunciation;
        }
    }

    return '';
}

export {
    transliterateItalianWord as transliterateItalianToMaltesePronunciation,
    transliterateSicilianWord as transliterateSicilianToMaltesePronunciation,
    transliterateGreekWord as transliterateGreekToMaltesePronunciation,
    transliterateTifinaghWord as transliterateBerberToMaltesePronunciation,
};
