import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

let devVars = {};
if (fs.existsSync('.dev.vars')) {
    devVars = dotenv.parse(fs.readFileSync('.dev.vars'));
} else {
    devVars = process.env;
}

const db = createClient({
    url: devVars.TURSO_URL || 'file:local.db',
    authToken: devVars.TURSO_AUTH_TOKEN
});

async function run() {
    try {
        console.log('Adding verb_type column...');
        try {
            await db.execute('ALTER TABLE entries ADD COLUMN verb_type TEXT');
            console.log('✅ Added verb_type column to entries table');
        } catch (e) {
            if (e.message?.includes('duplicate column')) {
                console.log('ℹ️ verb_type already exists');
            } else {
                throw e;
            }
        }

        console.log('Updating verb_type for existing entries...');

        // quadriliteral: if class is explicitly quadriliteral OR root has 4+ consonants
        const resQuad = await db.execute(`
            UPDATE entries 
            SET verb_type = 'quadriliteral' 
            WHERE pos = 'verb' 
            AND (
                verb_class = 'quadriliteral' 
                OR (
                    root_consonants IS NOT NULL 
                    AND length(replace(root_consonants, '-', '')) >= 4
                )
            )
        `);
        console.log('✅ Updated quadriliteral verbs:', resQuad.rowsAffected);

        // Triliteral: everything else that is a verb
        const resTri = await db.execute(`
            UPDATE entries 
            SET verb_type = 'triliteral' 
            WHERE pos = 'verb' 
            AND verb_type IS NULL
        `);
        console.log('✅ Updated triliteral verbs:', resTri.rowsAffected);

    } catch (e) {
        console.error('❌ Migration failed:', e.message);
    }
}

run();
