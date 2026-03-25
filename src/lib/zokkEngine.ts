import type { 
    VerbConjugationTable, 
    ConjugationRow, 
    ZokkMorphology
} from "@/types";

/**
 * zokkEngine.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Linear Morphology Engine (The Zokk System) for Romance and English stems.
 * Handles concatenative suffixation for -ar and -ir classes, including
 * English loans with J-epenthesis and hybrid Semitic reanalysis.
 */

export interface ZokkResult {
    conjugation?: VerbConjugationTable;
    passive_participle?: {
        masc: string;
        fem: string;
        plural: string;
        semitic?: string;
    };
    agentive?: {
        masc: string;
        fem: string;
        plural: string;
    };
    verbal_noun?: string;
    hybrid_forms?: {
        semitic_passive_participle?: string;
        semitic_verbal_noun?: string;
        form_ii?: string;
    };
}

/**
 * Detects if a stem ends in a vowel and applies J-epenthesis if needed.
 */
function applyStem(stem: string): string {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y']; // include y for english
    const cleanStem = stem.replace(/-$/, '');
    const lastChar = cleanStem.charAt(cleanStem.length - 1).toLowerCase();
    
    // If the stem ends in a vowel, apply J-epenthesis
    if (vowels.includes(lastChar)) {
        return cleanStem + 'j';
    }
    return cleanStem;
}

function extractConsonants(s: string): string[] {
    // We treat standard vowels as things to strip for root reanalysis
    const res = s.split('').filter(c => !['a','e','i','o','u','â','ê','î','ô','û'].includes(c.toLowerCase()));
    return res;
}

/**
 * Generates all morphological forms for a Zokk (stem).
 */
export function generateZokkForms(zokk: ZokkMorphology): ZokkResult {
    const { stem_string, class_type, is_hybrid, agentive_suffix, root } = zokk;
    const base = applyStem(stem_string);
    
    const isAr = class_type === 'ar';
    
    // 1. Conjugation Table
    const rows: ConjugationRow[] = [];
    const persons = [
        { id: "1s", mt: "jiena", en: "I" },
        { id: "2s", mt: "inti", en: "you (sg.)" },
        { id: "3ms", mt: "huwa", en: "he" },
        { id: "3fs", mt: "hija", en: "she" },
        { id: "1p", mt: "aħna", en: "we" },
        { id: "2p", mt: "intom", en: "you (pl.)" },
        { id: "3p", mt: "huma", en: "they" },
    ];

    const prefixes = ["n", "t", "j", "t", "n", "t", "j"];

    for (let i = 0; i < 7; i++) {
        const p = persons[i];
        let perfect = '';
        let imperfect = '';
        
        // Perfect (Past)
        if (i === 0 || i === 1) { // 1s, 2s
            perfect = base + (isAr ? 'ajt' : 'ejt');
        } else if (i === 2) { // 3ms
            perfect = base + 'a';
        } else if (i === 3) { // 3fs
            perfect = base + (isAr ? 'at' : 'iet');
        } else if (i === 4) { // 1p
            perfect = base + (isAr ? 'ajna' : 'ejna');
        } else if (i === 5) { // 2p
            perfect = base + (isAr ? 'ajtu' : 'ejtu');
        } else if (i === 6) { // 3p
            perfect = base + (isAr ? 'aw' : 'ew');
        }

        // Imperfect (Present)
        const pfx = prefixes[i];
        if (i < 4) { // Sg
            imperfect = pfx + base + (isAr ? 'a' : 'i');
        } else { // Pl
            imperfect = pfx + base + (isAr ? 'aw' : 'u');
        }

        rows.push({
            person_mt: p.id,
            person_en: p.en,
            perfect,
            imperfect,
            stems: {
                impfType1: imperfect, 
                impfType2: imperfect,
                perfType1: perfect,
                perfType2: perfect
            }
        });
    }

    const conjugation: VerbConjugationTable = {
        rows,
        imperative_sg: base + (isAr ? 'a' : 'i'),
        imperative_pl: base + (isAr ? 'aw' : 'u')
    };

    // 2. Passive Participle
    const pp_masc = base + (isAr ? 'at' : 'it');
    const pp_fem = base + (isAr ? 'ata' : 'ita');
    const pp_pl = base + (isAr ? 'ati' : 'iti');

    // 3. Agentive
    let ag_masc = '';
    let ag_fem = '';
    let ag_pl = '';

    const ag_sfx = agentive_suffix || (isAr ? 'ant' : 'ent');
    if (ag_sfx.startsWith('ant') || ag_sfx.startsWith('ent')) {
        ag_masc = base + ag_sfx;
        ag_fem = base + ag_sfx + 'a';
        ag_pl = base + ag_sfx + 'i';
    } else if (ag_sfx.includes('tur')) {
        ag_masc = base + ag_sfx;
        ag_fem = base + (isAr ? 'atriċi' : 'itriċi');
        ag_pl = base + (isAr ? 'aturi' : 'ituri');
    } else {
        ag_masc = base + ag_sfx;
    }

    // 4. Verbal Noun
    const verbal_noun = base + (isAr ? 'ar' : 'ir');

    // 5. Hybrid Forms
    const result: ZokkResult = {
        conjugation,
        passive_participle: {
            masc: pp_masc,
            fem: pp_fem,
            plural: pp_pl
        },
        agentive: {
            masc: ag_masc,
            fem: ag_fem,
            plural: ag_pl
        },
        verbal_noun
    };

    if (is_hybrid) {
        // Reanalysis: kanta -> [k, n, t] -> k-n-t-j
        const cons = root ? root.split('-') : [...extractConsonants(base), 'j'];
        
        if (cons.length >= 4) {
            const pp_sem = `m${base}`;
            result.hybrid_forms = {
                semitic_passive_participle: pp_sem,
                form_ii: `t${base}a`
            };
            
            if (result.passive_participle) {
                result.passive_participle.semitic = `*${pp_sem}`;
            }
        }
    }

    return result;
}
