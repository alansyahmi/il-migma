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

console.log(`🚀 Starting FINAL normalization on ${url}...`);
const client = createClient({ url, authToken });

async function run() {
    console.log('\n--- Phase 1: Setup Tables ---');
    
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

    // Ensure source_id exists for migration
    const tableInfo = await client.execute("PRAGMA table_info(entries)");
    if (!tableInfo.rows.some(r => r.name === 'source_id')) {
        await client.execute("ALTER TABLE entries ADD COLUMN source_id TEXT REFERENCES lexical_sources(id)");
    }

    console.log('\n--- Phase 2: Metadata Migration ---');
    const entries = await client.execute('SELECT id, tags, synonyms, antonyms, related_entries, alternative_forms, source_title FROM entries');
    console.log(`Processing ${entries.rows.length} entries...`);

    // Fetch sources for source_id backfill
    const sources = await client.execute("SELECT id, name FROM lexical_sources");
    const sourceMap = Object.fromEntries(sources.rows.map(s => [s.name.toLowerCase(), s.id]));

    for (const row of entries.rows) {
        const { id: entry_id, tags, synonyms, antonyms, related_entries, alternative_forms, source_title } = row;

        // 1. Backfill source_id
        if (source_title) {
            const sid = sourceMap[source_title.toLowerCase()];
            if (sid) {
                await client.execute({
                    sql: "UPDATE entries SET source_id = ? WHERE id = ?",
                    args: [sid, entry_id]
                });
            }
        }

        // 2. Tags
        if (tags) {
            try {
                const tagList = Array.isArray(tags) ? tags : JSON.parse(tags);
                for (const tag of tagList) {
                    const tag_id = tag.toLowerCase().trim().replace(/\s+/g, '-');
                    await client.execute({ sql: 'INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', args: [tag_id, tag] });
                    await client.execute({ sql: 'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)', args: [entry_id, tag_id] });
                }
            } catch (e) {
                const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
                for (const tag of tagList) {
                    const tag_id = tag.toLowerCase().trim().replace(/\s+/g, '-');
                    await client.execute({ sql: 'INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', args: [tag_id, tag] });
                    await client.execute({ sql: 'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)', args: [entry_id, tag_id] });
                }
            }
        }

        // 3. Relationships
        const relMap = { synonym: synonyms, antonym: antonyms, related: related_entries };
        for (const [type, val] of Object.entries(relMap)) {
            if (val) {
                try {
                    const targets = typeof val === 'string' ? JSON.parse(val) : val;
                    for (const target of targets) {
                        const target_id = typeof target === 'string' ? target : (target.id || target.target_id);
                        if (!target_id) continue;
                        const rel_id = `rel_${entry_id}_${target_id}_${type}`;
                        await client.execute({
                            sql: 'INSERT OR IGNORE INTO entry_relationships (id, entry_id, target_entry_id, relationship_type) VALUES (?, ?, ?, ?)',
                            args: [rel_id, entry_id, target_id, type]
                        });
                    }
                } catch (e) { }
            }
        }

        // 4. Alternative Forms
        if (alternative_forms) {
            try {
                const alts = typeof alternative_forms === 'string' ? JSON.parse(alternative_forms) : alternative_forms;
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
            } catch (e) { }
        }
    }

    console.log('\n--- Phase 3: Pruning Table ---');
    await client.execute('DROP TABLE IF EXISTS entries_new');
    await client.execute(`
        CREATE TABLE entries_new (
            id                    TEXT PRIMARY KEY,
            headword              TEXT NOT NULL,
            pos                   TEXT NOT NULL,
            gender                TEXT CHECK(gender IN ('masculine','feminine','neutral')),
            root_consonants       TEXT,
            stem                  TEXT,
            is_loanword           BOOLEAN NOT NULL DEFAULT false,
            source_language       TEXT,
            source_id             TEXT REFERENCES lexical_sources(id),
            created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    `);

    await client.execute(`
        INSERT INTO entries_new (
            id, headword, pos, gender, root_consonants, stem, 
            is_loanword, source_language, source_id, created_at, updated_at
        )
        SELECT 
            id, headword, pos, 
            CASE 
                WHEN lower(gender) IN ('masculine', 'masc', 'm') THEN 'masculine'
                WHEN lower(gender) IN ('feminine', 'fem', 'f') THEN 'feminine'
                WHEN lower(gender) IN ('neutral', 'neut', 'n') THEN 'neutral'
                ELSE NULL 
            END,
            root_consonants, stem, 
            is_loanword, source_language, source_id, created_at, updated_at
        FROM entries
    `);

    await client.execute('PRAGMA foreign_keys = OFF');
    await client.execute('DROP TABLE entries');
    await client.execute('ALTER TABLE entries_new RENAME TO entries');
    await client.execute('PRAGMA foreign_keys = ON');

    await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_headword ON entries(headword)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_pos ON entries(pos)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_gender ON entries(gender)');

    console.log('\n✅ ALL NORMALIZATION COMPLETE!');
}

run().catch(console.error);
