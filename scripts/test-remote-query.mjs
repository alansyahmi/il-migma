import { createClient } from '@libsql/client';
import fs from 'fs';

const devVars = fs.readFileSync('.dev.vars', 'utf8');
const env = {};
devVars.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
});

const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });

const ENTRY_MORPHOLOGY_SELECT = `
nm.is_collective AS nm_is_collective,
nm.is_singulative AS nm_is_singulative,
ls.publisher AS source_publisher
`;

const ENTRY_MORPHOLOGY_JOINS = `
LEFT JOIN noun_morphology nm ON nm.entry_id = e.id
LEFT JOIN lexical_sources ls ON e.source_id = ls.id
`;

async function test() {
    try {
        const sql = `
            SELECT e.*, ${ENTRY_MORPHOLOGY_SELECT}
            FROM entries e
            ${ENTRY_MORPHOLOGY_JOINS}
            LIMIT 1
        `;
        const res = await client.execute(sql);
        console.log("Success!");
        console.log(res.rows[0]);
    } catch (e) {
        console.error("Test failed:", e.message);
    }
    process.exit(0);
}
test();
