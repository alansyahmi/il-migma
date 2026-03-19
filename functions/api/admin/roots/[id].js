import { getDbClient, toApiErrorPayload } from '../../../lib/dbClient.js';

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
    } catch (e) {
        return false;
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

function unauthorized() {
    return json({ error: 'Unauthorized — admin role required' }, 401);
}

function internalError(err) {
    const { status, body } = toApiErrorPayload(err);
    return json(body, status);
}

export async function onRequestGet({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const { id } = params;
        if (!id) return json({ error: 'id parameter required' }, 400);

        const decodedId = decodeURIComponent(id).normalize('NFC');

        const client = getDbClient(env);
        const rootRes = await client.execute({
            sql: `SELECT * FROM roots WHERE id = ? OR LOWER(consonants) = LOWER(?)`,
            args: [decodedId, decodedId],
        });

        if (rootRes.rows.length === 0) {
            return json({ error: 'Root not found' }, 404);
        }

        const root = rootRes.rows[0];

        // Parse hidden_forms if it exists
        try {
            root.hidden_forms = root.hidden_forms ? JSON.parse(root.hidden_forms) : [];
        } catch (e) {
            root.hidden_forms = [];
        }

        return json({ root });
    } catch (e) {
        return internalError(e);
    }
}

export async function onRequestPut({ request, env, params }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const { id } = params;
        const decodedId = decodeURIComponent(id).normalize('NFC');
        const body = await request.json();

        const client = getDbClient(env);

        // Dynamic column discovery
        const tableInfo = await client.execute("PRAGMA table_info(roots)");
        const columns = tableInfo.rows.map(r => r.name).filter(c => !['id', 'created_at', 'updated_at'].includes(c));

        const mapping = {
            'synonyms': body.synonyms !== undefined ? (typeof body.synonyms === 'string' ? body.synonyms : JSON.stringify(body.synonyms)) : undefined,
            'antonyms': body.antonyms !== undefined ? (typeof body.antonyms === 'string' ? body.antonyms : JSON.stringify(body.antonyms)) : undefined,
            'related_entries': body.related_entries !== undefined ? (typeof body.related_entries === 'string' ? body.related_entries : JSON.stringify(body.related_entries)) : undefined,
            'tags': body.tags !== undefined ? (typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags)) : undefined,
            'hidden_forms': body.hidden_forms !== undefined ? JSON.stringify(body.hidden_forms) : undefined
        };

        const setClauses = ["updated_at = datetime('now')"];
        const args = [];

        for (const col of columns) {
            let val;
            if (col in mapping && mapping[col] !== undefined) {
                val = mapping[col];
            } else if (col in body) {
                val = body[col];
            } else {
                continue;
            }

            // Special handling for consonants rename
            if (col === 'consonants') {
                const newCons = val.trim().toLowerCase().normalize('NFC');
                const arr = JSON.stringify(newCons.split('-').map(c => c.trim().normalize('NFC')));
                setClauses.push(`consonants = ?`);
                args.push(newCons);
                setClauses.push(`consonant_array = ?`);
                args.push(arr);
                continue;
            }

            if (col === 'consonant_array') continue; // Handled by consonants

            setClauses.push(`${col} = ?`);
            args.push(n(val));
        }

        if (setClauses.length <= 1) return json({ error: 'No fields to update' }, 400);

        const sql = `UPDATE roots SET ${setClauses.join(', ')} WHERE id = ? OR LOWER(consonants) = LOWER(?)`;
        args.push(decodedId, decodedId);

        // Handle ID rename 
        const oldId = body._oldId;
        const newId = body.id;
        if (oldId && newId && oldId !== newId) {
            try {
                const columnsRes = await client.execute("PRAGMA table_info(roots)");
                const colNames = columnsRes.rows.map(r => r.name).filter(n => n !== 'id');

                await client.execute({
                    sql: `INSERT INTO roots (id, ${colNames.join(', ')}) SELECT ?, ${colNames.join(', ')} FROM roots WHERE id = ?`,
                    args: [newId, oldId]
                });

                // Update child tables
                await client.execute({ sql: `UPDATE root_pattern_forms SET root_id = ? WHERE root_id = ?`, args: [newId, oldId] });

                // Note: reciprocal updates for synonyms/antonyms in other roots are NOT handled here 
                // but the buildRootPayload logic in modals will eventually sync them on next save of those other roots.
                // For now, we prioritize consistency of the current root.

                await client.execute({ sql: `DELETE FROM roots WHERE id = ?`, args: [oldId] });
            } catch (e) {
                return json({ error: 'Failed to rename ID: ' + e.message }, 400);
            }
        } else {
            await client.execute({ sql, args });
        }

        // RECIPROCAL UPDATES

        // RECIPROCAL UPDATES
        if (body.synonyms !== undefined || body.antonyms !== undefined) {
            const currentId = decodedId;
            const newSyns = typeof body.synonyms === 'string' ? JSON.parse(body.synonyms) : (body.synonyms || []);
            const newAnts = typeof body.antonyms === 'string' ? JSON.parse(body.antonyms) : (body.antonyms || []);

            // Fetch current root's gloss for reciprocal entries
            const currentRootRes = await client.execute({
                sql: `SELECT gloss, consonants FROM roots WHERE id = ? OR LOWER(consonants) = LOWER(?)`,
                args: [currentId, currentId]
            });
            const currentConsonants = currentRootRes.rows[0]?.consonants || '';
            const currentGlossRaw = currentRootRes.rows[0]?.gloss || '';
            let currentGloss = { en: '', mt: '' };
            try {
                const parsed = JSON.parse(currentGlossRaw);
                if (Array.isArray(parsed) && typeof parsed[0] === 'object') {
                    currentGloss = { en: parsed[0].en || '', mt: parsed[0].mt || '' };
                } else if (typeof currentGlossRaw === 'string') {
                    currentGloss = { en: currentGlossRaw, mt: '' };
                }
            } catch (e) {
                currentGloss = { en: currentGlossRaw, mt: '' };
            }

            const updateReciprocal = async (targetId, relType, isAdding) => {
                if (!targetId || targetId === currentId) return;
                const targetRes = await client.execute({ sql: `SELECT synonyms, antonyms FROM roots WHERE id = ?`, args: [targetId] });
                if (targetRes.rows.length === 0) return;

                const targetData = targetRes.rows[0];
                let targetList = targetData[relType] ? (typeof targetData[relType] === 'string' ? JSON.parse(targetData[relType]) : targetData[relType]) : [];

                const exists = targetList.some(item => item.id === currentConsonants || item.headword === currentConsonants);

                if (isAdding && !exists) {
                    targetList.push({ id: currentConsonants, headword: currentConsonants, pos: 'ROOT', gloss_en: currentGloss.en, gloss_mt: currentGloss.mt });
                } else if (!isAdding && exists) {
                    targetList = targetList.filter(item => item.id !== currentConsonants && item.headword !== currentConsonants);
                } else {
                    return; // No change needed
                }

                await client.execute({
                    sql: `UPDATE roots SET ${relType} = ?, updated_at = datetime('now') WHERE id = ?`,
                    args: [JSON.stringify(targetList), targetId]
                });
            };

            // Simplified: for now, we just ensure all CURRENT ones have us. 
            // A more robust way would be comparing with old state to REMOVE from old targets, 
            // but for "User friendly" UX, ensuring presence is the priority.
            for (const s of newSyns) await updateReciprocal(s.id || s.headword, 'synonyms', true);
            for (const a of newAnts) await updateReciprocal(a.id || a.headword, 'antonyms', true);
        }

        return json({ success: true });
    } catch (e) {
        return internalError(e);
    }
}

/** Convert empty/undefined to null for DB consistency, and normalize strings */
function n(val) {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}
