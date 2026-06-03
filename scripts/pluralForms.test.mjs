import assert from 'node:assert/strict';
import { normalizePluralContract } from '../src/lib/pluralForms.ts';

console.log('Testing pluralForms normalization...');

// Case 1: Manual plural form input (from UI array)
const res1 = normalizePluralContract(
    [{ form: 'ftut', pattern: '' }], // v
    '', // next.form_plural_pattern
    'test', // next.inflections_pl
    '' // next.form_plural_pattern
);
assert.deepEqual(res1.rows, [{ form: 'ftut', pattern: '' }], 'Manual array input should win');
assert.equal(res1.legacyForms[0], 'ftut', 'Legacy forms should update');

// Case 2: Manual legacy pattern input
const res2 = normalizePluralContract(
    [{ form: 'ftut', pattern: '' }], // next.plural_forms
    'CaCCa', // v (new pattern)
    'ftut', // next.inflections_pl
    'CaCCa' // v (new pattern)
);
assert.deepEqual(res2.rows, [{ form: 'ftut', pattern: 'CaCCa' }], 'New pattern should be merged into existing rows');
assert.equal(res2.legacyPattern, 'CaCCa', 'Legacy pattern should update');

// Case 3: Empty array, but legacy data exists
const res3 = normalizePluralContract(
    [], // v
    '', // next.form_plural_pattern
    'test', // next.inflections_pl
    'CaCCa' // next.form_plural_pattern
);
// In this case, normalizePluralContract will use the fallback (legacy) because the first arg is empty
assert.deepEqual(res3.rows, [{ form: 'test', pattern: 'CaCCa' }], 'Fallback to legacy should happen when array is empty');

console.log('pluralForms.test.mjs passed');
