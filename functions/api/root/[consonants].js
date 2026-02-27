
import { createClient } from '@libsql/client/web';

export async function onRequestGet({ env, params }) {
    const { consonants } = params;
    if (!consonants) {
        return new Response(JSON.stringify({ error: 'Missing consonants' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });

        const searchConsonants = decodeURIComponent(consonants).normalize('NFC');

        const rootRes = await db.execute({
            sql: `SELECT * FROM roots WHERE consonants = ?`,
            args: [searchConsonants],
        });

        if (!rootRes.rows.length) {
            return new Response(JSON.stringify({ error: 'Root not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const root = rootRes.rows[0];
        try {
            root.hidden_forms = root.hidden_forms ? JSON.parse(root.hidden_forms) : [];
        } catch (e) {
            root.hidden_forms = [];
        }

        return new Response(JSON.stringify({ root }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
