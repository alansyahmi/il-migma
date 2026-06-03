import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({ 
    url: process.env.VITE_TURSO_URL, 
    authToken: process.env.VITE_TURSO_AUTH_TOKEN 
});

const statements = [
    "ALTER TABLE adj_morphology ADD COLUMN form_plural_pattern TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN form_fem_pattern TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN form_masc_pattern TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN vowel_set_sg TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN vowel_set_pl TEXT",
    "ALTER TABLE adj_morphology ADD COLUMN vowel_set_opp TEXT",
    "ALTER TABLE participle_morphology ADD COLUMN form_plural_pattern TEXT",
    "ALTER TABLE participle_morphology ADD COLUMN form_fem_pattern TEXT",
    "ALTER TABLE participle_morphology ADD COLUMN form_masc_pattern TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN form_plural_pattern TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN form_fem_pattern TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN form_masc_pattern TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN vowel_set_sg TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN vowel_set_pl TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN vowel_set_opp TEXT",
    "ALTER TABLE numeral_morphology ADD COLUMN vowel_set_dual TEXT"
];

async function run() {
    for (const sql of statements) {
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
