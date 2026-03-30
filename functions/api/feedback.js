import { getDbClient, toApiErrorPayload } from '../lib/dbClient.js';

const ALLOWED_KINDS = new Set(['suggestion', 'feedback']);
const ALLOWED_CATEGORIES = {
    suggestion: new Set(['entry', 'root']),
    feedback: new Set(['general', 'bug', 'content', 'feature']),
};

class SubmissionValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SubmissionValidationError';
        this.status = 400;
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const client = getDbClient(env);
        await ensureTable(client);

        const body = await request.json();
        const kind = normalizeKind(body?.kind);
        const category = normalizeText(body?.category, 1, 50);
        const subject = normalizeText(body?.subject, 1, 200);
        const email = normalizeOptionalEmail(body?.email);
        const message = normalizeOptionalText(body?.message, 4000);
        const pagePath = normalizeOptionalText(body?.pagePath, 200);
        const pageUrl = normalizeOptionalText(body?.pageUrl, 500);

        if (!ALLOWED_KINDS.has(kind)) {
            return json({ error: `Invalid submission kind: ${kind}` }, 400);
        }

        if (!ALLOWED_CATEGORIES[kind].has(category)) {
            return json({ error: `Invalid category "${category}" for ${kind}` }, 400);
        }

        const id = crypto.randomUUID();
        const userAgent = request.headers.get('user-agent') || null;
        const referer = request.headers.get('referer') || null;

        await client.execute({
            sql: `
                INSERT INTO site_submissions (
                    id,
                    kind,
                    category,
                    subject,
                    email,
                    message,
                    page_path,
                    page_url,
                    referer,
                    user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                id,
                kind,
                category,
                subject,
                email,
                message,
                pagePath,
                pageUrl,
                referer,
                userAgent,
            ],
        });

        return json({ ok: true, id }, 201);
    } catch (e) {
        if (e instanceof SubmissionValidationError) {
            return json({ error: e.message }, e.status || 400);
        }
        const { status, body } = toApiErrorPayload(e);
        return json(body, status);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

async function ensureTable(client) {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS site_submissions (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            category TEXT NOT NULL,
            subject TEXT NOT NULL,
            email TEXT,
            message TEXT,
            page_path TEXT,
            page_url TEXT,
            referer TEXT,
            user_agent TEXT,
            status TEXT NOT NULL DEFAULT 'new',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_site_submissions_kind_status_created_at
        ON site_submissions (kind, status, created_at DESC)
    `);
}

function normalizeKind(value) {
    return String(value || 'feedback').trim().toLowerCase();
}

function normalizeText(value, minLength, maxLength) {
    const text = String(value || '').trim();
    if (text.length < minLength || text.length > maxLength) {
        throw new SubmissionValidationError(`Value must be between ${minLength} and ${maxLength} characters.`);
    }
    return text;
}

function normalizeOptionalText(value, maxLength) {
    const text = String(value || '').trim();
    if (!text) return null;
    if (text.length > maxLength) {
        throw new SubmissionValidationError(`Value must be at most ${maxLength} characters.`);
    }
    return text;
}

function normalizeOptionalEmail(value) {
    const email = String(value || '').trim();
    if (!email) return null;
    if (email.length > 254) {
        throw new SubmissionValidationError('Email address is too long.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new SubmissionValidationError('Please enter a valid email address.');
    }
    return email;
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
