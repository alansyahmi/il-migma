import assert from 'node:assert/strict';
import { buildEntryPayload } from '../src/lib/adminSchema.ts';
import { generateConjugation, generateRootForms } from '../src/lib/conjugationEngine.ts';
import { buildPerfectForm, buildVerbForm } from '../src/lib/suffixEngine.ts';
import {
    applyVerbMorphologyCompatibility,
    buildVerbConjugationFromEngine,
    buildVerbMorphologyResponse,
    deriveEntryFormVerbVowelSets,
    detectVerbRootType,
    normalizeVerbMorphologyInput,
    resolveVerbGenerationInput,
    shouldAutoBlockImalaForVerbVowels,
    shouldMarkVerbConjugationTheoretical,
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
            is_imala_blocked: true,
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
        is_imala_blocked: true,
        type: 'root',
    });

    assert.equal(detectVerbRootType('b-d-w'), 'triliteral', 'hyphenated triliteral roots should not be detected as quadriliteral');
    assert.equal(detectVerbRootType('għ-m-l'), 'triliteral', 'Maltese digraph radicals should count as one radical');
    assert.equal(detectVerbRootType('q-r-t-s'), 'quadriliteral', 'hyphenated four-radical roots should be detected as quadriliteral');

    assert.deepEqual(
        deriveEntryFormVerbVowelSets('II', 'strong', '', 'a-e', 'k-t-b'),
        { perfect: 'a-e', imperfect: 'a-e', imperative: 'a-e' },
        'non-Form-I strong verbs should inherit all vowel sets from root perfect',
    );
    assert.deepEqual(
        deriveEntryFormVerbVowelSets('III', 'weak', 'defective', 'a-e', 'b-d-w'),
        { perfect: 'a-e', imperfect: 'a-i', imperative: 'a-i' },
        'weak defective Form III verbs should keep root perfect but use final i in imperfect and imperative',
    );
    assert.deepEqual(
        deriveEntryFormVerbVowelSets('I', 'weak', 'defective', 'a-e', 'b-d-w'),
        { perfect: 'a-a', imperfect: 'i-a', imperative: 'i-a' },
        'Form I should keep the existing default vowel-set behavior',
    );
    assert.deepEqual(
        deriveEntryFormVerbVowelSets('II', 'strong', '', 'ae', 'k-t-b'),
        { perfect: 'a-a', imperfect: 'a-a', imperative: 'a-a' },
        'malformed root perfect vowel sets should fall back to existing defaults',
    );
    assert.equal(
        shouldAutoBlockImalaForVerbVowels(' a-a ', 'A-A', 'a-a'),
        true,
        'all three a-a verb vowel sets should auto-block imala after trimming/lowercasing',
    );
    assert.equal(
        shouldAutoBlockImalaForVerbVowels('a-a', 'a-e', 'a-a'),
        false,
        'non-a-a verb vowel combinations should not auto-block imala',
    );

    const normalizedFromDisplayAliases = normalizeVerbMorphologyInput({
        verb_morphology: {
            form: 'I',
            verb_class: ' weak ',
            perfective_3sg_m: ' qara ',
            imperfective_3sg_m: ' jaqra ',
            vowel_set_perfect: ' a-a ',
            vowel_set_imperfect: ' a-a ',
            vowel_set_imperative: ' a-a ',
        },
    });

    assert.equal(normalizedFromDisplayAliases.class, 'weak', 'verb_class alias should normalize to class');
    assert.equal(normalizedFromDisplayAliases.perfective_3sgm, 'qara', 'display perfective alias should normalize to DB key');
    assert.equal(normalizedFromDisplayAliases.imperfective_3sgm, 'jaqra', 'display imperfective alias should normalize to DB key');
    assert.equal(normalizedFromDisplayAliases.vowel_set_perf, 'a-a', 'display perfect vowel alias should normalize to DB key');
    assert.equal(normalizedFromDisplayAliases.vowel_set_impf, 'a-a', 'display imperfect vowel alias should normalize to DB key');
    assert.equal(normalizedFromDisplayAliases.vowel_set_impv, 'a-a', 'display imperative vowel alias should normalize to DB key');

    const normalizedFromJoinedAliases = normalizeVerbMorphologyInput({
        vm_form: 'III',
        vm_class: 'weak',
        vm_weak_class: 'defective',
        vm_is_imala_blocked: 0,
        vm_perfective_3sgm: 'bieda',
        vm_imperfective_3sgm: 'jbiedi',
        vm_vowel_perf: 'a-a',
        vm_vowel_impf: 'i-a',
        vm_vowel_impv: 'o-o',
        vm_type: 'triliteral',
    });

    assert.equal(normalizedFromJoinedAliases.form, 'III', 'joined vm_form alias should normalize to form');
    assert.equal(normalizedFromJoinedAliases.class, 'weak', 'joined vm_class alias should normalize to class');
    assert.equal(normalizedFromJoinedAliases.is_imala_blocked, 0, 'joined vm imala alias should normalize to DB key');
    assert.equal(normalizedFromJoinedAliases.perfective_3sgm, 'bieda', 'joined vm perfect alias should normalize to DB key');
    assert.equal(normalizedFromJoinedAliases.imperfective_3sgm, 'jbiedi', 'joined vm imperfect alias should normalize to DB key');

    const response = buildVerbMorphologyResponse(
        { id: 'v-kiteb', headword: 'kiteb', is_inflectable: 1, usage_example: 'kiteb ħafna' },
        normalized,
        { synonyms: [{ headword: 'write', id: 'x-1' }] },
    );

    assert.equal(response.form, 'II');
    assert.equal(response.verb_class, 'strong');
    assert.equal(response.class, 'strong');
    assert.equal(response.perfective_3sgm, 'kiteb');
    assert.equal(response.perfective_3sg_m, 'kiteb');
    assert.equal(response.vowel_set_perf, 'i-e');
    assert.equal(response.vowel_set_imperative, 'i-e');
    assert.equal(response.synonyms.length, 1);

    const compat = {};
    applyVerbMorphologyCompatibility(compat, { headword: 'kiteb', is_inflectable: 1 }, normalized);
    assert.equal(compat.verb_form, 'II');
    assert.equal(compat.verb_class, 'strong');
    assert.ok(compat.verb_morphology);
    assert.equal(compat.verb_morphology.class, 'strong', 'compat nested morphology should keep canonical class');
    assert.equal(compat.verb_morphology.perfective_3sgm, 'kiteb', 'compat nested morphology should keep canonical perfective');
    assert.equal(compat.verb_morphology.vowel_set_perf, 'i-e', 'compat nested morphology should keep canonical perfect vowel set');
    assert.equal(compat.verb_morphology.is_imala_blocked, true, 'compat nested morphology should keep entry-specific imala override');

    const stemVerbConjugation = buildVerbConjugationFromEngine({
        headword: 'sserva',
        pos: 'verb',
        zokk_morphology: {
            stem_string: 'serv',
            class_type: 'ir',
            is_hybrid: true,
            root: 's-r-v-j',
        },
    }, {
        form: 'I',
        class: 'strong',
        vowel_set_perf: 'a-a',
        vowel_set_impf: 'a-i',
        vowel_set_impv: 'a-i',
    });

    assert.equal(stemVerbConjugation?.rows[0].perfect, 'sservejt', 'stem verb table should use zokk perfect endings');
    assert.equal(stemVerbConjugation?.rows[2].perfect, 'sserva', 'stem verb 3ms perfect should match the entry headword');
    assert.equal(stemVerbConjugation?.rows[2].imperfect, 'jisserva', 'stem verb 3ms imperfect should use the zokk hybrid imperfect');
    assert.equal(stemVerbConjugation?.rows[6].imperfect, 'jisservew', 'stem verb plural imperfect should use zokk plural ending');
    assert.equal(stemVerbConjugation?.imperative_sg, 'sserva', 'stem verb imperative singular should use zokk hybrid imperative');
    assert.equal(stemVerbConjugation?.imperative_pl, 'sservew', 'stem verb imperative plural should use zokk plural ending');

    const staleClassStemVerb = buildVerbConjugationFromEngine({
        headword: 'sserva',
        pos: 'verb',
        zokk_morphology: {
            stem_string: 'serv',
            class_type: 'ar',
            is_hybrid: true,
            root: 's-r-v-j',
        },
    }, {
        form: 'II',
        class: 'weak',
        weak_class: 'defective',
        vowel_set_perf: 'a-a',
        vowel_set_impf: 'a-i',
        vowel_set_impv: 'a-i',
    });

    assert.deepEqual(
        staleClassStemVerb?.rows.map((row) => row.imperfect),
        ['nisserva', 'tisserva', 'jisserva', 'tisserva', 'nisservew', 'tisservew', 'jisservew'],
        'stem hybrid Form II entries should not fall back to the base ar zokk table when the headword is s-prefixed',
    );
    assert.equal(staleClassStemVerb?.rows[0].perfect, 'sservejt', 'stale-class stem hybrid should use Form II weak perfect endings');
    assert.equal(staleClassStemVerb?.imperative_pl, 'sservew', 'stale-class stem hybrid should use Form II plural imperative');

    const stemVerbSsaqsa = buildVerbConjugationFromEngine({
        headword: 'ssaqsa',
        pos: 'verb',
        zokk_morphology: {
            stem_string: 'saqs',
            class_type: 'ir',
            is_hybrid: true,
            root: 's-q-s-j',
        },
    }, {
        form: 'I',
        class: 'strong',
        vowel_set_perf: 'a-a',
        vowel_set_impf: 'a-i',
        vowel_set_impv: 'a-i',
    });

    assert.deepEqual(
        stemVerbSsaqsa?.rows.map((row) => row.imperfect),
        ['nissaqsa', 'tissaqsa', 'jissaqsa', 'tissaqsa', 'nissaqsew', 'tissaqsew', 'jissaqsew'],
        'stem verb imperfect rows should vary person prefixes instead of reusing the 3ms j- form',
    );

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
        is_imala_blocked: true,
        verb_type: 'root',
        source_citation: 'A test source',
    });

    assert.ok(verbPayload.verb_morphology, 'verb payload should include nested morphology');
    assert.equal(verbPayload.verb_morphology.form, 'II');
    assert.equal(verbPayload.verb_morphology.class, 'strong');
    assert.equal(verbPayload.verb_morphology.is_imala_blocked, true, 'verb payload should persist entry-specific imala override in nested morphology');
    assert.ok(!Object.prototype.hasOwnProperty.call(verbPayload, 'verb_form'), 'legacy verb_form should not be persisted on entries payloads');
    assert.ok(!Object.prototype.hasOwnProperty.call(verbPayload, 'verb_class'), 'legacy verb_class should not be persisted on entries payloads');

    const nonWeakPayload = buildEntryPayload({
        pos: 'verb',
        headword: "rabba'",
        _formLabel: 'II',
        verb_class: 'strong-hybrid',
        _weakClass: 'defective',
        verb_vowel_perf: 'a-a',
        verb_vowel_impf: 'a-a',
        verb_vowel_impv: 'a-a',
    });
    assert.equal(nonWeakPayload.verb_morphology.class, 'strong-hybrid', 'manual strong-hybrid class should persist in nested verb morphology');
    assert.equal(nonWeakPayload.verb_morphology.weak_class, '', 'non-weak verb payload should clear stale weak class');

    const nounPayload = buildEntryPayload({
        pos: 'noun',
        headword: 'darba',
        verb_class: 'strong',
        verb_morphology: { form: 'I', class: 'strong' },
    });

    assert.ok(!Object.prototype.hasOwnProperty.call(nounPayload, 'verb_morphology'), 'non-verb payloads should not keep verb morphology');
    assert.ok(!Object.prototype.hasOwnProperty.call(nounPayload, 'verb_class'), 'non-verb payloads should drop verb legacy fields');

    const ghamel = generateConjugation({
        root: 'għ-m-l',
        form: 'I',
        strength: 'strong',
        vowelSetPerfect: 'a-e',
        vowelSetImperfect: 'a-e',
        vowelSetImperative: 'a-e',
        isImalaBlocked: true,
    });

    assert.equal(ghamel.rows[0].perfect, 'għamilt', 'għamel 1s perfect should keep the pharyngeal attached stem');
    assert.equal(ghamel.rows[1].perfect, 'għamilt', 'għamel 2s perfect should keep the pharyngeal attached stem');
    assert.equal(ghamel.rows[4].perfect, 'għamilna', 'għamel 1p perfect should keep the pharyngeal attached stem');
    assert.equal(ghamel.rows[5].perfect, 'għamiltu', 'għamel 2p perfect should keep the pharyngeal attached stem');
    assert.equal(ghamel.rows[6].perfect, 'għamlu', 'għamel 3p perfect should use the syncopated stem');
    assert.equal(ghamel.rows[4].imperfect, 'nagħmlu', 'għamel 1p imperfect should syncopate the stem');
    assert.equal(ghamel.rows[5].imperfect, 'tagħmlu', 'għamel 2p imperfect should syncopate the stem');
    assert.equal(ghamel.rows[6].imperfect, 'jagħmlu', 'għamel 3p imperfect should syncopate the stem');
    assert.equal(ghamel.imperative_pl, 'agħmlu', 'għamel imperative plural should syncopate the stem');

    const wiret = generateConjugation({
        root: 'w-r-t',
        form: 'I',
        strength: 'weak',
        weakClass: 'assimilative',
        vowelSetPerfect: 'i-e',
        vowelSetImperfect: 'i-e',
        vowelSetImperative: 'i-e',
        isImalaBlocked: false,
    });

    assert.equal(wiret.rows[0].imperfect, 'niret', 'assimilative 1s imperfect should keep the prefix vowel');
    assert.equal(wiret.rows[2].imperfect, 'jiret', 'assimilative 3ms imperfect should keep the prefix vowel');
    assert.equal(wiret.rows[6].imperfect, 'jirtu', 'assimilative plural imperfect should keep the prefix vowel');
    assert.equal(wiret.imperative_sg, 'iret', 'assimilative imperative singular should keep the theme vowel');

    const wiretRootForms = generateRootForms('w-r-t', 'i-e', 'i-e', 'weak', 'assimilative');
    assert.equal(wiretRootForms[0].perfect, 'wiret', 'assimilative root-form preview should keep C3 in the perfect');
    assert.equal(wiretRootForms[0].imperfect, 'jiret', 'assimilative root-form preview should keep C3 in the imperfect');
    assert.equal(wiretRootForms[0].imperative, 'iret', 'assimilative root-form preview should keep C3 in the imperative');

    const waqaf = generateConjugation({
        root: 'w-q-f',
        form: 'I',
        strength: 'weak',
        weakClass: 'assimilative',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'ie-a',
        vowelSetImperative: 'ie-a',
        isImalaBlocked: true,
    });

    assert.equal(waqaf.rows[0].imperfect, 'nieqaf', 'assimilative ie-a 1s imperfect should keep full ie prefix vowel');
    assert.equal(waqaf.rows[2].imperfect, 'jieqaf', 'assimilative ie-a 3ms imperfect should keep full ie prefix vowel');
    assert.equal(waqaf.rows[6].imperfect, 'jieqfu', 'assimilative ie-a plural imperfect should keep full ie prefix vowel');
    assert.equal(waqaf.rows[0].perfect, 'wqaft', 'waqaf 1s perfect should keep the wqaf- attached stem');
    assert.equal(waqaf.rows[4].perfect, 'wqafna', 'waqaf 1p perfect should keep the wqaf- attached stem');
    assert.equal(waqaf.imperative_sg, 'ieqaf', 'assimilative ie-a imperative should keep ie');

    const hareg = generateConjugation({
        root: 'ħ-r-ġ',
        form: 'I',
        strength: 'strong',
        vowelSetPerfect: 'a-e',
        vowelSetImperfect: 'a-e',
        vowelSetImperative: 'a-e',
        isImalaBlocked: false,
    });

    assert.equal(hareg.rows[0].perfect, 'ħriġt', 'ħareġ 1s perfect should use i when the second perfect vowel is not a');
    assert.equal(hareg.rows[4].perfect, 'ħriġna', 'ħareġ 1p perfect should use i when the second perfect vowel is not a');

    const nesa = generateConjugation({
        root: 'n-s-j',
        form: 'I',
        strength: 'weak',
        weakClass: 'defective',
        vowelSetPerfect: 'e-a',
        vowelSetImperfect: 'i-a',
        vowelSetImperative: 'i-a',
        isImalaBlocked: false,
    });

    assert.deepEqual(
        nesa.rows.map((row) => row.imperfect),
        ['ninsa', 'tinsa', 'jinsa', 'tinsa', 'ninsew', 'tinsew', 'jinsew'],
        'nesa imperfect should use -ew in the plural rows',
    );
    assert.deepEqual(
        nesa.rows.map((row) => row.perfect),
        ['nsejt', 'nsejt', 'nesa', 'nsiet', 'nsejna', 'nsejtu', 'nsew'],
        'nesa perfect rows should match the weak defective table',
    );
    assert.equal(nesa.rows[6].perfect, 'nsew', 'nesa 3p perfect should be nsew, not nsu');
    assert.equal(nesa.imperative_sg, 'insa', 'nesa singular imperative should be insa');
    assert.equal(nesa.imperative_pl, 'insew', 'nesa plural imperative should be insew');

    const formIDefectiveCases = [
        {
            label: 'xela',
            input: {
                headword: 'xela',
                root: 'x-l-j',
                form: 'I',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'i-i',
                vowelSetImperative: 'i-i',
                isImalaBlocked: false,
            },
            imperfect: ['nixli', 'tixli', 'jixli', 'tixli', 'nixlu', 'tixlu', 'jixlu'],
            perfect: ['xlejt', 'xlejt', 'xela', 'xliet', 'xlejna', 'xlejtu', 'xlew'],
            imperative: ['ixli', 'ixlu'],
            negatives: {
                imperfect1s: 'ma nixlix',
                perfect3ms: 'ma xeliex',
                imperativeSg: 'tixlix',
            },
        },
        {
            label: 'xewa',
            input: {
                headword: 'xewa',
                root: 'x-w-j',
                form: 'I',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'i-i',
                vowelSetImperative: 'i-i',
                isImalaBlocked: false,
            },
            imperfect: ['nixwi', 'tixwi', 'jixwi', 'tixwi', 'nixwu', 'tixwu', 'jixwu'],
            perfect: ['xwejt', 'xwejt', 'xewa', 'xwiet', 'xwejna', 'xwejtu', 'xwew'],
            imperative: ['ixwi', 'ixwu'],
            negatives: {
                imperfect1s: 'ma nixwix',
                perfect3ms: 'ma xewiex',
                imperativeSg: 'tixwix',
            },
        },
        {
            label: 'uża',
            input: {
                headword: 'uża',
                root: 'w-ż-j',
                form: 'I',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'u-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['nuża', 'tuża', 'juża', 'tuża', 'nużaw', 'tużaw', 'jużaw'],
            perfect: ['użajt', 'użajt', 'uża', 'użat', 'użajna', 'użajtu', 'użaw'],
            imperative: ['uża', 'użaw'],
            negatives: {
                imperfect1s: 'ma nużax',
                perfect3ms: 'ma użax',
                imperativeSg: 'tużax',
            },
        },
        {
            label: 'wera',
            input: {
                headword: 'wera',
                root: 'w-r-j',
                form: 'I',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'u-i',
                vowelSetImperative: 'u-i',
                isImalaBlocked: false,
            },
            imperfect: ['nuri', 'turi', 'juri', 'turi', 'nuru', 'turu', 'juru'],
            perfect: ['wrejt', 'wrejt', 'wera', 'wriet', 'wrejna', 'wrejtu', 'wrew'],
            imperative: ['uri', 'uru'],
            negatives: {
                imperfect1s: 'ma nurix',
                perfect3ms: 'ma weriex',
                imperativeSg: 'turix',
            },
        },
        {
            label: 'għala',
            input: {
                headword: 'għala',
                root: 'għ-l-j',
                form: 'I',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'i-i',
                vowelSetImperative: 'i-i',
                isImalaBlocked: false,
            },
            imperfect: ['nagħli', 'tagħli', 'jagħli', 'tagħli', 'nagħlu', 'tagħlu', 'jagħlu'],
            perfect: ['għalejt', 'għalejt', 'għala', 'għaliet', 'għalejna', 'għalejtu', 'għalew'],
            imperative: ['agħli', 'agħlu'],
            negatives: {
                imperfect1s: 'ma nagħlix',
                perfect3ms: 'ma għaliex',
                imperativeSg: 'tagħlix',
            },
        },
    ];

    formIDefectiveCases.forEach(({ label, input, imperfect, perfect, imperative, negatives }) => {
        const table = generateConjugation(input);

        assert.deepEqual(
            table.rows.map((row) => row.imperfect),
            imperfect,
            `${label} Form I defective imperfect rows should match VerbMT`,
        );
        assert.deepEqual(
            table.rows.map((row) => row.perfect),
            perfect,
            `${label} Form I defective perfect rows should match VerbMT`,
        );
        assert.deepEqual(
            [table.imperative_sg, table.imperative_pl],
            imperative,
            `${label} Form I defective imperative rows should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[0].imperfect, true, null, null, input.vowelSetImperfect, table.rows[0].stems, table.blocksImala || false, input.form),
            negatives.imperfect1s,
            `${label} negative imperfect 1s should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[2].perfect, table.rows[2].perfect_neg ?? table.rows[2].perfect, true, null, null, input.vowelSetPerfect, table.rows[2].stems, table.blocksImala || false, input.form),
            negatives.perfect3ms,
            `${label} negative perfect 3ms should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[1].imperfect, true, null, null, input.vowelSetImperfect, table.rows[1].stems, table.blocksImala || false, input.form).replace(/^ma /, ''),
            negatives.imperativeSg,
            `${label} negative imperative singular should match VerbMT`,
        );
    });

    const xewaRootForms = generateRootForms('x-w-j', 'e-a', 'i-i', 'weak', 'defective');
    assert.ok(
        xewaRootForms.some((form) => form.form === 'I' && form.perfect === 'xewa' && form.imperfect === 'jixwi' && form.imperative === 'ixwi'),
        'x-w-j root preview should model xewa as true Form I defective',
    );
    assert.ok(
        !xewaRootForms.some((form) => form.form === 'I' && form.perfect === 'xtewa'),
        'xtewa should not be modeled as Form I',
    );

    const uzaRootForms = generateRootForms('w-ż-j', 'u-a', 'i-a', 'weak', 'defective');
    assert.ok(
        uzaRootForms.some((form) => form.form === 'I' && form.perfect === 'uża' && form.imperfect === 'juża' && form.imperative === 'uża'),
        'w-ż-j root preview should model uża as true Form I defective',
    );

    const weraRootForms = generateRootForms('w-r-j', 'e-a', 'u-i', 'weak', 'defective');
    assert.ok(
        weraRootForms.some((form) => form.form === 'I' && form.perfect === 'wera' && form.imperfect === 'juri' && form.imperative === 'uri'),
        'w-r-j root preview should model wera as true Form I defective',
    );

    const nbeda = generateConjugation({
        root: 'b-d-j',
        form: 'VII',
        strength: 'weak',
        weakClass: 'defective',
        vowelSetPerfect: 'e-a',
        vowelSetImperfect: 'i-a',
        vowelSetImperative: 'i-a',
        isImalaBlocked: false,
    });

    assert.deepEqual(
        nbeda.rows.map((row) => row.imperfect),
        ['ninbeda', 'tinbeda', 'jinbeda', 'tinbeda', 'ninbdew', 'tinbdew', 'jinbdew'],
        'Form VII nbeda imperfect should follow the weak defective pattern',
    );
    assert.deepEqual(
        nbeda.rows.map((row) => row.perfect),
        ['nbdejt', 'nbdejt', 'nbeda', 'nbdiet', 'nbdejna', 'nbdejtu', 'nbdew'],
        'Form VII nbeda perfect should follow the weak defective pattern',
    );
    assert.equal(nbeda.imperative_sg, 'nbeda', 'Form VII nbeda singular imperative should be nbeda');
    assert.equal(nbeda.imperative_pl, 'nbdew', 'Form VII nbeda plural imperative should be nbdew');

    const formVIIDefectiveCases = [
        {
            label: 'nxela',
            input: {
                headword: 'nxela',
                root: 'x-l-j',
                form: 'VII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['ninxela', 'tinxela', 'jinxela', 'tinxela', 'ninxlew', 'tinxlew', 'jinxlew'],
            perfect: ['nxlejt', 'nxlejt', 'nxela', 'nxliet', 'nxlejna', 'nxlejtu', 'nxlew'],
            imperative: ['nxela', 'nxlew'],
            negatives: ['ma ninxeliex', 'ma nxeliex', 'tinxeliex'],
        },
        {
            label: 'nxewa',
            input: {
                headword: 'nxewa',
                root: 'x-w-j',
                form: 'VII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['ninxewa', 'tinxewa', 'jinxewa', 'tinxewa', 'ninxwew', 'tinxwew', 'jinxwew'],
            perfect: ['nxwejt', 'nxwejt', 'nxewa', 'nxwiet', 'nxwejna', 'nxwejtu', 'nxwew'],
            imperative: ['nxewa', 'nxwew'],
            negatives: ['ma ninxewiex', 'ma nxewiex', 'tinxewiex'],
        },
        {
            label: 'nxtara',
            input: {
                headword: 'nxtara',
                root: 'x-r-j',
                form: 'VII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['ninxtara', 'tinxtara', 'jinxtara', 'tinxtara', 'ninxtraw', 'tinxtraw', 'jinxtraw'],
            perfect: ['nxtrajt', 'nxtrajt', 'nxtara', 'nxtrat', 'nxtrajna', 'nxtrajtu', 'nxtraw'],
            imperative: ['nxtara', 'nxtraw'],
            negatives: ['ma ninxtarax', 'ma nxtarax', 'tinxtarax'],
        },
        {
            label: 'nxteha',
            input: {
                headword: 'nxteha',
                root: 'x-h-j',
                form: 'VII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['ninxteha', 'tinxteha', 'jinxteha', 'tinxteha', 'ninxthew', 'tinxthew', 'jinxthew'],
            perfect: ['nxthejt', 'nxthejt', 'nxteha', 'nxthiet', 'nxthejna', 'nxthejtu', 'nxthew'],
            imperative: ['nxteha', 'nxthew'],
            negatives: ['ma ninxtehiex', 'ma nxtehiex', 'tinxtehiex'],
        },
        {
            label: 'nxtewa',
            input: {
                headword: 'nxtewa',
                root: 'x-w-j',
                form: 'VII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['ninxtewa', 'tinxtewa', 'jinxtewa', 'tinxtewa', 'ninxtwew', 'tinxtwew', 'jinxtwew'],
            perfect: ['nxtwejt', 'nxtwejt', 'nxtewa', 'nxtwiet', 'nxtwejna', 'nxtwejtu', 'nxtwew'],
            imperative: ['nxtewa', 'nxtwew'],
            negatives: ['ma ninxtewiex', 'ma nxtewiex', 'tinxtewiex'],
        },
        {
            label: 'ntuża',
            input: {
                headword: 'ntuża',
                root: 'w-ż-j',
                form: 'VII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'u-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['nintuża', 'tintuża', 'jintuża', 'tintuża', 'nintużaw', 'tintużaw', 'jintużaw'],
            perfect: ['ntużajt', 'ntużajt', 'ntuża', 'ntużat', 'ntużajna', 'ntużajtu', 'ntużaw'],
            imperative: ['ntuża', 'ntużaw'],
            negatives: ['ma nintużax', 'ma ntużax', 'tintużax'],
        },
        {
            label: 'ntwera',
            input: {
                headword: 'ntwera',
                root: 'w-r-j',
                form: 'VII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['nintwera', 'tintwera', 'jintwera', 'tintwera', 'nintwerew', 'tintwerew', 'jintwerew'],
            perfect: ['ntwerejt', 'ntwerejt', 'ntwera', 'ntweriet', 'ntwerejna', 'ntwerejtu', 'ntwerew'],
            imperative: ['ntwera', 'ntwerew'],
            negatives: ['ma nintweriex', 'ma ntweriex', 'tintweriex'],
        },
        {
            label: 'ngħata',
            input: {
                headword: 'ngħata',
                root: 'għ-t-j',
                form: 'VII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'i-a',
                vowelSetImperative: 'i-a',
                isImalaBlocked: false,
            },
            imperfect: ['ningħata', 'tingħata', 'jingħata', 'tingħata', 'ningħataw', 'tingħataw', 'jingħataw'],
            perfect: ['ngħatajt', 'ngħatajt', 'ngħata', 'ngħatat', 'ngħatajna', 'ngħatajtu', 'ngħataw'],
            imperative: ['ngħata', 'ngħataw'],
            negatives: ['ma ningħatax', 'ma ngħatax', 'tingħatax'],
        },
    ];

    formVIIDefectiveCases.forEach(({ label, input, imperfect, perfect, imperative, negatives }) => {
        const table = generateConjugation(input);

        assert.deepEqual(
            table.rows.map((row) => row.imperfect),
            imperfect,
            `${label} Form VII defective imperfect rows should match VerbMT`,
        );
        assert.deepEqual(
            table.rows.map((row) => row.perfect),
            perfect,
            `${label} Form VII defective perfect rows should match VerbMT`,
        );
        assert.deepEqual(
            [table.imperative_sg, table.imperative_pl],
            imperative,
            `${label} Form VII defective imperative rows should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[0].imperfect, true, null, null, input.vowelSetImperfect, table.rows[0].stems, table.blocksImala || false, input.form),
            negatives[0],
            `${label} negative imperfect 1s should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[2].perfect, table.rows[2].perfect_neg ?? table.rows[2].perfect, true, null, null, input.vowelSetPerfect, table.rows[2].stems, table.blocksImala || false, input.form),
            negatives[1],
            `${label} negative perfect 3ms should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[1].imperfect, true, null, null, input.vowelSetImperfect, table.rows[1].stems, table.blocksImala || false, input.form).replace(/^ma /, ''),
            negatives[2],
            `${label} negative imperative singular should match VerbMT`,
        );
    });

    const formIHollowCases = [
        {
            label: 'ziek',
            input: {
                root: 'z-j-k',
                form: 'I',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'i--',
                vowelSetImperative: 'i--',
                isImalaBlocked: false,
            },
            imperfect: ['nzik', 'zzik', 'jzik', 'zzik', 'nziku', 'zziku', 'jziku'],
            perfect: ['zikt', 'zikt', 'ziek', 'zieket', 'zikna', 'ziktu', 'zieku'],
            imperative: ['zik', 'ziku'],
            negatives: {
                imperfect1s: 'ma nzikx',
                imperfect1p: 'ma nzikux',
                perfect3ms: 'ma ziekx',
                perfect3fs: 'ma zikitx',
                imperativeSg: 'zzikx',
            },
        },
        {
            label: 'żar',
            input: {
                root: 'ż-w-r',
                form: 'I',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'a--',
                vowelSetImperfect: 'u--',
                vowelSetImperative: 'u--',
                isImalaBlocked: false,
            },
            imperfect: ['nżur', 'żżur', 'jżur', 'żżur', 'nżuru', 'żżuru', 'jżuru'],
            perfect: ['żort', 'żort', 'żar', 'żaret', 'żorna', 'żortu', 'żaru'],
            imperative: ['żur', 'żuru'],
            negatives: {
                imperfect1s: 'ma nżurx',
                imperfect1p: 'ma nżurux',
                perfect3ms: 'ma żarx',
                perfect3fs: 'ma żaritx',
                imperativeSg: 'żżurx',
            },
        },
        {
            label: 'żied',
            input: {
                root: 'ż-j-d',
                form: 'I',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'i--',
                vowelSetImperative: 'i--',
                isImalaBlocked: false,
            },
            imperfect: ['nżid', 'żżid', 'jżid', 'żżid', 'nżidu', 'żżidu', 'jżidu'],
            perfect: ['żidt', 'żidt', 'żied', 'żiedet', 'żidna', 'żidtu', 'żiedu'],
            imperative: ['żid', 'żidu'],
            negatives: {
                imperfect1s: 'ma nżidx',
                imperfect1p: 'ma nżidux',
                perfect3ms: 'ma żiedx',
                perfect3fs: 'ma żiditx',
                imperativeSg: 'żżidx',
            },
        },
        {
            label: 'żief',
            input: {
                root: 'ż-j-f',
                form: 'I',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'i--',
                vowelSetImperative: 'i--',
                isImalaBlocked: false,
            },
            imperfect: ['nżif', 'żżif', 'jżif', 'żżif', 'nżifu', 'żżifu', 'jżifu'],
            perfect: ['żift', 'żift', 'żief', 'żiefet', 'żifna', 'żiftu', 'żiefu'],
            imperative: ['żif', 'żifu'],
            negatives: {
                imperfect1s: 'ma nżifx',
                imperfect1p: 'ma nżifux',
                perfect3ms: 'ma żiefx',
                perfect3fs: 'ma żifitx',
                imperativeSg: 'żżifx',
            },
        },
    ];

    formIHollowCases.forEach(({ label, input, imperfect, perfect, imperative, negatives }) => {
        const table = generateConjugation(input);

        assert.deepEqual(
            table.rows.map((row) => row.imperfect),
            imperfect,
            `${label} Form I hollow imperfect rows should match VerbMT`,
        );
        assert.deepEqual(
            table.rows.map((row) => row.perfect),
            perfect,
            `${label} Form I hollow perfect rows should match VerbMT`,
        );
        assert.deepEqual(
            [table.imperative_sg, table.imperative_pl],
            imperative,
            `${label} Form I hollow imperative rows should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[0].imperfect, true, null, null, input.vowelSetImperfect, table.rows[0].stems, table.blocksImala || false, input.form),
            negatives.imperfect1s,
            `${label} Form I hollow negative imperfect 1s should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[4].imperfect, true, null, null, input.vowelSetImperfect, table.rows[4].stems, table.blocksImala || false, input.form),
            negatives.imperfect1p,
            `${label} Form I hollow negative imperfect 1p should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[2].perfect, table.rows[2].perfect_neg ?? table.rows[2].perfect, true, null, null, input.vowelSetPerfect, table.rows[2].stems, table.blocksImala || false, input.form),
            negatives.perfect3ms,
            `${label} Form I hollow negative perfect 3ms should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[3].perfect, table.rows[3].perfect_neg ?? table.rows[3].perfect, true, null, null, input.vowelSetPerfect, table.rows[3].stems, table.blocksImala || false, input.form),
            negatives.perfect3fs,
            `${label} Form I hollow negative perfect 3fs should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[1].imperfect, true, null, null, input.vowelSetImperfect, table.rows[1].stems, table.blocksImala || false, input.form).replace(/^ma /, ''),
            negatives.imperativeSg,
            `${label} Form I hollow negative imperative singular should match VerbMT`,
        );
    });

    const formVIIHollowCases = [
        {
            label: 'nziek',
            input: {
                root: 'z-j-k',
                form: 'VII',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'ie--',
                vowelSetImperative: 'ie--',
                isImalaBlocked: false,
            },
            imperfect: ['nizziek', 'tizziek', 'jizziek', 'tizziek', 'nizzieku', 'tizzieku', 'jizzieku'],
            perfect: ['nzikt', 'nzikt', 'nziek', 'nzieket', 'nzikna', 'nziktu', 'nzieku'],
            imperative: ['nziek', 'nzieku'],
            negatives: {
                imperfect1s: 'ma nizziekx',
                imperfect1p: 'ma nizzikux',
                perfect3ms: 'ma nziekx',
                perfect3fs: 'ma nzikitx',
                imperativeSg: 'tizziekx',
            },
        },
        {
            label: 'nżar',
            input: {
                root: 'ż-w-r',
                form: 'VII',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'a--',
                vowelSetImperfect: 'a--',
                vowelSetImperative: 'a--',
                isImalaBlocked: false,
            },
            imperfect: ['ninżar', 'tinżar', 'jinżar', 'tinżar', 'ninżaru', 'tinżaru', 'jinżaru'],
            perfect: ['nżart', 'nżart', 'nżar', 'nżaret', 'nżarna', 'nżartu', 'nżaru'],
            imperative: ['nżar', 'nżaru'],
            negatives: {
                imperfect1s: 'ma ninżarx',
                imperfect1p: 'ma ninżarux',
                perfect3ms: 'ma nżarx',
                perfect3fs: 'ma nżaritx',
                imperativeSg: 'tinżarx',
            },
        },
        {
            label: 'nżied',
            input: {
                root: 'ż-j-d',
                form: 'VII',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'ie--',
                vowelSetImperative: 'ie--',
                isImalaBlocked: false,
            },
            imperfect: ['ninżied', 'tinżied', 'jinżied', 'tinżied', 'ninżiedu', 'tinżiedu', 'jinżiedu'],
            perfect: ['nżidt', 'nżidt', 'nżied', 'nżiedet', 'nżidna', 'nżidtu', 'nżiedu'],
            imperative: ['nżied', 'nżiedu'],
            negatives: {
                imperfect1s: 'ma ninżiedx',
                imperfect1p: 'ma ninżidux',
                perfect3ms: 'ma nżiedx',
                perfect3fs: 'ma nżiditx',
                imperativeSg: 'tinżiedx',
            },
        },
        {
            label: 'nżief',
            input: {
                root: 'ż-j-f',
                form: 'VII',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'ie--',
                vowelSetImperative: 'ie--',
                isImalaBlocked: false,
            },
            imperfect: ['ninżief', 'tinżief', 'jinżief', 'tinżief', 'ninżiefu', 'tinżiefu', 'jinżiefu'],
            perfect: ['nżift', 'nżift', 'nżief', 'nżiefet', 'nżifna', 'nżiftu', 'nżiefu'],
            imperative: ['nżief', 'nżiefu'],
            negatives: {
                imperfect1s: 'ma ninżiefx',
                imperfect1p: 'ma ninżifux',
                perfect3ms: 'ma nżiefx',
                perfect3fs: 'ma nżifitx',
                imperativeSg: 'tinżiefx',
            },
        },
    ];

    formVIIHollowCases.forEach(({ label, input, imperfect, perfect, imperative, negatives }) => {
        const table = generateConjugation(input);

        assert.deepEqual(
            table.rows.map((row) => row.imperfect),
            imperfect,
            `${label} Form VII hollow imperfect rows should match VerbMT`,
        );
        assert.deepEqual(
            table.rows.map((row) => row.perfect),
            perfect,
            `${label} Form VII hollow perfect rows should match VerbMT`,
        );
        assert.deepEqual(
            [table.imperative_sg, table.imperative_pl],
            imperative,
            `${label} Form VII hollow imperative rows should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[0].imperfect, true, null, null, input.vowelSetImperfect, table.rows[0].stems, table.blocksImala || false, input.form),
            negatives.imperfect1s,
            `${label} Form VII hollow negative imperfect 1s should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[4].imperfect, true, null, null, input.vowelSetImperfect, table.rows[4].stems, table.blocksImala || false, input.form),
            negatives.imperfect1p,
            `${label} Form VII hollow negative imperfect 1p should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[2].perfect, table.rows[2].perfect_neg ?? table.rows[2].perfect, true, null, null, input.vowelSetPerfect, table.rows[2].stems, table.blocksImala || false, input.form),
            negatives.perfect3ms,
            `${label} Form VII hollow negative perfect 3ms should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[3].perfect, table.rows[3].perfect_neg ?? table.rows[3].perfect, true, null, null, input.vowelSetPerfect, table.rows[3].stems, table.blocksImala || false, input.form),
            negatives.perfect3fs,
            `${label} Form VII hollow negative perfect 3fs should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[1].imperfect, true, null, null, input.vowelSetImperfect, table.rows[1].stems, table.blocksImala || false, input.form).replace(/^ma /, ''),
            negatives.imperativeSg,
            `${label} Form VII hollow negative imperative singular should match VerbMT`,
        );
    });

    const formVIIICases = [
        {
            label: 'stad',
            input: {
                headword: 'stad',
                root: 's-j-d',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: true,
            },
            imperfect: ['nistad', 'tistad', 'jistad', 'tistad', 'nistadu', 'tistadu', 'jistadu'],
            perfect: ['stadt', 'stadt', 'stad', 'stadet', 'stadna', 'stadtu', 'stadu'],
            imperative: ['stad', 'stadu'],
            negatives: {
                imperfect1s: 'ma nistadx',
                imperfect1p: 'ma nistadux',
                perfect3ms: 'ma stadx',
                perfect3fs: 'ma staditx',
                imperativeSg: 'tistadx',
            },
        },
        {
            label: 'egħtażel',
            input: {
                root: 'għ-ż-l',
                form: 'VIII',
                strength: 'strong',
                vowelSetPerfect: 'a-e',
                vowelSetImperfect: 'a-e',
                vowelSetImperative: 'a-e',
                isImalaBlocked: false,
            },
            imperfect: ['negħtażel', 'tegħtażel', 'jegħtażel', 'tegħtażel', 'negħtażlu', 'tegħtażlu', 'jegħtażlu'],
            perfect: ['egħtażilt', 'egħtażilt', 'egħtażel', 'egħtażlet', 'egħtażilna', 'egħtażiltu', 'egħtażlu'],
            imperative: ['egħtażel', 'egħtażlu'],
            negatives: {
                imperfect1s: 'ma negħtażilx',
                imperfect1p: 'ma negħtażlux',
                perfect3ms: 'ma egħtażilx',
                perfect3fs: 'ma egħtażlitx',
                imperativeSg: 'tegħtażilx',
            },
        },
        {
            label: 'ħtieġ',
            input: {
                headword: 'ħtieġ',
                root: 'ħ-w-ġ',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'ie--',
                vowelSetImperative: 'ie--',
                isImalaBlocked: false,
            },
            imperfect: ['neħtieġ', 'teħtieġ', 'jeħtieġ', 'teħtieġ', 'neħtieġu', 'teħtieġu', 'jeħtieġu'],
            perfect: ['ħtiġt', 'ħtiġt', 'ħtieġ', 'ħtieġet', 'ħtiġna', 'ħtiġtu', 'ħtieġu'],
            imperative: ['ħtieġ', 'ħtieġu'],
            negatives: {
                imperfect1s: 'ma neħtieġx',
                imperfect1p: 'ma neħtiġux',
                perfect3ms: 'ma ħtieġx',
                perfect3fs: 'ma ħtiġitx',
                imperativeSg: 'teħtieġx',
            },
        },
        {
            label: 'żdied',
            input: {
                headword: 'żdied',
                root: 'ż-j-d',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'ie--',
                vowelSetImperative: 'ie--',
                isImalaBlocked: false,
            },
            imperfect: ['niżdied', 'tiżdied', 'jiżdied', 'tiżdied', 'niżdiedu', 'tiżdiedu', 'jiżdiedu'],
            perfect: ['żdidt', 'żdidt', 'żdied', 'żdiedet', 'żdidna', 'żdidtu', 'żdiedu'],
            imperative: ['żdied', 'żdiedu'],
            negatives: {
                imperfect1s: 'ma niżdiedx',
                imperfect1p: 'ma niżdidux',
                perfect3ms: 'ma żdiedx',
                perfect3fs: 'ma żdiditx',
                imperativeSg: 'tiżdiedx',
            },
        },
        {
            label: 'rtefa’',
            input: {
                headword: 'rtefa’',
                root: 'r-f-għ',
                form: 'VIII',
                strength: 'strong-hybrid',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'e-a',
                vowelSetImperative: 'e-a',
                isImalaBlocked: false,
            },
            imperfect: ['nirtefa’', 'tirtefa’', 'jirtefa’', 'tirtefa’', 'nirtefgħu', 'tirtefgħu', 'jirtefgħu'],
            perfect: ['rtfajt', 'rtfajt', 'rtefa’', 'rtefgħet', 'rtfajna', 'rtfajtu', 'rtefgħu'],
            imperative: ['rtefa’', 'rtefgħu'],
            negatives: {
                imperfect1s: 'ma nirtefax',
                imperfect1p: 'ma nirtefgħux',
                perfect3ms: 'ma rtefax',
                perfect3fs: 'ma rtefgħetx',
                imperativeSg: 'tirtefax',
            },
        },
        {
            label: 'stema’',
            input: {
                headword: 'stema’',
                root: 's-m-għ',
                form: 'VIII',
                strength: 'strong-hybrid',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'e-a',
                vowelSetImperative: 'e-a',
                isImalaBlocked: false,
            },
            imperfect: ['nistema’', 'tistema’', 'jistema’', 'tistema’', 'nistemgħu', 'tistemgħu', 'jistemgħu'],
            perfect: ['stmajt', 'stmajt', 'stema’', 'stemgħet', 'stmajna', 'stmajtu', 'stemgħu'],
            imperative: ['stema’', 'stemgħu'],
            negatives: {
                imperfect1s: 'ma nistemax',
                imperfect1p: 'ma nistemgħux',
                perfect3ms: 'ma stemax',
                perfect3fs: 'ma stemgħetx',
                imperativeSg: 'tistemax',
            },
        },
        {
            label: 'xtara',
            input: {
                headword: 'xtara',
                root: 'x-r-j',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'i-i',
                vowelSetImperative: 'i-i',
                isImalaBlocked: false,
            },
            imperfect: ['nixtri', 'tixtri', 'jixtri', 'tixtri', 'nixtru', 'tixtru', 'jixtru'],
            perfect: ['xtrajt', 'xtrajt', 'xtara', 'xtrat', 'xtrajna', 'xtrajtu', 'xtraw'],
            imperative: ['ixtri', 'ixtru'],
            negatives: {
                imperfect1s: 'ma nixtrix',
                imperfect1p: 'ma nixtrux',
                perfect3ms: 'ma xtarax',
                perfect3fs: 'ma xtratx',
                imperativeSg: 'tixtrix',
            },
        },
        {
            label: 'xteha',
            input: {
                headword: 'xteha',
                root: 'x-h-j',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'i-i',
                vowelSetImperative: 'i-i',
                isImalaBlocked: false,
            },
            imperfect: ['nixthi', 'tixthi', 'jixthi', 'tixthi', 'nixthu', 'tixthu', 'jixthu'],
            perfect: ['xthejt', 'xthejt', 'xteha', 'xthiet', 'xthejna', 'xthejtu', 'xthew'],
            imperative: ['ixthi', 'ixthu'],
            negatives: {
                imperfect1s: 'ma nixthix',
                imperfect1p: 'ma nixthux',
                perfect3ms: 'ma xtehiex',
                perfect3fs: 'ma xthietx',
                imperativeSg: 'tixthix',
            },
        },
        {
            label: 'rtagħa',
            input: {
                headword: 'rtagħa',
                root: 'r-għ-j',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: true,
            },
            imperfect: ['nirtagħa', 'tirtagħa', 'jirtagħa', 'tirtagħa', 'nirtgħaw', 'tirtgħaw', 'jirtgħaw'],
            perfect: ['rtgħajt', 'rtgħajt', 'rtagħa', 'rtgħat', 'rtgħajna', 'rtgħajtu', 'rtgħaw'],
            imperative: ['rtagħa', 'rtgħaw'],
            negatives: {
                imperfect1s: 'ma nirtagħax',
                imperfect1p: 'ma nirtgħawx',
                perfect3ms: 'ma rtagħax',
                perfect3fs: 'ma rtgħatx',
                imperativeSg: 'tirtagħax',
            },
        },
        {
            label: 'xtewa',
            input: {
                headword: 'xtewa',
                root: 'x-w-j',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'e-a',
                vowelSetImperative: 'e-a',
                isImalaBlocked: false,
            },
            imperfect: ['nixtewa', 'tixtewa', 'jixtewa', 'tixtewa', 'nixtwew', 'tixtwew', 'jixtwew'],
            perfect: ['xtwejt', 'xtwejt', 'xtewa', 'xtwiet', 'xtwejna', 'xtwejtu', 'xtwew'],
            imperative: ['xtewa', 'xtwew'],
            negatives: {
                imperfect1s: 'ma nixtewiex',
                imperfect1p: 'ma nixtwewx',
                perfect3ms: 'ma xtewiex',
                perfect3fs: 'ma xtwietx',
                imperativeSg: 'tixtewiex',
            },
        },
        {
            label: 'ntesa',
            input: {
                headword: 'ntesa',
                root: 'n-s-j',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'e-a',
                vowelSetImperative: 'e-a',
                isImalaBlocked: false,
            },
            imperfect: ['nintesa', 'tintesa', 'jintesa', 'tintesa', 'nintesew', 'tintesew', 'jintesew'],
            perfect: ['ntesejt', 'ntesejt', 'ntesa', 'ntesiet', 'ntesejna', 'ntesejtu', 'ntesew'],
            imperative: ['ntesa', 'ntesew'],
            negatives: {
                imperfect1s: 'ma nintesiex',
                imperfect1p: 'ma nintesewx',
                perfect3ms: 'ma ntesiex',
                perfect3fs: 'ma ntesietx',
                imperativeSg: 'tintesiex',
            },
        },
        {
            label: 'xtedd',
            input: {
                headword: 'xtedd',
                root: 'x-d-d',
                form: 'VIII',
                strength: 'geminated',
                vowelSetPerfect: 'e-e',
                vowelSetImperfect: 'e-e',
                vowelSetImperative: 'e-e',
                isImalaBlocked: false,
            },
            imperfect: ['nixtedd', 'tixtedd', 'jixtedd', 'tixtedd', 'nixteddu', 'tixteddu', 'jixteddu'],
            perfect: ['xteddejt', 'xteddejt', 'xtedd', 'xteddet', 'xteddejna', 'xteddejtu', 'xteddew'],
            imperative: ['xtedd', 'xteddu'],
            negatives: {
                imperfect1s: 'ma nixteddx',
                imperfect1p: 'ma nixteddux',
                perfect3ms: 'ma xteddx',
                perfect3fs: 'ma xtedditx',
                imperativeSg: 'tixteddx',
            },
        },
        {
            label: 'rtadd',
            input: {
                headword: 'rtadd',
                root: 'r-d-d',
                form: 'VIII',
                strength: 'geminated',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: false,
            },
            imperfect: ['nirtadd', 'tirtadd', 'jirtadd', 'tirtadd', 'nirtaddu', 'tirtaddu', 'jirtaddu'],
            perfect: ['rtaddejt', 'rtaddejt', 'rtadd', 'rtaddet', 'rtaddejna', 'rtaddejtu', 'rtaddu'],
            imperative: ['rtadd', 'rtaddu'],
            negatives: {
                imperfect1s: 'ma nirtaddx',
                imperfect1p: 'ma nirtaddux',
                perfect3ms: 'ma rtaddx',
                perfect3fs: 'ma rtadditx',
                imperativeSg: 'tirtaddx',
            },
        },
    ];

    formVIIICases.forEach(({ label, input, imperfect, perfect, imperative, negatives }) => {
        const table = generateConjugation(input);

        assert.deepEqual(
            table.rows.map((row) => row.imperfect),
            imperfect,
            `${label} Form VIII imperfect rows should match VerbMT`,
        );
        assert.deepEqual(
            table.rows.map((row) => row.perfect),
            perfect,
            `${label} Form VIII perfect rows should match VerbMT`,
        );
        assert.deepEqual(
            [table.imperative_sg, table.imperative_pl],
            imperative,
            `${label} Form VIII imperative rows should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[0].imperfect, true, null, null, input.vowelSetImperfect, table.rows[0].stems, table.blocksImala || false, input.form),
            negatives.imperfect1s,
            `${label} Form VIII negative imperfect 1s should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[4].imperfect, true, null, null, input.vowelSetImperfect, table.rows[4].stems, table.blocksImala || false, input.form),
            negatives.imperfect1p,
            `${label} Form VIII negative imperfect 1p should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[2].perfect, table.rows[2].perfect_neg ?? table.rows[2].perfect, true, null, null, input.vowelSetPerfect, table.rows[2].stems, table.blocksImala || false, input.form),
            negatives.perfect3ms,
            `${label} Form VIII negative perfect 3ms should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[3].perfect, table.rows[3].perfect_neg ?? table.rows[3].perfect, true, null, null, input.vowelSetPerfect, table.rows[3].stems, table.blocksImala || false, input.form),
            negatives.perfect3fs,
            `${label} Form VIII negative perfect 3fs should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[1].imperfect, true, null, null, input.vowelSetImperfect, table.rows[1].stems, table.blocksImala || false, input.form).replace(/^ma /, ''),
            negatives.imperativeSg,
            `${label} Form VIII negative imperative singular should match VerbMT`,
        );
    });

    const formVIIIGeneralizedProfiles = [
        {
            label: 'strong-hybrid root profile',
            input: {
                root: 'r-f-għ',
                form: 'VIII',
                strength: 'strong-hybrid',
                vowelSetPerfect: 'e-a',
                vowelSetImperfect: 'e-a',
                vowelSetImperative: 'e-a',
                isImalaBlocked: false,
            },
            perfect3ms: "rtefa'",
            imperfect3ms: "jirtefa'",
            perfect3p: 'rtefgħu',
        },
        {
            label: 'hollow root profile',
            input: {
                root: 'ż-j-d',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'ie--',
                vowelSetImperfect: 'ie--',
                vowelSetImperative: 'ie--',
                isImalaBlocked: false,
            },
            perfect3ms: 'żdied',
            imperfect3ms: 'jiżdied',
            perfect3p: 'żdiedu',
        },
        {
            label: 'defective root profile',
            input: {
                root: 'x-r-j',
                form: 'VIII',
                strength: 'weak',
                weakClass: 'defective',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'i-i',
                vowelSetImperative: 'i-i',
                isImalaBlocked: false,
            },
            perfect3ms: 'xtara',
            imperfect3ms: 'jixtri',
            perfect3p: 'xtraw',
        },
        {
            label: 'geminated root profile',
            input: {
                root: 'x-d-d',
                form: 'VIII',
                strength: 'geminated',
                vowelSetPerfect: 'e-e',
                vowelSetImperfect: 'e-e',
                vowelSetImperative: 'e-e',
                isImalaBlocked: false,
            },
            perfect3ms: 'xtedd',
            imperfect3ms: 'jixtedd',
            perfect3p: 'xteddew',
        },
    ];

    formVIIIGeneralizedProfiles.forEach(({ label, input, perfect3ms, imperfect3ms, perfect3p }) => {
        const table = generateConjugation(input);
        assert.equal(table.rows[2].perfect, perfect3ms, `Form VIII ${label} should derive 3ms perfect without citation`);
        assert.equal(table.rows[2].imperfect, imperfect3ms, `Form VIII ${label} should derive 3ms imperfect without citation`);
        assert.equal(table.rows[6].perfect, perfect3p, `Form VIII ${label} should derive 3p perfect without citation`);
    });

    const ghtazelRootForms = generateRootForms('għ-ż-l', 'a-e', 'a-e', 'strong', '');
    assert.ok(
        ghtazelRootForms.some((form) => form.form === 'VIII' && form.perfect === 'egħtażel' && form.imperfect === 'jegħtażel' && form.imperative === 'egħtażel'),
        'Form VIII pharyngeal C1 root preview should prefix e- for egħtażel, not *għtażel',
    );

    const higherFormGeminatedCases = [
        {
            label: 'tqarar',
            input: {
                root: 'q-r-r',
                form: 'VI',
                strength: 'geminated',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: false,
            },
            imperfect: ['nitqarar', 'titqarar', 'jitqarar', 'titqarar', 'nitqarru', 'titqarru', 'jitqarru'],
            perfect: ['tqarart', 'tqarart', 'tqarar', 'tqarret', 'tqararna', 'tqarartu', 'tqarru'],
            imperative: ['tqarar', 'tqarru'],
            negatives: {
                imperfect1s: 'ma nitqararx',
                imperfect1p: 'ma nitqarrux',
                perfect3ms: 'ma tqararx',
                perfect3fs: 'ma tqarritx',
                imperativeSg: 'titqararx',
            },
        },
        {
            label: 'nżamm',
            input: {
                root: 'ż-m-m',
                form: 'VII',
                strength: 'geminated',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: false,
            },
            imperfect: ['ninżamm', 'tinżamm', 'jinżamm', 'tinżamm', 'ninżammu', 'tinżammu', 'jinżammu'],
            perfect: ['nżammejt', 'nżammejt', 'nżamm', 'nżammet', 'nżammejna', 'nżammejtu', 'nżammew'],
            imperative: ['nżamm', 'nżammu'],
            negatives: {
                imperfect1s: 'ma ninżammx',
                imperfect1p: 'ma ninżammux',
                perfect3ms: 'ma nżammx',
                perfect3fs: 'ma nżammitx',
                imperativeSg: 'tinżammx',
            },
        },
        {
            label: 'nxekk',
            input: {
                root: 'x-k-k',
                form: 'VII',
                strength: 'geminated',
                vowelSetPerfect: 'e-e',
                vowelSetImperfect: 'e-e',
                vowelSetImperative: 'e-e',
                isImalaBlocked: false,
            },
            imperfect: ['ninxekk', 'tinxekk', 'jinxekk', 'tinxekk', 'ninxekku', 'tinxekku', 'jinxekku'],
            perfect: ['nxekkejt', 'nxekkejt', 'nxekk', 'nxekket', 'nxekkejna', 'nxekkejtu', 'nxekku'],
            imperative: ['nxekk', 'nxekku'],
            negatives: {
                imperfect1s: 'ma ninxekkx',
                imperfect1p: 'ma ninxekkux',
                perfect3ms: 'ma nxekkx',
                perfect3fs: 'ma nxekkitx',
                imperativeSg: 'tinxekkx',
            },
        },
        {
            label: 'rqaq',
            input: {
                root: 'r-q-q',
                form: 'IX',
                strength: 'geminated',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: false,
            },
            imperfect: ['nirqaq', 'tirqaq', 'jirqaq', 'tirqaq', 'nirqaqu', 'tirqaqu', 'jirqaqu'],
            perfect: ['rqaqt', 'rqaqt', 'rqaq', 'rqaqet', 'rqaqna', 'rqaqtu', 'rqaqu'],
            imperative: ['rqaq', 'rqaqu'],
            negatives: {
                imperfect1s: 'ma nirqaqx',
                imperfect1p: 'ma nirqaqux',
                perfect3ms: 'ma rqaqx',
                perfect3fs: 'ma rqaqitx',
                imperativeSg: 'tirqaqx',
            },
        },
        {
            label: 'ħfief',
            input: {
                root: 'ħ-f-f',
                form: 'IX',
                strength: 'geminated',
                vowelSetPerfect: 'ie-e',
                vowelSetImperfect: 'ie-e',
                vowelSetImperative: 'ie-e',
                isImalaBlocked: false,
            },
            imperfect: ['niħfief', 'tiħfief', 'jiħfief', 'tiħfief', 'niħfiefu', 'tiħfiefu', 'jiħfiefu'],
            perfect: ['ħfift', 'ħfift', 'ħfief', 'ħfiefet', 'ħfifna', 'ħfiftu', 'ħfiefu'],
            imperative: ['ħfief', 'ħfiefu'],
            negatives: {
                imperfect1s: 'ma niħfiefx',
                imperfect1p: 'ma niħfifux',
                perfect3ms: 'ma ħfiefx',
                perfect3fs: 'ma ħfifitx',
                imperativeSg: 'tiħfiefx',
            },
        },
        {
            label: 'qliel',
            input: {
                root: 'q-l-l',
                form: 'IX',
                strength: 'geminated',
                vowelSetPerfect: 'ie-e',
                vowelSetImperfect: 'ie-e',
                vowelSetImperative: 'ie-e',
                isImalaBlocked: false,
            },
            imperfect: ['niqliel', 'tiqliel', 'jiqliel', 'tiqliel', 'niqlielu', 'tiqlielu', 'jiqlielu'],
            perfect: ['qlilt', 'qlilt', 'qliel', 'qlielet', 'qlilna', 'qliltu', 'qlielu'],
            imperative: ['qliel', 'qlielu'],
            negatives: {
                imperfect1s: 'ma niqlielx',
                imperfect1p: 'ma niqlilux',
                perfect3ms: 'ma qlielx',
                perfect3fs: 'ma qlilitx',
                imperativeSg: 'tiqlielx',
            },
        },
    ];

    higherFormGeminatedCases.forEach(({ label, input, imperfect, perfect, imperative, negatives }) => {
        const table = generateConjugation(input);

        assert.deepEqual(
            table.rows.map((row) => row.imperfect),
            imperfect,
            `${label} higher-form geminated imperfect rows should match VerbMT`,
        );
        assert.deepEqual(
            table.rows.map((row) => row.perfect),
            perfect,
            `${label} higher-form geminated perfect rows should match VerbMT`,
        );
        assert.deepEqual(
            [table.imperative_sg, table.imperative_pl],
            imperative,
            `${label} higher-form geminated imperative rows should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[0].imperfect, true, null, null, input.vowelSetImperfect, table.rows[0].stems, table.blocksImala || false, input.form),
            negatives.imperfect1s,
            `${label} higher-form geminated negative imperfect 1s should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[4].imperfect, true, null, null, input.vowelSetImperfect, table.rows[4].stems, table.blocksImala || false, input.form),
            negatives.imperfect1p,
            `${label} higher-form geminated negative imperfect 1p should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[2].perfect, table.rows[2].perfect_neg ?? table.rows[2].perfect, true, null, null, input.vowelSetPerfect, table.rows[2].stems, table.blocksImala || false, input.form),
            negatives.perfect3ms,
            `${label} higher-form geminated negative perfect 3ms should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[3].perfect, table.rows[3].perfect_neg ?? table.rows[3].perfect, true, null, null, input.vowelSetPerfect, table.rows[3].stems, table.blocksImala || false, input.form),
            negatives.perfect3fs,
            `${label} higher-form geminated negative perfect 3fs should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[1].imperfect, true, null, null, input.vowelSetImperfect, table.rows[1].stems, table.blocksImala || false, input.form).replace(/^ma /, ''),
            negatives.imperativeSg,
            `${label} higher-form geminated negative imperative singular should match VerbMT`,
        );
    });

    const formXaWeakCases = [
        {
            label: 'stgħan',
            input: {
                root: 'għ-w-n',
                form: 'Xa',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: false,
            },
            imperfect: ['nistgħan', 'tistgħan', 'jistgħan', 'tistgħan', 'nistgħanu', 'tistgħanu', 'jistgħanu'],
            perfect: ['stgħant', 'stgħant', 'stgħan', 'stgħanet', 'stgħanna', 'stgħantu', 'stgħanu'],
            imperative: ['stgħan', 'stgħanu'],
            negatives: {
                imperfect1s: 'ma nistgħanx',
                imperfect1p: 'ma nistgħanux',
                perfect3ms: 'ma stgħanx',
                perfect3fs: 'ma stgħanitx',
                imperativeSg: 'tistgħanx',
            },
        },
        {
            label: 'stgħar',
            input: {
                root: 'għ-w-r',
                form: 'Xa',
                strength: 'weak',
                weakClass: 'hollow',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: false,
            },
            imperfect: ['nistgħar', 'tistgħar', 'jistgħar', 'tistgħar', 'nistgħaru', 'tistgħaru', 'jistgħaru'],
            perfect: ['stgħart', 'stgħart', 'stgħar', 'stgħaret', 'stgħarna', 'stgħartu', 'stgħaru'],
            imperative: ['stgħar', 'stgħaru'],
            negatives: {
                imperfect1s: 'ma nistgħarx',
                imperfect1p: 'ma nistgħarux',
                perfect3ms: 'ma stgħarx',
                perfect3fs: 'ma stgħaritx',
                imperativeSg: 'tistgħarx',
            },
        },
        {
            label: 'stejqer',
            input: {
                root: 'j-q-r',
                form: 'Xa',
                strength: 'weak',
                weakClass: 'assimilative',
                vowelSetPerfect: 'e-e',
                vowelSetImperfect: 'e-e',
                vowelSetImperative: 'e-e',
                isImalaBlocked: false,
            },
            imperfect: ['nistejqer', 'tistejqer', 'jistejqer', 'tistejqer', 'nistejqru', 'tistejqru', 'jistejqru'],
            perfect: ['stejqirt', 'stejqirt', 'stejqer', 'stejqret', 'stejqirna', 'stejqirtu', 'stejqru'],
            imperative: ['stejqer', 'stejqru'],
            negatives: {
                imperfect1s: 'ma nistejqirx',
                imperfect1p: 'ma nistejqrux',
                perfect3ms: 'ma stejqirx',
                perfect3fs: 'ma stejqritx',
                imperativeSg: 'tistejqirx',
            },
        },
    ];

    formXaWeakCases.forEach(({ label, input, imperfect, perfect, imperative, negatives }) => {
        const table = generateConjugation(input);

        assert.deepEqual(
            table.rows.map((row) => row.imperfect),
            imperfect,
            `${label} Form Xa weak imperfect rows should match VerbMT`,
        );
        assert.deepEqual(
            table.rows.map((row) => row.perfect),
            perfect,
            `${label} Form Xa weak perfect rows should match VerbMT`,
        );
        assert.deepEqual(
            [table.imperative_sg, table.imperative_pl],
            imperative,
            `${label} Form Xa weak imperative rows should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[0].imperfect, true, null, null, input.vowelSetImperfect, table.rows[0].stems, table.blocksImala || false, input.form),
            negatives.imperfect1s,
            `${label} Form Xa weak negative imperfect 1s should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[4].imperfect, true, null, null, input.vowelSetImperfect, table.rows[4].stems, table.blocksImala || false, input.form),
            negatives.imperfect1p,
            `${label} Form Xa weak negative imperfect 1p should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[2].perfect, table.rows[2].perfect_neg ?? table.rows[2].perfect, true, null, null, input.vowelSetPerfect, table.rows[2].stems, table.blocksImala || false, input.form),
            negatives.perfect3ms,
            `${label} Form Xa weak negative perfect 3ms should match VerbMT`,
        );
        assert.equal(
            buildPerfectForm(table.rows[3].perfect, table.rows[3].perfect_neg ?? table.rows[3].perfect, true, null, null, input.vowelSetPerfect, table.rows[3].stems, table.blocksImala || false, input.form),
            negatives.perfect3fs,
            `${label} Form Xa weak negative perfect 3fs should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[1].imperfect, true, null, null, input.vowelSetImperfect, table.rows[1].stems, table.blocksImala || false, input.form).replace(/^ma /, ''),
            negatives.imperativeSg,
            `${label} Form Xa weak negative imperative singular should match VerbMT`,
        );
    });

    const bies = generateConjugation({
        root: 'b-w-s',
        form: 'I',
        strength: 'weak',
        weakClass: 'hollow',
        vowelSetPerfect: 'ie--',
        vowelSetImperfect: 'u--',
        vowelSetImperative: 'u--',
        isImalaBlocked: false,
    });

    assert.equal(bies.rows[0].perfect, 'bist', 'bies 1s perfect should match the verb.mt hollow model');
    assert.equal(bies.rows[4].perfect, 'bisna', 'bies 1p perfect should match the verb.mt hollow model');

    const bbies = generateConjugation({
        root: 'b-w-s',
        form: 'II',
        strength: 'weak',
        weakClass: 'hollow',
        vowelSetPerfect: 'ie--',
        vowelSetImperfect: 'i-ie',
        vowelSetImperative: 'i-ie',
        isImalaBlocked: false,
    });

    assert.equal(bbies.rows[2].perfect, 'bbies', 'Form II hollow b-w-s should produce bbies');
    assert.equal(bbies.rows[2].imperfect, 'jibbies', 'bbies 3ms imperfect should match the attested form');
    assert.equal(bbies.rows[4].imperfect, 'nibbiesu', 'bbies 1p imperfect should match the attested form');

    const unblockedAARootInput = resolveVerbGenerationInput({
        headword: 'waqaf',
        root_pattern_form: {
            root: {
                consonants: 'w-q-f',
                vowel_set_perf: 'a-a',
                vowel_set_impf: 'ie-a',
                vowel_set_imp: 'ie-a',
                is_imala_blocked: false,
            },
        },
        verb_morphology: {
            form: 'I',
            class: 'weak',
            weak_class: 'assimilative',
            vowel_set_perf: 'a-a',
            vowel_set_impf: 'ie-a',
            vowel_set_impv: 'ie-a',
        },
    });
    assert.equal(unblockedAARootInput.isImalaBlocked, false, 'explicit root is_imala_blocked=false should override automatic a-a/q inference');

    const verbSpecificImalaInput = resolveVerbGenerationInput({
        headword: 'qara',
        root_pattern_form: {
            root: {
                consonants: 'q-r-a',
                vowel_set_perf: 'a-a',
                vowel_set_impf: 'a-a',
                vowel_set_imp: 'a-a',
                is_imala_blocked: false,
            },
        },
        verb_morphology: {
            form: 'I',
            class: 'weak',
            weak_class: 'defective',
            vowel_set_perf: 'a-a',
            vowel_set_impf: 'a-a',
            vowel_set_impv: 'a-a',
            is_imala_blocked: true,
        },
    });
    assert.equal(verbSpecificImalaInput.isImalaBlocked, true, 'entry-specific verb imala override should take precedence over root imala');

    const geminatedFormIII = generateConjugation({
        root: 'd-l-l',
        form: 'III',
        strength: 'geminated',
        vowelSetPerfect: 'ie-a',
        vowelSetImperfect: 'ie-a',
        vowelSetImperative: 'ie-a',
        isImalaBlocked: false,
    });

    assert.equal(geminatedFormIII.rows[2].perfect, 'dielal', 'geminated Form III should route to the Form III conjugation table');
    assert.equal(geminatedFormIII.rows[2].imperfect, 'jdielal', 'geminated Form III should expose a 3ms imperfect');

    const biedaFromStaleFormIIIInput = generateConjugation({
        root: 'b-d-w',
        form: 'III',
        strength: 'weak',
        weakClass: 'assimilative',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'i-a',
        vowelSetImperative: 'o-o',
        isImalaBlocked: true,
    });

    assert.deepEqual(
        biedaFromStaleFormIIIInput.rows.map((row) => [row.person_mt, row.imperfect, row.perfect]),
        [
            ['1s', 'nbiedi', 'bedejt'],
            ['2s', 'tbiedi', 'bedejt'],
            ['3ms', 'jbiedi', 'bieda'],
            ['3fs', 'tbiedi', 'bediet'],
            ['1p', 'nbiedu', 'bedejna'],
            ['2p', 'tbiedu', 'bedejtu'],
            ['3p', 'jbiedu', 'bedew'],
        ],
        'Form III final-w defective verbs should not follow stale assimilative/generic vowel-set inputs'
    );
    assert.equal(biedaFromStaleFormIIIInput.imperative_sg, 'biedi', 'bieda imperative singular should match the Form III defective model');
    assert.equal(biedaFromStaleFormIIIInput.imperative_pl, 'biedu', 'bieda imperative plural should match the Form III defective model');

    const staleStoredBiedaEntry = {
        headword: 'bieda',
        root_consonants: 'b-d-w',
        verb_morphology: {
            form: 'III',
            class: 'weak',
            weak_class: 'assimilative',
            vowel_set_perf: 'a-a',
            vowel_set_impf: 'i-a',
            vowel_set_impv: 'o-o',
        },
    };
    const engineBuiltBieda = buildVerbConjugationFromEngine(staleStoredBiedaEntry, staleStoredBiedaEntry.verb_morphology);
    assert.equal(engineBuiltBieda.rows[2].perfect, 'bieda', 'entry generation should harden stale Form III final-w metadata to the defective model');
    assert.equal(engineBuiltBieda.rows[2].imperfect, 'jbiedi', 'entry generation should show the truth-model Form III final-w imperfect');

    const qietaHybrid = generateConjugation({
        root: 'q-t-għ',
        form: 'III',
        strength: 'strong-hybrid',
        vowelSetPerfect: 'ie-a',
        vowelSetImperfect: 'ie-a',
        vowelSetImperative: 'ie-a',
        isImalaBlocked: true,
    });

    assert.equal(qietaHybrid.rows[0].perfect, 'qietajt', "Form III strong-hybrid 1s perfect should mirror the hybrid stem pattern");
    assert.equal(qietaHybrid.rows[0].imperfect, "nqieta'", "Form III strong-hybrid 1s imperfect should preserve the apostrophe");
    assert.equal(qietaHybrid.rows[2].perfect, "qieta'", "Form III strong-hybrid 3ms perfect should preserve the apostrophe");
    assert.equal(qietaHybrid.rows[2].imperfect, "jqieta'", "Form III strong-hybrid 3ms imperfect should preserve the apostrophe");
    assert.equal(qietaHybrid.rows[3].perfect, 'qietgħet', "Form III strong-hybrid 3fs perfect should keep the għ suffixal shape");
    assert.equal(qietaHybrid.rows[4].perfect, 'qietajna', "Form III strong-hybrid 1p perfect should use the hybrid stem");
    assert.equal(qietaHybrid.rows[5].perfect, 'qietajtu', "Form III strong-hybrid 2p perfect should use the hybrid stem");
    assert.equal(qietaHybrid.rows[6].perfect, 'qietgħu', "Form III strong-hybrid 3p perfect should use the plural għu ending");
    assert.equal(qietaHybrid.imperative_sg, "qieta'", "Form III strong-hybrid singular imperative should preserve the apostrophe");
    assert.equal(qietaHybrid.imperative_pl, 'qietgħu', "Form III strong-hybrid plural imperative should use the plural għu ending");

    const rabba = generateConjugation({
        root: 'r-b-għ',
        form: 'II',
        strength: 'weak',
        weakClass: 'defective',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'a-i',
        vowelSetImperative: 'a-i',
        isImalaBlocked: true,
    });

    assert.equal(rabba.rows[0].perfect, 'rabbejt', "Form II final-weak 1s perfect should use the defective stem");
    assert.equal(rabba.rows[2].perfect, 'rabba', "Form II final-weak 3ms perfect should keep the lemma form");
    assert.equal(rabba.rows[2].imperfect, 'jrabbi', "Form II final-weak 3ms imperfect should not use the strong C3 ending");
    assert.equal(rabba.imperative_sg, 'rabbi', "Form II final-weak imperative should use the defective stem");

    const rabbaHybrid = generateConjugation({
        root: 'r-b-għ',
        form: 'II',
        strength: 'strong-hybrid',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'a-a',
        vowelSetImperative: 'a-a',
        isImalaBlocked: true,
    });

    assert.equal(rabbaHybrid.rows[0].perfect, 'rabbajt', "Form II strong-hybrid 1s perfect should match the reference table");
    assert.equal(rabbaHybrid.rows[0].imperfect, "nrabba'", "Form II strong-hybrid 1s imperfect should preserve the final apostrophe");
    assert.equal(rabbaHybrid.rows[1].perfect, 'rabbajt', "Form II strong-hybrid 2s perfect should match the reference table");
    assert.equal(rabbaHybrid.rows[2].perfect, "rabba'", "Form II strong-hybrid 3ms perfect should preserve the lemma apostrophe");
    assert.equal(rabbaHybrid.rows[2].imperfect, "jrabba'", "Form II strong-hybrid 3ms imperfect should preserve the final apostrophe");
    assert.equal(rabbaHybrid.rows[3].perfect, 'rabbgħet', "Form II strong-hybrid 3fs perfect should keep the għ sequence");
    assert.equal(rabbaHybrid.rows[4].imperfect, "nrabbgħu", "Form II strong-hybrid 1p imperfect should use the plural għu ending");
    assert.equal(rabbaHybrid.rows[5].imperfect, "trabbgħu", "Form II strong-hybrid 2p imperfect should use the plural għu ending");
    assert.equal(rabbaHybrid.rows[6].imperfect, "jrabbgħu", "Form II strong-hybrid 3p imperfect should use the plural għu ending");
    assert.equal(rabbaHybrid.imperative_sg, "rabba'", "Form II strong-hybrid singular imperative should preserve the apostrophe");
    assert.equal(rabbaHybrid.imperative_pl, "rabbgħu", "Form II strong-hybrid plural imperative should use the plural għu ending");

    const manualStrongRabbaEntry = {
        headword: "rabba'",
        root_pattern_form: {
            root: {
                consonants: 'r-b-għ',
                strength: 'strong',
            },
        },
        verb_morphology: {
            form: 'II',
            class: 'strong',
            weak_class: 'defective',
            vowel_set_perf: 'a-a',
            vowel_set_impf: 'a-a',
            vowel_set_impv: 'a-a',
        },
    };
    const manualStrongRabbaInput = resolveVerbGenerationInput(manualStrongRabbaEntry, manualStrongRabbaEntry.verb_morphology);
    assert.equal(manualStrongRabbaInput.strength, 'strong', 'manual Form II final-għ strong class should not be overridden by final-weak inference');
    assert.equal(manualStrongRabbaInput.weakClass, undefined, 'manual non-weak class should not leak stale weak class metadata');

    const manualHybridRabbaEntry = {
        ...manualStrongRabbaEntry,
        verb_morphology: {
            ...manualStrongRabbaEntry.verb_morphology,
            class: 'strong-hybrid',
        },
    };
    const manualHybridRabbaInput = resolveVerbGenerationInput(manualHybridRabbaEntry, manualHybridRabbaEntry.verb_morphology);
    assert.equal(manualHybridRabbaInput.strength, 'strong-hybrid', 'manual Form II final-għ strong-hybrid class should not be overridden by final-weak inference');
    assert.equal(manualHybridRabbaInput.weakClass, undefined, 'manual strong-hybrid class should not leak stale weak class metadata');

    const staleStoredRabbaEntry = {
        headword: "rabba'",
        root_pattern_form: {
            root: {
                consonants: 'r-b-għ',
                strength: 'strong',
            },
        },
        verb_morphology: {
            form: 'II',
            vowel_set_perf: 'a-a',
            vowel_set_impf: 'a-i',
            vowel_set_impv: 'a-i',
            conjugation: {
                rows: [{ person_mt: '3ms', perfect: 'rabbagħ', imperfect: 'jribbagħ' }],
                imperative_sg: 'robbogħ',
            },
        },
    };
    const staleResolvedInput = resolveVerbGenerationInput(staleStoredRabbaEntry, staleStoredRabbaEntry.verb_morphology);
    assert.equal(staleResolvedInput.strength, 'strong-hybrid', 'blank legacy entry generation input should now infer Form II strong-hybrid strength');
    assert.equal(staleResolvedInput.weakClass, undefined, 'Form II strong-hybrid inference should not invent a weak class');
    const engineBuiltRabba = buildVerbConjugationFromEngine(staleStoredRabbaEntry, staleStoredRabbaEntry.verb_morphology);
    assert.equal(engineBuiltRabba.rows[2].perfect, "rabba'", 'entry generation should use conjugationEngine output over stale stored tables');
    assert.equal(engineBuiltRabba.imperative_sg, "rabba'", 'entry generation should not keep stale stored imperative forms');

    const qietaEntry = {
        headword: "qieta'",
        root_consonants: 'q-t-għ',
        verb_morphology: {
            form: 'III',
            vowel_set_perf: 'ie-a',
            vowel_set_impf: 'ie-a',
            vowel_set_impv: 'ie-a',
        },
    };
    const qietaResolvedInput = resolveVerbGenerationInput(qietaEntry, qietaEntry.verb_morphology);
    assert.equal(qietaResolvedInput.strength, 'strong-hybrid', 'blank Form III final-għ apostrophe input should resolve as strong-hybrid');
    assert.equal(qietaResolvedInput.weakClass, undefined, 'blank Form III strong-hybrid inference should not invent a weak class');
    const engineBuiltQieta = buildVerbConjugationFromEngine(qietaEntry, qietaEntry.verb_morphology);
    assert.equal(engineBuiltQieta.rows[2].perfect, "qieta'", 'Form III strong-hybrid engine output should preserve the apostrophe in the 3ms perfect');
    assert.equal(engineBuiltQieta.rows[2].imperfect, "jqieta'", 'Form III strong-hybrid engine output should preserve the apostrophe in the 3ms imperfect');
    assert.equal(engineBuiltQieta.imperative_sg, "qieta'", 'Form III strong-hybrid engine output should preserve the apostrophe in the imperative');

    const refaEntry = {
        headword: "refa'",
        root_consonants: 'r-f-għ',
        verb_morphology: {
            form: 'I',
            vowel_set_perf: 'e-a',
            vowel_set_impf: 'e-a',
            vowel_set_impv: 'i-a',
        },
    };
    const refaResolvedInput = resolveVerbGenerationInput(refaEntry, refaEntry.verb_morphology);
    assert.equal(refaResolvedInput.strength, 'strong-hybrid', "Blank Form I final-għ entries ending in apostrophe should resolve as strong-hybrid");
    const engineBuiltRefa = buildVerbConjugationFromEngine(refaEntry, refaEntry.verb_morphology);
    assert.equal(engineBuiltRefa.rows[0].perfect, 'rfajt', "refa' 1s perfect should use the final-għ hybrid stem");
    assert.equal(engineBuiltRefa.rows[2].perfect, "refa'", "refa' should keep the visible final apostrophe in the 3ms perfect");
    assert.equal(engineBuiltRefa.rows[3].perfect, 'refgħet', "refa' 3fs perfect should restore għ before the suffix");
    assert.equal(engineBuiltRefa.rows[6].perfect, 'refgħu', "refa' 3p perfect should restore għ before the suffix");
    assert.equal(engineBuiltRefa.imperative_sg, "irfa'", "refa' imperative should use the strong-hybrid final-għ model");

    const formVIIRefa = generateConjugation({
        root: 'r-f-għ',
        form: 'VII',
        strength: 'strong-hybrid',
        vowelSetPerfect: 'e-a',
        vowelSetImperfect: 'e-a',
        vowelSetImperative: 'i-a',
        isImalaBlocked: true,
    });

    assert.equal(formVIIRefa.rows[2].perfect, "nrefa'", "Form VII strong-hybrid should keep the visible apostrophe in the 3ms perfect");
    assert.equal(formVIIRefa.rows[3].perfect, 'nrefgħet', 'Form VII strong-hybrid should restore għ before the 3fs suffix');
    assert.equal(formVIIRefa.rows[6].perfect, 'nrefgħu', 'Form VII strong-hybrid should restore għ before the 3p suffix');

    const formVIIAssimilativeCases = [
        {
            label: 'ntiret',
            input: {
                root: 'w-r-t',
                form: 'VII',
                strength: 'weak',
                weakClass: 'assimilative',
                vowelSetPerfect: 'i-e',
                vowelSetImperfect: 'i-e',
                vowelSetImperative: 'i-e',
                isImalaBlocked: false,
            },
            imperfect: ['nintiret', 'tintiret', 'jintiret', 'tintiret', 'nintirtu', 'tintirtu', 'jintirtu'],
            perfect: ['ntritt', 'ntritt', 'ntiret', 'ntirtet', 'ntritna', 'ntrittu', 'ntirtu'],
            imperative: ['ntiret', 'ntirtu'],
            negatives: {
                imperfect1s: 'ma nintiritx',
                imperfect1p: 'ma nintirtux',
                perfect3ms: 'ma ntiritx',
                imperativeSg: 'tintiritx',
            },
        },
        {
            label: 'ntiżen',
            input: {
                root: 'w-ż-n',
                form: 'VII',
                strength: 'weak',
                weakClass: 'assimilative',
                vowelSetPerfect: 'i-e',
                vowelSetImperfect: 'i-e',
                vowelSetImperative: 'i-e',
                isImalaBlocked: false,
            },
            imperfect: ['nintiżen', 'tintiżen', 'jintiżen', 'tintiżen', 'nintiżnu', 'tintiżnu', 'jintiżnu'],
            perfect: ['ntiżint', 'ntiżint', 'ntiżen', 'ntiżnet', 'ntiżinna', 'ntiżintu', 'ntiżnu'],
            imperative: ['ntiżen', 'ntiżnu'],
            negatives: {
                imperfect1s: 'ma nintiżinx',
                imperfect1p: 'ma nintiżnux',
                perfect3ms: 'ma ntiżinx',
                imperativeSg: 'tintiżinx',
            },
        },
        {
            label: 'ntwaddab',
            input: {
                root: 'w-d-b',
                form: 'VII',
                strength: 'weak',
                weakClass: 'assimilative',
                vowelSetPerfect: 'a-a',
                vowelSetImperfect: 'a-a',
                vowelSetImperative: 'a-a',
                isImalaBlocked: false,
            },
            imperfect: ['nintwaddab', 'tintwaddab', 'jintwaddab', 'tintwaddab', 'nintwaddbu', 'tintwaddbu', 'jintwaddbu'],
            perfect: ['ntwaddabt', 'ntwaddabt', 'ntwaddab', 'ntwaddbet', 'ntwaddabna', 'ntwaddabtu', 'ntwaddbu'],
            imperative: ['ntwaddab', 'ntwaddbu'],
            negatives: {
                imperfect1s: 'ma nintwaddabx',
                imperfect1p: 'ma nintwaddbux',
                perfect3fs: 'ma ntwaddbitx',
                imperativeSg: 'tintwaddabx',
            },
        },
        {
            label: 'ntwieġeb',
            input: {
                root: 'w-ġ-b',
                form: 'VII',
                strength: 'weak',
                weakClass: 'assimilative',
                vowelSetPerfect: 'ie-e',
                vowelSetImperfect: 'ie-e',
                vowelSetImperative: 'ie-e',
                isImalaBlocked: false,
            },
            imperfect: ['nintwieġeb', 'tintwieġeb', 'jintwieġeb', 'tintwieġeb', 'nintwieġbu', 'tintwieġbu', 'jintwieġbu'],
            perfect: ['ntweġibt', 'ntweġibt', 'ntwieġeb', 'ntwieġbet', 'ntweġibna', 'ntweġibtu', 'ntwieġbu'],
            imperative: ['ntwieġeb', 'ntwieġbu'],
            negatives: {
                imperfect1s: 'ma nintweġibx',
                imperfect1p: 'ma nintweġbux',
                perfect3ms: 'ma ntweġibx',
                imperativeSg: 'tintweġibx',
            },
        },
    ];

    formVIIAssimilativeCases.forEach(({ label, input, imperfect, perfect, imperative, negatives }) => {
        const table = generateConjugation(input);

        assert.deepEqual(
            table.rows.map((row) => row.imperfect),
            imperfect,
            `${label} Form VII assimilative imperfect rows should match VerbMT`,
        );
        assert.deepEqual(
            table.rows.map((row) => row.perfect),
            perfect,
            `${label} Form VII assimilative perfect rows should match VerbMT`,
        );
        assert.deepEqual(
            [table.imperative_sg, table.imperative_pl],
            imperative,
            `${label} Form VII assimilative imperative rows should match VerbMT`,
        );
        assert.equal(
            buildVerbForm(table.rows[0].imperfect, true, null, null, input.vowelSetImperfect, table.rows[0].stems, table.blocksImala || false, input.form),
            negatives.imperfect1s,
            `${label} negative imperfect 1s should use the assimilative attached stem`,
        );
        assert.equal(
            buildVerbForm(table.rows[4].imperfect, true, null, null, input.vowelSetImperfect, table.rows[4].stems, table.blocksImala || false, input.form),
            negatives.imperfect1p,
            `${label} negative imperfect 1p should use the plural assimilative stem`,
        );
        if (negatives.perfect3ms) {
            assert.equal(
                buildPerfectForm(table.rows[2].perfect, table.rows[2].perfect_neg ?? table.rows[2].perfect, true, null, null, input.vowelSetPerfect, table.rows[2].stems, table.blocksImala || false, input.form),
                negatives.perfect3ms,
                `${label} negative perfect 3ms should use the assimilative attached stem`,
            );
        }
        if (negatives.perfect3fs) {
            assert.equal(
                buildPerfectForm(table.rows[3].perfect, table.rows[3].perfect_neg ?? table.rows[3].perfect, true, null, null, input.vowelSetPerfect, table.rows[3].stems, table.blocksImala || false, input.form),
                negatives.perfect3fs,
                `${label} negative perfect 3fs should use the assimilative attached stem`,
            );
        }
        assert.equal(
            buildVerbForm(table.rows[1].imperfect, true, null, null, input.vowelSetImperfect, table.rows[1].stems, table.blocksImala || false, input.form).replace(/^ma /, ''),
            negatives.imperativeSg,
            `${label} negative imperative singular should use the assimilative attached stem`,
        );
    });

    assert.equal(
        shouldMarkVerbConjugationTheoretical({ is_inflectable: false }, {}),
        false,
        'verb conjugations should not become theoretical from the legacy entry default is_inflectable=false'
    );
    assert.equal(
        shouldMarkVerbConjugationTheoretical({ has_inflection: false }, {}),
        true,
        'explicit has_inflection=false should still mark a verb conjugation theoretical'
    );
    assert.equal(
        shouldMarkVerbConjugationTheoretical({ tags: ['THEORETICAL'] }, {}),
        true,
        'THEORETICAL tags should still mark verb conjugations theoretical'
    );
};

run();
console.log('verbMorphology tests passed');
