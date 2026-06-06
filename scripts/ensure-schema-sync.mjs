
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

const remoteUrl = vars.TURSO_URL;
const remoteToken = vars.TURSO_AUTH_TOKEN;
const localUrl = 'file:local.db';

const target = process.argv[2] || 'local';
const url = target === 'remote' ? remoteUrl : localUrl;
const authToken = target === 'remote' ? remoteToken : undefined;

if (!url) {
    console.error(`URL for ${target} missing`);
    process.exit(1);
}

console.log(`Syncing ${target} database at ${url}...`);
const client = createClient({ url, authToken });

const SCHEMA_EXPECTATIONS = {
    entries: [
        'verb_class', 'verb_transitivity', 'verb_perfective_3sgm', 'verb_imperfective_3sgm',
        'verb_verbal_noun', 'verb_vowel_perf', 'verb_vowel_impf', 'verb_vowel_impv',
        'verb_active_ptcp', 'verb_passive_ptcp', 'verb_form', 'verb_type', 'verb_weak_class',
        'elative_form', 'participle_type', 'numeral_type', 'form_attributive_short',
        'form_attributive_long', 'numeral_ordinal', 'numeral_adverbial', 'numeral_fractional',
        'numeral_multiplier', 'numeral_distributive', 'source_citation', 'source_title',
        'source_year', 'source_page', 'source_publisher', 'etymology_chain', 'etymology_notes',
        'source_display', 'source_tooltip', 'cv_pattern', 'morph_pattern', 'sound_suffix',
        'zokk_morphology', 'stem', 'zokk_class', 'zokk_is_hybrid', 'zokk_agentive_suffix',
        'is_inflectable', 'definitions', 'usage_examples'
    ],
    noun_morphology: [
        'gender', 'noun_type', 'singular_form', 'plural_forms', 'sound_plural', 'dual_form',
        'diminutive_form', 'collective_form', 'singulative_form', 'paucal_form', 'augmentative_form',
        'paucal_pattern', 'augmentative_pattern', 'feminine_form', 'masculine_form', 'is_collective',
        'is_singulative', 'is_inflectable_singular', 'is_inflectable_plural', 'vowel_set_sg', 'vowel_set_opp', 'vowel_set_dual',
        'vowel_set_pl', 'form_plural_pattern', 'form_fem_pattern', 'form_masc_pattern',
        'dual_pattern', 'diminutive_pattern'
    ],
    verb_morphology: [
        'form', 'class', 'weak_class', 'transitivity', 'perfective_3sgm', 'imperfective_3sgm',
        'verbal_noun', 'active_participle', 'passive_participle', 'vowel_set_perf',
        'vowel_set_impf', 'vowel_set_impv', 'type', 'is_imala_blocked'
    ],
    adj_morphology: [
        'masculine_form', 'feminine_form', 'plural_form', 'elative_form', 'elative_pattern',
        'pattern', 'gender', 'is_inflectable'
    ],
    participle_morphology: [
        'type', 'gender', 'is_inflectable'
    ],
    numeral_morphology: [
        'numeral_type', 'form_attributive_short', 'form_attributive_long', 'feminine_form',
        'masculine_form', 'ordinal_form', 'adverbial_form', 'fractional_form', 'multiplier_form',
        'distributive_form', 'form_attributive_short_pattern', 'is_inflectable'
    ]
};

async function ensureTable(tableName) {
    const tableQueries = {
        numeral_morphology: `
            CREATE TABLE IF NOT EXISTS numeral_morphology (
                entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
                numeral_type TEXT,
                form_attributive_short TEXT,
                form_attributive_long TEXT,
                form_attributive_short_pattern TEXT,
                ordinal_form TEXT,
                adverbial_form TEXT,
                fractional_form TEXT,
                multiplier_form TEXT,
                distributive_form TEXT,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                is_inflectable BOOLEAN DEFAULT false
            )
        `,
        // Add others if needed, but the rest usually exist
    };

    if (tableQueries[tableName]) {
        console.log(`Ensuring table exists: ${tableName}`);
        await client.execute(tableQueries[tableName]);
    }
}

async function syncTable(tableName, expectedColumns) {
    await ensureTable(tableName);
    console.log(`Checking table columns: ${tableName}`);
    const info = await client.execute(`PRAGMA table_info(${tableName})`);
    const existingColumns = new Set(info.rows.map(r => r.name));

    for (const col of expectedColumns) {
        if (!existingColumns.has(col)) {
            const colType = col.startsWith('is_') ? 'BOOLEAN DEFAULT false' : 'TEXT';
            const sql = `ALTER TABLE ${tableName} ADD COLUMN ${col} ${colType}`;
            console.log(`  Running: ${sql}`);
            try {
                await client.execute(sql);
                console.log(`  Success.`);
            } catch (e) {
                console.error(`  Error adding ${col} to ${tableName}: ${e.message}`);
            }
        }
    }
}

async function run() {
    try {
        for (const [table, cols] of Object.entries(SCHEMA_EXPECTATIONS)) {
            await syncTable(table, cols);
        }
        console.log('\nAll tables synchronized successfully.');
    } catch (e) {
        console.error('Fatal error during sync:', e);
    } finally {
        process.exit(0);
    }
}

run();
