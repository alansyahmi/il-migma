/**
 * Admin stem sync — /api/admin/sync-stems
 * Normalizes legacy stem etymology records into the structured five-field shape.
 */

import { getDbClient, toApiErrorPayload } from '../../lib/dbClient.js';
import { normalizeStemEtymologyValue } from './stems.js';

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

function parseJsonObject(value) {
    if (!value) return {};
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch {
            return {};
        }
    }
    return {};
}

function isNormalizedStemEtymology(raw, normalized) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;

    const canonicalKeys = ['relationship', 'language', 'term', 'pronunciation', 'definition'];
    const legacyKeys = [
        'relation', 'type',
        'source_language', 'sourceLanguage', 'origin_language', 'originLanguage',
        'source_term', 'sourceTerm', 'source_form', 'sourceForm', 'form', 'word',
        'ipa', 'transcription', 'phonetic', 'reading',
        'meaning', 'gloss', 'translation', 'text',
    ];

    if (Object.keys(raw).some((key) => !canonicalKeys.includes(key))) return false;
    if (legacyKeys.some((key) => key in raw)) return false;

    return canonicalKeys.every((key) => String(raw[key] || '') === String(normalized[key] || ''));
}

export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

        const body = await request.json().catch(() => ({}));
        const commit = body.commit === true;
        const client = getDbClient(env);
        const res = await client.execute({
            sql: 'SELECT stem_string, etymology FROM stems ORDER BY stem_string ASC',
            args: [],
        });

        const logs = [];
        const samples = [];
        let examined = 0;
        let updated = 0;
        let skipped = 0;

        for (const row of res.rows) {
            examined += 1;

            const raw = parseJsonObject(row.etymology);
            const normalized = normalizeStemEtymologyValue(row.etymology);
            const needsUpdate = !isNormalizedStemEtymology(raw, normalized);

            if (samples.length < 10) {
                samples.push({
                    stem_string: String(row.stem_string || ''),
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
                sql: 'UPDATE stems SET etymology = ?, updated_at = ? WHERE stem_string = ?',
                args: [JSON.stringify(normalized), now(), row.stem_string],
            });
            updated += 1;
            if (updated <= 20) {
                logs.push(`Normalized ${row.stem_string}`);
            }
        }

        logs.unshift(`Stem etymology sync complete (commit=${commit})`);
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
