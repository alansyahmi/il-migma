import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

// Load from .dev.vars manually since it's not a standard .env
const devVars = fs.readFileSync('.dev.vars', 'utf8');
const env = {};
devVars.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
        env[key.trim()] = vals.join('=').trim();
    }
});

const url = env.TURSO_URL;
const authToken = env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("Missing TURSO_URL or TURSO_AUTH_TOKEN in .dev.vars");
    process.exit(1);
}

const client = createClient({ url, authToken });

async function migrate() {
    try {
        console.log(`Migrating remote DB: ${url}`);
        await client.execute("ALTER TABLE lexical_sources ADD COLUMN publisher TEXT;");
        console.log("Success: Added publisher to lexical_sources");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log("Column already exists.");
        } else {
            console.error("Migration failed:", e.message);
        }
    } finally {
        process.exit(0);
    }
}

migrate();
