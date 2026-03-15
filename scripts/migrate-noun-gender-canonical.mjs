import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

let envVars = {};
if (fs.existsSync('.dev.vars')) {
    envVars = dotenv.parse(fs.readFileSync('.dev.vars'));
} else {
    dotenv.config();
    envVars = process.env;
}

const db = createClient({
    url: envVars.TURSO_URL || envVars.VITE_TURSO_URL || 'file:local.db',
    authToken: envVars.TURSO_AUTH_TOKEN || envVars.VITE_TURSO_AUTH_TOKEN,
});

const DRY_RUN = process.argv.includes('--dry-run');
const ALLOWED = new Set(['masculine', 'feminine', 'neutral']);

function canonicalizeGender(value) {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    if (['masculine', 'masc', 'm'].includes(normalized)) return 'masculine';
    if (['feminine', 'fem', 'f'].includes(normalized)) return 'feminine';
    if (['neutral', 'neut', 'n'].includes(normalized)) return 'neutral';
    return null;
}

async function main() {
    const tableInfo = await db.execute('PRAGMA table_info(entries)');
    const columns = new Set(tableInfo.rows.map((r) => r.name));

    const genderColumn = columns.has('noun_gender')
        ? 'noun_gender'
        : (columns.has('gender') ? 'gender' : null);

    if (!genderColumn) {
        console.log('ℹ️ entries table has neither noun_gender nor gender; nothing to migrate.');
        return;
    }

    console.log(`🔍 Checking non-canonical values in entries.${genderColumn}...`);
    const rowsRes = await db.execute({
        sql: `SELECT id, ${genderColumn} AS value FROM entries WHERE ${genderColumn} IS NOT NULL`,
    });

    const changes = [];
    for (const row of rowsRes.rows) {
        const current = row.value;
        const canonical = canonicalizeGender(current);
        const canonicalString = canonical === null ? null : String(canonical);
        const currentNormalized = current === null ? null : String(current).trim().toLowerCase();
        if (canonicalString !== currentNormalized) {
            changes.push({ id: row.id, from: current, to: canonical });
        }
    }

    const invalidCounts = await db.execute({
        sql: `SELECT ${genderColumn} AS value, COUNT(*) AS count
              FROM entries
              WHERE ${genderColumn} IS NOT NULL
                AND LOWER(TRIM(${genderColumn})) NOT IN ('masculine','feminine','neutral')
              GROUP BY ${genderColumn}
              ORDER BY count DESC, value ASC`,
    });

    if (!changes.length) {
        console.log('✅ No non-canonical values found.');
        return;
    }

    console.log(`🛠 Found ${changes.length} rows to normalize.`);
    if (invalidCounts.rows.length) {
        console.log('   Non-canonical distribution:');
        for (const r of invalidCounts.rows) {
            console.log(`   - ${r.value}: ${Number(r.count)}`);
        }
    }

    for (const change of changes) {
        const previewTo = change.to === null ? 'NULL' : change.to;
        console.log(`   ${change.id}: ${change.from} -> ${previewTo}`);
    }

    if (DRY_RUN) {
        console.log('🧪 Dry run only. Re-run without --dry-run to apply updates.');
        return;
    }

    let updated = 0;
    for (const change of changes) {
        await db.execute({
            sql: `UPDATE entries SET ${genderColumn} = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`,
            args: [change.to, change.id],
        });
        updated += 1;
    }

    console.log(`✅ Updated ${updated} rows in entries.${genderColumn}.`);
    console.log(`✅ Canonical set enforced by data cleanup: ${Array.from(ALLOWED).join(', ')}`);
}

main().catch((e) => {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
});
