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
        console.log('--- 1. Querying entries table for adj-kbir-qa-test ---');
        const entryRes = await client.execute({
            sql: "SELECT * FROM entries WHERE id = ?",
            args: ['adj-kbir-qa-test']
        });
        console.log(entryRes.rows[0]);

        console.log('\n--- 2. Querying adj_morphology table for adj-kbir-qa-test ---');
        const morphRes = await client.execute({
            sql: "SELECT * FROM adj_morphology WHERE entry_id = ?",
            args: ['adj-kbir-qa-test']
        });
        console.log(morphRes.rows[0]);

        console.log('\n--- 3. Querying entry_relationships table for adj-kbir-qa-test ---');
        const relRes = await client.execute({
            sql: "SELECT * FROM entry_relationships WHERE entry_id = ?",
            args: ['adj-kbir-qa-test']
        });
        console.log(relRes.rows);

        console.log('\n--- 4. Querying alternative_forms table for adj-kbir-qa-test ---');
        const altRes = await client.execute({
            sql: "SELECT * FROM alternative_forms WHERE entry_id = ?",
            args: ['adj-kbir-qa-test']
        });
        console.log(altRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

run();
