import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_TURSO_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

const triggers = [
  "DROP TRIGGER IF EXISTS entries_ai",
  "DROP TRIGGER IF EXISTS entries_ad",
  "DROP TRIGGER IF EXISTS entries_au",
  "CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword); END",
  "CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword); END",
  "CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword); INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword); END"
];

async function run() {
  try {
    for (const sql of triggers) {
      console.log(`Executing: ${sql.substring(0, 50)}...`);
      await client.execute(sql);
    }
    console.log("Triggers restored successfully!");
  } catch (err) {
    console.error("Failed to restore triggers:");
    console.error(err);
  } finally {
    client.close();
  }
}

run();
