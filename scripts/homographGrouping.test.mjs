import test from 'node:test';
import assert from 'node:assert/strict';
import {
    compareEntryPriority,
    groupEntriesByHeadword,
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
