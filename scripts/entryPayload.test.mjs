import assert from 'node:assert/strict';
import { buildEntryPayload } from '../src/lib/adminSchema.ts';

const run = () => {
    const prepositionPayload = buildEntryPayload({
        id: 'prep-bejn',
        headword: 'bejn',
        pos: 'preposition',
        cv_pattern: 'CCvC',
        is_inflectable: false,
        has_inflection: true,
        form_masc_pattern: 'WRONG',
        form_fem_pattern: 'WRONG',
    });

    assert.strictEqual(
        prepositionPayload.cv_pattern,
        'CCvC',
        'Preposition entries should keep the direct cv_pattern value'
    );
    assert.ok(!('participle_morphology' in prepositionPayload), 'preposition payload should not include participle morphology');
    assert.ok(!('numeral_morphology' in prepositionPayload), 'preposition payload should not include numeral morphology');
    assert.strictEqual(prepositionPayload.is_inflectable, 1, 'preposition payload should map has_inflection to is_inflectable');
    assert.ok(!('has_inflection' in prepositionPayload), 'preposition payload should not emit has_inflection as a DB field');

    const adjectivePayload = buildEntryPayload({
        id: 'adj-twil',
        headword: 'twil',
        pos: 'adjective',
        gender: 'masculine',
        cv_pattern: 'CCiC',
        form_masc: 'twil',
        form_fem: 'twila',
        form_fem_pattern: 'CCiCa',
        form_masc_pattern: 'CCiC',
        plural_forms: [
            { form: 'twal', pattern: 'CCiCa' },
            { form: '', pattern: 'CCiC' },
        ],
        form_plural_pattern: 'CCiCa',
        elative_form: 'itwal',
        elative_pattern: 'iCCaC',
        has_elative: false,
        dual_form: 'tewlin',
        dual_pattern: 'CvCCin',
        diminutive_form: 'twilek',
        diminutive_pattern: 'CCiCC',
        vowel_set_sg: 'i-a',
        vowel_set_pl: 'i-ie',
        vowel_set_opp: 'i-a',
        vowel_set_dual: 'i-e',
    });

    assert.strictEqual(adjectivePayload.cv_pattern, 'CCiC', 'adjective payload should keep the shared CV pattern');
    assert.ok(adjectivePayload.adj_morphology, 'adjective payload should include canonical adjective morphology');
    assert.ok(!('adjective_morphology' in adjectivePayload), 'adjective payload should not emit the legacy nested alias');
    assert.ok(!('form_masc' in adjectivePayload), 'adjective payload should not persist flat masculine alias fields');
    assert.ok(!('form_fem' in adjectivePayload), 'adjective payload should not persist flat feminine alias fields');
    assert.ok(!('form_masc_pattern' in adjectivePayload), 'adjective payload should not persist flat masculine pattern fields');
    assert.ok(!('form_fem_pattern' in adjectivePayload), 'adjective payload should not persist flat feminine pattern fields');
    assert.ok(!('form_plural_pattern' in adjectivePayload), 'adjective payload should not persist flat plural pattern fields');
    assert.ok(!('elative_form' in adjectivePayload), 'adjective payload should not persist flat elative fields');
    assert.ok(!('is_inflectable' in adjectivePayload), 'adjective payload should not persist flat inflectable flags');
    assert.strictEqual(adjectivePayload.adj_morphology.masculine_form, 'twil', 'adjective morphology should persist masculine_form');
    assert.strictEqual(adjectivePayload.adj_morphology.feminine_form, 'twila', 'adjective morphology should persist feminine_form');
    assert.strictEqual(adjectivePayload.adj_morphology.pattern, 'CCiC', 'adjective morphology should persist the canonical pattern');
    assert.strictEqual(adjectivePayload.adj_morphology.form_masc_pattern, 'CCiC', 'adjective morphology should persist the masculine pattern');
    assert.strictEqual(adjectivePayload.adj_morphology.form_fem_pattern, 'CCiCa', 'adjective morphology should persist the feminine pattern');
    assert.strictEqual(adjectivePayload.adj_morphology.form_plural_pattern, 'CCiCa', 'adjective morphology should persist the plural pattern');
    assert.strictEqual(adjectivePayload.adj_morphology.elative_form, 'itwal', 'adjective morphology should persist the elative form');
    assert.strictEqual(adjectivePayload.adj_morphology.elative_pattern, 'iCCaC', 'adjective morphology should persist the elative pattern');
    assert.strictEqual(adjectivePayload.adj_morphology.has_elative, 0, 'adjective morphology should coerce has_elative to a DB-ready integer');
    assert.strictEqual(adjectivePayload.adj_morphology.is_inflectable, 0, 'adjective morphology should coerce is_inflectable to a DB-ready integer');
    assert.strictEqual(adjectivePayload.adj_morphology.dual_form, 'tewlin', 'adjective morphology should persist dual_form');
    assert.strictEqual(adjectivePayload.adj_morphology.dual_pattern, 'CvCCin', 'adjective morphology should persist dual_pattern');
    assert.strictEqual(adjectivePayload.adj_morphology.diminutive_form, 'twilek', 'adjective morphology should persist diminutive_form');
    assert.strictEqual(adjectivePayload.adj_morphology.diminutive_pattern, 'CCiCC', 'adjective morphology should persist diminutive_pattern');
    assert.strictEqual(adjectivePayload.adj_morphology.vowel_set_sg, 'i-a', 'adjective morphology should persist vowel_set_sg');
    assert.strictEqual(adjectivePayload.adj_morphology.vowel_set_pl, 'i-ie', 'adjective morphology should persist vowel_set_pl');
    assert.strictEqual(adjectivePayload.adj_morphology.vowel_set_opp, 'i-a', 'adjective morphology should persist vowel_set_opp');
    assert.strictEqual(adjectivePayload.adj_morphology.vowel_set_dual, 'i-e', 'adjective morphology should persist vowel_set_dual');
    assert.match(
        String(adjectivePayload.adj_morphology.plural_form),
        /"form":"twal"/,
        'adjective morphology should persist plural rows in serialized form'
    );

    const feminineAdjectivePayload = buildEntryPayload({
        id: 'adj-bieqja',
        headword: 'bieqja',
        pos: 'adjective',
        gender: 'feminine',
        form_masc: 'bieqi',
        form_fem: 'bieqja',
        cv_pattern: 'CâCCa',
    });

    assert.ok(!('form_masc' in feminineAdjectivePayload), 'feminine adjective payload should not emit a flat masculine alias');
    assert.strictEqual(
        feminineAdjectivePayload.adj_morphology.masculine_form,
        'bieqi',
        'feminine adjective morphology should persist the edited masculine form'
    );

    const usageExamplePayload = buildEntryPayload({
        id: 'adj-bieqja-example',
        headword: 'bieqja',
        pos: 'adjective',
        gender: 'feminine',
        usage_example: 'Hija bieqja ħafna.',
        usage_example_en: 'She is very diligent.',
    });

    assert.deepStrictEqual(
        usageExamplePayload.usage_examples,
        [{ text_mt: 'Hija bieqja ħafna.', text_en: 'She is very diligent.' }],
        'usage example inputs should serialize into the shared usage_examples array'
    );

    const adjectiveAliasPayload = buildEntryPayload({
        id: 'adj-twil-alias',
        headword: 'twil',
        pos: 'adj',
        gender: 'masculine',
        form_masc: 'twil',
        form_fem: 'twila',
        plural_forms: [{ form: 'twal', pattern: 'CCiCa' }],
        form_plural_pattern: 'CCiCa',
    });

    assert.strictEqual(
        adjectiveAliasPayload.pos,
        'adjective',
        'payload should canonicalize the submitted POS token'
    );
    assert.strictEqual(
        adjectiveAliasPayload.adj_morphology.plural_form,
        '[{"form":"twal","pattern":"CCiCa"}]',
        'payload should still emit adjective morphology when the submitted POS uses the short alias'
    );
    assert.strictEqual(
        adjectiveAliasPayload.adj_morphology.form_plural_pattern,
        'CCiCa',
        'payload should persist the adjective plural pattern inside adjective morphology'
    );

    const adjectiveLegacyPluralPayload = buildEntryPayload({
        id: 'adj-twil-legacy',
        headword: 'twil',
        pos: 'adjective',
        gender: 'masculine',
        plural_forms: [{ form: '', pattern: '' }],
        inflections_pl: ['twal'],
        form_masc: 'twil',
        form_fem: 'twila',
    });

    assert.deepStrictEqual(
        adjectiveLegacyPluralPayload.inflections_pl,
        ['twal'],
        'adjective payload should prefer a meaningful legacy plural over a blank editor row'
    );
    assert.ok(!('form_plural_pattern' in adjectiveLegacyPluralPayload), 'text-only legacy plurals should not emit a flat plural pattern');
    assert.strictEqual(
        adjectiveLegacyPluralPayload.adj_morphology.plural_form,
        '[{"form":"twal","pattern":""}]',
        'adjective morphology should persist the real plural row'
    );

    const adjectivePluralPatternOnly = buildEntryPayload({
        id: 'adj-pattern-only',
        headword: 'twil',
        pos: 'adjective',
        gender: 'masculine',
        form_masc: 'twil',
        plural_forms: [{ form: '', pattern: 'CCiCa' }],
        form_plural_pattern: 'CCiCa',
    });

    assert.deepStrictEqual(
        adjectivePluralPatternOnly.inflections_pl,
        [],
        'pattern-only plural rows should not invent legacy plural forms'
    );
    assert.ok(!('form_plural_pattern' in adjectivePluralPatternOnly), 'pattern-only plural rows should not emit a flat plural pattern alias');
    assert.ok(adjectivePluralPatternOnly.adj_morphology, 'pattern-only plural rows should still produce adjective morphology');
    assert.match(
        String(adjectivePluralPatternOnly.adj_morphology.plural_form),
        /CCiCa/,
        'pattern-only plural rows should remain serialized in adjective morphology'
    );

    const nounPayload = buildEntryPayload({
        id: 'noun-kelma',
        headword: 'kelma',
        pos: 'noun',
        gender: 'feminine',
        is_inflectable_singular: true,
        is_inflectable_plural: false,
        cv_pattern: '',
        form_fem_pattern: 'CaCCa',
        form_masc_pattern: 'WRONG',
        extraFields: {
            noun_singular: 'legacy-kelma',
            noun_plural: 'legacy-plural',
        },
    });

    assert.strictEqual(
        nounPayload.cv_pattern,
        'CaCCa',
        'Legacy gendered entries should still fall back to the mirrored pattern slot'
    );
    assert.strictEqual(nounPayload.noun_morphology.is_inflectable_singular, 1, 'noun payload should persist singular inflectable');
    assert.strictEqual(nounPayload.noun_morphology.is_inflectable_plural, 0, 'noun payload should persist plural inflectable');
    assert.ok(!('noun_singular' in nounPayload), 'legacy noun_singular should be stripped from payload');
    assert.ok(!('noun_plural' in nounPayload), 'legacy noun_plural should be stripped from payload');
    assert.strictEqual(nounPayload.form_fem, null, 'legacy flat feminine form should be cleared');
    assert.strictEqual(nounPayload.form_masc, null, 'legacy flat masculine form should be cleared');
    assert.strictEqual(nounPayload.morph_pattern, null, 'legacy morph pattern should be cleared');
    assert.ok(!('participle_morphology' in nounPayload), 'noun payload should not include participle morphology');
    assert.ok(!('numeral_morphology' in nounPayload), 'noun payload should not include numeral morphology');

    const nounDirectPayload = buildEntryPayload({
        id: 'noun-kelma-2',
        headword: 'kelma',
        pos: 'noun',
        gender: 'feminine',
        cv_pattern: 'CUSTOM',
        form_fem_pattern: 'CaCCa',
        form_masc_pattern: 'WRONG',
    });

    assert.strictEqual(
        nounDirectPayload.cv_pattern,
        'CUSTOM',
        'Direct cv_pattern should win when it is present'
    );

    const numeralPayload = buildEntryPayload({
        id: 'num-wieħed',
        headword: 'wieħed',
        pos: 'numeral',
        numeral_type: 'cardinal',
        form_attributive_short: 'tliet',
        form_attributive_short_pattern: 'CvCVC',
        numeral_ordinal: 'ewwel',
        numeral_adverbial: 'darba',
        numeral_fractional: 'terz',
        numeral_multiplier: 'uniku',
        numeral_distributive: 'uħud',
        plural_forms: [{ form: 'uħud', pattern: 'vCvC' }],
        form_plural_pattern: 'vCvC',
        lemma_pattern: 'stale',
        form_masc_pattern: 'stale',
        form_fem_pattern: 'stale',
    });

    assert.ok(!('noun_morphology' in numeralPayload), 'numeral payload should not include noun morphology');
    assert.ok(!('adj_morphology' in numeralPayload), 'numeral payload should not include adjective morphology');
    assert.ok(!('participle_morphology' in numeralPayload), 'numeral payload should not include participle morphology');
    assert.ok(numeralPayload.numeral_morphology, 'numeral payload should include numeral morphology');
    assert.strictEqual(numeralPayload.numeral_morphology.numeral_type, 'cardinal');
    assert.strictEqual(numeralPayload.numeral_morphology.form_attributive_short, 'tliet');
    assert.strictEqual(numeralPayload.numeral_morphology.form_attributive_short_pattern, 'CvCVC');
    assert.strictEqual(numeralPayload.numeral_morphology.ordinal_form, 'ewwel');
    assert.strictEqual(numeralPayload.numeral_morphology.adverbial_form, 'darba');
    assert.strictEqual(numeralPayload.numeral_morphology.fractional_form, 'terz');
    assert.strictEqual(numeralPayload.numeral_morphology.multiplier_form, 'uniku');
    assert.strictEqual(numeralPayload.numeral_morphology.distributive_form, 'uħud');
    assert.strictEqual(numeralPayload.numeral_morphology.form_plural_pattern, 'vCvC');
    assert.deepStrictEqual(numeralPayload.numeral_morphology.plural_forms, [{ form: 'uħud', pattern: 'vCvC' }], 'numeral payload should persist schema-backed plural_forms');
    assert.ok(!('numeral_ordinal' in numeralPayload), 'numeral UI aliases should not leak into the payload');
    assert.ok(!('lemma_pattern' in numeralPayload.numeral_morphology), 'numeral morphology should not persist deprecated lemma_pattern');
    assert.ok(!('form_masc_pattern' in numeralPayload.numeral_morphology), 'numeral morphology should not persist deprecated form_masc_pattern');
    assert.ok(!('form_fem_pattern' in numeralPayload.numeral_morphology), 'numeral morphology should not persist deprecated form_fem_pattern');
    assert.ok(!('form_masc_pattern' in numeralPayload), 'numeral payload should not emit flat masculine pattern aliases');
    assert.ok(!('form_fem_pattern' in numeralPayload), 'numeral payload should not emit flat feminine pattern aliases');

    const derivedOrdinalPayload = buildEntryPayload({
        id: 'num-raba',
        headword: "raba'",
        pos: 'numeral',
        numeral_type: 'ordinal',
        cv_pattern: 'CvCv',
        form_attributive_short: 'stale-short',
        form_attributive_long: 'stale-long',
        numeral_ordinal: 'stale-ordinal',
        numeral_adverbial: 'stale-adverbial',
        numeral_fractional: 'stale-fractional',
        numeral_multiplier: 'stale-multiplier',
        numeral_distributive: 'stale-distributive',
        form_attributive_short_pattern: 'stale-pattern',
        form_plural_pattern: 'stale-plural',
        plural_forms: [{ form: 'stale-plural', pattern: 'stale-plural' }],
    });

    assert.strictEqual(derivedOrdinalPayload.numeral_morphology.numeral_type, 'ordinal');
    assert.strictEqual(derivedOrdinalPayload.numeral_morphology.ordinal_form, "raba'", 'derived ordinal should mirror headword into ordinal_form');
    assert.ok(!('form_attributive_short' in derivedOrdinalPayload.numeral_morphology), 'derived ordinal should strip sibling short attributive');
    assert.ok(!('form_attributive_long' in derivedOrdinalPayload.numeral_morphology), 'derived ordinal should strip sibling long attributive');
    assert.ok(!('adverbial_form' in derivedOrdinalPayload.numeral_morphology), 'derived ordinal should strip sibling adverbial');
    assert.ok(!('form_attributive_short_pattern' in derivedOrdinalPayload.numeral_morphology), 'derived ordinal should strip sibling short pattern');
    assert.ok(!('form_plural_pattern' in derivedOrdinalPayload.numeral_morphology), 'derived ordinal should strip sibling plural pattern');
    assert.ok(!('plural_forms' in derivedOrdinalPayload.numeral_morphology), 'derived ordinal should strip sibling plural forms');

    const derivedShortPayload = buildEntryPayload({
        id: 'num-erba',
        headword: "erba'",
        pos: 'numeral',
        numeral_type: 'attributive_short',
        cv_pattern: 'vCCv',
        form_attributive_long: 'stale-long',
        numeral_ordinal: 'stale-ordinal',
    });

    assert.strictEqual(derivedShortPayload.numeral_morphology.numeral_type, 'attributive_short');
    assert.strictEqual(derivedShortPayload.numeral_morphology.form_attributive_short, "erba'", 'derived short attributive should mirror headword');
    assert.strictEqual(derivedShortPayload.numeral_morphology.form_attributive_short_pattern, 'vCCv', 'derived short attributive should mirror cv_pattern into short pattern');
    assert.ok(!('form_attributive_long' in derivedShortPayload.numeral_morphology), 'derived short attributive should strip sibling long attributive');
    assert.ok(!('ordinal_form' in derivedShortPayload.numeral_morphology), 'derived short attributive should strip sibling ordinal');

    const participlePayload = buildEntryPayload({
        id: 'ptcp-kitieb',
        headword: 'kittieb',
        pos: 'participle',
        participle_type: 'active',
        gender: 'masculine',
        form_masc: 'kittieb',
        form_fem: 'kittieba',
    });

    assert.ok(!('noun_morphology' in participlePayload), 'participle payload should not include noun morphology');
    assert.ok(!('numeral_morphology' in participlePayload), 'participle payload should not include numeral morphology');
    assert.ok(participlePayload.adj_morphology, 'participle payload should include adjective morphology');
    assert.ok(participlePayload.participle_morphology, 'participle payload should include participle morphology');
};

run();
console.log('entryPayload tests passed');
