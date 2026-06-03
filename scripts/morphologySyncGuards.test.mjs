import assert from 'node:assert/strict';
import { hasAdjMorphologyInput } from '../src/lib/adjMorphology.ts';
import { normalizeEntryPos } from '../src/lib/entryId.ts';
import {
    hasParticipleMorphologyInput,
    syncParticipleMorphology,
} from '../src/lib/participleMorphology.ts';
import {
    hasNumeralMorphologyInput,
    syncNumeralMorphology,
} from '../src/lib/numeralMorphology.ts';

const run = async () => {
    assert.equal(
        hasParticipleMorphologyInput({ pos: 'noun', gender: 'masculine' }),
        false,
        'noun rows should not be treated as participle morphology input'
    );
    assert.equal(
        hasParticipleMorphologyInput({ pos: 'participle', gender: 'masculine' }),
        true,
        'participle rows should still be treated as participle morphology input'
    );
    assert.equal(
        hasParticipleMorphologyInput({
            pos: 'participle',
            form_masc_pattern: 'CVCVC',
        }),
        true,
        'participle rows should be treated as input when only a pattern field changes'
    );
    assert.equal(
        hasNumeralMorphologyInput({ pos: 'noun', gender: 'feminine', form_masc: 'x' }),
        false,
        'noun rows should not be treated as numeral morphology input'
    );
    assert.equal(
        hasNumeralMorphologyInput({ pos: 'numeral', gender: 'feminine', form_masc: 'x' }),
        true,
        'numeral rows should still be treated as numeral morphology input'
    );
    assert.equal(
        normalizeEntryPos('adj'),
        'adjective',
        'adj should normalize to adjective before save-time branching'
    );
    assert.equal(
        hasAdjMorphologyInput({
            pos: 'adj',
            form_fem: 'twila',
        }),
        true,
        'adj alias rows should still be treated as adjective morphology input'
    );
    assert.equal(
        hasAdjMorphologyInput({
            pos: 'participle',
            form_masc: 'kittieb',
        }),
        true,
        'adjective-compatible participle rows should be treated as morphology input when only form aliases change'
    );
    assert.equal(
        hasAdjMorphologyInput({
            pos: 'participle',
            has_elative: false,
        }),
        true,
        'adjective-compatible participle rows should be treated as morphology input when has_elative changes'
    );

    const stubDb = {
        execute() {
            throw new Error('should not be called for non-matching POS');
        }
    };

    await assert.doesNotReject(
        Promise.all([
            syncParticipleMorphology(stubDb, 'n-ġeddied', { pos: 'noun', gender: 'masculine' }),
            syncNumeralMorphology(stubDb, 'n-ġeddied', { pos: 'noun', gender: 'masculine', form_fem: 'ġġ' }),
        ]),
        'sync helpers should ignore noun payloads'
    );
};

run()
    .then(() => console.log('morphologySyncGuards tests passed'))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
