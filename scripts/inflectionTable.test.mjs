import { applyInflectionTableSuffix } from '../src/lib/inflectionTable.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const runCase = (base, pattern, expectedForms, messagePrefix) => {
    expectedForms.forEach((expected, idx) => {
        const actual = applyInflectionTableSuffix(base, idx, 'masculine', pattern, '');
        assertEq(actual, expected, `${messagePrefix} (${idx})`);
    });
};

const run = () => {
    runCase(
        'allat',
        '-at',
        ['allati', 'allatek', 'allatu', 'allatha', 'allatna', 'allatkom', 'allathom'],
        'Plural sound suffix -at should stay fully attached',
    );

    runCase(
        'alliet',
        '-iet',
        ['allieti', 'allietek', 'allietu', 'allietha', 'allietna', 'allietkom', 'alliethom'],
        'Plural sound suffix -iet should stay fully attached',
    );
};

run();
console.log('inflectionTable tests passed');
