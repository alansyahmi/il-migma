/**
 * src/lib/entryTags.ts
 * Logic for managing normalized entry tags.
 */

export async function ensureTagsTables(client: any) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS tags (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL UNIQUE,
            category      TEXT,
            description   TEXT,
            created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    `);

    await client.execute(`
        CREATE TABLE IF NOT EXISTS entry_tags (
            entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
            tag_id        TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (entry_id, tag_id)
        )
    `);
}

/**
 * Syncs tags for an entry.
 * Deletes old mappings and inserts new ones.
 * Automatically creates missing tags in the 'tags' table.
 */
export async function syncEntryTags(client: any, entryId: string, tags: string[] | string | null) {
    let tagList: string[] = [];
    
    if (Array.isArray(tags)) {
        tagList = tags;
    } else if (typeof tags === 'string') {
        if (tags.startsWith('[')) {
            try {
                tagList = JSON.parse(tags);
            } catch {
                tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
            }
        } else {
            tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        }
    }

    // Delete existing mappings
    await client.execute({
        sql: "DELETE FROM entry_tags WHERE entry_id = ?",
        args: [entryId]
    });

    if (tagList.length === 0) return;

    for (const tag of tagList) {
        if (!tag) continue;
        const tag_id = tag.toLowerCase().trim().replace(/\s+/g, '-');
        
        // Ensure tag exists
        await client.execute({
            sql: "INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)",
            args: [tag_id, tag]
        });

        // Link tag
        await client.execute({
            sql: "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
            args: [entryId, tag_id]
        });
    }
}
