/**
 * Direct JSONL importer for dictionary batches.
 *
 * Usage:
 *   node scripts/import-jsonl-direct.mjs --file tmp/kelmet_il_malti_A_enriched.jsonl
 *   node scripts/import-jsonl-direct.mjs --file tmp/kelmet_il_malti_A_enriched.jsonl --dry-run
 */

import { createClient } from '@libsql/client/web';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadKeyValueFile(filePath) {
  if (!existsSync(filePath)) return {};
  const text = readFileSync(filePath, 'utf8');
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      })
      .filter(([key]) => Boolean(key))
  );
}

const env = {
  ...loadKeyValueFile(resolve(ROOT, '.dev.vars')),
  ...loadKeyValueFile(resolve(ROOT, '.env')),
  ...process.env,
};

const jsonlArgIndex = process.argv.findIndex((arg) => arg === '--file' || arg === '-f');
const jsonlPath = jsonlArgIndex >= 0 ? process.argv[jsonlArgIndex + 1] : resolve(ROOT, 'tmp', 'kelmet_il_malti_A_enriched.jsonl');
const dryRun = process.argv.includes('--dry-run');

if (!env.TURSO_URL || !env.TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO credentials. Check .dev.vars or .env.');
  process.exit(1);
}

if (!existsSync(jsonlPath)) {
  console.error(`JSONL file not found: ${jsonlPath}`);
  process.exit(1);
}

const db = createClient({
  url: env.TURSO_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

function readJsonl(filePath) {
  const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON on line ${index + 1}: ${error.message}`);
    }
  });
}

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function dbValue(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (Array.isArray(value) || isPlainObject(value)) return JSON.stringify(value);
  return value;
}

async function getEntryColumns() {
  const res = await db.execute('PRAGMA table_info(entries)');
  return res.rows.map((row) => String(row.name));
}

function buildEntryArgs(row, columns) {
  const args = [];
  const keys = [];

  for (const column of columns) {
    if (column === 'created_at' || column === 'updated_at') continue;
    if (column === 'id') {
      keys.push(column);
      args.push(String(row.id || '').normalize('NFC').trim());
      continue;
    }
    if (!(column in row)) continue;
    const val = dbValue(row[column]);
    if (val === undefined) continue;
    keys.push(column);
    args.push(val);
  }

  if (!keys.includes('created_at')) {
    keys.push('created_at');
    args.push(now());
  }
  if (!keys.includes('updated_at')) {
    keys.push('updated_at');
    args.push(now());
  }

  return { keys, args };
}

async function upsertRow(row, columns) {
  const id = String(row.id || '').normalize('NFC').trim();
  if (!id) throw new Error(`Missing id for row ${row.headword || '<unknown>'}`);
  if (!String(row.headword || '').trim()) throw new Error(`Missing headword for ${id}`);
  if (!String(row.pos || '').trim()) throw new Error(`Missing pos for ${id}`);

  if (!Object.prototype.hasOwnProperty.call(row, 'is_inflectable')) {
    row.is_inflectable = false;
  }

  const { keys, args } = buildEntryArgs(row, columns);
  await db.execute({
    sql: `INSERT OR REPLACE INTO entries (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    args,
  });

  await db.execute({ sql: 'DELETE FROM definitions WHERE entry_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM phonetics WHERE entry_id = ?', args: [id] });

  if (Array.isArray(row.definitions)) {
    for (let i = 0; i < row.definitions.length; i += 1) {
      const def = row.definitions[i];
      if (!def?.text_en) continue;
      await db.execute({
        sql: 'INSERT INTO definitions (id, entry_id, sense_number, text_mt, text_en, register, nuance, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          `${id}-def-${i + 1}`,
          id,
          i + 1,
          dbValue(def.text_mt) ?? null,
          def.text_en,
          dbValue(def.register) ?? null,
          dbValue(def.nuance) ?? null,
          i,
        ],
      });
    }
  }

  // Etymology is stored on the `entries` row in `etymology_chain` and `etymology_notes`.
  // The main INSERT/REPLACE above will persist `etymology_chain`/`etymology_notes` when present in `row`.

  if (Array.isArray(row.phonetics)) {
    for (let i = 0; i < row.phonetics.length; i += 1) {
      const ph = row.phonetics[i];
      if (!ph?.ipa && !ph?.spelling) continue;
      await db.execute({
        sql: 'INSERT INTO phonetics (id, entry_id, ipa, dialect, notes) VALUES (?, ?, ?, ?, ?)',
        args: [
          `${id}-ph-${i + 1}`,
          id,
          ph.ipa || '',
          ph.dialect || 'Standard',
          ph.spelling ? `Spelling: ${ph.spelling}` : dbValue(ph.notes) ?? null,
        ],
      });
    }
  }
}

const rows = readJsonl(jsonlPath);
const entryColumns = await getEntryColumns();
console.log(`Loaded ${rows.length} JSONL rows from ${jsonlPath}`);

let processed = 0;

if (dryRun) {
  console.log(JSON.stringify({ processed: 0, dryRun: true, sample: null }, null, 2));
  process.exit(0);
}

try {
  for (const row of rows) {
    await upsertRow(row, entryColumns);
    processed += 1;
    if (processed % 25 === 0 || processed === rows.length) {
      console.log(`Processed ${processed}/${rows.length}`);
    }
  }

  try {
    await db.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`);
  } catch {
    // FTS rebuild is best-effort.
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  process.exit(1);
}

const sample = await db.execute({
  sql: 'SELECT id, headword, pos FROM entries WHERE headword = ? LIMIT 1',
  args: ['Alla'],
});

console.log(JSON.stringify({
  processed,
  dryRun,
  sample: sample.rows[0] ?? null,
}, null, 2));
