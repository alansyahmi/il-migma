import assert from 'node:assert/strict';
import {
    getNumeralEntryRole,
    selectNumeralRelationshipEntries,
} from '../src/lib/numeralMorphology.ts';

const erbgħa = {
    id: 'num-erbgħa',
    headword: 'erbgħa',
    pos: 'numeral',
    numeral_morphology: { numeral_type: 'cardinal' },
};
const erba = {
    id: 'num-erba',
    headword: "erba'",
    pos: 'numeral',
    numeral_morphology: { numeral_type: 'attributive_short' },
};
const erbat = {
    id: 'num-erbat',
    headword: 'erbat',
    pos: 'numeral',
    numeral_type: 'attributive_long',
};
const raba = {
    id: 'num-raba',
    headword: "raba'",
    pos: 'numeral',
    numeral_morphology: { numeral_type: 'ordinal' },
};
const terz = {
    id: 'num-terz',
    headword: 'terz',
    pos: 'numeral',
    numeral_morphology: { numeral_type: 'fractional' },
};
const triplu = {
    id: 'num-triplu',
    headword: 'triplu',
    pos: 'numeral',
    numeral_morphology: { numeral_type: 'multiplier' },
};
const blankRoleCardinal = {
    id: 'num-blank-cardinal',
    headword: 'blank cardinal',
    pos: 'numeral',
};
const nonNumeral = {
    id: 'n-kwart',
    headword: 'kwart',
    pos: 'noun',
};

assert.equal(
    getNumeralEntryRole(blankRoleCardinal),
    'cardinal',
    'blank numeral_type should be treated as cardinal'
);

{
    const matches = selectNumeralRelationshipEntries({
        currentEntryId: 'num-erbgħa',
        currentNumeralType: 'cardinal',
        existingRelatedEntries: [],
        candidateHeadwords: ["erba'", 'erbat', "raba'"],
        entries: [erbgħa, erba, erbat, raba, blankRoleCardinal, nonNumeral],
    });

    assert.deepEqual(
        matches.map((entry) => entry.id),
        ['num-erba', 'num-erbat', 'num-raba'],
        'cardinal should select non-cardinal numeral siblings only'
    );
}

{
    const matches = selectNumeralRelationshipEntries({
        currentEntryId: 'num-erba',
        currentNumeralType: 'attributive_short',
        existingRelatedEntries: [],
        candidateHeadwords: [],
        entries: [{ entry: erbgħa }, erba, erbat, raba, nonNumeral],
    });

    assert.deepEqual(
        matches.map((entry) => entry.id),
        ['num-erbgħa'],
        "derived erba' should select the same-root cardinal"
    );
}

{
    const matches = selectNumeralRelationshipEntries({
        currentEntryId: 'num-erbat',
        currentNumeralType: 'attributive_long',
        existingRelatedEntries: [],
        candidateHeadwords: [],
        entries: [erbgħa, erba, erbat, raba],
    });

    assert.deepEqual(
        matches.map((entry) => entry.id),
        ['num-erbgħa'],
        'derived erbat should select the same-root cardinal'
    );
}

{
    const matches = selectNumeralRelationshipEntries({
        currentEntryId: 'num-erbgħa',
        currentNumeralType: 'cardinal',
        existingRelatedEntries: [{ id: 'num-erba' }, { target_id: 'num-erbat' }],
        candidateHeadwords: ["erba'", 'erbat', "raba'"],
        entries: [erbgħa, erba, erba, erbat, raba, nonNumeral],
    });

    assert.deepEqual(
        matches.map((entry) => entry.id),
        ['num-raba'],
        'self-links, duplicates, existing relationships, and non-numerals should be excluded'
    );
}

{
    const matches = selectNumeralRelationshipEntries({
        currentEntryId: 'num-terz',
        currentNumeralType: 'fractional',
        existingRelatedEntries: [],
        candidateHeadwords: [],
        entries: [terz, triplu, nonNumeral],
    });

    assert.deepEqual(
        matches.map((entry) => entry.id),
        ['num-triplu'],
        'derived numerals without a cardinal should fall back to non-cardinal numeral family siblings'
    );
}

{
    const matches = selectNumeralRelationshipEntries({
        currentEntryId: 'num-terz',
        currentNumeralType: 'fractional',
        existingRelatedEntries: [],
        candidateHeadwords: [],
        entries: [terz, nonNumeral],
    });

    assert.deepEqual(
        matches.map((entry) => entry.id),
        [],
        'standalone role-specific numerals should be allowed to have no relationship matches'
    );
}

console.log('numeralRelationshipSelection tests passed');
