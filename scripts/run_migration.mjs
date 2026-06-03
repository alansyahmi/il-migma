import { createClient } from '@libsql/client';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_TURSO_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing VITE_TURSO_URL or VITE_TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

const client = createClient({ url, authToken });

const migrationPath = 'db/migrations/20260427_normalize_pos_columns.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

// Split SQL by statements (basic splitter, assuming ; followed by newline)
const statements = sql
  .split(/;\s*$/m)
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Executing ${statements.length} statements from ${migrationPath}...`);

async function run() {
  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[${i+1}/${statements.length}] Executing statement...`);
      await client.execute(stmt);
    }
    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:");
    console.error(err);
    process.exit(1);
  } finally {
    client.close();
  }
}

run();
