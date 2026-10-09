import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
dotenv.config({ path: 'c:/Projects/il-migma/.env' });

const client = createClient({
  url: process.env.TURSO_URL || process.env.VITE_TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN
});

const sql = `
  SELECT
    af.entry_id  AS from_id,
    af.headword  AS to_headword,
    af.type      AS alt_type,
    e.id         AS to_id,
    ef.headword  AS from_hw
  FROM alternative_forms af
  JOIN entries e ON LOWER(TRIM(e.headword)) = LOWER(TRIM(af.headword))
  JOIN entries ef ON ef.id = af.entry_id
  WHERE e.id != af.entry_id
    AND NOT EXISTS (
      SELECT 1 FROM alternative_forms af2
      WHERE af2.entry_id = e.id
        AND LOWER(TRIM(af2.headword)) = LOWER(TRIM(ef.headword))
    )
  LIMIT 200
`;

let totalFixed = 0;
let round = 1;

while (true) {
  const res = await client.execute(sql);
  console.log(`Round ${round}: found ${res.rows.length} orphans`);
  if (res.rows.length === 0) break;

  for (const row of res.rows) {
    const reciprocalId = `alt_${row.to_id}::${row.from_id}`;
    await client.execute({
      sql: `INSERT INTO alternative_forms (id, entry_id, headword, type, sort_order)
            VALUES (?, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET headword = excluded.headword, type = excluded.type`,
      args: [reciprocalId, row.to_id, row.from_hw, row.alt_type || null]
    });
    totalFixed++;
  }
  round++;
}

console.log(`\nDone. Backfilled ${totalFixed} reciprocal alt-form rows total.`);
