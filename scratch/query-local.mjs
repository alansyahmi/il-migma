import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:local.db' });

try {
  const rs = await client.execute('SELECT COUNT(*) FROM entries');
  console.log('Local entries count:', rs.rows[0]);
  
  const rels = ['omae29iv43fgs', '1xmag55sk0gaf', '7lo8avug1efbg'];
  for (const rel of rels) {
    const r = await client.execute({
      sql: 'SELECT id, headword, pos FROM entries WHERE id = ?',
      args: [rel]
    });
    console.log(`Checking ID ${rel} in local.db:`, r.rows);
  }
} catch (err) {
  console.error('Error querying local.db:', err);
} finally {
  await client.close();
}
