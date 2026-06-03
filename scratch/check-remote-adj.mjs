import { createClient } from '@libsql/client';
import fs from 'fs';

const devVars = fs.readFileSync('.dev.vars', 'utf8');
const env = {};
devVars.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
});

const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });

async function run() {
    try {
        console.log('Querying table info for adj_morphology...');
        const res = await client.execute("PRAGMA table_info(adj_morphology)");
        console.log('Columns:');
        console.log(res.rows.map(r => ({ name: r.name, type: r.type })));
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

run();
