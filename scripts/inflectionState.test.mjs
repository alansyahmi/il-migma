import assert from 'node:assert/strict';
import { entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';
import {
    applyInflectableToggle,
    isFunctionWordInflectionPos,
    isInflectableEnabled,
    isInflectionDisabled,
    shouldHideInflectionTable,
    shouldMarkInflectionTheoretical,
} from '../src/lib/inflectionState.ts';

const assertEq = (actual, expected, message) => {
    assert.deepStrictEqual(actual, expected, message);
};

const run = () => {
    assertEq(isFunctionWordInflectionPos('pronoun'), true, 'pronoun should be treated as a function-word inflection POS');
    assertEq(isFunctionWordInflectionPos('noun'), false, 'noun should not be treated as a function-word inflection POS');
    assertEq(isInflectableEnabled(undefined), true, 'missing flag should default to enabled');
    assertEq(isInflectableEnabled(true), true, 'true should remain enabled');
    assertEq(isInflectableEnabled(false), false, 'false should disable inflection');
    assertEq(isInflectableEnabled(0), false, '0 should disable inflection');
    assertEq(isInflectableEnabled('false'), false, 'string false should disable inflection');
    assertEq(shouldHideInflectionTable('pronoun', false), true, 'pronouns should hide their inflection table when disabled');
    assertEq(shouldHideInflectionTable('noun', false), false, 'nouns should keep morphology visible when disabled');
    assertEq(shouldMarkInflectionTheoretical(false), true, 'disabled entries should be theoretical');
    assertEq(isInflectionDisabled({ is_inflectable: 0 }), true, 'numeric zero should count as disabled');

    const form = entryToForm({
        id: 'e-1',
        headword: 'dar',
        pos: 'noun',
        is_inflectable: false,
        inflections_pl: ['djar', 'druw'],
    });
    assertEq(form.is_inflectable, false, 'entryToForm should preserve explicit false');
    assertEq(form.inflections_pl, 'djar, druw', 'entryToForm should preserve plural surfaces');

    const payload = formToPayload({
        ...form,
        is_inflectable: false,
        inflections_pl: 'djar, druw',
    });
    assertEq(payload.is_inflectable, 0, 'formToPayload should persist false as 0');
    assertEq(payload.inflections_pl, ['djar', 'druw'], 'formToPayload should keep plural forms intact when inflectable is disabled');

    const toggledOffForm = applyInflectableToggle({
        ...form,
        gender: 'masculine',
        inflections_pl: 'djar, druw',
    }, false);
    assertEq(toggledOffForm.is_inflectable, false, 'toggle helper should write the new boolean');
    assertEq(toggledOffForm.gender, 'masculine', 'toggle helper should not wipe gender');
    assertEq(toggledOffForm.inflections_pl, 'djar, druw', 'toggle helper should not wipe inflection values');
};

run();
console.log('inflectionState tests passed');
