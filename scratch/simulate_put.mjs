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

function n(val) {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}

async function test() {
    try {
        const id = 'adj-fietel';
        const body = {
            id: 'adj-fietel',
            headword: 'fietel',
            pos: 'adjective',
            gender: 'masculine',
            is_loanword: 0
        };

        const tableInfo = await client.execute("PRAGMA table_info(entries)");
        const columns = tableInfo.rows.map(r => r.name);

        const setClauses = [];
        const args = [];

        for (const col of columns) {
            if (col === 'id' || col === 'created_at' || col === 'updated_at') continue;
            if (col in body) {
                let val = body[col];
                setClauses.push(`${col} = ?`);
                args.push(n(val));
            }
        }

        if (setClauses.length) {
            setClauses.push('updated_at = ?');
            args.push(new Date().toISOString());
            const sql = `UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`;
            console.log('SQL:', sql);
            console.log('Args:', [...args, id]);
            
            // We won't actually execute the update to avoid messing with user data,
            // but we'll check if the query is valid.
            await client.execute({ sql: 'EXPLAIN QUERY PLAN ' + sql, args: [...args, id] });
            console.log('Query plan valid.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.close();
    }
}

test();
