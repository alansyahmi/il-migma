import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_FILTERED_EXPORT_LIMIT,
    buildAdminCountQuery,
    buildAdminWhereClause,
    buildFilteredExportQueries,
    exportFilteredEntries,
} from '../functions/api/admin/entries.js';

test('buildFilteredExportQueries rejects unfiltered export requests', () => {
    assert.throws(
        () => buildFilteredExportQueries({}),
        (err) => err?.status === 400 && /At least one filter/i.test(err.message),
    );

    assert.throws(
        () => buildFilteredExportQueries({ pos: 'all', letter: 'all', auditStatus: 'all', q: '   ', ids: [] }),
        (err) => err?.status === 400,
    );
});

test('buildFilteredExportQueries caps limit at 250 and orders alphabetically', () => {
    const { listQuery, countQuery, limit, offset } = buildFilteredExportQueries({
        pos: 'numeral',
        letter: 'T',
        limit: 9999,
        offset: 500,
    });

    assert.equal(limit, MAX_FILTERED_EXPORT_LIMIT);
    assert.equal(limit, 250);
    assert.equal(offset, 500);
    assert.match(listQuery.sql, /ORDER BY e\.headword ASC\s+LIMIT \? OFFSET \?/i);
    assert.deepEqual(listQuery.args.slice(-2), [250, 500]);
    assert.ok(listQuery.args.includes('numeral'));
    assert.ok(!countQuery.sql.toLowerCase().includes('join'));
});

test('buildAdminWhereClause supports ids, q, letter, pos, and auditStatus filters', () => {
    const whereIds = buildAdminWhereClause({ ids: ['num_1', 'num_2', 'num_1'] });
    assert.match(whereIds.whereSql, /e\.id IN \(\?, \?\)/);
    assert.deepEqual(whereIds.args, ['num_1', 'num_2']);

    const whereActionNeeded = buildAdminWhereClause({ auditStatus: 'action-needed' });
    assert.equal(whereActionNeeded.hasFilter, true);
    assert.match(whereActionNeeded.whereSql, /json_extract\(e\.definitions, '\$\[0\]\.text_en'\)/);
    assert.match(whereActionNeeded.whereSql, /root_consonants/);

    const wherePartial = buildAdminWhereClause({ pos: 'verb', auditStatus: 'partial' });
    assert.match(wherePartial.whereSql, /LOWER\(TRIM\(e\.pos\)\) IN/);
    assert.match(wherePartial.whereSql, /EXISTS\s*\(/i);
    assert.match(wherePartial.whereSql, /verb_morphology vm_audit/i);

    const baseCount = buildAdminCountQuery({});
    assert.equal(baseCount.sql.trim(), 'SELECT COUNT(*) as total FROM entries e');
    assert.deepEqual(baseCount.args, []);
});

test('exportFilteredEntries executes bounded queries and hydrates entries + phonetics', async () => {
    const executedQueries = [];
    const mockClient = {
        async execute({ sql, args = [] }) {
            executedQueries.push({ sql, args });
            if (/SELECT COUNT\(\*\) as total/i.test(sql)) {
                return { rows: [{ total: 1 }] };
            }
            if (/FROM phonetics WHERE entry_id IN/i.test(sql)) {
                return {
                    rows: [
                        { entry_id: 'num-wiehed', ipa: '/ˈwɪː.ħɛt/', dialect: 'Standard', notes: null },
                    ],
                };
            }
            return {
                rows: [
                    {
                        id: 'num-wiehed',
                        headword: 'wieħed',
                        pos: 'numeral',
                        gender: 'masculine',
                        root_consonants: 'w-ħ-d',
                        definitions: JSON.stringify([{ text_en: 'one', text_mt: 'wieħed' }]),
                        usage_examples: JSON.stringify([{ mt: 'Darba waħda.', en: 'Once.' }]),
                        etymology_chain: JSON.stringify([{ relationship: 'From', language: 'Arabic', term: 'واحد' }]),
                        num_type: 'cardinal',
                        num_attr_short: 'wieħed',
                        num_attr_long: 'wieħed',
                        vm_form: null,
                        nm_gender: 'masculine',
                        am_plural: null,
                        pm_category: null,
                        s_class: null,
                        s_hybrid: 0,
                        s_suffix: 0,
                        source_name: 'Miklem',
                        source_full_title: 'Il-Miklem Malti',
                        source_author: null,
                        source_url: null,
                        rel_synonyms: '[]',
                        rel_antonyms: '[]',
                        rel_related: '[]',
                        rel_alternative_forms: '[]',
                        rel_tags: JSON.stringify(['cardinal']),
                    },
                ],
            };
        },
    };

    const result = await exportFilteredEntries(mockClient, {
        pos: 'numeral',
        limit: 250,
        offset: 0,
    });

    assert.equal(executedQueries.length, 3);
    assert.equal(result.total_matching, 1);
    assert.equal(result.total_entries, 1);
    assert.equal(result.limit, 250);
    assert.equal(result.offset, 0);
    assert.equal(result.has_more, false);
    assert.deepEqual(result.filters, { pos: 'numeral' });
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].id, 'num-wiehed');
    assert.equal(result.entries[0].headword, 'wieħed');
    assert.deepEqual(result.entries[0].phonetics, [
        { ipa: '/ˈwɪː.ħɛt/', dialect: 'Standard', notes: null },
    ]);
    assert.deepEqual(result.entries[0].tags, ['cardinal']);
    assert.equal(result.entries[0].numeral_morphology?.numeral_type, 'cardinal');
    for (const forbiddenKey of ['rel_tags', 'rel_synonyms', 'num_type', 'num_attr_short', 'vm_form', 'nm_gender', 'am_plural', 'pm_category', 's_class', 's_hybrid', 'source_name', 'source_full_title']) {
        assert.equal(forbiddenKey in result.entries[0], false, `Expected raw alias ${forbiddenKey} to be omitted`);
    }
});
