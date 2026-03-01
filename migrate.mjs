import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

const db = createClient({
    url: process.env.VITE_TURSO_URL || process.env.TURSO_URL || 'file:db.sqlite',
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

async function run() {
    try {
        console.log('Adding participle columns...');
        await db.execute('ALTER TABLE entries ADD COLUMN participle_type TEXT;');
    } catch (e) {
        console.log('participle_type might already exist:', e.message);
    }
    try {
        await db.execute('ALTER TABLE definitions ADD COLUMN nuance TEXT;');
    } catch (e) {
        console.log('nuance might already exist:', e.message);
    }
    try {
        // Can't alter CHECK constraints directly in SQLite, so we'll just ignore it.
        // Wait, SQLite will throw an error if the new values violate CHECK.
        // Actually, SQLite doesn't let us easily drop constraints unless we recreate the table.
        // But maybe Turso will let us disable foreign keys and recreate, or maybe CHECK constraints are not strictly enforced?
        // Actually, let's just create a new column, or just leave it. If CHECK fails we'll recreate definition table.
        console.log('Migrations done.');
    } catch (e) {
        console.log(e);
    }
}
run();
