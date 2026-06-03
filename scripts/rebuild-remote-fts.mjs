import { createClient } from '@libsql/client';
import fs from 'fs';

const devVars = fs.readFileSync('.dev.vars', 'utf8');
const env = {};
devVars.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
});

const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });

async function rebuild() {
    try {
        console.log("Dropping old FTS table...");
        await client.execute("DROP TRIGGER IF EXISTS entries_ai");
        await client.execute("DROP TRIGGER IF EXISTS entries_ad");
        await client.execute("DROP TRIGGER IF EXISTS entries_au");
        await client.execute("DROP TABLE IF EXISTS entries_fts");
        
        console.log("Creating new FTS table...");
        // We include headword for now to restore functionality. 
        // In the future we might add more columns.
        await client.execute(`
            CREATE VIRTUAL TABLE entries_fts USING fts5(
                headword,
                content='entries'
            )
        `);
        
        console.log("Populating FTS table...");
        await client.execute("INSERT INTO entries_fts(rowid, headword) SELECT rowid, headword FROM entries");
        
        console.log("Adding triggers to keep FTS in sync...");
        await client.execute(`
            CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
                INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword);
            END;
        `);
        await client.execute(`
            CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
                INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword);
            END;
        `);
        await client.execute(`
            CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN
                INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword);
                INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword);
            END;
        `);
        
        console.log("Success! FTS table rebuilt and triggers added.");
    } catch (e) {
        console.error("Failed to rebuild FTS:", e.message);
    }
    process.exit(0);
}
rebuild();
