import { generateDiminutiveSoundPlural, generateFeminineDiminutiveSoundPlural } from '../src/lib/maltesePhonology.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    assertEq(
        generateDiminutiveSoundPlural('ktejjeb'),
        'ktejbin',
        'Masculine diminutive sound plural should keep -in',
    );
    assertEq(
        generateFeminineDiminutiveSoundPlural('fwejgħla'),
        'fwejgħlat',
        'Guttural feminine diminutives should use -at',
    );
    assertEq(
        generateFeminineDiminutiveSoundPlural('kwejpla'),
        'kwejpliet',
        'Non-guttural feminine diminutives should use -iet',
    );
};

run();
console.log('diminutiveForm tests passed');
