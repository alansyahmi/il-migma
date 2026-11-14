import test from 'node:test';
import assert from 'node:assert/strict';
import {
    compareEntryPriority,
    groupEntriesByHeadword,
    isProperNounEntry,
    POS_PRIORITY,
    AUDIT_STATUS_PRIORITY,
} from '../src/lib/homographGrouping.ts';

test('homographGrouping: priority waterfall prioritizes approved over pending', () => {
    const approvedConjunction = {
        id: 'conj-allura',
        headword: 'allura',
        pos: 'conjunction',
        audit_status: 'approved',
        rank: null,
    };

    const pendingAdverb = {
        id: 'adv-allura',
        headword: 'allura',
        pos: 'adverb',
        audit_status: 'pending',
        rank: null,
    };

    const comparison = compareEntryPriority(approvedConjunction, pendingAdverb);
    assert.ok(comparison < 0, 'Approved entry should rank before pending entry');
});

test('homographGrouping: priority waterfall breaks audit ties with rank', () => {
    const higherRank = {
        id: 'n-dan',
        headword: 'dan',
        pos: 'noun',
        audit_status: 'approved',
        rank: 10,
    };

    const lowerRank = {
        id: 'det-dan',
        headword: 'dan',
        pos: 'determiner',
        audit_status: 'approved',
        rank: 16,
    };

    const comparison = compareEntryPriority(higherRank, lowerRank);
    assert.ok(comparison < 0, 'Rank 10 should beat rank 16');
});

test('homographGrouping: priority waterfall breaks rank ties with POS hierarchy', () => {
    const noun = {
        id: 'n-sew',
        headword: 'sew',
        pos: 'noun',
        audit_status: 'pending',
        rank: null,
    };

    const adverb = {
        id: 'adv-sew',
        headword: 'sew',
        pos: 'adverb',
        audit_status: 'pending',
        rank: null,
    };

    const comparison = compareEntryPriority(noun, adverb);
    assert.ok(comparison < 0, 'Noun should beat adverb');
});

test('homographGrouping: groups multi-POS entries under single canonical headword', () => {
    const entries = [
        { id: 'adv-allura', headword: 'allura', pos: 'adverb', audit_status: 'pending' },
        { id: 'intj-allura', headword: 'allura', pos: 'interjection', audit_status: 'pending' },
        { id: 'conj-allura', headword: 'allura', pos: 'conjunction', audit_status: 'approved' },
        { id: 'v-kiteb', headword: 'kiteb', pos: 'verb', audit_status: 'approved' },
    ];

    const grouped = groupEntriesByHeadword(entries);
    assert.equal(grouped.length, 2, 'Should group into 2 distinct headwords');

    const alluraGroup = grouped.find(g => g.headword === 'allura');
    assert.ok(alluraGroup, 'allura group exists');
    assert.equal(alluraGroup.primary.id, 'conj-allura', 'conj-allura is primary due to approved audit_status');
    assert.equal(alluraGroup.siblings.length, 2, 'Has 2 siblings');
    assert.deepEqual(alluraGroup.allPos, ['conjunction', 'adverb', 'interjection']);
});

test('homographGrouping: isProperNounEntry detects various proper noun markers', () => {
    assert.equal(isProperNounEntry({ pos: 'proper noun' }), true);
    assert.equal(isProperNounEntry({ pos: 'proper_noun' }), true);
    assert.equal(isProperNounEntry({ pos: 'noun', noun_type: 'proper' }), true);
    assert.equal(isProperNounEntry({ pos: 'noun', noun_morphology: { noun_type: 'proper' } }), true);
    assert.equal(isProperNounEntry({ pos: 'noun', tags: ['proper'] }), true);
    assert.equal(isProperNounEntry({ pos: 'noun', tags: [{ name: 'proper' }] }), true);

    // Capitalized noun headwords (Maltese days of the week, constellations, names)
    assert.equal(isProperNounEntry({ id: 'n-erbgħa', headword: 'Erbgħa', pos: 'noun' }), true);
    assert.equal(isProperNounEntry({ id: 'n-tnejn', headword: 'Tnejn', pos: 'noun' }), true);
    assert.equal(isProperNounEntry({ id: 'n-tlieta', headword: 'Tlieta', pos: 'noun' }), true);
    assert.equal(isProperNounEntry({ id: 'n-ħamis', headword: 'Ħamis', pos: 'noun' }), true);

    // Common noun & numerals
    assert.equal(isProperNounEntry({ pos: 'noun', headword: 'ktieb' }), false);
    assert.equal(isProperNounEntry({ pos: 'numeral', headword: 'erbgħa' }), false);
    assert.equal(isProperNounEntry({ pos: 'numeral', headword: 'tnejn' }), false);
    assert.equal(isProperNounEntry({ pos: 'noun' }), false);
    assert.equal(isProperNounEntry({ pos: 'noun', noun_type: 'concrete' }), false);
    assert.equal(isProperNounEntry({ pos: 'verb' }), false);
});

test('homographGrouping: prioritizes common noun over proper noun', () => {
    // Typical scenario where proper noun was scraped first (n-wott) and common noun got suffix (n-wott-2)
    const properNoun = {
        id: 'n-wott',
        headword: 'Wott',
        pos: 'noun',
        noun_type: 'proper',
        audit_status: 'pending',
        rank: null,
    };

    const commonNoun = {
        id: 'n-wott-2',
        headword: 'wott',
        pos: 'noun',
        audit_status: 'pending',
        rank: null,
    };

    const comparison = compareEntryPriority(commonNoun, properNoun);
    assert.ok(comparison < 0, 'Common noun should beat proper noun even if proper noun has shorter id');

    const reverseComparison = compareEntryPriority(properNoun, commonNoun);
    assert.ok(reverseComparison > 0, 'Proper noun should yield to common noun');
});

test('homographGrouping: groupEntriesByHeadword selects common noun as primary over proper noun', () => {
    const entries = [
        {
            id: 'n-qabru',
            headword: 'Qabru',
            pos: 'noun',
            noun_type: 'proper',
            audit_status: 'approved',
            definitions: [{ text_en: 'Cancer (constellation)' }],
        },
        {
            id: 'n-qabru-2',
            headword: 'qabru',
            pos: 'noun',
            audit_status: 'pending',
            definitions: [{ text_en: 'crab' }],
        },
    ];

    const grouped = groupEntriesByHeadword(entries);
    assert.equal(grouped.length, 1, 'Should group into single headword');
    assert.equal(grouped[0].primary.id, 'n-qabru-2', 'Common noun must be primary entry');
    assert.equal(grouped[0].siblings.length, 1, 'Proper noun becomes sibling');
    assert.equal(grouped[0].siblings[0].id, 'n-qabru');
});

test('homographGrouping: prioritizes numerals over proper nouns', () => {
    // erbgħa (four, numeral) vs Erbgħa (Wednesday, proper noun)
    const properNounWednesday = {
        id: 'n-erbgħa',
        headword: 'Erbgħa',
        pos: 'noun',
        audit_status: 'approved',
        definitions: [{ text_en: 'Wednesday' }],
    };

    const numeralFour = {
        id: 'num-erbgħa',
        headword: 'erbgħa',
        pos: 'numeral',
        audit_status: 'pending',
        definitions: [{ text_en: 'four' }],
    };

    const comparison = compareEntryPriority(numeralFour, properNounWednesday);
    assert.ok(comparison < 0, 'Numeral four should beat proper noun Wednesday');

    const reverse = compareEntryPriority(properNounWednesday, numeralFour);
    assert.ok(reverse > 0, 'Proper noun Wednesday should yield to numeral four');

    const grouped = groupEntriesByHeadword([properNounWednesday, numeralFour]);
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].primary.id, 'num-erbgħa', 'Numeral must be primary canonical entry');
    assert.equal(grouped[0].siblings.length, 1);
    assert.equal(grouped[0].siblings[0].id, 'n-erbgħa');
});
