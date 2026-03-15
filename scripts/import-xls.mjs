/**
 * Il-Miġma' — XLS Import Script
 * --------------------------------
 * Reads roots.xls and broken_plural.xlsx and imports them into Turso.
 *
 * Usage:
 *   node scripts/import-xls.mjs --dry-run      # preview only, no DB writes
 *   node scripts/import-xls.mjs --execute       # actually insert into Turso
 *   node scripts/import-xls.mjs --execute --roots-only
 *   node scripts/import-xls.mjs --execute --nouns-only
 */

import { createRequire } from 'module';
import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// xlsx is CommonJS — must be loaded via require() in an ESM context
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ── Setup ─────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

config({ path: resolve(ROOT, '.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');
const ROOTS_ONLY = process.argv.includes('--roots-only');
const NOUNS_ONLY = process.argv.includes('--nouns-only');

if (!DRY_RUN && !EXECUTE) {
    console.error('❌  Please pass --dry-run or --execute');
    process.exit(1);
}

console.log(`\n🔧  Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'EXECUTE (writing to Turso)'}\n`);

// ── Turso client ──────────────────────────────────────────────────────────────

const db = createClient({
    url: process.env.VITE_TURSO_URL,
    authToken: process.env.VITE_TURSO_AUTH_TOKEN,
});

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function uid() {
    return Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 6);
}

function now() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Normalise a root string → "k-t-b" format */
function normaliseRoot(raw) {
    if (!raw) return null;
    // Accept "ktb", "k-t-b", "k t b", "k,t,b"
    const chars = String(raw).trim().replace(/[-\s,]+/g, '').split('');
    if (chars.length < 2) return null;
    return chars.join('-');
}

/** Convert roman numeral column header → verb form label */
const FORM_LABEL = {
    'I': 'I', 'II': 'II', 'III': 'III', 'IV': 'IV',
    'V': 'V', 'VI': 'VI', 'VII': 'VII', 'VIII': 'VIII',
    'IX': 'IX', 'X': 'X',
};

const ALLOWED_NOUN_GENDERS = new Set(['masculine', 'feminine', 'neutral']);

/**
 * Derive noun_gender from the source gender field.
 * Unknown/invalid values are set to null for later review instead of being forced.
 */
function parseGender(raw) {
    const g = String(raw ?? '').trim().toLowerCase();
    if (!g) return null;
    if (g.startsWith('f')) return 'feminine';
    if (g.startsWith('m')) return 'masculine';
    if (g.startsWith('n')) return 'neutral';
    return null;
}

/** Best guess at verb_class from root consonants */
function guessVerbClass(consonants) {
    if (!consonants) return 'strong';
    const cs = consonants.split('-');
    if (cs[0] === cs[1] || cs[1] === cs[2]) return 'doubled';
    const weak = ['għ', 'j', 'w', 'a', 'e', 'i', 'o', 'u'];
    if (weak.some(w => cs.includes(w))) return 'weak';
    if (cs.length >= 4) return 'quadrilateral';
    return 'strong';
}

// ── Run schema first (idempotent) ─────────────────────────────────────────────

async function ensureSchema() {
    const schemaPath = resolve(ROOT, 'db', 'schema.sql');
    if (!existsSync(schemaPath)) {
        console.warn('⚠  db/schema.sql not found — skipping schema init');
        return;
    }
    const sql = readFileSync(schemaPath, 'utf8');
    // Split on semicolons (naive but good enough for our schema)
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('PRAGMA'));

    console.log(`📐  Running schema (${statements.length} statements)…`);
    if (!DRY_RUN) {
        for (const stmt of statements) {
            try { await db.execute(stmt + ';'); } catch { /* already exists */ }
        }
    }
    console.log(`    ✅  Schema ready\n`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 1 — roots.xls
// Columns: root | I | II | III | V | VI | VII | VIII | IX | X
// ══════════════════════════════════════════════════════════════════════════════

async function importRoots() {
    const filePath = resolve(ROOT, 'roots.xls');
    if (!existsSync(filePath)) {
        console.error('❌  roots.xls not found in project root');
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`📖  roots.xls  → ${rows.length} rows`);
    if (rows.length > 0) console.log('DEBUG: First row data:', JSON.stringify(rows[0], null, 2));
    if (rows.length > 1) console.log('DEBUG: Second row data:', JSON.stringify(rows[1], null, 2));
    if (rows.length > 2) console.log('DEBUG: Third row data:', JSON.stringify(rows[2], null, 2));

    let rootsInserted = 0;
    let verbsInserted = 0;
    let skipped = 0;

    for (const row of rows) {
        const consonants = normaliseRoot(row['root'] ?? row['Root'] ?? row['ROOT']);
        if (!consonants) { skipped++; continue; }

        const consonantArray = JSON.stringify(consonants.split('-'));
        const rootId = uid();

        if (DRY_RUN) {
            console.log(`  ROOT  ${consonants}  (${consonantArray})`);
        } else {
            try {
                await db.execute({
                    sql: `INSERT OR IGNORE INTO roots (id, consonants, consonant_array, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
                    args: [rootId, consonants, consonantArray, now(), now()],
                });
                rootsInserted++;
            } catch (e) {
                console.warn(`  ⚠ root "${consonants}": ${e.message}`);
                skipped++;
                continue;
            }
        }

        // For each Roman numeral column that has a value, create a verb entry
        for (const [form, label] of Object.entries(FORM_LABEL)) {
            const derivedVerb = String(row[form] ?? row[form.toLowerCase()] ?? '').trim();
            if (!derivedVerb) continue;

            const verbId = uid();
            const verbClass = guessVerbClass(consonants);

            if (DRY_RUN) {
                console.log(`     VERB  ${derivedVerb}  (Forma ${label}, class=${verbClass})`);
            } else {
                try {
                    // Upsert verb entry
                    await db.execute({
                        sql: `INSERT OR IGNORE INTO entries
                    (id, headword, pos, verb_class, verb_perfective_3sgm, created_at, updated_at)
                  VALUES (?, ?, 'verb', ?, ?, ?, ?)`,
                        args: [verbId, derivedVerb, verbClass, derivedVerb, now(), now()],
                    });
                    verbsInserted++;

                    // Seed a basic definition placeholder so FTS works
                    await db.execute({
                        sql: `INSERT OR IGNORE INTO definitions
                    (id, entry_id, sense_number, text_mt, text_en, sort_order)
                  VALUES (?, ?, 1, ?, ?, 0)`,
                        args: [uid(), verbId, derivedVerb, `[Forma ${label} minn ${consonants}]`],
                    });
                } catch (e) {
                    console.warn(`  ⚠ verb "${derivedVerb}": ${e.message}`);
                }
            }
        }
    }

    console.log(`  ✅  Roots: ${rootsInserted} inserted, ${verbsInserted} verb entries, ${skipped} skipped\n`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 2 — broken_plural.xlsx
// Columns: singular (orthographic) | plural (orthographic)
//          singular (transcribed)  | plural (transcribed)
//          gender | gloss | type | CV pattern
// ══════════════════════════════════════════════════════════════════════════════

async function importBrokenPlurals() {
    const filePath = resolve(ROOT, 'broken_plural.xlsx');
    if (!existsSync(filePath)) {
        console.error('❌  broken_plural.xlsx not found in project root');
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`📖  broken_plural.xlsx → ${rows.length} rows`);
    if (rows.length > 0) console.log('DEBUG (Nouns): First row keys:', Object.keys(rows[0]));

    let inserted = 0;
    let phoneticsInserted = 0;
    let patternsInserted = 0;
    let skipped = 0;

    // Cache of cv_notation → pattern_id to avoid duplicate pattern rows
    const patternCache = {};

    for (const row of rows) {
        // ── Column normalisation (handles slight header variations) ──────────────
        const singular = String(row['singular (orthographic)'] ?? row['singular'] ?? row['Singular'] ?? '').trim();
        const plural = String(row['plural (orthographic)'] ?? row['plural'] ?? row['Plural'] ?? '').trim();
        const singTrans = String(row['singular (transcribed)'] ?? row['singular_transcribed'] ?? '').trim();
        const plurTrans = String(row['plural (transcribed)'] ?? row['plural_transcribed'] ?? '').trim();
        const gender = parseGender(row['gender'] ?? row['Gender'] ?? '');
        const gloss = String(row['gloss'] ?? row['Gloss'] ?? row['meaning'] ?? '').trim();
        const cvPattern = String(row['CV pattern'] ?? row['cv_pattern'] ?? row['CV Pattern'] ?? '').trim();
        const typeField = String(row['type'] ?? row['Type'] ?? '').trim();

        if (!singular) { skipped++; continue; }

        // ── Pattern upsert ────────────────────────────────────────────────────────
        let patternId = null;
        if (cvPattern) {
            if (patternCache[cvPattern]) {
                patternId = patternCache[cvPattern];
            } else {
                patternId = uid();
                patternCache[cvPattern] = patternId;
                if (DRY_RUN) {
                    console.log(`  PATTERN  ${cvPattern}`);
                } else {
                    try {
                        await db.execute({
                            sql: `INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation, example_word, created_at)
                    VALUES (?, ?, ?, ?, ?)`,
                            args: [patternId, cvPattern, cvPattern, singular, now()],
                        });
                        patternsInserted++;
                    } catch { /* exists */ }
                    // Re-fetch id in case it already existed
                    const res = await db.execute({
                        sql: 'SELECT id FROM patterns WHERE cv_notation = ?',
                        args: [cvPattern],
                    });
                    if (res.rows[0]) patternId = res.rows[0].id;
                }
            }
        }

        // ── Entry insert ──────────────────────────────────────────────────────────
        const entryId = uid();
        const pluralFormsJson = plural ? JSON.stringify([plural]) : '[]';

        if (DRY_RUN) {
            console.log(`  NOUN  ${singular}  (pl: ${plural || '—'}, gender: ${gender ?? 'NULL/review'}, gloss: ${gloss || '—'})`);
            if (singTrans) console.log(`        IPA: /${singTrans}/ → /${plurTrans}/`);
        } else {
            try {
                const canonicalGender = ALLOWED_NOUN_GENDERS.has(gender) ? gender : null;
                await db.execute({
                    sql: `INSERT OR IGNORE INTO entries
                  (id, headword, pos, noun_gender, noun_singular, noun_plural_forms, created_at, updated_at)
                VALUES (?, ?, 'noun', ?, ?, ?, ?, ?)`,
                    args: [entryId, singular, canonicalGender, singular, pluralFormsJson, now(), now()],
                });
                inserted++;
            } catch (e) {
                console.warn(`  ⚠ entry "${singular}": ${e.message}`);
                skipped++;
                continue;
            }

            // ── Definition ────────────────────────────────────────────────────────
            if (gloss) {
                await db.execute({
                    sql: `INSERT OR IGNORE INTO definitions
                  (id, entry_id, sense_number, text_mt, text_en, sort_order)
                VALUES (?, ?, 1, ?, ?, 0)`,
                    args: [uid(), entryId, gloss, gloss],
                });
            }

            // ── Phonetics (singular) ──────────────────────────────────────────────
            if (singTrans) {
                await db.execute({
                    sql: `INSERT OR IGNORE INTO phonetics (id, entry_id, ipa, dialect, notes)
                VALUES (?, ?, ?, 'Standard', ?)`,
                    args: [uid(), entryId, singTrans, typeField || null],
                });
                phoneticsInserted++;
            }

            // ── Attestation: auto-seed with Aquilina weight since these are from data ──
            const attnId = uid();
            await db.execute({
                sql: `INSERT OR IGNORE INTO attestation_reliability (id, entry_id, reliability_index, computed_at)
              VALUES (?, ?, ?, ?)`,
                args: [attnId, entryId, 70.0, now()],
            });
            await db.execute({
                sql: `INSERT OR IGNORE INTO attestation_scores (id, attestation_id, source_id, attested, notes)
              VALUES (?, ?, 'src-crowd', 1, ?)`,
                args: [uid(), attnId, `Imported from broken_plural.xlsx (type: ${typeField || 'unknown'})`],
            });
        }
    }

    console.log(`  ✅  Noun entries: ${inserted} inserted, ${phoneticsInserted} phonetics, ${patternsInserted} patterns, ${skipped} skipped\n`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 3 — Rebuild FTS index
// ══════════════════════════════════════════════════════════════════════════════

async function rebuildFTS() {
    if (DRY_RUN) { console.log('📝  [dry-run] Would rebuild entries_fts\n'); return; }
    console.log('🔍  Rebuilding full-text search index…');
    try {
        await db.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`);
        console.log('    ✅  FTS rebuilt\n');
    } catch (e) {
        console.warn(`    ⚠️  FTS rebuild: ${e.message}\n`);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('═'.repeat(60));
    console.log(' Il-Miġma\'  XLS Importer');
    console.log('═'.repeat(60));
    console.log();

    try {
        await ensureSchema();

        if (!NOUNS_ONLY) await importRoots();
        if (!ROOTS_ONLY) await importBrokenPlurals();

        await rebuildFTS();

        console.log('🎉  Import complete!');
        if (DRY_RUN) {
            console.log('\n    Run with --execute to write to Turso.');
        }
    } catch (e) {
        console.error('\n❌  Fatal error:', e.message);
        console.error(e.stack);
        process.exit(1);
    }
}

main();
