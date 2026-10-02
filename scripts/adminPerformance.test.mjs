import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminListQuery, buildAdminCountQuery } from '../functions/api/admin/entries.js';

test('Admin Performance: buildAdminListQuery produces lightweight projection without heavy morphology or relationship joins', () => {
    const { sql, args } = buildAdminListQuery({ q: 'kiteb', pos: 'verb', limit: 50, offset: 0 });

    // 1. Must query entries
    assert.match(sql, /FROM entries e/i, 'List query must query from entries e');

    // 2. Must NOT include heavy morphology, relationship joins, or unneeded auxiliary tables
    const forbiddenJoins = [
        'noun_morphology',
        'adj_morphology',
        'participle_morphology',
        'numeral_morphology',
        'entry_relationships',
        'phonetics',
        'attestation_reliability',
        'roots',
        'patterns'
    ];
    for (const table of forbiddenJoins) {
        assert.ok(
            !sql.toLowerCase().includes(table.toLowerCase()),
            `List query must NOT join ${table} (found in query)`
        );
    }

    // 3. Must project lightweight fields
    assert.match(sql, /e\.id/i);
    assert.match(sql, /e\.headword/i);
    assert.match(sql, /e\.pos/i);
    assert.match(sql, /e\.root_consonants/i);
    assert.match(sql, /text_en/i);

    // 4. Must parameterize search and POS
    assert.ok(args.includes('verb'), 'args must include pos filter');
    assert.ok(args.includes(50), 'args must include limit');
    assert.ok(args.includes(0), 'args must include offset');
});

test('Admin Performance: buildAdminCountQuery has zero joins', () => {
    const { sql, args } = buildAdminCountQuery({ q: 'dar', pos: 'noun' });

    // 1. Must be a direct count from entries
    assert.match(sql, /^SELECT COUNT\(\*\) as total FROM entries e WHERE/i);

    // 2. Must NOT join ANY table
    assert.ok(!sql.toLowerCase().includes('join'), 'Count query must have zero joins');

    // 3. Must parameterize arguments
    assert.ok(args.includes('noun'), 'args must include pos filter');
});

test('Admin Performance: buildAdminListQuery handles default parameters safely', () => {
    const { sql, args } = buildAdminListQuery({});

    assert.match(sql, /LIMIT \? OFFSET \?/i);
    // Default limit is 50, offset is 0
    assert.deepEqual(args, [50, 0]);
});

test('Admin Performance: buildAdminCountQuery with empty filter returns clean base count', () => {
    const { sql, args } = buildAdminCountQuery({});

    assert.equal(sql.trim(), 'SELECT COUNT(*) as total FROM entries e');
    assert.deepEqual(args, []);
});

test('Admin Performance: buildAdminListQuery and buildAdminCountQuery support letter filtering', () => {
    const listRes = buildAdminListQuery({ letter: 'F', limit: 15, offset: 0 });
    assert.match(listRes.sql, /LTRIM\(e\.headword/i);
    assert.ok(listRes.args.includes(15), 'limit should be 15');
    assert.ok(listRes.args.includes(0), 'offset should be 0');

    const countRes = buildAdminCountQuery({ letter: 'Għ' });
    assert.match(countRes.sql, /WHERE/i);
    assert.match(countRes.sql, /għ%/i);

    const gRes = buildAdminCountQuery({ letter: 'G' });
    assert.match(gRes.sql, /NOT/i); // excludes għ and ġ
});

