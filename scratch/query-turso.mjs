import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_TURSO_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

console.log('Connecting to Turso:', url);
const client = createClient({ url, authToken });

try {
  const rs = await client.execute('SELECT id, headword, pos FROM entries LIMIT 5');
  console.log('Remote entries:', rs.rows);
  
  const rels = ['omae29iv43fgs', '1xmag55sk0gaf', '7lo8avug1efbg'];
  for (const rel of rels) {
    const r = await client.execute({
      sql: 'SELECT id, headword, pos FROM entries WHERE id = ?',
      args: [rel]
    });
    console.log(`Checking ID ${rel}:`, r.rows);
  }
} catch (err) {
  console.error('Error querying Turso:', err);
} finally {
  await client.close();
}
