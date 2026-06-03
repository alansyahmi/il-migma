
import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { validateAndNormalize } from '../functions/api/admin/configSchema.js';

function loadDotDevVars() {
    const p = '.dev.vars';
    if (!existsSync(p)) return;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.trim().match(/^([A-Z_]+)=(.+)$/);
        if (m) process.env[m[1]] = m[2].trim();
    }
}
loadDotDevVars();

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.error("No TURSO_URL found in .dev.vars");
    process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
    console.log("Starting Pattern Migration on Turso...");

    // 1. Create tables
    console.log("Ensuring tables exist...");
    await client.execute(`CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        cv_notation TEXT,
        wizen_notation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.execute(`CREATE TABLE IF NOT EXISTS pattern_applicability (
        id TEXT PRIMARY KEY,
        pattern_id TEXT REFERENCES patterns(id) ON DELETE CASCADE,
        category TEXT,
        pos TEXT,
        stress INTEGER,
        is_active BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Fetch all patterns from admin_config
    const patternCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'adjective_pattern'];
    const placeholders = patternCategories.map(() => '?').join(',');
    const res = await client.execute({
        sql: `SELECT * FROM admin_config WHERE category IN (${placeholders})`,
        args: patternCategories
    });

    console.log(`Found ${res.rows.length} rows to migrate.`);

    for (const row of res.rows) {
        try {
            const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            const normalized = validateAndNormalize(row.category, val);
            
            const cv = normalized.cv;
            const wizen = normalized.wizen;
            const patternId = Buffer.from(`${cv}|${wizen}`).toString('base64').replace(/=/g, '');

            // Insert pattern if not exists
            await client.execute({
                sql: `INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation) VALUES (?, ?, ?)`,
                args: [patternId, cv, wizen]
            });

            // Insert applicability for each POS
            const posTypes = normalized.pos_types.length > 0 ? normalized.pos_types : ['all'];
            for (const pos of posTypes) {
                const appId = `${patternId}_${row.category}_${pos}`;
                await client.execute({
                    sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order)
                          VALUES (?, ?, ?, ?, ?, ?)`,
                    args: [appId, patternId, row.category, pos, normalized.stress, row.sort_order]
                });
            }
            console.log(`  Migrated: [${row.category}] ${row.key}`);
            
            // Clean up old row
            await client.execute({ sql: `DELETE FROM admin_config WHERE id = ?`, args: [row.id] });
        } catch (e) {
            console.warn(`  Skipped ${row.key}: ${e.message}`);
        }
    }

    console.log("\nMigration complete!");
}

run().catch(console.error);
