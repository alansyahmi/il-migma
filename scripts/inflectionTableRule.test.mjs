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
        applyInflectionTableSuffix('wara', 0, 'masculine', undefined, 'r'),
        'warija',
        'Masculine -a entries with a non-glide final radical should switch to i + ja'
    );
    assertEq(
        applyInflectionTableSuffix('wara', 1, 'masculine', undefined, 'r'),
        'warik',
        'Masculine -a entries with a non-glide final radical should use -k'
    );
    assertEq(
        applyInflectionTableSuffix('wara', 2, 'masculine', undefined, 'r'),
        'warih',
        'Masculine -a entries with a non-glide final radical should use -h'
    );
    assertEq(
        applyInflectionTableSuffix('wara', 4, 'masculine', undefined, 'r'),
        'warina',
        'Later suffixes should keep the i-shifted stem'
    );
    assertEq(
        applyInflectionTableSuffix('zija', 0, 'masculine', undefined, 'j'),
        'zijajja',
        'Glide-final radicals should keep the existing possessive suffix behavior'
    );
};

run();
console.log('inflectionTableRule tests passed');
