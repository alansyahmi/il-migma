import assert from 'node:assert/strict';
import { generateZokkForms } from '../src/lib/zokkEngine.ts';
import {
    generateConjugation,
    getAttestedEntries,
    markGeneratedForms,
    resolveAttestedEntryFromEntries,
} from '../src/lib/conjugationEngine.ts';
import { buildStemSearchPreview } from '../src/lib/stemSearchPreview.ts';
import { resolveVerbClassification } from '../src/lib/stemDefaults.ts';

const assertEq = (actual, expected, message) => {
    assert.strictEqual(actual, expected, message);
};

const getCitationRow = (forms) => forms.conjugation?.rows.find(row => row.person_mt === '3ms');

const run = () => {
    const sistem = generateZokkForms({
        stem_string: 'sistem',
        class_type: 'ar',
        is_hybrid: false,
    });

    const sistemCitation = getCitationRow(sistem);
    assertEq(sistemCitation?.perfect, 'ssistema', 'ar citation perfect');
    assertEq(sistemCitation?.imperfect, 'jissistema', 'ar citation imperfect');
    assertEq(sistem.conjugation?.imperative_sg, 'sistema', 'ar imperative sg');
    assertEq(sistem.passive_participle?.masc, 'sistemat', 'ar passive participle');
    assertEq(sistem.agentive?.masc, 'sistematur', 'ar agentive masc');
    assertEq(sistem.verbal_noun, 'sistemar', 'ar verbal noun');
    assertEq(sistem.hybrid_forms, undefined, 'non-hybrid stems should not expose form II');

    const prefer = generateZokkForms({
        stem_string: 'prefer',
        class_type: 'ir',
        is_hybrid: false,
    });

    const preferCitation = getCitationRow(prefer);
    assertEq(preferCitation?.perfect, 'pprefera', 'ir citation perfect');
    assertEq(preferCitation?.imperfect, 'jippreferi', 'ir citation imperfect');
    assertEq(prefer.conjugation?.imperative_sg, 'preferi', 'ir imperative sg');
    assertEq(prefer.passive_participle?.masc, 'preferit', 'ir passive participle');
    assertEq(prefer.passive_participle?.alternates?.masc?.[0], 'preferut', 'ir passive alternate');
    assertEq(prefer.agentive?.masc, 'preferitur', 'ir agentive masc');
    assertEq(prefer.verbal_noun, 'preferir', 'ir verbal noun');

    const inheritedStrong = resolveVerbClassification({
        root: { strength: 'strong', weak_class: null },
    });
    assertEq(inheritedStrong.strength, 'strong', 'verb classification should inherit strong root strength');
    assertEq(inheritedStrong.weak_class, null, 'verb classification should not invent a weak class for strong roots');

    const inheritedWeak = resolveVerbClassification({
        root: { strength: 'weak', weak_class: 'defective' },
    });
    assertEq(inheritedWeak.strength, 'weak', 'verb classification should inherit weak root strength');
    assertEq(inheritedWeak.weak_class, 'defective', 'verb classification should inherit weak root weak-class');

    const hybridOverride = resolveVerbClassification({
        root: { strength: 'strong', weak_class: null },
        zokk_morphology: { is_hybrid: true },
    });
    assertEq(hybridOverride.strength, 'weak', 'hybrid stems should resolve to weak classification');
    assertEq(hybridOverride.weak_class, 'defective', 'hybrid stems should resolve to defective weak class');

    const hybrid = generateZokkForms({
        stem_string: 'kanta',
        class_type: 'ar',
        is_hybrid: true,
        root: 'k-n-t-j',
    });

    const hybridCitation = getCitationRow(hybrid);
    assertEq(hybridCitation?.perfect, 'kanta', 'hybrid citation perfect');
    assertEq(hybridCitation?.imperfect, 'jkanta', 'hybrid citation imperfect');
    assertEq(hybrid.hybrid_forms?.form_ii, 'tkanta', 'hybrid stems should still expose form II');

    const hybridIr = generateZokkForms({
        stem_string: 'serv',
        class_type: 'ir',
        is_hybrid: true,
        root: 's-r-v-j',
    });

    const hybridIrCitation = getCitationRow(hybridIr);
    assertEq(hybridIrCitation?.perfect, 'serva', 'ir hybrid citation perfect');
    assertEq(hybridIrCitation?.imperfect, 'jserva', 'ir hybrid citation imperfect');
    assertEq(hybridIr.hybrid_forms?.form_ii, 'sserva', 'ir hybrid form II lemma');
    assertEq(hybridIr.hybrid_forms?.form_ii_imperfect, 'jisservi', 'ir hybrid form II imperfect');
    assertEq(hybridIr.hybrid_forms?.form_ii_imperative, 'sserva', 'ir hybrid form II imperative');
    assertEq(hybridIr.hybrid_forms?.form_ii_passive_participle, 'misservi', 'ir hybrid form II passive');
    assertEq(hybridIr.hybrid_forms?.form_ii_active_participle, '-', 'ir hybrid form II active');
    assertEq(hybridIr.hybrid_forms?.form_ii_verbal_noun, 'sservija', 'ir hybrid form II verbal noun');

    const accepta = generateZokkForms({
        stem_string: 'aċċett',
        class_type: 'ar',
        is_hybrid: false,
    });

    const acceptaCitation = getCitationRow(accepta);
    assertEq(acceptaCitation?.perfect, 'aċċetta', 'vowel-initial ar citation perfect should not duplicate the initial vowel');
    assertEq(acceptaCitation?.imperfect, 'jaċċetta', 'vowel-initial ar citation imperfect should not insert an extra i');
    assertEq(accepta.conjugation?.imperative_sg, 'aċċetta', 'vowel-initial ar imperative should preserve the citation stem');

    const weakQuad = generateConjugation({
        root: 's-q-s-j',
        form: 'I',
        strength: 'weak',
        weakClass: 'defective',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'a-i',
        vowelSetImperative: 'a-i',
        isImalaBlocked: false,
    });

    assertEq(weakQuad.rows[0].perfect, 'saqsejt', 'weak quadriliteral Form I should follow the saqsa-style citation stem');
    assertEq(weakQuad.rows[0].imperfect, 'nsaqsi', 'weak quadriliteral Form I imperfect should use the weak singular -i ending');
    assertEq(weakQuad.rows[1].imperfect, 'ssaqsi', 'weak quadriliteral Form I 2s imperfect should use the weak singular -i ending');
    assertEq(weakQuad.rows[2].perfect, 'saqsa', 'weak quadriliteral Form I 3ms perfect should keep the bare citation stem');
    assertEq(weakQuad.rows[2].imperfect, 'jsaqsi', 'weak quadriliteral Form I 3ms imperfect should use the weak singular -i ending');
    assertEq(weakQuad.rows[3].perfect, 'saqsiet', 'weak quadriliteral Form I 3fs perfect should use the weak -iet ending');
    assertEq(weakQuad.rows[6].perfect, 'saqsew', 'weak quadriliteral Form I 3p perfect should use the weak -ew ending');
    assertEq(weakQuad.rows[6].imperfect, 'jsaqsu', 'weak quadriliteral Form I 3p should keep the plural -u ending');
    assertEq(weakQuad.imperative_sg, 'saqsi', 'weak quadriliteral imperative singular should use the weak -i ending');
    assertEq(weakQuad.imperative_pl, 'saqsu', 'weak quadriliteral plural imperative should use the weak -u ending');

    const weakQuadServa = generateConjugation({
        root: 's-r-v-j',
        form: 'I',
        strength: 'weak',
        weakClass: 'defective',
        vowelSetPerfect: 'e-a',
        vowelSetImperfect: 'e-i',
        vowelSetImperative: 'e-i',
        isImalaBlocked: false,
    });

    assertEq(weakQuadServa.rows[0].perfect, 'servejt', 'serva should follow the same weak quadriliteral citation pattern');
    assertEq(weakQuadServa.rows[0].imperfect, 'nservi', 'serva should use the weak singular -i ending');
    assertEq(weakQuadServa.rows[2].perfect, 'serva', 'serva 3ms perfect should keep the bare citation stem');
    assertEq(weakQuadServa.rows[2].imperfect, 'jservi', 'serva 3ms imperfect should use the weak singular -i ending');
    assertEq(weakQuadServa.rows[6].perfect, 'servew', 'serva 3p perfect should use the weak -ew ending');
    assertEq(weakQuadServa.rows[6].imperfect, 'jservu', 'serva 3p imperfect should use the weak plural -u ending');
    assertEq(weakQuadServa.imperative_sg, 'servi', 'serva imperative singular should use the weak -i ending');
    assertEq(weakQuadServa.imperative_pl, 'servu', 'serva imperative plural should use the weak -u ending');

    const stemPreview = buildStemSearchPreview(
        {
            id: 'v-servi',
            headword: 'servi',
            pos: 'verb',
            zokk_morphology: {
                stem_string: 'serv',
                class_type: 'ir',
                is_hybrid: true,
                root: 's-r-v-j',
            },
            definitions: [],
        },
        [{
            id: 'serv-active-1',
            headword: 'servitur',
            pos: 'participle',
            participle_type: 'active',
            verb_morphology: {
                form: 'I',
            },
            zokk_morphology: {
                stem_string: 'serv',
                class_type: 'ir',
                is_hybrid: true,
                root: 's-r-v-j',
            },
            definitions: [],
        }]
    );

    assertEq(stemPreview.length, 4, 'stem preview should only expose the four base rows');
    assertEq(stemPreview.map((row) => row.kind).join(','), 'imperfect,imperative,passive,verbal-noun', 'stem preview should not include hybrid Form II rows');
    assertEq(stemPreview[0].value, 'jserva', 'stem preview imperfect should use the base stem');
    assertEq(stemPreview[1].value, 'servi', 'stem preview imperative should use the base stem');
    assertEq(stemPreview[2].value, 'servit', 'stem preview passive should use the base stem');
    assertEq(stemPreview[2].secondary?.value, 'servitur', 'stem preview passive should show attested active below it');
    assertEq(stemPreview[2].secondary?.hasPage, true, 'stem preview active secondary should be treated as attested');
    assertEq(stemPreview[3].value, 'servir', 'stem preview verbal noun should use the base stem');

    const mismatchAttested = [{
        id: 'mismatch-1',
        headword: 'mservi',
        pos: 'participle',
        participle_type: 'passive',
        verb_morphology: {
            form: 'II',
            participle_type: 'passive',
        },
        zokk_morphology: {
            stem_string: 'serv',
            class_type: 'ir',
            is_hybrid: true,
            root: 's-r-v-j',
        },
        definitions: [],
    }];

    const resolvedMismatch = resolveAttestedEntryFromEntries(mismatchAttested, {
        surface: 'misservi',
        form: 'II',
        pos: 'participle',
        type: 'passive',
        participleType: 'passive',
        stem: 'serv',
    });
    assertEq(resolvedMismatch?.word, 'mservi', 'metadata resolver should match mismatched passive surface');
    assertEq(resolvedMismatch?.id, 'mismatch-1', 'metadata resolver should return the attested entry id');

    const wrongPosAttested = [{
        id: 'wrong-pos-1',
        headword: 'mservi',
        pos: 'noun',
        verb_morphology: {
            form: 'II',
        },
        zokk_morphology: {
            stem_string: 'serv',
            class_type: 'ir',
            is_hybrid: true,
            root: 's-r-v-j',
        },
        definitions: [],
    }];

    const wrongPosResolved = resolveAttestedEntryFromEntries(wrongPosAttested, {
        surface: 'misservi',
        form: 'II',
        pos: 'participle',
        type: 'passive',
        participleType: 'passive',
        stem: 'serv',
    });
    assertEq(wrongPosResolved, null, 'metadata resolver should not match same headword with wrong POS');

    const markedMismatch = markGeneratedForms([
        {
            form: 'II',
            perfect: 'sserva',
            imperfect: 'jisservi',
            imperative: 'sserva',
            passiveParticiple: 'misservi',
            activeParticiple: '-',
            verbalNoun: 'sservija',
        },
    ], getAttestedEntries(mismatchAttested));
    assertEq(markedMismatch[0].passiveParticiple.value, 'mservi', 'metadata-marked passive cell should use attested surface');
    assertEq(markedMismatch[0].passiveParticiple.marker, 'plain', 'metadata-marked passive cell should be plain');
    assertEq(markedMismatch[0].imperative.value, 'sserva', 'imperative should keep the generated surface');
    assertEq(markedMismatch[0].imperative.marker, 'theoretical', 'imperative should mirror imperfect-style marker state');

    const imperfectParentAttested = [{
        id: 'imperfect-parent-1',
        headword: 'sserva',
        pos: 'verb',
        verb_morphology: {
            form: 'II',
        },
        zokk_morphology: {
            stem_string: 'serv',
            class_type: 'ir',
            is_hybrid: true,
            root: 's-r-v-j',
        },
        definitions: [],
    }];

    const markedImperfectParent = markGeneratedForms([
        {
            form: 'II',
            perfect: 'sserva',
            imperfect: 'jisservi',
            imperative: 'sserva',
            passiveParticiple: 'misservi',
            activeParticiple: '-',
            verbalNoun: 'sservija',
        },
    ], getAttestedEntries(imperfectParentAttested));
    assertEq(markedImperfectParent[0].imperfect.value, 'jisservi', 'imperfect should keep the generated surface');
    assertEq(markedImperfectParent[0].imperfect.marker, 'plain', 'imperfect should follow an attested parent verb');
    assertEq(markedImperfectParent[0].imperfect.entryId, undefined, 'imperfect should not link even when parent is attested');

    const imperfectSurfaceOnly = [{
        id: 'imperfect-1',
        headword: 'jisservi',
        pos: 'noun',
        verb_morphology: {
            form: 'I',
        },
        zokk_morphology: {
            stem_string: 'serv',
            class_type: 'ir',
            is_hybrid: true,
            root: 's-r-v-j',
        },
        definitions: [],
    }];

    const markedImperfectSurface = markGeneratedForms([
        {
            form: 'II',
            perfect: 'sserva',
            imperfect: 'jisservi',
            imperative: 'sserva',
            passiveParticiple: 'misservi',
            activeParticiple: '-',
            verbalNoun: 'sservija',
        },
    ], getAttestedEntries(imperfectSurfaceOnly));
    assertEq(markedImperfectSurface[0].imperfect.value, 'jisservi', 'imperfect should stay generated when only the imperfect surface is attested');
    assertEq(markedImperfectSurface[0].imperfect.marker, 'auto_generated', 'imperfect should stay generated when the parent verb is unattested');
};

run();
console.log('stemForms tests passed');
