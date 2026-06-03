#!/usr/bin/env node
/**
 * Backfill legacy `etymologies` rows into the canonical `entries` table.
 *
 * Usage:
 *   node scripts/migrate_etymologies_to_entries.mjs
 *
 * Reads credentials from .dev.vars / .env / process.env.
 * This script copies data only. It does not drop the legacy table.
 */

import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnvFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('#'))
      .reduce((acc, line) => {
        const idx = line.indexOf('=');
        if (idx === -1) return acc;
        acc[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        return acc;
      }, {});
  } catch {
    return {};
  }
}

const env = {
  ...loadEnvFile(resolve(ROOT, '.dev.vars')),
  ...loadEnvFile(resolve(ROOT, '.env')),
  ...process.env,
};

if (!env.TURSO_URL || !env.TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO credentials in .env or .dev.vars (TURSO_URL / TURSO_AUTH_TOKEN).');
  process.exit(1);
}

const db = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });

async function tableExists(name) {
  const res = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    args: [name],
  });
  return res.rows.length > 0;
}

async function columnExists(table, column) {
  const res = await db.execute({ sql: `PRAGMA table_info(${table})` });
  return res.rows.some((row) => String(row.name) === column);
}

function safeParse(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  const text = String(value).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mergeChains(existing, incoming) {
  const merged = [];
  const seen = new Set();

  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!item) continue;
    const key = [
      String(item.relationship ?? ''),
      String(item.language ?? ''),
      String(item.term ?? item.form ?? item.etymon ?? ''),
      String(item.pronunciation ?? ''),
      String(item.definition ?? item.meaning ?? ''),
      String(item.script ?? ''),
      String(item.time_period ?? ''),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

async function ensureEntryColumns() {
  if (!(await columnExists('entries', 'etymology_chain'))) {
    await db.execute('ALTER TABLE entries ADD COLUMN etymology_chain TEXT');
  }
  if (!(await columnExists('entries', 'etymology_notes'))) {
    await db.execute('ALTER TABLE entries ADD COLUMN etymology_notes TEXT');
  }
}

async function main() {
  console.log('Starting backfill: etymologies -> entries (etymology_chain, etymology_notes)');

  const hasEntries = await tableExists('entries');
  if (!hasEntries) {
    console.error('`entries` table not found.');
    process.exit(1);
  }

  await ensureEntryColumns();

  const hasEtymologies = await tableExists('etymologies');
  if (!hasEtymologies) {
    console.log('No `etymologies` table found. Nothing to migrate.');
    return;
  }

  const rows = await db.execute({
    sql: 'SELECT * FROM etymologies ORDER BY entry_id ASC, id ASC',
  });
  if (!rows.rows.length) {
    console.log('`etymologies` table is empty. Nothing to migrate.');
    return;
  }

  const byEntry = new Map();
  for (const row of rows.rows) {
    const entryId = String(row.entry_id || '').trim();
    if (!entryId) continue;
    if (!byEntry.has(entryId)) byEntry.set(entryId, []);
    byEntry.get(entryId).push(row);
  }

  let migrated = 0;
  let skipped = 0;

  for (const [entryId, etyRows] of byEntry.entries()) {
    const entryRes = await db.execute({
      sql: 'SELECT id, etymology_chain, etymology_notes FROM entries WHERE id = ? LIMIT 1',
      args: [entryId],
    });
    if (!entryRes.rows.length) {
      console.warn(`Skipping ${entryId}: no matching entry row found.`);
      skipped += 1;
      continue;
    }

    const currentRow = entryRes.rows[0];
    const currentChain = safeParse(currentRow.etymology_chain) || [];
    const currentNotes = String(currentRow.etymology_notes || '').trim();

    const incomingChains = [];
    const incomingNotes = [];

    for (const etyRow of etyRows) {
      const chain = safeParse(etyRow.chain);
      if (Array.isArray(chain)) {
        incomingChains.push(...chain);
      } else if (chain) {
        incomingChains.push(chain);
      }

      const notes = String(etyRow.notes || '').trim();
      if (notes) incomingNotes.push(notes);
    }

    const mergedChain = mergeChains(currentChain, incomingChains);
    const mergedNotes = [
      currentNotes || null,
      ...incomingNotes,
    ].filter(Boolean);
    const finalNotes = mergedNotes.length ? mergedNotes.join('\n') : null;

    await db.execute({
      sql: 'UPDATE entries SET etymology_chain = ?, etymology_notes = ? WHERE id = ?',
      args: [mergedChain.length ? JSON.stringify(mergedChain) : null, finalNotes, entryId],
    });

    migrated += 1;
    console.log(`Migrated ${entryId}: ${etyRows.length} legacy row(s) -> ${mergedChain.length} chain item(s)`);
  }

  console.log('Backfill complete.');
  console.log(`  Entries migrated: ${migrated}`);
  console.log(`  Entries skipped:  ${skipped}`);
  console.log('The legacy table was not dropped.');
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
