import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client/node';
import { auditEntry, buildFormattingPatch } from './entryQuality.mjs';

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const dbPath = arg('--db', 'local.db');
const outputDir = arg('--output', path.join('reports', 'entry-quality', new Date().toISOString().replaceAll(':', '-')));
const client = createClient({ url: `file:${path.resolve(dbPath)}` });

const tableNames = (await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).rows.map((row) => row.name);
const entryRows = (await client.execute('SELECT * FROM entries ORDER BY id')).rows;

const morphologyTables = ['verb_morphology', 'noun_morphology', 'adj_morphology', 'participle_morphology', 'numeral_morphology'];
const morphology = {};
for (const table of morphologyTables) {
  if (!tableNames.includes(table)) continue;
  const rows = (await client.execute(`SELECT * FROM ${table}`)).rows;
  morphology[table] = new Map(rows.map((row) => [row.entry_id, row]));
}

const relationshipRows = tableNames.includes('entry_relationships')
  ? (await client.execute('SELECT * FROM entry_relationships')).rows : [];
const relationships = new Map();
for (const row of relationshipRows) {
  const items = relationships.get(row.entry_id) || [];
  items.push({ targetEntryId: row.target_entry_id, type: row.relationship_type, reciprocal: relationshipRows.some((other) => other.entry_id === row.target_entry_id && other.target_entry_id === row.entry_id && other.relationship_type === row.relationship_type) });
  relationships.set(row.entry_id, items);
}

const results = entryRows.map((entry) => auditEntry({
  ...entry,
  verb_morphology: morphology.verb_morphology?.get(entry.id),
  noun_morphology: morphology.noun_morphology?.get(entry.id),
  adj_morphology: morphology.adj_morphology?.get(entry.id),
  participle_morphology: morphology.participle_morphology?.get(entry.id),
  numeral_morphology: morphology.numeral_morphology?.get(entry.id),
  relationships: relationships.get(entry.id) || [],
}));

const counts = { entries: results.length, issues: 0, bySeverity: {}, byCode: {}, byPos: {} };
for (const result of results) {
  const pos = result.issues.length ? entryRows.find((entry) => entry.id === result.entryId)?.pos || 'unknown' : entryRows.find((entry) => entry.id === result.entryId)?.pos || 'unknown';
  counts.byPos[pos] = (counts.byPos[pos] || 0) + result.issues.length;
  for (const item of result.issues) {
    counts.issues++;
    counts.bySeverity[item.severity] = (counts.bySeverity[item.severity] || 0) + 1;
    counts.byCode[item.code] = (counts.byCode[item.code] || 0) + 1;
  }
}

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), database: path.resolve(dbPath), tables: tableNames, counts }, null, 2));
await fs.writeFile(path.join(outputDir, 'entry-issues.jsonl'), results.flatMap((result) => result.issues.map((item) => JSON.stringify({ entryId: result.entryId, headword: result.headword, pos: result.pos, ...item }))).join('\n') + '\n');
await fs.writeFile(path.join(outputDir, 'entry-results.json'), JSON.stringify(results, null, 2));
await fs.writeFile(path.join(outputDir, 'formatting-patch.jsonl'), entryRows.map((entry) => ({ id: entry.id, changes: buildFormattingPatch(entry) })).filter((item) => Object.keys(item.changes).length).map(JSON.stringify).join('\n') + '\n');
console.log(JSON.stringify({ outputDir, ...counts }, null, 2));
