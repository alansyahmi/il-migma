const fs = require('fs');
const path = 'src/types/index.ts';
let content = fs.readFileSync(path, 'utf8');

// The file is currently corrupted between AdjectiveMorphology and NumeralMorphology.
// I need to find AdjectiveMorphology start and ParticipleMorphology start.

const adjStart = content.indexOf('export interface AdjectiveMorphology');
const numeralStart = content.indexOf('export interface NumeralMorphology');

if (adjStart !== -1 && numeralStart !== -1) {
    const restoredSection = `export interface AdjectiveMorphology {
    id?: string;
    entry_id?: string;
    gender?: string;
    is_inflectable?: boolean;
    form_masc?: string;
    form_fem?: string;
    plural_form?: string | string[];
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    vowel_set_opp?: string;
    vowel_set_dual?: string;
    lemma_pattern?: string;
    form_fem_pattern?: string;
    form_masc_pattern?: string;
    form_plural_pattern?: string;
    dual_form?: string;
    dual_pattern?: string;
    diminutive_form?: string;
    diminutive_pattern?: string;
    elative_form?: string;
    elative_pattern?: string;
    source_citation?: string;
    diminutives?: EntryDiminutive[];
    related_entries?: any[];
    synonyms?: any[];
    antonyms?: any[];
    pattern?: string;
}

export interface ParticipleMorphology {
    id: string;
    entry_id: string;
    participle_type: string;
    gender: string;
    is_inflectable?: boolean;
    vowel_set_sg?: string;
    vowel_set_pl?: string;
    vowel_set_opp?: string;
    vowel_set_dual?: string;
    lemma_pattern?: string;
    form_fem?: string;
    form_fem_pattern?: string;
    form_masc?: string;
    form_masc_pattern?: string;
    form_plural_pattern?: string;
    dual_form?: string;
    dual_pattern?: string;
    diminutive_form?: string;
    diminutive_pattern?: string;
    elative_form?: string;
    elative_pattern?: string;
    source_citation?: string;
    related_entries?: any[];
    synonyms?: any[];
    antonyms?: any[];
}

`;
    content = content.substring(0, adjStart) + restoredSection + content.substring(numeralStart);
    fs.writeFileSync(path, content);
    console.log('Restored AdjectiveMorphology and ParticipleMorphology.');
} else {
    console.error('Could not find markers for restoration.');
}
