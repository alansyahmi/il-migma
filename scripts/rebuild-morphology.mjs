
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
    console.log(`REBUILDING Morphology Tables on ${url}...`);
    
    const drop = [
        "DROP TABLE IF EXISTS noun_morphology",
        "DROP TABLE IF EXISTS adj_morphology",
        "DROP TABLE IF EXISTS participle_morphology",
        "DROP TABLE IF EXISTS numeral_morphology"
    ];
    
    const create = [
        `CREATE TABLE noun_morphology (
            entry_id TEXT PRIMARY KEY,
            gender TEXT,
            noun_type TEXT,
            verbal_form TEXT,
            singular_form TEXT,
            plural_forms TEXT,
            sound_plural TEXT,
            dual_form TEXT,
            diminutive_form TEXT,
            collective_form TEXT,
            singulative_form TEXT,
            paucal_form TEXT,
            augmentative_form TEXT,
            paucal_pattern TEXT,
            augmentative_pattern TEXT,
            feminine_form TEXT,
            masculine_form TEXT,
            is_collective BOOLEAN DEFAULT false,
            is_singulative BOOLEAN DEFAULT false,
            is_inflectable_singular BOOLEAN DEFAULT false,
            is_inflectable_plural BOOLEAN DEFAULT false,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )`,
        `CREATE TABLE adj_morphology (
            entry_id TEXT PRIMARY KEY,
            masculine_form TEXT,
            feminine_form TEXT,
            plural_form TEXT,
            elative_form TEXT,
            elative_pattern TEXT,
            pattern TEXT,
            gender TEXT,
            is_inflectable BOOLEAN DEFAULT false,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )`,
        `CREATE TABLE participle_morphology (
            entry_id TEXT PRIMARY KEY,
            type TEXT,
            gender TEXT,
            verbal_form TEXT,
            is_inflectable BOOLEAN DEFAULT false,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )`,
        `CREATE TABLE numeral_morphology (
            entry_id TEXT PRIMARY KEY,
            numeral_type TEXT,
            form_attributive_short TEXT,
            form_attributive_long TEXT,
            form_attributive_short_pattern TEXT,
            ordinal_form TEXT,
            adverbial_form TEXT,
            fractional_form TEXT,
            multiplier_form TEXT,
            distributive_form TEXT,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )`
    ];

    for (const sql of drop) {
        console.log(sql);
        await client.execute(sql);
    }
    for (const sql of create) {
        console.log(sql);
        await client.execute(sql);
    }
    
    console.log("Rebuild complete.");
    process.exit(0);
}

run();
