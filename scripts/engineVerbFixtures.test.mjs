import assert from 'node:assert/strict';
import { generateConjugation } from '../src/lib/conjugationEngine.ts';
import { buildVerbForm } from '../src/lib/suffixEngine.ts';
import { buildSeedPack, ENGINE_VERB_BRANCH_FIXTURES } from './seed-test-pack.mjs';

const EXPECTED_BRANCH_KEYS = [
    'quadriliteral-form-i-strong',
    'quadriliteral-form-i-weak-defective',
    'quadriliteral-form-ii-strong',
    'quadriliteral-form-ii-weak-defective',
    'form-i-strong',
    'form-i-geminated',
    'form-i-strong-hybrid',
    'form-i-weak-assimilative',
    'form-i-weak-hollow',
    'form-i-weak-defective',
    'form-ii-strong',
    'form-ii-weak-assimilative',
    'form-ii-weak-hollow',
    'form-ii-weak-defective',
    'form-ii-geminated',
    'form-iii-strong',
    'form-iii-weak-assimilative',
    'form-iii-weak-hollow',
    'form-iii-weak-defective',
    'form-iii-geminated',
    'form-iv',
    'form-v-strong',
    'form-v-weak-defective',
    'form-vi-strong',
    'form-vi-weak-defective',
    'form-vii',
    'form-viii',
    'form-ix',
    'form-xa-strong',
    'form-xa-weak-defective',
    'form-xa-geminated',
    'form-xb-strong',
    'form-xb-weak-defective',
    'form-xb-weak-hollow',
];

const unique = (values) => new Set(values);
const parseJson = (value) => JSON.parse(value);
const pad = (value) => String(value).padStart(2, '0');

const assertSameSet = (actual, expected, message) => {
    assert.deepEqual([...actual].sort(), [...expected].sort(), message);
};

const assertPreservesImperativeMarker = (fixture, table, suffixForm, suffixLabel) => {
    const imperative = table.imperative_sg || '';
    if (imperative.startsWith('st')) {
        assert.ok(suffixForm.startsWith('st'), `${fixture.branchKey} ${suffixLabel} imperative suffix should preserve st-`);
    } else if (imperative.startsWith('t')) {
        assert.ok(suffixForm.startsWith('t'), `${fixture.branchKey} ${suffixLabel} imperative suffix should preserve t-`);
    } else if (imperative.startsWith('n')) {
        assert.ok(suffixForm.startsWith('n'), `${fixture.branchKey} ${suffixLabel} imperative suffix should preserve n-`);
    }

    assert.ok(!suffixForm.startsWith('ji'), `${fixture.branchKey} ${suffixLabel} imperative suffix should not use an imperfect ji- stem`);
};

const run = () => {
    assert.equal(ENGINE_VERB_BRANCH_FIXTURES.length, EXPECTED_BRANCH_KEYS.length, 'fixture list should cover every expected branch');
    assertSameSet(
        ENGINE_VERB_BRANCH_FIXTURES.map((fixture) => fixture.branchKey),
        EXPECTED_BRANCH_KEYS,
        'fixture branch keys should match expected engine branches',
    );
    assert.equal(
        unique(ENGINE_VERB_BRANCH_FIXTURES.map((fixture) => fixture.branchKey)).size,
        ENGINE_VERB_BRANCH_FIXTURES.length,
        'fixture branch keys should be unique',
    );

    const seedPack = buildSeedPack();
    const engineEntries = seedPack.entries.filter((entry) => String(entry.id).startsWith('zz-verb-engine-'));
    const engineRoots = seedPack.roots.filter((root) => String(root.id).startsWith('zz-root-verb-engine-'));
    const engineMorphology = seedPack.childRows.verb_morphology.filter((row) => String(row.entry_id).startsWith('zz-verb-engine-'));

    assert.equal(engineEntries.length, EXPECTED_BRANCH_KEYS.length, 'seed pack should include one engine verb entry per branch');
    assert.equal(engineRoots.length, EXPECTED_BRANCH_KEYS.length, 'seed pack should include one engine root per branch');
    assert.equal(engineMorphology.length, EXPECTED_BRANCH_KEYS.length, 'seed pack should include one verb_morphology row per engine branch');
    assert.equal(unique(engineEntries.map((entry) => entry.id)).size, engineEntries.length, 'engine entry ids should be unique');
    assert.equal(unique(engineRoots.map((root) => root.id)).size, engineRoots.length, 'engine root ids should be unique');

    ENGINE_VERB_BRANCH_FIXTURES.forEach((fixture, index) => {
        const suffix = pad(index + 1);
        const table = generateConjugation({
            root: fixture.root,
            form: fixture.form,
            strength: fixture.strength,
            weakClass: fixture.weakClass || undefined,
            vowelSetPerfect: fixture.vowelSetPerfect,
            vowelSetImperfect: fixture.vowelSetImperfect,
            vowelSetImperative: fixture.vowelSetImperative,
            isImalaBlocked: fixture.isImalaBlocked ?? fixture.root.includes('għ'),
        });
        const citationRow = table.rows.find((row) => row.person_mt === '3ms') || table.rows[2];
        const entry = engineEntries.find((candidate) => candidate.id === `zz-verb-engine-${suffix}`);
        const root = engineRoots.find((candidate) => candidate.id === `zz-root-verb-engine-${suffix}`);
        const morphology = engineMorphology.find((candidate) => candidate.entry_id === `zz-verb-engine-${suffix}`);

        assert.ok(entry, `${fixture.branchKey} should have an entry row`);
        assert.ok(root, `${fixture.branchKey} should have a root row`);
        assert.ok(morphology, `${fixture.branchKey} should have a verb morphology row`);
        assert.equal(entry.headword, citationRow.perfect, `${fixture.branchKey} headword should match engine 3ms perfect`);
        assert.equal(entry.root_consonants, fixture.root, `${fixture.branchKey} entry should point to fixture root`);
        assert.equal(root.consonants, fixture.root, `${fixture.branchKey} root consonants should match fixture`);
        assert.equal(morphology.perfective_3sgm, citationRow.perfect, `${fixture.branchKey} stored perfective should match engine`);
        assert.equal(morphology.imperfective_3sgm, citationRow.imperfect, `${fixture.branchKey} stored imperfective should match engine`);
        assert.equal(morphology.form, fixture.form, `${fixture.branchKey} stored form should match fixture`);
        assert.equal(morphology.class, fixture.strength, `${fixture.branchKey} stored class should match fixture`);
        assert.equal(morphology.weak_class, fixture.weakClass, `${fixture.branchKey} stored weak class should match fixture`);
        assert.ok(!Object.prototype.hasOwnProperty.call(morphology, 'conjugation'), `${fixture.branchKey} should not store a conjugation blob`);

        const tags = parseJson(entry.tags);
        assert.ok(tags.includes('engine-branch'), `${fixture.branchKey} should be tagged as an engine branch fixture`);
        assert.ok(tags.includes(fixture.branchKey), `${fixture.branchKey} should be tagged with its branch key`);

        const imperativeEk = buildVerbForm(
            table.imperative_sg,
            false,
            1,
            null,
            fixture.vowelSetImperative,
            table.imperative_sg_stems,
            table.blocksImala || false,
            fixture.form,
        );
        const imperativeKom = buildVerbForm(
            table.imperative_sg,
            false,
            5,
            null,
            fixture.vowelSetImperative,
            table.imperative_sg_stems,
            table.blocksImala || false,
            fixture.form,
        );

        assertPreservesImperativeMarker(fixture, table, imperativeEk, '-ek');
        assertPreservesImperativeMarker(fixture, table, imperativeKom, '-kom');

        if (fixture.branchKey === 'quadriliteral-form-ii-strong') {
            assert.equal(imperativeEk, 'tbalnadek', 'quadriliteral Form II strong imperative -ek should not use the imperfect stem');
            assert.equal(imperativeKom, 'tbalnadkom', 'quadriliteral Form II strong imperative -kom should not use the imperfect stem');
        }
        if (fixture.branchKey === 'quadriliteral-form-ii-weak-defective') {
            assert.equal(imperativeEk, 'tħarbik', 'quadriliteral Form II defective imperative -ek should not use the imperfect stem');
            assert.equal(imperativeKom, 'tħarbikom', 'quadriliteral Form II defective imperative -kom should not use the imperfect stem');
        }
        if (fixture.branchKey === 'form-xb-weak-defective') {
            assert.equal(imperativeEk, 'stġarrik', 'Form Xb defective imperative -ek should preserve st-');
            assert.equal(imperativeKom, 'stġarrikom', 'Form Xb defective imperative -kom should preserve st-');
        }
    });
};

run();
console.log('engineVerbFixtures tests passed');
