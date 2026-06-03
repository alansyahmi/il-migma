/**
 * JSONL importer for migration-ready dictionary batches.
 *
 * Usage:
 *   node scripts/import-jsonl.mjs --file tmp/kelmet_il_malti_A_combined_migration.jsonl
 *   node scripts/import-jsonl.mjs --file tmp/kelmet_il_malti_A_combined_migration.jsonl --dry-run
 */

import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

config({ path: resolve(ROOT, '.env') });

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
  ...process.env,
};

const jsonlArgIndex = process.argv.findIndex((arg) => arg === '--file' || arg === '-f');
const jsonlPath = jsonlArgIndex >= 0 ? process.argv[jsonlArgIndex + 1] : resolve(ROOT, 'tmp', 'kelmet_il_malti_A_combined_migration.jsonl');
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

const { onRequestPost, onRequestPut } = await import(pathToFileURL(resolve(ROOT, 'functions/api/admin/entries.js')).href);

function readJsonl(filePath) {
  const raw = readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON on line ${index + 1}: ${error.message}`);
    }
  });
}

function makeRequest(body) {
  return new Request('http://localhost/api/admin/entries', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer local-dev',
    },
    body: JSON.stringify(body),
  });
}

async function findExistingByHeadword(row) {
  const res = await db.execute({
    sql: `SELECT id
          FROM entries
          WHERE headword = ? AND pos = ? AND COALESCE(source_title, '') = COALESCE(?, '')
            AND COALESCE(source_year, '') = COALESCE(?, '')
            AND COALESCE(source_publisher, '') = COALESCE(?, '')
          ORDER BY created_at ASC
          LIMIT 1`,
    args: [
      row.headword,
      row.pos,
      row.source_title ?? null,
      row.source_year ?? null,
      row.source_publisher ?? null,
    ],
  });

  return res.rows[0]?.id ?? null;
}

async function verifySample(entryId) {
  const entryRes = await db.execute({
    sql: `SELECT id, headword, pos, source_citation, source_title, source_year, source_page, source_publisher
          FROM entries
          WHERE id = ?`,
    args: [entryId],
  });
  const etymRes = await db.execute({
    sql: `SELECT etymology_chain AS chain, etymology_notes AS notes FROM entries WHERE id = ?`,
    args: [entryId],
  });
  const phonRes = await db.execute({
    sql: `SELECT ipa, dialect FROM phonetics WHERE entry_id = ?`,
    args: [entryId],
  });

  return {
    entry: entryRes.rows[0] ?? null,
    etymology_count: etymRes.rows[0] && etymRes.rows[0].chain ? 1 : 0,
    phonetic_count: phonRes.rows.length,
    etymology_chain: etymRes.rows[0]?.chain ? (typeof etymRes.rows[0].chain === 'string' ? JSON.parse(etymRes.rows[0].chain) : etymRes.rows[0].chain) : [],
    etymology_notes: etymRes.rows[0]?.notes ?? null,
  };
}

const rows = readJsonl(jsonlPath);
console.log(`Loaded ${rows.length} JSONL rows from ${jsonlPath}`);

let updated = 0;
let inserted = 0;
let fallbackMatched = 0;
let failed = 0;

for (const row of rows) {
  if (!Object.prototype.hasOwnProperty.call(row, 'is_inflectable')) {
    row.is_inflectable = false;
  }
  const request = makeRequest(row);
  const putRes = await onRequestPut({ request, env });

  if (putRes.status === 200) {
    updated += 1;
    continue;
  }

  if (putRes.status === 404) {
    const existingId = await findExistingByHeadword(row);
    if (existingId) {
      fallbackMatched += 1;
      const fallbackRow = { ...row, id: existingId };
      const fallbackRes = await onRequestPut({ request: makeRequest(fallbackRow), env });
      if (fallbackRes.status === 200) {
        updated += 1;
        continue;
      }
    }

    const postRes = await onRequestPost({ request: new Request('http://localhost/api/admin/entries', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-dev',
      },
      body: JSON.stringify(row),
    }), env });

    if (postRes.status === 201) {
      inserted += 1;
      continue;
    }
  }

  failed += 1;
  const bodyText = await putRes.text().catch(() => '');
  console.warn(`Failed to import ${row.headword} (${row.id}) -> ${putRes.status} ${bodyText}`);
}

const sample = await verifySample('n-a');

console.log(JSON.stringify({
  updated,
  inserted,
  fallbackMatched,
  failed,
  sample,
  dryRun,
}, null, 2));

if (failed > 0) {
  process.exitCode = 1;
}
