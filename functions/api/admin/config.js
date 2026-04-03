/**
 * Admin configuration CRUD — /api/admin/config
 * Protected by Clerk JWT verification.
 */

import { validateAndNormalize } from './configSchema.js';
import { normalizePatternFormValue } from './patternMetadata.js';
import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';

// ── Auth guard ────────────────────────────────────────────────────────────────
async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    // LOCAL DEV OVERRIDE
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');

    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') {
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
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

function unauthorized() {
    return json({ error: 'Unauthorized — admin role required' }, 401);
}

function internalError(err) {
    const { status, body } = toApiErrorPayload(err);
    return json(body, status);
}

function normalizePosTypes(rawPosTypes) {
    let parsed = rawPosTypes;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            parsed = [];
        }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(p => typeof p === 'string' && p !== 'all');
}

function parsePatternCompositeId(id) {
    if (!id || typeof id !== 'string') return null;
    const firstSep = id.indexOf('_');
    const lastSep = id.lastIndexOf('_');
    if (firstSep <= 0 || lastSep <= firstSep) return null;

    return {
        patternId: id.slice(0, firstSep),
        category: id.slice(firstSep + 1, lastSep),
        suffix: id.slice(lastSep + 1), // stress number, pos token, or "all"
    };
}

async function upsertPatternByCv(client, cv, wizen, description) {
    const existingByCv = await client.execute({
        sql: `SELECT id FROM patterns WHERE cv_notation = ? LIMIT 1`,
        args: [cv]
    });

    if (existingByCv.rows.length) {
        const existingId = String(existingByCv.rows[0].id);
        await client.execute({
            sql: `UPDATE patterns
                  SET wizen_notation = COALESCE(NULLIF(?, ''), wizen_notation),
                      description = COALESCE(NULLIF(?, ''), description)
                  WHERE id = ?`,
            args: [wizen, description ?? null, existingId]
        });
        return existingId;
    }

    const patternId = btoa(encodeURIComponent(`${cv}|${wizen}`)).replace(/=/g, '');
    await client.execute({
        sql: `INSERT INTO patterns (id, cv_notation, wizen_notation, description)
              VALUES (?, ?, ?, ?)`,
        args: [patternId, cv, wizen, description ?? null]
    });
    return patternId;
}

async function ensurePatternApplicabilityMetadataColumn(client) {
    const info = await client.execute('PRAGMA table_info(pattern_applicability)');
    const columns = new Set((info.rows || []).map((row) => String(row.name)));
    if (columns.has('metadata')) return;

    try {
        await client.execute('ALTER TABLE pattern_applicability ADD COLUMN metadata TEXT');
    } catch (error) {
        // If another request added it first, SQLite will surface a duplicate-column error.
        // That is harmless, so ignore it.
    }
}

function parseJsonObject(raw) {
    if (!raw || typeof raw !== 'string') return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function normalizePatternApplicabilityRow(row) {
    const metadata = parseJsonObject(row.metadata);
    const classValue = String(metadata.class || metadata.strength || '').trim();
    const weakClass = String(metadata.weak_class || '').trim();
    const verbForm = String(metadata.verb_form || '').trim();
    const classCompatibility = String(metadata.class_compatibility || '').trim();
    const linguisticRole = String(row.linguistic_role || metadata.linguistic_role || '').trim();
    const gender = String(row.gender || metadata.gender || '').trim();
    const participleType = String(metadata.participle_type || '').trim();
    const numeralType = String(metadata.numeral_type || '').trim();
    const notes = String(metadata.notes || '').trim();
    const mergedMetadata = {
        ...metadata,
    };

    if (classValue) mergedMetadata.class = classValue;
    if (gender) mergedMetadata.gender = gender;
    if (weakClass) mergedMetadata.weak_class = weakClass;
    if (verbForm) mergedMetadata.verb_form = verbForm;
    if (classCompatibility) mergedMetadata.class_compatibility = classCompatibility;
    if (linguisticRole) mergedMetadata.linguistic_role = linguisticRole;
    if (participleType) mergedMetadata.participle_type = participleType;
    if (numeralType) mergedMetadata.numeral_type = numeralType;
    if (notes) mergedMetadata.notes = notes;
    delete mergedMetadata.strength;
    return {
        pos: String(row.pos || '').trim().toLowerCase(),
        classValue,
        gender,
        weakClass,
        verbForm,
        classCompatibility,
        linguisticRole,
        participleType,
        numeralType,
        notes,
        metadata: mergedMetadata,
    };
}

function normalizePatternApplicabilities(value) {
    const normalized = normalizePatternFormValue(value);
    return Array.isArray(normalized.applicabilities) ? normalized.applicabilities : [];
}

function buildPatternPayloadRows(clientPatternId, category, value, sortOrder) {
    const stress = Number.isFinite(Number(value.stress)) ? Number(value.stress) : null;
    const stressToken = stress === null ? 'null' : String(stress);
    const applicabilities = normalizePatternApplicabilities(value);

    return applicabilities.map((applicability) => ({
        id: `${clientPatternId}_${category}_${stressToken}_${applicability.pos}`,
        pattern_id: clientPatternId,
        category,
        pos: applicability.pos,
        stress,
        sort_order: sortOrder,
        linguistic_role: applicability.linguisticRole || '',
        gender: applicability.gender || '',
        metadata: JSON.stringify(applicability.metadata || {}),
    }));
}

function groupPatternRows(rows) {
    const groups = new Map();

    rows.forEach((row) => {
        const stressKey = row.stress === null || row.stress === undefined ? 'null' : String(row.stress);
        const groupKey = `${row.patternId}|${row.category}|${stressKey}`;
        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                patternId: row.patternId,
                category: row.category,
                stress: row.stress,
                cv: row.cv_notation,
                wizen: row.wizen_notation,
                description: row.description || '',
                sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
                applicabilities: [],
            });
        }

        const group = groups.get(groupKey);
        group.sort_order = Math.min(group.sort_order, Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0);
        group.applicabilities.push(normalizePatternApplicabilityRow(row));
    });

    return Array.from(groups.values()).map((group) => {
        const posTypes = Array.from(new Set(group.applicabilities.map((item) => item.pos).filter(Boolean)));
        const firstRole = group.applicabilities.find((item) => item.linguisticRole)?.linguisticRole || group.applicabilities.find((item) => item.metadata?.linguistic_role)?.metadata?.linguistic_role || '';
        const firstGender = group.applicabilities.find((item) => item.gender)?.gender || '';
        const firstClassValue = group.applicabilities.find((item) => item.classValue)?.classValue || group.applicabilities.find((item) => item.metadata?.class)?.metadata?.class || group.applicabilities.find((item) => item.metadata?.strength)?.metadata?.strength || '';
        const firstWeakClass = group.applicabilities.find((item) => item.weakClass)?.weakClass || group.applicabilities.find((item) => item.metadata?.weak_class)?.metadata?.weak_class || '';
        const firstVerbForm = group.applicabilities.find((item) => item.verbForm)?.verbForm || group.applicabilities.find((item) => item.metadata?.verb_form)?.metadata?.verb_form || '';
        const firstClassCompatibility = group.applicabilities.find((item) => item.classCompatibility)?.classCompatibility || group.applicabilities.find((item) => item.metadata?.class_compatibility)?.metadata?.class_compatibility || '';
        const firstParticipleType = group.applicabilities.find((item) => item.participleType)?.participleType || group.applicabilities.find((item) => item.metadata?.participle_type)?.metadata?.participle_type || '';
        const firstNumeralType = group.applicabilities.find((item) => item.numeralType)?.numeralType || group.applicabilities.find((item) => item.metadata?.numeral_type)?.metadata?.numeral_type || '';
        const firstNotes = group.applicabilities.find((item) => item.notes)?.notes || group.applicabilities.find((item) => item.metadata?.notes)?.metadata?.notes || '';

        return {
            id: `${group.patternId}_${group.category}_${group.stress === null || group.stress === undefined ? 'null' : group.stress}`,
            category: group.category,
            key: `${group.cv}/${group.wizen}`,
            value: JSON.stringify({
                cv: group.cv,
                wizen: group.wizen,
                stress: group.stress,
                description: group.description,
                pos_types: posTypes,
                applicabilities: group.applicabilities,
                linguistic_role: firstRole,
                gender: firstGender,
                class: firstClassValue,
                weak_class: firstWeakClass,
                verb_form: firstVerbForm,
                class_compatibility: firstClassCompatibility,
                participle_type: firstParticipleType,
                numeral_type: firstNumeralType,
                notes: firstNotes,
            }),
            sort_order: group.sort_order,
        };
    });
}

// ── GET — list config ────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const category = url.searchParams.get('category');

        const client = getDbClient(env);

        await ensurePatternApplicabilityMetadataColumn(client);

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];

        let patterns = [];
        if (!category || normalizedCategories.includes(category)) {
            try {
                const sql = `
                    SELECT
                        p.id as patternId,
                        pa.category,
                        pa.pos,
                        pa.stress,
                        pa.sort_order,
                        p.cv_notation,
                        p.wizen_notation,
                        p.description,
                        pa.linguistic_role,
                        pa.gender,
                        COALESCE(pa.metadata, '{}') as metadata
                    FROM pattern_applicability pa
                    JOIN patterns p ON p.id = pa.pattern_id
                    WHERE pa.is_active = 1
                    ${category ? 'AND pa.category = ?' : ''}
                    ORDER BY p.cv_notation ASC, pa.category ASC, pa.stress ASC, pa.sort_order ASC, pa.pos ASC
                `;
                const res = await client.execute({
                    sql,
                    args: category ? [category] : []
                });
                patterns = groupPatternRows(res.rows);
            } catch (pErr) {
                console.error('Pattern query failed (missing tables?):', pErr.message);
                // Fallback: stay empty, legacyRes will catch any patterns still in admin_config
            }
        }

        // Legacy Query for everything else
        let sql = `SELECT * FROM admin_config`;
        const args = [];
        if (category) {
            sql += ` WHERE category = ?`;
            args.push(category);
        }

        const legacyRes = await client.execute({ sql, args });
        
        // Combine results
        const config = [...legacyRes.rows, ...patterns].sort((a, b) => {
            if (a.category < b.category) return -1;
            if (a.category > b.category) return 1;
            return (a.sort_order || 0) - (b.sort_order || 0);
        });

        return json({ config });
    } catch (e) {
        return internalError(e);
    }
}

// ── POST — create config item ──────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        let { category, key, value, sort_order = 0 } = body;
        if (!category || !key || value === undefined) return json({ error: 'category, key, and value are required' }, 400);

        // Validation & Normalization
        try {
            value = validateAndNormalize(category, value);
        } catch (err) {
            return json({ error: `Validation failed: ${err.message}` }, 400);
        }

        const client = getDbClient(env);
        await ensurePatternApplicabilityMetadataColumn(client);
        const id = Math.random().toString(36).slice(2, 11);

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];
        if (normalizedCategories.includes(category)) {
            const cv = value.cv;
            const wizen = value.wizen;
            const patternId = await upsertPatternByCv(client, cv, wizen, value.description);

            const rows = buildPatternPayloadRows(patternId, category, value, sort_order);
            for (const row of rows) {
                await client.execute({
                    sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order, linguistic_role, gender, metadata)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [row.id, row.pattern_id, row.category, row.pos, row.stress, row.sort_order, row.linguistic_role, row.gender, row.metadata]
                });
            }
            return json({ id: patternId, created: true }, 201);
        }

        await client.execute({
            sql: `INSERT INTO admin_config (id, category, key, value, sort_order, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [id, category, key, JSON.stringify(value), sort_order],
        });

        return json({ id, created: true }, 201);
    } catch (e) {
        return internalError(e);
    }
}

// ── PUT — update config item ───────────────────────────────────────────────────
export async function onRequestPut({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        let { id, category, key, value, sort_order } = body;
        if (!id) return json({ error: 'id required' }, 400);

        const client = getDbClient(env);
        await ensurePatternApplicabilityMetadataColumn(client);

        const normalizedCategories = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];
        if (category && normalizedCategories.includes(category)) {
            // value is a whole object {cv, wizen, stress, pos_types}
            try {
                value = validateAndNormalize(category, value);
            } catch (err) {
                return json({ error: `Validation failed: ${err.message}` }, 400);
            }

            const cv = value.cv;
            const wizen = value.wizen;
            const patternId = await upsertPatternByCv(client, cv, wizen, value.description);

            // 2. Delete old applicability group (supports both grouped IDs and row IDs)
            const parsed = parsePatternCompositeId(id);
            if (parsed) {
                if (parsed.suffix === 'all') {
                    await client.execute({
                        sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ?`,
                        args: [parsed.patternId, parsed.category]
                    });
                } else {
                    const parsedStress = Number(parsed.suffix);
                    if (Number.isFinite(parsedStress)) {
                        await client.execute({
                            sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND stress = ?`,
                            args: [parsed.patternId, parsed.category, parsedStress]
                        });
                    } else {
                        await client.execute({
                            sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND pos = ?`,
                            args: [parsed.patternId, parsed.category, parsed.suffix]
                        });
                    }
                }
            }
            
            // Always try deleting the specific exact ID as fallback
            await client.execute({ sql: `DELETE FROM pattern_applicability WHERE id = ?`, args: [id] });

            // 3. Insert new applicability rows for each POS
            const rows = buildPatternPayloadRows(patternId, category, value, sort_order);
            for (const row of rows) {
                await client.execute({
                    sql: `INSERT OR REPLACE INTO pattern_applicability (id, pattern_id, category, pos, stress, sort_order, linguistic_role, gender, metadata)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [row.id, row.pattern_id, row.category, row.pos, row.stress, row.sort_order, row.linguistic_role, row.gender, row.metadata]
                });
            }
            return json({ id: `${patternId}_${category}_${value.stress ?? 'null'}`, updated: true });
        }

        // ... existing legacy update logic ...
        const setClauses = [];
        const args = [];

        if (category !== undefined) { setClauses.push(`category = ?`); args.push(category); }
        if (key !== undefined) { setClauses.push(`key = ?`); args.push(key); }
        if (value !== undefined) { setClauses.push(`value = ?`); args.push(JSON.stringify(value)); }
        if (sort_order !== undefined) { setClauses.push(`sort_order = ?`); args.push(sort_order); }

        if (!setClauses.length) return json({ error: 'no fields to update' }, 400);

        setClauses.push(`updated_at = datetime('now')`);
        args.push(id);

        await client.execute({
            sql: `UPDATE admin_config SET ${setClauses.join(', ')} WHERE id = ?`,
            args,
        });

        return json({ id, updated: true });
    } catch (e) {
        return internalError(e);
    }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'id required' }, 400);

        const client = getDbClient(env);
        
        const parsed = parsePatternCompositeId(id);
        if (parsed) {
            if (parsed.suffix === 'all') {
                const appRes = await client.execute({
                    sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ?`,
                    args: [parsed.patternId, parsed.category]
                });
                if (appRes.rowsAffected > 0) {
                    return json({ id, deleted: true });
                }
            } else {
                const parsedStress = Number(parsed.suffix);
                if (Number.isFinite(parsedStress)) {
                    const appRes = await client.execute({
                        sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND stress = ?`,
                        args: [parsed.patternId, parsed.category, parsedStress]
                    });
                    if (appRes.rowsAffected > 0) {
                        return json({ id, deleted: true });
                    }
                } else {
                    const appRes = await client.execute({
                        sql: `DELETE FROM pattern_applicability WHERE pattern_id = ? AND category = ? AND pos = ?`,
                        args: [parsed.patternId, parsed.category, parsed.suffix]
                    });
                    if (appRes.rowsAffected > 0) {
                        return json({ id, deleted: true });
                    }
                }
            }
        }

        const appRes = await client.execute({ sql: `DELETE FROM pattern_applicability WHERE id = ?`, args: [id] });
        if (appRes.rowsAffected > 0) {
            return json({ id, deleted: true });
        }

        await client.execute({ sql: `DELETE FROM admin_config WHERE id = ?`, args: [id] });

        return json({ id, deleted: true });
    } catch (e) {
        return internalError(e);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
