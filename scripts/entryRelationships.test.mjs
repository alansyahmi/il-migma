import assert from 'node:assert/strict';
import {
    syncEntryRelationships,
    syncReciprocalNumeralRelatedRelationships,
} from '../src/lib/entryRelationships.ts';

class FakeClient {
    constructor(entries) {
        this.entries = new Map(entries.map((entry) => [entry.id, entry]));
        this.relationships = [];
    }

    async execute(query) {
        const sql = typeof query === 'string' ? query : query.sql;
        const args = typeof query === 'string' ? [] : (query.args || []);
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();

        if (normalizedSql.startsWith('SELECT id FROM entries WHERE LOWER(TRIM(pos)) =')) {
            const ids = new Set(args.map(String));
            return {
                rows: [...this.entries.values()]
                    .filter((entry) => entry.pos === 'numeral' && ids.has(entry.id))
                    .map((entry) => ({ id: entry.id })),
            };
        }

        if (normalizedSql.startsWith('DELETE FROM entry_relationships WHERE entry_id =')) {
            const entryId = String(args[0]);
            this.relationships = this.relationships.filter((rel) => rel.entry_id !== entryId);
            return { rows: [] };
        }

        if (
            normalizedSql.startsWith('DELETE FROM entry_relationships WHERE target_entry_id =')
            || normalizedSql.startsWith('DELETE FROM entry_relationships WHERE target_entry_id =')
            || normalizedSql.includes('WHERE target_entry_id = ? AND relationship_type =')
        ) {
            const targetEntryId = String(args[0]);
            const keepIds = new Set(args.slice(1).map(String));
            this.relationships = this.relationships.filter((rel) => {
                const isCandidate = rel.target_entry_id === targetEntryId
                    && rel.relationship_type === 'related'
                    && this.entries.get(rel.entry_id)?.pos === 'numeral';
                if (!isCandidate) return true;
                return keepIds.size > 0 && keepIds.has(rel.entry_id);
            });
            return { rows: [] };
        }

        if (normalizedSql.startsWith('INSERT OR REPLACE INTO entry_relationships')) {
            const [id, entryId, targetEntryId] = args.map(String);
            const relationshipType = normalizedSql.includes("VALUES (?, ?, ?, 'related', ?)")
                ? 'related'
                : String(args[3]);
            const sortOrder = normalizedSql.includes("VALUES (?, ?, ?, 'related', ?)")
                ? Number(args[3] || 0)
                : Number(args[4] || 0);
            this.relationships = this.relationships.filter((rel) => rel.id !== id);
            this.relationships.push({
                id,
                entry_id: entryId,
                target_entry_id: targetEntryId,
                relationship_type: relationshipType,
                sort_order: sortOrder,
            });
            return { rows: [] };
        }

        throw new Error(`Unhandled SQL in fake client: ${normalizedSql}`);
    }

    has(entryId, targetEntryId) {
        return this.relationships.some((rel) => (
            rel.entry_id === entryId
            && rel.target_entry_id === targetEntryId
            && rel.relationship_type === 'related'
        ));
    }
}

const entries = [
    { id: 'num-erbgħa', pos: 'numeral' },
    { id: 'num-erbat', pos: 'numeral' },
    { id: 'num-raba', pos: 'numeral' },
    { id: 'noun-kwart', pos: 'noun' },
];

{
    const client = new FakeClient(entries);
    const payload = {
        pos: 'numeral',
        related_entries: [{ id: 'num-erbat' }],
    };

    await syncEntryRelationships(client, 'num-erbgħa', payload);
    await syncReciprocalNumeralRelatedRelationships(client, 'num-erbgħa', payload);

    assert.equal(client.has('num-erbgħa', 'num-erbat'), true, 'base numeral should link to derived numeral');
    assert.equal(client.has('num-erbat', 'num-erbgħa'), true, 'derived numeral should link back to base numeral');
}

{
    const client = new FakeClient(entries);
    client.relationships.push(
        { id: 'rel_num-erbat_num-erbgħa_related', entry_id: 'num-erbat', target_entry_id: 'num-erbgħa', relationship_type: 'related', sort_order: 0 },
        { id: 'rel_num-raba_num-erbgħa_related', entry_id: 'num-raba', target_entry_id: 'num-erbgħa', relationship_type: 'related', sort_order: 1 },
    );

    const payload = {
        pos: 'numeral',
        related_entries: [{ id: 'num-raba' }],
    };

    await syncEntryRelationships(client, 'num-erbgħa', payload);
    await syncReciprocalNumeralRelatedRelationships(client, 'num-erbgħa', payload);

    assert.equal(client.has('num-raba', 'num-erbgħa'), true, 'kept derived numeral should remain reciprocal');
    assert.equal(client.has('num-erbat', 'num-erbgħa'), false, 'stale reciprocal numeral link should be removed');
}

{
    const client = new FakeClient(entries);
    const payload = {
        pos: 'noun',
        related_entries: [{ id: 'num-erbat' }],
    };

    await syncEntryRelationships(client, 'noun-kwart', payload);
    await syncReciprocalNumeralRelatedRelationships(client, 'noun-kwart', payload);

    assert.equal(client.has('num-erbat', 'noun-kwart'), false, 'non-numeral saves should not mirror related links');
}

{
    const client = new FakeClient(entries);
    const payload = {
        pos: 'numeral',
        related_entries: [
            { id: 'num-erbgħa' },
            { id: 'noun-kwart' },
            { id: 'missing-entry' },
        ],
    };

    await syncEntryRelationships(client, 'num-erbgħa', payload);
    await syncReciprocalNumeralRelatedRelationships(client, 'num-erbgħa', payload);

    assert.equal(client.has('num-erbgħa', 'num-erbgħa'), false, 'self links should be removed by reciprocal numeral cleanup');
    assert.equal(client.has('noun-kwart', 'num-erbgħa'), false, 'non-numeral targets should not receive reverse numeral links');
    assert.equal(client.has('missing-entry', 'num-erbgħa'), false, 'missing targets should not receive reverse numeral links');
}

console.log('entryRelationships.test.mjs passed');
