import assert from 'node:assert/strict';
import {
    normalizeEntryDefinitions,
    normalizeEntryEtymologyChain,
    normalizeRootEtymologyChain,
    normalizeStemEtymologyChain,
} from '../src/lib/adminUtils.ts';
import {
    buildEntryPayload,
    buildRootPayload,
    buildStemPayload,
    entryPosHasNativeVowelSets,
} from '../src/lib/adminSchema.ts';
import { entryToForm } from '../src/lib/entryAdapter.ts';
import {
    formatEtymologyConnector,
    formatEtymologySentenceLeadIn,
    isConjunctiveEtymologyRelationship,
    normalizeDictionaryEtymologyChain as normalizeDisplayEtymologyChain,
    normalizeDictionaryEtymologyChainForDisplay as normalizeDisplayEtymologyChainWithPronunciation,
} from '../src/components/dictionary/etymology.ts';

const assertEq = (actual, expected, message) => {
    assert.deepStrictEqual(actual, expected, message);
};

const assertHasKeys = (value, keys, message) => {
    assertEq(Object.keys(value).sort(), keys.sort(), message);
};

const run = () => {
    const rootSource = [{
        relationship: 'Borrowed from',
        language: 'Arabic',
        term: 'kataba',
        pronunciation: 'ka-ta-ba',
        definition: 'to write',
    }];
    const normalizedRoot = normalizeRootEtymologyChain(rootSource);
    assertEq(normalizedRoot[0], {
        relationship: 'Borrowed from',
        language: 'Arabic',
        term: 'kataba',
        definition: 'to write',
    }, 'root normalization should strip pronunciation');
    assertHasKeys(normalizedRoot[0], ['definition', 'language', 'relationship', 'term'], 'root normalization should only keep four keys');

    const rootPayload = buildRootPayload({
        id: 'root-1',
        consonants: 'k-t-b',
        glosses: [{ en: 'to write', mt: '' }],
        etymology: rootSource,
        source: '',
        strength: 'strong',
        weak_class: '',
        vowel_set_perf: 'a-a',
        vowel_set_impf: 'i-a',
        vowel_set_imp: 'i-a',
        tags: '',
        synonyms: [],
        antonyms: [],
        related_entries: [],
    });
    assertEq(JSON.parse(rootPayload.etymology), normalizedRoot, 'root payload should persist the normalized four-field chain');

    const stemSource = [{
        relationship: 'From',
        language: 'Latin',
        term: 'scribere',
        pronunciation: 'skri-be-re',
        definition: 'to write',
    }];
    const normalizedStem = normalizeStemEtymologyChain(stemSource);
    assertEq(normalizedStem[0], {
        relationship: 'From',
        language: 'Latin',
        term: 'scribere',
        definition: 'to write',
    }, 'stem normalization should strip pronunciation');
    assertHasKeys(normalizedStem[0], ['definition', 'language', 'relationship', 'term'], 'stem normalization should only keep four keys');

    const stemPayload = buildStemPayload({
        stem_string: 'scrib',
        class_type: 'ar',
        is_hybrid: false,
        root: null,
        agentive_suffix: null,
        tags: '',
        source: '',
        glosses: [{ en: 'to write', mt: '' }],
        etymology: stemSource,
        synonyms: [],
        antonyms: [],
        related_stems: [],
    });
    assertEq(JSON.parse(stemPayload.etymology), normalizedStem, 'stem payload should persist the normalized four-field chain');

    const legacyEntry = [{
        language: 'Arabic',
        form: 'kataba',
        meaning: 'to write',
    }];
    const normalizedLegacyEntry = normalizeEntryEtymologyChain(legacyEntry);
    assertEq(normalizedLegacyEntry[0], {
        relationship: 'From',
        language: 'Arabic',
        term: 'kataba',
        pronunciation: '',
        definition: 'to write',
    }, 'legacy entry etymology should normalize to the five-field shape');

    const legacyEntryWithScript = [{
        language: 'Arabic',
        form: 'كَتَبَ',
        meaning: 'to write',
        script: 'كَتَبَ',
    }];
    const normalizedLegacyEntryWithScript = normalizeEntryEtymologyChain(legacyEntryWithScript);
    assertEq(normalizedLegacyEntryWithScript[0], {
        relationship: 'From',
        language: 'Arabic',
        term: 'كَتَبَ',
        pronunciation: '',
        definition: 'to write',
        script: 'كَتَبَ',
    }, 'legacy entry etymology should preserve Arabic script when supplied');

    const entryPayload = buildEntryPayload({
        id: 'entry-1',
        headword: 'kataba',
        pos: 'noun',
        etymology_chain: [{
            relationship: 'From',
            language: 'Arabic',
            term: 'kataba',
            pronunciation: 'ka-ta-ba',
            definition: 'to write',
        }],
        definitions: [],
        phonetics: [],
        tags: '',
        source_language: '',
        source_citation: '',
        synonyms: [],
        antonyms: [],
        related_entries: [],
        alternative_forms: [],
        is_loanword: false,
        cv_pattern: '',
        form_masc_pattern: '',
        form_fem_pattern: '',
        form_plural_pattern: '',
        gender: 'masculine',
        is_inflectable: true,
    });
    assertEq(entryPayload.etymology_chain, [{
        relationship: 'From',
        language: 'Arabic',
        term: 'kataba',
        pronunciation: 'ka-ta-ba',
        definition: 'to write',
    }], 'entry payload should preserve pronunciation');

    const entryPayloadWithScript = buildEntryPayload({
        id: 'entry-1b',
        headword: 'kataba',
        pos: 'noun',
        etymology_chain: [{
            relationship: 'From',
            language: 'Arabic',
            term: 'كَتَبَ',
            pronunciation: 'ka-ta-ba',
            definition: 'to write',
            script: 'كَتَبَ',
        }],
        definitions: [],
        phonetics: [],
        tags: '',
        source_language: '',
        source_citation: '',
        synonyms: [],
        antonyms: [],
        related_entries: [],
        alternative_forms: [],
        is_loanword: false,
        cv_pattern: '',
        form_masc_pattern: '',
        form_fem_pattern: '',
        form_plural_pattern: '',
        gender: 'masculine',
        is_inflectable: true,
    });
    assertEq(entryPayloadWithScript.etymology_chain, [{
        relationship: 'From',
        language: 'Arabic',
        term: 'كَتَبَ',
        pronunciation: 'ka-ta-ba',
        definition: 'to write',
        script: 'كَتَبَ',
    }], 'entry payload should preserve Arabic script when supplied');

    const displayArabicAuto = normalizeDisplayEtymologyChainWithPronunciation([{
        relationship: 'From',
        language: 'Arabic',
        term: 'كَتَبَ',
        definition: 'to write',
    }]);
    assertEq(displayArabicAuto[0].pronunciation, 'kataba', 'display etymology normalization should synthesize missing Arabic pronunciation');

    const displayItalianAuto = normalizeDisplayEtymologyChainWithPronunciation([{
        relationship: 'From',
        language: 'Italian',
        term: 'cena',
        definition: 'dinner',
    }]);
    assertEq(displayItalianAuto[0].pronunciation, 'ċena', 'display etymology normalization should synthesize missing Italian pronunciation');

    const displayItalianRedundant = normalizeDisplayEtymologyChainWithPronunciation([{
        relationship: 'From',
        language: 'Italian',
        term: 'abbondanza',
        definition: 'abundance',
    }]);
    assertEq(displayItalianRedundant[0].pronunciation, undefined, 'display etymology normalization should suppress redundant auto-generated pronunciation');

    const displayStoredPronunciation = normalizeDisplayEtymologyChainWithPronunciation([{
        relationship: 'From',
        language: 'Arabic',
        term: 'كَتَبَ',
        pronunciation: 'ka-ta-ba',
        definition: 'to write',
    }]);
    assertEq(displayStoredPronunciation[0].pronunciation, 'ka-ta-ba', 'display etymology normalization should keep stored pronunciation values');

    const displayStoredRedundant = normalizeDisplayEtymologyChainWithPronunciation([{
        relationship: 'From',
        language: 'Italian',
        term: 'abbondanza',
        pronunciation: 'abbondanza',
        definition: 'abundance',
    }]);
    assertEq(displayStoredRedundant[0].pronunciation, undefined, 'display etymology normalization should suppress stored pronunciations that repeat the term verbatim');

    const stemDisplayAuto = normalizeDisplayEtymologyChainWithPronunciation(
        normalizeStemEtymologyChain([{
            relationship: 'From',
            language: 'Arabic',
            term: 'كَتَبَ',
            definition: 'to write',
        }]),
    );
    assertEq(stemDisplayAuto[0].pronunciation, 'kataba', 'stem-style etymology should still synthesize pronunciation for display after stem normalization strips it');

    const semicolonDefinitions = normalizeEntryDefinitions([{
        text_en: 'alas; woe to me',
        text_mt: 'aħas; gwaj għalija',
        register: 'informal',
    }]);
    assertEq(semicolonDefinitions, [
        { text_en: 'alas', text_mt: 'aħas', register: 'informal', nuance: '' },
        { text_en: 'woe to me', text_mt: 'gwaj għalija', register: 'informal', nuance: '' },
    ], 'semicolon definitions should split into separate senses');

    const splitPayload = buildEntryPayload({
        id: 'entry-2',
        headword: 'alas',
        pos: 'noun',
        definitions: [{
            text_en: 'alas; woe to me',
            text_mt: 'aħas; gwaj għalija',
            register: 'informal',
            nuance: '',
        }],
        etymology_chain: [],
        phonetics: [],
        tags: '',
        source_language: '',
        source_citation: '',
        synonyms: [],
        antonyms: [],
        related_entries: [],
        alternative_forms: [],
        is_loanword: false,
        cv_pattern: '',
        form_masc_pattern: '',
        form_fem_pattern: '',
        form_plural_pattern: '',
        gender: 'masculine',
        is_inflectable: true,
    });
    assertEq(splitPayload.definitions, [
        { text_en: 'alas', text_mt: 'aħas', register: 'informal', nuance: '' },
        { text_en: 'woe to me', text_mt: 'gwaj għalija', register: 'informal', nuance: '' },
    ], 'entry payload should split semicolon-separated senses');

    assertEq(entryPosHasNativeVowelSets('noun'), true, 'noun should keep native vowel-set UI');
    assertEq(entryPosHasNativeVowelSets('verb'), false, 'verb should rely on the stem-led vowel-set block');

    const stemLoadedForm = entryToForm({
        id: 'entry-3',
        headword: 'servi',
        pos: 'verb',
        is_loanword: true,
        vowel_set_sg: 'i-a',
        vowel_set_pl: 'i-ie',
        vowel_set_opp: 'e-a',
        vowel_set_dual: 'i-e',
        verb_vowel_perf: 'i-a',
        verb_vowel_impf: 'u-a',
        verb_vowel_impv: 'i-u',
        zokk_morphology: {
            stem_string: 'serv',
            class_type: 'ir',
            is_hybrid: true,
            root: 's-r-v-j',
            agentive_suffix: 'ant',
        },
    });
    assertEq(stemLoadedForm.vowel_set_sg, 'i-a', 'stem-loaded entry should preserve singular vowel set in form state');
    assertEq(stemLoadedForm.vowel_set_pl, 'i-ie', 'stem-loaded entry should preserve plural vowel set in form state');
    assertEq(stemLoadedForm.verb_vowel_perf, 'i-a', 'stem-loaded verb should preserve perfect vowel set in form state');
    assertEq(stemLoadedForm.verb_vowel_impf, 'u-a', 'stem-loaded verb should preserve imperfect vowel set in form state');
    assertEq(stemLoadedForm.verb_vowel_impv, 'i-u', 'stem-loaded verb should preserve imperative vowel set in form state');
    assertEq(stemLoadedForm.zokk_stem, 'serv', 'stem-loaded entry should preserve stem morphology in form state');

    const stemEntryPayload = buildEntryPayload({
        id: 'entry-4',
        headword: 'servi',
        pos: 'verb',
        definitions: [],
        etymology_chain: [],
        phonetics: [],
        tags: '',
        source_language: '',
        source_citation: '',
        synonyms: [],
        antonyms: [],
        related_entries: [],
        alternative_forms: [],
        is_loanword: true,
        zokk_stem: 'serv',
        zokk_class: 'ir',
        zokk_is_hybrid: true,
        zokk_root: 's-r-v-j',
        zokk_agentive_suffix: 'ant',
        vowel_set_sg: 'i-a',
        vowel_set_pl: 'i-ie',
        vowel_set_opp: 'e-a',
        vowel_set_dual: 'i-e',
        verb_vowel_perf: 'i-a',
        verb_vowel_impf: 'u-a',
        verb_vowel_impv: 'i-u',
    });
    assertEq(stemEntryPayload.vowel_set_sg, 'i-a', 'stem-led payload should keep singular vowel set');
    assertEq(stemEntryPayload.vowel_set_pl, 'i-ie', 'stem-led payload should keep plural vowel set');
    assertEq(stemEntryPayload.vowel_set_opp, 'e-a', 'stem-led payload should keep opposite-gender vowel set');
    assertEq(stemEntryPayload.vowel_set_dual, 'i-e', 'stem-led payload should keep dual vowel set');
    assertEq(stemEntryPayload.verb_vowel_perf, 'i-a', 'stem-led verb payload should keep perfect vowel set');
    assertEq(stemEntryPayload.verb_vowel_impf, 'u-a', 'stem-led verb payload should keep imperfect vowel set');
    assertEq(stemEntryPayload.verb_vowel_impv, 'i-u', 'stem-led verb payload should keep imperative vowel set');
    assertEq(JSON.parse(stemEntryPayload.zokk_morphology).stem_string, 'serv', 'stem-led payload should keep zokk morphology');

    const displayChain = normalizeDisplayEtymologyChain([{
        relationship: 'Borrowed from',
        language: 'Arabic',
        term: 'kataba',
        pronunciation: 'ka-ta-ba',
        definition: 'to write',
    }], (language) => language);
    assertEq(displayChain[0], {
        relationship: 'Borrowed from',
        language: 'Arabic',
        term: 'kataba',
        pronunciation: 'ka-ta-ba',
        definition: 'to write',
        form: 'kataba',
        meaning: 'to write',
        script: undefined,
        time_period: undefined,
    }, 'display helper should keep the new four-field root/stem data');

    const legacyDisplayChain = normalizeDisplayEtymologyChain([{
        language: 'Arabic',
        form: 'kataba',
        meaning: 'to write',
        script: 'كتب',
        time_period: 'Classical',
    }], (language) => language);
    assertEq(legacyDisplayChain[0], {
        relationship: undefined,
        language: 'Arabic',
        term: 'kataba',
        pronunciation: undefined,
        definition: 'to write',
        form: 'kataba',
        meaning: 'to write',
        script: 'كتب',
        time_period: 'Classical',
    }, 'display helper should still normalize legacy entry etymology data');

    assertEq(isConjunctiveEtymologyRelationship('or'), true, 'conjunctive relationships should be detected');
    assertEq(formatEtymologyConnector('or'), 'or', 'conjunctive relationships should render as lowercase joiners');
    assertEq(
        formatEtymologySentenceLeadIn('from', 'or'),
        'from',
        'a conjunctive first relationship should not replace the lead-in'
    );
};

run();
console.log('etymologyContract tests passed');
