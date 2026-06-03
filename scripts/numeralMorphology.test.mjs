import { entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';
import {
    buildNumeralAutoForms,
    buildNumeralDisplayForms,
    hasVisibleNumeralSurface,
    getNumeralShortAttributiveRowLabel,
    shouldCombineMasculineAndShortAttributive,
    shouldSuppressNumeralAttributiveForms,
} from '../src/lib/numeralMorphology.ts';

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
        id: 'num-3',
        headword: 'tlieta',
        pos: 'numeral',
        numeral_type: 'cardinal',
        numeral_morphology: {
            numeral_type: 'cardinal',
            form_attributive_short: 'tlett',
            form_attributive_short_pattern: 'CâCC',
            form_attributive_long: 'tlieta',
            ordinal_form: 'tielet',
            adverbial_form: 'tliet darbiet',
            fractional_form: 'terz',
            multiplier_form: 'triplu',
            distributive_form: 'tlieta tlieta',
        },
    };

    const form = entryToForm(source);
    assertEq(form.numeral_type, 'cardinal', 'entryToForm should preserve numeral_type');
    assertEq(form.form_attributive_short, 'tlett', 'entryToForm should preserve form_attributive_short');
    assertEq(form.form_attributive_long, 'tlieta', 'entryToForm should preserve form_attributive_long');
    assertEq(form.numeral_ordinal, 'tielet', 'entryToForm should map ordinal_form into numeral_ordinal');
    assertEq(form.numeral_adverbial, 'tliet darbiet', 'entryToForm should map adverbial_form into numeral_adverbial');
    assertEq(form.numeral_fractional, 'terz', 'entryToForm should map fractional_form into numeral_fractional');
    assertEq(form.numeral_multiplier, 'triplu', 'entryToForm should map multiplier_form into numeral_multiplier');
    assertEq(form.numeral_distributive, 'tlieta tlieta', 'entryToForm should map distributive_form into numeral_distributive');

    const payload = formToPayload(form);
    assertEq(payload.numeral_type, 'cardinal', 'payload should include numeral_type');
    assertEq(payload.form_attributive_short, 'tlett', 'payload should include form_attributive_short');
    assertEq(payload.form_attributive_long, 'tlieta', 'payload should include form_attributive_long');
    assertEq(payload.numeral_morphology.form_attributive_short_pattern, 'CâCC', 'payload should preserve form_attributive_short_pattern');
    assertEq(payload.numeral_morphology.ordinal_form, 'tielet', 'payload should map numeral_ordinal into ordinal_form');
    assertEq(payload.numeral_morphology.adverbial_form, 'tliet darbiet', 'payload should map numeral_adverbial into adverbial_form');
    assertEq(payload.numeral_morphology.fractional_form, 'terz', 'payload should map numeral_fractional into fractional_form');
    assertEq(payload.numeral_morphology.multiplier_form, 'triplu', 'payload should map numeral_multiplier into multiplier_form');
    assertEq(payload.numeral_morphology.distributive_form, 'tlieta tlieta', 'payload should map numeral_distributive into distributive_form');
    assert(!('numeral_ordinal' in payload), 'payload should not leak UI alias fields');

    assert(!('numeral_type' in form.extraFields), 'numeral_type should be handled');
    assert(!('numeral_ordinal' in form.extraFields), 'numeral_ordinal should be handled');

    const tnejnAuto = buildNumeralAutoForms('tnejn', 't-n-j');
    assertEq(tnejnAuto.ordinal, 'tieni', 'tnejn should use the canonical ordinal');
    assertEq(tnejnAuto.adverbial, 'darbtejn', 'tnejn should use the canonical adverbial');
    assertEq(tnejnAuto.fractional_semitic, 'nofs', 'tnejn should use the canonical fractional');
    assertEq(tnejnAuto.attributive_short, 'żewġ', 'tnejn should expose the canonical short attributive');
    assertEq(tnejnAuto.attributive_long, 'żewġt', 'tnejn should expose the canonical long attributive');

    const tnejnDisplay = buildNumeralDisplayForms('tnejn', 't-n-j', []);
    assertEq(tnejnDisplay.ordinal[0]?.value, 'tieni', 'tnejn display should show the canonical ordinal');
    assertEq(tnejnDisplay.adverbial[0]?.value, 'darbtejn', 'tnejn display should show the canonical adverbial');
    assertEq(tnejnDisplay.fractional[0]?.value, 'nofs', 'tnejn display should show the canonical fractional');
    assertEq(hasVisibleNumeralSurface(tnejnDisplay.ordinal), true, 'tnejn ordinal should be visible');
    assertEq(hasVisibleNumeralSurface([]), false, 'empty numeral surfaces should be hidden');
    assertEq(hasVisibleNumeralSurface([{ value: '-' }]), false, 'dash-only numeral surfaces should be hidden');

    assertEq(shouldCombineMasculineAndShortAttributive('tnejn'), true, 'tnejn should keep its attributive row');
    assertEq(shouldSuppressNumeralAttributiveForms('tnejn'), false, 'tnejn should not suppress attributive forms');

    const tlietaAuto = buildNumeralAutoForms('tlieta', 't-l-t');
    assertEq(tlietaAuto.ordinal, 'tielet', 'tlieta should use the canonical ordinal');
    assertEq(tlietaAuto.adverbial, 'tliet darbiet', 'tlieta should use the canonical adverbial');
    assertEq(tlietaAuto.fractional_semitic, 'terz', 'tlieta should use the canonical fractional');
    assertEq(tlietaAuto.attributive_short, 'tliet', 'tlieta should use the canonical short attributive');
    assertEq(tlietaAuto.attributive_long, 'tlitt', 'tlieta should use the canonical long attributive');

    const erbghaAuto = buildNumeralAutoForms('erbgħa', 'r-b-għ');
    assertEq(erbghaAuto.ordinal, "raba'", 'erbgħa should use the canonical ordinal');
    assertEq(erbghaAuto.adverbial, "erba' darbiet", 'erbgħa should use the canonical adverbial');
    assertEq(erbghaAuto.fractional_semitic, 'kwart', 'erbgħa should use the canonical fractional');
    assertEq(erbghaAuto.attributive_short, "erba'", 'erbgħa should use the canonical short attributive');
    assertEq(erbghaAuto.attributive_long, 'erbat', 'erbgħa should use the canonical long attributive');
    const erbghaDisplay = buildNumeralDisplayForms('erbgħa', 'r-b-għ', [
        {
            id: 'num-erbat',
            headword: 'erbat',
            numeral_morphology: {
                lemma_pattern: 'vCCvC',
            },
        },
    ]);
    assertEq(erbghaDisplay.attributive_long[0]?.value, 'erbat', 'erbgħa long attributive should link to erbat');
    assertEq(erbghaDisplay.attributive_long[0]?.entryId, 'num-erbat', 'linked erbat entry id should be retained');
    assertEq(erbghaDisplay.attributive_long[0]?.pattern, 'vCCvC', 'linked erbat pattern should be displayed');

    const tmienjaDisplay = buildNumeralDisplayForms('tmienja', 't-m-n-j', []);
    assertEq(tmienjaDisplay.ordinal[0]?.value, 'tmien', 'tmienja should use the canonical ordinal');
    assertEq(tmienjaDisplay.adverbial[0]?.value, 'tmien darbiet', 'tmienja should use the canonical adverbial');

    // Test Noun updates
    const nounSource = {
        pos: 'noun',
        is_collective: true,
        is_inflectable: false,
        noun_morphology: {
            is_collective: true,
            is_inflectable: false
        }
    };
    const nounForm = entryToForm(nounSource);
    assertEq(nounForm.is_collective, true, 'noun is_collective should be true');
    assertEq(nounForm.is_inflectable, false, 'noun is_inflectable should be false');
};

run();
console.log('numeralMorphology tests passed');
