import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

const db = createClient({
    url: process.env.VITE_TURSO_URL || process.env.TURSO_URL || 'file:db.sqlite',
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

async function run() {
    try {
        console.log('Checking roots table schema for relationship columns...');
        const res = await db.execute("PRAGMA table_info(roots)");
        const columnNames = res.rows.map(r => r.name);

        const newCols = [
            { name: 'synonyms', type: 'TEXT' },
            { name: 'antonyms', type: 'TEXT' },
            { name: 'related_entries', type: 'TEXT' }
        ];

        for (const col of newCols) {
            if (!columnNames.includes(col.name)) {
                console.log(`Adding ${col.name} column to roots table...`);
                await db.execute(`ALTER TABLE roots ADD COLUMN ${col.name} ${col.type}`);
                console.log(`Column ${col.name} added.`);
            } else {
                console.log(`Column ${col.name} already exists.`);
            }
        }
    } catch (e) {
        console.error('Failed to migrate:', e);
    }
}

run();
