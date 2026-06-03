
import { createClient } from '@libsql/client';
import fs from 'fs';

const varsFile = '.dev.vars';
let vars = {};
if (fs.existsSync(varsFile)) {
    vars = fs.readFileSync(varsFile, 'utf-8')
        .split('\n')
        .reduce((acc, line) => {
            const [key, ...vals] = line.split('=');
            if (key && vals) acc[key.trim()] = vals.join('=').trim();
            return acc;
        }, {});
}

const url = vars.TURSO_URL;
const authToken = vars.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
    const tables = ['entries', 'noun_morphology', 'adj_morphology', 'participle_morphology', 'numeral_morphology'];
    for (const table of tables) {
        console.log(`--- Table: ${table} ---`);
        try {
            const res = await client.execute(`PRAGMA table_info(${table})`);
            console.table(res.rows.map(r => ({ name: r.name, type: r.type })));
        } catch (e) {
            console.error(`Error: ${e.message}`);
        }
    }
    process.exit(0);
}

run();
