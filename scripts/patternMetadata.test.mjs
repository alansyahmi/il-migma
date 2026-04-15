import { getPatternMetadataSummary, normalizePatternFormValue } from '../src/lib/patternMetadata.ts';
import {
    buildPatternOptions,
    mergePatternBucketApplicabilities,
} from '../src/lib/patternBuckets.ts';
import { normalizePatternFormValue as normalizePatternFormValueServer } from '../functions/api/admin/patternMetadata.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    const input = {
        cv: 'CvC',
        wizen: 'faghal',
        stress: 2,
        metadata: {
            metadata: {
                root_nested: 'root-value',
            },
            root_extra: 'root-extra',
        },
        applicabilities: [
            {
                pos: 'NOUN',
                linguistic_role: 'broken_plural',
                gender: 'feminine',
                notes: 'keep this',
                metadata: {
                    metadata: {
                        nested_extra: 'nested-value',
                    },
                    extra: 'value',
                    class: 'strong',
                    strength: 'strong',
                    weak_class: 'defective',
                },
            },
        ],
    };

    const normalized = normalizePatternFormValue(input, 'broken_pattern');
    const app = normalized.applicabilities?.[0];

    assert(app, 'Expected one normalized applicability');
    assertEq(app.pos, 'noun', 'POS should be normalized to lowercase');
    assertEq(app.linguisticRole, 'broken_plural', 'Linguistic role should be preserved');
    assertEq(app.gender, 'feminine', 'Gender should be preserved');
    assertEq(app.notes, 'keep this', 'Notes should be preserved');
    assertEq(app.metadata.extra, 'value', 'Metadata extras should be preserved');
    assertEq(app.metadata.nested_extra, 'nested-value', 'Nested metadata should be flattened');
    assert(!('metadata' in app.metadata), 'Applicability metadata should not re-nest metadata');
    assert(!('class' in app.metadata), 'Legacy class metadata should be removed');
    assert(!('strength' in app.metadata), 'Legacy strength metadata should be removed');
    assert(!('weak_class' in app.metadata), 'Legacy weak class metadata should be removed');

    assertEq(normalized.metadata.root_extra, 'root-extra', 'Root metadata extras should be preserved');
    assertEq(normalized.metadata.root_nested, 'root-value', 'Root nested metadata should be flattened');
    assert(!('metadata' in normalized.metadata), 'Root metadata should not re-nest metadata');

    const duplicateInput = {
        cv: 'CvC',
        wizen: 'faghal',
        stress: 2,
        applicabilities: [
            {
                pos: 'noun',
                linguistic_role: 'broken_plural',
                gender: 'feminine',
                clientId: 'noun-1',
                metadata: {
                    extra: 'value-1',
                },
            },
            {
                pos: 'noun',
                linguistic_role: 'sound_plural',
                gender: 'masculine',
                clientId: 'noun-2',
                metadata: {
                    extra: 'value-2',
                },
            },
        ],
    };

    const duplicateNormalized = normalizePatternFormValue(duplicateInput, 'broken_pattern');
    assertEq(duplicateNormalized.applicabilities?.length, 2, 'Duplicate POS roles should be preserved');
    assertEq(duplicateNormalized.applicabilities?.[0].clientId, 'noun-1', 'Client IDs should survive client normalization');
    assertEq(duplicateNormalized.applicabilities?.[1].clientId, 'noun-2', 'Client IDs should survive client normalization');
    assertEq(duplicateNormalized.applicabilities?.[0].linguisticRole, 'broken_plural', 'First duplicate role should be preserved');
    assertEq(duplicateNormalized.applicabilities?.[1].linguisticRole, 'sound_plural', 'Second duplicate role should be preserved');

    const summary = getPatternMetadataSummary(input, 'broken_pattern');
    assertEq(summary.linguisticRole, 'broken_plural', 'Summary should expose linguistic role');
    assertEq(summary.gender, 'feminine', 'Summary should expose gender');
    assertEq(summary.notes, 'keep this', 'Summary should expose notes');

    const source = [
        { cv: 'masc-sing', wizen: 'masc-sing', pos_types: ['noun'], linguistic_role: 'masculine_singular', gender: 'masculine' },
        { cv: 'fem-sing', wizen: 'fem-sing', pos_types: ['noun'], linguistic_role: 'feminine_singular', gender: 'feminine' },
        { cv: 'broken-pl', wizen: 'broken-pl', pos_types: ['noun'], linguistic_role: 'broken_plural', gender: 'masculine' },
        { cv: 'unlabeled', wizen: 'unlabeled', pos_types: ['noun'] },
    ];

    const masculineOptions = buildPatternOptions(source, 'standard', {
        pos: 'noun',
        roles: ['masculine_singular'],
        gender: 'masculine',
    });

    const feminineOptions = buildPatternOptions(source, 'standard', {
        pos: 'noun',
        roles: ['feminine_singular'],
        gender: 'feminine',
    });

    assertEq(masculineOptions.length, 1, 'Masculine singular filters should only keep matching singular patterns');
    assertEq(masculineOptions[0].value, 'masc-sing', 'Masculine singular filter should select the masculine singular pattern');
    assertEq(feminineOptions.length, 1, 'Feminine singular filters should only keep matching singular patterns');
    assertEq(feminineOptions[0].value, 'fem-sing', 'Feminine singular filter should select the feminine singular pattern');

    const remainingOptions = buildPatternOptions([
        { cv: 'prep-pattern', wizen: 'prep-pattern', pos_types: ['preposition'] },
        { cv: 'verb-pattern', wizen: 'verb-pattern', pos_types: ['verb'] },
    ], 'standard', {
        pos: 'preposition',
    });

    assertEq(remainingOptions.length, 1, 'Preposition should be eligible for pattern suggestions');
    assertEq(remainingOptions[0].value, 'prep-pattern', 'Preposition pattern should be returned by the filter');

    const merged = mergePatternBucketApplicabilities(
        {
            cv: 'CvC',
            wizen: 'faghal',
            stress: 2,
            pos_types: ['noun'],
            applicabilities: [
                {
                    pos: 'noun',
                    strength: 'broken_plural',
                    gender: 'feminine',
                    clientId: 'noun-1',
                    metadata: {
                        extra: 'value-1',
                    },
                },
                {
                    pos: 'noun',
                    strength: 'sound_plural',
                    gender: 'masculine',
                    clientId: 'noun-2',
                    metadata: {
                        extra: 'value-2',
                    },
                },
            ],
        },
        ['verb', 'noun'],
    );

    assertEq(merged.pos_types.join(','), 'noun,verb', 'Merged pattern should dedupe and append new POS types');
    assertEq(merged.applicabilities.length, 3, 'Merged pattern should preserve duplicate POS rows and backfill missing POS');
    const mergedVerb = merged.applicabilities.find((app) => app.pos === 'verb');
    assert(mergedVerb, 'Merged pattern should include a blank verb applicability');
    assertEq(mergedVerb.strength, '', 'Backfilled POS applicability should start blank');
    assertEq(mergedVerb.gender, '', 'Backfilled POS applicability should start blank');
    assertEq(mergedVerb.weakClass, '', 'Backfilled POS applicability should start blank');
    assertEq(mergedVerb.participleType, '', 'Backfilled POS applicability should start blank');
    assertEq(mergedVerb.numeralType, '', 'Backfilled POS applicability should start blank');
    const mergedNouns = merged.applicabilities.filter((app) => app.pos === 'noun');
    assertEq(mergedNouns.length, 2, 'Merged pattern should keep both noun applicabilities');
    assertEq(mergedNouns[0].clientId, 'noun-1', 'First noun applicability should keep its client ID');
    assertEq(mergedNouns[1].clientId, 'noun-2', 'Second noun applicability should keep its client ID');
    assertEq(mergedNouns[0].strength, 'broken_plural', 'First noun applicability metadata should be preserved');
    assertEq(mergedNouns[1].strength, 'sound_plural', 'Second noun applicability metadata should be preserved');
    assertEq(mergedNouns[0].metadata.extra, 'value-1', 'First noun applicability metadata payload should be preserved');
    assertEq(mergedNouns[1].metadata.extra, 'value-2', 'Second noun applicability metadata payload should be preserved');

    const mergedRemaining = mergePatternBucketApplicabilities(
        {
            cv: 'CvC',
            wizen: 'faghal',
            stress: 2,
            pos_types: ['preposition'],
        },
        ['preposition'],
    );

    assertEq(mergedRemaining.pos_types.join(','), 'preposition', 'Remaining POS should be kept when merging pattern buckets');
    assertEq(mergedRemaining.applicabilities.length, 1, 'Remaining POS should get a single blank applicability');
    const mergedPreposition = mergedRemaining.applicabilities[0];
    assertEq(mergedPreposition.pos, 'preposition', 'Remaining POS applicability should preserve the POS');
    assertEq(mergedPreposition.strength || '', '', 'Remaining POS applicability should not invent metadata');
    assertEq(Object.keys(mergedPreposition.metadata || {}).length, 0, 'Remaining POS applicability metadata should stay empty');

    const serverNormalized = normalizePatternFormValueServer(
        {
            cv: 'CvC',
            wizen: 'faghal',
            stress: 2,
            pos_types: ['noun', 'verb'],
            applicabilities: [
                {
                    pos: 'noun',
                    linguistic_role: 'broken_plural',
                    gender: 'feminine',
                    clientId: 'noun-1',
                    notes: 'keep this',
                    metadata: {
                        extra: 'value',
                    },
                },
                {
                    pos: 'noun',
                    linguistic_role: 'sound_plural',
                    gender: 'masculine',
                    clientId: 'noun-2',
                    notes: 'keep this too',
                    metadata: {
                        extra: 'value-2',
                    },
                },
            ],
        },
        'broken_pattern',
    );

    assertEq(serverNormalized.pos_types.join(','), 'noun,verb', 'Server normalization should keep the merged POS list');
    assertEq(serverNormalized.applicabilities.length, 2, 'Server normalization should preserve duplicate POS rows');
    assertEq(serverNormalized.applicabilities?.[0].clientId, 'noun-1', 'Server normalization should preserve client IDs');
    assertEq(serverNormalized.applicabilities?.[1].clientId, 'noun-2', 'Server normalization should preserve client IDs');
    assertEq(serverNormalized.applicabilities?.[0].linguisticRole, 'broken_plural', 'Server normalization should preserve the first role');
    assertEq(serverNormalized.applicabilities?.[1].linguisticRole, 'sound_plural', 'Server normalization should preserve the second role');

    const serverNoMetadata = normalizePatternFormValueServer(
        {
            cv: 'CvC',
            wizen: 'faghal',
            stress: 2,
            pos_types: ['preposition'],
            applicabilities: [
                {
                    pos: 'preposition',
                    linguistic_role: 'prep',
                    gender: 'feminine',
                    notes: 'ignore me',
                    metadata: {
                        extra: 'value',
                    },
                },
            ],
        },
        'cv_wizen_pattern',
    );

    assertEq(serverNoMetadata.applicabilities.length, 1, 'Server normalization should keep the preposition applicability');
    const serverPreposition = serverNoMetadata.applicabilities[0];
    assertEq(serverPreposition.pos, 'preposition', 'Server normalization should preserve the remaining POS');
    assertEq(serverPreposition.linguisticRole || '', '', 'Server normalization should strip metadata from remaining POS');
    assertEq(serverPreposition.gender || '', '', 'Server normalization should strip gender from remaining POS');
    assertEq(serverPreposition.notes || '', '', 'Server normalization should strip notes from remaining POS');
    assertEq(Object.keys(serverPreposition.metadata || {}).length, 0, 'Server normalization should not retain metadata for remaining POS');
};

run();
console.log('patternMetadata tests passed');
