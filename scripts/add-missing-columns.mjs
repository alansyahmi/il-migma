
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Manual parsing of .dev.vars
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

// Support both local and remote
const remoteUrl = vars.TURSO_URL;
const remoteToken = vars.TURSO_AUTH_TOKEN;
const localUrl = 'file:local.db';

const target = process.argv[2] || 'local'; // 'local' or 'remote'
const url = target === 'remote' ? remoteUrl : localUrl;
const authToken = target === 'remote' ? remoteToken : undefined;

if (!url) {
    console.error(`URL for ${target} missing`);
    process.exit(1);
}

console.log(`Targeting ${target} database at ${url}`);

const client = createClient({ url, authToken });

const columnsToAdd = [
    'vowel_set_opp',
    'vowel_set_dual',
    'lemma_pattern',
    'form_fem_pattern',
    'form_masc_pattern',
    'form_plural_pattern',
    'dual_pattern',
    'diminutive_pattern',
    'elative_pattern',
    'numeral_type',
    'form_attributive_short',
    'form_attributive_long',
    'form_opposite'
];

async function run() {
    for (const col of columnsToAdd) {
        const sql = `ALTER TABLE entries ADD COLUMN ${col} TEXT`;
        console.log(`Running: ${sql}`);
        try {
            await client.execute(sql);
            console.log(`Success.`);
        } catch (e) {
            if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
                console.warn(`Column ${col} already exists, skipping.`);
            } else {
                console.error(`Error adding ${col}: ${e.message}`);
            }
        }
    }
    console.log('Migration finished.');
    process.exit(0);
}

run();
