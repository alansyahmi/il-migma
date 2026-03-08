/**
 * Admin root CRUD — /api/admin/roots
 * Protected by Clerk JWT verification.
 */

import { createClient } from '@libsql/client/web';

const now = () => new Date().toISOString();

async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    // LOCAL DEV OVERRIDE
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    console.log('VerifyAdmin Check:', { url: request.url, isLocal, hasSecret: !!env.CLERK_SECRET_KEY });

    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') {
        console.log('Admin verify bypass activated');
        return true;
    }

    try {
        const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        if (!res.ok) {
            console.error('Clerk verify failed:', res.status, await res.text());
            return false;
        }

        const data = await res.json();
        return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
    } catch (e) {
        console.error('VerifyAdmin Exception:', e.message);
        return false;
    }
}

function db(env) {
    const url = env.TURSO_URL || env.VITE_TURSO_URL;
    const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
    if (!url) {
        const keys = Object.keys(env).join(', ');
        throw new Error(`TURSO_URL missing. Available env keys: ${keys}`);
    }
    return createClient({ url, authToken: token });
}

export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const client = db(env);

        let sql = `SELECT * FROM roots`;
        const args = [];
        if (q) {
            sql += ` WHERE consonants LIKE ?`;
            args.push(`%${q}%`);
        }
        sql += ` ORDER BY consonants ASC LIMIT 100`;

        const res = await client.execute({ sql, args });
        return json({ roots: res.rows });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        const consonants = body.consonants?.trim().toLowerCase().normalize('NFC');
        if (!consonants) return json({ error: 'consonants required' }, 400);

        const client = db(env);
        const force = body.force === true;

        if (!force) {
            const existingRes = await client.execute({
                sql: `SELECT id, consonants FROM roots WHERE consonants = ?`,
                args: [consonants]
            });
            if (existingRes.rows.length > 0) {
                return json({
                    error: 'DUPLICATE_CONSONANTS',
                    message: `A root with consonants '${consonants}' already exists.`,
                    existing: existingRes.rows[0]
                }, 409);
            }
        }

        const baseId = consonants;
        let id = body.id || baseId;

        // Check for ID collision if using baseId
        if (!body.id) {
            const idCheck = await client.execute({
                sql: `SELECT id FROM roots WHERE id LIKE ? OR id = ?`,
                args: [`${baseId}-%`, baseId]
            });
            if (idCheck.rows.length > 0) {
                let maxSuffix = 0;
                idCheck.rows.forEach(r => {
                    if (r.id === baseId) maxSuffix = Math.max(maxSuffix, 1);
                    else {
                        const match = r.id.match(new RegExp(`^${baseId}-(\\d+)$`));
                        if (match && match[1]) maxSuffix = Math.max(maxSuffix, parseInt(match[1], 10));
                    }
                });
                id = `${baseId}-${maxSuffix + 1}`;
            }
        }

        const consonant_array = JSON.stringify(consonants.split('-').map(c => c.trim().normalize('NFC')));

        // Dynamic column discovery
        const tableInfo = await client.execute("PRAGMA table_info(roots)");
        const columns = tableInfo.rows.map(r => r.name);

        const insertColumns = ['id', 'created_at', 'updated_at', 'consonants', 'consonant_array'];
        const insertArgs = [id, now(), now(), consonants, consonant_array];

        const mapping = {
            'synonyms': typeof body.synonyms === 'string' ? body.synonyms : JSON.stringify(body.synonyms || []),
            'antonyms': typeof body.antonyms === 'string' ? body.antonyms : JSON.stringify(body.antonyms || []),
            'related_entries': typeof body.related_entries === 'string' ? body.related_entries : JSON.stringify(body.related_entries || []),
            'tags': typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags || [])
        };

        for (const col of columns) {
            if (insertColumns.includes(col)) continue;

            if (col in mapping) {
                insertColumns.push(col);
                insertArgs.push(n(mapping[col]));
                continue;
            }

            if (col in body) {
                insertColumns.push(col);
                let val = body[col];
                if (Array.isArray(val) || (val && typeof val === 'object' && col !== 'notes' && col !== 'source')) {
                    val = JSON.stringify(val);
                }
                insertArgs.push(n(val));
            }
        }

        const placeholders = insertColumns.map(() => '?').join(',');
        await client.execute({
            sql: `INSERT INTO roots (${insertColumns.join(', ')}) VALUES (${placeholders})`,
            args: insertArgs,
        });

        // RECIPROCAL UPDATES
        if (body.synonyms?.length > 0 || body.antonyms?.length > 0) {
            const currentConsonants = consonants;
            const newSyns = typeof body.synonyms === 'string' ? JSON.parse(body.synonyms) : (body.synonyms || []);
            const newAnts = typeof body.antonyms === 'string' ? JSON.parse(body.antonyms) : (body.antonyms || []);

            const glossVal = body.gloss || '';
            let currentGloss = { en: '', mt: '' };
            try {
                const parsed = typeof glossVal === 'string' ? JSON.parse(glossVal) : glossVal;
                if (Array.isArray(parsed) && typeof parsed[0] === 'object') {
                    currentGloss = { en: parsed[0].en || '', mt: parsed[0].mt || '' };
                } else if (typeof glossVal === 'string' && glossVal) {
                    currentGloss = { en: glossVal, mt: '' };
                }
            } catch (e) {
                if (glossVal && typeof glossVal === 'string') currentGloss = { en: glossVal, mt: '' };
            }

            const updateReciprocal = async (targetCons, relType) => {
                if (!targetCons || targetCons === currentConsonants) return;
                // Fetch current root's gloss for reciprocal entries
                const currentRootRes = await client.execute({
                    sql: `SELECT gloss, consonants FROM roots WHERE id = ? OR LOWER(consonants) = LOWER(?)`,
                    args: [id, consonants]
                });
                const targetRes = await client.execute({ sql: `SELECT synonyms, antonyms FROM roots WHERE id = ? OR LOWER(consonants) = LOWER(?)`, args: [targetCons, targetCons] });
                if (targetRes.rows.length === 0) return;

                const targetData = targetRes.rows[0];
                let targetList = targetData[relType] ? (typeof targetData[relType] === 'string' ? JSON.parse(targetData[relType]) : targetData[relType]) : [];

                const exists = targetList.some(item => item.id === currentConsonants || item.headword === currentConsonants);
                if (!exists) {
                    targetList.push({ id: currentConsonants, headword: currentConsonants, pos: 'ROOT', gloss_en: currentGloss.en, gloss_mt: currentGloss.mt });
                    await client.execute({
                        sql: `UPDATE roots SET ${relType} = ?, updated_at = datetime('now') WHERE consonants = ?`,
                        args: [JSON.stringify(targetList), targetCons]
                    });
                }
            };

            for (const s of newSyns) await updateReciprocal(s.id || s.headword, 'synonyms');
            for (const a of newAnts) await updateReciprocal(a.id || a.headword, 'antonyms');
        }

        return json({ id, created: true }, 201);
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const ids = url.searchParams.get('ids');

        if (!id && !ids) return json({ error: 'id or ids required' }, 400);

        const client = db(env);

        if (ids) {
            const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
            if (idList.length === 0) return json({ error: 'ids empty' }, 400);

            // SQLite supports DELETE FROM table WHERE id IN (...)
            const placeholders = idList.map(() => '?').join(',');
            await client.execute({
                sql: `DELETE FROM roots WHERE id IN (${placeholders})`,
                args: idList
            });
            return json({ ids: idList, deleted: true });
        } else {
            await client.execute({ sql: 'DELETE FROM roots WHERE id = ? OR LOWER(consonants) = LOWER(?)', args: [id, id] });
            return json({ id, deleted: true });
        }
    } catch (e) {
        return json({ error: e.message }, 500);
    }
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

/** Convert empty/undefined to null for DB consistency, and normalize strings */
function n(val) {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}
