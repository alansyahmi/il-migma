import { derivePattern } from '../src/lib/maltesePhonology.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    assertEq(
        derivePattern('fietla', 'f-t-l'),
        'CâCCa',
        'Feminine surface ie should be treated as â and final a should stay literal',
    );

    assertEq(
        derivePattern('mara', 'm-r'),
        'CvCa',
        'Word-final a should remain a in the pattern',
    );

    assertEq(
        derivePattern('kitba', 'k-t-b'),
        'CvCCa',
        'Existing ordinary patterns should still derive correctly',
    );
};

run();
console.log('derivePattern tests passed');
