/**
 * Migration: Add missing vowel_set columns to noun_morphology and verb_morphology.
 *
 * Context: These columns were removed from `entries` and now live in sub-tables.
 * The `distinct.js` API queries these sub-tables for vowel set suggestions.
 *
 * Run:
 *   node scripts/add-noun-vowel-sets.mjs local
 *   node scripts/add-noun-vowel-sets.mjs remote
 */

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

console.log(`Targeting ${target} database at ${url}`);
const client = createClient({ url, authToken });

const migrations = [
    // noun_morphology vowel sets (singular, opposite-gender, dual, plural)
    { table: 'noun_morphology', column: 'vowel_set_sg',   type: 'TEXT' },
    { table: 'noun_morphology', column: 'vowel_set_opp',  type: 'TEXT' },
    { table: 'noun_morphology', column: 'vowel_set_dual', type: 'TEXT' },
    { table: 'noun_morphology', column: 'vowel_set_pl',   type: 'TEXT' },
    // noun_morphology morpho-pattern columns
    { table: 'noun_morphology', column: 'form_plural_pattern',  type: 'TEXT' },
    { table: 'noun_morphology', column: 'form_fem_pattern',     type: 'TEXT' },
    { table: 'noun_morphology', column: 'form_masc_pattern',    type: 'TEXT' },
    { table: 'noun_morphology', column: 'dual_pattern',         type: 'TEXT' },
    { table: 'noun_morphology', column: 'diminutive_pattern',   type: 'TEXT' },
    { table: 'noun_morphology', column: 'paucal_form',          type: 'TEXT' },
    { table: 'noun_morphology', column: 'augmentative_form',    type: 'TEXT' },
    { table: 'noun_morphology', column: 'paucal_pattern',       type: 'TEXT' },
    { table: 'noun_morphology', column: 'augmentative_pattern', type: 'TEXT' },
    // verb_morphology — impv may be missing on some DBs
    { table: 'verb_morphology', column: 'vowel_set_impv', type: 'TEXT' },
    { table: 'verb_morphology', column: 'is_imala_blocked', type: 'BOOLEAN' },
];

async function run() {
    for (const { table, column, type } of migrations) {
        const sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`;
        console.log(`Running: ${sql}`);
        try {
            await client.execute(sql);
            console.log(`  ✓ Added ${table}.${column}`);
        } catch (e) {
            if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
                console.warn(`  ↷ ${table}.${column} already exists, skipping.`);
            } else {
                console.error(`  ✗ Error: ${e.message}`);
            }
        }
    }
    console.log('\nMigration finished.');
    process.exit(0);
}

run();
