import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client/web';

function readEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !line.startsWith('#')).map((line) => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function quoteValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replaceAll("'", "''")}'`;
}

const env = readEnv(await fs.readFile('.dev.vars', 'utf8'));
const url = env.TURSO_URL || env.VITE_TURSO_URL;
const authToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error('Missing Turso connection variables in .dev.vars');

const requested = process.argv[2] || new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const outputDir = path.resolve('backups', requested);
await fs.mkdir(outputDir, { recursive: true });
const db = createClient({ url, authToken });

const tableRows = await db.execute("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
const tables = tableRows.rows;
const chunks = ['PRAGMA foreign_keys=OFF;', 'BEGIN TRANSACTION;'];
const manifest = { createdAt: new Date().toISOString(), tables: [] };

for (const table of tables) {
  const name = String(table.name);
  const quotedName = quoteIdentifier(name);
  const schema = table.sql ? String(table.sql).replace(/;\s*$/, '') : '';
  if (schema) chunks.push(`${schema};`);
  const rows = (await db.execute(`SELECT * FROM ${quotedName}`)).rows;
  const columns = rows.length ? Object.keys(rows[0]) : (await db.execute(`PRAGMA table_info(${quotedName})`)).rows.map((row) => String(row.name));
  for (const row of rows) {
    const values = columns.map((column) => quoteValue(row[column])).join(', ');
    chunks.push(`INSERT INTO ${quotedName} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${values});`);
  }
  manifest.tables.push({ name, rows: rows.length });
}

chunks.push('COMMIT;', 'PRAGMA foreign_keys=ON;', '');
await fs.writeFile(path.join(outputDir, 'database.sql'), chunks.join('\n'), 'utf8');
await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ outputDir, ...manifest }, null, 2));
