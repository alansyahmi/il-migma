import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

const db = createClient({
    url: process.env.VITE_TURSO_URL || process.env.TURSO_URL || 'file:db.sqlite',
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

async function run() {
    try {
        console.log('Checking roots table schema...');
        const res = await db.execute("PRAGMA table_info(roots)");
        console.log('Columns:', res.rows.map(r => r.name).join(', '));

        const columnNames = res.rows.map(r => r.name);
        if (!columnNames.includes('is_geminate')) {
            console.log('Adding is_geminate column to roots table...');
            await db.execute("ALTER TABLE roots ADD COLUMN is_geminate INTEGER DEFAULT 0");
            console.log('Column added.');
        } else {
            console.log('is_geminate column already exists.');
        }
    } catch (e) {
        console.error('Failed:', e);
    }
}

run();
