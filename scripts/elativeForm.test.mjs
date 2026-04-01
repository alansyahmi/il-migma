import { generateElative } from '../src/lib/maltesePhonology.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    assertEq(
        generateElative('k-l-b', 'kelb')?.masculine,
        'ikleb',
        'Non-guttural masculine elatives should keep the e vowel'
    );
    assertEq(
        generateElative('k-l-q', 'kelq')?.masculine,
        'iklaq',
        'A guttural beside the masculine elative vowel should force a'
    );
    assertEq(
        generateElative('b-y-ḍ', 'abjad')?.feminine,
        'boyḍa',
        'Feminine elatives should keep the CoCCa template'
    );
};

run();
console.log('elativeForm tests passed');
