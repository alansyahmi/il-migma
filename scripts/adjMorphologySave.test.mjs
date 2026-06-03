import assert from 'node:assert/strict';
import { buildAdjMorphologyRecord, normalizeAdjMorphologyInput, syncAdjMorphology } from '../src/lib/adjMorphology.ts';

const canonicalKeys = [
    'entry_id',
    'masculine_form',
    'feminine_form',
    'plural_form',
    'elative_form',
    'has_elative',
    'is_inflectable',
    'dual_form',
    'dual_pattern',
    'vowel_set_dual',
    'diminutive_form',
    'diminutive_pattern',
    'elative_pattern',
    'gender',
    'form_fem_pattern',
    'form_masc_pattern',
    'form_plural_pattern',
    'vowel_set_sg',
    'vowel_set_pl',
    'vowel_set_opp',
    'pattern',
    'updated_at',
];

const run = async () => {
    const normalized = normalizeAdjMorphologyInput({
        pos: 'adjective',
        adj_masculine: 'twil',
        adj_feminine: 'twila',
        adj_plural: [{ form: 'twal', pattern: 'CCiCa' }],
        lemma_pattern: 'legacy-pattern',
        elative: 'itwal',
        elative_pattern: 'iCCaC',
        has_elative: false,
        is_inflectable: true,
        gender: 'masculine',
        form_fem_pattern: 'CCiCa',
        form_masc_pattern: 'CCiC',
        form_plural_pattern: 'CCiCa',
        dual_form: 'tewlin',
        dual_pattern: 'CvCCin',
        diminutive_form: 'twilek',
        diminutive_pattern: 'CCiCC',
        vowel_set_sg: 'i-a',
        vowel_set_pl: 'i-ie',
        vowel_set_opp: 'i-a',
        vowel_set_dual: 'i-e',
    });

    assert.equal(normalized.masculine_form, 'twil', 'normalizeAdjMorphologyInput should map legacy masculine aliases');
    assert.equal(normalized.feminine_form, 'twila', 'normalizeAdjMorphologyInput should map legacy feminine aliases');
    assert.equal(normalized.pattern, 'legacy-pattern', 'normalizeAdjMorphologyInput should preserve the canonical pattern when only the legacy alias is present');
    assert.equal(normalized.has_elative, 0, 'normalizeAdjMorphologyInput should coerce booleans into DB-ready integers');
    assert.equal(normalized.is_inflectable, 1, 'normalizeAdjMorphologyInput should coerce inflectable into DB-ready integers');
    assert.ok(!('lemma_pattern' in normalized), 'normalizeAdjMorphologyInput should not persist lemma_pattern');

    const record = buildAdjMorphologyRecord({ id: 'adj-twil', pos: 'adjective' }, {
        adj_morphology: {
            ...normalized,
            plural_form: normalized.plural_form,
        },
    });

    assert.deepStrictEqual(
        Object.keys(record).sort(),
        canonicalKeys.sort(),
        'buildAdjMorphologyRecord should emit the canonical adjective column set only'
    );

    const writes = [];
    const tx = {
        execute: async (stmt) => {
            writes.push(stmt);
            return { rowsAffected: 1 };
        },
        commit: async () => {
            writes.push({ commit: true });
        },
        rollback: async () => {
            writes.push({ rollback: true });
        },
        close: () => {
            writes.push({ close: true });
        },
    };
    const client = {
        transaction: async () => tx,
        execute: async () => {
            throw new Error('syncAdjMorphology should use the transaction object for writes');
        },
    };

    await syncAdjMorphology(client, 'adj-twil', {
        pos: 'adjective',
        adj_morphology: {
            adj_masculine: 'twil',
            adj_feminine: 'twila',
            adj_plural: [{ form: 'twal', pattern: 'CCiCa' }],
            lemma_pattern: 'legacy-pattern',
            elative: 'itwal',
            elative_pattern: 'iCCaC',
            has_elative: false,
            is_inflectable: true,
            gender: 'masculine',
            form_fem_pattern: 'CCiCa',
            form_masc_pattern: 'CCiC',
            form_plural_pattern: 'CCiCa',
            dual_form: 'tewlin',
            dual_pattern: 'CvCCin',
            diminutive_form: 'twilek',
            diminutive_pattern: 'CCiCC',
            vowel_set_sg: 'i-a',
            vowel_set_pl: 'i-ie',
            vowel_set_opp: 'i-a',
            vowel_set_dual: 'i-e',
        },
    });

    const insert = writes.find((item) => typeof item?.sql === 'string');
    assert.ok(insert, 'syncAdjMorphology should issue a write statement');
    assert.match(insert.sql, /^INSERT INTO adj_morphology \(/, 'syncAdjMorphology should write directly to adj_morphology');
    assert.match(insert.sql, /ON CONFLICT\(entry_id\) DO UPDATE SET/, 'syncAdjMorphology should upsert with a canonical conflict clause');
    assert.ok(!insert.sql.includes('lemma_pattern'), 'syncAdjMorphology should not write deprecated lemma_pattern');
    assert.ok(!insert.sql.includes('adjective_morphology'), 'syncAdjMorphology should not write legacy nested aliases');
    assert.ok(!insert.sql.includes('adj_masculine'), 'syncAdjMorphology should not write legacy alias columns');
};

run()
    .then(() => console.log('adjMorphologySave tests passed'))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
