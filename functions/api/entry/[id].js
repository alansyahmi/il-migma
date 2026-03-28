/**
 * GET /api/entry/:id
 * Fetch a single full entry with all related data.
 *
 * Cloudflare Pages Function env vars: TURSO_URL, TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client/web';
import { resolveEntryGender } from '../../../src/lib/gender.ts';

export async function onRequestGet({ params, env }) {
    let { id } = params;
    if (!id) return json({ error: 'Missing id' }, 400);

    try {
        id = decodeURIComponent(id).normalize('NFC');
    } catch (e) {
        // Fallback to raw id
    }

    try {
        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });
        // ── Entry core ──────────────────────────────────────────────────────────
        const entryRes = await db.execute({
            sql: `SELECT e.*,
               rpf.derived_form,
               COALESCE(e.root_consonants, r.consonants) AS resolved_root_consonants,
               r.id          AS root_id,
               r.strength    AS root_strength,
               r.weak_class  AS root_weak_class,
               r.gloss       AS root_gloss,
               r.etymology   AS root_etymology,
               COALESCE(pat.cv_notation, pat2.cv_notation) AS cv_notation,
               COALESCE(pat.wizen_notation, pat2.wizen_notation) AS wizen_notation,
               COALESCE(pat.id, pat2.id) AS pattern_id
            FROM entries e
            LEFT JOIN root_pattern_forms rpf ON rpf.id = e.root_pattern_form_id
            LEFT JOIN roots r ON r.id = rpf.root_id OR r.consonants = e.root_consonants
            LEFT JOIN patterns pat ON pat.id = rpf.pattern_id
            LEFT JOIN patterns pat2 ON pat2.cv_notation = e.cv_pattern AND pat.id IS NULL
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
            inflections_pl: entry.inflections_pl ? JSON.parse(entry.inflections_pl) : [],
            tags: entry.tags ? JSON.parse(entry.tags) : [],
            synonyms: entry.synonyms ? JSON.parse(entry.synonyms) : [],
            antonyms: entry.antonyms ? JSON.parse(entry.antonyms) : [],
            related_entries: entry.related_entries ? JSON.parse(entry.related_entries) : [],
            alternative_forms: entry.alternative_forms ? JSON.parse(entry.alternative_forms) : [],
            zokk_morphology: entry.zokk_morphology ? JSON.parse(entry.zokk_morphology) : undefined,
            definitions,
            phonetics: phonRes.rows.map(ph => ({
                ...ph,
                spelling: ph.notes?.startsWith('Spelling: ') ? ph.notes.replace('Spelling: ', '') : ''
            })),
            etymologies: etymRes.rows.map(e => ({
                ...e,
                chain: e.chain ? JSON.parse(e.chain) : [],
            })),
            attestation,
            audio: audioRes.rows,
            subentries: subRes.rows,
            dialect_variants: dialRes.rows,
            root_pattern_form: (entry.resolved_root_consonants) ? {
                root: {
                    id: entry.root_id || null,
                    consonants: entry.resolved_root_consonants,
                    strength: entry.root_strength || 'strong',
                    weak_class: entry.root_weak_class || null,
                    gloss: entry.root_gloss || '',
                    etymology: entry.root_etymology || ''
                },
                pattern: (entry.pattern_id || entry.cv_notation || entry.cv_pattern) ? {
                    id: entry.pattern_id || '',
                    cv_notation: entry.cv_notation || entry.cv_pattern || '',
                    wizen_notation: entry.wizen_notation || '',
                } : null,
                derived_form: entry.derived_form,
            } : null,
            // Expose weak_class at top level for easy modal loading
            // Prefer entry-level verb_weak_class; fall back to root's weak_class
            weak_class: entry.verb_weak_class || entry.root_weak_class || null,
        };

        // ── Enrich Relationship Helpers ──────────────────────────────────────────
        async function enrichRelationships(relArray) {
            if (!relArray || !relArray.length) return [];
            const idsToEnrich = relArray
                .filter(r => !r.gloss_en && !r.gloss_mt)
                .map(r => r.id);
            if (idsToEnrich.length === 0) return relArray;

            const res = await db.execute({
                sql: `SELECT entry_id, text_en, text_mt FROM definitions WHERE entry_id IN (${idsToEnrich.map(() => '?').join(',')}) AND sense_number = 1`,
                args: idsToEnrich,
            });

            const defMap = {};
            res.rows.forEach(r => {
                defMap[r.entry_id] = { en: r.text_en, mt: r.text_mt };
            });

            return relArray.map(r => ({
                ...r,
                gloss_en: r.gloss_en || defMap[r.id]?.en || '',
                gloss_mt: r.gloss_mt || defMap[r.id]?.mt || '',
            }));
        }

        payload.synonyms = await enrichRelationships(payload.synonyms);
        payload.antonyms = await enrichRelationships(payload.antonyms);
        payload.related_entries = await enrichRelationships(payload.related_entries);
        payload.alternative_forms = await enrichRelationships(payload.alternative_forms);

        // ── Shared Related Entries ──────────────────────────────────────────────
        let related_entries = [];
        const rc = entry.resolved_root_consonants;
        if (rc) {
            const relRes = await db.execute({
                sql: `SELECT e.id, e.headword, d.text_en AS gloss_en, d.text_mt AS gloss_mt 
                      FROM entries e
                      LEFT JOIN root_pattern_forms rpf ON rpf.id = e.root_pattern_form_id
                      LEFT JOIN roots r ON r.id = rpf.root_id
                      LEFT JOIN definitions d ON d.entry_id = e.id AND d.sense_number = 1
                      WHERE (e.root_consonants = ? OR r.consonants = ?) AND e.id != ? LIMIT 10`,
                args: [rc, rc, entry.id],
            });
            related_entries = relRes.rows;
        }

        // Attach Verb Morphology struct from flat DB rows as expected by Frontend
        if (entry.pos === 'verb') {
            payload.verb_morphology = {
                transitivity: entry.verb_transitivity || 'both',
                perfective_3sg_m: entry.verb_perfective_3sgm || entry.headword,
                imperfective_3sg_m: entry.verb_imperfective_3sgm || '',
                verbal_noun: entry.verb_verbal_noun,
                active_participle: entry.verb_active_ptcp,
                passive_participle: entry.verb_passive_ptcp,
                form: entry.verb_form || 'I',
                verb_class: entry.verb_class || null,
                weak_class: entry.verb_weak_class || entry.root_weak_class || null,
                root_tags: entry.verb_class ? [entry.verb_class.toUpperCase()] : [],
                vowel_set_perfect: entry.verb_vowel_perf || 'a-a',
                vowel_set_imperfect: entry.verb_vowel_impf || 'a-a',
                vowel_set_imperative: entry.verb_vowel_impv || entry.verb_vowel_impf || 'a-a',
                synonyms: payload.synonyms,
                antonyms: payload.antonyms,
                related_entries: related_entries.length ? related_entries : payload.related_entries,
                alternative_forms: payload.alternative_forms,
                source_citation: entry.source_citation || null,
                is_inflectable: entry.is_inflectable,
                usage_example: entry.usage_example,
                usage_example_en: entry.usage_example_en,
            };
        }

        // Attach Noun Morphology struct
        if (entry.pos === 'noun') {
            const isColl = Boolean(entry.is_collective);
            const isSing = Boolean(entry.is_singulative);
            payload.noun_morphology = {
                gender: resolveEntryGender(entry),
                singular: entry.lemma_base || entry.headword,
                plural_forms: payload.inflections_pl,
                sound_plural: entry.sound_suffix || null,
                dual: entry.dual_form || null,
                diminutive: entry.diminutive_form || null,
                collective: isSing ? entry.form_fem : null,
                singulative: isColl ? entry.form_fem : null,
                feminine: (!isColl && !isSing && entry.gender === 'masculine') ? entry.form_fem : null,
                masculine: (!isColl && !isSing && entry.gender === 'feminine') ? entry.form_masc : null,
                is_inflectable: Boolean(entry.is_inflectable),
                usage_example: entry.usage_example,
                usage_example_en: entry.usage_example_en,
                synonyms: payload.synonyms,
                antonyms: payload.antonyms,
                related_entries: related_entries.length ? related_entries : payload.related_entries,
                alternative_forms: payload.alternative_forms,
                source_citation: entry.source_citation || null,
                morph_pattern: entry.morph_pattern || null,
            };
        }

        // Attach Adjective Morphology struct
        if (entry.pos === 'adjective' || entry.pos === 'participle') {
            payload.adjective_morphology = {
                masculine: entry.lemma_base || entry.headword,
                feminine: entry.form_fem || null,
                plural: payload.inflections_pl?.join(', ') || null, 
                elative: entry.elative_form || null,
                // Optional vowel sets
                vowel_set_sg: entry.vowel_set_sg || null,
                vowel_set_pl: entry.vowel_set_pl || null,
                synonyms: payload.synonyms,
                antonyms: payload.antonyms,
                related_entries: related_entries.length ? related_entries : payload.related_entries,
                alternative_forms: payload.alternative_forms,
                source_citation: entry.source_citation || null,
                morph_pattern: entry.morph_pattern || null,
            };
            // Participles use adjective morphology but have a type
            if (entry.pos === 'participle') {
                payload.participle_type = entry.participle_type || 'active';
            }
        }

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
