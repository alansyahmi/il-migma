import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load .dev.vars
function loadDotDevVars() {
    const p = resolve(ROOT, '.dev.vars');
    if (!existsSync(p)) return {};
    const env = {};
    for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.trim().match(/^([A-Z_]+)=(.+)$/);
        if (m) env[m[1]] = m[2].trim();
    }
    return env;
}

const env = loadDotDevVars();
const url = env.TURSO_URL || 'file:local.db';
const authToken = env.TURSO_AUTH_TOKEN;

console.log(`Connecting to ${url}...`);
const client = createClient({ url, authToken });

async function run() {
    console.log('--- Phase 1: Creating Tables ---');
    
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

    await client.execute(`
        CREATE TABLE IF NOT EXISTS entry_relationships (
            id                TEXT PRIMARY KEY,
            entry_id          TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
            target_entry_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
            relationship_type TEXT NOT NULL CHECK(relationship_type IN ('synonym', 'antonym', 'related')),
            sort_order        INTEGER NOT NULL DEFAULT 0,
            created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            UNIQUE(entry_id, target_entry_id, relationship_type)
        )
    `);

    await client.execute(`
        CREATE TABLE IF NOT EXISTS alternative_forms (
            id            TEXT PRIMARY KEY,
            entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
            headword      TEXT NOT NULL,
            type          TEXT,
            sort_order    INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    `);

    console.log('--- Phase 2: Fetching Entries ---');
    const entries = await client.execute('SELECT id, tags, synonyms, antonyms, related_entries, alternative_forms FROM entries');
    console.log(`Found ${entries.rows.length} entries.`);

    for (const row of entries.rows) {
        const { id: entry_id, tags, synonyms, antonyms, related_entries, alternative_forms } = row;

        // 1. Tags
        if (tags) {
            try {
                const tagList = Array.isArray(tags) ? tags : JSON.parse(tags);
                for (const tag of tagList) {
                    const tag_id = tag.toLowerCase().trim().replace(/\s+/g, '-');
                    await client.execute({
                        sql: 'INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)',
                        args: [tag_id, tag]
                    });
                    await client.execute({
                        sql: 'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
                        args: [entry_id, tag_id]
                    });
                }
            } catch (e) {
                // Not JSON, maybe comma-separated
                const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
                for (const tag of tagList) {
                    const tag_id = tag.toLowerCase().trim().replace(/\s+/g, '-');
                    await client.execute({
                        sql: 'INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)',
                        args: [tag_id, tag]
                    });
                    await client.execute({
                        sql: 'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)',
                        args: [entry_id, tag_id]
                    });
                }
            }
        }

        // 2. Relationships
        const relMap = {
            synonym: synonyms,
            antonym: antonyms,
            related: related_entries
        };

        for (const [type, val] of Object.entries(relMap)) {
            if (val) {
                try {
                    const targets = JSON.parse(val);
                    for (const target of targets) {
                        const target_id = typeof target === 'string' ? target : target.id;
                        if (!target_id) continue;
                        
                        const rel_id = `rel_${entry_id}_${target_id}_${type}`;
                        await client.execute({
                            sql: 'INSERT OR IGNORE INTO entry_relationships (id, entry_id, target_entry_id, relationship_type) VALUES (?, ?, ?, ?)',
                            args: [rel_id, entry_id, target_id, type]
                        });
                    }
                } catch (e) { /* skip if invalid json */ }
            }
        }

        // 3. Alternative Forms
        if (alternative_forms) {
            try {
                const alts = JSON.parse(alternative_forms);
                for (const alt of alts) {
                    const headword = typeof alt === 'string' ? alt : alt.headword;
                    const type = typeof alt === 'string' ? null : alt.type;
                    if (!headword) continue;

                    const alt_id = `alt_${entry_id}_${headword.replace(/\s+/g, '_')}`;
                    await client.execute({
                        sql: 'INSERT OR IGNORE INTO alternative_forms (id, entry_id, headword, type) VALUES (?, ?, ?, ?)',
                        args: [alt_id, entry_id, headword, type]
                    });
                }
            } catch (e) { /* skip */ }
        }
    }

    console.log('--- Migration Complete ---');
}

run().catch(console.error);
