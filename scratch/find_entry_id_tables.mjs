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
        const r = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        for(const table of r.rows) {
            const info = await client.execute(`PRAGMA table_info(${table.name})`);
            const cols = info.rows.map(c => c.name);
            if(cols.includes('entry_id') || cols.includes('target_entry_id')) {
                console.log(table.name, cols.filter(c => c.includes('entry_id')));
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.close();
    }
}

check();
