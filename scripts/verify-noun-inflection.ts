import { applyPossessiveSuffix, type PossessiveSuffixIdx } from '../src/lib/nounInflectionEngine.ts';
import assert from 'node:assert/strict';

const testCases = [
    { base: 'ktieb', gender: 'masculine' as const, pattern: 'CCvC', expected: ['ktibi', 'ktibek', 'ktibu', 'ktibha', 'ktibna', 'ktibkom', 'ktibhom'] },
    { base: 'tifel', gender: 'masculine' as const, pattern: 'CvCvC', expected: ['tifli', 'tiflek', 'tiflu', 'tifelha', 'tifelna', 'tifelkom', 'tifelhom'] },
    { base: 'għomor', gender: 'masculine' as const, pattern: undefined, expected: ['għomri', 'għomrok', 'għomru', 'għomorha', 'għomorna', 'għomorkom', 'għomorhom'] },
    { base: 'ġisem', gender: 'masculine' as const, pattern: undefined, expected: ['ġismi', 'ġismek', 'ġismu', 'ġisimha', 'ġisimna', 'ġisimkom', 'ġisimhom'] },
    { base: 'ziju', gender: 'masculine' as const, pattern: undefined, expected: ['zijuwi', 'zijuk', 'zijuh', 'zijuha', 'zijuna', 'zijukom', 'zijuhom'] },
    { base: 'zija', gender: 'feminine' as const, pattern: 'CvCa', expected: ['ziti', 'zitek', 'zitu', 'zitha', 'zitna', 'zitkom', 'zithom'] },
    { base: 'mara', gender: 'feminine' as const, pattern: undefined, expected: ['marti', 'martek', 'martu', 'martha', 'martna', 'martkom', 'marthom'] },
    { base: 'darba', gender: 'feminine' as const, pattern: undefined, expected: ['darbti', 'darbtek', 'darbtu', 'darbitha', 'darbitna', 'darbitkom', 'darbithom'] },
    { base: 'drabi', gender: 'feminine' as const, pattern: undefined, expected: ['drabija', 'drabik', 'drabih', 'drabiha', 'drabina', 'drabikom', 'drabihom'] },
    { base: 'kotba', gender: 'masculine' as const, pattern: 'CoCCa', expected: ['kotbaji', 'kotbajek', 'kotbaju', 'kotbajha', 'kotbajna', 'kotbajkom', 'kotbajhom'] },
    { base: 'ilsna', gender: 'masculine' as const, pattern: 'iCCCa', expected: ['ilsinti', 'ilsintek', 'ilsintu', 'ilsintha', 'ilsintna', 'ilsintkom', 'ilsinthom'] },
];

const suffixes = [0, 1, 2, 3, 4, 5, 6];

for (const t of testCases) {
    console.log(`\n=== ${t.base} (${t.gender}) ===`);
    const results = suffixes.map(idx => applyPossessiveSuffix(t.base, idx as PossessiveSuffixIdx, t.gender, t.pattern));
    console.log(results.join(' | '));
    assert.deepStrictEqual(results, t.expected, `Unexpected possessive forms for ${t.base}`);
}
