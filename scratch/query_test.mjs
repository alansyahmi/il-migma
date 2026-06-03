import { createClient } from '@libsql/client';
import fs from 'fs';

const devVars = fs.readFileSync('.dev.vars', 'utf8');
const env = {};
devVars.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
});

const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });

async function test() {
    try {
        console.log("Querying entries...");
        const resEntries = await client.execute({
            sql: "SELECT * FROM entries WHERE headword = 'troubleshootadj'",
            args: []
        });
        console.log("Entries:", JSON.stringify(resEntries.rows, null, 2));

        console.log("Querying adj_morphology...");
        const resMorph = await client.execute({
            sql: "SELECT * FROM adj_morphology WHERE entry_id LIKE '%troubleshootadj'",
            args: []
        });
        console.log("adj_morphology:", JSON.stringify(resMorph.rows, null, 2));
    } catch (e) {
        console.error("Query failed:", e.message);
    }
    process.exit(0);
}
test();
