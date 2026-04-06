import assert from 'node:assert/strict';
import { applyPossessiveSuffix } from '../src/lib/nounInflectionEngine.ts';

const cases = [
    {
        base: 'għomor',
        gender: 'masculine',
        pattern: undefined,
        expected: ['għomri', 'għomrok', 'għomru', 'għomorha', 'għomorna', 'għomorkom', 'għomorhom'],
    },
    {
        base: 'ġisem',
        gender: 'masculine',
        pattern: undefined,
        expected: ['ġismi', 'ġismek', 'ġismu', 'ġisimha', 'ġisimna', 'ġisimkom', 'ġisimhom'],
    },
    {
        base: 'ziju',
        gender: 'masculine',
        pattern: undefined,
        expected: ['zijuwi', 'zijuk', 'zijuh', 'zijuha', 'zijuna', 'zijukom', 'zijuhom'],
    },
    {
        base: 'darba',
        gender: 'feminine',
        pattern: undefined,
        expected: ['darbti', 'darbtek', 'darbtu', 'darbitha', 'darbitna', 'darbitkom', 'darbithom'],
    },
    {
        base: 'drabi',
        gender: 'feminine',
        pattern: undefined,
        expected: ['drabija', 'drabik', 'drabih', 'drabiha', 'drabina', 'drabikom', 'drabihom'],
    },
];

const suffixes = [0, 1, 2, 3, 4, 5, 6];

for (const testCase of cases) {
    const actual = suffixes.map((idx) => applyPossessiveSuffix(
        testCase.base,
        idx,
        testCase.gender,
        testCase.pattern,
    ));
    assert.deepStrictEqual(actual, testCase.expected, `Unexpected possessive forms for ${testCase.base}`);
}

console.log('nounAttachment tests passed');
