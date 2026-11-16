import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInflectionTableSuffix } from '../src/lib/inflectionTable.ts';
import { generateTheoreticalDual } from '../src/lib/maltesePhonology.ts';
import { hasStressedOrLongFinalSyllable } from '../src/lib/nounAttachment.ts';

const SUFFIXES = [0, 1, 2, 3, 4, 5, 6];
const possessives = (base, gender, pattern, ipa) =>
    SUFFIXES.map((idx) => applyInflectionTableSuffix(base, idx, gender, pattern, undefined, ipa));

test('(ġ)iCem stems raise epenthetic e to i before consonant suffixes while non-(ġ)iCem stems keep -e-', () => {
    assert.deepEqual(
        possessives('isem', 'masculine', 'i2v3'),
        ['ismi', 'ismek', 'ismu', 'isimha', 'isimna', 'isimkom', 'isimhom'],
    );
    assert.deepEqual(
        possessives('ġisem', 'masculine', '1v2v3', '/ˈd͡ʒɪ.sɛm/'),
        ['ġismi', 'ġismek', 'ġismu', 'ġisimha', 'ġisimna', 'ġisimkom', 'ġisimhom'],
    );
    assert.equal(generateTheoreticalDual('isem', 'ismijiet', null, 'i2v3', null, 'masculine'), 'ismejn');
    assert.equal(generateTheoreticalDual('ġisem', 'iġsma', null, '1v2v3', null, 'masculine'), 'ġismejn');

    // Control stems with 2 medial consonants or non-(ġ)iCem roots preserve -e- before consonant suffixes
    assert.deepEqual(
        possessives('tifel', 'masculine', 'CvCvC'),
        ['tifli', 'tiflek', 'tiflu', 'tifelha', 'tifelna', 'tifelkom', 'tifelhom'],
    );
    assert.deepEqual(
        possessives('miklem', 'masculine', 'mi12v3'),
        ['miklmi', 'miklmek', 'miklmu', 'miklemha', 'miklemna', 'miklemkom', 'miklemhom'],
    );
    assert.deepEqual(
        possessives('riġel', 'feminine', '1v2v3'),
        ['riġli', 'riġlek', 'riġlu', 'riġelha', 'riġelna', 'riġelkom', 'riġelhom'],
    );
});

test('hasStressedOrLongFinalSyllable ignores prefix vowels before abstract v slots in mi12v3/i2v3 while preserving -igħ and final i/u/ie stems', () => {
    assert.equal(hasStressedOrLongFinalSyllable(undefined, 'minkeb', 'mi12v3'), false);
    assert.equal(hasStressedOrLongFinalSyllable(undefined, 'minfes', 'mi12v3'), false);
    assert.equal(hasStressedOrLongFinalSyllable(undefined, 'isem', 'i2v3'), false);

    assert.equal(generateTheoreticalDual('minkeb', 'mniekeb', null, 'mi12v3', null, 'masculine'), 'minkbejn');
    assert.equal(generateTheoreticalDual('minfes', 'mniefes', null, 'mi12v3', null, 'masculine'), 'minfsejn');
    assert.deepEqual(
        possessives('minkeb', 'masculine', 'mi12v3'),
        ['minkbi', 'minkbek', 'minkbu', 'minkebha', 'minkebna', 'minkebkom', 'minkebhom'],
    );

    // Final-syllable long i/u/ie patterns and trailing -igħ stems remain unsyncopated
    assert.equal(hasStressedOrLongFinalSyllable(undefined, 'ħabib', 'CaCiC'), true);
    assert.equal(hasStressedOrLongFinalSyllable(undefined, 'tibdil', 'ti12v3'), true);
    assert.equal(hasStressedOrLongFinalSyllable(undefined, 'tibwigħ', 'ti12v3'), true);
    assert.equal(hasStressedOrLongFinalSyllable(undefined, 'uġigħ', 'u2v3'), true);
    assert.deepEqual(
        possessives('uġigħ', 'masculine', 'u2v3'),
        ['uġigħi', 'uġigħek', 'uġigħu', 'uġigħha', 'uġigħna', 'uġigħkom', 'uġigħhom'],
    );
});
