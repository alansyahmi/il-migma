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
const url = 'file:local.db';
const authToken = env.TURSO_AUTH_TOKEN;

console.log(`Pruning entries table on ${url}...`);
const client = createClient({ url, authToken });

async function run() {
    console.log('--- Phase 1: Recreating entries table ---');
    
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

    console.log('--- Phase 2: Migrating data ---');
    await client.execute(`
        INSERT INTO entries_new (
            id, headword, pos, gender, root_consonants, stem, 
            is_loanword, source_language, source_id, created_at, updated_at
        )
        SELECT 
            id, headword, pos, gender, root_consonants, stem, 
            is_loanword, source_language, source_id, created_at, updated_at
        FROM entries
    `);

    console.log('--- Phase 3: Swapping tables ---');
    // We need to be careful with foreign keys. 
    // SQLite doesn't let us drop a table if it's referenced by others unless we disable FKs.
    await client.execute('PRAGMA foreign_keys = OFF');
    await client.execute('DROP TABLE entries');
    await client.execute('ALTER TABLE entries_new RENAME TO entries');
    await client.execute('PRAGMA foreign_keys = ON');

    console.log('--- Phase 4: Recreating Indices ---');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_headword ON entries(headword)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_pos ON entries(pos)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_gender ON entries(gender)');

    console.log('--- Pruning Complete ---');
}

run().catch(console.error);
