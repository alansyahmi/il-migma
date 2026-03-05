import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

const devVars = dotenv.parse(fs.readFileSync('.dev.vars'));

const db = createClient({
    url: devVars.TURSO_URL,
    authToken: devVars.TURSO_AUTH_TOKEN
});

async function run() {
    try {
        await db.execute('ALTER TABLE entries ADD COLUMN verb_weak_class TEXT');
        console.log('✅ Added verb_weak_class column to remote entries table');
    } catch (e) {
        if (e.message?.includes('duplicate column')) {
            console.log('ℹ️  verb_weak_class already exists, skipping');
        } else {
            console.error('❌ Migration failed:', e.message);
        }
    }
}

run();
