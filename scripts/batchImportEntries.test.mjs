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

test('processEntryBatch: successfully processes adjective entries without blocklist reference errors', async () => {
    const executedQueries = [];
    const txQueries = [];
    const mockClient = {
        execute: async (query) => {
            executedQueries.push(query);
            const sql = typeof query === 'string' ? query : query?.sql || '';
            if (sql.includes('PRAGMA table_info')) {
                return { rows: [{ name: 'id' }, { name: 'headword' }, { name: 'pos' }, { name: 'source_id' }] };
            }
            return { rows: [] };
        },
        transaction: async () => ({
            execute: async (query) => {
                txQueries.push(query);
                return { rows: [] };
            },
            commit: async () => {},
            rollback: async () => {},
        }),
    };

    const entries = [
        { id: 'adj-qrib', headword: 'qrib', pos: 'adjective', source_id: 'src-crowd' },
    ];

    const res = await processEntryBatch(mockClient, { entries });
    assert.equal(res.ok, true);
    assert.equal(res.total, 1);
    assert.equal(res.failed, 0);
    assert.equal(res.inserted, 1);
});

test('processEntryBatch: successfully ensures lexical sources and processes ta\' and permezz', async () => {
    const executedQueries = [];
    const txQueries = [];
    const mockClient = {
        execute: async (query) => {
            executedQueries.push(query);
            const sql = typeof query === 'string' ? query : query?.sql || '';
            if (sql.includes('PRAGMA table_info')) {
                return { rows: [{ name: 'id' }, { name: 'headword' }, { name: 'pos' }, { name: 'source_id' }] };
            }
            return { rows: [] };
        },
        transaction: async () => ({
            execute: async (query) => {
                txQueries.push(query);
                return { rows: [] };
            },
            commit: async () => {},
            rollback: async () => {},
        }),
    };

    const entries = [
        { id: 'prep-ta', headword: "ta'", pos: 'preposition', source_id: 'src-aquilina-1973' },
        { id: 'n-permezz', headword: 'permezz', pos: 'preposition', source_id: 'src-1000mcw' },
    ];

    const res = await processEntryBatch(mockClient, { entries });
    assert.equal(res.ok, true);
    assert.equal(res.total, 2);
    assert.equal(res.failed, 0);
    assert.equal(res.inserted, 2);

    // Verify ensureLexicalSources inserted known sources
    const lexicalSourceInserts = executedQueries.filter(q => (q?.sql || '').includes('INSERT OR IGNORE INTO lexical_sources'));
    assert.ok(lexicalSourceInserts.length > 0, 'Must ensure lexical sources');
});

test('processEntryBatch: successfully processes determiner entries with det prefix and determiner POS', async () => {
    const executedQueries = [];
    const txQueries = [];
    const mockClient = {
        execute: async (query) => {
            executedQueries.push(query);
            const sql = typeof query === 'string' ? query : query?.sql || '';
            if (sql.includes('PRAGMA table_info')) {
                return { rows: [{ name: 'id' }, { name: 'headword' }, { name: 'pos' }, { name: 'source_id' }] };
            }
            return { rows: [] };
        },
        transaction: async () => ({
            execute: async (query) => {
                txQueries.push(query);
                return { rows: [] };
            },
            commit: async () => {},
            rollback: async () => {},
        }),
    };

    const entries = [
        { id: 'det-dan', headword: 'dan', pos: 'determiner', source_id: 'src-aquilina-1973' },
        { id: 'det-dak', headword: 'dak', pos: 'determiner', source_id: 'src-aquilina-1973' },
        { id: 'det-kull', headword: 'kull', pos: 'determiner', source_id: 'src-1000mcw' },
    ];

    const res = await processEntryBatch(mockClient, { entries });
    assert.equal(res.ok, true);
    assert.equal(res.total, 3);
    assert.equal(res.failed, 0);
    assert.equal(res.inserted, 3);
});

test('processEntryBatch: safely maps gender common to neutral when table definition has legacy CHECK constraint', async () => {
    const executedQueries = [];
    const txQueries = [];
    const mockClient = {
        execute: async (query) => {
            executedQueries.push(query);
            const sql = typeof query === 'string' ? query : query?.sql || '';
            if (sql.includes('PRAGMA table_info')) {
                return { rows: [{ name: 'id' }, { name: 'headword' }, { name: 'pos' }, { name: 'gender' }] };
            }
            if (sql.includes('sqlite_master')) {
                return { rows: [{ sql: "CREATE TABLE entries (id TEXT, headword TEXT, pos TEXT, gender TEXT, CHECK (gender IN ('masculine','feminine','neutral')))" }] };
            }
            return { rows: [] };
        },
        transaction: async () => ({
            execute: async (query) => {
                txQueries.push(query);
                return { rows: [] };
            },
            commit: async () => {},
            rollback: async () => {},
        }),
    };

    const entries = [
        { id: 'pron-huma', headword: 'huma', pos: 'pronoun', gender: 'common' },
        { id: 'pron-jien', headword: 'jien', pos: 'pronoun', gender: 'common' },
    ];

    const res = await processEntryBatch(mockClient, { entries });
    assert.equal(res.ok, true);
    assert.equal(res.total, 2);
    assert.equal(res.failed, 0);
    assert.equal(res.inserted, 2);

    // Verify written gender was mapped to 'neutral' to satisfy SQLite check constraint
    const insertQueries = txQueries.filter(q => (q?.sql || '').includes('INSERT INTO entries'));
    assert.equal(insertQueries.length, 2);
    for (const q of insertQueries) {
        assert.ok(q.args.includes('neutral'), 'Must write neutral to satisfy legacy check constraint');
        assert.ok(!q.args.includes('common'), 'Must not pass common to legacy check constraint');
    }
});

