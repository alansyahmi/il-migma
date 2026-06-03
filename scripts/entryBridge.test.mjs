import assert from 'node:assert/strict';
import { entryToForm, buildLoadedEntryPatch, formToPayload } from '../src/lib/entryAdapter.ts';
import { ENTRY_MORPHOLOGY_SELECT, hydrateEntryRow } from '../src/lib/entryHydration.ts';

assert.doesNotMatch(ENTRY_MORPHOLOGY_SELECT, /\bt\.lemma_pattern\b/, 'relationship SQL should not read lemma_pattern from entries');
assert.doesNotMatch(ENTRY_MORPHOLOGY_SELECT, /\bt\.form_(?:masc|fem|plural)_pattern\b/, 'relationship SQL should not read form patterns from entries');
assert.match(ENTRY_MORPHOLOGY_SELECT, /LEFT JOIN noun_morphology tnm ON tnm\.entry_id = t\.id/, 'relationship SQL should join target noun morphology for patterns');
assert.match(ENTRY_MORPHOLOGY_SELECT, /LEFT JOIN adj_morphology tam ON tam\.entry_id = t\.id/, 'relationship SQL should join target adjective morphology for patterns');
assert.match(ENTRY_MORPHOLOGY_SELECT, /LEFT JOIN participle_morphology tpm ON tpm\.entry_id = t\.id/, 'relationship SQL should join target participle morphology for patterns');

const row = hydrateEntryRow({
  id: 'adj-twil',
  headword: 'twil',
  pos: 'adjective',
  gender: 'masculine',
  am_masculine: 'twil',
  am_feminine: 'twila',
  am_masc_pattern: 'CCiC',
  am_fem_pattern: 'CCiCa',
  am_pattern: 'CCiC',
  am_has_elative: 1,
  am_dual: 'twilajn',
  am_dual_pattern: 'CCiCajn',
  am_vowel_set_dual: 'a-i',
  am_diminutive: 'tweiwel',
  am_diminutive_pattern: 'CCeiCeC',
  am_is_inflectable: 1,
  usage_examples: JSON.stringify([{ text_en: 'He is tall.', text_mt: 'Huwa twil.' }]),
});

assert.equal(row.adj_morphology?.feminine_form, 'twila', 'hydration should expose canonical adjective morphology');
assert.equal(row.adjective_morphology?.feminine_form, 'twila', 'hydration should still expose the legacy adjective alias');
assert.equal(row.form_fem, 'twila', 'hydration should populate legacy form_fem alias');
assert.equal(row.form_fem_pattern, 'CCiCa', 'hydration should populate feminine pattern alias');
assert.equal(row.adj_morphology?.dual_form, 'twilajn', 'hydration should expose dual form');
assert.equal(row.adj_morphology?.dual_pattern, 'CCiCajn', 'hydration should expose dual pattern');
assert.equal(row.adj_morphology?.vowel_set_dual, 'a-i', 'hydration should expose vowel_set_dual');
assert.equal(row.adj_morphology?.diminutive_form, 'tweiwel', 'hydration should expose diminutive form');
assert.equal(row.adj_morphology?.diminutive_pattern, 'CCeiCeC', 'hydration should expose diminutive pattern');
assert.equal(row.adj_morphology?.is_inflectable, true, 'hydration should expose is_inflectable');
assert.equal(row.usage_example, 'Huwa twil.', 'hydration should populate the Maltese usage-example field');
assert.equal(row.usage_example_en, 'He is tall.', 'hydration should populate the English usage-example field');

const form = entryToForm(row);
assert.equal(form.form_fem, 'twila', 'form adapter should load feminine form');
assert.equal(form.form_fem_pattern, 'CCiCa', 'form adapter should load feminine pattern');
assert.equal(form.dual_form, 'twilajn', 'form adapter should load dual form');
assert.equal(form.dual_pattern, 'CCiCajn', 'form adapter should load dual pattern');
assert.equal(form.vowel_set_dual, 'a-i', 'form adapter should load vowel_set_dual');
assert.equal(form.diminutive_form, 'tweiwel', 'form adapter should load diminutive form');
assert.equal(form.diminutive_pattern, 'CCeiCeC', 'form adapter should load diminutive pattern');
assert.equal(form.is_inflectable, true, 'form adapter should load is_inflectable');

form.form_fem = 'twilja';
form.form_fem_pattern = 'CCiCja';
form.plural_forms = [{ form: 'twal', pattern: 'CCiCa' }];
form.inflections_pl = 'twal';
form.form_plural_pattern = 'CCiCa';
form.dual_form = 'twilajn2';
form.dual_pattern = 'CCiCajn2';
form.vowel_set_dual = 'a-i2';
form.diminutive_form = 'tweiwel2';
form.diminutive_pattern = 'CCeiCeC2';
form.is_inflectable = false;

const payload = formToPayload({
  ...form,
  pos: 'adjective',
});

assert.equal(payload.adj_morphology.feminine_form, 'twilja', 'payload should persist edited feminine form');
assert.equal(payload.adj_morphology.form_fem_pattern, 'CCiCja', 'payload should persist edited feminine pattern');
assert.equal(payload.adj_morphology.plural_form, '[{"form":"twal","pattern":"CCiCa"}]', 'payload should persist edited plural form and pattern');
assert.equal(payload.adj_morphology.form_plural_pattern, 'CCiCa', 'payload should persist edited plural pattern');
assert.equal(payload.adj_morphology.dual_form, 'twilajn2', 'payload should persist edited dual form');
assert.equal(payload.adj_morphology.dual_pattern, 'CCiCajn2', 'payload should persist edited dual pattern');
assert.equal(payload.adj_morphology.vowel_set_dual, 'a-i2', 'payload should persist edited vowel_set_dual');
assert.equal(payload.adj_morphology.diminutive_form, 'tweiwel2', 'payload should persist edited diminutive form');
assert.equal(payload.adj_morphology.diminutive_pattern, 'CCeiCeC2', 'payload should persist edited diminutive pattern');
assert.equal(payload.adj_morphology.is_inflectable, 0, 'payload should persist edited is_inflectable');
assert.ok(!('adjective_morphology' in payload), 'payload should not emit the legacy adjective morphology alias');
assert.ok(!('form_fem' in payload), 'payload should not emit flat feminine aliases');
assert.ok(!('form_fem_pattern' in payload), 'payload should not emit flat feminine pattern aliases');
assert.ok(!('form_plural_pattern' in payload), 'payload should not emit flat plural pattern aliases');

const patternOnlyRow = hydrateEntryRow({
  id: 'adj-pattern-only',
  headword: 'twil',
  pos: 'adjective',
  am_plural: '[{"form":"","pattern":"CCiCa"}]',
  am_masculine: 'twil',
  am_feminine: 'twila',
  am_masc_pattern: 'CCiC',
  am_fem_pattern: 'CCiCa',
  am_pattern: 'CCiC',
});

const patternOnlyForm = entryToForm(patternOnlyRow);
assert.equal(patternOnlyForm.form_plural_pattern, 'CCiCa', 'bridge should hydrate pattern-only plural rows');
assert.deepEqual(patternOnlyForm.plural_forms, [{ form: '', pattern: 'CCiCa' }], 'bridge should preserve pattern-only plural rows in form state');

const patternOnlyPayload = formToPayload({
  ...patternOnlyForm,
  pos: 'adjective',
});

assert.match(String(patternOnlyPayload.adj_morphology?.plural_form), /CCiCa/, 'bridge should preserve pattern-only plural morphology');
assert.ok(!('form_plural_pattern' in patternOnlyPayload), 'bridge should not emit a flat plural pattern alias');

const legacyPluralRow = hydrateEntryRow({
  id: 'adj-twil-legacy',
  headword: 'twil',
  pos: 'adjective',
  am_plural: '[{"form":"","pattern":""}]',
  am_masculine: 'twil',
  am_feminine: 'twila',
  am_masc_pattern: 'CCiC',
  am_fem_pattern: 'CCiCa',
  am_pattern: 'CCiC',
  am_elative: 'itwal',
});

assert.match(
  String(legacyPluralRow.adjective_morphology?.plural_form),
  /twal/,
  'hydration should derive the adjective plural from the elative when storage is blank'
);

const legacyPluralForm = entryToForm(legacyPluralRow);
assert.deepEqual(legacyPluralForm.plural_forms, [{ form: 'twal', pattern: '' }], 'bridge should prefer the meaningful legacy plural over placeholder adj morphology');
assert.equal(legacyPluralForm.inflections_pl, 'twal', 'bridge should expose the derived plural text for editing');
assert.equal(legacyPluralForm.form_plural_pattern, '', 'bridge should not invent a plural pattern for legacy text-only plurals');

const patch = buildLoadedEntryPatch({
  ...row,
  am_feminine: 'twila',
  am_fem_pattern: 'CCiCa',
}, form);

assert.equal(patch.form_fem, 'twila', 'loaded patch should keep feminine alias');
assert.equal(patch.form_fem_pattern, 'CCiCa', 'loaded patch should keep feminine pattern alias');

console.log('entryBridge.test.mjs passed');
