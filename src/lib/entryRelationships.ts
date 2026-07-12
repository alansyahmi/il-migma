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
        const targetIds = Array.from(new Set(relationships.map(r => r.target_id)));
        const existingTargets = new Set<string>();
        if (targetIds.length > 0) {
            const placeholders = targetIds.map(() => '?').join(', ');
            const res = await client.execute({
                sql: `SELECT id FROM entries WHERE id IN (${placeholders})`,
                args: targetIds
            });
            if (res.rows) {
                res.rows.forEach((row: any) => {
                    const idVal = row.id ?? row[0];
                    if (idVal) existingTargets.add(String(idVal));
                });
            }
        }

        let insertedCount = 0;
        for (let i = 0; i < relationships.length; i++) {
            const rel = relationships[i];
            if (!existingTargets.has(rel.target_id)) {
                // Skip target IDs that do not exist to prevent SQLITE_CONSTRAINT foreign key failures
                continue;
            }
            const id = `rel_${entryId}_${rel.target_id}_${rel.type}`;
            await client.execute({
                sql: `INSERT OR REPLACE INTO entry_relationships 
                      (id, entry_id, target_entry_id, relationship_type, sort_order) 
                      VALUES (?, ?, ?, ?, ?)`,
                args: [id, entryId, rel.target_id, rel.type, insertedCount++]
            });
        }
    }
}

function normalizeRelatedTargetIds(payload: any): string[] {
    if (!Array.isArray(payload?.related_entries)) return [];

    const seen = new Set<string>();
    const ids: string[] = [];
    payload.related_entries.forEach((item: any) => {
        const targetId = String(typeof item === 'string' ? item : (item?.id || item?.target_id) || '').trim();
        if (!targetId || seen.has(targetId)) return;
        seen.add(targetId);
        ids.push(targetId);
    });
    return ids;
}

function isNumeralPayload(payload: any): boolean {
    const pos = String(payload?.pos || payload?.numeral_morphology?.pos || '').toLowerCase().trim();
    return pos === 'numeral';
}

/**
 * Mirrors numeral related-entry links so derived numeral pages can navigate
 * back to their base form without requiring a manual reverse edit.
 */
export async function syncReciprocalNumeralRelatedRelationships(client: any, entryId: string, payload: any) {
    if (!isNumeralPayload(payload) || !Array.isArray(payload?.related_entries)) return;

    const requestedTargetIds = normalizeRelatedTargetIds(payload).filter((targetId) => targetId !== entryId);
    const placeholders = requestedTargetIds.map(() => '?').join(', ');
    let validTargetIds = new Set<string>();

    if (requestedTargetIds.length > 0) {
        const res = await client.execute({
            sql: `SELECT id FROM entries WHERE LOWER(TRIM(pos)) = 'numeral' AND id IN (${placeholders})`,
            args: requestedTargetIds,
        });
        validTargetIds = new Set((res.rows || []).map((row: any) => String(row.id)).filter(Boolean));
    }

    const keepIds = [...validTargetIds];
    if (keepIds.length > 0) {
        await client.execute({
            sql: `DELETE FROM entry_relationships
                  WHERE target_entry_id = ?
                    AND relationship_type = 'related'
                    AND entry_id IN (SELECT id FROM entries WHERE LOWER(TRIM(pos)) = 'numeral')
                    AND entry_id NOT IN (${keepIds.map(() => '?').join(', ')})`,
            args: [entryId, ...keepIds],
        });
    } else {
        await client.execute({
            sql: `DELETE FROM entry_relationships
                  WHERE target_entry_id = ?
                    AND relationship_type = 'related'
                    AND entry_id IN (SELECT id FROM entries WHERE LOWER(TRIM(pos)) = 'numeral')`,
            args: [entryId],
        });
    }

    for (let i = 0; i < keepIds.length; i++) {
        const targetId = keepIds[i];
        await client.execute({
            sql: `INSERT OR REPLACE INTO entry_relationships
                  (id, entry_id, target_entry_id, relationship_type, sort_order)
                  VALUES (?, ?, ?, 'related', ?)`,
            args: [`rel_${targetId}_${entryId}_related`, targetId, entryId, i],
        });
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
        return;
    }

    const entries = await client.execute("SELECT id, synonyms, antonyms, related_entries FROM entries");

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
