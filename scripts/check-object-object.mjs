import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({ 
    url: process.env.VITE_TURSO_URL, 
    authToken: process.env.VITE_TURSO_AUTH_TOKEN 
});

async function run() {
    try {
        const res = await client.execute("SELECT entry_id, plural_form FROM adj_morphology WHERE plural_form LIKE '%[object%' LIMIT 5");
        console.log("Adjective matches:");
        console.log(res.rows);

        const res2 = await client.execute("SELECT entry_id, plural_forms FROM noun_morphology WHERE plural_forms LIKE '%[object%' LIMIT 5");
        console.log("Noun matches:");
        console.log(res2.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
