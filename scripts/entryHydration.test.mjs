import assert from 'node:assert/strict';
import { hydrateEntryRow } from '../src/lib/entryHydration.ts';

const hydrated = hydrateEntryRow({
  id: 'kitba',
  headword: 'kitba',
  pos: 'noun',
  is_loanword: 0,
  source_language: 'Arabic',
  tags: '["core","test"]',
  synonyms: '[{"id":"1","headword":"ktieb"}]',
  antonyms: '[]',
  related_entries: '[]',
  alternative_forms: '[]',
  zokk_morphology: '{"stem_string":"ktb","class_type":"ar","is_hybrid":false}',
  nm_gender: 'feminine',
  nm_noun_type: 'abstract',
  nm_singular: 'kitba',
  nm_plural_forms: '["kitbiet"]',
  nm_sound_plural: '-iet',
  nm_dual: '',
  nm_diminutive: '',
  nm_collective: '',
  nm_singulative: '',
  nm_paucal: '',
  nm_augmentative: '',
  nm_paucal_pattern: '',
  nm_augmentative_pattern: '',
  nm_feminine: '',
  nm_masculine: 'kitbiet',
  nm_is_inflectable_singular: 1,
  nm_is_inflectable_plural: 0,
  nm_fem_pattern: '',
  nm_masc_pattern: 'CvCCa',
  noun_singular: 'legacy-kitba',
  noun_plural: '["legacy-kitbiet"]',
  noun_collective: 'legacy-kollettiv',
  noun_singulative: 'legacy-singulative',
});

assert.deepEqual(hydrated.tags, ['core', 'test']);
assert.deepEqual(hydrated.inflections_pl, ['kitbiet']);
assert.equal(hydrated.gender, 'feminine');
assert.equal(hydrated.noun_morphology?.noun_type, 'abstract');
assert.equal(hydrated.noun_morphology?.singular_form, 'kitba');
assert.equal(hydrated.noun_morphology?.plural_forms?.[0], 'kitbiet');
assert.equal(hydrated.noun_morphology?.sound_plural, '-iet');
assert.equal(hydrated.noun_morphology?.masculine_form, 'kitbiet');
assert.equal(hydrated.noun_morphology?.form_masc, 'kitbiet');
assert.equal(hydrated.noun_morphology?.form_masc_pattern, 'CvCCa');
assert.equal(hydrated.noun_morphology?.is_inflectable_singular, true);
assert.equal(hydrated.noun_morphology?.is_inflectable_plural, false);
assert.equal(hydrated.noun_morphology?.is_inflectable, undefined);
assert.equal(hydrated.noun_morphology?.collective_form, '');
assert.equal(hydrated.noun_morphology?.singulative_form, '');
assert.equal(hydrated.zokk_morphology?.stem_string, 'ktb');

const numeralHydrated = hydrateEntryRow({
  id: 'num-tlieta',
  headword: 'tlieta',
  pos: 'numeral',
  is_loanword: 0,
  num_type: 'ordinal',
  num_attr_short: 'tlett',
  num_attr_short_pattern: 'CvCVC',
  num_attr_long: 'tlieta',
  num_ordinal: 'tielet',
  num_adverbial: 'tliet darbiet',
  num_fractional: 'terz',
  num_multiplier: 'triplu',
  num_distributive: 'tlieta tlieta',
  num_plural_pattern: 'CaCVC',
});

assert.equal(numeralHydrated.numeral_morphology?.numeral_type, 'ordinal');
assert.equal(numeralHydrated.numeral_morphology?.form_attributive_short, 'tlett');
assert.equal(numeralHydrated.numeral_morphology?.form_attributive_short_pattern, 'CvCVC');
assert.equal(numeralHydrated.numeral_morphology?.form_attributive_long, 'tlieta');
assert.equal(numeralHydrated.numeral_morphology?.ordinal_form, 'tielet');
assert.equal(numeralHydrated.numeral_morphology?.adverbial_form, 'tliet darbiet');
assert.equal(numeralHydrated.numeral_morphology?.fractional_form, 'terz');
assert.equal(numeralHydrated.numeral_morphology?.multiplier_form, 'triplu');
assert.equal(numeralHydrated.numeral_morphology?.distributive_form, 'tlieta tlieta');

const topLevelRoleNumeral = hydrateEntryRow({
  id: 'num-rbiegh',
  headword: 'rbiegħ',
  pos: 'numeral',
  is_loanword: 0,
  numeral_type: 'distributive',
  root_consonants: 'r-b-għ',
  cv_pattern: 'CCieC',
  num_type: null,
});

assert.equal(topLevelRoleNumeral.numeral_type, 'distributive');
assert.equal(topLevelRoleNumeral.numeral_morphology?.numeral_type, 'distributive');

console.log('entryHydration.test.mjs passed');
