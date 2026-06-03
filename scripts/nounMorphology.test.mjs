import { entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';
import { resolvePluralInflectionBase, shouldUseFeminineBaseForPlural } from '../src/lib/nounMorphology.ts';

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
        noun_type: 'proper',
        paucal_form: 'darbiet',
        augmentative_form: 'darbija',
        paucal_pattern: 'CvCCiet',
        augmentative_pattern: 'CvCCija',
        noun_morphology: {
            noun_type: 'proper',
            paucal: 'darbiet',
            augmentative: 'darbija',
            paucal_pattern: 'CvCCiet',
            augmentative_pattern: 'CvCCija',
        },
        noun_singular: 'legacy-darba',
        noun_plural_forms: 'legacy-plural',
    };

    const form = entryToForm(source);
    assertEq(form.paucal_form, 'darbiet', 'entryToForm should preserve paucal_form');
    assertEq(form.augmentative_form, 'darbija', 'entryToForm should preserve augmentative_form');
    assertEq(form.paucal_pattern, 'CvCCiet', 'entryToForm should preserve paucal_pattern');
    assertEq(form.augmentative_pattern, 'CvCCija', 'entryToForm should preserve augmentative_pattern');
    assertEq(form.noun_type, 'proper', 'entryToForm should preserve noun_type');
    assertEq(form.singular_form, undefined, 'entryToForm should not map legacy noun_singular');
    assertEq(form.plural_forms, undefined, 'entryToForm should not map legacy noun_plural_forms');

    const payload = formToPayload(form);
    assertEq(payload.paucal_form, 'darbiet', 'formToPayload should include paucal_form');
    assertEq(payload.augmentative_form, 'darbija', 'formToPayload should include augmentative_form');
    assertEq(payload.paucal_pattern, 'CvCCiet', 'formToPayload should include paucal_pattern');
    assertEq(payload.augmentative_pattern, 'CvCCija', 'formToPayload should include augmentative_pattern');
    assertEq(payload.noun_type, 'proper', 'formToPayload should include noun_type');

    assert(!('paucal_form' in form.extraFields), 'paucal_form should be treated as a handled field');
    assert(!('augmentative_form' in form.extraFields), 'augmentative_form should be treated as a handled field');
    assert(!('noun_type' in form.extraFields), 'noun_type should be treated as a handled field');
    assert(!('noun_singular' in payload), 'legacy noun_singular should be stripped from payload');
    assert(!('noun_plural_forms' in payload), 'legacy noun_plural_forms should be stripped from payload');

    assertEq(shouldUseFeminineBaseForPlural('-a', 'kittieba'), true, 'suffix plurals in -a should use feminine base');
    assertEq(shouldUseFeminineBaseForPlural('-ie', 'ktejjebaie'), true, 'suffix plurals in -ie should use feminine base');
    assertEq(shouldUseFeminineBaseForPlural('CoCCa', 'kotba'), false, 'broken plurals should keep their own base');

    const feminineBase = resolvePluralInflectionBase('kittieba', '-a', 'kittieba');
    assertEq(feminineBase.base, 'kittieba', 'suffix plurals in -a should resolve to the feminine base');
    assertEq(feminineBase.gender, 'feminine', 'suffix plurals in -a should inflect as feminine');

    const ieFeminineBase = resolvePluralInflectionBase('ktejjebaie', '-ie', 'ktejjebaie');
    assertEq(ieFeminineBase.base, 'ktejjebaie', 'suffix plurals in -ie should resolve to the feminine base');
    assertEq(ieFeminineBase.gender, 'feminine', 'suffix plurals in -ie should inflect as feminine');

    const feminineFallback = resolvePluralInflectionBase('kittieba', '-a', null);
    assertEq(feminineFallback.base, 'kittieba', 'suffix plurals in -a should still use the plural surface when feminine form is missing');
    assertEq(feminineFallback.gender, 'feminine', 'suffix plurals in -a should still inflect as feminine when feminine form is missing');

    const brokenPluralBase = resolvePluralInflectionBase('kotba', 'CoCCa', 'kotba');
    assertEq(brokenPluralBase.base, 'kotba', 'broken plurals should keep the plural base');
    assertEq(brokenPluralBase.gender, 'masculine', 'broken plurals should keep masculine inflection behavior');
};

run();
console.log('nounMorphology tests passed');
