import { applyInflectionTableSuffix } from '../src/lib/inflectionTable.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    assertEq(
        applyInflectionTableSuffix('kontra', 0),
        'kontrija',
        'Base inference should switch kontr-a to kontri-'
    );
    assertEq(
        applyInflectionTableSuffix('kiesaħ', 0, 'masculine', undefined, 'ħ'),
        'kiesħi',
        'Final-syllable vowels should collapse before -i'
    );
    assertEq(
        applyInflectionTableSuffix('kiesaħ', 1, 'masculine', undefined, 'ħ'),
        'kiesħek',
        'Final-syllable vowels should collapse before -k'
    );
    assertEq(
        applyInflectionTableSuffix('kiesaħ', 2, 'masculine', undefined, 'ħ'),
        'kiesħu',
        'Final-syllable vowels should collapse before -u'
    );
    assertEq(
        applyInflectionTableSuffix('wara', 4, 'masculine', undefined, 'r'),
        'warajna',
        'Later suffixes should keep the existing glide behavior'
    );
};

run();
console.log('inflectionTableRule tests passed');
