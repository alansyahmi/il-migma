import assert from 'node:assert/strict';
import { buildEntryPayload } from '../src/lib/adminSchema.ts';

const run = () => {
    const prepositionPayload = buildEntryPayload({
        id: 'prep-bejn',
        headword: 'bejn',
        pos: 'preposition',
        cv_pattern: 'CCvC',
        form_masc_pattern: 'WRONG',
        form_fem_pattern: 'WRONG',
    });

    assert.strictEqual(
        prepositionPayload.cv_pattern,
        'CCvC',
        'Preposition entries should keep the direct cv_pattern value'
    );

    const nounPayload = buildEntryPayload({
        id: 'noun-kelma',
        headword: 'kelma',
        pos: 'noun',
        gender: 'feminine',
        cv_pattern: '',
        form_fem_pattern: 'CaCCa',
        form_masc_pattern: 'WRONG',
    });

    assert.strictEqual(
        nounPayload.cv_pattern,
        'CaCCa',
        'Legacy gendered entries should still fall back to the mirrored pattern slot'
    );

    const nounDirectPayload = buildEntryPayload({
        id: 'noun-kelma-2',
        headword: 'kelma',
        pos: 'noun',
        gender: 'feminine',
        cv_pattern: 'CUSTOM',
        form_fem_pattern: 'CaCCa',
        form_masc_pattern: 'WRONG',
    });

    assert.strictEqual(
        nounDirectPayload.cv_pattern,
        'CUSTOM',
        'Direct cv_pattern should win when it is present'
    );
};

run();
console.log('entryPayload tests passed');
