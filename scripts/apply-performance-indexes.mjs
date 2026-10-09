import fs from 'node:fs/promises';
import { createClient } from '@libsql/client/web';

const envText = await fs.readFile('.dev.vars', 'utf8');
const env = Object.fromEntries(
  envText.split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);

const db = createClient({
  url: env.TURSO_URL || env.VITE_TURSO_URL,
  authToken: env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN
});

const statements = [
  'CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_entries_source_created ON entries(source_language, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_entries_root ON entries(root_consonants)',
  'CREATE INDEX IF NOT EXISTS idx_entries_stem ON entries(stem)',
  'CREATE INDEX IF NOT EXISTS idx_phonetics_entry ON phonetics(entry_id)',
  'CREATE INDEX IF NOT EXISTS idx_phonetics_entry_dialect ON phonetics(entry_id, dialect)',
  'CREATE INDEX IF NOT EXISTS idx_alt_forms_entry ON alternative_forms(entry_id)',
  'CREATE INDEX IF NOT EXISTS idx_relationships_entry ON entry_relationships(entry_id)',
  'CREATE INDEX IF NOT EXISTS idx_relationships_target ON entry_relationships(target_entry_id)',
  'CREATE INDEX IF NOT EXISTS idx_relationships_entry_type ON entry_relationships(entry_id, relationship_type)',
  'CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id)',
  'CREATE INDEX IF NOT EXISTS idx_entry_tags_entry_tag ON entry_tags(entry_id, tag_id)',
  'CREATE INDEX IF NOT EXISTS idx_diminutives_entry ON entry_diminutives(entry_id)',
  'CREATE INDEX IF NOT EXISTS idx_audio_entry ON audio_files(entry_id)',
  'CREATE INDEX IF NOT EXISTS idx_roots_consonants ON roots(consonants)'
];

for (const sql of statements) {
  console.log('Running:', sql);
  await db.execute(sql);
  console.log('Done.');
}

console.log('All indexes created successfully!');
