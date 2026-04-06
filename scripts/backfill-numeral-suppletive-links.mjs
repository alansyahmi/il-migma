#!/usr/bin/env node
import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'node:fs';

const SUPPLETIVE_PAIRS = [
    ['wieħed', 'ewwel'],
    ['erbgħa', "raba'"],
];

function loadDotDevVars() {
    const path = '.dev.vars';
    if (!existsSync(path)) return;

    for (const line of readFileSync(path, 'utf8').split('\n')) {
        const match = line.trim().match(/^([A-Z_]+)=(.+)$/);
        if (match) process.env[match[1]] = match[2].trim();
    }
}

function normalizeHeadword(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFC');
}

function parseJsonArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== 'string') return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function entryRelationValue(entry) {
    return {
        id: entry.id,
        headword: entry.headword,
        pos: entry.pos,
        relation_kind: 'alternative_form',
    };
}

function mergeRelationList(list, relation) {
    const key = `${normalizeHeadword(relation.headword)}::${normalizeHeadword(relation.id)}`;
    const seen = new Set(
        list.map((item) => `${normalizeHeadword(item?.headword)}::${normalizeHeadword(item?.id)}`),
    );

    if (seen.has(key)) return list;
    return [...list, relation];
}

async function updateEntry(client, row, counterpartRows) {
    const relatedEntries = parseJsonArray(row.related_entries);
    const alternativeForms = parseJsonArray(row.alternative_forms);

    let nextRelatedEntries = relatedEntries;
    let nextAlternativeForms = alternativeForms;

    for (const counterpart of counterpartRows) {
        const relation = entryRelationValue(counterpart);
        nextRelatedEntries = mergeRelationList(nextRelatedEntries, relation);
        nextAlternativeForms = mergeRelationList(nextAlternativeForms, relation);
    }

    const changed =
        JSON.stringify(nextRelatedEntries) !== JSON.stringify(relatedEntries) ||
        JSON.stringify(nextAlternativeForms) !== JSON.stringify(alternativeForms);

    if (!changed) {
        return false;
    }

    await client.execute({
        sql: "UPDATE entries SET related_entries = ?, alternative_forms = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
        args: [JSON.stringify(nextRelatedEntries), JSON.stringify(nextAlternativeForms), row.id],
    });

    return true;
}

async function main() {
    loadDotDevVars();

    const url = process.env.TURSO_URL || process.env.VITE_TURSO_URL || 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;
    const dryRun = process.argv.includes('--dry-run');

    const client = createClient({ url, authToken });

    let updatedCount = 0;
    let skippedCount = 0;

    for (const [leftHeadword, rightHeadword] of SUPPLETIVE_PAIRS) {
        const leftRes = await client.execute({
            sql: "SELECT id, headword, pos, related_entries, alternative_forms FROM entries WHERE LOWER(TRIM(headword)) = LOWER(TRIM(?)) ORDER BY id",
            args: [leftHeadword],
        });
        const rightRes = await client.execute({
            sql: "SELECT id, headword, pos, related_entries, alternative_forms FROM entries WHERE LOWER(TRIM(headword)) = LOWER(TRIM(?)) ORDER BY id",
            args: [rightHeadword],
        });

        if (leftRes.rows.length === 0 || rightRes.rows.length === 0) {
            console.log(`Skipping ${leftHeadword} <-> ${rightHeadword}: missing row(s).`);
            skippedCount += 1;
            continue;
        }

        for (const row of leftRes.rows) {
            if (dryRun) {
                console.log(`[dry-run] Would attach ${leftHeadword} -> ${rightHeadword} on ${row.id}`);
                continue;
            }

            const changed = await updateEntry(client, row, rightRes.rows);
            if (changed) updatedCount += 1;
        }

        for (const row of rightRes.rows) {
            if (dryRun) {
                console.log(`[dry-run] Would attach ${rightHeadword} -> ${leftHeadword} on ${row.id}`);
                continue;
            }

            const changed = await updateEntry(client, row, leftRes.rows);
            if (changed) updatedCount += 1;
        }
    }

    if (dryRun) {
        console.log('Dry run complete; no updates applied.');
        return;
    }

    console.log(`Updated ${updatedCount} entry row(s).`);
    if (skippedCount > 0) {
        console.log(`Skipped ${skippedCount} pair(s) because at least one side was missing.`);
    }
}

main().catch((error) => {
    console.error(`backfill-numeral-suppletive-links failed: ${error.message}`);
    process.exit(1);
});
