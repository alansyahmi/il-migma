
/**
 * scripts/regression-test-adapter.ts
 * Validates round-trip persistence and legacy resolution for Entry Adapter.
 */

import { entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';
import { resolveEntryMorphologyMode } from '../src/lib/adminSchema.ts';
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
assert.strictEqual(rootOnlyPayload.zokk_morphology, null);
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

console.log('\nAll regression tests passed successfully!');
