#!/usr/bin/env node
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import { resolveAdjMasculineForm } from '../src/lib/adjMorphology.ts';

function loadDotDevVars() {
    const varsPath = '.dev.vars';
    if (!fs.existsSync(varsPath)) return;

    for (const line of fs.readFileSync(varsPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key) process.env[key] = value;
    }
}

function firstText(...values) {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

async function main() {
    loadDotDevVars();

    const target = process.argv.includes('--local') ? 'local' : 'remote';
    const dryRun = process.argv.includes('--dry-run');
    const url = target === 'local'
        ? 'file:local.db'
        : process.env.TURSO_URL || process.env.VITE_TURSO_URL;
    const authToken = target === 'local'
        ? undefined
        : process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;

    if (!url) {
        throw new Error('Missing TURSO_URL / VITE_TURSO_URL in .dev.vars');
    }
    if (target === 'remote' && !authToken) {
        throw new Error('Missing TURSO_AUTH_TOKEN / VITE_TURSO_AUTH_TOKEN in .dev.vars');
    }

    const db = createClient({ url, authToken });

    const info = await db.execute('PRAGMA table_info(adj_morphology)');
    const columns = new Set(info.rows.map((row) => row.name));
    if (!columns.has('masculine_form')) {
        throw new Error('adj_morphology.masculine_form does not exist');
    }

    const rows = await db.execute({
        sql: `
            SELECT
                e.id,
                e.headword,
                e.pos,
                e.gender AS entry_gender,
                am.masculine_form,
                am.feminine_form,
                am.gender AS adj_gender,
                am.entry_id AS has_row
            FROM entries e
            LEFT JOIN adj_morphology am ON am.entry_id = e.id
            WHERE LOWER(TRIM(e.pos)) IN ('adjective', 'participle')
        `,
    });

    const updates = [];

    for (const row of rows.rows) {
        const resolved = resolveAdjMasculineForm({
            ...row,
            gender: firstText(row.adj_gender, row.entry_gender) || null,
            adjective_morphology: row,
            adj_morphology: row,
        });

        if (!resolved) continue;

        const current = firstText(row.masculine_form);
        if (current === resolved) continue;
        if (!row.has_row) continue;

        updates.push({
            id: row.id,
            masculine_form: resolved,
        });
    }

    console.log(`Scanned ${rows.rows.length} adjective/participle entries.`);
    console.log(`Backfill candidates: ${updates.length}.`);

    if (dryRun) {
        console.log('Dry run only; no updates written.');
        return;
    }

    let changed = 0;
    for (const update of updates) {
        await db.execute({
            sql: `
                UPDATE adj_morphology
                SET masculine_form = ?,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                WHERE entry_id = ?
            `,
            args: [update.masculine_form, update.id],
        });
        changed += 1;
    }

    const remaining = await db.execute(`
        SELECT COUNT(*) AS remaining
        FROM adj_morphology am
        INNER JOIN entries e ON e.id = am.entry_id
        WHERE LOWER(TRIM(e.pos)) IN ('adjective', 'participle')
          AND (am.masculine_form IS NULL OR TRIM(am.masculine_form) = '')
    `);

    console.log(`Updated ${changed} adj_morphology rows.`);
    console.log(`Remaining blank masculine forms: ${Number(remaining.rows[0]?.remaining ?? 0)}.`);
}

main().catch((error) => {
    console.error(`backfill-adj-masculine-form failed: ${error.message}`);
    process.exit(1);
});
