
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
    console.log(`Adding stem columns to entries on ${url}...`);
    
    const statements = [
        "ALTER TABLE entries ADD COLUMN zokk_morphology TEXT",
        "ALTER TABLE entries ADD COLUMN stem TEXT",
        "ALTER TABLE entries ADD COLUMN zokk_class TEXT",
        "ALTER TABLE entries ADD COLUMN zokk_is_hybrid BOOLEAN DEFAULT false",
        "ALTER TABLE entries ADD COLUMN zokk_agentive_suffix TEXT"
    ];

    for (const sql of statements) {
        console.log(sql);
        try {
            await client.execute(sql);
            console.log("Success");
        } catch (e) {
            console.log(`Error or Skipped: ${e.message}`);
        }
    }
    
    console.log("Stem columns added.");
    process.exit(0);
}

run();
