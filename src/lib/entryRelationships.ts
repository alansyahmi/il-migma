/**
 * src/lib/entryRelationships.ts
 * Logic for managing normalized entry relationships (synonyms, antonyms, related).
 */

export const RELATIONSHIP_TYPES = ['synonym', 'antonym', 'related'] as const;
export type RelationshipType = typeof RELATIONSHIP_TYPES[number];

export interface RelationshipInput {
    id?: string; // target entry id or relationship id? Usually target entry id in the UI.
    target_id: string;
    type: RelationshipType;
    sort_order?: number;
}

export async function ensureRelationshipsTable(client: any) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS entry_relationships (
            id TEXT PRIMARY KEY,
            entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
            target_entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
            relationship_type TEXT NOT NULL CHECK(relationship_type IN ('synonym', 'antonym', 'related')),
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            UNIQUE(entry_id, target_entry_id, relationship_type)
        )
    `);
}

/**
 * Syncs relationships for an entry.
 * Deletes old relationships and inserts new ones.
 */
export async function syncEntryRelationships(client: any, entryId: string, payload: any) {
    const relationships: RelationshipInput[] = [];

    // Extract from possible payload structures
    if (Array.isArray(payload.synonyms)) {
        payload.synonyms.forEach((s: any) => {
            const targetId = typeof s === 'string' ? s : (s.id || s.target_id);
            if (targetId) relationships.push({ target_id: targetId, type: 'synonym' });
        });
    }
    if (Array.isArray(payload.antonyms)) {
        payload.antonyms.forEach((a: any) => {
            const targetId = typeof a === 'string' ? a : (a.id || a.target_id);
            if (targetId) relationships.push({ target_id: targetId, type: 'antonym' });
        });
    }
    if (Array.isArray(payload.related_entries)) {
        payload.related_entries.forEach((r: any) => {
            const targetId = typeof r === 'string' ? r : (r.id || r.target_id);
            if (targetId) relationships.push({ target_id: targetId, type: 'related' });
        });
    }

    if (relationships.length === 0 && !payload.force_sync_relationships) {
        // If we want to allow clearing relationships, we should check if they are explicitly provided as empty arrays
        const hasExplicitKeys = 'synonyms' in payload || 'antonyms' in payload || 'related_entries' in payload;
        if (!hasExplicitKeys) return;
    }

    // Delete existing
    await client.execute({
        sql: "DELETE FROM entry_relationships WHERE entry_id = ?",
        args: [entryId]
    });

    // Insert new
    if (relationships.length > 0) {
        for (let i = 0; i < relationships.length; i++) {
            const rel = relationships[i];
            const id = `rel_${entryId}_${rel.target_id}_${rel.type}`;
            await client.execute({
                sql: `INSERT OR REPLACE INTO entry_relationships 
                      (id, entry_id, target_entry_id, relationship_type, sort_order) 
                      VALUES (?, ?, ?, ?, ?)`,
                args: [id, entryId, rel.target_id, rel.type, i]
            });
        }
    }
}

/**
 * Backfills relationships from the JSON columns in the entries table.
 */
export async function backfillRelationships(client: any) {
    // Check if legacy columns exist
    const tableInfo = await client.execute("PRAGMA table_info(entries)");
    const hasSyn = tableInfo.rows.some((r: any) => r.name === 'synonyms');
    if (!hasSyn) {
        console.log("Legacy relationship columns missing; skipping backfill.");
        return;
    }

    const entries = await client.execute("SELECT id, synonyms, antonyms, related_entries FROM entries");
    console.log(`Backfilling relationships for ${entries.rows.length} entries...`);

    for (const row of entries.rows) {
        await syncEntryRelationships(client, row.id as string, {
            synonyms: parseJson(row.synonyms),
            antonyms: parseJson(row.antonyms),
            related_entries: parseJson(row.related_entries),
            force_sync_relationships: true
        });
    }
}

function parseJson(val: any) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
        return JSON.parse(val);
    } catch {
        return [];
    }
}
