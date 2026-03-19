
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';

function loadDotDevVars() {
    const p = '.dev.vars';
    if (!existsSync(p)) return;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.trim().match(/^([A-Z_]+)=(.+)$/);
        if (m) process.env[m[1]] = m[2].trim();
    }
}
loadDotDevVars();

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
    console.log("Checking Tables...");
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables:", tables.rows.map(r => r.name).join(', '));

    for (const table of ['admin_config', 'patterns', 'pattern_applicability']) {
        console.log(`\nTable: ${table}`);
        try {
            const info = await client.execute(`PRAGMA table_info(${table})`);
            console.log(info.rows.map(r => `${r.name} (${r.type})`).join(', '));
            
            const count = await client.execute(`SELECT COUNT(*) as c FROM ${table}`);
            console.log(`Count: ${count.rows[0].c}`);

            if (table === 'admin_config') {
                const cats = await client.execute("SELECT category, COUNT(*) as c FROM admin_config GROUP BY category");
                console.log("Categories:", cats.rows.map(r => `${r.category}: ${r.c}`).join(', '));
            }
        } catch (e) {
            console.log(`Error checking ${table}: ${e.message}`);
        }
    }
}

run().catch(console.error);
