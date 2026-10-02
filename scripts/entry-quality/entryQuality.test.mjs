import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auditEntry,
  normalizeEntryValue,
  normalizeJsonValue,
  buildFormattingPatch,
} from './entryQuality.mjs';

test('normalizes Unicode, whitespace, empty strings and JSON deterministically', () => {
  assert.equal(normalizeEntryValue('  e\u0301  '), 'é');
  assert.equal(normalizeEntryValue('   '), null);
  assert.equal(normalizeJsonValue('[ {"b": 2, "a": 1} ]'), '[{"b":2,"a":1}]');
});

test('builds only deterministic formatting changes', () => {
  assert.deepEqual(buildFormattingPatch({ headword: '  e\u0301 ', pos: 'noun', definitions: '[ {"x": 1} ]' }), {
    headword: 'é',
    definitions: '[{"x":1}]',
  });
});

test('reports universal entry issues', () => {
  const result = auditEntry({ id: 'x', headword: ' ', pos: 'unknown', definitions: 'not-json' });
  assert.deepEqual(result.issues.map((issue) => issue.code), [
    'blank_headword',
    'unsupported_pos',
    'invalid_definitions_json',
  ]);
});

test('includes human-readable entry identity in results', () => {
  const result = auditEntry({ id: 'v3', headword: '  kiteb ', pos: 'verb', definitions: '[{"text_en":"write"}]' });
  assert.equal(result.entryId, 'v3');
  assert.equal(result.headword, 'kiteb');
  assert.equal(result.pos, 'verb');
});

test('uses POS-specific verb requirements and emits engine recommendations', () => {
  const result = auditEntry({
    id: 'v1', headword: 'kiteb', pos: 'verb', definitions: '[{"text_en":"write"}]',
    verb_morphology: { form: 'I', class: 'strong', weak_class: 'none', transitivity: 'transitive' },
    root_consonants: 'k-t-b',
    engineRecommendations: [{ field: 'verb_morphology.form', suggestedValue: 'II', confidence: 'review' }],
  });
  assert.ok(result.issues.some((issue) => issue.code === 'missing_verb_vowel_set'));
  assert.equal(result.recommendations[0].suggestedValue, 'II');
});

test('flags normalized versus legacy conflicts without selecting a correction', () => {
  const result = auditEntry({
    id: 'v2', headword: 'test', pos: 'verb', definitions: '[{"text_en":"test"}]',
    verb_morphology: { form: 'II', class: 'strong' },
    verb_form: 'I', verb_class: 'strong',
  });
  const issue = result.issues.find((item) => item.code === 'legacy_normalized_conflict');
  assert.equal(issue.field, 'form');
  assert.equal(issue.currentValue, 'II');
  assert.equal(issue.legacyValue, 'I');
});

test('flags broken reciprocal relationships', () => {
  const result = auditEntry({
    id: 'a', headword: 'a', pos: 'noun', definitions: '[{"text_en":"a"}]',
    relationships: [{ targetEntryId: 'b', type: 'synonym', reciprocal: false }],
  });
  assert.ok(result.issues.some((issue) => issue.code === 'non_reciprocal_relationship'));
});
