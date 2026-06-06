import assert from 'node:assert/strict';
import { buildEntryPayload } from '../src/lib/adminSchema.ts';
import { generateConjugation, generateRootForms } from '../src/lib/conjugationEngine.ts';
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
    assert.equal(waqaf.imperative_sg, 'ieqaf', 'assimilative ie-a imperative should keep ie');

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
    assert.equal(engineBuiltRefa.rows[2].perfect, 'refa', "refa' should not use the generic strong refagħ perfect");
    assert.equal(engineBuiltRefa.imperative_sg, "irfa'", "refa' imperative should use the strong-hybrid final-għ model");

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
