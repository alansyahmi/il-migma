/**
 * GET /api/search?q=<query>&pos=<pos>&limit=<n>&offset=<n>
 * Full-text search against Turso entries_fts.
 *
 * Cloudflare Pages Function — env vars come from context.env (set in CF dashboard):
 *   TURSO_URL, TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client/web';
import { resolveSuffixEntryMatch } from '../../src/lib/suffixMatching.ts';
import { normalizeSourceMetadata } from '../../src/lib/sourceMetadata.ts';
import { hydrateEntryRow, ENTRY_MORPHOLOGY_JOINS, ENTRY_MORPHOLOGY_SELECT } from '../../src/lib/entryHydration.ts';

const CANONICAL_GENDERS = new Set(['masculine', 'feminine', 'common', 'neutral']);
const VERB_STRENGTH_FILTERS = new Set(['strong', 'strong-hybrid', 'weak', 'geminated', 'doubled']);
const VERB_WEAK_CLASS_FILTERS = new Set(['assimilative', 'hollow', 'defective']);

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
    const rootType = url.searchParams.get('type')?.trim().toLowerCase() ?? '';
    const weakClassFilter = url.searchParams.get('weak_class')?.trim().toLowerCase() ?? '';
    const nounType = url.searchParams.get('noun_type')?.trim().toLowerCase() ?? '';
    const vowelSet = url.searchParams.get('v') ?? '';
    const wizen = url.searchParams.get('wizen') ?? '';
    const forms = getQueryValues(url.searchParams, 'form');
    const verbType = url.searchParams.get('verb_type') ?? '';
    const source = url.searchParams.get('source') ?? '';
    const sourceLanguage = url.searchParams.get('source_language')?.trim() ?? '';
    const suffix = url.searchParams.get('suffix')?.trim() ?? '';
    const suffixKind = url.searchParams.get('suffix_kind')?.trim().toLowerCase() ?? '';
    const rawGender = url.searchParams.get('gender')?.trim().toLowerCase() ?? '';
    const requestedGender = ['common', 'comm', 'c', 'mf', 'both'].includes(rawGender) ? 'common' : rawGender;
    const gender = CANONICAL_GENDERS.has(requestedGender) ? requestedGender : '';
    const rootId = url.searchParams.get('root_id')?.trim().normalize('NFC') ?? '';

    // Radicals
    const r1 = url.searchParams.get('r1') ?? '';
    const r2 = url.searchParams.get('r2') ?? '';
    const r3 = url.searchParams.get('r3') ?? '';
    const r4 = url.searchParams.get('r4') ?? '';

    const tag = url.searchParams.get('tag')?.trim() ?? '';
    const register = url.searchParams.get('register')?.trim().toLowerCase() ?? '';


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

        // Older/current databases do not all have the optional entry status
        // column. Discover it instead of allowing the entire search query to
        // fail with "no such column: e.status".
        const entryColumns = await db.execute('PRAGMA table_info(entries)');
        const hasEntryStatus = entryColumns.rows.some((column) => column.name === 'status');

        // Normalize search string for better matches
        const normalizedQ = q.toLowerCase().trim().normalize('NFC');

        // FTS5 MATCH query
        const safeQuery = normalizedQ.replace(/"/g, ' ').trim();
        const ftsQuery = `"${safeQuery}"*`;

        const baseJoins = `
            FROM entries e
            LEFT JOIN roots r ON (r.consonants = e.root_consonants OR r.id = e.root_consonants OR r.id = 'root-' || e.root_consonants OR LOWER(REPLACE(r.consonants, ' ', '')) = LOWER(REPLACE(COALESCE(e.root_consonants, ''), ' ', '')))
            LEFT JOIN root_pattern_forms rpf ON (e.id = rpf.id OR (rpf.root_id = r.id AND rpf.derived_form = e.headword))
            LEFT JOIN patterns pat ON (rpf.pattern_id = pat.id)
            ${ENTRY_MORPHOLOGY_JOINS}
        `;
        let sql = ` WHERE 1=1`;
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
                    conditions.push("e.id IN (SELECT entry_id FROM alternative_forms WHERE LOWER(headword) GLOB LOWER(?))");
                    qArgs.push(globStr, globStr);
                }
                if (searchEnglishGloss) {
                    conditions.push(`LOWER(COALESCE(json_extract(e.definitions, '$[0].text_en'), '')) GLOB LOWER(?)`);
                    qArgs.push(globStr);
                }
                if (searchWordForms) {
                    conditions.push("LOWER(COALESCE(nm.plural_forms, am.plural_form, '')) GLOB LOWER(?)");
                    conditions.push("LOWER(vm.verbal_noun) GLOB LOWER(?)");
                    conditions.push("e.id IN (SELECT entry_id FROM alternative_forms WHERE LOWER(headword) GLOB LOWER(?))");
                    qArgs.push(globStr, globStr, globStr);
                }
                if (!hasFieldFilter) {
                    conditions.push("LOWER(r.consonants) GLOB LOWER(?)");
                    conditions.push("LOWER(e.root_consonants) GLOB LOWER(?)");
                    qArgs.push(globStr, globStr);
                }
            } else {
                const safeQuery = q.toLowerCase().replace(/"/g, ' ').trim();
                const altQueryApos = normalizedQ.includes("'")
                    ? normalizedQ.replace(/'/g, '’')
                    : normalizedQ.replace(/’/g, "'");
                if (searchLemma || !hasFieldFilter) {
                    conditions.push("e.headword = ?");
                    conditions.push("e.rowid IN (SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?)");
                    conditions.push("e.id IN (SELECT entry_id FROM alternative_forms WHERE LOWER(headword) IN (LOWER(?), LOWER(?)) OR headword LIKE ?)");
                    const ftsQuery = `"${safeQuery}"*`;
                    qArgs.push(normalizedQ, ftsQuery, normalizedQ, altQueryApos, `${safeQuery}%`);
                }
                if (searchEnglishGloss) {
                    conditions.push(`COALESCE(json_extract(e.definitions, '$[0].text_en'), '') LIKE ?`);
                    qArgs.push(`%${q}%`);
                }
                if (searchWordForms) {
                    conditions.push("COALESCE(nm.plural_forms, am.plural_form, '') LIKE ?");
                    conditions.push("vm.verbal_noun LIKE ?");
                    conditions.push("e.id IN (SELECT entry_id FROM alternative_forms WHERE LOWER(headword) IN (LOWER(?), LOWER(?)) OR headword LIKE ?)");
                    qArgs.push(`%${q}%`, `%${q}%`, normalizedQ, altQueryApos, `${safeQuery}%`);
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
            const cleanRoot = rootId.toLowerCase().replace(/^root-/, '').trim();
            sql += ` AND (r.id = ? OR r.id = ? OR LOWER(r.consonants) = ? OR LOWER(e.root_consonants) = ? OR LOWER(REPLACE(r.consonants, ' ', '')) = ? OR LOWER(REPLACE(e.root_consonants, ' ', '')) = ?)`;
            args.push(rootId, `root-${cleanRoot}`, cleanRoot, cleanRoot, cleanRoot, cleanRoot);
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
            } else if (pos === 'verb' && (VERB_WEAK_CLASS_FILTERS.has(rootType) || (rootType === 'weak' && VERB_WEAK_CLASS_FILTERS.has(weakClassFilter)))) {
                const selectedWeakClass = VERB_WEAK_CLASS_FILTERS.has(weakClassFilter) ? weakClassFilter : rootType;
                sql += ` AND (
                    LOWER(COALESCE(vm.class, e.verb_class, r.strength, '')) = 'weak'
                    AND LOWER(COALESCE(vm.weak_class, e.verb_weak_class, r.weak_class, '')) = ?
                )`;
                args.push(selectedWeakClass);
            } else if (pos === 'verb' && VERB_STRENGTH_FILTERS.has(rootType)) {
                const canonicalVerbClass = rootType === 'doubled' ? 'geminated' : rootType;
                if (canonicalVerbClass === 'strong-hybrid') {
                    sql += ` AND (
                        LOWER(COALESCE(vm.class, e.verb_class, '')) = ?
                        OR (
                            COALESCE(vm.form, e.verb_form, '') = 'I'
                            AND LOWER(COALESCE(vm.class, e.verb_class, r.strength, '')) = 'strong'
                            AND (LOWER(COALESCE(r.consonants, e.root_consonants, '')) LIKE '%-għ' OR LOWER(COALESCE(r.consonants, e.root_consonants, '')) LIKE '%-gh')
                            AND (e.headword LIKE ? OR e.headword LIKE ?)
                        )
                    )`;
                    args.push(canonicalVerbClass, "%'", "%’");
                } else {
                    sql += ' AND (LOWER(COALESCE(vm.class, e.verb_class, r.strength, \'\')) = ?)';
                    args.push(canonicalVerbClass);
                }
            } else {
                sql += ' AND (r.strength = ? OR vm.class = ?)';
                args.push(rootType, rootType);
            }
        }
        if (nounType) {
            sql += ' AND LOWER(COALESCE(nm.noun_type, \'\')) = ?';
            args.push(nounType);
        }
        if (vowelSet) {
            sql += ' AND (r.vowel_set_perf = ? OR vm.vowel_set_perf = ?)';
            args.push(vowelSet, vowelSet);
        }
        if (wizen) {
            sql += ' AND (pat.wizen_notation = ? OR pat.cv_notation = ? OR COALESCE(nm.morph_pattern, e.cv_pattern) = ?)';
            args.push(wizen, wizen, wizen);
        }
        if (forms.length > 0) {
            const placeholders = forms.map(() => '?').join(', ');
            sql += ` AND vm.form IN (${placeholders})`;
            args.push(...forms);
        }
        if (verbType) {
            sql += ' AND vm.type = ?';
            args.push(verbType);
        }
        if (source) {
            sql += ' AND r.source = ?';
            args.push(source);
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
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.dual_form')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.sound_plural')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.plural_forms')} LIKE ?`);
                suffixArgs.push(
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                );
            } else if (suffixKind === 'derivational') {
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.augmentative_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.augmentative_form')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.cv_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('am.elative_form')} LIKE ?`);
                suffixArgs.push(
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                    suffixTokenPattern,
                );
            } else {
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.dual_form')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.sound_plural')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.augmentative_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.augmentative_form')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('nm.plural_forms')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('e.cv_pattern')} LIKE ?`);
                suffixMatchSql.push(`${suffixTokenColumnSql('am.elative_form')} LIKE ?`);
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
            if (gender === 'common') {
                sql += ` AND (
                    LOWER(COALESCE(nm.gender, am.gender, pm.gender, e.gender, '')) IN ('common', 'neutral')
                )`;
            } else {
                sql += ` AND (
                    LOWER(COALESCE(nm.gender, am.gender, pm.gender, e.gender, '')) = ?
                )`;
                args.push(gender);
            }
        }
        if (r1) { sql += " AND (json_extract(r.consonant_array, '$[0]') = ? OR e.root_consonants LIKE ?)"; args.push(r1.toLowerCase(), r1.toLowerCase() + '-%'); }
        if (r2) { sql += " AND (json_extract(r.consonant_array, '$[1]') = ? OR e.root_consonants LIKE ?)"; args.push(r2.toLowerCase(), '%-' + r2.toLowerCase() + '-%'); }
        if (r3) { sql += " AND (json_extract(r.consonant_array, '$[2]') = ? OR e.root_consonants LIKE ?)"; args.push(r3.toLowerCase(), '%-' + r3.toLowerCase() + (r4 ? '-%' : '')); }
        if (r4) { sql += " AND (json_extract(r.consonant_array, '$[3]') = ? OR e.root_consonants LIKE ?)"; args.push(r4.toLowerCase(), '%-' + r4.toLowerCase()); }
        if (tag) {
            // Support searching for base tag name while matching tags in normalized entry_tags table
            sql += ` AND EXISTS (SELECT 1 FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE et.entry_id = e.id AND LOWER(t.name) = ?)`;
            args.push(tag.toLowerCase());
        }
        if (register) {
            sql += ` AND (
                (json_valid(e.definitions) AND EXISTS (
                    SELECT 1 FROM json_each(e.definitions)
                    WHERE LOWER(COALESCE(json_extract(value, '$.register'), '')) = ?
                       OR LOWER(COALESCE(json_extract(value, '$.register.key'), '')) = ?
                       OR LOWER(COALESCE(json_extract(value, '$.register.en'), '')) = ?
                       OR LOWER(COALESCE(json_extract(value, '$.register.mt'), '')) = ?
                       OR LOWER(COALESCE(json_extract(value, '$.register.arabised'), '')) = ?
                ))
                OR LOWER(COALESCE(e.definitions, '')) LIKE ?
            )`;
            args.push(register, register, register, register, register, `%"${register}"%`);
        }
        // Pattern filters
        if (lp) { sql += ' AND LOWER(COALESCE(pat.cv_notation, \'\')) LIKE ?'; args.push(`%${lp.toLowerCase()}%`); }
        if (fp) { sql += ' AND LOWER(COALESCE(nm.feminine_form, am.feminine_form, \'\')) LIKE ?'; args.push(`%${fp.toLowerCase()}%`); }
        if (mp) { sql += ' AND LOWER(COALESCE(nm.masculine_form, am.masculine_form, \'\')) LIKE ?'; args.push(`%${mp.toLowerCase()}%`); }
        if (pp) { 
            sql += ' AND (LOWER(COALESCE(nm.plural_forms, am.plural_form, \'\')) LIKE ? OR LOWER(nm.sound_plural) LIKE ?)';
            const lp_pp = `%${pp.toLowerCase()}%`;
            args.push(lp_pp, lp_pp); 
        }
        if (dp) { sql += ' AND LOWER(COALESCE(nm.dual_form, \'\')) LIKE ?'; args.push(`%${dp.toLowerCase()}%`); }
        if (ep) { sql += ' AND LOWER(COALESCE(am.elative_form, \'\')) LIKE ?'; args.push(`%${ep.toLowerCase()}%`); }
        if (dmp) { sql += ' AND LOWER(COALESCE(nm.diminutive_form, \'\')) LIKE ?'; args.push(`%${dmp.toLowerCase()}%`); }
        
        if (vs_sg) { sql += ' AND LOWER(COALESCE(vm.vowel_set_perf, \'\')) LIKE ?'; args.push(`%${vs_sg.toLowerCase()}%`); }
        if (vs_opp) { sql += ' AND LOWER(COALESCE(vm.vowel_set_impf, \'\')) LIKE ?'; args.push(`%${vs_opp.toLowerCase()}%`); }
        if (vs_pl) { sql += ' AND LOWER(COALESCE(vm.vowel_set_impv, \'\')) LIKE ?'; args.push(`%${vs_pl.toLowerCase()}%`); }
        if (isZokk) {
            sql += ' AND e.stem IS NOT NULL';
        }
        if (stemString) {
            sql += ` AND e.stem = ?`;
            args.push(stemString);
        }

        // Status filtering (approved by default; pending/suggested included when requested)
        if (hasEntryStatus && (!includePending || !includeSuggested)) {
            const statusConditions = ["COALESCE(e.status, 'approved') = 'approved'"];
            if (includePending) statusConditions.push("e.status = 'pending'");
            if (includeSuggested) statusConditions.push("e.status = 'suggested'");
            sql += ` AND (${statusConditions.join(' OR ')})`;
        }

        const hasCriteria = Boolean(q || rootId || pos || rootType || nounType || vowelSet || wizen || source || sourceLanguage || suffix || gender || r1 || r2 || r3 || r4 || forms.length > 0 || verbType || tag || lp || fp || mp || pp || dp || ep || dmp || vs_sg || vs_opp || vs_pl || isZokk || stemString);
        let isRandomSearch = (isRandom || !hasCriteria) && !q;

        let total = 0;
        if (limit === 0 && !hasCriteria) {
            // Ultra-fast path for browse headers: 1 row read from app_stats or count(rowid)
            try {
                const statsRes = await db.execute("SELECT value FROM app_stats WHERE key = 'home_summary' LIMIT 1");
                if (statsRes.rows.length > 0 && statsRes.rows[0].value) {
                    const parsed = JSON.parse(String(statsRes.rows[0].value));
                    if (typeof parsed?.total === 'number') {
                        total = parsed.total;
                    }
                }
            } catch {}
            if (!total) {
                const countRes = await db.execute("SELECT COUNT(rowid) as total FROM entries");
                total = Number(countRes.rows[0]?.total ?? 0);
            }
            return json({ results: [], total, query: q });
        }

        // Lean joins for COUNT query: only join tables that are actually referenced in WHERE conditions
        let countJoins = 'FROM entries e';
        if (sql.includes('r.')) countJoins += ' LEFT JOIN roots r ON (r.consonants = e.root_consonants OR r.id = e.root_consonants OR r.id = \'root-\' || e.root_consonants OR LOWER(REPLACE(r.consonants, \' \', \'\')) = LOWER(REPLACE(COALESCE(e.root_consonants, \'\'), \' \', \'\')))';
        if (sql.includes('rpf.')) countJoins += ' LEFT JOIN root_pattern_forms rpf ON (e.id = rpf.id OR (rpf.derived_form = e.headword))';
        if (sql.includes('pat.')) countJoins += ' LEFT JOIN patterns pat ON (rpf.pattern_id = pat.id)';
        if (sql.includes('vm.')) countJoins += ' LEFT JOIN verb_morphology vm ON vm.entry_id = e.id';
        if (sql.includes('nm.')) countJoins += ' LEFT JOIN noun_morphology nm ON nm.entry_id = e.id';
        if (sql.includes('am.')) countJoins += ' LEFT JOIN adj_morphology am ON am.entry_id = e.id';
        if (sql.includes('pm.')) countJoins += ' LEFT JOIN participle_morphology pm ON pm.entry_id = e.id';
        if (sql.includes('num.')) countJoins += ' LEFT JOIN numeral_morphology num ON num.entry_id = e.id';
        if (sql.includes('s.')) countJoins += ' LEFT JOIN stems s ON e.stem = s.stem_string';
        if (sql.includes('ls.')) countJoins += ' LEFT JOIN lexical_sources ls ON e.source_id = ls.id';

        const totalRes = await db.execute({ sql: `SELECT COUNT(*) as total ${countJoins} ${sql}`, args });
        total = Number(totalRes.rows[0]?.total ?? 0);

        if (limit === 0) {
            return json({ results: [], total, query: q });
        }

        let finalSql = `
            SELECT e.*,
                COALESCE(r.consonants, e.root_consonants) AS root_consonants,
                r.strength AS root_strength, r.weak_class AS root_weak_class,
                r.vowel_set_perf, r.vowel_set_impf, r.vowel_set_imp,
                r.gloss AS root_gloss,
                r.id AS root_id,
                json_extract(e.definitions, '$[0].text_en') AS definition_en,
                json_extract(e.definitions, '$[0].text_mt') AS definition_mt,
                p.ipa, ar.reliability_index,
                pat.cv_notation, pat.wizen_notation,
                ${ENTRY_MORPHOLOGY_SELECT}
            ${baseJoins}
            LEFT JOIN phonetics p   ON p.entry_id = e.id AND p.dialect = 'Standard'
            LEFT JOIN attestation_reliability ar ON ar.entry_id = e.id
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
            const mapped = hydrateEntryRow(r);
            const sourceMeta = normalizeSourceMetadata(r);

            return {
                ...mapped,
                definition_en: firstSenseText(r.text_en),
                definition_mt: firstSenseText(r.text_mt),
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
                    pattern: (r.cv_notation || r.nm_morph_pattern || r.am_pattern) ? {
                        id: '',
                        cv_notation: r.cv_notation || r.nm_morph_pattern || r.am_pattern || '',
                        wizen_notation: r.wizen_notation || '',
                        created_at: ''
                    } : undefined
                } : undefined,
                source_display: sourceMeta.display || '',
                source_tooltip: sourceMeta.tooltip || '',
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

function json(data, status = 200, cacheSeconds = 300) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };
    if (status === 200) {
        headers['Cache-Control'] = `public, max-age=60, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`;
    }
    return new Response(JSON.stringify(data), {
        status,
        headers,
    });
}
