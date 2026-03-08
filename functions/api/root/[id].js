
import { createClient } from '@libsql/client/web';

export async function onRequestGet({ env, params }) {
    const { id } = params;
    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });

        const searchId = decodeURIComponent(id).normalize('NFC');

        const rootRes = await db.execute({
            sql: `SELECT * FROM roots WHERE id = ? OR LOWER(consonants) = LOWER(?)`,
            args: [searchId, searchId],
        });

        if (!rootRes.rows.length) {
            return new Response(JSON.stringify({ error: 'Root not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const root = rootRes.rows[0];
        const jsonFields = ['hidden_forms', 'gloss', 'etymology', 'synonyms', 'antonyms', 'related_entries', 'tags', 'consonant_array'];
        for (const field of jsonFields) {
            try {
                if (root[field]) {
                    root[field] = JSON.parse(root[field]);
                } else if (field === 'hidden_forms' || field === 'tags' || field === 'consonant_array' || field === 'synonyms' || field === 'antonyms' || field === 'related_entries') {
                    root[field] = [];
                }
            } catch (e) {
                if (field === 'hidden_forms' || field === 'tags' || field === 'consonant_array' || field === 'synonyms' || field === 'antonyms' || field === 'related_entries') {
                    root[field] = [];
                }
            }
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
