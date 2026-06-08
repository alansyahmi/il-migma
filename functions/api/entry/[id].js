/**
 * GET /api/entry/:id
 * Fetch a single full entry with all related data.
 *
 * Cloudflare Pages Function env vars: TURSO_URL, TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client/web';
import { resolveEntryGender } from '../../../src/lib/gender.ts';
import { normalizeSourceMetadata } from '../../../src/lib/sourceMetadata.ts';
import { hydrateEntryRow, ENTRY_MORPHOLOGY_JOINS, ENTRY_MORPHOLOGY_SELECT } from '../../../src/lib/entryHydration.ts';
import { applyVerbMorphologyCompatibility, ensureVerbMorphologyTable } from '../../../src/lib/verbMorphology.ts';
import { getEntryIdFamily, normalizeEntryId, normalizeEntryPos } from '../../../src/lib/entryId.ts';
import { ensureRootCompatibilityColumns } from '../../lib/rootSchema.js';

function firstSenseText(value) {
    if (value === undefined || value === null) return '';
    const text = String(value).trim();
    if (!text) return '';
    return text.split(/\s*;\s*/)[0]?.trim() || '';
}

function normalizeDefinitionList(definitions) {
    if (!Array.isArray(definitions)) return [];
    return definitions.map((def, index) => ({
        id: def?.id || `definition-${index}`,
        sense_number: Number(def?.sense_number ?? index + 1),
        text_en: String(def?.text_en || '').trim(),
        text_mt: def?.text_mt == null ? null : String(def.text_mt).trim() || null,
        register: String(def?.register || '').trim(),
        nuance: String(def?.nuance || '').trim(),
        field: String(def?.field || '').trim(),
        example_sentences: Array.isArray(def?.example_sentences) ? def.example_sentences : [],
    }));
}

function relationshipKey(item) {
    return String(item?.id || item?.target_id || item?.entry_id || item?.headword || '')
        .trim()
        .toLowerCase();
}

function markRelationshipSource(items, source) {
    return (items || []).map((item) => ({
        ...item,
        relationship_source: item?.relationship_source || source,
    }));
}

function mergeRelationshipEntries(...lists) {
    const merged = [];
    const indexes = new Map();

    for (const list of lists) {
        for (const item of list || []) {
            if (!item) continue;
            const key = relationshipKey(item);
            if (!key) continue;

            const existingIndex = indexes.get(key);
            if (existingIndex === undefined) {
                indexes.set(key, merged.length);
                merged.push(item);
                continue;
            }

            const existing = merged[existingIndex];
            const nextIsExplicit = item.relationship_source === 'explicit';
            const existingIsExplicit = existing.relationship_source === 'explicit';
            if (nextIsExplicit || !existingIsExplicit) {
                merged[existingIndex] = { ...existing, ...item };
            }
        }
    }

    return merged;
}

function buildRelationshipEntry(row, relationshipSource) {
    const hydrated = hydrateEntryRow(row);
    return {
        id: hydrated.id || row.id || null,
        headword: hydrated.headword || row.headword || '',
        pos: hydrated.pos || row.pos || '',
        numeral_type: hydrated.numeral_type || hydrated.numeral_morphology?.numeral_type || null,
        root_consonants: hydrated.root_consonants || row.resolved_root_consonants || null,
        cv_pattern: hydrated.cv_pattern || row.cv_notation || null,
        lemma_pattern: hydrated.lemma_pattern || null,
        form_masc_pattern: hydrated.form_masc_pattern || null,
        form_fem_pattern: hydrated.form_fem_pattern || null,
        form_plural_pattern: hydrated.form_plural_pattern || hydrated.numeral_morphology?.form_plural_pattern || null,
        morph_pattern: hydrated.morph_pattern || null,
        numeral_morphology: hydrated.numeral_morphology || null,
        root_pattern_form: hydrated.root_pattern_form || null,
        gloss_en: firstSenseText(row.gloss_en || row.text_en),
        gloss_mt: firstSenseText(row.gloss_mt || row.text_mt),
        relationship_source: relationshipSource,
    };
}

async function ensureDiminutivesTableExists(db) {
    const tableCheck = await db.execute({
        sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entry_diminutives'`,
        args: [],
    });
    if (tableCheck.rows.length > 0) return;

    await db.execute(`
        CREATE TABLE IF NOT EXISTS entry_diminutives (
            id TEXT PRIMARY KEY,
            entry_id TEXT NOT NULL,
            pos TEXT NOT NULL CHECK(pos IN ('noun', 'adjective', 'participle')),
            gender TEXT,
            form TEXT NOT NULL,
            pattern TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_preferred INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    `);
}

export async function onRequestGet({ params, env }) {
    let { id } = params;
    if (!id) return json({ error: 'Missing id' }, 400);

    try {
        id = decodeURIComponent(id).normalize('NFC');
    } catch (e) {
        // Fallback to raw id
    }
    const normalizedId = normalizeEntryId(id);
    const family = getEntryIdFamily(id);

    try {
        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });
        await ensureVerbMorphologyTable(db, { backfill: true });
        await ensureRootCompatibilityColumns(db);
        // ── Entry core ──────────────────────────────────────────────────────────
        const conditions = [];
        const args = [];
        if (family.exact.length > 0) {
            conditions.push(`e.id IN (${family.exact.map(() => '?').join(', ')})`);
            args.push(...family.exact);
        }
        if (family.likePatterns.length > 0) {
            conditions.push(...family.likePatterns.map(() => 'e.id LIKE ?'));
            args.push(...family.likePatterns);
        }
        if (conditions.length === 0 && normalizedId) {
            conditions.push('e.id = ?');
            args.push(normalizedId);
        }

        const entryRes = await db.execute({
            sql: `SELECT e.*,
               ${ENTRY_MORPHOLOGY_SELECT},
               rpf.derived_form,
               COALESCE(e.root_consonants, r.consonants) AS resolved_root_consonants,
               r.id          AS root_id,
               r.strength    AS root_strength,
               r.weak_class  AS root_weak_class,
               r.vowel_set_perf AS root_vowel_set_perf,
               r.vowel_set_impf AS root_vowel_set_impf,
               r.vowel_set_imp  AS root_vowel_set_imp,
               r.is_imala_blocked AS root_is_imala_blocked,
               r.gloss       AS root_gloss,
               r.etymology   AS root_etymology,
               COALESCE(pat.cv_notation, pat2.cv_notation) AS cv_notation,
               COALESCE(pat.wizen_notation, pat2.wizen_notation) AS wizen_notation,
               COALESCE(pat.id, pat2.id) AS pattern_id
            FROM entries e
            ${ENTRY_MORPHOLOGY_JOINS}
            LEFT JOIN root_pattern_forms rpf ON rpf.id = e.id
            LEFT JOIN roots r ON r.id = rpf.root_id OR r.consonants = e.root_consonants
            LEFT JOIN patterns pat ON pat.id = rpf.pattern_id
            LEFT JOIN patterns pat2 ON pat2.cv_notation = COALESCE(nm.morph_pattern, e.cv_pattern) AND pat.id IS NULL
            WHERE ${conditions.join(' OR ')}`,
            args,
        });

        if (!entryRes.rows.length) return json({ error: 'Not found' }, 404);
        const entry = entryRes.rows[0];
        const resolvedEntryId = entry.id;
        await ensureDiminutivesTableExists(db);

        const diminutiveRes = await db.execute({
            sql: `SELECT * FROM entry_diminutives
                  WHERE entry_id = ?
                  ORDER BY COALESCE(is_preferred, 0) DESC, sort_order ASC, created_at ASC`,
            args: [resolvedEntryId],
        });
        const diminutives = diminutiveRes.rows.map((row) => ({
            ...row,
            is_preferred: Boolean(row.is_preferred),
        }));
        const primaryDiminutive = diminutives[0] || null;

        // ── Phonetics ───────────────────────────────────────────────────────────
        const phonRes = await db.execute({
            sql: `SELECT * FROM phonetics WHERE entry_id = ?`,
            args: [resolvedEntryId],
        });

        // ── Attestation ─────────────────────────────────────────────────────────
        const attnRes = await db.execute({
            sql: `SELECT ar.*, as2.source_id, as2.attested, as2.notes AS score_notes,
                   ls.name AS source_name, ls.reliability_weight
            FROM attestation_reliability ar
            LEFT JOIN attestation_scores as2 ON as2.attestation_id = ar.id
            LEFT JOIN lexical_sources ls     ON ls.id = as2.source_id
            WHERE ar.entry_id = ?`,
            args: [resolvedEntryId],
        });

        // ── Audio ────────────────────────────────────────────────────────────────
        const audioRes = await db.execute({
            sql: `SELECT * FROM audio_files WHERE entry_id = ?`,
            args: [resolvedEntryId],
        });

        // ── Subentries ───────────────────────────────────────────────────────────
        const subRes = await db.execute({
            sql: `SELECT * FROM subentries WHERE entry_id = ? ORDER BY sort_order`,
            args: [resolvedEntryId],
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

        const entryPayload = hydrateEntryRow(entry);
        const payload = {
            ...entryPayload,
            diminutives,
            diminutive_form: primaryDiminutive?.form || entryPayload.noun_morphology?.diminutive || entryPayload.adjective_morphology?.diminutive || null,
            diminutive_pattern: primaryDiminutive?.pattern || entryPayload.diminutive_pattern || null,
            definitions: normalizeDefinitionList(entryPayload.definitions),
            phonetics: phonRes.rows.map(ph => ({
                ...ph,
                spelling: ph.notes?.startsWith('Spelling: ') ? ph.notes.replace('Spelling: ', '') : ''
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
                    vowel_set_perf: entry.root_vowel_set_perf || null,
                    vowel_set_impf: entry.root_vowel_set_impf || null,
                    vowel_set_imp: entry.root_vowel_set_imp || null,
                    is_imala_blocked: entry.root_is_imala_blocked,
                    gloss: entry.root_gloss || '',
                    etymology: entry.root_etymology || ''
                },
                pattern: (entry.pattern_id || entry.cv_notation) ? {
                    id: entry.pattern_id || '',
                    cv_notation: entry.cv_notation || '',
                    wizen_notation: entry.wizen_notation || '',
                } : null,
                derived_form: entry.derived_form,
            } : null,
            // Expose weak_class at top level for easy modal loading
            // Prefer entry-level verb_weak_class; fall back to root's weak_class
            weak_class: entry.verb_weak_class || entry.root_weak_class || null,
        };

        const sourceMeta = normalizeSourceMetadata(entry);
        payload.source_display = sourceMeta.display || '';
        payload.source_tooltip = sourceMeta.tooltip || '';

        // ── Enrich Relationship Helpers ──────────────────────────────────────────
        async function enrichRelationships(relArray) {
            if (!relArray || !relArray.length) return [];
            const idsToEnrich = [...new Set(
                relArray
                    .map(r => r.id)
                    .filter(Boolean)
            )];
            const headwordsToEnrich = [...new Set(
                relArray
                    .map(r => String(r.headword || '').trim())
                    .filter(Boolean)
            )];
            if (idsToEnrich.length === 0 && headwordsToEnrich.length === 0) return relArray;

            const clauses = [];
            const queryArgs = [];
            if (idsToEnrich.length > 0) {
                clauses.push(`e.id IN (${idsToEnrich.map(() => '?').join(',')})`);
                queryArgs.push(...idsToEnrich);
            }
            if (headwordsToEnrich.length > 0) {
                clauses.push(`e.headword IN (${headwordsToEnrich.map(() => '?').join(',')})`);
                queryArgs.push(...headwordsToEnrich);
            }

            const res = await db.execute({
                sql: `SELECT
                        e.id,
                        e.headword,
                        e.pos,
                        e.root_consonants,
                        e.cv_pattern,
                        e.morph_pattern,
                        ${ENTRY_MORPHOLOGY_SELECT},
                        json_extract(e.definitions, '$[0].text_en') AS text_en,
                        json_extract(e.definitions, '$[0].text_mt') AS text_mt
                      FROM entries e
                      ${ENTRY_MORPHOLOGY_JOINS}
                      WHERE ${clauses.join(' OR ')}`,
                args: queryArgs,
            });

            const entryMap = {};
            const headwordMap = {};
            res.rows.forEach(r => {
                const hydrated = hydrateEntryRow(r);
                const enriched = {
                    en: firstSenseText(r.text_en),
                    mt: firstSenseText(r.text_mt),
                    headword: hydrated.headword || null,
                    pos: hydrated.pos || null,
                    numeral_type: hydrated.numeral_type || hydrated.numeral_morphology?.numeral_type || null,
                    root_consonants: hydrated.root_consonants || null,
                    cv_pattern: hydrated.cv_pattern || null,
                    lemma_pattern: hydrated.lemma_pattern || null,
                    form_masc_pattern: hydrated.form_masc_pattern || null,
                    form_fem_pattern: hydrated.form_fem_pattern || null,
                    form_plural_pattern: hydrated.form_plural_pattern || hydrated.numeral_morphology?.form_plural_pattern || null,
                    morph_pattern: hydrated.morph_pattern || null,
                    numeral_morphology: hydrated.numeral_morphology || null,
                    root_pattern_form: hydrated.root_pattern_form || null,
                };
                entryMap[r.id] = enriched;
                if (hydrated.headword && !headwordMap[hydrated.headword]) {
                    headwordMap[hydrated.headword] = enriched;
                }
            });

            return relArray.map(r => {
                const match = entryMap[r.id] || headwordMap[String(r.headword || '').trim()];
                return {
                    ...r,
                    relationship_source: r.relationship_source || 'explicit',
                    cv_pattern: r.cv_pattern || match?.cv_pattern || null,
                    numeral_type: r.numeral_type || match?.numeral_type || r.numeral_morphology?.numeral_type || match?.numeral_morphology?.numeral_type || null,
                    lemma_pattern: r.lemma_pattern || match?.lemma_pattern || null,
                    form_masc_pattern: r.form_masc_pattern || match?.form_masc_pattern || null,
                    form_fem_pattern: r.form_fem_pattern || match?.form_fem_pattern || null,
                    form_plural_pattern: r.form_plural_pattern || match?.form_plural_pattern || null,
                    morph_pattern: r.morph_pattern || match?.morph_pattern || null,
                    numeral_morphology: r.numeral_morphology || match?.numeral_morphology || null,
                    root_pattern_form: r.root_pattern_form || match?.root_pattern_form || null,
                    root_consonants: r.root_consonants || match?.root_consonants || null,
                    headword: r.headword || match?.headword || '',
                    pos: r.pos || match?.pos || '',
                    gloss_en: r.gloss_en || match?.en || '',
                    gloss_mt: r.gloss_mt || match?.mt || '',
                };
            });
        }

        payload.synonyms = await enrichRelationships(payload.synonyms);
        payload.antonyms = await enrichRelationships(payload.antonyms);
        payload.related_entries = markRelationshipSource(await enrichRelationships(payload.related_entries), 'explicit');
        payload.alternative_forms = await enrichRelationships(payload.alternative_forms);

        // ── Shared Related Entries ──────────────────────────────────────────────
        let related_entries = [];
        const normalizedPos = normalizeEntryPos(entry.pos);
        const rc = entry.resolved_root_consonants;
        if (rc && normalizedPos === 'numeral') {
            const relRes = await db.execute({
                sql: `SELECT e.*,
                        ${ENTRY_MORPHOLOGY_SELECT},
                        COALESCE(e.root_consonants, r.consonants) AS resolved_root_consonants,
                        COALESCE(pat.cv_notation, pat2.cv_notation, e.cv_pattern) AS cv_notation,
                        COALESCE(pat.wizen_notation, pat2.wizen_notation) AS wizen_notation,
                        COALESCE(pat.id, pat2.id) AS pattern_id,
                        json_extract(e.definitions, '$[0].text_en') AS gloss_en,
                        json_extract(e.definitions, '$[0].text_mt') AS gloss_mt
                      FROM entries e
                      ${ENTRY_MORPHOLOGY_JOINS}
                      LEFT JOIN root_pattern_forms rpf ON rpf.id = e.id
                      LEFT JOIN roots r ON r.id = rpf.root_id OR r.consonants = e.root_consonants
                      LEFT JOIN patterns pat ON pat.id = rpf.pattern_id
                      LEFT JOIN patterns pat2 ON pat2.cv_notation = COALESCE(num.form_attributive_short_pattern, e.cv_pattern) AND pat.id IS NULL
                      WHERE LOWER(TRIM(e.pos)) = 'numeral'
                        AND (e.root_consonants = ? OR r.consonants = ?)
                        AND e.id != ?
                      LIMIT 30`,
                args: [rc, rc, resolvedEntryId],
            });
            related_entries = relRes.rows.map((row) => buildRelationshipEntry(row, 'same_root'));
        } else if (rc) {
            const relRes = await db.execute({
                sql: `SELECT e.id, e.headword,
                        json_extract(e.definitions, '$[0].text_en') AS gloss_en,
                        json_extract(e.definitions, '$[0].text_mt') AS gloss_mt
                      FROM entries e
                      LEFT JOIN root_pattern_forms rpf ON rpf.id = e.id
                      LEFT JOIN roots r ON r.id = rpf.root_id
                      WHERE (e.root_consonants = ? OR r.consonants = ?) AND e.id != ? LIMIT 10`,
                args: [rc, rc, entry.id],
            });
            related_entries = relRes.rows.map(row => ({
                ...row,
                gloss_en: firstSenseText(row.gloss_en),
                gloss_mt: firstSenseText(row.gloss_mt),
            }));
        }
        const numeralFamilyEntries = normalizedPos === 'numeral'
            ? mergeRelationshipEntries(payload.related_entries, related_entries)
            : [];
        if (normalizedPos === 'numeral') {
            payload.related_entries = numeralFamilyEntries;
        }

        if (normalizedPos === 'verb') {
            applyVerbMorphologyCompatibility(payload, entryPayload, entryPayload.verb_morphology || entryPayload, {
                synonyms: payload.synonyms,
                antonyms: payload.antonyms,
                related_entries: related_entries.length ? related_entries : payload.related_entries,
                alternative_forms: payload.alternative_forms,
                source_display: sourceMeta.display || '',
                source_tooltip: sourceMeta.tooltip || '',
            });
        }

        // Attach Noun Morphology struct
        if (normalizedPos === 'noun') {
            const isColl = Boolean(entry.is_collective);
            const isSing = Boolean(entry.is_singulative);
            const nounMorphology = entryPayload.noun_morphology || {};
            payload.noun_morphology = {
                ...nounMorphology,
                gender: resolveEntryGender(entryPayload),
                singular: nounMorphology.singular || entryPayload.headword,
                noun_type: nounMorphology.noun_type || null,
                plural_forms: payload.inflections_pl,
                sound_plural: nounMorphology.sound_plural || entryPayload.sound_suffix || null,
                dual: nounMorphology.dual || null,
                diminutive: primaryDiminutive?.form || nounMorphology.diminutive || null,
                paucal: nounMorphology.paucal || null,
                augmentative: nounMorphology.augmentative || null,
                diminutives,
                collective: isSing ? (nounMorphology.feminine || nounMorphology.feminine_form || null) : null,
                singulative: isColl ? (nounMorphology.feminine || nounMorphology.feminine_form || null) : null,
                feminine: (!isColl && !isSing && entryPayload.gender === 'masculine') ? (nounMorphology.feminine || nounMorphology.feminine_form || null) : null,
                masculine: (!isColl && !isSing && entryPayload.gender === 'feminine') ? (nounMorphology.masculine || nounMorphology.masculine_form || null) : null,
                feminine_form: nounMorphology.feminine || nounMorphology.feminine_form || null,
                masculine_form: nounMorphology.masculine || nounMorphology.masculine_form || null,
                form_fem: nounMorphology.feminine || nounMorphology.feminine_form || null,
                form_masc: nounMorphology.masculine || nounMorphology.masculine_form || null,
                source_publisher: entryPayload.source_publisher || null,
                source_display: sourceMeta.display || '',
                source_tooltip: sourceMeta.tooltip || '',
                morph_pattern: entryPayload.morph_pattern || null,
                form_plural_pattern: nounMorphology.form_plural_pattern || null,
                form_fem_pattern: nounMorphology.form_fem_pattern || null,
                form_masc_pattern: nounMorphology.form_masc_pattern || null,
                paucal_pattern: nounMorphology.paucal_pattern || null,
                augmentative_pattern: nounMorphology.augmentative_pattern || null,
                diminutive_pattern: primaryDiminutive?.pattern || entryPayload.diminutive_pattern || null,
                is_collective: nounMorphology.is_collective === undefined ? Boolean(entry.is_collective) : Boolean(nounMorphology.is_collective),
                is_singulative: nounMorphology.is_singulative === undefined ? Boolean(entry.is_singulative) : Boolean(nounMorphology.is_singulative),
                is_inflectable_singular: nounMorphology.is_inflectable_singular === undefined
                    ? Boolean(entryPayload.is_inflectable_singular)
                    : Boolean(nounMorphology.is_inflectable_singular),
                is_inflectable_plural: nounMorphology.is_inflectable_plural === undefined
                    ? Boolean(entryPayload.is_inflectable_plural)
                    : Boolean(nounMorphology.is_inflectable_plural),
                synonyms: payload.synonyms,
                antonyms: payload.antonyms,
                related_entries: related_entries.length ? related_entries : payload.related_entries,
                alternative_forms: payload.alternative_forms,
            };
        }

        // Attach Adjective Morphology struct
        if (normalizedPos === 'adjective' || normalizedPos === 'participle') {
            const adjectiveMorphology = entryPayload.adjective_morphology || {};
            payload.adjective_morphology = {
                masculine: adjectiveMorphology.masculine || adjectiveMorphology.masculine_form || entryPayload.headword,
                feminine: adjectiveMorphology.feminine || adjectiveMorphology.feminine_form || null,
                form_masc: adjectiveMorphology.masculine || adjectiveMorphology.masculine_form || entryPayload.headword,
                form_fem: adjectiveMorphology.feminine || adjectiveMorphology.feminine_form || null,
                pattern: adjectiveMorphology.pattern || entryPayload.cv_pattern || entryPayload.morph_pattern || null,
                morph_pattern: entryPayload.morph_pattern || entryPayload.cv_pattern || adjectiveMorphology.pattern || null,
                plural_form: payload.inflections_pl || null, // Mapping to UI's plural_form
                plural_forms: payload.inflections_pl || null, // Forward compatibility
                has_elative: adjectiveMorphology.has_elative === undefined || adjectiveMorphology.has_elative === null
                    ? null
                    : Boolean(adjectiveMorphology.has_elative),
                elative_form: adjectiveMorphology.elative_form || adjectiveMorphology.elative || null,
                elative: adjectiveMorphology.elative_form || adjectiveMorphology.elative || null,
                diminutive: primaryDiminutive?.form || adjectiveMorphology.diminutive || null,
                diminutives,
                form_plural_pattern: adjectiveMorphology.form_plural_pattern || null,
                form_fem_pattern: adjectiveMorphology.form_fem_pattern || null,
                form_masc_pattern: adjectiveMorphology.form_masc_pattern || null,
                elative_pattern: adjectiveMorphology.elative_pattern || null,
                // Optional vowel sets
                vowel_set_sg: adjectiveMorphology.vowel_set_sg || null,
                vowel_set_pl: adjectiveMorphology.vowel_set_pl || null,
                vowel_set_opp: adjectiveMorphology.vowel_set_opp || null,
                vowel_set_dual: adjectiveMorphology.vowel_set_dual || null,
                dual_form: adjectiveMorphology.dual_form || null,
                dual_pattern: adjectiveMorphology.dual_pattern || null,
                diminutive_form: adjectiveMorphology.diminutive_form || null,
                diminutive_pattern: adjectiveMorphology.diminutive_pattern || null,
                is_inflectable: adjectiveMorphology.is_inflectable === undefined ? null : Boolean(adjectiveMorphology.is_inflectable),
                synonyms: payload.synonyms,
                antonyms: payload.antonyms,
                related_entries: related_entries.length ? related_entries : payload.related_entries,
                alternative_forms: payload.alternative_forms,
                source_citation: entryPayload.source_citation || null,
                source_title: entryPayload.source_title || null,
                source_year: entryPayload.source_year || null,
                source_page: entryPayload.source_page || null,
                source_publisher: entryPayload.source_publisher || null,
                source_display: sourceMeta.display || '',
                source_tooltip: sourceMeta.tooltip || '',
                diminutive_pattern: primaryDiminutive?.pattern || entryPayload.diminutive_pattern || null,
            };
            payload.adj_morphology = payload.adjective_morphology;
            // Participles use adjective morphology but have a type
            if (normalizedPos === 'participle') {
                payload.participle_type = entryPayload.participle_type || 'active';
            }
        }

        // Attach Numeral Morphology struct
        if (normalizedPos === 'numeral') {
            const numMorphology = entryPayload.numeral_morphology || {};
            payload.numeral_morphology = {
                numeral_type: numMorphology.numeral_type || null,
                form_attributive_short: numMorphology.form_attributive_short || null,
                form_attributive_short_pattern: numMorphology.form_attributive_short_pattern || null,
                form_attributive_long: numMorphology.form_attributive_long || null,
                plural_forms: payload.inflections_pl,
                synonyms: payload.synonyms,
                antonyms: payload.antonyms,
                related_entries: numeralFamilyEntries.length ? numeralFamilyEntries : payload.related_entries,
                alternative_forms: payload.alternative_forms,
                ordinal_form: numMorphology.ordinal_form || null,
                adverbial_form: numMorphology.adverbial_form || null,
                fractional_form: numMorphology.fractional_form || null,
                multiplier_form: numMorphology.multiplier_form || null,
                distributive_form: numMorphology.distributive_form || null,
                form_plural_pattern: numMorphology.form_plural_pattern || null,
                source_display: sourceMeta.display || '',
                source_tooltip: sourceMeta.tooltip || '',
            };
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
