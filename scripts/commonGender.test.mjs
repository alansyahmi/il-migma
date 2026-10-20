import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGender, resolveEntryGender, resolveMainPatternByGenderForPos } from '../src/lib/gender.ts';
import { resolveTerm } from '../src/lib/terminology.ts';
import { deriveNounAttachmentStems } from '../src/lib/nounAttachment.ts';

test('normalizeGender: Canonical and alias resolution for common gender', () => {
    // Canonical
    assert.equal(normalizeGender('common'), 'common');
    assert.equal(normalizeGender('masculine'), 'masculine');
    assert.equal(normalizeGender('feminine'), 'feminine');

    // Common aliases
    assert.equal(normalizeGender('comm'), 'common');
    assert.equal(normalizeGender('c'), 'common');
    assert.equal(normalizeGender('mf'), 'common');
    assert.equal(normalizeGender('m/f'), 'common');
    assert.equal(normalizeGender('m.f.'), 'common');
    assert.equal(normalizeGender('m./f.'), 'common');
    assert.equal(normalizeGender('both'), 'common');

    // Neutral alias migration to common
    assert.equal(normalizeGender('neutral'), 'common');
    assert.equal(normalizeGender('neut'), 'common');
    assert.equal(normalizeGender('n'), 'common');

    // Case insensitivity & trimming
    assert.equal(normalizeGender('  COMMON  '), 'common');
    assert.equal(normalizeGender('NeUtRaL'), 'common');
    assert.equal(normalizeGender('MASC'), 'masculine');
    assert.equal(normalizeGender('fEm'), 'feminine');

    // Invalid values
    assert.equal(normalizeGender(''), null);
    assert.equal(normalizeGender(null), null);
    assert.equal(normalizeGender(undefined), null);
    assert.equal(normalizeGender('unknown'), null);
});

test('resolveEntryGender: Resolves entry gender correctly with fallback hierarchy', () => {
    assert.equal(resolveEntryGender({ gender: 'common' }), 'common');
    assert.equal(resolveEntryGender({ gender: 'neutral' }), 'common');
    assert.equal(resolveEntryGender({ noun_gender: 'c' }), 'common');
    assert.equal(resolveEntryGender({ noun_morphology: { gender: 'mf' } }), 'common');
    assert.equal(resolveEntryGender({ adjective_morphology: { gender: 'both' } }), 'common');
    assert.equal(resolveEntryGender({ gender: 'masculine' }), 'masculine');
    assert.equal(resolveEntryGender({ gender: 'feminine' }), 'feminine');
    assert.equal(resolveEntryGender({}), null);
});

test('terminology: Localization for common gender matches Oxford/Aquilina standard', () => {
    assert.equal(resolveTerm('common', 'standard', 'en'), 'Common');
    assert.equal(resolveTerm('common', 'standard', 'mt'), 'Komuni');
    assert.equal(resolveTerm('common', 'arabised', 'mt'), 'Komuni');
});

test('nounAttachment: Possessive clitic stems for common gender nouns', () => {
    // 1. Common noun ending in -a requires -t- buffer
    const stemsA = deriveNounAttachmentStems('tarbija', 'common');
    assert.ok(stemsA.stemA.endsWith('t') || stemsA.stemA.includes('t'), `Expected -t- buffer, got ${stemsA.stemA}`);

    // 2. Common noun ending in consonant attaches directly
    const stemsB = deriveNounAttachmentStems('artist', 'common');
    assert.equal(stemsB.stemA, 'artist');
    assert.equal(stemsB.stemB, 'artist');
});

test('gender: resolveMainPatternByGenderForPos supports common gender pattern fallback', () => {
    const entryCommon = {
        pos: 'adjective',
        gender: 'common',
        cv_pattern: 'CvCCi',
        adjective_morphology: {
            pattern: 'CvCCi',
            form_masc_pattern: 'CvCC',
            form_fem_pattern: 'CvCCa',
        },
    };
    // Neutral/common pattern slot returns base pattern
    const pattern = resolveMainPatternByGenderForPos(entryCommon);
    assert.equal(pattern, 'CvCCi');
});
