import { generateFeminineDualFromMasculine, generateTheoreticalDual } from '../src/lib/maltesePhonology.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    assertEq(generateTheoreticalDual('għomor'), 'għomrejn', 'Dual helper should syncopate għomor');
    assertEq(generateTheoreticalDual('xahar'), 'xahrejn', 'Dual helper should syncopate xahar');
    assertEq(generateTheoreticalDual('ktieb'), 'ktibejn', 'Dual helper should shorten ie to i');
    assertEq(generateTheoreticalDual('dar'), 'darejn', 'Simple monosyllabic nouns should keep the citation stem');
    assertEq(generateFeminineDualFromMasculine('kiesaħ'), 'kesaħtejn', 'Feminine dual should collapse ie before -tejn');
};

run();
console.log('dualForm tests passed');
