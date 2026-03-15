#!/usr/bin/env node
import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'node:fs';

const CANONICAL = new Set(['masculine', 'feminine', 'neutral']);

function loadDotDevVars() {
    const path = '.dev.vars';
    if (!existsSync(path)) return;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
        const match = line.trim().match(/^([A-Z_]+)=(.+)$/);
        if (match) process.env[match[1]] = match[2].trim();
    }
}

function canonicalizeGender(raw) {
    if (raw === null || raw === undefined) return null;
    const normalized = String(raw).trim().toLowerCase();
    if (!normalized) return null;
    if (['masculine', 'masc', 'm'].includes(normalized)) return 'masculine';
    if (['feminine', 'fem', 'f'].includes(normalized)) return 'feminine';
    if (['neutral', 'neut', 'n'].includes(normalized)) return 'neutral';
    return null;
}

async function main() {
    loadDotDevVars();

    const url = process.env.TURSO_URL || process.env.VITE_TURSO_URL || 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;
    const dryRun = process.argv.includes('--dry-run');

    const client = createClient({ url, authToken });

    const tableInfo = await client.execute('PRAGMA table_info(entries)');
    const columns = new Set(tableInfo.rows.map((row) => row.name));

    if (!columns.has('gender')) {
        throw new Error('entries.gender does not exist; run unified schema migration first.');
    }

    const hasLegacyNounGender = columns.has('noun_gender');
    const hasLegacyMorphology = columns.has('noun_morphology');

    const selectParts = ['id', 'gender'];
    if (hasLegacyNounGender) selectParts.push('noun_gender');
    if (hasLegacyMorphology) selectParts.push("json_extract(noun_morphology, '$.gender') AS morphology_gender");

    const { rows } = await client.execute({
        sql: `SELECT ${selectParts.join(', ')} FROM entries`,
    });

    const updates = [];
    for (const row of rows) {
        const current = canonicalizeGender(row.gender);
        const legacyNounGender = hasLegacyNounGender ? canonicalizeGender(row.noun_gender) : null;
        const legacyMorphologyGender = hasLegacyMorphology ? canonicalizeGender(row.morphology_gender) : null;

        const desired = current ?? legacyNounGender ?? legacyMorphologyGender;
        if (desired && desired !== row.gender) {
            updates.push({ id: row.id, gender: desired });
        }
    }

    console.log(`Scanned ${rows.length} entries.`);
    console.log(`Backfill candidates: ${updates.length}.`);

    if (dryRun) {
        console.log('Dry run; no updates applied.');
    } else {
        for (const update of updates) {
            await client.execute({
                sql: "UPDATE entries SET gender = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
                args: [update.gender, update.id],
            });
        }
        console.log(`Updated ${updates.length} rows in entries.gender.`);
    }

    const verificationClauses = ["(gender IS NULL OR LOWER(TRIM(gender)) = '')"]; 
    if (hasLegacyNounGender) {
        verificationClauses.push("(noun_gender IS NOT NULL AND LOWER(TRIM(noun_gender)) IN ('masculine','feminine','neutral','masc','fem','neut','m','f','n'))");
    }
    if (hasLegacyMorphology) {
        verificationClauses.push("(json_extract(noun_morphology, '$.gender') IS NOT NULL AND LOWER(TRIM(json_extract(noun_morphology, '$.gender'))) IN ('masculine','feminine','neutral','masc','fem','neut','m','f','n'))");
    }

    if (verificationClauses.length > 1) {
        const verification = await client.execute({
            sql: `SELECT COUNT(*) AS remaining FROM entries WHERE ${verificationClauses[0]} AND (${verificationClauses.slice(1).join(' OR ')})`,
        });
        const remaining = Number(verification.rows[0]?.remaining ?? 0);
        if (remaining > 0) {
            console.log(`⚠️ Remaining rows with only legacy gender signals: ${remaining}`);
            process.exitCode = 2;
        } else {
            console.log('✅ Verified: no rows depend on noun_gender or noun_morphology gender for filtering.');
        }
    } else {
        console.log('ℹ️ Legacy noun_gender / noun_morphology columns are absent; verification skipped.');
    }

    const indexList = await client.execute("PRAGMA index_list('entries')");
    const hasGenderIndex = indexList.rows.some((row) => row.name === 'idx_entries_gender');
    if (!hasGenderIndex) {
        if (!dryRun) {
            await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_gender ON entries(gender)');
            console.log('✅ Created index idx_entries_gender on entries(gender).');
        } else {
            console.log('ℹ️ idx_entries_gender missing (dry-run did not create it).');
        }
    } else {
        console.log('✅ Index idx_entries_gender already exists.');
    }

    const invalidGenderRes = await client.execute("SELECT COUNT(*) AS invalid_count FROM entries WHERE gender IS NOT NULL AND LOWER(TRIM(gender)) NOT IN ('masculine','feminine','neutral')");
    const invalidCount = Number(invalidGenderRes.rows[0]?.invalid_count ?? 0);
    if (invalidCount > 0) {
        console.log(`⚠️ Found ${invalidCount} rows with non-canonical entries.gender values.`);
        process.exitCode = process.exitCode || 3;
    } else {
        console.log(`✅ entries.gender values are canonical (${Array.from(CANONICAL).join(', ')}).`);
    }
}

main().catch((error) => {
    console.error(`❌ backfill-entries-gender failed: ${error.message}`);
    process.exit(1);
});
