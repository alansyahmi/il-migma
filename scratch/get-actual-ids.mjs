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
        console.log("Fetching some entries...");
        const res = await client.execute({
            sql: `SELECT id, headword, pos FROM entries LIMIT 10`,
            args: []
        });
        console.log("Entries in DB:");
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Headword: ${r.headword}, POS: ${r.pos}`);
        });
    } catch (e) {
        console.error("Query failed:", e);
    }
    process.exit(0);
}
check();
