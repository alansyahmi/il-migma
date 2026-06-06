import assert from 'node:assert/strict';
import {
    canShowFunctionWordInflectionTable,
    canShowFunctionWordInflectionTableForEntry,
    isFunctionWordInflectionPos,
    resolveEntryInflectableValue,
    shouldHideInflectionTable,
    shouldHideInflectionTableForEntry,
} from '../src/lib/inflectionState.ts';

const eligiblePos = ['pronoun', 'adverb', 'preposition', 'particle', 'article'];
const ineligiblePos = ['conjunction', 'interrogative', 'interjection', 'suffix'];

for (const pos of eligiblePos) {
    assert.equal(
        isFunctionWordInflectionPos(pos),
        true,
        `${pos} should be eligible for function-word inflection`
    );
    assert.equal(
        canShowFunctionWordInflectionTable(pos, true),
        true,
        `${pos} should show inflection when enabled`
    );
    assert.equal(
        shouldHideInflectionTable(pos, true),
        false,
        `${pos} should not hide inflection when enabled`
    );
    assert.equal(
        canShowFunctionWordInflectionTable(pos, false),
        false,
        `${pos} should not show inflection when disabled`
    );
    assert.equal(
        shouldHideInflectionTable(pos, false),
        true,
        `${pos} should hide inflection when disabled`
    );
}

for (const pos of ineligiblePos) {
    assert.equal(
        isFunctionWordInflectionPos(pos),
        false,
        `${pos} should not be eligible for function-word inflection`
    );
    assert.equal(
        canShowFunctionWordInflectionTable(pos, true),
        false,
        `${pos} should never show the suffix inflection table`
    );
    assert.equal(
        shouldHideInflectionTable(pos, true),
        true,
        `${pos} should always hide the suffix inflection table`
    );
}

assert.equal(
    canShowFunctionWordInflectionTable('pronoun'),
    true,
    'legacy eligible entries without an explicit disabled flag should show inflection'
);

assert.equal(
    resolveEntryInflectableValue({ is_inflectable: false, has_inflection: true }),
    true,
    'has_inflection should override legacy/default is_inflectable when explicitly set'
);

assert.equal(
    canShowFunctionWordInflectionTableForEntry('preposition', { is_inflectable: false, has_inflection: true }),
    true,
    'eligible function POS should show inflection when has_inflection is true'
);

assert.equal(
    shouldHideInflectionTableForEntry('preposition', { has_inflection: false }),
    true,
    'eligible function POS should hide inflection when has_inflection is false'
);

assert.equal(
    canShowFunctionWordInflectionTableForEntry('conjunction', { has_inflection: true }),
    false,
    'ineligible POS should not show inflection even with has_inflection=true'
);

console.log('inflectionState tests passed');
