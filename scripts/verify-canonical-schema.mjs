import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
dotenv.config({ path: resolve(ROOT, '.env') });

const db = createClient({
    url: process.env.VITE_TURSO_URL || 'file:local.db',
    authToken: process.env.VITE_TURSO_AUTH_TOKEN,
});

async function run() {
    console.log("--- Verifying Canonical Schema ---");
    let errors = 0;

    const check = async (label, sql, validator) => {
        try {
            const res = await db.execute(sql);
            if (validator(res)) {
                console.log(`✅ ${label}`);
            } else {
                console.log(`❌ ${label}`);
                errors++;
            }
        } catch (e) {
            console.log(`❌ ${label} (Error: ${e.message})`);
            errors++;
        }
    };

    await check("Canonical table 'admin_config' exists", 
        "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_config'",
        (res) => res.rows.length === 1);

    await check("Legacy table 'configs' does NOT exist", 
        "SELECT name FROM sqlite_master WHERE type='table' AND name='configs'",
        (res) => res.rows.length === 0);

    await check("'admin_config' has UNIQUE(category, key) constraint", 
        "SELECT sql FROM sqlite_master WHERE name='admin_config'",
        (res) => res.rows[0].sql.includes("UNIQUE") && res.rows[0].sql.includes("category") && res.rows[0].sql.includes("key"));

    await check("'patterns' table exists", 
        "SELECT name FROM sqlite_master WHERE type='table' AND name='patterns'",
        (res) => res.rows.length === 1);

    await check("'pattern_applicability' table exists", 
        "SELECT name FROM sqlite_master WHERE type='table' AND name='pattern_applicability'",
        (res) => res.rows.length === 1);

    if (errors > 0) {
        console.log(`\nVerification failed with ${errors} errors.`);
        process.exit(1);
    } else {
        console.log("\nVerification successful! All canonical tables and constraints are in place.");
    }
}

run().catch(console.error);
