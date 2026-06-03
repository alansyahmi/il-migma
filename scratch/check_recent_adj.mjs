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
        console.log('Recent adj_morphology rows:');
        const res = await client.execute('SELECT * FROM adj_morphology ORDER BY updated_at DESC LIMIT 5');
        console.table(res.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.close();
    }
}

check();
