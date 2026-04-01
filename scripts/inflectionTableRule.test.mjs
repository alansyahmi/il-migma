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
        applyInflectionTableSuffix('kotba', 0, 'masculine', 'CvCCa', 't'),
        'kotobti',
        'CvCCa-style plurals should use the construct stem when attached'
    );
    assertEq(
        applyInflectionTableSuffix('kotba', 1, 'masculine', 'CvCCa', 't'),
        'kotobtok',
        'Final-vowel harmony should use -ok when the last vowel is o'
    );
    assertEq(
        applyInflectionTableSuffix('qmura', 0, 'masculine', 'CCûCa', 'r'),
        'qmurti',
        'CCuCa-style plurals should add t before the suffix'
    );
    assertEq(
        applyInflectionTableSuffix('qmura', 4, 'masculine', 'CCûCa', 'r'),
        'qmurtna',
        'CCuCa-style plurals should keep the t-marbuta construct stem'
    );
    assertEq(
        applyInflectionTableSuffix('oqmra', 0, 'masculine', 'iCCCa', 'r'),
        'oqmirti',
        'iCCCa-style plurals should preserve the internal i in construct forms'
    );
    assertEq(
        applyInflectionTableSuffix('oqmra', 4, 'masculine', 'iCCCa', 'r'),
        'oqmirtna',
        'iCCCa-style plurals should attach suffixes to the construct stem'
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
