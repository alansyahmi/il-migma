import { createClient } from '@libsql/client';
import fs from 'fs';

const devVars = fs.readFileSync('.dev.vars', 'utf8');
const env = {};
devVars.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
});

const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });

async function migrate() {
    try {
        await client.execute("ALTER TABLE noun_morphology ADD COLUMN morph_pattern TEXT;");
        console.log("Success: Added morph_pattern to noun_morphology");
    } catch (e) {
        console.error("Migration failed:", e.message);
    }
    process.exit(0);
}
migrate();
