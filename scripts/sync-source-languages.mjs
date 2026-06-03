/**
 * Il-Miġma' — Source Language Precision Migration
 * ---------------------------------------------
 * Syncs the 'source_language' field with the first language in the etymology chain.
 * This ensures that if etymology says "Italian", the source_language is also "Italian".
 *
 * Usage:
 *   node scripts/sync-source-languages.mjs
 */

import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load environment variables
config({ path: resolve(ROOT, '.env') });
config({ path: resolve(ROOT, '.dev.vars') }); // Fallback for some local setups

const db = createClient({
    url: process.env.VITE_TURSO_URL || process.env.TURSO_URL,
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

async function main() {
    console.log("🚀 Starting Source Language Precision Sync...");

        // 1. Fetch entries that have etymology data stored on the entries row
        const res = await db.execute(`
                SELECT e.id, e.headword, e.source_language, e.etymology_chain AS chain
                FROM entries e
                WHERE e.etymology_chain IS NOT NULL
                    AND e.etymology_chain != ''
                    AND e.etymology_chain != '[]'
        `);

    console.log(`🔍 Found ${res.rows.length} entries with etymology chains.`);

    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const row of res.rows) {
        let ety;
        try {
            // Robust parsing for JSON or legacy strings
            const raw = String(row.chain || '').trim();
            if (raw.startsWith('[') || raw.startsWith('{')) {
                ety = JSON.parse(raw);
            } else {
                // Not a JSON chain, skip
                unchangedCount++;
                continue;
            }
        } catch (e) {
            console.warn(`  ⚠️  [${row.headword}] Failed to parse chain:`, e.message);
            errorCount++;
            continue;
        }

        const chain = Array.isArray(ety) ? ety : [ety];
        if (chain.length === 0) {
            unchangedCount++;
            continue;
        }

        // Get the language from the first step
        const firstLang = (chain[0].language || chain[0].source_language || '').trim();
        
        if (!firstLang) {
            unchangedCount++;
            continue;
        }

        // Only update if they differ
        const currentLang = (row.source_language || '').trim();
        
        if (firstLang !== currentLang) {
            console.log(`  ✨ [${row.headword}] Syncing: "${currentLang || 'NULL'}" → "${firstLang}"`);
            try {
                await db.execute({
                    sql: `UPDATE entries SET source_language = ? WHERE id = ?`,
                    args: [firstLang, row.id]
                });
                updatedCount++;
            } catch (e) {
                console.error(`  ❌ [${row.headword}] Update failed:`, e.message);
                errorCount++;
            }
        } else {
            unchangedCount++;
        }
    }

    console.log("\n" + "═".repeat(40));
    console.log("✅ Sync Complete!");
    console.log(`   Updated:   ${updatedCount}`);
    console.log(`   Unchanged: ${unchangedCount}`);
    console.log(`   Errors:    ${errorCount}`);
    console.log("═".repeat(40));
}

main().catch(err => {
    console.error("💥 Fatal Error:", err);
    process.exit(1);
});
