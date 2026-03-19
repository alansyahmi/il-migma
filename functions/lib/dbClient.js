import { createClient as createWebClient } from '@libsql/client/web';

const SUPPORTED_SCHEMES = ['libsql:', 'https:', 'http:', 'wss:', 'ws:'];

export class DbConfigError extends Error {
    constructor(message, { code = 'DB_CONFIG_ERROR', hint = '', status = 500 } = {}) {
        super(message);
        this.name = 'DbConfigError';
        this.code = code;
        this.hint = hint;
        this.status = status;
    }
}

export function toApiErrorPayload(error) {
    if (error instanceof DbConfigError) {
        return {
            status: error.status || 500,
            body: {
                error: error.message,
                code: error.code,
                hint: error.hint,
            },
        };
    }
    if (error?.code) {
        const statusMatch = String(error?.message || '').match(/HTTP status (\d+)/i);
        const upstreamStatus = statusMatch ? Number(statusMatch[1]) : undefined;
        let hint;
        if (error?.code === 'SERVER_ERROR' && upstreamStatus === 400) {
            hint = 'Turso rejected the request (HTTP 400). Most commonly the auth token is for a different DB or expired.';
        } else if (error?.code === 'SERVER_ERROR' && upstreamStatus === 401) {
            hint = 'Turso authentication failed (HTTP 401). Check TURSO_AUTH_TOKEN in .dev.vars.';
        }
        return {
            status: 500,
            body: {
                error: error?.message || 'Database request failed',
                code: String(error.code),
                upstream_status: upstreamStatus,
                hint: hint || 'Verify TURSO_URL and TURSO_AUTH_TOKEN in .dev.vars. Also confirm the target DB is reachable.',
            },
        };
    }
    return {
        status: 500,
        body: { error: error?.message || 'Internal server error' },
    };
}

function parseDbUrl(url) {
    try {
        return new URL(url);
    } catch {
        throw new DbConfigError(`TURSO_URL is not a valid URL: ${url}`, {
            code: 'DB_URL_INVALID',
            hint: 'Set TURSO_URL to a valid libsql:// or https:// endpoint for wrangler pages dev.',
        });
    }
}

export function getDbClient(env) {
    const url = env.TURSO_URL || env.VITE_TURSO_URL;
    if (!url) {
        throw new DbConfigError('TURSO_URL is not configured', {
            code: 'DB_URL_MISSING',
            hint: 'Set TURSO_URL and TURSO_AUTH_TOKEN in .dev.vars before running npm run dev:api.',
        });
    }

    const parsed = parseDbUrl(url);
    const scheme = parsed.protocol.toLowerCase();

    if (scheme === 'file:') {
        throw new DbConfigError('TURSO_URL with file:// is not supported by wrangler pages dev.', {
            code: 'DB_URL_UNSUPPORTED_SCHEME',
            hint: 'Use a remote libsql:// or https:// URL for dev:api. Keep file:// only for Node scripts.',
        });
    }

    if (!SUPPORTED_SCHEMES.includes(scheme)) {
        throw new DbConfigError(`Unsupported TURSO_URL scheme: "${scheme}"`, {
            code: 'DB_URL_UNSUPPORTED_SCHEME',
            hint: 'Use one of libsql://, https://, http://, wss://, or ws://.',
        });
    }

    const authToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN || '';
    if (/[<>]/.test(url)) {
        throw new DbConfigError('TURSO_URL appears to be a placeholder value.', {
            code: 'DB_URL_PLACEHOLDER',
            hint: 'Replace TURSO_URL with the real libsql:// or https:// database URL in .dev.vars.',
        });
    }
    if (!authToken || /[<>]/.test(authToken)) {
        throw new DbConfigError('TURSO_AUTH_TOKEN is missing or still a placeholder.', {
            code: 'DB_AUTH_TOKEN_INVALID',
            hint: 'Set a valid TURSO_AUTH_TOKEN in .dev.vars for npm run dev:api.',
            status: 401,
        });
    }
    return createWebClient({ url, authToken });
}
