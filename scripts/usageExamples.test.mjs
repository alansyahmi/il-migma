import test from 'node:test';
import assert from 'node:assert/strict';
import { entryToForm, buildLoadedEntryPatch, hydrateEntryRow } from '../src/lib/entryBridge.ts';
import { buildEntryPayload } from '../src/lib/adminSchema.ts';

test('entryToForm: correctly hydrates usage_examples from mt/en format in DB', () => {
    const dbEntry = {
        id: 'test-verb-1',
        headword: 'kien',
        pos: 'verb',
        usage_examples: [
            {
                mt: 'Kien ferħan ħafna meta rċieva r-riżultat tal-eżami.',
                en: 'He was very happy when he received the exam result.'
            },
            {
                mt: 'Kienet hemm il-bieraħ.',
                en: 'She was there yesterday.'
            }
        ]
    };

    const form = entryToForm(dbEntry);

    assert.equal(form.usage_example, 'Kien ferħan ħafna meta rċieva r-riżultat tal-eżami.');
    assert.equal(form.usage_example_en, 'He was very happy when he received the exam result.');
    assert.equal(form.usage_examples.length, 2);
    assert.equal(form.usage_examples[0].text_mt, 'Kien ferħan ħafna meta rċieva r-riżultat tal-eżami.');
    assert.equal(form.usage_examples[0].text_en, 'He was very happy when he received the exam result.');
    assert.equal(form.usage_examples[1].text_mt, 'Kienet hemm il-bieraħ.');
    assert.equal(form.usage_examples[1].text_en, 'She was there yesterday.');
});

test('entryToForm: falls back to top-level usage_example and usage_example_en', () => {
    const legacyEntry = {
        id: 'test-noun-1',
        headword: 'ktieb',
        pos: 'noun',
        usage_example: 'Aqra dan il-ktieb sew.',
        usage_example_en: 'Read this book carefully.'
    };

    const form = entryToForm(legacyEntry);

    assert.equal(form.usage_example, 'Aqra dan il-ktieb sew.');
    assert.equal(form.usage_example_en, 'Read this book carefully.');
    assert.equal(form.usage_examples.length, 1);
    assert.equal(form.usage_examples[0].text_mt, 'Aqra dan il-ktieb sew.');
    assert.equal(form.usage_examples[0].text_en, 'Read this book carefully.');
});

test('hydrateEntryRow: extracts usage_example and normalizes array with mt and text_mt', () => {
    const row = {
        id: 'test-entry',
        headword: 'dawl',
        pos: 'noun',
        usage_examples: JSON.stringify([
            { mt: 'Id-dawl kien qawwi.', en: 'The light was bright.' }
        ])
    };

    const payload = hydrateEntryRow(row);

    assert.equal(payload.usage_example, 'Id-dawl kien qawwi.');
    assert.equal(payload.usage_example_en, 'The light was bright.');
    assert.equal(payload.usage_examples[0].text_mt, 'Id-dawl kien qawwi.');
    assert.equal(payload.usage_examples[0].mt, 'Id-dawl kien qawwi.');
    assert.equal(payload.usage_examples[0].text_en, 'The light was bright.');
    assert.equal(payload.usage_examples[0].en, 'The light was bright.');
});

test('buildLoadedEntryPatch: includes usage_examples and string fields in loaded patch', () => {
    const full = {
        id: 'test-entry',
        headword: 'dawl',
        pos: 'noun',
        usage_examples: [
            { mt: 'Id-dawl kien qawwi.', en: 'The light was bright.' }
        ]
    };

    const patch = buildLoadedEntryPatch(full, {});

    assert.ok(patch.usage_examples, 'patch should include usage_examples');
    assert.equal(patch.usage_example, 'Id-dawl kien qawwi.');
    assert.equal(patch.usage_example_en, 'The light was bright.');
    assert.equal(patch.usage_examples[0].text_mt, 'Id-dawl kien qawwi.');
});

test('buildAdminEntryPayload: preserves usage_examples on save and synchronizes legacy fields', () => {
    const form = {
        id: 'test-entry',
        headword: 'dawl',
        pos: 'noun',
        usage_examples: [
            { text_mt: 'Id-dawl kien qawwi.', text_en: 'The light was bright.' },
            { text_mt: 'M’hemmx dawl.', text_en: 'There is no light.' }
        ],
        usage_example: 'Id-dawl kien qawwi.',
        usage_example_en: 'The light was bright.'
    };

    const payload = buildEntryPayload(form);

    assert.equal(payload.usage_examples.length, 2);
    assert.equal(payload.usage_examples[0].text_mt, 'Id-dawl kien qawwi.');
    assert.equal(payload.usage_examples[0].mt, 'Id-dawl kien qawwi.');
    assert.equal(payload.usage_examples[0].text_en, 'The light was bright.');
    assert.equal(payload.usage_examples[0].en, 'The light was bright.');
    assert.equal(payload.usage_example, 'Id-dawl kien qawwi.');
    assert.equal(payload.usage_example_en, 'The light was bright.');
});

test('buildAdminEntryPayload: filters out completely empty example rows without deleting valid ones', () => {
    const form = {
        id: 'test-entry',
        headword: 'dawl',
        pos: 'noun',
        usage_examples: [
            { text_mt: 'Id-dawl kien qawwi.', text_en: 'The light was bright.' },
            { text_mt: '', text_en: '' }
        ]
    };

    const payload = buildEntryPayload(form);

    assert.equal(payload.usage_examples.length, 1);
    assert.equal(payload.usage_examples[0].text_mt, 'Id-dawl kien qawwi.');
});
