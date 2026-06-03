import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { formToPayload } from '../src/lib/entryBridge.ts';
import { ensureAdjMorphologyTable, syncAdjMorphology, buildAdjMorphologyRecord } from '../src/lib/adjMorphology.ts';
import { ensureTagsTables, syncEntryTags } from '../src/lib/entryTags.ts';
import { ensureRelationshipsTable, syncEntryRelationships } from '../src/lib/entryRelationships.ts';

const client = createClient({ url: 'file:local.db' });

function uid() {
    return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 6);
}

function n(val) {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}

function buildEntryWriteRecord(body, entryColumns) {
    const record = {};
    const ENTRY_WRITE_FIELD_ALLOWLIST = new Set([
        'headword',
        'pos',
        'gender',
        'root_consonants',
        'stem',
        'is_loanword',
        'source_language',
        'source_id',
        'source_citation',
        'source_title',
        'source_year',
        'source_page',
        'source_publisher',
        'source_display',
        'source_tooltip',
        'etymology_chain',
        'etymology_notes',
        'definitions',
        'usage_examples',
        'cv_pattern',
        'morph_pattern',
        'sound_suffix',
        'zokk_morphology',
        'zokk_class',
        'zokk_is_hybrid',
        'zokk_agentive_suffix',
        'is_inflectable',
    ]);
    const ADJECTIVE_ENTRY_TOP_LEVEL_STRIP_FIELDS = new Set([
        'morph_pattern',
        'sound_suffix',
        'is_inflectable',
        'pattern',
        'has_elative',
        'elative_form',
        'elative_pattern',
        'dual_form',
        'dual_pattern',
        'diminutive_form',
        'diminutive_pattern',
        'form_fem_pattern',
        'form_masc_pattern',
        'form_plural_pattern',
        'vowel_set_sg',
        'vowel_set_pl',
        'vowel_set_opp',
        'vowel_set_dual',
        'masculine_form',
        'feminine_form',
        'plural_form',
        'form_masc',
        'form_fem',
        'adjective_morphology',
    ]);

    for (const col of entryColumns) {
        if (col === 'id' || col === 'created_at' || col === 'updated_at') continue;
        if (!ENTRY_WRITE_FIELD_ALLOWLIST.has(col)) continue;
        if (ADJECTIVE_ENTRY_TOP_LEVEL_STRIP_FIELDS.has(col)) continue;

        let includeCol = false;
        let val = body[col];

        if (col === 'is_loanword' || col === 'is_inflectable') {
            includeCol = true;
            val = (val === true || val === 1 || val === '1') ? 1 : 0;
        } else if (col === 'root_consonants') {
            includeCol = true;
            val = body._rootConsonants || body.root_consonants;
        } else if (Object.prototype.hasOwnProperty.call(body, col)) {
            includeCol = true;
        }

        if (!includeCol) continue;

        if (val && typeof val === 'object') {
            val = JSON.stringify(val);
        }

        record[col] = col === 'is_loanword' || col === 'is_inflectable' ? ((val === true || val === 1 || val === '1') ? 1 : 0) : n(val);
    }
    return record;
}

async function upsertEntryRow(tx, body, entryColumns, entryId) {
    const record = buildEntryWriteRecord(body, entryColumns);
    const writeColumns = Object.keys(record);
    const insertColumns = ['id', 'created_at', 'updated_at', ...writeColumns];
    const insertPlaceholders = insertColumns.map(() => '?').join(', ');
    const updateColumns = writeColumns.filter((col) => col !== 'id');
    const updateAssignments = updateColumns.map((col) => `${col} = excluded.${col}`);
    const updateSql = updateAssignments.length > 0
        ? `${updateAssignments.join(', ')}, updated_at = excluded.updated_at`
        : 'updated_at = excluded.updated_at';

    const nowStr = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    await tx.execute({
        sql: `
            INSERT INTO entries (${insertColumns.join(', ')})
            VALUES (${insertPlaceholders})
            ON CONFLICT(id) DO UPDATE SET ${updateSql}
        `,
        args: [entryId, nowStr, nowStr, ...writeColumns.map((col) => record[col])]
    });
}

async function syncAlternativeForms(tx, entryId, body) {
    if (!Array.isArray(body.alternative_forms)) return;

    await tx.execute({
        sql: "DELETE FROM alternative_forms WHERE entry_id = ?",
        args: [entryId]
    });

    for (let i = 0; i < body.alternative_forms.length; i++) {
        const alt = body.alternative_forms[i];
        if (!alt.headword) continue;
        await tx.execute({
            sql: `INSERT INTO alternative_forms (id, entry_id, headword, type, sort_order)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [alt.id || uid(), entryId, alt.headword, alt.type || null, i]
        });
    }
}

async function run() {
    console.log('--- STARTING ADJECTIVE INTEGRATION SAVE TEST ---');

    // 1. Ensure all tables are initialized/updated
    await ensureAdjMorphologyTable(client);
    await ensureTagsTables(client);
    await ensureRelationshipsTable(client);

    const tableInfo = await client.execute("PRAGMA table_info(entries)");
    const columns = (tableInfo.rows || []).map(r => r.name);

    // 2. Define a complete adjective form with EVERY field filled
    const fullForm = {
        id: 'adj-test-super-complete',
        headword: 'kbir',
        pos: 'adjective',
        root_consonants: 'k-b-r',
        gender: 'masculine',
        is_loanword: false,
        is_inflectable: true,
        source_language: 'Arabic',
        source_id: 'src-aquilina',
        source_citation: 'Aquilina 1987, p. 123',
        source_title: 'Maltese-English Dictionary',
        source_year: '1987',
        source_page: '123',
        source_publisher: 'Midsea Books',
        source_display: 'Aquilina',
        source_tooltip: 'J. Aquilina (1987)',
        definitions: [
            { text_en: 'extremely big', text_mt: 'kbir ħafna', register: 'formal', nuance: 'size' }
        ],
        usage_example: 'Huwa kbir.',
        usage_example_en: 'He is big.',
        etymology_chain: [
            { relationship: 'From', language: 'Arabic', term: 'k-b-r', pronunciation: 'k-b-r', definition: 'to be big' }
        ],
        etymology_notes: 'Test etymology notes',
        phonetics: [
            { dialect: 'Standard', ipa: '/kbiːr/', notes: 'Standard pronunciation' }
        ],
        tags: 'core, test, adj',
        cv_pattern: 'CCVC',

        // Adjective morphology fields
        masculine_form: 'kbir',
        feminine_form: 'kbira',
        plural_forms: [{ form: 'kbar', pattern: 'CCaC' }],
        elative_form: 'ikbar',
        elative_pattern: 'iCCaC',
        has_elative: true,
        dual_form: 'kbirotejn',
        dual_pattern: 'CCiCVtejn',
        vowel_set_dual: 'i-o',
        diminutive_form: 'kbejjer',
        diminutive_pattern: 'CCejCeC',
        form_fem_pattern: 'CCiCa',
        form_masc_pattern: 'CCiC',
        form_plural_pattern: 'CCaC',
        vowel_set_sg: 'i',
        vowel_set_pl: 'a',
        vowel_set_opp: 'o',
        pattern: 'CCVC',
        alternative_forms: [
            { headword: 'kbirr', type: 'orthographic' }
        ],
        synonyms: [],
        antonyms: [],
        related_entries: [],
    };

    // 3. Translate form state into normalized API payload using the shared bridge
    const payload = formToPayload(fullForm);

    const entryId = fullForm.id;
    const entryPos = 'adjective';

    console.log(`Persisting entry record for ${entryId}...`);
    console.log('Columns in entries table:', columns);
    console.log('Payload from formToPayload:', payload);

    // 4. Run the transaction
    const tx = await client.transaction('write');
    try {
        const writeBody = { ...payload, id: entryId, pos: entryPos };
        const writeRecord = buildEntryWriteRecord(writeBody, columns);
        console.log('Generated writeRecord for entries:', writeRecord);

        // Save to entries
        await upsertEntryRow(tx, writeBody, columns, entryId);

        console.log('buildAdjMorphologyRecord output:', buildAdjMorphologyRecord({ id: entryId, pos: entryPos }, writeBody));

        // Save to adj_morphology
        await syncAdjMorphology(tx, entryId, writeBody);

        // Save relationships
        await syncEntryRelationships(tx, entryId, writeBody);

        // Save tags
        await syncEntryTags(tx, entryId, writeBody.tags);

        // Save alternative forms
        await syncAlternativeForms(tx, entryId, writeBody);

        // Save phonetics
        if (Array.isArray(writeBody.phonetics)) {
            await tx.execute({ sql: 'DELETE FROM phonetics WHERE entry_id = ?', args: [entryId] });
            for (const ph of writeBody.phonetics) {
                if (!ph.ipa) continue;
                await tx.execute({
                    sql: `INSERT INTO phonetics (id, entry_id, ipa, dialect, notes) VALUES (?, ?, ?, ?, ?)`,
                    args: [uid(), entryId, ph.ipa, ph.dialect || 'Standard', ph.notes || null],
                });
            }
        }

        await tx.commit();
        console.log('Transaction committed successfully.');
    } catch (err) {
        console.error('Transaction failed, rolling back:', err);
        await tx.rollback();
        throw err;
    } finally {
        tx.close();
    }

    // 5. Query and Assert everything back
    console.log('Verifying written data...');

    const entryRow = await client.execute({
        sql: `SELECT e.id AS entry_id,
                     e.headword,
                     e.pos,
                     e.cv_pattern,
                     e.gender AS entry_gender,
                     e.root_consonants,
                     e.is_loanword,
                     e.is_inflectable AS entry_is_inflectable,
                     e.source_language,
                     e.source_id,
                     e.source_citation,
                     e.source_title,
                     e.source_year,
                     e.source_page,
                     e.source_publisher,
                     e.etymology_notes,
                     e.definitions,
                     e.usage_examples,
                     e.etymology_chain,
                     am.masculine_form,
                     am.feminine_form,
                     am.plural_form,
                     am.elative_form,
                     am.has_elative,
                     am.is_inflectable AS adj_is_inflectable,
                     am.dual_form,
                     am.dual_pattern,
                     am.vowel_set_dual,
                     am.diminutive_form,
                     am.diminutive_pattern,
                     am.elative_pattern,
                     am.gender AS adj_gender,
                     am.form_plural_pattern,
                     am.form_fem_pattern,
                     am.form_masc_pattern,
                     am.vowel_set_sg,
                     am.vowel_set_pl,
                     am.vowel_set_opp,
                     am.pattern
              FROM entries e
              LEFT JOIN adj_morphology am ON e.id = am.entry_id
              WHERE e.id = ?`,
        args: [entryId]
    });

    assert.equal(entryRow.rows.length, 1, 'Should find 1 row in joined entries and adj_morphology');
    const row = entryRow.rows[0];

    // Assert entries fields
    assert.equal(row.headword, 'kbir');
    assert.equal(row.pos, 'adjective');
    assert.equal(row.entry_gender, 'masculine');
    assert.equal(row.root_consonants, 'k-b-r');
    assert.equal(row.is_loanword, 0);
    assert.equal(row.entry_is_inflectable, 0); // Stripped from entries for adjectives
    assert.equal(row.source_language, 'Arabic');
    assert.equal(row.source_id, 'src-aquilina');
    assert.equal(row.source_citation, 'Maltese-English Dictionary (1987), p. 123');
    assert.equal(row.source_title, 'Maltese-English Dictionary');
    assert.equal(row.source_year, '1987');
    assert.equal(row.source_page, '123');
    assert.equal(row.source_publisher, 'Midsea Books');
    assert.equal(row.etymology_notes, 'Test etymology notes');

    // Assert JSON fields in entries
    const defs = JSON.parse(row.definitions);
    assert.equal(defs.length, 1);
    assert.equal(defs[0].text_en, 'extremely big');
    assert.equal(defs[0].text_mt, 'kbir ħafna');
    assert.equal(defs[0].register, 'formal');
    assert.equal(defs[0].nuance, 'size');

    const examples = JSON.parse(row.usage_examples);
    assert.equal(examples.length, 1);
    assert.equal(examples[0].text_en, 'He is big.');
    assert.equal(examples[0].text_mt, 'Huwa kbir.');

    const etyChain = JSON.parse(row.etymology_chain);
    assert.equal(etyChain.length, 1);
    assert.equal(etyChain[0].language, 'Arabic');
    assert.equal(etyChain[0].term, 'k-b-r');
    assert.equal(etyChain[0].definition, 'to be big');

    // Assert adj_morphology fields
    assert.equal(row.masculine_form, 'kbir');
    assert.equal(row.feminine_form, 'kbira');
    assert.deepEqual(JSON.parse(row.plural_form), [{ form: 'kbar', pattern: 'CCaC' }]);
    assert.equal(row.elative_form, 'ikbar');
    assert.equal(row.has_elative, 1);
    assert.equal(row.adj_is_inflectable, 1); // Stored in adj_morphology for adjectives
    assert.equal(row.dual_form, 'kbirotejn');
    assert.equal(row.dual_pattern, 'CCiCVtejn');
    assert.equal(row.vowel_set_dual, 'i-o');
    assert.equal(row.diminutive_form, 'kbejjer');
    assert.equal(row.diminutive_pattern, 'CCejCeC');
    assert.equal(row.elative_pattern, 'iCCaC');
    assert.equal(row.adj_gender, 'masculine');
    assert.equal(row.form_plural_pattern, 'CCaC');
    assert.equal(row.form_fem_pattern, 'CCiCa');
    assert.equal(row.form_masc_pattern, 'CCiC');
    assert.equal(row.vowel_set_sg, 'i');
    assert.equal(row.vowel_set_pl, 'a');
    assert.equal(row.vowel_set_opp, 'o');
    assert.equal(row.pattern, 'CCiC');
    assert.equal(row.cv_pattern, 'CCVC');

    // Assert tags
    const tagsRow = await client.execute({
        sql: `SELECT t.name FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE et.entry_id = ?`,
        args: [entryId]
    });
    const tagsList = tagsRow.rows.map(r => r.name).sort();
    assert.deepEqual(tagsList, ['adj', 'core', 'test']);

    // Assert alternative forms
    const altRow = await client.execute({
        sql: `SELECT headword, type FROM alternative_forms WHERE entry_id = ?`,
        args: [entryId]
    });
    assert.equal(altRow.rows.length, 1);
    assert.equal(altRow.rows[0].headword, 'kbirr');
    assert.equal(altRow.rows[0].type, 'orthographic');

    // Assert phonetics
    const phonRow = await client.execute({
        sql: `SELECT ipa, dialect, notes FROM phonetics WHERE entry_id = ?`,
        args: [entryId]
    });
    assert.equal(phonRow.rows.length, 1);
    assert.equal(phonRow.rows[0].ipa, '/kbiːr/');
    assert.equal(phonRow.rows[0].dialect, 'Standard');
    assert.equal(phonRow.rows[0].notes, 'Standard pronunciation');

    console.log('All assertions passed successfully! The adjective entry has been written and verified perfectly.');

    // 6. Cleanup
    console.log('Cleaning up test record...');
    await client.execute({
        sql: `DELETE FROM entries WHERE id = ?`,
        args: [entryId]
    });

    console.log('Cleanup completed successfully.');
    console.log('--- TEST FINISHED SUCCESSFULLY ---');
}

run().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
