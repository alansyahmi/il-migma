import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({ 
    url: process.env.VITE_TURSO_URL, 
    authToken: process.env.VITE_TURSO_AUTH_TOKEN 
});

async function run() {
    try {
        const tables = ['entries', 'noun_morphology', 'adj_morphology', 'verb_morphology', 'participle_morphology', 'numeral_morphology'];
        for (const table of tables) {
            console.log(`--- Table: ${table} ---`);
            const res = await client.execute(`PRAGMA table_info(${table})`);
            console.log(res.rows.map(r => r.name).join(', '));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
