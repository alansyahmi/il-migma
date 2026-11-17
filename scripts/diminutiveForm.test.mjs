import test from 'node:test';
import assert from 'node:assert/strict';
import {
    generateDiminutiveForm,
    generateDiminutiveSoundPlural,
    generateTheoreticalDual,
} from '../src/lib/maltesePhonology.ts';

test('C2 = j dissimilates to w in generic diminutives (sajf -> swajjef, bejt -> bwejjet)', () => {
    const sajfMasc = generateDiminutiveForm('sajf', 's-j-f', null, { gender: 'masculine' });
    assert.equal(sajfMasc?.form, 'swajjef');
    assert.equal(sajfMasc?.pattern, 'CCvjjvC');

    const sajfFem = generateDiminutiveForm('sajf', 's-j-f', null, { gender: 'feminine' });
    assert.equal(sajfFem?.form, 'swajfa');

    const bejtMasc = generateDiminutiveForm('bejt', 'b-j-t', null, { gender: 'masculine' });
    assert.equal(bejtMasc?.form, 'bwejjet');
});

test('Nisba entries (CvCCi / 1v23i) generate -i / -ija diminutives and clean plurals', () => {
    const xitwiMasc = generateDiminutiveForm('xitwi', 'x-t-w', null, {
        basePattern: 'CvCCi',
        gender: 'masculine',
    });
    assert.deepEqual(xitwiMasc, {
        form: 'xtejwi',
        pattern: 'CCvjCi',
        theoretical: true,
    });

    const xitwiFem = generateDiminutiveForm('xitwi', 'x-t-w', null, {
        basePattern: '1v23i',
        gender: 'feminine',
    });
    assert.deepEqual(xitwiFem, {
        form: 'xtejwija',
        pattern: 'CCvjCija',
        theoretical: true,
    });

    assert.equal(generateTheoreticalDual('xtejwi'), 'xtejwiejn');
    assert.equal(generateDiminutiveSoundPlural('xtejwi'), 'xtejwin');
});
