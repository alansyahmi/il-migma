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
    console.log("--- Enforcing Admin Configuration Schema ---");
    
    // 1. Check for legacy table
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name='configs' OR name='admin_config')");
    const tableNames = tables.rows.map(r => r.name);
    
    if (tableNames.includes('configs') && !tableNames.includes('admin_config')) {
        console.log("Renaming 'configs' to 'admin_config'...");
        await db.execute("ALTER TABLE configs RENAME TO admin_config");
    } else if (tableNames.includes('configs') && tableNames.includes('admin_config')) {
        console.log("Both 'configs' and 'admin_config' exist. Merging 'configs' into 'admin_config'...");
        await db.execute("INSERT OR IGNORE INTO admin_config SELECT * FROM configs");
        await db.execute("DROP TABLE configs");
    }

    // 2. Enforce UNIQUE constraint and schema
    console.log("Enforcing canonical schema for 'admin_config'...");
    
    // Recreate to ensure UNIQUE(category, key) and consistent columns
    await db.execute("PRAGMA foreign_keys=OFF");
    await db.execute("BEGIN TRANSACTION");
    
    await db.execute(`CREATE TABLE IF NOT EXISTS admin_config_new (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(category, key)
    )`);
    
    const existing = await db.execute("SELECT * FROM admin_config");
    for (const row of existing.rows) {
        await db.execute({
            sql: "INSERT OR IGNORE INTO admin_config_new (id, category, key, value, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            args: [row.id, row.category, row.key, row.value, row.sort_order, row.created_at, row.updated_at]
        });
    }
    
    await db.execute("DROP TABLE IF EXISTS admin_config");
    await db.execute("ALTER TABLE admin_config_new RENAME TO admin_config");
    
    await db.execute("COMMIT");
    await db.execute("PRAGMA foreign_keys=ON");
    
    console.log("Schema enforcement complete.");
}

run().catch(console.error);
