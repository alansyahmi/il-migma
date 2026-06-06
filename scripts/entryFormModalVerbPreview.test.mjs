import assert from 'node:assert/strict';
import { generateConjugation } from '../src/lib/conjugationEngine.ts';
import { buildEntryFormVerbMorphologyPreview } from '../src/lib/verbMorphology.ts';
import { ENGINE_VERB_BRANCH_FIXTURES } from './seed-test-pack.mjs';

const citationRowFor = (table) => table.rows.find((row) => row.person_mt === '3ms') || table.rows[2];

const run = () => {
    const previews = ENGINE_VERB_BRANCH_FIXTURES.map((fixture) => {
        const preview = buildEntryFormVerbMorphologyPreview({
            pos: 'verb',
            headword: '',
            _rootConsonants: fixture.root,
            _formLabel: fixture.form,
            verb_class: fixture.strength,
            _weakClass: fixture.weakClass,
            verb_vowel_perf: fixture.vowelSetPerfect,
            verb_vowel_impf: fixture.vowelSetImperfect,
            verb_vowel_impv: fixture.vowelSetImperative,
        });
        const conjugation = generateConjugation({
            root: fixture.root,
            form: fixture.form,
            strength: fixture.strength,
            weakClass: fixture.weakClass || undefined,
            vowelSetPerfect: fixture.vowelSetPerfect,
            vowelSetImperfect: fixture.vowelSetImperfect,
            vowelSetImperative: fixture.vowelSetImperative,
            isImalaBlocked: fixture.isImalaBlocked ?? fixture.root.includes('għ'),
        });
        const citation = citationRowFor(conjugation);

        assert.ok(preview, `${fixture.branchKey} should produce an EntryFormModal verb preview`);
        assert.equal(preview.perfective_3sg_m, citation.perfect, `${fixture.branchKey} modal perfect should match generateConjugation`);
        assert.equal(preview.imperfective_3sg_m, citation.imperfect, `${fixture.branchKey} modal imperfect should match generateConjugation`);
        assert.equal(preview.perfective_3sgm, citation.perfect, `${fixture.branchKey} modal canonical perfect should match generateConjugation`);
        assert.equal(preview.imperfective_3sgm, citation.imperfect, `${fixture.branchKey} modal canonical imperfect should match generateConjugation`);

        return { fixture, preview };
    });

    const formIII = previews.filter(({ fixture }) => fixture.form === 'III');
    assert.equal(formIII.length, 5, 'test fixtures should cover every Form III branch');
    assert.deepEqual(
        formIII.map(({ preview }) => [preview.perfective_3sg_m, preview.imperfective_3sg_m]),
        [
            ['bierek', 'jbierek'],
            ['wiesel', 'jwiesel'],
            ['qiewem', 'jqiewem'],
            ['biena', 'jbiena'],
            ['ħiebab', 'jħiebab'],
        ],
        'Form III modal preview should use the full engine forms, not stale root-form placeholders',
    );

    const blankVowelPreview = buildEntryFormVerbMorphologyPreview({
        pos: 'verb',
        headword: 'bieda',
        _rootConsonants: 'b-d-w',
        _formLabel: 'III',
        verb_class: 'weak',
        _weakClass: 'defective',
        verb_vowel_perf: '',
        verb_vowel_impf: '',
        verb_vowel_impv: '',
    });

    assert.ok(blankVowelPreview, 'modal preview should generate from default vowel sets when verb fields are blank');
    assert.equal(blankVowelPreview.vowel_set_perf, 'a-a', 'blank Form III final-w preview should expose the root-specific perfect vowel set');
    assert.equal(blankVowelPreview.vowel_set_impf, 'i-a', 'blank Form III final-w preview should expose the root-specific imperfect vowel set');
    assert.equal(blankVowelPreview.perfective_3sgm, 'bieda', 'blank Form III preview should still use conjugationEngine for 3ms perfect');
    assert.equal(blankVowelPreview.imperfective_3sgm, 'jbiedi', 'blank Form III preview should still use conjugationEngine for 3ms imperfect');

    const rootDerivedBlankVowelPreview = buildEntryFormVerbMorphologyPreview({
        pos: 'verb',
        headword: 'bieda',
        _rootConsonants: 'b-d-w',
        _rootVowelSetPerf: 'a-e',
        _formLabel: 'III',
        verb_class: 'weak',
        _weakClass: 'defective',
        verb_vowel_perf: '',
        verb_vowel_impf: '',
        verb_vowel_impv: '',
    });

    assert.ok(rootDerivedBlankVowelPreview, 'modal preview should generate from root-derived vowel sets when verb fields are blank');
    assert.equal(rootDerivedBlankVowelPreview.vowel_set_perf, 'a-e', 'blank non-Form-I preview should inherit the root perfect vowel set');
    assert.equal(rootDerivedBlankVowelPreview.vowel_set_impf, 'a-i', 'blank weak defective Form III preview should derive final i for imperfect');
    assert.equal(rootDerivedBlankVowelPreview.vowel_set_impv, 'a-i', 'blank weak defective Form III preview should derive final i for imperative');

    const allAaImalaPreview = buildEntryFormVerbMorphologyPreview({
        pos: 'verb',
        headword: 'qara',
        _rootConsonants: 'q-r-a',
        _formLabel: 'I',
        verb_class: 'weak',
        _weakClass: 'defective',
        verb_vowel_perf: 'a-a',
        verb_vowel_impf: 'a-a',
        verb_vowel_impv: 'a-a',
        is_imala_blocked: true,
    });

    assert.ok(allAaImalaPreview, 'modal preview should generate with entry-specific imala override');
    assert.equal(allAaImalaPreview.isImalaBlocked, true, 'modal preview should expose entry-specific blocked imala');

    const qietaPreview = buildEntryFormVerbMorphologyPreview({
        pos: 'verb',
        headword: "qieta'",
        _rootConsonants: 'q-t-għ',
        _formLabel: 'III',
        verb_class: '',
        verb_vowel_perf: 'ie-a',
        verb_vowel_impf: 'ie-a',
        verb_vowel_impv: 'ie-a',
    });

    assert.ok(qietaPreview, "modal preview should generate for Form III strong-hybrid verbs");
    assert.equal(qietaPreview.vowel_set_perf, 'ie-a', 'Form III strong-hybrid preview should keep the perfect vowel set');
    assert.equal(qietaPreview.perfective_3sgm, "qieta'", "Form III strong-hybrid preview should use the engine's 3ms perfect");
    assert.equal(qietaPreview.imperfective_3sgm, "jqieta'", "Form III strong-hybrid preview should use the engine's 3ms imperfect");

    const rabbaPreview = buildEntryFormVerbMorphologyPreview({
        pos: 'verb',
        headword: "rabba'",
        _rootConsonants: 'r-b-għ',
        _formLabel: 'II',
        verb_class: '',
        verb_vowel_perf: 'a-a',
        verb_vowel_impf: 'a-i',
        verb_vowel_impv: 'a-i',
    });

    assert.ok(rabbaPreview, 'modal preview should generate for Form II final-għ verbs');
    assert.equal(rabbaPreview.vowel_set_perf, 'a-a', 'Form II final-għ preview should keep the perfect vowel set');
    assert.equal(rabbaPreview.perfective_3sgm, "rabba'", "Form II final-għ preview should use the engine's 3ms perfect");
    assert.equal(rabbaPreview.imperfective_3sgm, "jrabba'", "Form II final-għ preview should use the engine's 3ms imperfect");
};

run();
console.log('entryFormModalVerbPreview tests passed');
