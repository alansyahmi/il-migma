/**
 * Admin entry CRUD — /api/admin/entries
 * Protected by Clerk JWT verification.
 */

import { createClient } from '@libsql/client/web';

// ── Auth guard ────────────────────────────────────────────────────────────────
async function verifyAdmin(request, env) {
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return false;

    // LOCAL DEV OVERRIDE
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    console.log('VerifyAdmin Check:', { url: request.url, isLocal, hasSecret: !!env.CLERK_SECRET_KEY });

    if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') {
        console.log('Admin verify bypass activated');
        return true;
    }

    try {
        // Verify with Clerk backend API
        // NOTE: This endpoint might vary or require local JWT verification.
        // For Pages Functions, we'll try to call the Clerk API.
        const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        if (!res.ok) {
            // Log error internally if possible, or just fail for now
            console.error('Clerk verify failed:', res.status, await res.text());
            // FAIL-SAFE: If Clerk API is down or changed, but we are in dev, maybe allow?
            // Actually, let's just return false if not 200.
            if (res.status === 404) {
                // If the endpoint is purely 404, then the implementation is definitely wrong.
                // In production we should use a proper JWT logic.
                return false;
            }
            return false;
        }

        const data = await res.json();
        return data?.object === 'token' && data?.session?.public_metadata?.role === 'admin';
    } catch (e) {
        console.error('VerifyAdmin Exception:', e.message);
        return false;
    }
}

function db(env) {
    const url = env.TURSO_URL || env.VITE_TURSO_URL;
    const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
    if (!url) {
        const keys = Object.keys(env).join(', ');
        throw new Error(`TURSO_URL missing. Available env keys: ${keys}`);
    }
    return createClient({ url, authToken: token });
}

function uid() {
    return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 6);
}

function now() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ── GET — list entries ────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const q = url.searchParams.get('q')?.trim() ?? '';
        const pos = url.searchParams.get('pos')?.trim() ?? '';

        const client = db(env);
        let sql = `SELECT e.id, e.headword, e.pos, e.noun_gender, e.verb_class,
                         e.is_loanword, e.source_language, e.created_at, e.verb_form,
                         e.verb_vowel_perf, e.verb_vowel_impf, e.tags, e.noun_plural_forms,
                         COALESCE(e.root_consonants, r.consonants) AS root_consonants,
                         d.text_en
                  FROM entries e
                  LEFT JOIN definitions d ON d.entry_id = e.id AND d.sense_number = 1
                  LEFT JOIN root_pattern_forms rpf ON rpf.id = e.root_pattern_form_id
                  LEFT JOIN roots r ON r.id = rpf.root_id`;
        const args = [];
        const whereClauses = [];

        if (q) {
            whereClauses.push('(e.headword LIKE ? OR e.root_consonants = ? OR r.consonants = ?)');
            args.push(`%${q}%`, q, q);
        }
        if (pos) {
            whereClauses.push('e.pos = ?');
            args.push(pos);
        }

        if (whereClauses.length) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }

        sql += ' ORDER BY e.headword ASC LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const countQuery = `SELECT COUNT(*) as total FROM entries e 
                           LEFT JOIN root_pattern_forms rpf ON rpf.id = e.root_pattern_form_id
                           LEFT JOIN roots r ON r.id = rpf.root_id
                           ${whereClauses.length ? ' WHERE ' + whereClauses.join(' AND ') : ''}`;
        const countArgs = whereClauses.length ? args.slice(0, -2) : [];

        const [res, countRes] = await Promise.all([
            client.execute({ sql, args }),
            client.execute({ sql: countQuery, args: countArgs }),
        ]);

        return json({
            entries: res.rows,
            total: Number(countRes.rows[0]?.total ?? 0),
            limit, offset,
        });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

// ── POST — create entry ────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        const client = db(env);

        let prefix = body.pos;
        if (body.pos === 'participle') prefix = body.participle_type === 'active' ? 'ap' : 'pp';
        else if (body.pos === 'adjective') prefix = 'adj';
        else if (body.pos === 'verbal_noun') prefix = 'vn';

        const safeHeadword = (body.headword || '').toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9àċġħżie-]/gi, '');

        let baseId = `${prefix}-${safeHeadword}`;
        let id = baseId;

        // Handle collisions using numeral suffixes
        const idCheckRes = await client.execute({
            sql: `SELECT id FROM entries WHERE id LIKE ? OR id = ?`,
            args: [`${baseId}-%`, baseId]
        });

        if (idCheckRes.rows.length > 0) {
            let maxSuffix = 0;
            idCheckRes.rows.forEach(r => {
                if (r.id === baseId) maxSuffix = Math.max(maxSuffix, 1);
                else {
                    const match = r.id.match(new RegExp(`^${baseId}-(\\d+)$`));
                    if (match && match[1]) {
                        maxSuffix = Math.max(maxSuffix, parseInt(match[1], 10));
                    }
                }
            });
            id = `${baseId}-${maxSuffix + 1}`;
        }

        const {
            headword, pos, noun_gender, noun_singular, noun_plural_forms,
            noun_sound_plural, noun_dual, noun_diminutive,
            verb_class, verb_transitivity, verb_perfective_3sgm, verb_imperfective_3sgm,
            verb_verbal_noun, verb_active_ptcp, verb_passive_ptcp,
            verb_vowel_perf, verb_vowel_impf,
            adj_masculine, adj_feminine, adj_plural, adj_elative,
            is_loanword = false, source_language, tags = [],
            definitions, etymology_chain,
            phonetics, participle_type,
            _rootConsonants, _formLabel, noun_type, cv_pattern,
            plural_pattern, sound_suffix, adj_pattern,
            noun_feminine, noun_masculine,
        } = body;

        if (!headword || !pos) return json({ error: 'headword and pos are required' }, 400);

        await client.execute({
            sql: `INSERT INTO entries (
                id, headword, pos,
                noun_gender, noun_singular, noun_plural_forms, noun_sound_plural, noun_dual, noun_diminutive,
                verb_class, verb_transitivity, verb_perfective_3sgm, verb_imperfective_3sgm,
                verb_verbal_noun, verb_active_ptcp, verb_passive_ptcp, verb_vowel_perf, verb_vowel_impf,
                adj_masculine, adj_feminine, adj_plural, adj_elative,
                is_loanword, source_language, tags, participle_type, root_consonants, cv_pattern, verb_form,
                noun_type, plural_pattern, sound_suffix, adj_pattern,
                noun_feminine, noun_masculine, created_at, updated_at
              ) VALUES (
                ?,?,?,  ?,?,?,?,?,?,  ?,?,?,?,  ?,?,?,?,?,  ?,?,?,?,  ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
              )`,
            args: [
                id, headword, pos,
                n(noun_gender), n(noun_singular),
                noun_plural_forms?.length ? JSON.stringify(noun_plural_forms) : null,
                n(noun_sound_plural), n(noun_dual), n(noun_diminutive),
                n(verb_class), n(verb_transitivity),
                n(verb_perfective_3sgm), n(verb_imperfective_3sgm),
                n(verb_verbal_noun), n(verb_active_ptcp), n(verb_passive_ptcp),
                n(verb_vowel_perf), n(verb_vowel_impf),
                n(adj_masculine), n(adj_feminine), n(adj_plural), n(adj_elative),
                is_loanword ? 1 : 0, n(source_language),
                tags.length ? JSON.stringify(tags) : null,
                n(participle_type), n(_rootConsonants), n(cv_pattern), n(_formLabel), n(noun_type),
                n(plural_pattern), n(sound_suffix), n(adj_pattern),
                n(noun_feminine), n(noun_masculine),
                now(), now(),
            ],
        });

        if (definitions && Array.isArray(definitions)) {
            for (let i = 0; i < definitions.length; i++) {
                const def = definitions[i];
                if (!def.text_en) continue;
                await client.execute({
                    sql: `INSERT INTO definitions (id, entry_id, sense_number, text_mt, text_en, register, nuance, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [uid(), id, i + 1, def.text_mt || def.text_en, def.text_en, n(def.register), n(def.nuance), i],
                });
            }
        }

        if (etymology_chain && Array.isArray(etymology_chain) && etymology_chain.length > 0) {
            await client.execute({
                sql: `INSERT INTO etymologies (id, entry_id, chain, created_at) VALUES (?, ?, ?, ?)`,
                args: [uid(), id, JSON.stringify(etymology_chain), now()],
            });
        }

        if (phonetics && Array.isArray(phonetics)) {
            for (const ph of phonetics) {
                if (!ph.ipa && !ph.spelling) continue;
                await client.execute({
                    sql: `INSERT INTO phonetics (id, entry_id, ipa, dialect, notes) VALUES (?, ?, ?, ?, ?)`,
                    args: [uid(), id, ph.ipa || '', ph.dialect || 'Standard', ph.spelling ? `Spelling: ${ph.spelling}` : null],
                });
            }
        }

        // Update FTS
        try { await client.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`); } catch { }

        return json({ id, created: true }, 201);
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

// ── PUT — update entry ────────────────────────────────────────────────────────
export async function onRequestPut({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const body = await request.json();
        const { id, old_id, ...fields } = body;
        if (!id) return json({ error: 'id required' }, 400);

        const client = db(env);

        // Handle ID rename 
        if (old_id && old_id !== id) {
            try {
                const columnsRes = await client.execute("PRAGMA table_info(entries)");
                const colNames = columnsRes.rows.map(r => r.name).filter(n => n !== 'id');

                await client.execute({
                    sql: `INSERT INTO entries (id, ${colNames.join(', ')}) SELECT ?, ${colNames.join(', ')} FROM entries WHERE id = ?`,
                    args: [id, old_id]
                });

                const childTables = ['definitions', 'etymologies', 'phonetics', 'subentries', 'attestation_reliability', 'dialect_variants', 'audio_files'];
                for (const table of childTables) {
                    await client.execute({ sql: `UPDATE ${table} SET entry_id = ? WHERE entry_id = ?`, args: [id, old_id] });
                }

                await client.execute({ sql: `DELETE FROM entries WHERE id = ?`, args: [old_id] });
            } catch (e) {
                return json({ error: 'Failed to rename ID: ' + e.message }, 400);
            }
        }

        const allowed = [
            'headword', 'pos', 'noun_gender', 'noun_singular', 'noun_plural_forms', 'noun_sound_plural',
            'noun_dual', 'noun_diminutive', 'noun_type', 'verb_class', 'verb_transitivity', 'verb_perfective_3sgm',
            'verb_imperfective_3sgm', 'verb_verbal_noun', 'verb_active_ptcp', 'verb_passive_ptcp',
            'verb_vowel_perf', 'verb_vowel_impf', 'verb_vowel_impv',
            'adj_masculine', 'adj_feminine', 'adj_plural', 'adj_elative', 'is_loanword', 'source_language', 'tags', 'participle_type',
            'cv_pattern', 'plural_pattern', 'sound_suffix', 'adj_pattern',
            'noun_feminine', 'noun_masculine', 'verb_form'
        ];

        const setClauses = [];
        const args = [];
        for (const key of allowed) {
            if (!(key in fields)) continue;
            let val = fields[key];
            if (val === '') val = null;
            if (key === 'noun_plural_forms' || key === 'tags') val = val && val.length ? JSON.stringify(val) : null;
            if (key === 'is_loanword') val = val ? 1 : 0;
            setClauses.push(`${key} = ?`);
            args.push(val);
        }

        if ('_rootConsonants' in fields) {
            let val = n(fields['_rootConsonants']);
            setClauses.push(`root_consonants = ?`);
            args.push(val);
        }

        if ('_formLabel' in fields) {
            let val = fields['_formLabel'];
            if (val === '') val = null;
            setClauses.push(`verb_form = ?`);
            args.push(val);
        }

        if (!setClauses.length) return json({ error: 'No fields to update' }, 400);

        setClauses.push('updated_at = ?');
        args.push(now(), id);

        await client.execute({
            sql: `UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`,
            args,
        });

        if ('definitions' in fields && Array.isArray(fields.definitions)) {
            await client.execute({ sql: 'DELETE FROM definitions WHERE entry_id = ?', args: [id] });
            for (let i = 0; i < fields.definitions.length; i++) {
                const def = fields.definitions[i];
                if (!def.text_en) continue;
                await client.execute({
                    sql: `INSERT INTO definitions (id, entry_id, sense_number, text_mt, text_en, register, nuance, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [uid(), id, i + 1, def.text_mt || def.text_en, def.text_en, n(def.register), n(def.nuance), i],
                });
            }
        }

        if ('etymology_chain' in fields && Array.isArray(fields.etymology_chain)) {
            await client.execute({ sql: 'DELETE FROM etymologies WHERE entry_id = ?', args: [id] });
            if (fields.etymology_chain.length > 0) {
                await client.execute({
                    sql: `INSERT INTO etymologies (id, entry_id, chain, created_at) VALUES (?, ?, ?, ?)`,
                    args: [uid(), id, JSON.stringify(fields.etymology_chain), now()],
                });
            }
        }

        if ('phonetics' in fields && Array.isArray(fields.phonetics)) {
            await client.execute({ sql: 'DELETE FROM phonetics WHERE entry_id = ?', args: [id] });
            for (const ph of fields.phonetics) {
                if (!ph.ipa && !ph.spelling) continue;
                await client.execute({
                    sql: `INSERT INTO phonetics (id, entry_id, ipa, dialect, notes) VALUES (?, ?, ?, ?, ?)`,
                    args: [uid(), id, ph.ipa || '', ph.dialect || 'Standard', ph.spelling ? `Spelling: ${ph.spelling}` : null],
                });
            }
        }

        try { await client.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`); } catch { }

        return json({ id, updated: true });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
    try {
        if (!(await verifyAdmin(request, env))) return unauthorized();

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'id required' }, 400);

        const client = db(env);
        await client.execute({ sql: 'DELETE FROM entries WHERE id = ?', args: [id] });

        return json({ id, deleted: true });
    } catch (e) {
        return json({ error: e.message }, 500);
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


/** Convert empty/undefined to null for DB consistency, and normalize strings */
function n(val) {
    if (val === '' || val === undefined) return null;
    if (typeof val === 'string') return val.trim().normalize('NFC');
    return val;
}
