/**
 * Admin root etymology sync — /api/admin/sync-roots
 * Normalizes legacy root etymology records into the structured four-field shape.
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';
import { normalizeRootEtymologyValue } from './etymology.js';

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
    } catch {
        return false;
    }
}

function now() {
    return new Date().toISOString();
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
}

function internalError(err) {
    const { status, body } = toApiErrorPayload(err);
    return json(body, status);
}

function parseJsonValue(value) {
    if (!value) return null;
    if (value && typeof value === 'object') return value;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }
    return null;
}

function isNormalizedRootEtymology(raw, normalized) {
    const canonicalKeys = ['relationship', 'language', 'term', 'definition'];
    const legacyKeys = [
        'relation', 'type',
        'source_language', 'sourceLanguage', 'origin_language', 'originLanguage',
        'source_term', 'sourceTerm', 'source_form', 'sourceForm', 'form', 'word',
        'pronunciation', 'ipa', 'transcription', 'phonetic', 'reading',
        'meaning', 'gloss', 'translation', 'text',
    ];

    const rawItems = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
    const normalizedItems = Array.isArray(normalized) ? normalized : (normalized && typeof normalized === 'object' ? [normalized] : []);

    if (rawItems.length !== normalizedItems.length) return false;

    return rawItems.every((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        if (Object.keys(item).some((key) => !canonicalKeys.includes(key))) return false;
        if (legacyKeys.some((key) => key in item)) return false;

        const target = normalizedItems[index] || {};
        return canonicalKeys.every((key) => String(item[key] || '') === String(target[key] || ''));
    });
}

export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

        const body = await request.json().catch(() => ({}));
        const commit = body.commit === true;
        const client = getDbClient(env);
        const res = await client.execute({
            sql: 'SELECT id, consonants, etymology FROM roots ORDER BY consonants ASC',
            args: [],
        });

        const logs = [];
        const samples = [];
        let examined = 0;
        let updated = 0;
        let skipped = 0;

        for (const row of res.rows) {
            examined += 1;

            const raw = parseJsonValue(row.etymology);
            const normalized = normalizeRootEtymologyValue(row.etymology);
            const needsUpdate = !isNormalizedRootEtymology(raw, normalized);

            if (samples.length < 10) {
                samples.push({
                    id: String(row.id || ''),
                    consonants: String(row.consonants || ''),
                    before: raw,
                    after: normalized,
                    needs_update: needsUpdate,
                });
            }

            if (!needsUpdate) {
                skipped += 1;
                continue;
            }

            if (!commit) {
                skipped += 1;
                continue;
            }

            await client.execute({
                sql: 'UPDATE roots SET etymology = ?, updated_at = ? WHERE id = ? OR LOWER(consonants) = LOWER(?)',
                args: [JSON.stringify(normalized), now(), row.id, row.consonants],
            });
            updated += 1;
            if (updated <= 20) {
                logs.push(`Normalized ${row.consonants}`);
            }
        }

        logs.unshift(`Root etymology sync complete (commit=${commit})`);
        logs.push(`Examined ${examined} rows.`);

        return json({
            committed: commit,
            examined,
            updated,
            skipped,
            logs,
            samples,
        });
    } catch (e) {
        return internalError(e);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
