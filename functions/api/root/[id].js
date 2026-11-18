
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
            sql: `SELECT * FROM roots
                  WHERE id = ? OR LOWER(consonants) = LOWER(?)
                  ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END ASC, id ASC
                  LIMIT 1`,
            args: [searchId, searchId, searchId],
        });

        if (!rootRes.rows.length) {
            const cleanRoot = searchId.replace(/^root-/i, '').trim().toLowerCase();
            const entriesRes = await db.execute({
                sql: `SELECT e.id, e.headword, e.pos, e.root_consonants, e.definitions, e.etymology_chain,
                             e.source_citation, e.is_imala_blocked,
                             vm.form, vm.class AS vm_class, vm.weak_class AS vm_weak_class,
                             vm.vowel_set_perf, vm.vowel_set_impf, vm.vowel_set_impv, vm.is_imala_blocked AS vm_imala
                      FROM entries e
                      LEFT JOIN verb_morphology vm ON vm.entry_id = e.id
                      WHERE LOWER(TRIM(e.root_consonants)) = LOWER(?)
                      ORDER BY
                        CASE WHEN LOWER(e.pos) = 'verb' AND vm.form = 'I' THEN 0
                             WHEN LOWER(e.pos) = 'verb' THEN 1
                             ELSE 2 END ASC,
                        e.headword ASC
                      LIMIT 50`,
                args: [cleanRoot],
            });

            if (!entriesRes.rows.length) {
                return new Response(JSON.stringify({ error: 'Root not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const entryRows = entriesRes.rows;
            const consonants = String(entryRows[0].root_consonants || cleanRoot).trim().toLowerCase().normalize('NFC');
            const consonantArray = consonants.split('-').map((c) => c.trim()).filter(Boolean);
            const primaryVerb = entryRows.find((r) => String(r.pos || '').toLowerCase() === 'verb' && r.form === 'I')
                || entryRows.find((r) => String(r.pos || '').toLowerCase() === 'verb')
                || null;

            let strength = String(primaryVerb?.vm_class || 'strong').trim().toLowerCase();
            if (strength === 'doubled') strength = 'geminated';
            if (!strength) strength = 'strong';
            let weakClass = primaryVerb?.vm_weak_class ? String(primaryVerb.vm_weak_class).trim().toLowerCase() : null;

            if (strength === 'strong' && !weakClass) {
                if (consonantArray.length === 3) {
                    const [c1, c2, c3] = consonantArray;
                    if (c3 === 'j' || c3 === 'w') {
                        strength = 'weak';
                        weakClass = 'defective';
                    } else if (c2 === 'j' || c2 === 'w') {
                        strength = 'weak';
                        weakClass = 'hollow';
                    } else if (c1 === 'w') {
                        strength = 'weak';
                        weakClass = 'assimilative';
                    } else if (c2 && c2 === c3) {
                        strength = 'geminated';
                    }
                } else if (consonantArray.length === 4) {
                    const c4 = consonantArray[3];
                    if (c4 === 'j' || c4 === 'w') {
                        strength = 'weak';
                        weakClass = 'defective';
                    }
                }
            }

            const virtualRoot = {
                id: consonants,
                consonants,
                consonant_array: consonantArray,
                strength,
                weak_class: weakClass,
                vowel_set_perf: primaryVerb?.vowel_set_perf || 'a-a',
                vowel_set_impf: primaryVerb?.vowel_set_impf || 'i-a',
                vowel_set_imp: primaryVerb?.vowel_set_impv || 'o-o',
                is_imala_blocked: Boolean(primaryVerb?.vm_imala || primaryVerb?.is_imala_blocked),
                gloss: [],
                etymology: [],
                synonyms: [],
                antonyms: [],
                related_entries: [],
                tags: [],
                hidden_forms: [],
                notes: null,
                source: primaryVerb?.source_citation || entryRows.find((r) => r.source_citation)?.source_citation || null,
                is_virtual: true,
            };

            return new Response(JSON.stringify({ root: virtualRoot }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        const root = { ...rootRes.rows[0] };
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
        root.strength = String(root.strength || 'strong').trim().toLowerCase();
        root.weak_class = root.weak_class ? String(root.weak_class).trim().toLowerCase() : null;

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
