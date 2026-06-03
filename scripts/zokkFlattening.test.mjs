import { generateZokkForms } from '../src/lib/zokkEngine.ts';
import { hydrateEntryRow } from '../src/lib/entryHydration.ts';
import { entryToForm } from '../src/lib/entryAdapter.ts';

async function testZokkFlattening() {
    console.log('--- Testing Zokk Flattening ---');

    // 1. Test generateZokkForms with new names
    const newZokk = {
        stem: 'kant',
        zokk_class: 'ar',
        zokk_is_hybrid: true,
        root_consonants: 'k-n-t-j'
    };
    const forms = generateZokkForms(newZokk);
    if (forms.conjugation.rows[0].perfect === 'kantajt') {
        console.log('✅ generateZokkForms handles new names correctly');
    } else {
        console.log('❌ generateZokkForms FAILED with new names:', forms.conjugation.rows[0].perfect);
    }

    // 2. Test Hydration from Columns
    const dbRow = {
        id: 'v-kanta',
        pos: 'verb',
        headword: 'kanta',
        stem: 'kant',
        zokk_class: 'ar',
        zokk_is_hybrid: 1,
        root_consonants: 'k-n-t-j',
        zokk_agentive_suffix: 'atur'
    };
    const hydrated = hydrateEntryRow(dbRow);
    if (hydrated.zokk_morphology && hydrated.zokk_morphology.stem === 'kant') {
        console.log('✅ hydrateEntryRow construct zokk_morphology from columns');
    } else {
        console.log('❌ hydrateEntryRow FAILED to construct zokk_morphology:', hydrated.zokk_morphology);
    }

    // 3. Test Adapter Mapping
    const form = entryToForm(hydrated);
    if (form.zokk_stem === 'kant' && form.zokk_class === 'ar') {
        console.log('✅ entryToForm maps from flattened structure');
    } else {
        console.log('❌ entryToForm FAILED:', form.zokk_stem, form.zokk_class);
    }

    const legacyEntry = {
        id: 'v-legacy',
        pos: 'verb',
        zokk_morphology: JSON.stringify({
            stem_string: 'old',
            class_type: 'ir',
            is_hybrid: false
        })
    };
    const legacyHydrated = hydrateEntryRow(legacyEntry);
    const legacyForm = entryToForm(legacyHydrated);
    if (legacyForm.zokk_stem === 'old' && legacyForm.zokk_class === 'ir') {
        console.log('✅ Backward compatibility with JSON blob maintained');
    } else {
        console.log('❌ Legacy mapping FAILED:', legacyForm.zokk_stem, legacyForm.zokk_class);
    }

    console.log('--- All tests completed ---');
}

testZokkFlattening().catch(console.error);
