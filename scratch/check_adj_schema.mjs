import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

// Read from .dev.vars if exists, otherwise .env
let url = process.env.TURSO_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;

if (fs.existsSync('.dev.vars')) {
    const vars = fs.readFileSync('.dev.vars', 'utf-8');
    const urlMatch = vars.match(/TURSO_URL=(.+)/);
    const tokenMatch = vars.match(/TURSO_AUTH_TOKEN=(.+)/);
    if (urlMatch) url = urlMatch[1].trim();
    if (tokenMatch) authToken = tokenMatch[1].trim();
}

if (!url || !authToken) {
    console.error('TURSO_URL or TURSO_AUTH_TOKEN not found');
    process.exit(1);
}

const client = createClient({ url, authToken });

async function check() {
    try {
        console.log('Checking adj_morphology table info...');
        const res = await client.execute('PRAGMA table_info(adj_morphology)');
        console.log('Columns:');
        console.table(res.rows);

        const res2 = await client.execute('SELECT COUNT(*) as cnt FROM adj_morphology');
        console.log('Total rows:', res2.rows[0].cnt);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.close();
    }
}

check();
