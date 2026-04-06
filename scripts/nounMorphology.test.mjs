import { entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const run = () => {
    const source = {
        id: 'n-test',
        headword: 'darba',
        pos: 'noun',
        gender: 'feminine',
        lemma_base: 'darba',
        paucal_form: 'darbiet',
        augmentative_form: 'darbija',
        paucal_pattern: 'CvCCiet',
        augmentative_pattern: 'CvCCija',
        noun_morphology: {
            paucal: 'darbiet',
            augmentative: 'darbija',
            paucal_pattern: 'CvCCiet',
            augmentative_pattern: 'CvCCija',
        },
    };

    const form = entryToForm(source);
    assertEq(form.paucal_form, 'darbiet', 'entryToForm should preserve paucal_form');
    assertEq(form.augmentative_form, 'darbija', 'entryToForm should preserve augmentative_form');
    assertEq(form.paucal_pattern, 'CvCCiet', 'entryToForm should preserve paucal_pattern');
    assertEq(form.augmentative_pattern, 'CvCCija', 'entryToForm should preserve augmentative_pattern');

    const payload = formToPayload(form);
    assertEq(payload.paucal_form, 'darbiet', 'formToPayload should include paucal_form');
    assertEq(payload.augmentative_form, 'darbija', 'formToPayload should include augmentative_form');
    assertEq(payload.paucal_pattern, 'CvCCiet', 'formToPayload should include paucal_pattern');
    assertEq(payload.augmentative_pattern, 'CvCCija', 'formToPayload should include augmentative_pattern');

    assert(!('paucal_form' in form.extraFields), 'paucal_form should be treated as a handled field');
    assert(!('augmentative_form' in form.extraFields), 'augmentative_form should be treated as a handled field');
};

run();
console.log('nounMorphology tests passed');
