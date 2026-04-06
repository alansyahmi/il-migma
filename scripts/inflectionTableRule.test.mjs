import { applyInflectionTableSuffix } from '../src/lib/inflectionTable.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    const assertRow = (base, gender, expected, pattern, thirdRadical) => {
        const actual = [0, 1, 2, 3, 4, 5, 6].map((idx) => applyInflectionTableSuffix(base, idx, gender, pattern, thirdRadical));
        assertEq(actual.join(' | '), expected.join(' | '), `Unexpected table forms for ${base}`);
    };

    assertEq(
        applyInflectionTableSuffix('kontra', 0),
        'kontrija',
        'Base inference should switch kontr-a to kontri-'
    );
    assertEq(
        applyInflectionTableSuffix('kotba', 0, 'masculine', 'CoCCa', 't'),
        'kotbaji',
        'CoCCa-style plurals should use the -aj- stem when attached'
    );
    assertEq(
        applyInflectionTableSuffix('kotba', 1, 'masculine', 'CoCCa', 't'),
        'kotbajek',
        'CoCCa-style plurals should keep the -aj- stem for -ek'
    );
    assertEq(
        applyInflectionTableSuffix('kotba', 0, 'masculine'),
        'kotbaji',
        'kotba should use the -aj- stem even without an explicit pattern'
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
    assertRow(
        'dar',
        'masculine',
        ['dari', 'darek', 'daru', 'darha', 'darna', 'darkom', 'darhom'],
    );
    assertRow(
        'qra',
        'masculine',
        ['qrai', 'qraek', 'qrau', 'qraha', 'qrana', 'qrakom', 'qrahom'],
    );
    assertRow(
        'għomor',
        'masculine',
        ['għomri', 'għomrok', 'għomru', 'għomorha', 'għomorna', 'għomorkom', 'għomorhom'],
    );
    assertRow(
        'ġisem',
        'masculine',
        ['ġismi', 'ġismek', 'ġismu', 'ġisimha', 'ġisimna', 'ġisimkom', 'ġisimhom'],
    );
    assertRow(
        'ziju',
        'masculine',
        ['zijuwi', 'zijuk', 'zijuh', 'zijuha', 'zijuna', 'zijukom', 'zijuhom'],
    );
    assertRow(
        'darba',
        'feminine',
        ['darbti', 'darbtek', 'darbtu', 'darbitha', 'darbitna', 'darbitkom', 'darbithom'],
    );
    assertRow(
        'drabi',
        'feminine',
        ['drabija', 'drabik', 'drabih', 'drabiha', 'drabina', 'drabikom', 'drabihom'],
    );
    assertRow(
        'ilma',
        'masculine',
        ['ilmaji', 'ilmajek', 'ilmaju', 'ilmajha', 'ilmajna', 'ilmajkom', 'ilmajhom'],
        undefined,
        'j',
    );
    assertEq(
        applyInflectionTableSuffix('wara', 4, 'masculine', undefined, 'r'),
        'warajna',
        'Later suffixes should keep the existing glide behavior'
    );
};

run();
console.log('inflectionTableRule tests passed');
