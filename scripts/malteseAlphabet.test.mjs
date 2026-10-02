import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MALTESE_ALPHABET,
    getMalteseInitialLetter,
    matchesMalteseLetter,
    normalizeHeadwordForAlpha,
} from '../src/lib/malteseAlphabet.ts';

test('Maltese Alphabet: 30 letters in exact abċ order', () => {
    assert.equal(MALTESE_ALPHABET.length, 30);
    assert.deepEqual(MALTESE_ALPHABET, [
        'A', 'B', 'Ċ', 'D', 'E', 'F', 'Ġ', 'G', 'Għ', 'H', 'Ħ', 'I', 'Ie', 'J', 'K',
        'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Ż', 'Z'
    ]);
});

test('Maltese Alphabet: Normalization removes leading theoretical marks and punctuation', () => {
    assert.equal(normalizeHeadwordForAlpha('*fieghal'), 'fieghal');
    assert.equal(normalizeHeadwordForAlpha('-hom'), 'hom');
    assert.equal(normalizeHeadwordForAlpha("'il-kelma"), 'il-kelma');
    assert.equal(normalizeHeadwordForAlpha('  *tfaghghal  '), 'tfaghghal');
});

test('Maltese Alphabet: Digraph Għ vs G vs Ġ classification', () => {
    // Għ
    assert.equal(getMalteseInitialLetter('għasfur'), 'Għ');
    assert.equal(getMalteseInitialLetter('Għasfur'), 'Għ');
    assert.equal(getMalteseInitialLetter('ghamel'), 'Għ');
    assert.ok(matchesMalteseLetter('għasfur', 'Għ'));
    assert.ok(!matchesMalteseLetter('għasfur', 'G'));
    assert.ok(!matchesMalteseLetter('għasfur', 'Ġ'));

    // G
    assert.equal(getMalteseInitialLetter('gvern'), 'G');
    assert.ok(matchesMalteseLetter('gvern', 'G'));
    assert.ok(!matchesMalteseLetter('gvern', 'Għ'));
    assert.ok(!matchesMalteseLetter('gvern', 'Ġ'));

    // Ġ
    assert.equal(getMalteseInitialLetter('ġens'), 'Ġ');
    assert.ok(matchesMalteseLetter('ġens', 'Ġ'));
    assert.ok(!matchesMalteseLetter('ġens', 'G'));
    assert.ok(!matchesMalteseLetter('ġens', 'Għ'));
});

test('Maltese Alphabet: Digraph Ie vs I classification', () => {
    assert.equal(getMalteseInitialLetter('iebes'), 'Ie');
    assert.ok(matchesMalteseLetter('iebes', 'Ie'));
    assert.ok(!matchesMalteseLetter('iebes', 'I'));

    assert.equal(getMalteseInitialLetter('id'), 'I');
    assert.ok(matchesMalteseLetter('id', 'I'));
    assert.ok(!matchesMalteseLetter('id', 'Ie'));
});

test('Maltese Alphabet: H vs Ħ classification', () => {
    assert.equal(getMalteseInitialLetter('hemm'), 'H');
    assert.ok(matchesMalteseLetter('hemm', 'H'));
    assert.ok(!matchesMalteseLetter('hemm', 'Ħ'));

    assert.equal(getMalteseInitialLetter('ħobż'), 'Ħ');
    assert.ok(matchesMalteseLetter('ħobż', 'Ħ'));
    assert.ok(!matchesMalteseLetter('ħobż', 'H'));
});

test('Maltese Alphabet: Ż vs Z classification', () => {
    assert.equal(getMalteseInitialLetter('żiemel'), 'Ż');
    assert.ok(matchesMalteseLetter('żiemel', 'Ż'));
    assert.ok(!matchesMalteseLetter('żiemel', 'Z'));

    assert.equal(getMalteseInitialLetter('zokk'), 'Z');
    assert.ok(matchesMalteseLetter('zokk', 'Z'));
    assert.ok(!matchesMalteseLetter('zokk', 'Ż'));
});

test('Maltese Alphabet: Ċ matches ċ and loanword c', () => {
    assert.equal(getMalteseInitialLetter('ċavetta'), 'Ċ');
    assert.equal(getMalteseInitialLetter('computer'), 'Ċ');
    assert.ok(matchesMalteseLetter('ċavetta', 'Ċ'));
    assert.ok(matchesMalteseLetter('computer', 'Ċ'));
});

test('Maltese Alphabet: Theoretical entries with * correctly match initial letter', () => {
    assert.equal(getMalteseInitialLetter('*fieghal'), 'F');
    assert.ok(matchesMalteseLetter('*fieghal', 'F'));

    assert.equal(getMalteseInitialLetter('*tfaghghal'), 'T');
    assert.ok(matchesMalteseLetter('*tfaghghal', 'T'));

    assert.equal(getMalteseInitialLetter('*nfaghal'), 'N');
    assert.ok(matchesMalteseLetter('*nfaghal', 'N'));
});

test('Maltese Alphabet: all matches everything', () => {
    assert.ok(matchesMalteseLetter('*fieghal', 'all'));
    assert.ok(matchesMalteseLetter('agixxa', ''));
    assert.ok(matchesMalteseLetter(null, 'all'));
});
