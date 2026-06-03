import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({ 
    url: process.env.VITE_TURSO_URL, 
    authToken: process.env.VITE_TURSO_AUTH_TOKEN 
});

async function run() {
    try {
        // 1. Find corrupted adjective entries
        const res = await client.execute("SELECT entry_id, plural_form FROM adj_morphology WHERE plural_form LIKE '%[object%'");
        console.log(`Found ${res.rows.length} corrupted adjective entries.`);

        for (const row of res.rows) {
            console.log(`Cleaning up ${row.entry_id}...`);
            // Usually this happens when a JSON array was stringified incorrectly.
            // If we can't recover the data, it's better to clear it than leave [object Object].
            await client.execute({
                sql: "UPDATE adj_morphology SET plural_form = NULL WHERE entry_id = ?",
                args: [row.entry_id]
            });
        }

        // 2. Find corrupted noun entries
        const res2 = await client.execute("SELECT entry_id, plural_forms FROM noun_morphology WHERE plural_forms LIKE '%[object%'");
        console.log(`Found ${res2.rows.length} corrupted noun entries.`);

        for (const row of res2.rows) {
            console.log(`Cleaning up ${row.entry_id}...`);
            await client.execute({
                sql: "UPDATE noun_morphology SET plural_forms = NULL WHERE entry_id = ?",
                args: [row.entry_id]
            });
        }

        console.log("Cleanup finished.");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
