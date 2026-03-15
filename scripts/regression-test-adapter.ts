
/**
 * scripts/regression-test-adapter.ts
 * Validates round-trip persistence and legacy resolution for Entry Adapter.
 */

import { entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';
import assert from 'node:assert';

console.log('Running Entry Adapter Regression Tests...');

// 1. Legacy Noun Round-trip
const legacyNoun = {
    id: 'n-dar',
    headword: 'dar',
    pos: 'noun',
    noun_morphology: {
        singular: 'dar',
        feminine: 'dara',
        plural_forms: ['djar', 'djarat'],
        sound_plural: 'iet',
        gender: 'feminine',
        noun_type: 'common',
        is_collective: true
    },
    cv_notation: 'CVC'
};

console.log('Testing Legacy Noun...');
const nounForm = entryToForm(legacyNoun);
assert.strictEqual(nounForm.lemma_base, 'dar');
assert.strictEqual(nounForm.form_fem, 'dara');
assert.strictEqual(nounForm.inflections_pl, 'djar, djarat');
assert.strictEqual(nounForm.sound_suffix, 'iet');
assert.strictEqual(nounForm.gender, 'feminine');
assert.strictEqual(nounForm.is_collective, true);
assert.strictEqual(nounForm.cv_pattern, 'CVC');

const nounPayload = formToPayload(nounForm);
assert.strictEqual(nounPayload.lemma_base, 'dar');
assert.deepStrictEqual(nounPayload.inflections_pl, ['djar', 'djarat']);
assert.strictEqual(nounPayload.sound_suffix, 'iet');
assert.strictEqual(nounPayload.is_collective, 1); // Normalised to int
console.log('✅ Legacy Noun passed');

// 2. Flat Adjective with Modern Columns
const flatAdj = {
    id: 'adj-kbir',
    headword: 'kbir',
    pos: 'adjective',
    lemma_base: 'kbir',
    gender: 'masculine',
    inflections_pl: ['kbar'],
    morph_pattern: 'FcVl',
    cv_pattern: 'CCvC',
    source_language: 'Arabic'
};

console.log('Testing Flat Adjective...');
const adjForm = entryToForm(flatAdj);
assert.strictEqual(adjForm.cv_pattern, 'CCvC');
assert.strictEqual(adjForm.morph_pattern, 'FcVl');
assert.strictEqual(adjForm.inflections_pl, 'kbar');

const adjPayload = formToPayload(adjForm);
assert.strictEqual(adjPayload.cv_pattern, 'CCvC');
assert.strictEqual(adjPayload.morph_pattern, 'FcVl');
console.log('✅ Flat Adjective passed');

// 3. Mixed Legacy Adjective
const mixedAdj = {
    pos: 'adjective',
    adjective_morphology: {
        plural: ['twal'],
        feminine: 'twila',
        masculine: 'twil'
    },
    cv_pattern: 'CCvC'
};

console.log('Testing Mixed Legacy Adjective...');
const mixedForm = entryToForm(mixedAdj);
assert.strictEqual(mixedForm.inflections_pl, 'twal');
assert.strictEqual(mixedForm.form_fem, 'twila');
assert.strictEqual(mixedForm.cv_pattern, 'CCvC');
console.log('✅ Mixed Legacy Adjective passed');

// 4. Numeral Round-trip
const numeralEntry = {
    pos: 'numeral',
    numeral_morphology: {
        numeral_type: 'cardinal',
        form_attributive_short: 'tliet'
    }
};
console.log('Testing Numeral...');
const numForm = entryToForm(numeralEntry);
assert.strictEqual(numForm.numeral_type, 'cardinal');
assert.strictEqual(numForm.form_attributive_short, 'tliet');
console.log('✅ Numeral passed');

// 5. Extra Fields Passthrough
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

console.log('\nAll regression tests passed successfully!');
