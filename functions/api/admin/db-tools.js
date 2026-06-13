/**
 * Admin DB Tools — /api/admin/db-tools
 * Protected by Clerk JWT verification.
 * Provides: SQL Console, Data Export, Integrity Check, Bulk Update, Merge Roots, Table Info
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';
import { getEntryIdFamily, normalizeEntryId } from '../../../src/lib/entryId.ts';

const MAX_EXPORT_ROWS = 50000;
const DEFAULT_SINGLE_EXPORT_ROWS = 10000;
const DEFAULT_BUNDLE_PRESET = 'entry-linking';

export const EXPORT_BUNDLE_PRESETS = Object.freeze({
    'entry-linking': Object.freeze([
        'entries',
        'definitions',
        'phonetics',
        'dialect_variants',
        'subentries',
        'root_pattern_forms',
        'roots',
        'patterns',
        'stems',
        'lexical_sources',
        'attestation_reliability',
    ]),
});

// ── Auth guard (same pattern as entries.js) ───────────────────────────────────
async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') return true;

    try {
        const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
    } catch { return false; }
}

// ── Dangerous SQL patterns ────────────────────────────────────────────────────
const WRITE_PATTERNS = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|REINDEX|VACUUM|PRAGMA\s+\w+\s*=)/i;

// ── POST handler ──────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        const { action } = body;

        const client = getDbClient(env);

        switch (action) {
            case 'query':
                return handleQuery(client, body);
            case 'export':
                return handleExport(client, body);
            case 'export-bundle':
                return handleExportBundle(client, body);
            case 'integrity-check':
                return handleIntegrityCheck(client);
            case 'bulk-update':
                return handleBulkUpdate(client, body);
            case 'merge-roots':
                return handleMergeRoots(client, body);
            case 'table-info':
                return handleTableInfo(client);
            case 'check-id':
                return handleCheckId(client, body);
            default:
                return json({ error: `Unknown action: ${action}` }, 400);
        }
    } catch (e) {
        const { status, body } = toApiErrorPayload(e);
        return json(body, status);
    }
}

// ── SQL Console ───────────────────────────────────────────────────────────────
async function handleQuery(client, { sql, allowWrite = false }) {
    if (!sql?.trim()) return json({ error: 'SQL query is required' }, 400);

    const isWrite = WRITE_PATTERNS.test(sql);
    if (isWrite && !allowWrite) {
        return json({
            error: 'Write operations are blocked. Enable write mode to execute INSERT, UPDATE, DELETE, etc.',
            blocked: true,
        }, 403);
    }

    const start = Date.now();
    const result = await client.execute(sql);
    const elapsed = Date.now() - start;

    return json({
        columns: result.columns || [],
        rows: result.rows || [],
        rowsAffected: result.rowsAffected ?? 0,
        elapsed,
    });
}

// ── Data Export ───────────────────────────────────────────────────────────────
async function handleExport(client, { table, limit = DEFAULT_SINGLE_EXPORT_ROWS }) {
    if (!table) return json({ error: 'Table name is required' }, 400);
    const normalizedTable = normalizeExportTableName(table);
    if (!validateExportTableName(normalizedTable)) {
        return json({ error: 'Invalid table name' }, 400);
    }

    const snapshot = await getTableExportSnapshot(client, normalizedTable, limit);
    return json(snapshot);
}

function normalizeExportTableName(table) {
    if (!table) return '';
    return String(table).trim();
}

function validateExportTableName(table) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table);
}

export function resolveExportBundleTableNames({ preset = DEFAULT_BUNDLE_PRESET, tables } = {}) {
    const explicitTables = Array.isArray(tables) && tables.length > 0 ? tables : null;
    const candidateTables = explicitTables || EXPORT_BUNDLE_PRESETS[preset];

    if (!candidateTables) {
        throw new Error(`Unknown export bundle preset: ${preset}`);
    }

    const uniqueTables = [];
    const seen = new Set();
    for (const rawTable of candidateTables) {
        const table = normalizeExportTableName(rawTable);
        if (!table) continue;
        if (!validateExportTableName(table)) {
            throw new Error(`Invalid export table name: ${table}`);
        }
        if (seen.has(table)) continue;
        seen.add(table);
        uniqueTables.push(table);
    }

    if (uniqueTables.length === 0) {
        throw new Error('No export tables resolved');
    }

    return uniqueTables;
}

async function getTableExportSnapshot(client, table, limit = DEFAULT_SINGLE_EXPORT_ROWS) {
    const resolvedLimit = Math.max(0, Math.min(Number(limit) || 0, MAX_EXPORT_ROWS));
    const result = await client.execute(`SELECT * FROM ${table} LIMIT ${resolvedLimit}`);
    const countRes = await client.execute(`SELECT COUNT(*) as total FROM ${table}`);

    return {
        columns: result.columns || [],
        rows: result.rows || [],
        total: Number(countRes.rows[0]?.total ?? 0),
        truncated: Number(countRes.rows[0]?.total ?? 0) > (result.rows?.length ?? 0),
        limit: resolvedLimit,
        table,
    };
}

async function handleExportBundle(client, { preset = DEFAULT_BUNDLE_PRESET, tables, limit = MAX_EXPORT_ROWS }) {
    try {
        const bundle = await buildExportBundle(client, { preset, tables, limit });
        return json(bundle);
    } catch (e) {
        return json({ error: e.message }, 400);
    }
}

export async function buildExportBundle(client, { preset = DEFAULT_BUNDLE_PRESET, tables, limit = MAX_EXPORT_ROWS } = {}) {
    const tableNames = resolveExportBundleTableNames({ preset, tables });
    const bundle = {
        preset,
        generatedAt: new Date().toISOString(),
        tables: {},
        tableOrder: tableNames,
        totalRows: 0,
        truncatedTables: [],
    };

    for (const tableName of tableNames) {
        const snapshot = await getTableExportSnapshot(client, tableName, limit);
        bundle.tables[tableName] = snapshot;
        bundle.totalRows += snapshot.total || 0;
        if (snapshot.truncated) {
            bundle.truncatedTables.push(tableName);
        }
    }

    return bundle;
}

// ── Data Integrity Checker ───────────────────────────────────────────────────
async function handleIntegrityCheck(client) {
    const issues = [];

    // 1. Orphaned subentries
    try {
        const res = await client.execute(`
            SELECT s.id, s.entry_id, s.headword
            FROM subentries s
            LEFT JOIN entries e ON e.id = s.entry_id
            WHERE e.id IS NULL LIMIT 50
        `);
        if (res.rows.length > 0) {
            issues.push({
                category: 'Orphaned Subentries',
                severity: 'error',
                count: res.rows.length,
                details: res.rows.map(r => `Subentry "${r.headword}" → missing entry "${r.entry_id}"`),
                ids: res.rows.map(r => r.id),
            });
        }
    } catch (e) { issues.push({ category: 'Orphaned Subentries', severity: 'warning', count: 0, details: [`Check failed: ${e.message}`] }); }

    // 2. Orphaned root_pattern_forms
    try {
        const res = await client.execute(`
            SELECT rpf.id, rpf.root_id, rpf.pattern_id, rpf.derived_form
            FROM root_pattern_forms rpf
            LEFT JOIN roots r ON r.id = rpf.root_id
            WHERE r.id IS NULL LIMIT 50
        `);
        if (res.rows.length > 0) {
            issues.push({
                category: 'Orphaned Root Pattern Forms',
                severity: 'error',
                count: res.rows.length,
                details: res.rows.map(r => `Form "${r.derived_form}" → missing root "${r.root_id}"`),
                ids: res.rows.map(r => r.id),
            });
        }
    } catch (e) { issues.push({ category: 'Orphaned Root Pattern Forms', severity: 'warning', count: 0, details: [`Check failed: ${e.message}`] }); }

    // 3. Entries with root_consonants that don't match any root
    try {
        const res = await client.execute(`
            SELECT e.id, e.headword, e.root_consonants
            FROM entries e
            WHERE e.root_consonants IS NOT NULL
              AND e.root_consonants != ''
              AND NOT EXISTS (SELECT 1 FROM roots r WHERE r.consonants = e.root_consonants)
            LIMIT 50
        `);
        if (res.rows.length > 0) {
            issues.push({
                category: 'Unlinked Root Consonants',
                severity: 'warning',
                count: res.rows.length,
                details: res.rows.map(r => `Entry "${r.headword}" → root "${r.root_consonants}" not found`),
                ids: res.rows.map(r => r.id),
            });
        }
    } catch (e) { issues.push({ category: 'Unlinked Root Consonants', severity: 'warning', count: 0, details: [`Check failed: ${e.message}`] }); }

    // 4. Malformed JSON in roots (gloss, etymology, synonyms, antonyms, tags)
    try {
        const jsonFields = ['gloss', 'etymology', 'synonyms', 'antonyms', 'tags', 'hidden_forms'];
        for (const field of jsonFields) {
            const res = await client.execute(`SELECT id, consonants, ${field} FROM roots WHERE ${field} IS NOT NULL AND ${field} != '' AND ${field} != '[]' AND ${field} != '{}' LIMIT 200`);
            const bad = [];
            for (const row of res.rows) {
                try {
                    const val = row[field];
                    if (typeof val === 'string') JSON.parse(val);
                } catch {
                    bad.push(`Root "${row.consonants}" (${row.id}) → invalid JSON in ${field}`);
                }
            }
            if (bad.length > 0) {
                issues.push({
                    category: `Malformed JSON: roots.${field}`,
                    severity: 'warning',
                    count: bad.length,
                    details: bad.slice(0, 20),
                });
            }
        }
    } catch (e) { issues.push({ category: 'Malformed JSON (roots)', severity: 'warning', count: 0, details: [`Check failed: ${e.message}`] }); }

    // 5. Malformed JSON in entry definitions / usage examples
    try {
        const res = await client.execute(`
            SELECT id, headword, pos, definitions, usage_examples
            FROM entries e
            WHERE COALESCE(json_array_length(definitions), 0) = 0 LIMIT 50
        `);
        if (res.rows.length > 0) {
            issues.push({
                category: 'Entries Without Definitions',
                severity: 'info',
                count: res.rows.length,
                details: res.rows.map(r => `"${r.headword}" (${r.pos}) has no definitions`),
                ids: res.rows.map(r => r.id),
            });
        }
    } catch (e) { issues.push({ category: 'Entries Without Definitions', severity: 'warning', count: 0, details: [`Check failed: ${e.message}`] }); }

    try {
        const res = await client.execute(`
            SELECT id, headword, pos, definitions, usage_examples
            FROM entries
            WHERE (
                definitions IS NOT NULL
                AND definitions != ''
                AND json_valid(definitions) = 0
            )
            OR (
                usage_examples IS NOT NULL
                AND usage_examples != ''
                AND json_valid(usage_examples) = 0
            )
            LIMIT 50
        `);
        if (res.rows.length > 0) {
            issues.push({
                category: 'Malformed Entry JSON',
                severity: 'warning',
                count: res.rows.length,
                details: res.rows.map(r => `"${r.headword}" (${r.pos}) has invalid JSON in definitions or usage_examples`),
                ids: res.rows.map(r => r.id),
            });
        }
    } catch (e) { issues.push({ category: 'Malformed Entry JSON', severity: 'warning', count: 0, details: [`Check failed: ${e.message}`] }); }

    // 6. Duplicate consonants in roots
    try {
        const res = await client.execute(`
            SELECT consonants, COUNT(*) as cnt, GROUP_CONCAT(id, ', ') as ids
            FROM roots
            GROUP BY consonants
            HAVING COUNT(*) > 1
            LIMIT 30
        `);
        if (res.rows.length > 0) {
            issues.push({
                category: 'Duplicate Root Consonants',
                severity: 'info',
                count: res.rows.length,
                details: res.rows.map(r => `"${r.consonants}" appears ${r.cnt}x → IDs: ${r.ids}`),
            });
        }
    } catch (e) { issues.push({ category: 'Duplicate Root Consonants', severity: 'warning', count: 0, details: [`Check failed: ${e.message}`] }); }

    return json({ issues, checkedAt: new Date().toISOString() });
}

// ── Bulk Update ───────────────────────────────────────────────────────────────
async function handleBulkUpdate(client, { table, ids, field, value }) {
    if (!table || !ids?.length || !field) {
        return json({ error: 'table, ids, and field are required' }, 400);
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
        return json({ error: 'Invalid table or field name' }, 400);
    }

    const placeholders = ids.map(() => '?').join(',');
    const args = [value, ...ids];
    const result = await client.execute({
        sql: `UPDATE ${table} SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        args,
    });

    return json({ updated: result.rowsAffected ?? 0, table, field });
}

// ── Merge Roots ───────────────────────────────────────────────────────────────
async function handleMergeRoots(client, { sourceId, targetId, preview = true }) {
    if (!sourceId || !targetId) return json({ error: 'sourceId and targetId are required' }, 400);
    if (sourceId === targetId) return json({ error: 'Source and target cannot be the same' }, 400);

    // Get info about both roots
    const [sourceRes, targetRes] = await Promise.all([
        client.execute({ sql: 'SELECT * FROM roots WHERE id = ?', args: [sourceId] }),
        client.execute({ sql: 'SELECT * FROM roots WHERE id = ?', args: [targetId] }),
    ]);

    if (!sourceRes.rows.length) return json({ error: `Source root "${sourceId}" not found` }, 404);
    if (!targetRes.rows.length) return json({ error: `Target root "${targetId}" not found` }, 404);

    // Find affected entries
    const affectedEntries = await client.execute({
        sql: `SELECT id, headword FROM entries WHERE root_consonants = ?`,
        args: [sourceRes.rows[0].consonants],
    });

    const affectedForms = await client.execute({
        sql: `SELECT id, derived_form FROM root_pattern_forms WHERE root_id = ?`,
        args: [sourceId],
    });

    if (preview) {
        return json({
            preview: true,
            source: sourceRes.rows[0],
            target: targetRes.rows[0],
            affectedEntries: affectedEntries.rows,
            affectedForms: affectedForms.rows,
        });
    }

    // Execute merge
    // 1. Reassign entries' root_consonants
    await client.execute({
        sql: `UPDATE entries SET root_consonants = ? WHERE root_consonants = ?`,
        args: [targetRes.rows[0].consonants, sourceRes.rows[0].consonants],
    });

    // 2. Reassign root_pattern_forms
    await client.execute({
        sql: `UPDATE root_pattern_forms SET root_id = ? WHERE root_id = ?`,
        args: [targetId, sourceId],
    });

    // 3. Delete source root
    await client.execute({ sql: 'DELETE FROM roots WHERE id = ?', args: [sourceId] });

    return json({
        merged: true,
        sourceDeleted: sourceId,
        targetKept: targetId,
        entriesReassigned: affectedEntries.rows.length,
        formsReassigned: affectedForms.rows.length,
    });
}

// ── Table Info ─────────────────────────────────────────────────────────────────
async function handleTableInfo(client) {
    const tablesRes = await client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%' AND name NOT LIKE '%_config' AND name NOT LIKE '%_content' AND name NOT LIKE '%_data' AND name NOT LIKE '%_docsize' AND name NOT LIKE '%_idx' ORDER BY name"
    );

    const tables = [];
    for (const row of tablesRes.rows) {
        const name = row.name;
        const colsRes = await client.execute(`PRAGMA table_info(${name})`);
        const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM ${name}`);
        tables.push({
            name,
            columns: colsRes.rows.map(c => ({
                name: c.name,
                type: c.type,
                notnull: !!c.notnull,
                pk: !!c.pk,
                defaultValue: c.dflt_value,
            })),
            rowCount: Number(countRes.rows[0]?.cnt ?? 0),
        });
    }

    return json({ tables });
}

// ── Check ID uniqueness ───────────────────────────────────────────────────────
async function handleCheckId(client, { table, id }) {
    if (!table || !id) return json({ error: 'table and id required' }, 400);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) return json({ error: 'Invalid table' }, 400);

    const normalizedId = table === 'entries' ? normalizeEntryId(id) : id;
    const family = table === 'entries' ? getEntryIdFamily(id) : { exact: [normalizedId], likePatterns: [] };
    const conditions = [];
    const args = [];
    if (family.exact.length > 0) {
        conditions.push(`id IN (${family.exact.map(() => '?').join(', ')})`);
        args.push(...family.exact);
    }
    if (family.likePatterns.length > 0) {
        conditions.push(...family.likePatterns.map(() => 'id LIKE ?'));
        args.push(...family.likePatterns);
    }

    const res = await client.execute({
        sql: `SELECT id FROM ${table} WHERE ${conditions.join(' OR ')}`,
        args,
    });

    return json({ exists: res.rows.length > 0, id: normalizedId, table });
}

// ── Utilities ─────────────────────────────────────────────────────────────────
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

function unauthorized() {
    return json({ error: 'Unauthorized — admin role required' }, 401);
}
