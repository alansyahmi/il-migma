import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.dev.vars' });
if (!process.env.VITE_TURSO_URL) {
    dotenv.config({ path: '.env' });
}

const url = process.env.VITE_TURSO_URL || process.env.TURSO_URL;
const token = process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.error('Missing TURSO_URL');
    process.exit(1);
}

const db = createClient({ url, authToken: token });

function parseGloss(raw) {
    if (!raw) return [];

    // 1. Try to parse as JSON
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            // Check if it's already the new format: [{en, mt}, ...]
            if (parsed.length > 0 && typeof parsed[0] === 'object' && ('en' in parsed[0] || 'mt' in parsed[0])) {
                return parsed;
            }
            // It's a simple array of strings: ["val1", "val2"]
            return parsed.map(val => ({ en: String(val), mt: '' }));
        }
    } catch (e) {
        // Not JSON
    }

    // 2. Handle corrupted string from Previous Failed Save
    if (typeof raw === 'string' && raw.includes('[object Object]')) {
        console.warn('Corruption detected: found "[object Object]" in gloss string.');
        return [];
    }

    // 3. Handle semicolon delimited string
    if (typeof raw === 'string' && raw.includes(';')) {
        return raw.split(';').map(s => ({ en: s.trim(), mt: '' })).filter(g => g.en);
    }

    // 3. Fallback to raw string
    return [{ en: String(raw), mt: '' }];
}

async function migrate() {
    console.log('--- Starting Gloss Migration ---');
    const res = await db.execute('SELECT id, consonants, gloss FROM roots');
    console.log(`Found ${res.rows.length} roots.`);

    let updatedCount = 0;

    for (const row of res.rows) {
        const originalGloss = row.gloss;
        const newGlossArr = parseGloss(originalGloss);
        const newGlossStr = JSON.stringify(newGlossArr);

        if (originalGloss !== newGlossStr) {
            console.log(`Updating ${row.consonants}: ${originalGloss} -> ${newGlossStr}`);
            await db.execute({
                sql: 'UPDATE roots SET gloss = ? WHERE id = ?',
                args: [newGlossStr, row.id]
            });
            updatedCount++;
        }
    }

    console.log(`--- Migration Complete. Updated ${updatedCount} roots. ---`);
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
