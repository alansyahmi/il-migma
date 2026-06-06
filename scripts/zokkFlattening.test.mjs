import assert from 'node:assert/strict';
import { generateZokkForms } from '../src/lib/zokkEngine.ts';
import { hydrateEntryRow } from '../src/lib/entryHydration.ts';
import { entryToForm } from '../src/lib/entryAdapter.ts';
import { normalizeStemMorphology } from '../src/lib/stemMorphology.ts';
import { buildStemSearchPreview } from '../src/lib/stemSearchPreview.ts';

const forms = generateZokkForms({
    stem: 'kant',
    zokk_class: 'ar',
    zokk_is_hybrid: true,
    root_consonants: 'k-n-t-j',
});

assert.equal(forms.conjugation.rows[0].perfect, 'kantajt', 'generateZokkForms should read flattened zokk_class');
assert.equal(forms.conjugation.rows[2].perfect, 'kanta', 'hybrid ar citation should use the bare stem + -a');
assert.equal(forms.conjugation.rows[2].imperfect, 'jkanta', 'hybrid ar imperfect should use the hybrid stem');
assert.equal(forms.hybrid_forms?.form_ii, 'tkanta', 'generateZokkForms should read flattened zokk_is_hybrid/root_consonants');

const normalized = normalizeStemMorphology({
    stem: 'serv',
    zokk_class: 'ir',
    zokk_is_hybrid: 1,
    root_consonants: 's-r-v-j',
    zokk_agentive_suffix: 'itur',
});
assert.deepEqual(
    normalized,
    {
        stem_string: 'serv',
        class_type: 'ir',
        is_hybrid: true,
        root: 's-r-v-j',
        agentive_suffix: 'itur',
    },
    'normalizeStemMorphology should read flattened zokk fields',
);

const preview = buildStemSearchPreview({
    id: 'v-servi',
    headword: 'servi',
    pos: 'verb',
    zokk_morphology: {
        stem: 'serv',
        zokk_class: 'ir',
        zokk_is_hybrid: 1,
        root_consonants: 's-r-v-j',
    },
    definitions: [],
});
assert.equal(preview.map((row) => row.kind).join(','), 'imperfect,imperative,passive,verbal-noun', 'stem preview should render from flattened zokk morphology');
assert.equal(preview[0].value, 'jserva', 'flattened zokk preview should generate imperfect');
assert.equal(preview[1].value, 'servi', 'flattened zokk preview should generate imperative');

const dbRow = {
    id: 'v-kanta',
    pos: 'verb',
    headword: 'kanta',
    stem: 'kant',
    zokk_class: 'ar',
    zokk_is_hybrid: 1,
    root_consonants: 'k-n-t-j',
    zokk_agentive_suffix: 'atur',
};

const hydrated = hydrateEntryRow(dbRow);
assert.equal(hydrated.zokk_morphology?.stem, 'kant', 'hydrateEntryRow should construct flattened zokk morphology');
assert.equal(hydrated.zokk_morphology?.zokk_class, 'ar', 'hydrateEntryRow should keep flattened zokk class');

const form = entryToForm(hydrated);
assert.equal(form.zokk_stem, 'kant', 'entryToForm should map flattened zokk stem');
assert.equal(form.zokk_class, 'ar', 'entryToForm should map flattened zokk class');

const legacyHydrated = hydrateEntryRow({
    id: 'v-legacy',
    pos: 'verb',
    zokk_morphology: JSON.stringify({
        stem_string: 'old',
        class_type: 'ir',
        is_hybrid: false,
    }),
});
const legacyForm = entryToForm(legacyHydrated);
assert.equal(legacyForm.zokk_stem, 'old', 'entryToForm should preserve legacy zokk JSON stem');
assert.equal(legacyForm.zokk_class, 'ir', 'entryToForm should preserve legacy zokk JSON class');

console.log('zokkFlattening tests passed');
