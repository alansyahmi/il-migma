import { validateAndNormalize } from './configSchema.js';
import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

const roleMap = {
    cv_wizen_pattern: '',
    feminine_pattern: 'feminine_singular',
    broken_pattern: 'broken_plural',
    sound_suffix: 'sound_plural',
    diminutive_pattern: 'diminutive',
    adjective_pattern: 'elative',
};

// ── Migration Endpoint ────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const body = await request.json();
        const { action } = body;

        const client = getDbClient(env);

        if (action === 'migrate') {
            return handleMigration(client, body.commit === true);
        }

        if (action === 'sync-from-entries') {
            return handleSyncFromEntries(client, body.commit === true);
        }

        return json({ error: 'Action required' }, 400);
    } catch (e) {
        const { status, body } = toApiErrorPayload(e);
        return json(body, status);
    }
}

async function handleSyncFromEntries(client, commit) {
    const logs = [];
    logs.push(`Pattern Sync from Entries starting (commit=${commit})`);
    const patternInsertInfo = commit ? await getPatternInsertInfo(client) : null;

    const query = `
        SELECT DISTINCT cv_pattern as p, 'cv_wizen_pattern' as cat FROM entries WHERE cv_pattern IS NOT NULL AND cv_pattern != ''
        UNION
        SELECT DISTINCT form_fem_pattern as p, 'feminine_pattern' as cat FROM entries WHERE form_fem_pattern IS NOT NULL AND form_fem_pattern != ''
        UNION
        SELECT DISTINCT form_plural_pattern as p, 'broken_pattern' as cat FROM entries WHERE form_plural_pattern IS NOT NULL AND form_plural_pattern != ''
        UNION
        SELECT DISTINCT diminutive_pattern as p, 'diminutive_pattern' as cat FROM entries WHERE diminutive_pattern IS NOT NULL AND diminutive_pattern != ''
        UNION
        SELECT DISTINCT elative_pattern as p, 'adjective_pattern' as cat FROM entries WHERE elative_pattern IS NOT NULL AND elative_pattern != ''
    `;

    const res = await client.execute(query);
    logs.push(`Found ${res.rows.length} unique pattern/category pairs in entries.`);

    let addedCount = 0;
    let skippedCount = 0;
    const errors = [];
    for (const row of res.rows) {
        const rawPattern = String(row.p || '').trim();
        if (!rawPattern) continue;

        // Entries patterns often just have the CV part. 
        // We'll normalize it to a pattern object.
        const cv = rawPattern;
        const wizen = ''; // We don't know the Wiżen from the entry alone
        const patternId = btoa(encodeURIComponent(`${cv}|${wizen}`)).replace(/=/g, '');

        if (commit) {
            try {
                // Refine category for plural patterns
                let actualCat = row.cat;
                if (row.cat === 'broken_pattern' && cv.startsWith('-')) {
                    actualCat = 'sound_suffix';
                }

                // 1. Resolve canonical parent by cv_notation (schema has cv_notation UNIQUE)
                const resolvedPatternId = await resolveOrCreatePatternIdByCv(
                    client,
                    patternInsertInfo,
                    patternId,
                    cv,
                    wizen,
                    logs
                );
                if (!resolvedPatternId) {
                    skippedCount++;
                    const msg = `Skipped ${row.cat}: parent pattern row missing after upsert (${cv})`;
                    logs.push(msg);
                    errors.push(msg);
                    continue;
                }

                // 2. Link it to the correct category if not already linked
                const appId = `${resolvedPatternId}_${actualCat}_all_2`;
                await client.execute({
                    sql: `INSERT OR IGNORE INTO pattern_applicability (id, pattern_id, category, pos, stress, linguistic_role, metadata)
                          VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    args: [appId, resolvedPatternId, actualCat, 'all', 2, roleMap[actualCat] || '', '{}']
                });

                const role = roleMap[actualCat] || '';
                if (role) {
                    await client.execute({
                        sql: `UPDATE pattern_applicability SET linguistic_role = ? WHERE id = ? AND (linguistic_role IS NULL OR linguistic_role = '')`,
                        args: [role, appId]
                    });
                }
                addedCount++;
            } catch (e) {
                skippedCount++;
                const msg = `FAILED ${row.cat}: ${cv} -> ${e.message}`;
                logs.push(msg);
                errors.push(msg);
            }
        }
        logs.push(`Synced ${row.cat}: ${cv}`);
    }

    return json({ logs, committed: commit, added: addedCount, skipped: skippedCount, errors });
}

async function getPatternInsertInfo(client) {
    const infoRes = await client.execute(`PRAGMA table_info(patterns)`);
    const columns = new Set((infoRes.rows || []).map(r => String(r.name)));
    return {
        hasDescription: columns.has('description'),
        hasExampleWord: columns.has('example_word'),
    };
}

async function upsertPattern(client, insertInfo, patternId, cv, wizen) {
    const columns = ['id', 'cv_notation', 'wizen_notation'];
    const args = [patternId, cv, wizen];
    if (insertInfo?.hasDescription) {
        columns.push('description');
        args.push('');
    }
    if (insertInfo?.hasExampleWord) {
        columns.push('example_word');
        args.push(wizen || cv || '');
    }
    const placeholders = columns.map(() => '?').join(', ');
    await client.execute({
        sql: `INSERT OR IGNORE INTO patterns (${columns.join(', ')}) VALUES (${placeholders})`,
        args,
    });
}

async function resolveOrCreatePatternIdByCv(client, insertInfo, candidatePatternId, cv, wizen, logs) {
    const existingByCv = await client.execute({
        sql: `SELECT id, wizen_notation FROM patterns WHERE cv_notation = ? LIMIT 1`,
        args: [cv]
    });
    if (existingByCv.rows.length) {
        const existingId = String(existingByCv.rows[0].id);
        if (existingId !== candidatePatternId) {
            logs.push(`Reused existing pattern by cv_notation: ${cv} -> ${existingId}`);
        }
        return existingId;
    }

    await upsertPattern(client, insertInfo, candidatePatternId, cv, wizen);

    const resolved = await client.execute({
        sql: `SELECT id FROM patterns WHERE cv_notation = ? LIMIT 1`,
        args: [cv]
    });
    if (resolved.rows.length) {
        return String(resolved.rows[0].id);
    }
    return '';
}

async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') return true;
    try {
        const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
    } catch { return false; }
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
    return json({ error: 'Unauthorized' }, 401);
}

async function handleMigration(client, commit) {
    const logs = [];
    logs.push(`Migration starting (commit=${commit})`);

    // 1. Create tables if not exist
    const schema = [
        `CREATE TABLE IF NOT EXISTS patterns (
            id TEXT PRIMARY KEY,
            cv_notation TEXT,
            wizen_notation TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS pattern_applicability (
            id TEXT PRIMARY KEY,
            pattern_id TEXT REFERENCES patterns(id) ON DELETE CASCADE,
            category TEXT,
            pos TEXT,
            stress INTEGER,
            linguistic_role TEXT,
            gender TEXT,
            metadata TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    if (commit) {
        for (const sql of schema) {
            await client.execute(sql);
        }
        logs.push("Tables created/verified.");
    } else {
        logs.push("DRY RUN: Would create tables.");
    }

    // 2. Fetch all patterns from admin_config
    const patternCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];
    const placeholders = patternCategories.map(() => '?').join(',');
    const res = await client.execute({
        sql: `SELECT * FROM admin_config WHERE category IN (${placeholders})`,
        args: patternCategories
    });

    logs.push(`Found ${res.rows.length} rows to migrate.`);

    for (const row of res.rows) {
        try {
            const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            const normalized = validateAndNormalize(row.category, val);
            
            const cv = normalized.cv;
            const wizen = normalized.wizen;
            const patternId = btoa(encodeURIComponent(`${cv}|${wizen}`)).replace(/=/g, '');

            if (commit) {
                // Insert pattern if not exists
                await client.execute({
                    sql: `INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation) VALUES (?, ?, ?)`,
                    args: [patternId, cv, wizen]
                });

                // Insert applicability for each POS
                const posTypes = normalized.pos_types.length > 0 ? normalized.pos_types : ['all'];
                const normalizedApplicabilities = normalized.applicabilities?.length > 0 ? normalized.applicabilities : posTypes.map((pos) => ({
                    pos,
                    linguistic_role: normalized.linguistic_role || '',
                    gender: normalized.gender || '',
                    metadata: {},
                }));
                for (const applicability of normalizedApplicabilities) {
                    const pos = applicability.pos || 'all';
                    const appId = `${patternId}_${row.category}_${pos}`;
                    await client.execute({
                        sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order, linguistic_role, gender, metadata)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        args: [
                            appId,
                            patternId,
                            row.category,
                            pos,
                            normalized.stress,
                            row.sort_order,
                            applicability.linguistic_role || '',
                            applicability.gender || '',
                            JSON.stringify(applicability.metadata || {}),
                        ]
                    });
                }
            }
            logs.push(`Migrated ${row.category}: ${row.key} (${cv}/${wizen})`);
        } catch (e) {
            logs.push(`FAILED ${row.category} ${row.key}: ${e.message}`);
        }
    }

    return json({ logs, committed: commit });
}
