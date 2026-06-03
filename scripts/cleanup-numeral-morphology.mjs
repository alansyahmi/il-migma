import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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

function parseArgs(argv) {
    return new Set(argv.slice(2).map((arg) => String(arg || '').trim()));
}

async function run() {
    const args = parseArgs(process.argv);
    const dryRun = args.has('--dry-run');
    const env = loadEnv();
    const client = createClient({
        url: env.TURSO_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });

    const staleRows = await client.execute(`
        SELECT
            nm.entry_id,
            e.pos,
            e.headword,
            nm.numeral_type,
            nm.form_attributive_short,
            nm.form_attributive_long
        FROM numeral_morphology nm
        LEFT JOIN entries e ON e.id = nm.entry_id
        WHERE COALESCE(LOWER(TRIM(e.pos)), '') <> 'numeral'
        ORDER BY nm.entry_id
    `);

    console.log(JSON.stringify({
        dry_run: dryRun,
        stale_rows: staleRows.rows,
        count: staleRows.rows.length,
    }, null, 2));

    if (dryRun || staleRows.rows.length === 0) return;

    for (const row of staleRows.rows) {
        await client.execute({
            sql: 'DELETE FROM numeral_morphology WHERE entry_id = ?',
            args: [row.entry_id],
        });
    }

    const after = await client.execute(`
        SELECT COUNT(*) AS count
        FROM numeral_morphology nm
        JOIN entries e ON e.id = nm.entry_id
        WHERE COALESCE(LOWER(TRIM(e.pos)), '') <> 'numeral'
    `);

    console.log(JSON.stringify({
        deleted: staleRows.rows.length,
        remaining_stale_rows: Number(after.rows[0]?.count ?? 0),
    }, null, 2));
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
