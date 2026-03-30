import { applyPossessiveSuffix } from '../src/lib/nounInflectionEngine.ts';
import assert from 'node:assert/strict';

const testCases = [
    { base: 'ktieb', gender: 'masculine' as const, pattern: 'CCvC', expected: ['ktiebi', 'ktiebek', 'ktiebu', 'ktiebha', 'ktiebna', 'ktiebkom', 'ktiebhom'] },
    { base: 'tifel', gender: 'masculine' as const, pattern: 'CvCvC', expected: ['tifli', 'tiflek', 'tiflu', 'tifelha', 'tifelna', 'tifelkom', 'tifelhom'] },
    { base: 'zija', gender: 'feminine' as const, pattern: 'CvCa', expected: ['ziti', 'zitek', 'zitu', 'zitha', 'zitna', 'zitkom', 'zithom'] },
    { base: 'mara', gender: 'feminine' as const, pattern: undefined, expected: ['marti', 'martek', 'martu', 'martha', 'martna', 'martkom', 'marthom'] },
    { base: 'kotba', gender: 'masculine' as const, pattern: 'CvCCa', expected: ['kotobti', 'kotobtok', 'kotobtu', 'kotobtha', 'kotobtna', 'kotobtkom', 'kotobthom'] },
    { base: 'ilsna', gender: 'masculine' as const, pattern: 'iCCCa', expected: ['ilsinti', 'ilsintek', 'ilsintu', 'ilsintha', 'ilsintna', 'ilsintkom', 'ilsinthom'] },
];

const suffixes = [0, 1, 2, 3, 4, 5, 6];

for (const t of testCases) {
    console.log(`\n=== ${t.base} (${t.gender}) ===`);
    const results = suffixes.map(idx => applyPossessiveSuffix(t.base, idx as any, t.gender, t.pattern));
    console.log(results.join(' | '));
    assert.deepStrictEqual(results, t.expected, `Unexpected possessive forms for ${t.base}`);
}
