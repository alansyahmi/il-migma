import { generateFeminineDualFromMasculine, generateFeminineDualFromMasculineWithHint, generateTheoreticalDual } from '../src/lib/maltesePhonology.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    assertEq(generateTheoreticalDual('għomor'), 'għomrejn', 'Dual helper should syncopate għomor');
    assertEq(generateTheoreticalDual('xahar'), 'xahrejn', 'Dual helper should syncopate xahar');
    assertEq(generateTheoreticalDual('ktieb'), 'ktibejn', 'Dual helper should shorten ie to i');
    assertEq(generateTheoreticalDual('baħħar'), 'baħħarejn', 'Long-final masculine stems should keep the full stem');
    assertEq(generateTheoreticalDual('ġeddid'), 'ġeddidejn', 'Geminated final stems should keep the full stem');
    assertEq(generateTheoreticalDual('dar'), 'darejn', 'Simple monosyllabic nouns should keep the citation stem');
    assertEq(generateTheoreticalDual('alla', 'allat'), 'allajn', 'Sound plurals in -at should use -ajn duals');
    assertEq(generateTheoreticalDual('ajjut', null, '/ɐj.ˈjʊːt/'), 'ajjutejn', 'Stressed long final syllables should block syncopation');
    assertEq(generateFeminineDualFromMasculine('kiesaħ'), 'kesaħtejn', 'Feminine dual should collapse ie before -tejn');
    assertEq(generateFeminineDualFromMasculineWithHint('abbundanza', 'abbundanzi'), 'abbundanztejn', 'Feminine dual should drop final -a before -tejn');
};

run();
console.log('dualForm tests passed');
