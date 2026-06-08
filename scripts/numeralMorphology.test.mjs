import { entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';
import {
    buildNumeralAutoForms,
    buildNumeralDisplayForms,
    buildNumeralMorphologyDisplayForms,
    getNumeralDerivedCandidateHeadwords,
    getNumeralRoleLabel,
    hasVisibleNumeralSurface,
    getNumeralShortAttributiveRowLabel,
    NUMERAL_MORPHOLOGY_DB_FIELD_KEYS,
    normalizeNumeralMorphologyInput,
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

    assert(NUMERAL_MORPHOLOGY_DB_FIELD_KEYS.includes('plural_forms'), 'numeral DB fields should include plural_forms');
    assert(!NUMERAL_MORPHOLOGY_DB_FIELD_KEYS.includes('lemma_pattern'), 'numeral DB fields should not include deprecated lemma_pattern');
    assert(!NUMERAL_MORPHOLOGY_DB_FIELD_KEYS.includes('form_masc_pattern'), 'numeral DB fields should not include deprecated form_masc_pattern');
    assert(!NUMERAL_MORPHOLOGY_DB_FIELD_KEYS.includes('form_fem_pattern'), 'numeral DB fields should not include deprecated form_fem_pattern');

    const normalizedNumeral = normalizeNumeralMorphologyInput({
        numeral_type: 'ordinal',
        form_attributive_short: 'tlett',
        form_attributive_long: 'tlitt',
        numeral_ordinal: 'tielet',
        numeral_adverbial: 'tliet darbiet',
        numeral_fractional: 'terz',
        numeral_multiplier: 'triplu',
        numeral_distributive: 'tlieta tlieta',
        form_attributive_short_pattern: 'CCvCC',
        form_plural_pattern: 'CCvC',
        plural_forms: '[{"form":"tlatt","pattern":"CCvCC"}]',
        lemma_pattern: 'stale',
        form_masc_pattern: 'stale',
        form_fem_pattern: 'stale',
    });
    assertEq(normalizedNumeral.ordinal_form, 'tielet', 'normalizer should map ordinal UI alias');
    assertEq(normalizedNumeral.adverbial_form, 'tliet darbiet', 'normalizer should map adverbial UI alias');
    assertEq(normalizedNumeral.fractional_form, 'terz', 'normalizer should map fractional UI alias');
    assertEq(normalizedNumeral.multiplier_form, 'triplu', 'normalizer should map multiplier UI alias');
    assertEq(normalizedNumeral.distributive_form, 'tlieta tlieta', 'normalizer should map distributive UI alias');
    assertEq(normalizedNumeral.plural_forms, '[{"form":"tlatt","pattern":"CCvCC"}]', 'normalizer should preserve schema-backed plural_forms');
    assert(!('lemma_pattern' in normalizedNumeral), 'normalizer should not persist deprecated lemma_pattern');
    assert(!('form_masc_pattern' in normalizedNumeral), 'normalizer should not persist deprecated form_masc_pattern');
    assert(!('form_fem_pattern' in normalizedNumeral), 'normalizer should not persist deprecated form_fem_pattern');

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
    const erbghaCandidates = getNumeralDerivedCandidateHeadwords('erbgħa', 'r-b-għ');
    assertEq(erbghaCandidates.includes("raba'"), true, 'derived candidate helper should include ordinal forms');
    assertEq(erbghaCandidates.includes("erba' darbiet"), true, 'derived candidate helper should include adverbial forms');
    assertEq(erbghaCandidates.includes('kwart'), true, 'derived candidate helper should include fractional forms');
    assertEq(erbghaCandidates.includes('erbat'), true, 'derived candidate helper should include long attributive forms');
    assertEq(erbghaCandidates.filter(value => value === 'erbat').length, 1, 'derived candidate helper should dedupe forms');
    assertEq(erbghaCandidates.includes('erbgħa'), false, 'derived candidate helper should exclude the base headword');

    const erbghaDisplay = buildNumeralDisplayForms('erbgħa', 'r-b-għ', [
        {
            id: 'num-erbat',
            headword: 'erbat',
            cv_pattern: 'vCCvC',
        },
    ]);
    assertEq(erbghaDisplay.attributive_long[0]?.value, 'erbat', 'erbgħa long attributive should link to erbat');
    assertEq(erbghaDisplay.attributive_long[0]?.entryId, 'num-erbat', 'linked erbat entry id should be retained');
    assertEq(erbghaDisplay.attributive_long[0]?.pattern, 'vCCvC', 'linked erbat pattern should be displayed');

    const savedFirstDisplay = buildNumeralMorphologyDisplayForms('erbgħa', 'r-b-għ', {
        numeral_type: 'cardinal',
        form_attributive_short: "erba'",
        form_attributive_short_pattern: 'vCCv',
        form_attributive_long: 'erbat',
        ordinal_form: "ir-raba'",
        adverbial_form: '',
        fractional_form: 'kwart',
        multiplier_form: 'rbiegħi',
        distributive_form: 'rbiegħ',
    }, [
        { id: 'num-erbat', headword: 'erbat', cv_pattern: 'vCCvC' },
        { id: 'num-kwart', headword: 'kwart', cv_pattern: 'CCvCC' },
    ]);
    assertEq(savedFirstDisplay.cardinal[0]?.value, 'erbgħa', 'cardinal display should include the current cardinal entry as its own role row');
    assertEq(savedFirstDisplay.cardinal[0]?.marker, 'plain', 'current cardinal role row should be plain');
    assertEq(savedFirstDisplay.attributive_long[0]?.value, 'erbat', 'saved-first display should use saved long attributive');
    assertEq(savedFirstDisplay.attributive_long[0]?.entryId, 'num-erbat', 'saved long attributive should link to matching entry');
    assertEq(savedFirstDisplay.attributive_long[0]?.pattern, 'vCCvC', 'linked saved long attributive should use linked entry pattern');
    assertEq(savedFirstDisplay.ordinal[0]?.value, "ir-raba'", 'saved ordinal should override generated ordinal');
    assertEq(savedFirstDisplay.ordinal[0]?.marker, 'plain', 'unmatched saved ordinal should render as a plain surface');
    assertEq(savedFirstDisplay.adverbial[0]?.value, "erba' darbiet", 'blank saved adverbial should fall back to generated form');
    assertEq(savedFirstDisplay.fractional[0]?.entryId, 'num-kwart', 'saved fractional should link to matching entry');
    assertEq(savedFirstDisplay.multiplier[0]?.value, 'rbiegħi', 'saved multiplier should override generated multipliers');
    assertEq(savedFirstDisplay.distributive[0]?.value, 'rbiegħ', 'saved distributive should override generated distributive');
    assertEq(savedFirstDisplay.attributive_short[0]?.pattern, 'vCCv', 'unlinked saved short attributive should use schema-backed short pattern');
    assertEq(getNumeralRoleLabel('attributive_short'), 'Attributive Short', 'role labels should humanize underscore numeral types');

    const generatedFallbackDisplay = buildNumeralMorphologyDisplayForms('erbgħa', 'r-b-għ', {
        numeral_type: 'cardinal',
    }, []);
    assertEq(generatedFallbackDisplay.cardinal[0]?.value, 'erbgħa', 'cardinal display without family links should still include its own role row');
    assertEq(generatedFallbackDisplay.attributive_short[0]?.value, "erba'", 'generated fallback should still provide canonical short attributive');
    assert(generatedFallbackDisplay.attributive_short.every(item => item.marker !== 'plain'), 'generated fallback short forms should not render as plain/attested');
    assert(generatedFallbackDisplay.attributive_long.every(item => item.marker !== 'plain'), 'generated fallback long forms should not render as plain/attested');

    const untypedFamilyDisplay = buildNumeralMorphologyDisplayForms('erbgħa', 'r-b-għ', {
        numeral_type: 'cardinal',
    }, [
        { id: 'num-raba', headword: "raba'", pos: 'numeral' },
        { id: 'num-erbat', headword: 'erbat', pos: 'numeral' },
        { id: 'num-kwart', headword: 'kwart', pos: 'numeral' },
    ]);
    assertEq(untypedFamilyDisplay.cardinal.length, 1, 'untyped family entries should not be grouped into the cardinal row');
    assertEq(untypedFamilyDisplay.cardinal[0]?.value, 'erbgħa', 'cardinal row should stay the current cardinal entry only');
    assertEq(untypedFamilyDisplay.ordinal[0]?.entryId, 'num-raba', 'untyped family entries may still link exact generated role surfaces');
    assertEq(untypedFamilyDisplay.attributive_long[0]?.entryId, 'num-erbat', 'untyped long-attributive family stubs should link through generated role matching');
    assertEq(untypedFamilyDisplay.fractional[0]?.entryId, 'num-kwart', 'untyped fractional family stubs should link through generated role matching');

    const hydratedPatternDisplay = buildNumeralMorphologyDisplayForms('erbgħa', 'r-b-għ', {
        numeral_type: 'cardinal',
    }, [
        { id: 'num-erbat', headword: 'erbat', pos: 'numeral' },
        { id: 'num-erbat', headword: 'erbat', pos: 'numeral', numeral_type: 'attributive_long', cv_pattern: '-t' },
    ]);
    assertEq(hydratedPatternDisplay.attributive_long[0]?.entryId, 'num-erbat', 'hydrated family entries should replace shallow relationship stubs');
    assertEq(hydratedPatternDisplay.attributive_long[0]?.pattern, '-t', 'hydrated family entries should supply derived-row patterns');

    const derivedNumeralDisplay = buildNumeralMorphologyDisplayForms("raba'", 'r-b-għ', {
        numeral_type: 'ordinal',
        cv_pattern: 'CvCv',
    }, [
        {
            id: 'num-erbgħa',
            headword: 'erbgħa',
            numeral_type: 'cardinal',
            cv_pattern: 'vCCvC',
            root_consonants: 'r-b-għ',
            numeral_morphology: {
                numeral_type: 'cardinal',
                form_attributive_long: 'erbat',
            },
        },
        { id: 'num-erbat', headword: 'erbat', numeral_type: 'attributive_long', cv_pattern: 'vCCvC' },
    ]);
    assertEq(derivedNumeralDisplay.cardinal[0]?.value, 'erbgħa', 'derived display should use linked cardinal entry for cardinal row');
    assertEq(derivedNumeralDisplay.cardinal[0]?.entryId, 'num-erbgħa', 'linked cardinal entry id should be retained');
    assertEq(derivedNumeralDisplay.cardinal[0]?.pattern, 'vCCvC', 'linked cardinal should use entry pattern');
    assertEq(derivedNumeralDisplay.ordinal[0]?.value, "raba'", 'derived display should use the current entry as its own role row');
    assertEq(derivedNumeralDisplay.ordinal[0]?.pattern, 'CvCv', 'derived own role should use the entry pattern');
    assertEq(derivedNumeralDisplay.attributive_long[0]?.value, 'erbat', 'derived display should source sibling rows from the linked cardinal');
    assert(derivedNumeralDisplay.attributive_short.every(item => item.marker !== 'plain'), 'generated derived sibling rows should remain non-plain unless linked');

    const shortAttributiveDisplay = buildNumeralMorphologyDisplayForms("erba'", 'r-b-għ', {
        numeral_type: 'attributive_short',
        cv_pattern: 'vCCvC',
    }, [
        {
            id: 'num-erbgħa',
            headword: 'erbgħa',
            numeral_type: 'cardinal',
            cv_pattern: 'vCCvC',
            root_consonants: 'r-b-għ',
            numeral_morphology: {
                numeral_type: 'cardinal',
                form_attributive_short: "erba'",
                form_attributive_long: 'erbat',
                fractional_form: 'kwart',
                related_entries: [
                    { id: 'num-kwart', headword: 'kwart', numeral_type: 'fractional', cv_pattern: 'CCvCC' },
                ],
            },
        },
        { id: 'num-erbat', headword: 'erbat', numeral_type: 'attributive_long', cv_pattern: '-a' },
    ]);
    assertEq(shortAttributiveDisplay.cardinal[0]?.value, 'erbgħa', "erba' should show the family cardinal row");
    assertEq(shortAttributiveDisplay.attributive_short[0]?.value, "erba'", "erba' should show its own attributive-short role row");
    assertEq(shortAttributiveDisplay.attributive_short[0]?.marker, 'plain', "erba' own role row should be plain");
    assertEq(shortAttributiveDisplay.attributive_long[0]?.value, 'erbat', "erba' should show the sibling long-attributive row");
    assertEq(shortAttributiveDisplay.fractional[0]?.value, 'kwart', "erba' should show the family fractional row");
    assertEq(shortAttributiveDisplay.fractional[0]?.entryId, 'num-kwart', "erba' should link fractional rows through the cardinal family");

    const longAttributiveDisplay = buildNumeralMorphologyDisplayForms('erbat', 'r-b-għ', {
        numeral_type: 'attributive_long',
        cv_pattern: '-a',
    }, [
        {
            id: 'num-erbgħa',
            headword: 'erbgħa',
            numeral_type: 'cardinal',
            cv_pattern: 'vCCvC',
            root_consonants: 'r-b-għ',
            numeral_morphology: {
                numeral_type: 'cardinal',
                form_attributive_short: "erba'",
                form_attributive_long: 'erbat',
            },
        },
        { id: 'num-erba', headword: "erba'", numeral_type: 'attributive_short', cv_pattern: 'vCCvC' },
    ]);
    assertEq(longAttributiveDisplay.cardinal[0]?.value, 'erbgħa', 'erbat should show the family cardinal row');
    assertEq(longAttributiveDisplay.attributive_long[0]?.value, 'erbat', 'erbat should show its own attributive-long role row');
    assertEq(longAttributiveDisplay.attributive_long[0]?.marker, 'plain', 'erbat own role row should be plain');
    assertEq(longAttributiveDisplay.attributive_short[0]?.value, "erba'", 'erbat should show the sibling short-attributive row');

    const derivedWithoutCardinal = buildNumeralMorphologyDisplayForms("raba'", 'r-b-għ', {
        numeral_type: 'ordinal',
        cv_pattern: 'CvCv',
    }, [
        { id: 'num-erbat', headword: 'erbat', numeral_type: 'attributive_long', cv_pattern: 'vCCvC' },
    ]);
    assertEq(derivedWithoutCardinal.cardinal.length, 0, 'derived display should not invent a cardinal without a linked cardinal entry');
    assertEq(derivedWithoutCardinal.ordinal[0]?.value, "raba'", 'derived display without cardinal should still show its own role');
    assertEq(derivedWithoutCardinal.attributive_long[0]?.value, 'erbat', 'derived display should show explicitly linked sibling family rows');
    assertEq(derivedWithoutCardinal.attributive_long[0]?.entryId, 'num-erbat', 'explicit sibling family rows should stay linked');
    assertEq(derivedWithoutCardinal.adverbial.length, 0, 'derived display should not generate adverbial rows from its own headword');

    const familyOnlyDisplay = buildNumeralMorphologyDisplayForms('sitta', 's-t-t', {
        numeral_type: 'cardinal',
    }, [
        { id: 'num-sest', headword: 'sest', numeral_type: 'fractional', cv_pattern: 'CvCC' },
    ]);
    assertEq(familyOnlyDisplay.fractional[0]?.value, 'sest', 'family entries should populate role rows even without saved/generated forms');
    assertEq(familyOnlyDisplay.fractional[0]?.entryId, 'num-sest', 'family-only role rows should link to the family entry');

    const rbieghTopLevelRoleDisplay = buildNumeralMorphologyDisplayForms('rbiegħ', 'r-b-għ', {
        numeral_type: 'distributive',
        cv_pattern: 'CCieC',
    }, [
        {
            id: 'num-erbgħa',
            headword: 'erbgħa',
            pos: 'numeral',
            root_consonants: 'r-b-għ',
            numeral_type: 'cardinal',
            cv_pattern: 'vCCvC',
            numeral_morphology: {
                numeral_type: 'cardinal',
                form_attributive_long: 'erbat',
                fractional_form: 'kwart',
                multiplier_form: 'rbiegħi',
                distributive_form: 'rbiegħ',
            },
        },
        { id: 'num-rbieghi', headword: 'rbiegħi', pos: 'numeral', root_consonants: 'r-b-għ', numeral_type: 'multiplier', cv_pattern: 'CCieCi' },
    ]);
    assertEq(rbieghTopLevelRoleDisplay.cardinal[0]?.value, 'erbgħa', 'top-level-only distributive should show the family cardinal');
    assertEq(rbieghTopLevelRoleDisplay.cardinal[0]?.entryId, 'num-erbgħa', 'top-level-only distributive should link the family cardinal');
    assertEq(rbieghTopLevelRoleDisplay.distributive[0]?.value, 'rbiegħ', 'top-level-only distributive should use itself in the distributive row');
    assertEq(rbieghTopLevelRoleDisplay.distributive[0]?.marker, 'plain', 'top-level-only distributive own row should be plain');
    assertEq(rbieghTopLevelRoleDisplay.multiplier[0]?.value, 'rbiegħi', 'top-level-only distributive should show sibling multiplier rows');
    assertEq(rbieghTopLevelRoleDisplay.multiplier[0]?.entryId, 'num-rbieghi', 'top-level-only distributive should link sibling multiplier rows');

    const sameRootInferredFamilyDisplay = buildNumeralMorphologyDisplayForms('erbgħa', 'r-b-għ', {
        numeral_type: 'cardinal',
        multiplier_form: 'rbiegħi',
        distributive_form: 'rbiegħ',
    }, [
        { id: 'num-rbiegh', headword: 'rbiegħ', pos: 'numeral', root_consonants: 'r-b-għ', cv_pattern: 'CCieC' },
        { id: 'num-rbieghi', headword: 'rbiegħi', pos: 'numeral', root_consonants: 'r-b-għ', cv_pattern: 'CCieCi' },
    ]);
    assertEq(sameRootInferredFamilyDisplay.distributive[0]?.entryId, 'num-rbiegh', 'same-root saved cardinal surfaces should infer the distributive sibling row');
    assertEq(sameRootInferredFamilyDisplay.multiplier[0]?.entryId, 'num-rbieghi', 'same-root saved cardinal surfaces should infer the multiplier sibling row');

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
