import fs from 'node:fs';
import { createClient } from '@libsql/client/web';
import { normalizePatternFormValue } from '../functions/api/admin/patternMetadata.js';

function readDevVars() {
    const envText = fs.readFileSync('.dev.vars', 'utf8');
    return Object.fromEntries(
        envText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .filter((line) => !line.startsWith('#'))
            .map((line) => {
                const index = line.indexOf('=');
                return [line.slice(0, index), line.slice(index + 1)];
            }),
    );
}

function parseJsonObject(raw) {
    if (!raw || typeof raw !== 'string') return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

async function ensureMetadataColumn(client) {
    const info = await client.execute('PRAGMA table_info(pattern_applicability)');
    const columns = new Set((info.rows || []).map((row) => String(row.name)));
    if (columns.has('metadata')) return;

    await client.execute('ALTER TABLE pattern_applicability ADD COLUMN metadata TEXT');
}

function buildNormalizedRow(row) {
    const metadata = parseJsonObject(row.metadata);
    const normalizedPos = String(row.pos || '').trim().toLowerCase();
    const sourcePos = ['verb', 'noun', 'adjective', 'participle', 'numeral'].includes(normalizedPos) ? normalizedPos : 'noun';
    const normalized = normalizePatternFormValue({
        applicabilities: [
            {
                pos: sourcePos,
                linguistic_role: row.linguistic_role,
                gender: row.gender,
                notes: metadata.notes,
                metadata,
            },
        ],
    });

    const applicability = Array.isArray(normalized.applicabilities) ? normalized.applicabilities[0] : null;
    if (!applicability) return null;

    const cleanedMetadata = {
        ...(applicability.metadata || {}),
    };

    if (applicability.notes) {
        cleanedMetadata.notes = applicability.notes;
    } else {
        delete cleanedMetadata.notes;
    }

    return {
        pos: normalizedPos,
        linguistic_role: applicability.linguisticRole || null,
        gender: applicability.gender || null,
        metadata: cleanedMetadata,
    };
}

async function run() {
    const env = readDevVars();
    const client = createClient({
        url: env.TURSO_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });

    await ensureMetadataColumn(client);

    const rows = await client.execute(`
        SELECT id, pos, linguistic_role, gender, metadata
        FROM pattern_applicability
        ORDER BY id
    `);

    let updated = 0;
    for (const row of rows.rows || []) {
        const next = buildNormalizedRow(row);
        if (!next) continue;

        await client.execute({
            sql: `
                UPDATE pattern_applicability
                SET pos = ?,
                    linguistic_role = ?,
                    gender = ?,
                    metadata = ?,
                    updated_at = datetime('now')
                WHERE id = ?
            `,
            args: [
                next.pos,
                next.linguistic_role,
                next.gender,
                JSON.stringify(next.metadata || {}),
                row.id,
            ],
        });
        updated += 1;
    }

    console.log(`Pattern metadata backfill complete. Updated ${updated} rows.`);
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
