/**
 * GET /api/search?q=<query>&pos=<pos>&limit=<n>&offset=<n>
 * Full-text search against Turso entries_fts.
 *
 * Cloudflare Pages Function — env vars come from context.env (set in CF dashboard):
 *   TURSO_URL, TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client/web';
import { resolveSuffixEntryMatch } from '../../src/lib/suffixMatching.ts';

const CANONICAL_GENDERS = new Set(['masculine', 'feminine', 'neutral']);

function normalizeSuffixToken(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFC')
        .replace(/[–—−]/g, '-')
        .replace(/[\s-]+/g, '');
}

function normalizedColumnSql(column) {
    return `REPLACE(REPLACE(REPLACE(LOWER(COALESCE(${column}, '')), '-', ''), '–', ''), ' ', '')`;
}

function suffixTokenColumnSql(column) {
    return `(',' || ${normalizedColumnSql(column)} || ',')`;
}

function firstSenseText(value) {
    if (value === undefined || value === null) return '';
    const text = String(value).trim();
    if (!text) return '';
    return text.split(/\s*;\s*/)[0]?.trim() || '';
}

function getQueryValues(params, key) {
    return [...new Set(
        params
            .getAll(key)
            .flatMap((value) => String(value).split(','))
            .map((value) => value.trim())
            .filter(Boolean)
    )];
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() ?? '';
    const pos = url.searchParams.get('pos') ?? '';
    const rootType = url.searchParams.get('type') ?? '';
    const vowelSet = url.searchParams.get('v') ?? '';
    const wizen = url.searchParams.get('wizen') ?? '';
    const forms = getQueryValues(url.searchParams, 'form');
    const verbType = url.searchParams.get('verb_type') ?? '';
    const source = url.searchParams.get('source') ?? '';
    const sourceLanguage = url.searchParams.get('source_language')?.trim() ?? '';
    const suffix = url.searchParams.get('suffix')?.trim() ?? '';
    const suffixKind = url.searchParams.get('suffix_kind')?.trim().toLowerCase() ?? '';
    const requestedGender = url.searchParams.get('gender')?.trim().toLowerCase() ?? '';
    const gender = CANONICAL_GENDERS.has(requestedGender) ? requestedGender : '';
    const rootId = url.searchParams.get('root_id')?.trim().normalize('NFC') ?? '';

    // Radicals
    const r1 = url.searchParams.get('r1') ?? '';
    const r2 = url.searchParams.get('r2') ?? '';
    const r3 = url.searchParams.get('r3') ?? '';
    const r4 = url.searchParams.get('r4') ?? '';

    const tag = url.searchParams.get('tag')?.trim() ?? '';


    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    const isRandom = url.searchParams.get('random') === '1' || url.searchParams.get('random') === 'true';
    const isRegex = url.searchParams.get('regex') === 'true';

    const searchLemma = url.searchParams.get('lemma') === 'true';
    const searchWordForms = url.searchParams.get('word_forms') === 'true';
    const searchEnglishGloss = url.searchParams.get('gloss') === 'true';
    const includeSuggested = url.searchParams.get('suggested') === 'true';
    const includePending = url.searchParams.get('pending') === 'true';
    const isRecent = url.searchParams.get('recent') === 'true';

    // Pattern filters
    const lp = url.searchParams.get('lp') ?? '';
    const fp = url.searchParams.get('fp') ?? '';
    const mp = url.searchParams.get('mp') ?? '';
    const pp = url.searchParams.get('pp') ?? '';
    const dp = url.searchParams.get('dp') ?? '';
    const ep = url.searchParams.get('ep') ?? '';
    const dmp = url.searchParams.get('dmp') ?? '';
    const vs_sg = url.searchParams.get('vs_sg') ?? '';
    const vs_opp = url.searchParams.get('vs_opp') ?? '';
    const vs_pl = url.searchParams.get('vs_pl') ?? '';
    const isZokk = url.searchParams.get('zokk') === 'true';
    const stemString = url.searchParams.get('stem_string')?.trim().normalize('NFC') ?? '';

    try {
        const tursoUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const dbToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: tursoUrl, authToken: dbToken });

        // Normalize search string for better matches
        const normalizedQ = q.toLowerCase().trim().normalize('NFC');

        // FTS5 MATCH query
        const safeQuery = normalizedQ.replace(/"/g, ' ').trim();
        const ftsQuery = `"${safeQuery}"*`;

        let sql = `
            FROM entries e
            -- Prefer the explicit root link; otherwise join the canonical root id
            -- stored on the entry. This avoids fanning out across homographic
            -- roots that share the same consonants.
            LEFT JOIN root_pattern_forms rpf ON (e.id = rpf.id OR e.root_pattern_form_id = rpf.id)
            LEFT JOIN roots r ON r.id = COALESCE(rpf.root_id, e.root_consonants)
            LEFT JOIN patterns pat ON (rpf.pattern_id = pat.id)
            LEFT JOIN definitions d ON d.entry_id = e.id AND d.sense_number = 1
            LEFT JOIN phonetics p   ON p.entry_id = e.id AND p.dialect = 'Standard'
            LEFT JOIN attestation_reliability ar ON ar.entry_id = e.id
            WHERE 1=1
        `;
        const args = [];

        let globStr = '';
        if (q) {
            let conditions = [];
            let qArgs = [];
            const hasFieldFilter = searchLemma || searchWordForms || searchEnglishGloss;

            if (isRegex) {
                // Since REGEXP is unreliable in some SQLite environments, we use GLOB
                globStr = q;
                const hasStartAnchor = globStr.startsWith('^');
                const hasEndAnchor = globStr.endsWith('$');
                globStr = globStr.replace(/^\^/, '').replace(/\$$/, '');
                globStr = globStr.replace(/\.\*/g, '*').replace(/\./g, '?');
                if (!hasStartAnchor) globStr = '*' + globStr;
                if (!hasEndAnchor) globStr = globStr + '*';

                if (searchLemma || !hasFieldFilter) {
                    conditions.push("LOWER(e.headword) GLOB LOWER(?)");
                    qArgs.push(globStr);
                }
                if (searchEnglishGloss) {
                    conditions.push("LOWER(d.text_en) GLOB LOWER(?)");
                    qArgs.push(globStr);
                }
                if (searchWordForms) {
                    conditions.push("LOWER(e.inflections_pl) GLOB LOWER(?)");
                    conditions.push("LOWER(e.verb_verbal_noun) GLOB LOWER(?)");
                    qArgs.push(globStr, globStr);
                }
                if (!hasFieldFilter) {
                    conditions.push("LOWER(r.consonants) GLOB LOWER(?)");
                    conditions.push("LOWER(e.root_consonants) GLOB LOWER(?)");
                    qArgs.push(globStr, globStr);
                }
            } else {
                if (searchLemma || !hasFieldFilter) {
                    conditions.push("e.headword = ?");
                    conditions.push("e.rowid IN (SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?)");
                    const safeQuery = q.toLowerCase().replace(/"/g, ' ').trim();
                    const ftsQuery = `"${safeQuery}"*`;
                    qArgs.push(normalizedQ, ftsQuery);
                }
                if (searchEnglishGloss) {
                    conditions.push("d.text_en LIKE ?");
                    qArgs.push(`%${q}%`);
                }
                if (searchWordForms) {
                    conditions.push("e.inflections_pl LIKE ?");
                    conditions.push("e.verb_verbal_noun LIKE ?");
                    qArgs.push(`%${q}%`, `%${q}%`);
                }
                if (!hasFieldFilter) {
                    conditions.push("r.consonants = ?");
                    conditions.push("e.root_consonants = ?");
                    qArgs.push(normalizedQ, normalizedQ);
                }
            }

            if (conditions.length > 0) {
                sql += ` AND (${conditions.join(' OR ')})`;
                args.push(...qArgs);
            }
        }
        // ... (rest of filters remain similar, updating column names if needed)
        // [Existing filters for rootId, pos, rootType, vowelSet, wizen, form, verbType, source, r1-r4]

        if (rootId) {
            const lowerRootId = rootId.toLowerCase();
            sql += ` AND (r.id = ? OR LOWER(r.consonants) = ? OR LOWER(e.root_consonants) = ?)`;
            args.push(rootId, lowerRootId, lowerRootId);
        }
        if (pos) {
            sql += ' AND e.pos = ?';
            args.push(pos);
        }
        if (rootType) {
            if (rootType === 'semitic') {
                sql += " AND (e.source_language IS NULL OR e.source_language IN ('Arabic', 'Berber'))";
            } else if (rootType === 'romance') {
                sql += " AND e.source_language IN ('Sicilian', 'Italian', 'Latin', 'French', 'Spanish')";
            } else {
                sql += ' AND (r.strength = ? OR e.verb_class = ?)';
                args.push(rootType, rootType);
            }
        }
        if (vowelSet) {
            sql += ' AND (r.vowel_set_perf = ? OR e.verb_vowel_perf = ?)';
            args.push(vowelSet, vowelSet);
        }
        if (wizen) {
            sql += ' AND (pat.wizen_notation = ? OR pat.cv_notation = ? OR e.cv_pattern = ?)';
            args.push(wizen, wizen, wizen);
        }
        if (forms.length > 0) {
            const placeholders = forms.map(() => '?').join(', ');
            sql += ` AND e.verb_form IN (${placeholders})`;
            args.push(...forms);
        }
        if (verbType) {
            sql += ' AND e.verb_type = ?';
            args.push(verbType);
        }
        if (source) {
            sql += ' AND (r.source = ? OR e.source = ?)';
            args.push(source, source);
        }
        if (sourceLanguage) {
            sql += ' AND LOWER(COALESCE(e.source_language, \'\')) = ?';
            args.push(sourceLanguage.toLowerCase());
        }
        if (suffix) {
            const normalizedSuffix = normalizeSuffixToken(suffix);
            const suffixTokenPattern = `%,${normalizedSuffix},%`;
            const suffixMatchSql = [];
            const suffixArgs = [];

            if (suffixKind === 'nominal') {
                suffixMatchSql.push(`${suffixTokenColumnSql('e.dual_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.sound_suffix')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.form_plural_pattern')} LIKE ?`);
                suffixArgs.push(
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                );
            } else if (suffixKind === 'derivational') {
                suffixMatchSql.push(`${suffixTokenColumnSql('e.augmentative_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.augmentative_form')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.morph_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.lemma_pattern')} LIKE ?`);
                suffixArgs.push(
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                );
            } else {
                suffixMatchSql.push(`${suffixTokenColumnSql('e.dual_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.sound_suffix')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.augmentative_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.augmentative_form')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.form_plural_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.morph_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.lemma_pattern')} LIKE ?`);
                suffixArgs.push(
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                );
            }

            sql += ` AND (${suffixMatchSql.join(' OR ')})`;
            args.push(...suffixArgs);
        }
        if (gender) {
            sql += ` AND (
                LOWER(COALESCE(e.gender, '')) = ?
                OR LOWER(COALESCE(json_extract(e.noun_morphology, '$.gender'), '')) = ?
            )`;
            args.push(gender, gender);
        }
        if (r1) { sql += " AND (json_extract(r.consonant_array, '$[0]') = ? OR e.root_consonants LIKE ?)"; args.push(r1.toLowerCase(), r1.toLowerCase() + '-%'); }
        if (r2) { sql += " AND (json_extract(r.consonant_array, '$[1]') = ? OR e.root_consonants LIKE ?)"; args.push(r2.toLowerCase(), '%-' + r2.toLowerCase() + '-%'); }
        if (r3) { sql += " AND (json_extract(r.consonant_array, '$[2]') = ? OR e.root_consonants LIKE ?)"; args.push(r3.toLowerCase(), '%-' + r3.toLowerCase() + (r4 ? '-%' : '')); }
        if (r4) { sql += " AND (json_extract(r.consonant_array, '$[3]') = ? OR e.root_consonants LIKE ?)"; args.push(r4.toLowerCase(), '%-' + r4.toLowerCase()); }
        if (tag) {
            // Support searching for base tag name while matching tags with prefixes (!, $, $!)
            sql += ` AND EXISTS (SELECT 1 FROM json_each(e.tags) WHERE REPLACE(REPLACE(LOWER(value), '!', ''), '$', '') = ?)`;
            args.push(tag.toLowerCase());
        }

        // Pattern filters
        if (lp) { sql += ' AND LOWER(e.lemma_pattern) LIKE ?'; args.push(`%${lp.toLowerCase()}%`); }
        if (fp) { sql += ' AND LOWER(e.form_fem_pattern) LIKE ?'; args.push(`%${fp.toLowerCase()}%`); }
        if (mp) { sql += ' AND LOWER(e.form_masc_pattern) LIKE ?'; args.push(`%${mp.toLowerCase()}%`); }
        if (pp) { 
            sql += ' AND (LOWER(e.form_plural_pattern) LIKE ? OR LOWER(e.morph_pattern) LIKE ?)'; 
            const lp_pp = `%${pp.toLowerCase()}%`;
            args.push(lp_pp, lp_pp); 
        }
        if (dp) { sql += ' AND LOWER(e.dual_pattern) LIKE ?'; args.push(`%${dp.toLowerCase()}%`); }
        // Elative and diminutive patterns aren't separate columns yet, they might be in morph_pattern
        if (ep) { sql += ' AND LOWER(e.morph_pattern) LIKE ?'; args.push(`%${ep.toLowerCase()}%`); }
        if (dmp) { sql += ' AND LOWER(e.morph_pattern) LIKE ?'; args.push(`%${dmp.toLowerCase()}%`); }
        
        if (vs_sg) { sql += ' AND LOWER(e.vowel_set_sg) LIKE ?'; args.push(`%${vs_sg.toLowerCase()}%`); }
        if (vs_opp) { sql += ' AND LOWER(e.vowel_set_opp) LIKE ?'; args.push(`%${vs_opp.toLowerCase()}%`); }
        if (vs_pl) { sql += ' AND LOWER(e.vowel_set_pl) LIKE ?'; args.push(`%${vs_pl.toLowerCase()}%`); }
        if (isZokk) { sql += ' AND e.zokk_morphology IS NOT NULL'; }
        if (stemString) {
            sql += ` AND json_valid(e.zokk_morphology) = 1 AND json_extract(e.zokk_morphology, '$.stem_string') = ?`;
            args.push(stemString);
        }


        const totalRes = await db.execute({ sql: `SELECT COUNT(*) as total ${sql}`, args });
        const total = Number(totalRes.rows[0]?.total ?? 0);

        if (limit === 0) {
            return json({ results: [], total, query: q });
        }

        const hasCriteria = q || rootId || pos || rootType || vowelSet || wizen || source || sourceLanguage || suffix || gender || r1 || r2 || r3 || r4;
        let isRandomSearch = (isRandom || !hasCriteria) && !q;

        let finalSql = `
            SELECT e.*,
                COALESCE(r.consonants, e.root_consonants) AS root_consonants,
                r.strength AS root_strength, r.weak_class AS root_weak_class,
                r.vowel_set_perf, r.vowel_set_impf, r.vowel_set_imp,
                r.gloss AS root_gloss,
                r.id AS root_id,
                d.text_en, d.text_mt, p.ipa, ar.reliability_index,
                pat.cv_notation, pat.wizen_notation, e.zokk_morphology
            ${sql}
                `;

        if (isRecent) {
            finalSql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
        } else if (isRandomSearch) {
            finalSql += ' ORDER BY RANDOM() LIMIT ? OFFSET ?';
        } else {
            let prioritySql = '0';
            if (isRegex && globStr) {
                prioritySql = `(CASE 
                    WHEN LOWER(e.headword) GLOB LOWER(?) THEN 0 
                    WHEN (LOWER(r.consonants) GLOB LOWER(?) OR LOWER(e.root_consonants) GLOB LOWER(?)) THEN 1
                    ELSE 2 END)`;
                args.push(globStr, globStr, globStr);
            } else if (q) {
                prioritySql = `(CASE 
                    WHEN e.headword = ? THEN 0 
                    WHEN e.headword LIKE ? THEN 1
                    WHEN (r.consonants = ? OR e.root_consonants = ?) THEN 2
                    ELSE 3 END)`;
                args.push(normalizedQ, normalizedQ + '%', normalizedQ, normalizedQ);
            }
            finalSql += ` ORDER BY ${prioritySql && prioritySql !== '0' ? prioritySql + ',' : ''} e.headword ASC LIMIT ? OFFSET ?`;
        }
        args.push(limit, offset);

        const result = await db.execute({ sql: finalSql, args });

        const rows = result.rows.map(r => {
            let inflections_pl = [];
            if (r.inflections_pl) {
                try {
                    inflections_pl = JSON.parse(r.inflections_pl);
                    if (!Array.isArray(inflections_pl)) inflections_pl = [];
                } catch (e) {
                    console.error(`Malformed inflections_pl for ID ${r.id}:`, r.inflections_pl);
                    inflections_pl = [];
                }
            }
            const mapped = {
                ...r,
                tags: r.tags ? (() => { try { return JSON.parse(r.tags); } catch { return []; } })() : [],
                is_loanword: Boolean(r.is_loanword),
                // Map to legacy names for frontend compatibility if needed, or keep unified
                noun_plural_forms: inflections_pl,
                verb_morphology: (r.pos === 'verb' || r.verb_form) ? {
                    form: r.verb_form || '',
                    transitivity: r.verb_transitivity || 'both',
                    perfective_3sg_m: r.verb_perfective_3sgm || r.headword,
                    imperfective_3sg_m: r.verb_imperfective_3sgm || '',
                    vowel_set_perfect: r.verb_vowel_perf || '',
                    vowel_set_imperfect: r.verb_vowel_impf || '',
                    verbal_noun: r.verb_verbal_noun || '',
                    active_participle: r.verb_active_ptcp || '',
                    passive_participle: r.verb_passive_ptcp || '',
                } : undefined,
                noun_morphology: r.pos === 'noun' ? {
                    gender: r.gender,
                    singular: r.lemma_base || r.headword,
                    plural_forms: inflections_pl
                } : undefined,
                adjective_morphology: r.pos === 'adjective' ? {
                    gender: r.gender,
                    masculine: r.lemma_base || r.headword,
                    plural: inflections_pl.join(', ')
                } : undefined,
                definition_en: firstSenseText(r.text_en),
                definition_mt: firstSenseText(r.text_mt),
                zokk_morphology: r.zokk_morphology ? (() => { try { return JSON.parse(r.zokk_morphology); } catch { return undefined; } })() : undefined,
                root_pattern_form: r.root_consonants ? {
                    id: '',
                    root_id: r.root_id || '',
                    pattern_id: '',
                    derived_form: r.headword,
                    root: {
                        id: r.root_id || '',
                        consonants: r.root_consonants || '',
                        consonant_array: r.root_consonants ? r.root_consonants.split('-') : [],
                        strength: r.root_strength || 'strong',
                        weak_class: r.root_weak_class || undefined,
                        vowel_set_perf: r.vowel_set_perf,
                        vowel_set_impf: r.vowel_set_impf,
                        vowel_set_imp: r.vowel_set_imp,
                        gloss: r.root_gloss || '',
                        is_imala_blocked: false,
                        created_at: '',
                        updated_at: ''
                    },
                    pattern: (r.cv_notation || r.cv_pattern) ? {
                        id: '',
                        cv_notation: r.cv_notation || r.cv_pattern || '',
                        wizen_notation: r.wizen_notation || '',
                        created_at: ''
                    } : undefined
                } : undefined
            };

            return {
                ...mapped,
                suffix_match: suffix ? (resolveSuffixEntryMatch(mapped, suffix, suffixKind === 'derivational' ? 'derivational' : 'nominal') || undefined) : undefined
            };
        });

        return json({ results: rows, total, query: q });
    } catch (e) {
        console.error("API SEARCH ERROR:", e);
        return json({ 
            error: e.message, 
            stack: e.stack, 
            query: q,
            detail: "!!! SEARCH_API_ERROR !!!: Error occurred during search execution or result mapping"
        }, 500);
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
