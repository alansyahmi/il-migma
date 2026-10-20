import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUsageNotes, getBilingualText, getEntryAllNotes } from '../src/lib/adminUtils.ts';
import { entryToForm, hydrateEntryRow } from '../src/lib/entryBridge.ts';
import { buildEntryPayload } from '../src/lib/adminSchema.ts';

const SAMPLE_JSON_NOTES = JSON.stringify({
    en: 'Primary declarative subordinating complementizer introducing nominal complement clauses after cognitive, perceptual, and speech verbs. Formally distinct from relative pronoun li.',
    mt: 'Il-kumplementatur subordinattiv dikjarattiv ewlieni li jintroduċi klawżoli komplementari wara verbi ta’ diskors, ħsieb u perċezzjoni. Distint mill-pronom relattiv li.'
});

const SAMPLE_OBJ_NOTES = {
    en: 'Primary declarative subordinating complementizer introducing nominal complement clauses after cognitive, perceptual, and speech verbs. Formally distinct from relative pronoun li.',
    mt: 'Il-kumplementatur subordinattiv dikjarattiv ewlieni li jintroduċi klawżoli komplementari wara verbi ta’ diskors, ħsieb u perċezzjoni. Distint mill-pronom relattiv li.'
};

test('parseUsageNotes: handles JSON string, object, legacy string, and empty values', () => {
    assert.deepEqual(parseUsageNotes(SAMPLE_JSON_NOTES), SAMPLE_OBJ_NOTES);
    assert.deepEqual(parseUsageNotes(SAMPLE_OBJ_NOTES), SAMPLE_OBJ_NOTES);
    assert.deepEqual(parseUsageNotes('Legacy single-language note'), {
        en: 'Legacy single-language note',
        mt: ''
    });
    assert.equal(parseUsageNotes(null), null);
    assert.equal(parseUsageNotes(undefined), null);
    assert.equal(parseUsageNotes(''), null);
    assert.equal(parseUsageNotes('   '), null);
    assert.equal(parseUsageNotes({ en: '', mt: '' }), null);
    assert.equal(parseUsageNotes(JSON.stringify({ en: '', mt: '' })), null);
});

test('getBilingualText: resolves localized prose from JSON string', () => {
    const enText = getBilingualText(SAMPLE_JSON_NOTES, 'en');
    const mtText = getBilingualText(SAMPLE_JSON_NOTES, 'mt');

    assert.equal(enText, SAMPLE_OBJ_NOTES.en);
    assert.equal(mtText, SAMPLE_OBJ_NOTES.mt);
    assert.ok(!enText.startsWith('{'), 'English text must not be raw JSON string');
    assert.ok(!mtText.startsWith('{'), 'Maltese text must not be raw JSON string');
});

test('getBilingualText: resolves localized prose from object with fallback', () => {
    assert.equal(getBilingualText(SAMPLE_OBJ_NOTES, 'en'), SAMPLE_OBJ_NOTES.en);
    assert.equal(getBilingualText(SAMPLE_OBJ_NOTES, 'mt'), SAMPLE_OBJ_NOTES.mt);

    // Fallback when target language is empty
    const enOnly = { en: 'Only English available', mt: '' };
    assert.equal(getBilingualText(enOnly, 'mt'), 'Only English available');
    assert.equal(getBilingualText(enOnly, 'en'), 'Only English available');

    const mtOnly = { en: '', mt: 'Malti biss disponibbli' };
    assert.equal(getBilingualText(mtOnly, 'en'), 'Malti biss disponibbli');
    assert.equal(getBilingualText(mtOnly, 'mt'), 'Malti biss disponibbli');
});

test('getEntryAllNotes: aggregates and deduplicates notes across entry and definitions', () => {
    const entry = {
        usage_notes: SAMPLE_JSON_NOTES,
        definitions: [
            {
                usage_notes: {
                    en: 'Definition specific note in English.',
                    mt: 'Nota speċifika tad-definizzjoni bil-Malti.'
                }
            },
            {
                usage_notes: SAMPLE_JSON_NOTES // duplicate of entry-level note
            }
        ]
    };

    const notesEn = getEntryAllNotes(entry, 'en');
    assert.equal(notesEn.length, 2);
    assert.equal(notesEn[0], SAMPLE_OBJ_NOTES.en);
    assert.equal(notesEn[1], 'Definition specific note in English.');

    const notesMt = getEntryAllNotes(entry, 'mt');
    assert.equal(notesMt.length, 2);
    assert.equal(notesMt[0], SAMPLE_OBJ_NOTES.mt);
    assert.equal(notesMt[1], 'Nota speċifika tad-definizzjoni bil-Malti.');
});

test('hydrateEntryRow: parses usage_notes JSON string into object', () => {
    const row = {
        id: 'conj-li',
        headword: 'li',
        pos: 'conjunction',
        usage_notes: SAMPLE_JSON_NOTES
    };

    const hydrated = hydrateEntryRow(row);
    assert.deepEqual(hydrated.usage_notes, SAMPLE_OBJ_NOTES);
});

test('entryToForm: normalizes usage_notes for admin form state', () => {
    const row = {
        id: 'conj-li',
        headword: 'li',
        pos: 'conjunction',
        usage_notes: SAMPLE_JSON_NOTES
    };

    const form = entryToForm(row);
    assert.deepEqual(form.usage_notes, SAMPLE_OBJ_NOTES);
});

test('buildEntryPayload: normalizes usage_notes and drops empty values', () => {
    const payloadWithNotes = buildEntryPayload({
        headword: 'li',
        pos: 'conjunction',
        usage_notes: SAMPLE_OBJ_NOTES
    });
    assert.deepEqual(payloadWithNotes.usage_notes, SAMPLE_OBJ_NOTES);

    const payloadWithJsonNotes = buildEntryPayload({
        headword: 'li',
        pos: 'conjunction',
        usage_notes: SAMPLE_JSON_NOTES
    });
    assert.deepEqual(payloadWithJsonNotes.usage_notes, SAMPLE_OBJ_NOTES);

    const payloadEmpty = buildEntryPayload({
        headword: 'li',
        pos: 'conjunction',
        usage_notes: { en: '', mt: '' }
    });
    assert.equal(payloadEmpty.usage_notes, null);
});
