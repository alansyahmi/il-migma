import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

let url = process.env.TURSO_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;

if (fs.existsSync('.dev.vars')) {
    const vars = fs.readFileSync('.dev.vars', 'utf-8');
    const urlMatch = vars.match(/TURSO_URL=(.+)/);
    const tokenMatch = vars.match(/TURSO_AUTH_TOKEN=(.+)/);
    if (urlMatch) url = urlMatch[1].trim();
    if (tokenMatch) authToken = tokenMatch[1].trim();
}

const client = createClient({ url, authToken });

async function check() {
    try {
        const res = await client.execute("SELECT id FROM entries WHERE id LIKE 'adj-%' LIMIT 50");
        console.log(res.rows.map(r => r.id));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.close();
    }
}

check();
