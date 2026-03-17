import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

// Load from .dev.vars (Wrangler format)
const devVars = fs.readFileSync('.dev.vars', 'utf-8');
const env = Object.fromEntries(
    devVars.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const [key, ...vals] = line.split('=');
            return [key, vals.join('=')];
        })
);

const url = env.TURSO_URL;
const authToken = env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("Missing TURSO_URL or TURSO_AUTH_TOKEN in .dev.vars");
    process.exit(1);
}

const db = createClient({ url, authToken });

async function processTable(tableName, idCol = 'id') {
    console.log(`Checking table: ${tableName}`);
    const res = await db.execute(`SELECT ${idCol}, tags FROM ${tableName} WHERE tags LIKE '%\\%'`);
    console.log(`Found ${res.rows.length} rows to check in ${tableName}.`);
    
    let updatedCount = 0;
    for (const row of res.rows) {
        let tags;
        try {
            tags = JSON.parse(row.tags);
        } catch (e) {
            continue;
        }
        
        if (!Array.isArray(tags)) continue;
        
        let changed = false;
        const newTags = tags.map(tag => {
            if (typeof tag === 'string' && tag.startsWith('\\')) {
                changed = true;
                return '!' + tag.slice(1);
            }
            return tag;
        });
        
        if (changed) {
            console.log(`Updating ${tableName} (${row[idCol]}): ${JSON.stringify(tags)} -> ${JSON.stringify(newTags)}`);
            await db.execute({
                sql: `UPDATE ${tableName} SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE ${idCol} = ?`,
                args: [JSON.stringify(newTags), row[idCol]]
            });
            updatedCount++;
        }
    }
    return updatedCount;
}

async function main() {
    console.log("Connecting to:", url);
    
    let total = 0;
    total += await processTable('entries');
    total += await processTable('subentries');
    // total += await processTable('roots'); // already checked schema, no tags column
    
    console.log(`Finished. Total updated: ${total}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
