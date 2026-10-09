import test from 'node:test';
import assert from 'node:assert/strict';
import { processEntryBatch } from '../functions/api/admin/entries.js';

test('processEntryBatch: handles empty array cleanly', async () => {
    const mockClient = { execute: async () => ({ rows: [] }) };
    const res = await processEntryBatch(mockClient, { entries: [] });
    assert.equal(res.ok, true);
    assert.equal(res.total, 0);
    assert.equal(res.inserted, 0);
});

test('processEntryBatch: flags invalid entries with missing headword or pos without aborting', async () => {
    const executedSql = [];
    const mockClient = {
        execute: async ({ sql } = {}) => {
            executedSql.push(sql || '');
            if (typeof sql === 'string' && sql.includes('PRAGMA table_info')) {
                return { rows: [{ name: 'id' }, { name: 'headword' }, { name: 'pos' }] };
            }
            return { rows: [] };
        },
        transaction: async () => ({
            execute: async () => ({ rows: [] }),
            commit: async () => {},
            rollback: async () => {},
        }),
    };

    const entries = [
        { headword: '', pos: 'noun' }, // invalid: empty headword
        { headword: 'valid', pos: '' }, // invalid: empty pos
        { invalid: true }, // invalid: no headword or pos
    ];

    const res = await processEntryBatch(mockClient, { entries });
    assert.equal(res.ok, true);
    assert.equal(res.total, 3);
    assert.equal(res.failed, 3);
    assert.equal(res.errors.length, 3);
});

test('processEntryBatch: executes single prefetch query and respects skipExisting', async () => {
    const executedQueries = [];
    const mockClient = {
        execute: async (query) => {
            executedQueries.push(query);
            const sql = typeof query === 'string' ? query : query?.sql || '';
            if (sql.includes('PRAGMA table_info')) {
                return { rows: [{ name: 'id' }, { name: 'headword' }, { name: 'pos' }] };
            }
            if (sql.includes('SELECT id, headword, pos FROM entries WHERE')) {
                // Pretend 'hu' (pronoun) already exists in database with id 'pron-hu-existing'
                return {
                    rows: [{ id: 'pron-hu-existing', headword: 'hu', pos: 'pronoun' }]
                };
            }
            return { rows: [] };
        },
        transaction: async () => ({
            execute: async () => ({ rows: [] }),
            commit: async () => {},
            rollback: async () => {},
        }),
    };

    const entries = [
        { id: 'pron-hu', headword: 'hu', pos: 'pronoun' },
    ];

    // Case 1: skipExisting: true
    const skipRes = await processEntryBatch(mockClient, { entries, skipExisting: true });
    assert.equal(skipRes.skipped, 1);
    assert.equal(skipRes.updated, 0);
    assert.equal(skipRes.inserted, 0);
    assert.equal(skipRes.failed, 0);

    // Verify prefetch was executed
    const prefetchQuery = executedQueries.find(q => (q?.sql || q).includes('SELECT id, headword, pos FROM entries WHERE'));
    assert.ok(prefetchQuery, 'Must execute batch prefetch query');
});
