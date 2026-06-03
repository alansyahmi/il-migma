
import { createClient } from '@libsql/client';
import fs from 'fs';

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

const url = vars.TURSO_URL;
const authToken = vars.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("TURSO_URL or TURSO_AUTH_TOKEN missing in .dev.vars");
    process.exit(1);
}

const client = createClient({ url, authToken });

const statements = [
    // Noun Morphology (Boolean flags & Patterns)
    "ALTER TABLE noun_morphology ADD COLUMN is_collective BOOLEAN DEFAULT false",
    "ALTER TABLE noun_morphology ADD COLUMN is_singulative BOOLEAN DEFAULT false",
    "ALTER TABLE noun_morphology ADD COLUMN is_inflectable_singular BOOLEAN DEFAULT false",
    "ALTER TABLE noun_morphology ADD COLUMN is_inflectable_plural BOOLEAN DEFAULT false",
    "ALTER TABLE noun_morphology ADD COLUMN feminine_form TEXT",
    "ALTER TABLE noun_morphology ADD COLUMN masculine_form TEXT",
    "ALTER TABLE noun_morphology ADD COLUMN paucal_pattern TEXT",
    "ALTER TABLE noun_morphology ADD COLUMN augmentative_pattern TEXT",
    
    // Adj Morphology
    "ALTER TABLE adj_morphology ADD COLUMN masculine_form TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN feminine_form TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN plural_form TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN elative_form TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN elative_pattern TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN pattern TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN is_inflectable BOOLEAN DEFAULT false",
    
    // Participle Morphology
    "ALTER TABLE participle_morphology ADD COLUMN is_inflectable BOOLEAN DEFAULT false",
    
    // Numeral Morphology
    "ALTER TABLE numeral_morphology ADD COLUMN numeral_type TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN form_attributive_short TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN form_attributive_long TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN form_attributive_short_pattern TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN ordinal_form TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN adverbial_form TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN fractional_form TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN multiplier_form TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN distributive_form TEXT",
    
    // FTS Table (Repair)
    "DROP TABLE IF EXISTS entries_fts",
    "CREATE VIRTUAL TABLE entries_fts USING fts5(headword, content='entries', content_rowid='rowid')",
    "INSERT INTO entries_fts(entries_fts) VALUES('rebuild')",
    "DROP TRIGGER IF EXISTS entries_ai",
    "DROP TRIGGER IF EXISTS entries_ad",
    "DROP TRIGGER IF EXISTS entries_au",
    "CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword); END",
    "CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword); END",
    "CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword); INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword); END"
];

async function run() {
    console.log(`Connecting to ${url}...`);
    for (const sql of statements) {
        console.log(`Executing: ${sql}`);
        try {
            await client.execute(sql);
            console.log("Success.");
        } catch (e) {
            if (e.message.includes("already exists") || e.message.includes("duplicate column name")) {
                console.warn("Already exists, skipping.");
            } else {
                console.error(`Error: ${e.message}`);
            }
        }
    }
    console.log("All migrations finished.");
    process.exit(0);
}

run();
