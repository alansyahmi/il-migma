import test from 'node:test';
import assert from 'node:assert/strict';
import {
    STEM_STRIPPING_AFFIX_GROUPS,
    suggestStrippedStem,
} from '../src/lib/stemStripping.ts';

test('suggestStrippedStem strips numeral, derivational, and inflectional suffixes', () => {
    assert.equal(suggestStrippedStem('biljun'), '-bi-');
    assert.equal(suggestStrippedStem('triljun'), '-tri-');
    assert.equal(suggestStrippedStem('kwadriljun'), '-kwadr-');
    assert.equal(suggestStrippedStem('kwintiljun'), '-kwint-');
    assert.equal(suggestStrippedStem('sestiljun'), '-sest-');
    assert.equal(suggestStrippedStem('settiljun'), '-sett-');
    assert.equal(suggestStrippedStem('ottiljun'), '-ott-');
    assert.equal(suggestStrippedStem('noniljun'), '-non-');
    assert.equal(suggestStrippedStem('deċiljun'), '-deċ-');
    assert.equal(suggestStrippedStem('triplu'), '-tri-');
    assert.equal(suggestStrippedStem('kwadruplu'), '-kwadr-');
    assert.equal(suggestStrippedStem('settimu'), '-sett-');
    assert.equal(suggestStrippedStem('deċmu'), '-deċ-');
    assert.equal(suggestStrippedStem('ottav'), '-ott-');
    assert.equal(suggestStrippedStem('ċajtier'), '-ċajt-');
    assert.equal(suggestStrippedStem('ċentrali'), '-ċentr-');
    assert.equal(suggestStrippedStem('ċensurabbli'), '-ċensur-');
    assert.equal(suggestStrippedStem('żero'), '-żer-');
});

test('STEM_STRIPPING_AFFIX_GROUPS has unique IDs and non-empty rules with examples', () => {
    const ids = new Set();
    for (const group of STEM_STRIPPING_AFFIX_GROUPS) {
        assert.ok(group.id);
        assert.equal(ids.has(group.id), false);
        ids.add(group.id);
        assert.ok(group.rules.length > 0);
        for (const rule of group.rules) {
            assert.ok(rule.affix.trim().length > 0);
            assert.ok(rule.examples.length > 0);
        }
    }
});
