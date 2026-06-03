import { createClient } from '@libsql/client';
import fs from 'fs';

const devVars = fs.readFileSync('.dev.vars', 'utf8');
const env = {};
devVars.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
});

const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });

async function check() {
    try {
        console.log("Checking n-ghammiel-qa-test entry...");
        const resEntry = await client.execute({
            sql: `SELECT * FROM entries WHERE id = ?`,
            args: ['n-ghammiel-qa-test']
        });
        if (resEntry.rows.length > 0) {
            console.log("ENTRY RECORD:");
            console.log(JSON.stringify(resEntry.rows[0], null, 2));
        } else {
            console.log("Entry not found.");
            process.exit(1);
        }

        console.log("\nChecking noun_morphology record...");
        const resMorph = await client.execute({
            sql: `SELECT * FROM noun_morphology WHERE entry_id = ?`,
            args: ['n-ghammiel-qa-test']
        });
        if (resMorph.rows.length > 0) {
            console.log("NOUN MORPHOLOGY RECORD:");
            console.log(JSON.stringify(resMorph.rows[0], null, 2));
        } else {
            console.log("Noun morphology not found.");
        }

        console.log("\nChecking alternative forms...");
        const resAlt = await client.execute({
            sql: `SELECT * FROM alternative_forms WHERE entry_id = ?`,
            args: ['n-ghammiel-qa-test']
        });
        console.log(`Alt Forms found: ${resAlt.rows.length}`);
        resAlt.rows.forEach(r => console.log(r));

        console.log("\nChecking entry relationships...");
        const resRel = await client.execute({
            sql: `SELECT * FROM entry_relationships WHERE entry_id = ? OR target_entry_id = ?`,
            args: ['n-ghammiel-qa-test', 'n-ghammiel-qa-test']
        });
        console.log(`Relationships found: ${resRel.rows.length}`);
        resRel.rows.forEach(r => console.log(r));

    } catch (e) {
        console.error("Query failed:", e);
    }
    process.exit(0);
}
check();
