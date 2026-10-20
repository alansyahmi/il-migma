import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolvePrepositionCliticKey,
    getPrepositionArticleMatrix
} from '../src/lib/prepositionArticleMatrix.ts';

test('resolvePrepositionCliticKey matches all 9 closed prepositions and aliases', () => {
    assert.equal(resolvePrepositionCliticKey("ta'"), "ta'");
    assert.equal(resolvePrepositionCliticKey("t'"), "ta'");
    assert.equal(resolvePrepositionCliticKey("ta"), "ta'");
    assert.equal(resolvePrepositionCliticKey("ma'"), "ma'");
    assert.equal(resolvePrepositionCliticKey("m'"), "ma'");
    assert.equal(resolvePrepositionCliticKey("fi"), "fi");
    assert.equal(resolvePrepositionCliticKey("f'"), "fi");
    assert.equal(resolvePrepositionCliticKey("bi"), "bi");
    assert.equal(resolvePrepositionCliticKey("b'"), "bi");
    assert.equal(resolvePrepositionCliticKey("minn"), "minn");
    assert.equal(resolvePrepositionCliticKey("lil"), "lil");
    assert.equal(resolvePrepositionCliticKey("l'"), "lil");
    assert.equal(resolvePrepositionCliticKey("għal"), "għal");
    assert.equal(resolvePrepositionCliticKey("sa"), "sa");
    assert.equal(resolvePrepositionCliticKey("bħal"), "bħal");

    // Articles should not trigger
    assert.equal(resolvePrepositionCliticKey("il-", "article"), null);
    assert.equal(resolvePrepositionCliticKey("l-", "article"), null);
    assert.equal(resolvePrepositionCliticKey("ktieb", "noun"), null);
});

test('getPrepositionArticleMatrix produces correct Sun/Moon matrix for ta\'', () => {
    const matrix = getPrepositionArticleMatrix("ta'");
    assert.ok(matrix);
    assert.equal(matrix.headword, "ta'");
    assert.equal(matrix.sunTransformations.length, 9);
    assert.equal(matrix.moonTransformations.length, 15);

    // Check Sun letters
    const cTransform = matrix.sunTransformations.find(t => t.letter === 'ċ');
    assert.ok(cTransform);
    assert.equal(cTransform.cliticForm, 'taċ-');
    assert.equal(cTransform.rule, "ta' + iċ- → taċ-");
    assert.equal(cTransform.result, 'taċ-ċertu');

    const dTransform = matrix.sunTransformations.find(t => t.letter === 'd');
    assert.ok(dTransform);
    assert.equal(dTransform.cliticForm, 'tad-');
    assert.equal(dTransform.result, 'tad-dar');

    // Check Moon letters
    const bTransform = matrix.moonTransformations.find(t => t.letter === 'b');
    assert.ok(bTransform);
    assert.equal(bTransform.cliticForm, 'tal-');
    assert.equal(bTransform.rule, "ta' + il- → tal-");
    assert.equal(bTransform.result, 'tal-bieb');

    // Check Vowels
    assert.equal(matrix.vowelTransformation.cliticForm, 'tal-');
    assert.equal(matrix.vowelTransformation.result, 'tal-omm');
});

test('getPrepositionArticleMatrix produces geminate Moon forms for minn and bħal, with single l before l', () => {
    const minnMatrix = getPrepositionArticleMatrix("minn");
    assert.ok(minnMatrix);

    const bTransform = minnMatrix.moonTransformations.find(t => t.letter === 'b');
    assert.ok(bTransform);
    assert.equal(bTransform.cliticForm, 'mill-');
    assert.equal(bTransform.result, 'mill-bieb');

    // Before l, single l rule applies (mil-lejl)
    const lTransform = minnMatrix.moonTransformations.find(t => t.letter === 'l');
    assert.ok(lTransform);
    assert.equal(lTransform.cliticForm, 'mil-');
    assert.equal(lTransform.result, 'mil-lejl');

    // Sun letter
    const sTransform = minnMatrix.sunTransformations.find(t => t.letter === 's');
    assert.ok(sTransform);
    assert.equal(sTransform.cliticForm, 'mis-');
    assert.equal(sTransform.result, 'mis-sema');
});

test('getPrepositionArticleMatrix returns null for non-clitic words', () => {
    assert.equal(getPrepositionArticleMatrix("qrib"), null);
    assert.equal(getPrepositionArticleMatrix("wara"), null);
});
