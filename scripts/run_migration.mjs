#!/usr/bin/env node
/**
 * DB Migration Script - Unified Schema
 * Migrates entries table from POS-prefixed columns to unified columns.
 * 
 * Usage:
 *   node scripts/run_migration.mjs
 * 
 * Reads credentials from .dev.vars automatically.
 */

import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';

// Load .dev.vars (wrangler style)
function loadDotDevVars() {
    const p = '.dev.vars';
    if (!existsSync(p)) return;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.trim().match(/^([A-Z_]+)=(.+)$/);
        if (m) process.env[m[1]] = m[2].trim();
    }
}
loadDotDevVars();

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) { console.error('❌ TURSO_URL not set in .dev.vars'); process.exit(1); }

const client = createClient({ url, authToken });

async function getColumns() {
    const r = await client.execute('PRAGMA table_info(entries)');
    return r.rows.map(row => row.name);
}

async function main() {
    const cols = await getColumns();
    console.log('\n📋 Current columns:\n ', cols.join(', '), '\n');

    const expectedUnified = [
        'lemma_base', 'gender', 'inflections_pl', 'form_fem', 'form_masc',
        'dual_form', 'diminutive_form', 'elative_form', 'is_collective',
        'is_singulative', 'vowel_set_sg', 'vowel_set_pl', 'vowel_set_opp', 'vowel_set_dual'
    ];
    const missingUnified = expectedUnified.filter(c => !cols.includes(c));
    const hasOld = cols.includes('noun_singular');

    if (missingUnified.length === 0 && !hasOld) {
        console.log('✅ Database already has full unified schema. Nothing to do.');
        return;
    }

    if (missingUnified.length > 0 && !hasOld) {
        console.log(`🚀 Adding missing columns to existing unified schema: ${missingUnified.join(', ')}`);
        // We can use ALTER TABLE for this case to avoid table recreation if we just need to add columns
        for (const col of missingUnified) {
            await client.execute(`ALTER TABLE entries ADD COLUMN ${col} TEXT`);
            if (col.startsWith('is_')) {
                // If it's a boolean, we might want to default it
                // But for now they are all TEXT or handled in CREATE
            }
        }
        console.log('✅ Columns added.');
        return;
    }

    if (!hasOld && missingUnified.length === 0) {
        console.log('⚠️  Neither old nor new schema detected fully. Check manually.');
        return;
    }

    console.log('🚀 Migrating to unified schema...\n');

    // Step 1: Drop entries_new if it exists (leftover from failed migration)
    try {
        await client.execute('DROP TABLE IF EXISTS entries_new');
        console.log('  Dropped entries_new (cleanup)\n');
    } catch (e) { /* ignore */ }

    // Step 2: Create new table
    console.log('  Creating entries_new...');
    await client.execute(`CREATE TABLE entries_new (
        id                    TEXT PRIMARY KEY,
        headword              TEXT NOT NULL,
        pos                   TEXT NOT NULL,
        gender                TEXT,
        lemma_base            TEXT,
        inflections_pl        TEXT,
        form_fem              TEXT,
        form_masc             TEXT,
        dual_form             TEXT,
        diminutive_form       TEXT,
        elative_form          TEXT,
        is_collective         INTEGER NOT NULL DEFAULT 0,
        is_singulative        INTEGER NOT NULL DEFAULT 0,
        participle_type       TEXT,
        root_consonants       TEXT,
        cv_pattern            TEXT,
        morph_pattern         TEXT,
        verb_form             TEXT,
        root_pattern_form_id  TEXT REFERENCES root_pattern_forms(id),
        is_loanword           INTEGER NOT NULL DEFAULT 0,
        is_inflectable        INTEGER NOT NULL DEFAULT 1,
        source_language       TEXT,
        tags                  TEXT,
        sound_suffix          TEXT,
        vowel_set_sg          TEXT,
        vowel_set_pl          TEXT,
        vowel_set_opp         TEXT,
        vowel_set_dual        TEXT,
        verb_class            TEXT,
        verb_weak_class       TEXT,
        verb_transitivity     TEXT,
        verb_perfective_3sgm  TEXT,
        verb_imperfective_3sgm TEXT,
        verb_verbal_noun      TEXT,
        verb_active_ptcp      TEXT,
        verb_passive_ptcp     TEXT,
        verb_vowel_perf       TEXT,
        verb_vowel_impf       TEXT,
        verb_vowel_impv       TEXT,
        verb_type             TEXT,
        synonyms              TEXT,
        antonyms              TEXT,
        related_entries       TEXT,
        source_citation       TEXT,
        usage_example         TEXT,
        usage_example_en      TEXT,
        created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )`);
    console.log('  ✅ entries_new created\n');

    // Step 3: Migrate data — map old POS-prefixed → unified columns
    console.log('  Migrating data...');
    
    // Check which old columns exist (handle partial schemas gracefully)
    const hasCol = (c) => cols.includes(c);

    await client.execute(`INSERT INTO entries_new (
        id, headword, pos,
        gender,
        lemma_base,
        inflections_pl,
        form_fem,
        form_masc,
        dual_form,
        diminutive_form,
        elative_form,
        is_collective,
        is_singulative,
        participle_type, root_consonants, cv_pattern,
        morph_pattern,
        verb_form, root_pattern_form_id, is_loanword,
        is_inflectable,
        source_language, tags,
        sound_suffix,
        vowel_set_sg, vowel_set_pl, vowel_set_opp, vowel_set_dual,
        verb_class, verb_weak_class, verb_transitivity,
        verb_perfective_3sgm, verb_imperfective_3sgm,
        verb_verbal_noun, verb_active_ptcp, verb_passive_ptcp,
        verb_vowel_perf, verb_vowel_impf, verb_vowel_impv,
        verb_type,
        synonyms, antonyms, related_entries,
        source_citation, usage_example, usage_example_en,
        created_at, updated_at
    )
    SELECT
        id, headword, pos,
        COALESCE(${hasCol('adj_gender') ? 'adj_gender' : 'NULL'}, ${hasCol('noun_gender') ? 'noun_gender' : 'NULL'}, ${hasCol('participle_gender') ? 'participle_gender' : 'NULL'}),
        COALESCE(${hasCol('noun_singular') ? 'noun_singular' : 'NULL'}, ${hasCol('adj_masculine') ? 'adj_masculine' : 'NULL'}),
        COALESCE(${hasCol('noun_plural_forms') ? 'noun_plural_forms' : 'NULL'}, ${hasCol('adj_plural') ? 'adj_plural' : 'NULL'}),
        COALESCE(${hasCol('noun_feminine') ? 'noun_feminine' : 'NULL'}, ${hasCol('adj_feminine') ? 'adj_feminine' : 'NULL'}),
        ${hasCol('noun_masculine') ? 'noun_masculine' : 'NULL'},
        ${hasCol('noun_dual') ? 'noun_dual' : 'NULL'},
        ${hasCol('noun_diminutive') ? 'noun_diminutive' : 'NULL'},
        ${hasCol('adj_elative') ? 'adj_elative' : 'NULL'},
        ${hasCol('is_collective') ? 'COALESCE(is_collective, 0)' : '0'},
        ${hasCol('is_singulative') ? 'COALESCE(is_singulative, 0)' : '0'},
        participle_type, root_consonants, cv_pattern,
        COALESCE(${hasCol('plural_pattern') ? 'plural_pattern' : 'NULL'}, ${hasCol('adj_pattern') ? 'adj_pattern' : 'NULL'}),
        verb_form, root_pattern_form_id, COALESCE(is_loanword, 0),
        COALESCE(is_inflectable, 1),
        source_language, tags,
        ${hasCol('sound_suffix') ? 'sound_suffix' : 'NULL'},
        ${hasCol('vowel_set_sg') ? 'vowel_set_sg' : 'NULL'},
        ${hasCol('vowel_set_pl') ? 'vowel_set_pl' : 'NULL'},
        ${hasCol('vowel_set_opp') ? 'vowel_set_opp' : 'NULL'},
        ${hasCol('vowel_set_dual') ? 'vowel_set_dual' : 'NULL'},
        verb_class,
        ${hasCol('verb_weak_class') ? 'verb_weak_class' : 'NULL'},
        verb_transitivity,
        verb_perfective_3sgm, verb_imperfective_3sgm,
        verb_verbal_noun,
        ${hasCol('verb_active_ptcp') ? 'verb_active_ptcp' : 'NULL'},
        verb_passive_ptcp,
        verb_vowel_perf, verb_vowel_impf,
        ${hasCol('verb_vowel_impv') ? 'verb_vowel_impv' : 'NULL'},
        ${hasCol('verb_type') ? 'verb_type' : 'NULL'},
        ${hasCol('synonyms') ? 'synonyms' : 'NULL'},
        ${hasCol('antonyms') ? 'antonyms' : 'NULL'},
        ${hasCol('related_entries') ? 'related_entries' : 'NULL'},
        ${hasCol('source_citation') ? 'source_citation' : 'NULL'},
        ${hasCol('usage_example') ? 'usage_example' : 'NULL'},
        ${hasCol('usage_example_en') ? 'usage_example_en' : 'NULL'},
        created_at, updated_at
    FROM entries`);
    console.log('  ✅ Data migrated\n');

    // Step 4: Verify row count
    const oldCount = await client.execute('SELECT COUNT(*) as c FROM entries');
    const newCount = await client.execute('SELECT COUNT(*) as c FROM entries_new');
    console.log(`  Rows: old=${oldCount.rows[0].c}, new=${newCount.rows[0].c}`);
    
    if (Number(oldCount.rows[0].c) !== Number(newCount.rows[0].c)) {
        console.error('  ❌ Row count mismatch! Aborting — old table NOT dropped.');
        return;
    }

    // Step 5: Replace old table
    console.log('\n  Swapping tables...');
    await client.execute('DROP TABLE entries');
    await client.execute('ALTER TABLE entries_new RENAME TO entries');
    console.log('  ✅ entries table replaced\n');

    // Step 6: Recreate indices
    await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_headword ON entries(headword)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_entries_pos ON entries(pos)');
    console.log('  ✅ Indices recreated\n');

    // Final check
    const finalCols = await getColumns();
    console.log('✅ Migration complete!\n📋 New columns:\n ', finalCols.join(', '));
}

main().catch(e => {
    console.error('❌ Fatal:', e.message);
    process.exit(1);
});
