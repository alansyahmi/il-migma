/**
 * Admin entry CRUD — /api/admin/entries
 * Protected by Clerk JWT verification.
 *
 * GET    /api/admin/entries?page=&limit=&q=  → list entries
 * POST   /api/admin/entries                   → create entry
 * PUT    /api/admin/entries                   → update entry (body must have id)
 * DELETE /api/admin/entries?id=               → delete entry
 *
 * Cloudflare Pages Function env vars:
 *   TURSO_URL, TURSO_AUTH_TOKEN, CLERK_SECRET_KEY
 */

import { createClient } from '@libsql/client';

// ── Auth guard ────────────────────────────────────────────────────────────────
async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    // Verify with Clerk backend API
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
    // Only allow users with role = 'admin' in publicMetadata
    return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
}

function db(env) {
    return createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });
}

function uid() {
    return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 6);
}

function now() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ── GET — list entries ────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    if (!(await verifyAdmin(request, env))) return unauthorized();

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const q = url.searchParams.get('q')?.trim() ?? '';

    const client = db(env);
    let sql = `SELECT e.id, e.headword, e.pos, e.noun_gender, e.verb_class,
                     e.is_loanword, e.source_language, e.created_at,
                     d.text_en
              FROM entries e
              LEFT JOIN definitions d ON d.entry_id = e.id AND d.sense_number = 1`;
    const args = [];

    if (q) {
        sql += ' WHERE e.headword LIKE ?';
        args.push(`%${q}%`);
    }
    sql += ' ORDER BY e.headword ASC LIMIT ? OFFSET ?';
    args.push(limit, offset);

    const [res, countRes] = await Promise.all([
        client.execute({ sql, args }),
        client.execute({
            sql: `SELECT COUNT(*) as total FROM entries${q ? ' WHERE headword LIKE ?' : ''}`,
            args: q ? [`%${q}%`] : [],
        }),
    ]);

    return json({
        entries: res.rows,
        total: Number(countRes.rows[0]?.total ?? 0),
        limit, offset,
    });
}

// ── POST — create entry ────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    if (!(await verifyAdmin(request, env))) return unauthorized();

    const body = await request.json();
    const client = db(env);
    const id = uid();

    const {
        headword, pos, noun_gender, noun_singular, noun_plural_forms,
        noun_sound_plural, noun_dual, noun_diminutive,
        verb_class, verb_transitivity, verb_perfective_3sgm, verb_imperfective_3sgm,
        verb_verbal_noun, verb_active_ptcp, verb_passive_ptcp,
        adj_masculine, adj_feminine, adj_plural, adj_elative,
        is_loanword = false, source_language, tags = [],
        definition_en, definition_mt, register, field,
        ipa,
    } = body;

    if (!headword || !pos) return json({ error: 'headword and pos are required' }, 400);

    await client.execute({
        sql: `INSERT INTO entries (
            id, headword, pos,
            noun_gender, noun_singular, noun_plural_forms, noun_sound_plural, noun_dual, noun_diminutive,
            verb_class, verb_transitivity, verb_perfective_3sgm, verb_imperfective_3sgm,
            verb_verbal_noun, verb_active_ptcp, verb_passive_ptcp,
            adj_masculine, adj_feminine, adj_plural, adj_elative,
            is_loanword, source_language, tags, created_at, updated_at
          ) VALUES (
            ?,?,?,  ?,?,?,?,?,?,  ?,?,?,?,  ?,?,?,  ?,?,?,?,  ?,?,?,?,?
          )`,
        args: [
            id, headword, pos,
            noun_gender ?? null, noun_singular ?? null,
            noun_plural_forms?.length ? JSON.stringify(noun_plural_forms) : null,
            noun_sound_plural ?? null, noun_dual ?? null, noun_diminutive ?? null,
            verb_class ?? null, verb_transitivity ?? null,
            verb_perfective_3sgm ?? null, verb_imperfective_3sgm ?? null,
            verb_verbal_noun ?? null, verb_active_ptcp ?? null, verb_passive_ptcp ?? null,
            adj_masculine ?? null, adj_feminine ?? null, adj_plural ?? null, adj_elative ?? null,
            is_loanword ? 1 : 0, source_language ?? null,
            tags.length ? JSON.stringify(tags) : null,
            now(), now(),
        ],
    });

    if (definition_en) {
        await client.execute({
            sql: `INSERT INTO definitions (id, entry_id, sense_number, text_mt, text_en, register, field, sort_order)
            VALUES (?, ?, 1, ?, ?, ?, ?, 0)`,
            args: [uid(), id, definition_mt ?? definition_en, definition_en, register ?? null, field ?? null],
        });
    }

    if (ipa) {
        await client.execute({
            sql: `INSERT INTO phonetics (id, entry_id, ipa, dialect) VALUES (?, ?, ?, 'Standard')`,
            args: [uid(), id, ipa],
        });
    }

    // Update FTS
    try { await client.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`); } catch { }

    return json({ id, created: true }, 201);
}

// ── PUT — update entry ────────────────────────────────────────────────────────
export async function onRequestPut({ request, env }) {
    if (!(await verifyAdmin(request, env))) return unauthorized();

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return json({ error: 'id required' }, 400);

    const client = db(env);
    const allowed = [
        'headword', 'pos', 'noun_gender', 'noun_singular', 'noun_plural_forms', 'noun_sound_plural',
        'noun_dual', 'noun_diminutive', 'verb_class', 'verb_transitivity', 'verb_perfective_3sgm',
        'verb_imperfective_3sgm', 'verb_verbal_noun', 'verb_active_ptcp', 'verb_passive_ptcp',
        'adj_masculine', 'adj_feminine', 'adj_plural', 'adj_elative', 'is_loanword', 'source_language', 'tags',
    ];

    const setClauses = [];
    const args = [];
    for (const key of allowed) {
        if (!(key in fields)) continue;
        let val = fields[key];
        if (key === 'noun_plural_forms' || key === 'tags') val = val ? JSON.stringify(val) : null;
        if (key === 'is_loanword') val = val ? 1 : 0;
        setClauses.push(`${key} = ?`);
        args.push(val);
    }

    if (!setClauses.length) return json({ error: 'No fields to update' }, 400);

    setClauses.push('updated_at = ?');
    args.push(now(), id);

    await client.execute({
        sql: `UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`,
        args,
    });

    try { await client.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`); } catch { }

    return json({ id, updated: true });
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
    if (!(await verifyAdmin(request, env))) return unauthorized();

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);

    const client = db(env);
    await client.execute({ sql: 'DELETE FROM entries WHERE id = ?', args: [id] });

    return json({ id, deleted: true });
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
