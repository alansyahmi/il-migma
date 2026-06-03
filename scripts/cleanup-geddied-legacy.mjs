import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENTRY_ID = 'n-ġeddied';

function loadEnv() {
    const p = resolve(ROOT, '.dev.vars');
    if (!existsSync(p)) {
        throw new Error('.dev.vars not found');
    }

    const env = {};
    for (const line of readFileSync(p, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).trim();
    }
    return env;
}

async function countRows(client) {
    const [noun, participle, numeral] = await Promise.all([
        client.execute({
            sql: 'SELECT COUNT(*) AS c FROM noun_morphology WHERE entry_id = ?',
            args: [ENTRY_ID],
        }),
        client.execute({
            sql: 'SELECT COUNT(*) AS c FROM participle_morphology WHERE entry_id = ?',
            args: [ENTRY_ID],
        }),
        client.execute({
            sql: 'SELECT COUNT(*) AS c FROM numeral_morphology WHERE entry_id = ?',
            args: [ENTRY_ID],
        }),
    ]);

    return {
        noun: Number(noun.rows[0]?.c ?? 0),
        participle: Number(participle.rows[0]?.c ?? 0),
        numeral: Number(numeral.rows[0]?.c ?? 0),
    };
}

async function run() {
    const env = loadEnv();
    const client = createClient({
        url: env.TURSO_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });

    const before = await countRows(client);
    console.log('Before:', before);

    await client.execute({
        sql: 'DELETE FROM participle_morphology WHERE entry_id = ?',
        args: [ENTRY_ID],
    });
    await client.execute({
        sql: 'DELETE FROM numeral_morphology WHERE entry_id = ?',
        args: [ENTRY_ID],
    });

    const after = await countRows(client);
    console.log('After:', after);

    if (after.participle !== 0 || after.numeral !== 0) {
        throw new Error(`Cleanup incomplete for ${ENTRY_ID}`);
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
