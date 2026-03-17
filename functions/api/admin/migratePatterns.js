import { createClient } from '@libsql/client/web';
import { validateAndNormalize } from './configSchema';

// ── Migration Endpoint ────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();
        const body = await request.json();
        const { action } = body;

        const client = db(env);

        if (action === 'migrate') {
            return handleMigration(client, body.commit === true);
        }

        return new Response('Action required', { status: 400 });
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
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

function unauthorized() {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}

function db(env) {
    const url = env.TURSO_URL || env.VITE_TURSO_URL;
    const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
    return createClient({ url, authToken: token });
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
    const patternCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'adjective_pattern'];
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
            const patternId = btoa(`${cv}|${wizen}`).replace(/=/g, '');

            if (commit) {
                // Insert pattern if not exists
                await client.execute({
                    sql: `INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation) VALUES (?, ?, ?)`,
                    args: [patternId, cv, wizen]
                });

                // Insert applicability for each POS
                const posTypes = normalized.pos_types.length > 0 ? normalized.pos_types : ['all'];
                for (const pos of posTypes) {
                    const appId = `${patternId}_${row.category}_${pos}`;
                    await client.execute({
                        sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order)
                              VALUES (?, ?, ?, ?, ?, ?)`,
                        args: [appId, patternId, row.category, pos, normalized.stress, row.sort_order]
                    });
                }
            }
            logs.push(`Migrated ${row.category}: ${row.key} (${cv}/${wizen})`);
        } catch (e) {
            logs.push(`FAILED ${row.category} ${row.key}: ${e.message}`);
        }
    }

    return new Response(JSON.stringify({ logs, committed: commit }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
