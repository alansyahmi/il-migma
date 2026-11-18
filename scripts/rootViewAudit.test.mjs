import test from 'node:test';
import assert from 'node:assert/strict';
import {
    generateRootForms,
    getAttestedEntries,
    markGeneratedForms,
} from '../src/lib/conjugationEngine.ts';
import {
    buildPreviewCell,
    buildVerbPreviewFromEngine,
    overlayVerbPreviewRowsFromEngine,
} from '../src/lib/verbMorphology.ts';
import { buildRootPayload } from '../src/lib/adminSchema.ts';
import { normalizeRootGloss } from '../src/lib/adminUtils.ts';

test('overlayVerbPreviewRowsFromEngine merges multiple verbs in the same Form instead of overwriting', () => {
    const entries = [
        {
            id: 'v-nseqa',
            headword: 'nseqa',
            pos: 'verb',
            root_consonants: 's-q-j',
            verb_morphology: {
                form: 'VII',
                class: 'weak',
                weak_class: 'defective',
                perfective_3sgm: 'nseqa',
                imperfective_3sgm: 'jinseqa',
                vowel_set_perf: 'e--',
                vowel_set_impf: 'e--',
            },
        },
        {
            id: 'v-nsaqa',
            headword: 'nsaqa',
            pos: 'verb',
            root_consonants: 's-q-j',
            verb_morphology: {
                form: 'VII',
                class: 'weak',
                weak_class: 'defective',
                perfective_3sgm: 'nsaqa',
                imperfective_3sgm: 'jinsaqa',
                vowel_set_perf: 'a--',
                vowel_set_impf: 'a--',
            },
        },
    ];

    const rawGen = generateRootForms('s-q-j', 'e--', '---', 'weak', 'defective', false);
    const attested = getAttestedEntries(entries);
    const rows = overlayVerbPreviewRowsFromEngine(markGeneratedForms(rawGen, attested), entries);
    const formVII = rows.find((row) => row.form === 'VII');

    assert.ok(formVII, 'Form VII row should exist');
    assert.equal(formVII.perfect.marker, 'plain');
    assert.equal(formVII.perfect.value, 'nseqa; nsaqa');
    assert.ok(Array.isArray(formVII.perfect.items), 'Merged cell should retain items');
    assert.equal(formVII.perfect.items.length, 2);
    assert.deepEqual(
        formVII.perfect.items.map((item) => ({ value: item.value, entryId: item.entryId, marker: item.marker })),
        [
            { value: 'nseqa', entryId: 'v-nseqa', marker: 'plain' },
            { value: 'nsaqa', entryId: 'v-nsaqa', marker: 'plain' },
        ],
    );
});

test('buildPreviewCell and buildVerbPreviewFromEngine preserve per-item metadata on semicolon-separated forms', () => {
    const entry = {
        id: 'v-nseqa',
        headword: 'nseqa',
        pos: 'verb',
        root_consonants: 's-q-j',
        verb_morphology: {
            form: 'VII',
            class: 'weak',
            weak_class: 'defective',
            perfective_3sgm: 'nseqa; nsaqa',
            imperfective_3sgm: 'jinseqa',
            vowel_set_perf: 'e--',
            vowel_set_impf: 'e--',
        },
    };
    const sibling = {
        id: 'v-nsaqa',
        headword: 'nsaqa',
        pos: 'verb',
        root_consonants: 's-q-j',
        verb_morphology: {
            form: 'VII',
            class: 'weak',
            weak_class: 'defective',
            perfective_3sgm: 'nsaqa',
            imperfective_3sgm: 'jinsaqa',
        },
    };

    const preview = buildVerbPreviewFromEngine(entry, [entry, sibling]);
    assert.equal(preview.marked.perfect.marker, 'plain');
    assert.equal(preview.marked.perfect.items?.length, 2);
    assert.equal(preview.marked.perfect.items?.[0].entryId, 'v-nseqa');
    assert.equal(preview.marked.perfect.items?.[1].entryId, 'v-nsaqa');

    // Mixed attested + unattested items with storedFallback=false should still mark cell 'plain'
    const attested = getAttestedEntries([entry]);
    const mixedCell = buildPreviewCell(
        'nseqa; nsuqa',
        'lemma',
        'VII',
        entry,
        attested,
        undefined,
        false,
    );
    assert.equal(mixedCell.marker, 'plain');
    assert.deepEqual(mixedCell.items, [
        { value: 'nseqa', marker: 'plain', entryId: 'v-nseqa' },
        { value: 'nsuqa', marker: 'auto_generated', entryId: undefined },
    ]);
});

test('buildRootPayload normalizes strength and weak_class to lowercase and includes notes', () => {
    const payload = buildRootPayload({
        id: 'k-w-n',
        consonants: 'K-W-N',
        glosses: [{ en: 'existing, being', mt: '' }],
        etymology: [{ relationship: 'From', language: 'Arabic', term: 'ك-و-ن', definition: 'being' }],
        source: 'Aquilina',
        notes: '  Hollow root note  ',
        strength: 'Weak',
        weak_class: 'Hollow',
        vowel_set_perf: 'e-e',
        vowel_set_impf: 'e-e',
        vowel_set_imp: 'e-e',
        tags: 'common, irregular',
        synonyms: [],
        antonyms: [],
        related_entries: [],
        is_imala_blocked: false,
    });

    assert.equal(payload.consonants, 'k-w-n');
    assert.equal(payload.strength, 'weak');
    assert.equal(payload.weak_class, 'hollow');
    assert.equal(payload.notes, 'Hollow root note');
});

test('normalizeRootGloss handles already-parsed arrays without producing [object Object]', () => {
    const parsedFromApi = [{ en: 'raising', mt: 'irfigħ' }];
    const normalized = normalizeRootGloss(parsedFromApi);

    assert.deepEqual(normalized, [{ en: 'raising', mt: 'irfigħ' }]);
    assert.ok(!JSON.stringify(normalized).includes('[object Object]'));
});
