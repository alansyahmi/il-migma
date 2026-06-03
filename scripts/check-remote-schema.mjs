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
    const res = await client.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('noun_morphology', 'lexical_sources')");
    res.rows.forEach(row => {
        console.log(`Table: ${row.name}`);
        console.log(row.sql);
        console.log('---');
    });
    process.exit(0);
}
check();
