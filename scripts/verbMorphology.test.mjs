import assert from 'node:assert/strict';
import { buildEntryPayload } from '../src/lib/adminSchema.ts';
import {
    applyVerbMorphologyCompatibility,
    buildVerbMorphologyResponse,
    normalizeVerbMorphologyInput,
} from '../src/lib/verbMorphology.ts';

const run = () => {
    const normalized = normalizeVerbMorphologyInput({
        verb_morphology: {
            form: ' II ',
            class: ' strong ',
            weak_class: ' defective ',
            transitivity: ' transitive ',
            perfective_3sgm: ' kiteb ',
            imperfective_3sgm: ' jikteb ',
            verbal_noun: ' kitba ',
            active_participle: ' kittieb ',
            passive_participle: ' miktub ',
            vowel_set_perf: ' i-e ',
            vowel_set_impf: ' i-e ',
            vowel_set_impv: ' i-e ',
            type: ' root ',
        },
    });

    assert.deepStrictEqual(normalized, {
        form: 'II',
        class: 'strong',
        weak_class: 'defective',
        transitivity: 'transitive',
        perfective_3sgm: 'kiteb',
        imperfective_3sgm: 'jikteb',
        verbal_noun: 'kitba',
        active_participle: 'kittieb',
        passive_participle: 'miktub',
        vowel_set_perf: 'i-e',
        vowel_set_impf: 'i-e',
        vowel_set_impv: 'i-e',
        type: 'root',
    });

    const response = buildVerbMorphologyResponse(
        { id: 'v-kiteb', headword: 'kiteb', is_inflectable: 1, usage_example: 'kiteb ħafna' },
        normalized,
        { synonyms: [{ headword: 'write', id: 'x-1' }] },
    );

    assert.equal(response.form, 'II');
    assert.equal(response.verb_class, 'strong');
    assert.equal(response.perfective_3sg_m, 'kiteb');
    assert.equal(response.vowel_set_imperative, 'i-e');
    assert.equal(response.synonyms.length, 1);

    const compat = {};
    applyVerbMorphologyCompatibility(compat, { headword: 'kiteb', is_inflectable: 1 }, normalized);
    assert.equal(compat.verb_form, 'II');
    assert.equal(compat.verb_class, 'strong');
    assert.ok(compat.verb_morphology);

    const verbPayload = buildEntryPayload({
        pos: 'verb',
        headword: 'kiteb',
        _formLabel: 'II',
        verb_class: 'strong',
        verb_transitivity: 'transitive',
        verb_perfective_3sgm: 'kiteb',
        verb_imperfective_3sgm: 'jikteb',
        verb_verbal_noun: 'kitba',
        verb_active_ptcp: 'kittieb',
        verb_passive_ptcp: 'miktub',
        verb_vowel_perf: 'i-e',
        verb_vowel_impf: 'i-e',
        verb_vowel_impv: 'i-e',
        verb_type: 'root',
        source_citation: 'A test source',
    });

    assert.ok(verbPayload.verb_morphology, 'verb payload should include nested morphology');
    assert.equal(verbPayload.verb_morphology.form, 'II');
    assert.equal(verbPayload.verb_morphology.class, 'strong');
    assert.ok(!Object.prototype.hasOwnProperty.call(verbPayload, 'verb_form'), 'legacy verb_form should not be persisted on entries payloads');
    assert.ok(!Object.prototype.hasOwnProperty.call(verbPayload, 'verb_class'), 'legacy verb_class should not be persisted on entries payloads');

    const nounPayload = buildEntryPayload({
        pos: 'noun',
        headword: 'darba',
        verb_class: 'strong',
        verb_morphology: { form: 'I', class: 'strong' },
    });

    assert.ok(!Object.prototype.hasOwnProperty.call(nounPayload, 'verb_morphology'), 'non-verb payloads should not keep verb morphology');
    assert.ok(!Object.prototype.hasOwnProperty.call(nounPayload, 'verb_class'), 'non-verb payloads should drop verb legacy fields');
};

run();
console.log('verbMorphology tests passed');
