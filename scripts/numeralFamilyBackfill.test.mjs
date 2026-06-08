import assert from 'node:assert/strict';
import { buildNumeralFamilyBackfillPlan } from './backfill-numeral-families.mjs';

const entries = [
    {
        id: 'num-erbgħa',
        headword: 'erbgħa',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        numeral_type: 'cardinal',
        num_type: 'cardinal',
        form_attributive_short: "erba'",
        form_attributive_long: 'erbat',
        fractional_form: 'kwart',
        multiplier_form: 'rbiegħi',
        distributive_form: 'rbiegħ',
    },
    {
        id: 'num-erba',
        headword: "erba'",
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        numeral_type: 'attributive_short',
        num_type: 'attributive_short',
    },
    {
        id: 'num-erbat',
        headword: 'erbat',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        numeral_type: 'attributive_long',
        num_type: 'attributive_long',
    },
    {
        id: 'num-kwart',
        headword: 'kwart',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        numeral_type: 'fractional',
        num_type: 'fractional',
    },
    {
        id: 'num-rbiegh',
        headword: 'rbiegħ',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        numeral_type: 'distributive',
        num_type: null,
    },
    {
        id: 'num-rbieghi',
        headword: 'rbiegħi',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        numeral_type: 'multiplier',
        num_type: null,
    },
    {
        id: 'noun-kwart',
        headword: 'kwart',
        pos: 'noun',
        root_consonants: 'r-b-għ',
    },
];

const plan = buildNumeralFamilyBackfillPlan(entries, [
    { entry_id: 'num-erbgħa', target_entry_id: 'num-erbat', relationship_type: 'related' },
]);

assert.deepEqual(
    plan.roleMirrors.map((item) => [item.entryId, item.role]),
    [
        ['num-rbiegh', 'distributive'],
        ['num-rbieghi', 'multiplier'],
    ],
    'top-level numeral roles should be mirrored when normalized numeral_morphology is blank',
);

const relationshipPairs = plan.relationships.map((item) => [item.entryId, item.targetEntryId]);
const sortPairs = (pairs) => pairs.map((pair) => pair.join(' -> ')).sort();
assert.deepEqual(
    sortPairs(relationshipPairs),
    sortPairs([
        ['num-erba', 'num-erbgħa'],
        ['num-erbgħa', 'num-erba'],
        ['num-erbat', 'num-erbgħa'],
        ['num-erbgħa', 'num-kwart'],
        ['num-kwart', 'num-erbgħa'],
        ['num-erbgħa', 'num-rbiegh'],
        ['num-rbiegh', 'num-erbgħa'],
        ['num-erbgħa', 'num-rbieghi'],
        ['num-rbieghi', 'num-erbgħa'],
    ]),
    'backfill should link cardinal and same-root derived numeral entries bidirectionally without duplicating existing links',
);

assert.equal(plan.conflicts.length, 0, 'consistent saved cardinal surfaces should not report conflicts');

const conflictPlan = buildNumeralFamilyBackfillPlan([
    {
        id: 'num-erbgħa',
        headword: 'erbgħa',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        numeral_type: 'cardinal',
        num_type: 'cardinal',
        form_attributive_long: 'kwart',
    },
    {
        id: 'num-kwart',
        headword: 'kwart',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        numeral_type: 'fractional',
        num_type: 'fractional',
    },
]);

assert.deepEqual(
    conflictPlan.conflicts.map((item) => ({
        cardinalId: item.cardinalId,
        role: item.role,
        surface: item.surface,
        matchedEntryId: item.matchedEntryId,
        matchedRole: item.matchedRole,
    })),
    [
        {
            cardinalId: 'num-erbgħa',
            role: 'attributive_long',
            surface: 'kwart',
            matchedEntryId: 'num-kwart',
            matchedRole: 'fractional',
        },
    ],
    'conflicting saved cardinal surfaces should be reported instead of silently accepted',
);

console.log('numeralFamilyBackfill.test.mjs passed');
