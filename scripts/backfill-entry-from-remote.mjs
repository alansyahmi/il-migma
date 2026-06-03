import { createClient } from '@libsql/client';
import fs from 'fs';

const varsFile = '.dev.vars';
let vars = {};
if (fs.existsSync(varsFile)) {
    vars = fs.readFileSync(varsFile, 'utf-8')
        .split('\n')
        .reduce((acc, line) => {
            const [key, ...vals] = line.split('=');
            if (key && vals) acc[key.trim()] = vals.join('=').trim();
            return acc;
        }, {});
}

const entryId = process.argv[2];
if (!entryId) {
    console.error('Usage: node scripts/backfill-entry-from-remote.mjs <entry-id>');
    process.exit(1);
}

const remoteUrl = vars.TURSO_URL;
const remoteToken = vars.TURSO_AUTH_TOKEN;
if (!remoteUrl || !remoteToken) {
    console.error('TURSO_URL or TURSO_AUTH_TOKEN missing in .dev.vars');
    process.exit(1);
}

const remote = createClient({ url: remoteUrl, authToken: remoteToken });
const local = createClient({ url: 'file:local.db' });

function normalizeValue(value) {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value === 'bigint') return Number(value);
    if (Array.isArray(value)) return JSON.stringify(value);
    if (value && typeof value === 'object' && !(value instanceof Date)) return JSON.stringify(value);
    return value;
}

async function upsertRow(client, table, row) {
    if (!row) return false;
    const info = await client.execute(`PRAGMA table_info(${table})`);
    const columns = new Set(info.rows.map((r) => r.name));
    const entries = Object.entries(row)
        .filter(([key]) => columns.has(key))
        .map(([key, value]) => [key, normalizeValue(value)]);

    if (entries.length === 0) return false;

    const cols = entries.map(([key]) => key);
    const placeholders = cols.map(() => '?').join(', ');
    const values = entries.map(([, value]) => value);

    await client.execute({
        sql: `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
        args: values,
    });
    return true;
}

async function run() {
    console.log(`Backfilling ${entryId} from Turso to local.db...`);

    const entryRes = await remote.execute({ sql: 'SELECT * FROM entries WHERE id = ?', args: [entryId] });
    const entry = entryRes.rows[0];
    if (!entry) {
        console.error(`Entry ${entryId} was not found on Turso.`);
        process.exit(1);
    }

    await upsertRow(local, 'entries', entry);

    const pos = String(entry.pos || '').toLowerCase();
    if (pos === 'noun' || pos === 'pronoun') {
        const nounRes = await remote.execute({ sql: 'SELECT * FROM noun_morphology WHERE entry_id = ?', args: [entryId] });
        await upsertRow(local, 'noun_morphology', nounRes.rows[0] || null);
        await local.execute({
            sql: `
                UPDATE noun_morphology
                SET
                    singular_form = COALESCE(NULLIF(singular_form, ''), (SELECT headword FROM entries WHERE id = noun_morphology.entry_id)),
                    is_inflectable_singular = COALESCE(is_inflectable_singular, 1),
                    is_inflectable_plural = COALESCE(is_inflectable_plural, 1),
                    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                WHERE entry_id = ?
            `,
            args: [entryId],
        });
    } else if (pos === 'adjective' || pos === 'participle') {
        const adjRes = await remote.execute({ sql: 'SELECT * FROM adj_morphology WHERE entry_id = ?', args: [entryId] });
        await upsertRow(local, 'adj_morphology', adjRes.rows[0] || null);
    } else if (pos === 'verb') {
        const verbRes = await remote.execute({ sql: 'SELECT * FROM verb_morphology WHERE entry_id = ?', args: [entryId] });
        await upsertRow(local, 'verb_morphology', verbRes.rows[0] || null);
    } else if (pos === 'numeral') {
        const numRes = await remote.execute({ sql: 'SELECT * FROM numeral_morphology WHERE entry_id = ?', args: [entryId] });
        await upsertRow(local, 'numeral_morphology', numRes.rows[0] || null);
    }

    const check = await local.execute({ sql: 'SELECT id, headword, pos FROM entries WHERE id = ?', args: [entryId] });
    console.log(JSON.stringify(check.rows[0], null, 2));
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
