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
    const res = await client.execute("SELECT rowid, headword FROM entries_fts WHERE entries_fts MATCH 'kiesa*'");
    console.log("FTS Match:", res.rows);
    
    if (res.rows.length > 0) {
        const rowids = res.rows.map(r => r.rowid);
        const entriesRes = await client.execute(`SELECT rowid, headword FROM entries WHERE rowid IN (${rowids.join(',')})`);
        console.log("Entries at these rowids:", entriesRes.rows);
    }
    process.exit(0);
}
check();
