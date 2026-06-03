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

const target = process.argv[2] || 'local';
const url = target === 'remote' ? vars.TURSO_URL : 'file:local.db';
const authToken = target === 'remote' ? vars.TURSO_AUTH_TOKEN : undefined;

if (!url) {
    console.error(`URL for ${target} missing`);
    process.exit(1);
}

const client = createClient({ url, authToken });
const columns = ['is_inflectable', 'elative_pattern'];

async function run() {
    console.log(`Cleaning noun_morphology on ${target} database at ${url}...`);

    const info = await client.execute('PRAGMA table_info(noun_morphology)');
    const existing = new Set(info.rows.map((row) => row.name));

    for (const column of columns) {
        if (!existing.has(column)) {
            console.log(`  ↷ ${column} already absent`);
            continue;
        }

        const sql = `ALTER TABLE noun_morphology DROP COLUMN ${column}`;
        console.log(`  Running: ${sql}`);
        await client.execute(sql);
        console.log(`  ✓ Dropped ${column}`);
    }

    console.log('Done.');
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
