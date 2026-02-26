/**
 * GET /api/search?q=<query>&pos=<pos>&limit=<n>&offset=<n>
 * Full-text search against Turso entries_fts.
 *
 * Cloudflare Pages Function — env vars come from context.env (set in CF dashboard):
 *   TURSO_URL, TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client/web';

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() ?? '';
    const pos = url.searchParams.get('pos') ?? '';
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    if (!q) {
        return json({ results: [], total: 0 });
    }

    const db = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });

    try {
        // FTS5 MATCH query — escape special chars
        const ftsQuery = q.replace(/['"*()]/g, ' ').trim() + '*';

        let sql = `
      SELECT e.id, e.headword, e.pos, e.noun_gender, e.noun_plural_forms,
             e.verb_class, e.verb_perfective_3sgm,
             e.is_loanword, e.source_language,
             d.text_en, d.text_mt,
             p.ipa,
             ar.reliability_index
      FROM entries e
      LEFT JOIN definitions d ON d.entry_id = e.id AND d.sense_number = 1
      LEFT JOIN phonetics p   ON p.entry_id = e.id AND p.dialect = 'Standard'
      LEFT JOIN attestation_reliability ar ON ar.entry_id = e.id
      WHERE e.id IN (
        SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?
      )
    `;
        const args = [ftsQuery];

        if (pos) {
            sql += ' AND e.pos = ?';
            args.push(pos);
        }

        sql += ' ORDER BY rank LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const result = await db.execute({ sql, args });

        const rows = result.rows.map(r => ({
            id: r.id,
            headword: r.headword,
            pos: r.pos,
            noun_gender: r.noun_gender,
            noun_plural_forms: r.noun_plural_forms ? JSON.parse(r.noun_plural_forms) : [],
            verb_class: r.verb_class,
            is_loanword: Boolean(r.is_loanword),
            source_language: r.source_language,
            definition_en: r.text_en,
            definition_mt: r.text_mt,
            ipa: r.ipa,
            reliability_index: r.reliability_index,
        }));

        return json({ results: rows, total: rows.length, query: q });
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
