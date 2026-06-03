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

const legacyColumns = ['masculine_form', 'feminine_form', 'form_masc_pattern', 'form_fem_pattern'];

async function run() {
    console.log(`Migrating numeral_morphology on ${target} database at ${url}...`);

    const info = await client.execute('PRAGMA table_info(numeral_morphology)');
    const existing = new Set(info.rows.map((row) => row.name));

    if (!existing.has('form_attributive_short_pattern')) {
        console.log('  Adding form_attributive_short_pattern...');
        await client.execute('ALTER TABLE numeral_morphology ADD COLUMN form_attributive_short_pattern TEXT');
    }

    if (existing.has('form_masc_pattern')) {
        console.log('  Backfilling short-attributive pattern from form_masc_pattern...');
        await client.execute(`
            UPDATE numeral_morphology
            SET form_attributive_short_pattern = COALESCE(form_attributive_short_pattern, form_masc_pattern)
            WHERE form_attributive_short_pattern IS NULL OR TRIM(form_attributive_short_pattern) = ''
        `);
    }

    for (const column of legacyColumns) {
        if (!existing.has(column)) {
            console.log(`  ↷ ${column} already absent`);
            continue;
        }

        console.log(`  Dropping ${column}...`);
        await client.execute(`ALTER TABLE numeral_morphology DROP COLUMN ${column}`);
    }

    console.log('Done.');
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
