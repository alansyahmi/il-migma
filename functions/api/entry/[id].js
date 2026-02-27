/**
 * GET /api/entry/:id
 * Fetch a single full entry with all related data.
 *
 * Cloudflare Pages Function env vars: TURSO_URL, TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client/web';

export async function onRequestGet({ params, env }) {
    const { id } = params;
    if (!id) return json({ error: 'Missing id' }, 400);

    try {
        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });
        // ── Entry core ──────────────────────────────────────────────────────────
        const entryRes = await db.execute({
            sql: `SELECT e.*,
               rpf.derived_form,
               r.consonants  AS root_consonants,
               r.id          AS root_id,
               r.strength    AS root_strength,
               r.weak_class  AS root_weak_class,
               pat.cv_notation, pat.wizen_notation, pat.id AS pattern_id
            FROM entries e
            LEFT JOIN root_pattern_forms rpf ON rpf.id = e.root_pattern_form_id
            LEFT JOIN roots r   ON r.id  = rpf.root_id
            LEFT JOIN patterns pat ON pat.id = rpf.pattern_id
            WHERE e.id = ?`,
            args: [id],
        });

        if (!entryRes.rows.length) return json({ error: 'Not found' }, 404);
        const entry = entryRes.rows[0];

        // ── Definitions ─────────────────────────────────────────────────────────
        const defsRes = await db.execute({
            sql: `SELECT * FROM definitions WHERE entry_id = ? ORDER BY sort_order, sense_number`,
            args: [id],
        });

        // ── Example sentences per definition ────────────────────────────────────
        const defIds = defsRes.rows.map(d => d.id);
        let examples = [];
        if (defIds.length) {
            const exRes = await db.execute({
                sql: `SELECT * FROM example_sentences WHERE definition_id IN (${defIds.map(() => '?').join(',')})`,
                args: defIds,
            });
            examples = exRes.rows;
        }

        // ── Phonetics ───────────────────────────────────────────────────────────
        const phonRes = await db.execute({
            sql: `SELECT * FROM phonetics WHERE entry_id = ?`,
            args: [id],
        });

        // ── Etymologies ─────────────────────────────────────────────────────────
        const etymRes = await db.execute({
            sql: `SELECT * FROM etymologies WHERE entry_id = ?`,
            args: [id],
        });

        // ── Attestation ─────────────────────────────────────────────────────────
        const attnRes = await db.execute({
            sql: `SELECT ar.*, as2.source_id, as2.attested, as2.notes AS score_notes,
                   ls.name AS source_name, ls.reliability_weight
            FROM attestation_reliability ar
            LEFT JOIN attestation_scores as2 ON as2.attestation_id = ar.id
            LEFT JOIN lexical_sources ls     ON ls.id = as2.source_id
            WHERE ar.entry_id = ?`,
            args: [id],
        });

        // ── Audio ────────────────────────────────────────────────────────────────
        const audioRes = await db.execute({
            sql: `SELECT * FROM audio_files WHERE entry_id = ?`,
            args: [id],
        });

        // ── Subentries ───────────────────────────────────────────────────────────
        const subRes = await db.execute({
            sql: `SELECT * FROM subentries WHERE entry_id = ? ORDER BY sort_order`,
            args: [id],
        });

        // ── Dialect variants ─────────────────────────────────────────────────────
        const dialRes = await db.execute({
            sql: `SELECT * FROM dialect_variants WHERE entry_id = ?`,
            args: [id],
        });

        // ── Assemble ─────────────────────────────────────────────────────────────
        const attestation = attnRes.rows.length ? {
            id: attnRes.rows[0].id,
            reliability_index: attnRes.rows[0].reliability_index,
            scores: attnRes.rows
                .filter(r => r.source_id)
                .map(r => ({
                    source_id: r.source_id,
                    source_name: r.source_name,
                    reliability_weight: r.reliability_weight,
                    attested: Boolean(r.attested),
                })),
        } : null;

        const definitions = defsRes.rows.map(d => ({
            ...d,
            example_sentences: examples.filter(e => e.definition_id === d.id),
        }));

        const payload = {
            ...Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== null)),
            noun_plural_forms: entry.noun_plural_forms ? JSON.parse(entry.noun_plural_forms) : [],
            tags: entry.tags ? JSON.parse(entry.tags) : [],
            definitions,
            phonetics: phonRes.rows,
            etymologies: etymRes.rows.map(e => ({
                ...e,
                chain: e.chain ? JSON.parse(e.chain) : [],
            })),
            attestation,
            audio: audioRes.rows,
            subentries: subRes.rows,
            dialect_variants: dialRes.rows,
            root_pattern_form: (entry.root_consonants) ? {
                root: {
                    id: entry.root_id,
                    consonants: entry.root_consonants,
                    strength: entry.root_strength,
                    weak_class: entry.root_weak_class
                },
                pattern: entry.pattern_id ? {
                    id: entry.pattern_id,
                    cv_notation: entry.cv_notation,
                    wizen_notation: entry.wizen_notation,
                } : null,
                derived_form: entry.derived_form,
            } : null,
        };

        return json({ entry: payload });
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
