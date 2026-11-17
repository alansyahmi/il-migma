import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';

/**
 * scripts/push-done-entries.mjs
 * High-efficiency, minimal-read CLI push script for Il-Miġma's completed categories.
 *
 * Usage:
 *   node scripts/push-done-entries.mjs --dry-run      (Default: inspect changes without writing)
 *   node scripts/push-done-entries.mjs --execute      (Apply upserts directly to Turso)
 *   node scripts/push-done-entries.mjs --category=prepositions
 */

// ── 1. Load Credentials ───────────────────────────────────────────────────────
function parseDevVars() {
    const env = {};
    const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
    if (fs.existsSync(devVarsPath)) {
        const lines = fs.readFileSync(devVarsPath, 'utf8').split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
                const k = trimmed.slice(0, eqIdx).trim();
                let v = trimmed.slice(eqIdx + 1).trim();
                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                    v = v.slice(1, -1);
                }
                env[k] = v;
            }
        }
    }
    return env;
}

const fileEnv = parseDevVars();
const TURSO_URL = process.env.TURSO_URL || process.env.VITE_TURSO_URL || fileEnv.TURSO_URL || fileEnv.VITE_TURSO_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN || fileEnv.TURSO_AUTH_TOKEN || fileEnv.VITE_TURSO_AUTH_TOKEN;

if (!TURSO_URL) {
    console.error('❌ Error: TURSO_URL or VITE_TURSO_URL not found in environment or .dev.vars');
    process.exit(1);
}

// ── 2. Parse CLI Arguments ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isExecute = args.includes('--execute') || args.includes('--apply');
const isDryRun = !isExecute || args.includes('--dry-run');
const categoryArg = args.find(a => a.startsWith('--category='))?.split('=')[1]?.toLowerCase();
const isVerbose = args.includes('--verbose') || args.includes('-v');

// ── 3. Load Target Category JSON Files ────────────────────────────────────────
const CATEGORY_FILES = [
    { id: 'pronouns_determiners', path: 'docs/1000-words-categories/DONE_pronouns_determiners.json' },
    { id: 'prepositions', path: 'docs/1000-words-categories/DONE_prepositions.json' },
    { id: 'conjunctions', path: 'docs/1000-words-categories/DONE_conjunctions.json' },
    { id: 'adverbs_particles', path: 'docs/1000-words-categories/DONE_adverbs_particles.json' },
    { id: 'numerals', path: 'docs/1000-words-categories/DONE_numerals.json' },
    { id: 'artifacts', path: 'docs/1000-words-categories/DONE_artifacts.json' },
    { id: 'adj_sensory_colours', path: 'docs/1000-words-categories/DONE_adj_sensory_colours.json' },
    { id: 'verbs_daily_social', path: 'docs/1000-words-categories/DONE_verbs_daily_social.json' },
    { id: 'time_calendar', path: 'docs/1000-words-categories/DONE_time_calendar.json' },
    { id: 'misc_remnants', path: 'docs/1000-words-categories/DONE_misc_remnants.json' },
];

const selectedFiles = categoryArg
    ? CATEGORY_FILES.filter(f => f.id.includes(categoryArg))
    : CATEGORY_FILES;

if (selectedFiles.length === 0) {
    console.error(`❌ Unknown category: "${categoryArg}". Available: ${CATEGORY_FILES.map(c => c.id).join(', ')}`);
    process.exit(1);
}

const allEntries = [];
for (const fileCfg of selectedFiles) {
    const fullPath = path.resolve(process.cwd(), fileCfg.path);
    if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Warning: File not found: ${fileCfg.path}`);
        continue;
    }
    const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const entries = Array.isArray(raw) ? raw : (raw.entries || []);
    for (const e of entries) {
        allEntries.push({ ...e, _sourceCategory: fileCfg.id });
    }
    console.log(`📁 Loaded ${entries.length} entries from ${fileCfg.path}`);
}

console.log(`\n📊 Total entries queued for sync: ${allEntries.length}`);

// ── 4. Main Minimal-Read Push Execution ───────────────────────────────────────
async function run() {
    const client = createClient({
        url: TURSO_URL,
        authToken: TURSO_AUTH_TOKEN,
    });

    let totalReadQueries = 0;
    let totalRowsRead = 0;
    let totalWriteQueries = 0;

    console.log(`\n🔌 Connected to Turso endpoint: ${TURSO_URL.replace(/:[^:]*@/, ':***@').slice(0, 35)}...`);

    const allEntryIds = new Set(allEntries.map(e => e.id));

    // ── STEP 1: Verify live schema & column sets ─────────────────────────────
    console.log('\n🔎 Step 1: Introspecting live table constraints & columns...');
    const schemaRes = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='entries'");
    totalReadQueries++;
    totalRowsRead += schemaRes.rows.length;
    const tableSql = String(schemaRes.rows[0]?.sql || '');
    const allowsCommonGender = tableSql.includes('common');

    async function getTableColumns(tableName) {
        const res = await client.execute(`PRAGMA table_info(${tableName})`);
        totalReadQueries++;
        totalRowsRead += res.rows.length;
        return new Set(res.rows.map(r => String(r.name || r[1])));
    }

    const entryCols = await getTableColumns('entries');
    const verbCols = await getTableColumns('verb_morphology');
    const nounCols = await getTableColumns('noun_morphology');
    const adjCols = await getTableColumns('adj_morphology');
    const phoneticsCols = await getTableColumns('phonetics');
    let stemsCols = await getTableColumns('stems');
    if (!isDryRun && stemsCols.size === 0) {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS stems (
                stem_string      TEXT PRIMARY KEY,
                class_type       TEXT NOT NULL,
                is_hybrid        INTEGER NOT NULL DEFAULT 0,
                root             TEXT,
                agentive_suffix  TEXT,
                created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            )
        `);
        totalWriteQueries++;
        stemsCols = await getTableColumns('stems');
    }

    console.log(`   ✓ entries (${entryCols.size} cols), verb_morphology (${verbCols.size} cols), adj_morphology (${adjCols.size} cols), phonetics (${phoneticsCols.size} cols), stems (${stemsCols.size} cols). Common gender: ${allowsCommonGender ? 'YES' : 'NO (auto-mapping to neutral)'}`);

    // Verify existing lexical sources in 1 query
    const sourcesRes = await client.execute("SELECT id FROM lexical_sources");
    totalReadQueries++;
    totalRowsRead += sourcesRes.rows.length;
    const existingSourceIds = new Set(sourcesRes.rows.map(r => String(r.id || r[0])));
    console.log(`   ✓ Found ${existingSourceIds.size} existing lexical sources in DB.`);

    // ── STEP 2: Collect candidate IDs & Targets for Bulk Prefetch ──────────────
    console.log('\n🔎 Step 2: Bulk prefetching existing entries & targets (1 combined query)...');
    const candidateIds = Array.from(new Set(allEntries.map(e => e.id).filter(Boolean)));
    const candidateHeadwords = Array.from(new Set(allEntries.map(e => e.headword).filter(Boolean)));

    // Also collect all alternative form target IDs and related entry target IDs
    const allTargetIds = new Set();
    for (const e of allEntries) {
        if (Array.isArray(e.alternative_forms)) {
            for (const item of e.alternative_forms) {
                if (typeof item === 'object' && item?.id && !item.id.startsWith('alt_')) {
                    allTargetIds.add(String(item.id).trim());
                } else if (typeof item === 'object' && item?.target_entry_id) {
                    allTargetIds.add(String(item.target_entry_id).trim());
                }
            }
        }
        if (Array.isArray(e.related_entries)) {
            for (const r of e.related_entries) {
                const targetId = typeof r === 'string' ? r : (r?.target_entry_id || r?.id || r?.target_id);
                if (targetId) allTargetIds.add(String(targetId).trim());
            }
        }
    }

    const allLookupIds = Array.from(new Set([...candidateIds, ...allTargetIds]));
    const existingById = new Map();
    const existingByHeadwordPos = new Map();

    // Chunk lookups into chunks of 100 to stay well under SQLite parameter limits
    const CHUNK_SIZE = 90;
    for (let i = 0; i < allLookupIds.length; i += CHUNK_SIZE) {
        const chunk = allLookupIds.slice(i, i + CHUNK_SIZE);
        const placeholders = chunk.map(() => '?').join(', ');
        const prefetchRes = await client.execute({
            sql: `SELECT id, headword, pos FROM entries WHERE id IN (${placeholders})`,
            args: chunk,
        });
        totalReadQueries++;
        totalRowsRead += prefetchRes.rows.length;

        for (const row of prefetchRes.rows) {
            existingById.set(row.id, row.id);
            if (row.headword && row.pos) {
                const key = `${String(row.headword).toLowerCase().trim()}::${String(row.pos).toLowerCase().trim()}`;
                existingByHeadwordPos.set(key, row.id);
            }
        }
    }

    console.log(`   ✓ Prefetched lookups in ${Math.ceil(allLookupIds.length / CHUNK_SIZE)} queries.`);
    console.log(`   ✓ Matched ${existingById.size} existing entry/target records.`);

    // ── STEP 3: Plan Changes ──────────────────────────────────────────────────
    let insertCount = 0;
    let updateCount = 0;
    const plan = [];

    for (const entry of allEntries) {
        const normPos = String(entry.pos || '').toLowerCase().trim();
        const headwordKey = `${String(entry.headword).toLowerCase().trim()}::${normPos}`;
        const existingId = existingById.get(entry.id) || existingByHeadwordPos.get(headwordKey) || null;
        const action = existingId ? 'UPDATE' : 'INSERT';
        if (action === 'INSERT') insertCount++;
        else updateCount++;

        plan.push({
            id: entry.id,
            headword: entry.headword,
            pos: normPos,
            action,
            targetId: existingId || entry.id,
            entry,
        });
    }

    console.log(`\n📋 Execution Plan Summary:`);
    console.log(`   • Total Entries: ${allEntries.length}`);
    console.log(`   • Existing to UPDATE: ${updateCount}`);
    console.log(`   • New to INSERT: ${insertCount}`);
    console.log(`   • Total Read Queries Used: ${totalReadQueries} (${totalRowsRead} rows read total!)`);

    if (isDryRun) {
        console.log('\n🟡 DRY RUN MODE (No changes written to database)');
        console.log('Sample planned entries:');
        for (const item of plan.slice(0, 8)) {
            console.log(`   [${item.action}] ${item.headword} (${item.pos}) -> ${item.id}`);
        }
        if (plan.length > 8) {
            console.log(`   ... and ${plan.length - 8} more entries.`);
        }
        console.log('\n✨ To apply these updates to your live Turso database, run:');
        console.log('   node scripts/push-done-entries.mjs --execute\n');
        return;
    }

    // ── STEP 4: Apply Writes in Efficient Transactions ────────────────────────
    console.log('\n🚀 Step 4: Applying writes to Turso database in batches of 50...');
    const startTime = Date.now();
    let appliedCount = 0;
    const BATCH_SIZE = 50;
    const allRelationships = [];

    for (let b = 0; b < plan.length; b += BATCH_SIZE) {
        const batch = plan.slice(b, b + BATCH_SIZE);
        const tx = await client.transaction('write');

        try {
            for (const item of batch) {
                const e = item.entry;
                const entryId = item.id;

                // Handle gender constraint safety
                let gender = e.gender ?? null;
                if (gender) {
                    const gLower = String(gender).toLowerCase().trim();
                    if (gLower === 'common' && !allowsCommonGender) {
                        gender = 'neutral';
                    } else {
                        gender = gLower;
                    }
                }

                // Handle lexical source safety
                let sourceId = e.source_id || null;
                if (sourceId && !existingSourceIds.has(sourceId)) {
                    const fallbackName = e.source_title || e.source_citation || sourceId;
                    await tx.execute({
                        sql: `INSERT OR IGNORE INTO lexical_sources (id, name, full_title, reliability_weight, source_type) VALUES (?, ?, ?, ?, ?)`,
                        args: [sourceId, `${fallbackName} (${sourceId})`, fallbackName, 0.70, 'academic'],
                    });
                    totalWriteQueries++;
                    existingSourceIds.add(sourceId);
                }

                // Serialize JSON fields
                const defsJson = JSON.stringify(e.definitions || []);
                const etymJson = e.etymology_chain ? JSON.stringify(e.etymology_chain) : null;
                const exJson = JSON.stringify(e.usage_examples || []);
                const usageNotesJson = e.usage_notes ? (typeof e.usage_notes === 'object' ? JSON.stringify(e.usage_notes) : String(e.usage_notes)) : null;
                const zokkMorphJson = e.zokk_morphology ? (typeof e.zokk_morphology === 'object' ? JSON.stringify(e.zokk_morphology) : String(e.zokk_morphology)) : null;
                const zokkClass = e.zokk_class || e.zokk_morphology?.class_type || e.zokk_morphology?.zokk_class || null;
                const rawZokkHybrid = e.zokk_is_hybrid !== undefined ? e.zokk_is_hybrid : e.zokk_morphology?.is_hybrid;
                const zokkIsHybrid = rawZokkHybrid === null || rawZokkHybrid === undefined ? null : (rawZokkHybrid ? 1 : 0);
                const zokkAgentiveSuffix = e.zokk_agentive_suffix || e.zokk_morphology?.agentive_suffix || e.zokk_morphology?.zokk_agentive_suffix || null;

                const filterByCols = (record, tableCols) => {
                    if (!tableCols || tableCols.size === 0) return record;
                    const out = {};
                    for (const [k, v] of Object.entries(record)) {
                        if (tableCols.has(k)) out[k] = v;
                    }
                    return out;
                };

                const runUpsert = async (tableName, conflictCol, record, tableCols, withUpdatedAt = false) => {
                    const filtered = filterByCols(record, tableCols);
                    const cols = Object.keys(filtered);
                    const vals = cols.map(c => filtered[c]);
                    const hasUpdatedAt = withUpdatedAt && (!tableCols || tableCols.size === 0 || tableCols.has('updated_at'));
                    const insertCols = hasUpdatedAt ? [...cols, 'updated_at'] : cols;
                    const insertPlaceholders = hasUpdatedAt
                        ? [...cols.map(() => '?'), "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')"]
                        : cols.map(() => '?');
                    const updateAssignments = cols
                        .filter(c => c !== conflictCol)
                        .map(c => `${c} = excluded.${c}`);
                    if (hasUpdatedAt) updateAssignments.push('updated_at = excluded.updated_at');

                    await tx.execute({
                        sql: `INSERT INTO ${tableName} (${insertCols.join(', ')})
                              VALUES (${insertPlaceholders.join(', ')})
                              ON CONFLICT(${conflictCol}) DO UPDATE SET ${updateAssignments.join(', ')}`,
                        args: vals,
                    });
                    totalWriteQueries++;
                };

                // 1. Upsert entries table
                await runUpsert('entries', 'id', {
                    id: entryId,
                    headword: e.headword,
                    pos: item.pos,
                    gender,
                    root_consonants: e.root_consonants || null,
                    stem: e.stem || null,
                    cv_pattern: e.cv_pattern || null,
                    morph_pattern: e.morph_pattern || null,
                    zokk_morphology: zokkMorphJson,
                    zokk_class: zokkClass,
                    zokk_is_hybrid: zokkIsHybrid,
                    zokk_agentive_suffix: zokkAgentiveSuffix,
                    is_loanword: e.is_loanword ? 1 : 0,
                    is_inflectable: e.is_inflectable ? 1 : 0,
                    source_language: e.source_language || null,
                    source_id: sourceId,
                    source_citation: e.source_citation || null,
                    source_title: e.source_title || null,
                    source_year: e.source_year ? String(e.source_year) : null,
                    source_page: e.source_page || null,
                    source_publisher: e.source_publisher || null,
                    etymology_chain: etymJson,
                    etymology_notes: e.etymology_notes || null,
                    usage_notes: usageNotesJson,
                    definitions: defsJson,
                    usage_examples: exJson,
                }, entryCols, true);

                // 1b. Sync Phonetics (if present)
                if (phoneticsCols.size > 0 && Array.isArray(e.phonetics)) {
                    await tx.execute({ sql: "DELETE FROM phonetics WHERE entry_id = ?", args: [entryId] });
                    totalWriteQueries++;

                    for (let idx = 0; idx < e.phonetics.length; idx++) {
                        const ph = e.phonetics[idx];
                        if (!ph?.ipa) continue;
                        const phId = `ph_${entryId}::${idx}`;
                        await tx.execute({
                            sql: `INSERT INTO phonetics (id, entry_id, ipa, dialect, notes) VALUES (?, ?, ?, ?, ?)`,
                            args: [phId, entryId, ph.ipa, ph.dialect || 'Standard', ph.notes || null]
                        });
                        totalWriteQueries++;
                    }
                }

                // 1c. Sync Stems table (for Romance/Hybrid zokk entries)
                const stemString = String(e.stem || e.zokk_morphology?.stem_string || '').trim();
                if (stemsCols.size > 0 && stemString && zokkClass) {
                    await runUpsert('stems', 'stem_string', {
                        stem_string: stemString,
                        class_type: zokkClass,
                        is_hybrid: zokkIsHybrid ? 1 : 0,
                        root: e.root_consonants || e.zokk_morphology?.root || null,
                        agentive_suffix: zokkAgentiveSuffix,
                    }, stemsCols, true);
                }

                // 2. Sync Alternative Forms (if present, or full replace for time_calendar)
                if (Array.isArray(e.alternative_forms) && (e.alternative_forms.length > 0 || e._sourceCategory === 'time_calendar')) {
                    await tx.execute({ sql: "DELETE FROM alternative_forms WHERE entry_id = ?", args: [entryId] });
                    totalWriteQueries++;

                    for (let idx = 0; idx < e.alternative_forms.length; idx++) {
                        const alt = e.alternative_forms[idx];
                        const altHeadword = typeof alt === 'object' ? alt.headword : String(alt);
                        const altType = typeof alt === 'object' ? (alt.type || 'orthographic') : 'orthographic';
                        const altNotes = typeof alt === 'object' ? (alt.notes || null) : null;
                        let targetEntryId = typeof alt === 'object' ? (alt.target_entry_id || (alt.has_lemma_entry && alt.id && !alt.id.startsWith('alt_') ? alt.id : null)) : null;

                        if (targetEntryId && !existingById.has(targetEntryId) && !allEntryIds.has(targetEntryId)) {
                            targetEntryId = null;
                        }

                        const altId = `alt_${entryId}::${targetEntryId || idx}`;
                        await tx.execute({
                            sql: `INSERT INTO alternative_forms (id, entry_id, headword, type, notes, target_entry_id, sort_order)
                                  VALUES (?, ?, ?, ?, ?, ?, ?)
                                  ON CONFLICT(id) DO UPDATE SET headword = excluded.headword, type = excluded.type, notes = excluded.notes, target_entry_id = excluded.target_entry_id, sort_order = excluded.sort_order`,
                            args: [altId, entryId, altHeadword, altType, altNotes, targetEntryId, idx]
                        });
                        totalWriteQueries++;
                    }
                }

                // 2b. Sync Tags (tags + entry_tags)
                if (Array.isArray(e.tags)) {
                    await tx.execute({ sql: "DELETE FROM entry_tags WHERE entry_id = ?", args: [entryId] });
                    totalWriteQueries++;

                    for (const rawTag of e.tags) {
                        const tagName = String(rawTag || '').trim();
                        if (!tagName) continue;
                        const tagId = tagName.toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
                        if (!tagId) continue;

                        await tx.execute({
                            sql: "INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)",
                            args: [tagId, tagName]
                        });
                        await tx.execute({
                            sql: "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
                            args: [entryId, tagId]
                        });
                        totalWriteQueries += 2;
                    }
                }

                // 3. Queue Relationships to sync after all entry batches are upserted
                if (Array.isArray(e.related_entries) && (e.related_entries.length > 0 || e._sourceCategory === 'time_calendar')) {
                    allRelationships.push({ entryId, related_entries: e.related_entries });
                }

                // 4. Sync Numeral Morphology (if pos is numeral or numeral fields exist)
                const isNumeral = item.pos === 'numeral' || e.pos === 'numeral' || !!e.numeral_type;
                if (isNumeral) {
                    const nm = e.numeral_morphology || {};
                    const numType = e.numeral_type || nm.numeral_type || 'cardinal';
                    const attrShort = e.form_attributive_short ?? nm.form_attributive_short ?? null;
                    const attrShortPattern = e.form_attributive_short_pattern ?? nm.form_attributive_short_pattern ?? null;
                    const attrLong = e.form_attributive_long ?? nm.form_attributive_long ?? null;
                    const ordForm = e.ordinal_form ?? e.numeral_ordinal ?? nm.ordinal_form ?? null;
                    const advForm = e.adverbial_form ?? e.numeral_adverbial ?? nm.adverbial_form ?? null;
                    const fracForm = e.fractional_form ?? e.numeral_fractional ?? nm.fractional_form ?? null;
                    const multForm = e.multiplier_form ?? e.numeral_multiplier ?? nm.multiplier_form ?? null;
                    const distForm = e.distributive_form ?? e.numeral_distributive ?? nm.distributive_form ?? null;
                    const formPluralPattern = e.form_plural_pattern ?? nm.form_plural_pattern ?? null;
                    const vowelSetSg = e.vowel_set_sg ?? nm.vowel_set_sg ?? null;
                    const vowelSetPl = e.vowel_set_pl ?? nm.vowel_set_pl ?? null;
                    const vowelSetOpp = e.vowel_set_opp ?? nm.vowel_set_opp ?? null;
                    const vowelSetDual = e.vowel_set_dual ?? nm.vowel_set_dual ?? null;
                    const pluralForms = e.plural_forms ?? nm.plural_forms ?? null;
                    const pluralFormsJson = pluralForms ? (typeof pluralForms === 'object' ? JSON.stringify(pluralForms) : String(pluralForms)) : null;
                    const femForm = e.feminine_form ?? nm.feminine_form ?? e.form_fem ?? null;
                    const mascForm = e.masculine_form ?? nm.masculine_form ?? e.form_masc ?? null;

                    await tx.execute({
                        sql: `INSERT INTO numeral_morphology (
                            entry_id, numeral_type, form_attributive_short, form_attributive_short_pattern,
                            form_attributive_long, ordinal_form, adverbial_form,
                            fractional_form, multiplier_form, distributive_form,
                            form_plural_pattern, vowel_set_sg, vowel_set_pl, vowel_set_opp, vowel_set_dual,
                            plural_forms, feminine_form, masculine_form, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
                        ON CONFLICT(entry_id) DO UPDATE SET
                            numeral_type = excluded.numeral_type,
                            form_attributive_short = excluded.form_attributive_short,
                            form_attributive_short_pattern = excluded.form_attributive_short_pattern,
                            form_attributive_long = excluded.form_attributive_long,
                            ordinal_form = excluded.ordinal_form,
                            adverbial_form = excluded.adverbial_form,
                            fractional_form = excluded.fractional_form,
                            multiplier_form = excluded.multiplier_form,
                            distributive_form = excluded.distributive_form,
                            form_plural_pattern = excluded.form_plural_pattern,
                            vowel_set_sg = excluded.vowel_set_sg,
                            vowel_set_pl = excluded.vowel_set_pl,
                            vowel_set_opp = excluded.vowel_set_opp,
                            vowel_set_dual = excluded.vowel_set_dual,
                            plural_forms = excluded.plural_forms,
                            feminine_form = excluded.feminine_form,
                            masculine_form = excluded.masculine_form,
                            updated_at = excluded.updated_at`,
                        args: [
                            entryId, numType, attrShort, attrShortPattern,
                            attrLong, ordForm, advForm,
                            fracForm, multForm, distForm,
                            formPluralPattern, vowelSetSg, vowelSetPl, vowelSetOpp, vowelSetDual,
                            pluralFormsJson, femForm, mascForm
                        ]
                    });
                    await tx.execute({
                        sql: `UPDATE entries SET
                            numeral_type = ?,
                            form_attributive_short = ?,
                            form_attributive_long = ?,
                            numeral_ordinal = ?,
                            numeral_adverbial = ?,
                            numeral_fractional = ?,
                            numeral_multiplier = ?,
                            numeral_distributive = ?
                        WHERE id = ?`,
                        args: [
                            numType, attrShort, attrLong, ordForm, advForm,
                            fracForm, multForm, distForm, entryId
                        ]
                    });
                    totalWriteQueries++;
                }

                // 5. Sync Verb Morphology (if pos is verb and verb_morphology exists)
                if ((item.pos === 'verb' || e.pos === 'verb') && e.verb_morphology) {
                    const vm = e.verb_morphology;
                    await runUpsert('verb_morphology', 'entry_id', {
                        entry_id: entryId,
                        form: vm.form || 'I',
                        class: vm.class || vm.strength || 'strong',
                        weak_class: vm.weak_class || null,
                        transitivity: vm.transitivity || null,
                        perfective_3sgm: vm.perfective_3sgm || vm.perfective_3sg_m || e.headword,
                        imperfective_3sgm: vm.imperfective_3sgm || vm.imperfective_3sg_m || null,
                        active_participle: vm.active_participle || null,
                        passive_participle: vm.passive_participle || null,
                        verbal_noun: vm.verbal_noun || null,
                        vowel_set_perf: vm.vowel_set_perf || null,
                        vowel_set_impf: vm.vowel_set_impf || null,
                        vowel_set_impv: vm.vowel_set_impv || null,
                        is_imala_blocked: vm.is_imala_blocked ? 1 : (e.is_imala_blocked ? 1 : 0),
                    }, verbCols, true);
                }

                // 6. Sync Noun Morphology (if pos is noun and noun_morphology exists)
                if ((item.pos === 'noun' || e.pos === 'noun') && e.noun_morphology) {
                    const nm = e.noun_morphology;
                    const pluralFormsJson = nm.plural_forms ? (typeof nm.plural_forms === 'object' ? JSON.stringify(nm.plural_forms) : String(nm.plural_forms)) : null;
                    await runUpsert('noun_morphology', 'entry_id', {
                        entry_id: entryId,
                        gender: nm.gender || gender,
                        noun_type: nm.noun_type || null,
                        singular_form: nm.singular_form || e.headword,
                        dual_form: nm.dual_form || null,
                        plural_forms: pluralFormsJson,
                        feminine_form: nm.feminine_form || null,
                        masculine_form: nm.masculine_form || null,
                        is_collective: nm.is_collective ? 1 : 0,
                        is_singulative: nm.is_singulative ? 1 : 0,
                        vowel_set_sg: nm.vowel_set_sg || null,
                        vowel_set_pl: nm.vowel_set_pl || null,
                        form_plural_pattern: nm.form_plural_pattern || null,
                        morph_pattern: nm.morph_pattern || null,
                    }, nounCols, true);
                }

                // 7. Sync Adjective Morphology (if pos is adjective and adjective_morphology exists)
                if ((item.pos === 'adjective' || e.pos === 'adjective') && e.adjective_morphology) {
                    const am = e.adjective_morphology;
                    const rawPlural = am.plural_form ?? e.plural_forms ?? am.plural ?? null;
                    let pluralFormStr = null;
                    if (Array.isArray(rawPlural)) {
                        const normalizedRows = rawPlural.map(row =>
                            typeof row === 'object' && row !== null
                                ? { form: row.form, pattern: row.pattern ?? am.form_plural_pattern ?? null }
                                : { form: String(row), pattern: am.form_plural_pattern ?? null }
                        );
                        pluralFormStr = JSON.stringify(normalizedRows);
                    } else if (rawPlural && typeof rawPlural === 'object') {
                        pluralFormStr = JSON.stringify(rawPlural);
                    } else if (rawPlural) {
                        pluralFormStr = String(rawPlural);
                    }

                    const hasElativeVal = am.has_elative !== undefined
                        ? (am.has_elative ? 1 : 0)
                        : (am.elative_form ? 1 : 0);
                    const isInflectableVal = am.is_inflectable !== undefined
                        ? (am.is_inflectable ? 1 : 0)
                        : (e.is_inflectable ? 1 : 0);

                    await runUpsert('adj_morphology', 'entry_id', {
                        entry_id: entryId,
                        gender: am.gender || gender,
                        masculine_form: am.masculine_form || e.headword,
                        feminine_form: am.feminine_form || null,
                        plural_form: pluralFormStr,
                        form_masc_pattern: am.form_masc_pattern || null,
                        form_fem_pattern: am.form_fem_pattern || null,
                        form_plural_pattern: am.form_plural_pattern || null,
                        elative_form: am.elative_form || null,
                        elative_pattern: am.elative_pattern || null,
                        has_elative: hasElativeVal,
                        is_inflectable: isInflectableVal,
                        vowel_set_sg: am.vowel_set_sg || null,
                        vowel_set_pl: am.vowel_set_pl || null,
                        pattern: am.pattern || am.morph_pattern || null,
                    }, adjCols, true);
                }

                appliedCount++;
                if (isVerbose) {
                    console.log(`   ✓ [${item.action}] ${e.headword} (${item.pos}) synced.`);
                }
            }

            await tx.commit();
            console.log(`   Batch ${Math.floor(b / BATCH_SIZE) + 1}/${Math.ceil(plan.length / BATCH_SIZE)} committed: ${batch.length} entries.`);
        } catch (err) {
            await tx.rollback();
            console.error(`❌ Batch failed at index ${b}:`, err.message);
            throw err;
        }
    }

    // Sync all queued relationships after all entries across all batches exist
    if (allRelationships.length > 0) {
        const relTx = await client.transaction('write');
        try {
            for (const { entryId, related_entries } of allRelationships) {
                await relTx.execute({ sql: "DELETE FROM entry_relationships WHERE entry_id = ?", args: [entryId] });
                totalWriteQueries++;

                let relOrder = 0;
                for (const rel of related_entries) {
                    const targetId = typeof rel === 'string' ? rel : (rel?.target_entry_id || rel?.id || rel?.target_id);
                    const relTypeRaw = typeof rel === 'object' ? (rel?.relationship_type || rel?.type || 'related') : 'related';
                    const relType = ['synonym', 'antonym', 'related'].includes(relTypeRaw) ? relTypeRaw : 'related';
                    if (targetId && (existingById.has(targetId) || allEntryIds.has(targetId))) {
                        const relId = `rel_${entryId}_${targetId}_${relType}`;
                        await relTx.execute({
                            sql: `INSERT OR REPLACE INTO entry_relationships (id, entry_id, target_entry_id, relationship_type, sort_order) VALUES (?, ?, ?, ?, ?)`,
                            args: [relId, entryId, targetId, relType, relOrder++]
                        });
                        totalWriteQueries++;
                    }
                }
            }
            await relTx.commit();
            console.log(`   ✓ Synced relationships for ${allRelationships.length} entries.`);
        } catch (err) {
            await relTx.rollback();
            console.error(`❌ Relationship sync failed:`, err.message);
            throw err;
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Success! Pushed ${appliedCount} entries in ${elapsed}s.`);
    console.log(`📊 Total Read Queries: ${totalReadQueries} (~${totalRowsRead} rows read)`);
    console.log(`📊 Total Write Queries: ${totalWriteQueries}`);
}

run().catch(err => {
    console.error('Fatal error in push script:', err);
    process.exit(1);
});
