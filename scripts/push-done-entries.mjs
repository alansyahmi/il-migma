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

    // ── STEP 1: Verify live schema in 1 query ──────────────────────────────────
    console.log('\n🔎 Step 1: Introspecting live table constraints (1 single query)...');
    const schemaRes = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='entries'");
    totalReadQueries++;
    totalRowsRead += schemaRes.rows.length;
    const tableSql = String(schemaRes.rows[0]?.sql || '');
    const allowsCommonGender = tableSql.includes('common');
    console.log(`   ✓ entries table schema verified. Common gender supported: ${allowsCommonGender ? 'YES' : 'NO (auto-mapping to neutral)'}`);

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
                const targetId = typeof r === 'string' ? r : (r?.id || r?.target_id);
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

                // 1. Upsert entries table
                await tx.execute({
                    sql: `INSERT INTO entries (
                        id, headword, pos, gender, root_consonants, stem,
                        is_loanword, is_inflectable, source_language, source_id,
                        source_citation, source_title, source_year, source_page, source_publisher,
                        etymology_chain, etymology_notes, usage_notes, definitions, usage_examples,
                        updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                    ) ON CONFLICT(id) DO UPDATE SET
                        headword = excluded.headword,
                        pos = excluded.pos,
                        gender = excluded.gender,
                        root_consonants = excluded.root_consonants,
                        stem = excluded.stem,
                        is_loanword = excluded.is_loanword,
                        is_inflectable = excluded.is_inflectable,
                        source_language = excluded.source_language,
                        source_id = excluded.source_id,
                        source_citation = excluded.source_citation,
                        source_title = excluded.source_title,
                        source_year = excluded.source_year,
                        source_page = excluded.source_page,
                        source_publisher = excluded.source_publisher,
                        etymology_chain = excluded.etymology_chain,
                        etymology_notes = excluded.etymology_notes,
                        usage_notes = excluded.usage_notes,
                        definitions = excluded.definitions,
                        usage_examples = excluded.usage_examples,
                        updated_at = excluded.updated_at`,
                    args: [
                        entryId, e.headword, item.pos, gender, e.root_consonants || null, e.stem || null,
                        e.is_loanword ? 1 : 0, e.is_inflectable ? 1 : 0, e.source_language || null, sourceId,
                        e.source_citation || null, e.source_title || null, e.source_year ? String(e.source_year) : null, e.source_page || null, e.source_publisher || null,
                        etymJson, e.etymology_notes || null, usageNotesJson, defsJson, exJson
                    ]
                });
                totalWriteQueries++;

                // 2. Sync Alternative Forms (if present)
                if (Array.isArray(e.alternative_forms) && e.alternative_forms.length > 0) {
                    await tx.execute({ sql: "DELETE FROM alternative_forms WHERE entry_id = ?", args: [entryId] });
                    totalWriteQueries++;

                    for (let idx = 0; idx < e.alternative_forms.length; idx++) {
                        const alt = e.alternative_forms[idx];
                        const altHeadword = typeof alt === 'object' ? alt.headword : String(alt);
                        const altType = typeof alt === 'object' ? (alt.type || 'orthographic') : 'orthographic';
                        const altNotes = typeof alt === 'object' ? (alt.notes || null) : null;
                        let targetEntryId = typeof alt === 'object' ? (alt.target_entry_id || (alt.has_lemma_entry && alt.id && !alt.id.startsWith('alt_') ? alt.id : null)) : null;

                        if (targetEntryId && !existingById.has(targetEntryId)) {
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

                // 3. Sync Relationships (if present)
                if (Array.isArray(e.related_entries) && e.related_entries.length > 0) {
                    await tx.execute({ sql: "DELETE FROM entry_relationships WHERE entry_id = ?", args: [entryId] });
                    totalWriteQueries++;

                    let relOrder = 0;
                    for (const rel of e.related_entries) {
                        const targetId = typeof rel === 'string' ? rel : (rel?.id || rel?.target_id);
                        if (targetId && existingById.has(targetId)) {
                            const relId = `rel_${entryId}_${targetId}_related`;
                            await tx.execute({
                                sql: `INSERT OR REPLACE INTO entry_relationships (id, entry_id, target_entry_id, relationship_type, sort_order) VALUES (?, ?, ?, ?, ?)`,
                                args: [relId, entryId, targetId, 'related', relOrder++]
                            });
                            totalWriteQueries++;
                        }
                    }
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

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Success! Pushed ${appliedCount} entries in ${elapsed}s.`);
    console.log(`📊 Total Read Queries: ${totalReadQueries} (~${totalRowsRead} rows read)`);
    console.log(`📊 Total Write Queries: ${totalWriteQueries}`);
}

run().catch(err => {
    console.error('Fatal error in push script:', err);
    process.exit(1);
});
