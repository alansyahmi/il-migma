
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Manual parsing of .dev.vars
const vars = fs.readFileSync('.dev.vars', 'utf-8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, ...vals] = line.split('=');
        if (key && vals) acc[key.trim()] = vals.join('=').trim();
        return acc;
    }, {});

const url = vars.TURSO_URL;
const authToken = vars.TURSO_AUTH_TOKEN;

if (!url) {
    console.error('TURSO_URL missing in .dev.vars');
    process.exit(1);
}

const client = createClient({ url, authToken });

const queries = [
    "ALTER TABLE entries ADD COLUMN adj_gender TEXT",
    "ALTER TABLE entries ADD COLUMN participle_gender TEXT",
    "ALTER TABLE entries ADD COLUMN verb_active_ptcp TEXT",
    "ALTER TABLE entries ADD COLUMN verb_vowel_impv TEXT",
    "ALTER TABLE entries ADD COLUMN verb_type TEXT",
    "ALTER TABLE entries ADD COLUMN synonyms TEXT",
    "ALTER TABLE entries ADD COLUMN antonyms TEXT",
    "ALTER TABLE entries ADD COLUMN related_entries TEXT",
    "ALTER TABLE entries ADD COLUMN is_inflectable INTEGER DEFAULT 1",
    "ALTER TABLE entries ADD COLUMN usage_example TEXT",
    "ALTER TABLE entries ADD COLUMN usage_example_en TEXT"
];

async function run() {
    for (const sql of queries) {
        console.log(`Running: ${sql}`);
        try {
            await client.execute(sql);
            console.log(`Success.`);
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.warn(`Column already exists, skipping.`);
            } else {
                console.error(`Error: ${e.message}`);
            }
        }
    }
    process.exit(0);
}

run();
