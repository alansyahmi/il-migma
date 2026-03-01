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

    try {
        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });

        // Normalize search string for better matches
        const normalizedQ = q.toLowerCase().trim().normalize('NFC');

        // HOTFIX: Ensure new columns exist in the database being used
        // This handles cases where the local or remote DB is out of sync with the code.
        try {
            await db.execute("ALTER TABLE entries ADD COLUMN cv_pattern TEXT").catch(() => { });
            await db.execute("ALTER TABLE entries ADD COLUMN plural_pattern TEXT").catch(() => { });
            await db.execute("ALTER TABLE entries ADD COLUMN sound_suffix TEXT").catch(() => { });
            await db.execute("ALTER TABLE entries ADD COLUMN adj_pattern TEXT").catch(() => { });
            await db.execute("ALTER TABLE entries ADD COLUMN noun_feminine TEXT").catch(() => { });
            await db.execute("ALTER TABLE entries ADD COLUMN noun_masculine TEXT").catch(() => { });
            await db.execute("ALTER TABLE entries ADD COLUMN root_consonants TEXT").catch(() => { });
            await db.execute("ALTER TABLE entries ADD COLUMN verb_form TEXT").catch(() => { });
        } catch (e) {
            // Ignore errors if columns already exist
        }

        // FTS5 MATCH query — safely enclose in double quotes to prevent syntax errors with hyphens, etc.
        const safeQuery = normalizedQ.replace(/"/g, ' ').trim();
        const ftsQuery = `"${safeQuery}"*`;

        let sql = `
            SELECT e.*,
                   COALESCE(r.consonants, e.root_consonants) AS root_consonants,
                   r.strength AS root_strength, r.weak_class AS root_weak_class,
                   r.vowel_set_perf, r.vowel_set_impf, r.vowel_set_imp,
                   r.id AS root_id,
                   d.text_en, d.text_mt, p.ipa, ar.reliability_index
            FROM entries e
            LEFT JOIN roots r ON (e.root_consonants = r.consonants)
            LEFT JOIN definitions d ON d.entry_id = e.id AND d.sense_number = 1
            LEFT JOIN phonetics p   ON p.entry_id = e.id AND p.dialect = 'Standard'
            LEFT JOIN attestation_reliability ar ON ar.entry_id = e.id
            WHERE (e.rowid IN (SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?) OR r.consonants = ? OR e.root_consonants = ?)
        `;
        const args = [ftsQuery, normalizedQ, normalizedQ];

        if (pos) {
            sql += ' AND e.pos = ?';
            args.push(pos);
        }

        sql += ' ORDER BY e.headword ASC LIMIT ? OFFSET ?';
        args.push(limit, offset);

        const result = await db.execute({ sql, args });

        // Map database columns to the Entry interface expected by the UI
        const rows = result.rows.map(r => {
            return {
                ...r,
                noun_plural_forms: r.noun_plural_forms ? JSON.parse(r.noun_plural_forms) : [],
                is_loanword: Boolean(r.is_loanword),
                verb_morphology: (r.pos === 'verb' || r.verb_form) ? {
                    form: r.verb_form || '',
                    vowel_set_perfect: r.verb_vowel_perf || '',
                    vowel_set_imperfect: r.verb_vowel_impf || '',
                    verbal_noun: r.verb_verbal_noun || '',
                    active_participle: r.verb_active_ptcp || '',
                    passive_participle: r.verb_passive_ptcp || '',
                } : undefined,
                root_pattern_form: r.root_consonants ? {
                    id: '',
                    root_id: r.root_id || '',
                    pattern_id: '',
                    derived_form: r.headword,
                    root: {
                        id: r.root_id || '',
                        consonants: r.root_consonants,
                        consonant_array: r.root_consonants.split('-'),
                        strength: r.root_strength || 'strong',
                        weak_class: r.root_weak_class || undefined,
                        vowel_set_perf: r.vowel_set_perf,
                        vowel_set_impf: r.vowel_set_impf,
                        vowel_set_imp: r.vowel_set_imp,
                        is_geminate: false,
                        is_imala_blocked: false,
                        created_at: '',
                        updated_at: ''
                    }
                } : undefined
            };
        });

        return json({ results: rows, total: rows.length, query: q });
    } catch (e) {
        console.error("API SEARCH ERROR:", e);
        return json({ error: e.message, stack: e.stack, query: q }, 500);
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
