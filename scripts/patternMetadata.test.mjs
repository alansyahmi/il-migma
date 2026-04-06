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
                    metadata: {
                        extra: 'value',
                    },
                },
            ],
        },
        ['verb', 'noun'],
    );

    assertEq(merged.pos_types.join(','), 'noun,verb', 'Merged pattern should dedupe and append new POS types');
    assertEq(merged.applicabilities.length, 2, 'Merged pattern should backfill a blank applicability for missing POS');
    const mergedVerb = merged.applicabilities.find((app) => app.pos === 'verb');
    assert(mergedVerb, 'Merged pattern should include a blank verb applicability');
    assertEq(mergedVerb.strength, '', 'Backfilled POS applicability should start blank');
    assertEq(mergedVerb.gender, '', 'Backfilled POS applicability should start blank');
    assertEq(mergedVerb.weakClass, '', 'Backfilled POS applicability should start blank');
    assertEq(mergedVerb.participleType, '', 'Backfilled POS applicability should start blank');
    assertEq(mergedVerb.numeralType, '', 'Backfilled POS applicability should start blank');
    const mergedNoun = merged.applicabilities.find((app) => app.pos === 'noun');
    assert(mergedNoun, 'Merged pattern should preserve the existing noun applicability');
    assertEq(mergedNoun.strength, 'broken_plural', 'Existing applicability metadata should be preserved');
    assertEq(mergedNoun.metadata.extra, 'value', 'Existing applicability metadata payload should be preserved');

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
                    notes: 'keep this',
                    metadata: {
                        extra: 'value',
                    },
                },
            ],
        },
        'broken_pattern',
    );

    assertEq(serverNormalized.pos_types.join(','), 'noun,verb', 'Server normalization should keep the merged POS list');
    assertEq(serverNormalized.applicabilities.length, 2, 'Server normalization should materialize the missing POS bucket');
    const serverVerb = serverNormalized.applicabilities.find((app) => app.pos === 'verb');
    assert(serverVerb, 'Server normalization should include a blank verb applicability');
    assertEq(serverVerb.linguisticRole, '', 'Server backfill should not invent linguistic role metadata');
    assertEq(serverVerb.gender, '', 'Server backfill should not invent gender metadata');
    assertEq(serverVerb.notes, '', 'Server backfill should not invent notes metadata');
};

run();
console.log('patternMetadata tests passed');
