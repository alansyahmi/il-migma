import { buildSuffixCatalogItems, resolveSuffixEntryMatch } from '../../../src/lib/suffixMatching.ts';
import { ENTRY_MORPHOLOGY_JOINS, ENTRY_MORPHOLOGY_SELECT } from '../../../src/lib/entryHydration.ts';

const DASH_VARIANTS = /[–—−]/g;

function now() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function uid() {
    return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 6);
}

export function normalizeSuffixText(value) {
    return String(value ?? '')
        .trim()
        .normalize('NFC')
        .replace(DASH_VARIANTS, '-');
}

export function normalizeSuffixKind(value) {
    const kind = String(value ?? '').trim().toLowerCase();
    return kind === 'nominal' || kind === 'derivational' ? kind : '';
}

export async function ensureSuffixCatalogTable(client) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS suffix_catalog (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL CHECK(kind IN ('nominal', 'derivational')),
            suffix TEXT NOT NULL,
            label TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            UNIQUE(kind, suffix)
        )
    `);
}

async function ensureSuffixCatalogSeedStateTable(client) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS suffix_catalog_seed_state (
            id INTEGER PRIMARY KEY CHECK(id = 1),
            seeded_at TEXT NOT NULL
        )
    `);
}

async function seedSuffixCatalogFromEntries(client) {
    const rows = await client.execute(`
        SELECT
            e.id,
            e.headword,
            e.pos,
            nm.dual_pattern,
            nm.form_plural_pattern,
            nm.sound_plural AS sound_suffix
        FROM entries e
        LEFT JOIN noun_morphology nm ON nm.entry_id = e.id
        WHERE
            (nm.dual_pattern IS NOT NULL AND TRIM(nm.dual_pattern) != '')
            OR (nm.form_plural_pattern IS NOT NULL AND TRIM(nm.form_plural_pattern) != '')
            OR (nm.sound_plural IS NOT NULL AND TRIM(nm.sound_plural) != '')
    `);

    const items = buildSuffixCatalogItems(rows.rows);
    let sortOrder = 0;

    for (const item of items) {
        const id = uid();
        await client.execute({
            sql: `INSERT OR IGNORE INTO suffix_catalog (id, kind, suffix, label, sort_order)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [id, item.kind, item.suffix, item.label, sortOrder++],
        });
    }

    return items.length;
}

export async function ensureSuffixCatalogSeeded(client) {
    await ensureSuffixCatalogTable(client);
    await ensureSuffixCatalogSeedStateTable(client);

    const seedStateRes = await client.execute('SELECT seeded_at FROM suffix_catalog_seed_state WHERE id = 1 LIMIT 1');
    if (seedStateRes.rows.length > 0) return 0;

    const seededCount = await seedSuffixCatalogFromEntries(client);
    await client.execute({
        sql: `INSERT OR REPLACE INTO suffix_catalog_seed_state (id, seeded_at) VALUES (1, ?)`,
        args: [now()],
    });

    return seededCount;
}

async function loadEntriesForSuffixCounts(client) {
    const rows = await client.execute(`
        SELECT
            e.id,
            e.headword,
            e.pos,
            nm.dual_pattern,
            nm.form_plural_pattern,
            nm.sound_plural AS sound_suffix,
            nm.augmentative_pattern,
            nm.morph_pattern,
            nm.pattern
        FROM entries e
        LEFT JOIN noun_morphology nm ON nm.entry_id = e.id
    `);

    return rows.rows;
}

export async function listSuffixCatalog(client) {
    await ensureSuffixCatalogTable(client);
    await ensureSuffixCatalogSeeded(client);

    const catalogRes = await client.execute(`
        SELECT id, kind, suffix, label, sort_order, created_at, updated_at
        FROM suffix_catalog
        ORDER BY kind ASC, sort_order ASC, suffix ASC, label ASC
    `);

    const entries = await loadEntriesForSuffixCounts(client);

    return catalogRes.rows.map((row) => {
        let count = 0;
        let sampleHeadword = '';
        let samplePos = '';

        for (const entry of entries) {
            const match = resolveSuffixEntryMatch(entry, row.suffix, row.kind);
            if (!match) continue;

            count += 1;
            if (!sampleHeadword) {
                sampleHeadword = String(entry.headword || '').trim();
                samplePos = String(entry.pos || '').trim();
            }
        }

        return {
            id: String(row.id),
            kind: row.kind,
            suffix: String(row.suffix || ''),
            label: String(row.label || ''),
            sort_order: Number(row.sort_order ?? 0),
            count,
            sample_headword: sampleHeadword || undefined,
            sample_pos: samplePos || undefined,
        };
    });
}

export async function createSuffixCatalogItem(client, data) {
    await ensureSuffixCatalogTable(client);

    const kind = normalizeSuffixKind(data.kind);
    const suffix = normalizeSuffixText(data.suffix);
    const label = String(data.label ?? '').trim();
    const sortOrder = Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0;

    const id = uid();
    await client.execute({
        sql: `INSERT INTO suffix_catalog (id, kind, suffix, label, sort_order)
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, kind, suffix, label, sortOrder],
    });

    return { id, kind, suffix, label, sort_order: sortOrder };
}

export async function updateSuffixCatalogItem(client, data) {
    await ensureSuffixCatalogTable(client);

    const id = String(data.id || '').trim();
    const kind = normalizeSuffixKind(data.kind);
    const suffix = normalizeSuffixText(data.suffix);
    const label = String(data.label ?? '').trim();
    const sortOrder = Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0;

    const existing = await client.execute({
        sql: `SELECT id FROM suffix_catalog WHERE id = ? LIMIT 1`,
        args: [id],
    });
    if (!existing.rows.length) {
        const error = new Error('Suffix not found');
        error.status = 404;
        throw error;
    }

    await client.execute({
        sql: `UPDATE suffix_catalog
              SET kind = ?, suffix = ?, label = ?, sort_order = ?, updated_at = ?
              WHERE id = ?`,
        args: [kind, suffix, label, sortOrder, now(), id],
    });

    return { id, kind, suffix, label, sort_order: sortOrder };
}

export async function deleteSuffixCatalogItem(client, id) {
    const suffixId = String(id || '').trim();

    const res = await client.execute({
        sql: `DELETE FROM suffix_catalog WHERE id = ?`,
        args: [suffixId],
    });

    if (!res.rowsAffected) {
        const error = new Error('Suffix not found');
        error.status = 404;
        throw error;
    }

    return { id: suffixId, deleted: true };
}
