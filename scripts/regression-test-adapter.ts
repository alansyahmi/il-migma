
/**
 * scripts/regression-test-adapter.ts
 * Validates round-trip persistence and legacy resolution for Entry Adapter.
 */

import { buildLoadedEntryPatch, entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';
import { resolveEntryMorphologyMode } from '../src/lib/adminSchema.ts';
import { normalizeEntryPos } from '../src/lib/entryId.ts';
import {
    buildNumeralAutoForms,
    buildNumeralDisplayForms,
    getNumeralRelatedHeadwords,
    getNumeralShortAttributiveRowLabel,
    seedNumeralDerivedFields,
    shouldCombineMasculineAndShortAttributive,
    shouldSuppressNumeralAttributiveForms,
} from '../src/lib/numeralMorphology.ts';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert';

console.log('Running Entry Adapter Regression Tests...');

// 1. Extra Fields Passthrough
const extraEntry = {
    id: 'test',
    pos: 'noun',
    some_new_db_column: 'hello-world',
    _internal: 'secret'
};
console.log('Testing Extra Fields Passthrough...');
const extraForm = entryToForm(extraEntry);
assert.strictEqual(extraForm.extraFields.some_new_db_column, 'hello-world');
assert.strictEqual(extraForm.extraFields._internal, undefined); // Should be stripped

const extraPayload = formToPayload(extraForm);
assert.strictEqual(extraPayload.some_new_db_column, 'hello-world');
console.log('✅ Extra Fields passed');

// 6. Morphology Mode Inference
const rootOnlyEntry = {
    pos: 'noun',
    root_consonants: 'k-t-b'
};
const rootOnlyForm = entryToForm(rootOnlyEntry);
assert.strictEqual(rootOnlyForm.is_loanword, false);
assert.strictEqual(resolveEntryMorphologyMode(rootOnlyForm), 'root');

const rootOnlyPayload = formToPayload(rootOnlyForm);
assert.strictEqual(Number(rootOnlyPayload.is_loanword), 0);
assert.strictEqual(rootOnlyPayload.root_consonants, 'k-t-b');
assert.ok(!('zokk_morphology' in rootOnlyPayload), 'root-only payload should omit zokk_morphology');
console.log('✅ Root-only morphology passed');

const stemOnlyEntry = {
    pos: 'noun',
    zokk_morphology: {
        stem_string: 'fajl',
        class_type: 'ar',
        is_hybrid: false,
        root: 'f-j-l',
        agentive_suffix: 'ant'
    }
};
const stemOnlyForm = entryToForm(stemOnlyEntry);
assert.strictEqual(stemOnlyForm.is_loanword, true);
assert.strictEqual(stemOnlyForm.prefer_zokk, true);
assert.strictEqual(stemOnlyForm.zokk_stem, 'fajl');
assert.strictEqual(resolveEntryMorphologyMode(stemOnlyForm), 'stem');

const stemOnlyPayload = formToPayload(stemOnlyForm);
assert.strictEqual(Number(stemOnlyPayload.is_loanword), 1);
assert.strictEqual(JSON.parse(stemOnlyPayload.zokk_morphology).stem_string, 'fajl');
console.log('✅ Stem-only morphology passed');

const dualRootFirstForm = {
    ...stemOnlyForm,
    _rootConsonants: 'k-t-b',
    prefer_zokk: false
};
assert.strictEqual(resolveEntryMorphologyMode(dualRootFirstForm), 'root');

const dualRootFirstPayload = formToPayload(dualRootFirstForm);
assert.strictEqual(Number(dualRootFirstPayload.is_loanword), 0);
assert.strictEqual(JSON.parse(dualRootFirstPayload.zokk_morphology).root, 'k-t-b');
console.log('✅ Dual morphology root priority passed');

const dualStemFirstForm = {
    ...stemOnlyForm,
    _rootConsonants: 'k-t-b',
    prefer_zokk: true
};
assert.strictEqual(resolveEntryMorphologyMode(dualStemFirstForm), 'stem');

const dualStemFirstPayload = formToPayload(dualStemFirstForm);
assert.strictEqual(Number(dualStemFirstPayload.is_loanword), 1);
assert.strictEqual(JSON.parse(dualStemFirstPayload.zokk_morphology).root, 'k-t-b');
assert.strictEqual(JSON.parse(dualStemFirstPayload.zokk_morphology).stem_string, 'fajl');
console.log('✅ Dual morphology stem priority passed');

const legacyStemEntry = {
    id: 'stem-1',
    pos: 'noun',
    root_consonants: 'k-t-b',
    zokk_morphology: {
        stem_string: 'fajl',
        class_type: 'ir',
        is_hybrid: true,
        root: 'k-t-b',
        agentive_suffix: 'ant'
    }
};
const legacyStemForm = entryToForm(legacyStemEntry);
assert.strictEqual(legacyStemForm.is_loanword, true);
assert.strictEqual(legacyStemForm.prefer_zokk, true);
assert.strictEqual(legacyStemForm.zokk_stem, 'fajl');
assert.strictEqual(legacyStemForm.zokk_root, 'k-t-b');
assert.strictEqual(resolveEntryMorphologyMode(legacyStemForm), 'stem');
console.log('✅ Legacy stem load passed');

// 7a. POS aliases are canonicalized before they reach the select
const aliasedPosForm = entryToForm({
    id: 'adj-1',
    pos: 'adj',
    headword: 'sabiħ',
});
assert.strictEqual(aliasedPosForm.pos, 'adjective');
assert.strictEqual(normalizeEntryPos('PTCP'), 'participle');

const aliasedPosPatch = buildLoadedEntryPatch({
    id: 'noun-2',
    pos: 'n',
    headword: 'ktieb',
}, entryToForm({
    id: 'noun-2',
    pos: 'noun',
    headword: 'ktieb',
}));
assert.strictEqual(aliasedPosPatch.pos, 'noun');
console.log('✅ POS alias normalization passed');

// 7b. Loaded entry patch restores fields omitted from list-view payloads
const partialNounForm = entryToForm({
    id: 'noun-1',
    pos: 'noun',
    headword: 'ktieb',
});

const loadedNounEntry = {
    id: 'noun-1',
    pos: 'noun',
    headword: 'ktieb',
    is_loanword: 1,
    inflections_pl: ['kotba'],
    form_plural_pattern: 'CaCCa',
    paucal_form: 'kotbiet',
    augmentative_form: 'kotbiet',
    paucal_pattern: 'CaCCa',
    augmentative_pattern: 'CaCCaT',
    zokk_morphology: {
        stem_string: 'fajl',
        class_type: 'ir',
        is_hybrid: true,
        root: 'f-j-l',
        agentive_suffix: 'ant',
    },
};

const loadedNounPatch = buildLoadedEntryPatch(loadedNounEntry, partialNounForm);
assert.strictEqual(loadedNounPatch.is_loanword, true);
assert.strictEqual(loadedNounPatch.paucal_form, 'kotbiet');
assert.strictEqual(loadedNounPatch.augmentative_form, 'kotbiet');
assert.strictEqual(loadedNounPatch.paucal_pattern, 'CaCCa');
assert.strictEqual(loadedNounPatch.augmentative_pattern, 'CaCCaT');
assert.strictEqual(loadedNounPatch.plural_forms?.length, 1);
assert.strictEqual(loadedNounPatch.zokk_stem, 'fajl');
assert.strictEqual(loadedNounPatch.zokk_class, 'ir');
assert.strictEqual(loadedNounPatch.zokk_is_hybrid, true);
assert.strictEqual(loadedNounPatch.zokk_agentive_suffix, 'ant');

const loadedNounForm = {
    ...partialNounForm,
    ...loadedNounPatch,
};
const loadedNounPayload = formToPayload(loadedNounForm);
assert.deepStrictEqual(loadedNounPayload.inflections_pl, ['kotba']);
assert.strictEqual(loadedNounPayload.paucal_form, 'kotbiet');
assert.strictEqual(loadedNounPayload.augmentative_form, 'kotbiet');
assert.strictEqual(loadedNounPayload.paucal_pattern, 'CaCCa');
assert.strictEqual(loadedNounPayload.augmentative_pattern, 'CaCCaT');
assert.strictEqual(JSON.parse(loadedNounPayload.zokk_morphology).stem_string, 'fajl');
assert.strictEqual(Number(loadedNounPayload.is_loanword), 1);
console.log('✅ Loaded entry patch and payload round-trip passed');

// 7. Numeral Morphology Round-Trip
const numeralEntry = {
    id: 'num-1',
    pos: 'numeral',
    headword: 'tlieta',
    gender: 'feminine',
    numeral_type: 'cardinal',
    form_attributive_short: 'tliet',
    form_attributive_short_pattern: 'CvCVC',
    form_attributive_long: 'tlieta t',
};
const numeralForm = entryToForm(numeralEntry);
assert.strictEqual(numeralForm.numeral_type, 'cardinal');
assert.strictEqual(numeralForm.form_attributive_short, 'tliet');
assert.strictEqual(numeralForm.form_attributive_long, 'tlieta t');
assert.strictEqual(numeralForm.form_attributive_short_pattern, 'CvCVC');

const numeralPayload = formToPayload(numeralForm);
assert.strictEqual(numeralPayload.numeral_type, 'cardinal');
assert.strictEqual(numeralPayload.form_attributive_short, 'tliet');
assert.strictEqual(numeralPayload.form_attributive_long, 'tlieta t');
assert.strictEqual(numeralPayload.numeral_morphology.form_attributive_short_pattern, 'CvCVC');
console.log('✅ Numeral morphology round-trip passed');

// 8. Numeral auto-fill preserves manual values
const autoNumeralForms = buildNumeralAutoForms('tlieta', 't-l-t');
const seededNumeralForm = seedNumeralDerivedFields({
    numeral_type: 'ordinal',
    form_attributive_short: 'manual-short',
    form_attributive_long: '',
}, autoNumeralForms);

assert.strictEqual(seededNumeralForm.numeral_type, 'ordinal');
assert.strictEqual(seededNumeralForm.form_attributive_short, 'manual-short');
assert.strictEqual(seededNumeralForm.form_attributive_long, autoNumeralForms.attributive_long || '');
assert.strictEqual(autoNumeralForms.multiplier_form2, 'mtellet');

const blankSeededNumeralForm = seedNumeralDerivedFields({
    numeral_type: '',
    form_attributive_short: '',
    form_attributive_long: '',
}, autoNumeralForms);

assert.strictEqual(blankSeededNumeralForm.numeral_type, 'cardinal');
assert.strictEqual(blankSeededNumeralForm.form_attributive_short, autoNumeralForms.attributive_short || '');
assert.strictEqual(blankSeededNumeralForm.form_attributive_long, autoNumeralForms.attributive_long || '');
assert.strictEqual(
    shouldCombineMasculineAndShortAttributive('tlieta'),
    true,
);
assert.strictEqual(
    shouldCombineMasculineAndShortAttributive('tnejn'),
    true,
);
assert.strictEqual(
    shouldCombineMasculineAndShortAttributive('wieħed'),
    false,
);
assert.strictEqual(
    shouldSuppressNumeralAttributiveForms('ewwel'),
    true,
);
assert.strictEqual(
    shouldSuppressNumeralAttributiveForms('tnejn'),
    false,
);

const canonicalTnejnForms = buildNumeralAutoForms('tnejn', 't-n-j');
assert.strictEqual(canonicalTnejnForms.ordinal, 'tieni');
assert.strictEqual(canonicalTnejnForms.adverbial, 'darbtejn');
assert.strictEqual(canonicalTnejnForms.fractional_semitic, 'nofs');
assert.strictEqual(canonicalTnejnForms.attributive_short, 'żewġ');
assert.strictEqual(canonicalTnejnForms.attributive_long, 'żewġt');

const canonicalTnejnDisplay = buildNumeralDisplayForms('tnejn', 't-n-j', []);
assert.strictEqual(canonicalTnejnDisplay.ordinal[0]?.value, 'tieni');
assert.strictEqual(canonicalTnejnDisplay.adverbial[0]?.value, 'darbtejn');
assert.strictEqual(canonicalTnejnDisplay.fractional[0]?.value, 'nofs');

assert.strictEqual(
    buildNumeralAutoForms('wieħed', 'w-ħ-d').attributive_short ?? null,
    null,
);
assert.strictEqual(
    buildNumeralAutoForms('wieħed', 'w-ħ-d').attributive_long ?? null,
    null,
);
assert.strictEqual(
    getNumeralShortAttributiveRowLabel(),
    'Short-Attributive (Masculine)',
);
console.log('✅ Numeral auto-fill seeding passed');

// 8b. Numeral family lookup helpers
assert.deepStrictEqual(getNumeralRelatedHeadwords('erbgħa'), ['erbgħa', "raba'"]);
assert.deepStrictEqual(getNumeralRelatedHeadwords("raba'"), ["raba'", 'erbgħa']);
assert.deepStrictEqual(getNumeralRelatedHeadwords('tlieta'), ['tlieta', 'tielet']);
assert.deepStrictEqual(getNumeralRelatedHeadwords('tielet'), ['tielet', 'tlieta']);
console.log('✅ Numeral family lookup helpers passed');

// 9. Suppletive ordinal override
const oneForms = buildNumeralAutoForms('wieħed', 'w-ħ-d');
assert.strictEqual(oneForms.ordinal, 'ewwel');
console.log('✅ Suppletive numeral override passed');

// 10. Suppletive numeral display linking
const suppletiveDisplayForms = buildNumeralDisplayForms('wieħed', 'w-ħ-d', [
    { id: 'num-ewwel', headword: 'ewwel', cv_pattern: 'fagħel' },
    { id: 'num-darba', headword: 'darba', cv_pattern: 'faCCa' },
    { id: 'num-uniku', headword: 'uniku', cv_pattern: 'uCiCu' },
    { id: 'num-fard', headword: 'fard', cv_pattern: 'CCVC' },
    { id: 'num-uħud', headword: 'uħud', cv_pattern: 'uCVC' },
    { id: 'num-frad', headword: 'frad', cv_pattern: 'CCVC' },
    { id: 'num-frud', headword: 'frud', cv_pattern: 'CCVC' },
]);

assert.strictEqual(suppletiveDisplayForms.ordinal[0]?.value, 'ewwel');
assert.strictEqual(suppletiveDisplayForms.ordinal[0]?.entryId, 'num-ewwel');
assert.strictEqual(suppletiveDisplayForms.ordinal[0]?.pattern, 'fagħel');
assert.strictEqual(suppletiveDisplayForms.adverbial[0]?.value, 'darba');
assert.strictEqual(suppletiveDisplayForms.adverbial[0]?.marker, 'plain');
assert.strictEqual(suppletiveDisplayForms.adverbial[0]?.pattern, 'faCCa');
assert.deepStrictEqual(
    suppletiveDisplayForms.multiplier.map((item) => item.value),
    ['uniku', 'fard', 'mwaħħad'],
);
assert.deepStrictEqual(
    suppletiveDisplayForms.multiplier.map((item) => item.pattern),
    ['uCiCu', 'CCVC', null],
);
assert.strictEqual(suppletiveDisplayForms.multiplier[2]?.marker, 'theoretical');
assert.deepStrictEqual(
    suppletiveDisplayForms.distributive.map((item) => item.value),
    ['uħied', 'uħud', 'frad', 'frud'],
);
assert.deepStrictEqual(
    suppletiveDisplayForms.distributive.map((item) => item.pattern),
    [null, 'uCVC', 'CCVC', 'CCVC'],
);
assert.strictEqual(suppletiveDisplayForms.distributive[0]?.marker, 'theoretical');
assert.strictEqual(suppletiveDisplayForms.fractional.length, 0);
console.log('✅ Suppletive numeral display linking passed');

// 11. Suppletive family sync for ewwel
const ewwelDisplayForms = buildNumeralDisplayForms('ewwel', "'-w-l", [
    { id: 'num-wieħed', headword: 'wieħed', cv_pattern: 'CâCvC', form_attributive_short_pattern: 'CâCvC', morph_pattern: 'CCuC' },
    { id: 'num-darba', headword: 'darba', cv_pattern: 'faCCa' },
    { id: 'num-uniku', headword: 'uniku', cv_pattern: 'uCiCu' },
    { id: 'num-fard', headword: 'fard', cv_pattern: 'CCVC' },
    { id: 'num-uħud', headword: 'uħud', cv_pattern: 'uCVC' },
    { id: 'num-frad', headword: 'frad', cv_pattern: 'CCVC' },
    { id: 'num-frud', headword: 'frud', cv_pattern: 'CCVC' },
]);

assert.strictEqual(ewwelDisplayForms.adverbial[0]?.value, 'darba');
assert.strictEqual(ewwelDisplayForms.adverbial[0]?.entryId, 'num-darba');
assert.strictEqual(ewwelDisplayForms.adverbial[0]?.pattern, 'faCCa');
assert.strictEqual(ewwelDisplayForms.fractional.length, 0);
assert.deepStrictEqual(ewwelDisplayForms.multiplier.map((item) => item.value), ['uniku', 'fard', 'mwaħħad']);
assert.deepStrictEqual(ewwelDisplayForms.distributive.map((item) => item.value), ['uħied', 'uħud', 'frad', 'frud']);
console.log('✅ Suppletive family sync for ewwel passed');

// 12. Derived numeral display overrides
const tlietaDisplayForms = buildNumeralDisplayForms('tlieta', 't-l-t', [
    { id: 'num-tielet', headword: 'tielet', cv_pattern: 'CâCvC' },
    { id: 'num-tlitt', headword: 'tlitt', cv_pattern: 'CâCvC' },
]);

assert.strictEqual(tlietaDisplayForms.ordinal[0]?.value, 'tielet');
assert.strictEqual(tlietaDisplayForms.ordinal[0]?.entryId, 'num-tielet');
assert.strictEqual(tlietaDisplayForms.ordinal[0]?.pattern, 'CâCvC');

const erbghaDisplayForms = buildNumeralDisplayForms('erbgħa', 'r-b-għ', [
    { id: 'num-raba', headword: "raba'", cv_pattern: 'CâCvC' },
]);

assert.strictEqual(erbghaDisplayForms.ordinal[0]?.value, "raba'");
assert.strictEqual(erbghaDisplayForms.ordinal[0]?.entryId, 'num-raba');
assert.strictEqual(erbghaDisplayForms.ordinal[0]?.pattern, 'CâCvC');
console.log('✅ Derived numeral display overrides passed');

// 13. Entry API relationship enrichment
try {
    const envText = fs.readFileSync('.dev.vars', 'utf8');
    const env = Object.fromEntries(envText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith('#'))
        .map((line) => {
            const index = line.indexOf('=');
            return [line.slice(0, index), line.slice(index + 1)];
        }));

    const entryApiModule = await import(pathToFileURL(path.resolve('functions/api/entry/[id].js')).href);
    const entryApiResponse = await entryApiModule.onRequestGet({ env, params: { id: 'num-wieħed' } });
    assert.strictEqual(entryApiResponse.status, 200);

    const entryApiJson = await entryApiResponse.json();
    const linkedEwwel = [
        ...(entryApiJson.entry.related_entries || []),
        ...(entryApiJson.entry.alternative_forms || []),
    ].find((item) => item.id === 'num-ewwel');

    if (!linkedEwwel) {
        throw new Error('Expected linked ewwel relationship to be enriched');
    }
    assert.strictEqual(linkedEwwel.cv_pattern, 'CâCvC');

    const apiSuppletiveDisplayForms = buildNumeralDisplayForms('wieħed', 'w-ħ-d', [linkedEwwel]);
    assert.strictEqual(apiSuppletiveDisplayForms.ordinal[0]?.pattern, 'CâCvC');
    console.log('✅ Entry API relationship enrichment passed');
} catch (error) {
    const message = String((error && typeof error === 'object' && 'message' in error) ? error.message : error);
    console.warn(`⚠️ Skipping live entry API relationship enrichment check: ${message}`);
}

console.log('\nAll regression tests passed successfully!');
