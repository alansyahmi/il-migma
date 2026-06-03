import { createClient } from '@libsql/client';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Sync against LOCAL database file
const db = createClient({
  url: 'file:local.db',
});

import { ensureNounMorphologyTable } from '../src/lib/nounMorphology.js';
import { ensureAdjMorphologyTable } from '../src/lib/adjMorphology.js';
import { ensureParticipleMorphologyTable } from '../src/lib/participleMorphology.js';
import { ensureVerbMorphologyTable } from '../src/lib/verbMorphology.js';

async function migrate() {
    console.log('Starting migration to POS sub-tables (LOCAL)...');

    console.log('Migrating Verbs...');
    await ensureVerbMorphologyTable(db, { backfill: true });
    
    console.log('Migrating Nouns...');
    await ensureNounMorphologyTable(db, { backfill: true });
    
    console.log('Migrating Adjectives...');
    await ensureAdjMorphologyTable(db, { backfill: true });
    
    console.log('Migrating Participles...');
    await ensureParticipleMorphologyTable(db, { backfill: true });

    console.log('Migration complete!');
    
    // Summary
    const counts = await Promise.all([
        db.execute('SELECT COUNT(*) as c FROM verb_morphology'),
        db.execute('SELECT COUNT(*) as c FROM noun_morphology'),
        db.execute('SELECT COUNT(*) as c FROM adj_morphology'),
        db.execute('SELECT COUNT(*) as c FROM participle_morphology'),
    ]).catch(() => [ {rows: [{c: 0}]}, {rows: [{c: 0}]}, {rows: [{c: 0}]}, {rows: [{c: 0}]} ]);

    console.log({
        verbs: counts[0]?.rows?.[0]?.c ?? 0,
        nouns: counts[1]?.rows?.[0]?.c ?? 0,
        adjectives: counts[2]?.rows?.[0]?.c ?? 0,
        participles: counts[3]?.rows?.[0]?.c ?? 0,
    });

    console.log('\nNow dropping legacy columns from entries table...');
    
    const columnsToDrop = [
        'gender', 'lemma_base', 'inflections_pl', 'form_fem', 'form_masc', 
        'dual_form', 'diminutive_form', 'elative_form', 'is_collective', 
        'is_singulative', 'participle_type', 'verb_form', 'verb_class', 
        'verb_weak_class', 'verb_transitivity', 'verb_perfective_3sgm', 
        'verb_imperfective_3sgm', 'verb_verbal_noun', 'verb_active_ptcp', 
        'verb_passive_ptcp', 'verb_vowel_perf', 'verb_vowel_impf', 
        'verb_vowel_impv', 'verb_type', 'vowel_set_sg', 'vowel_set_pl', 
        'vowel_set_opp', 'vowel_set_dual', 'lemma_pattern', 'form_fem_pattern', 
        'form_masc_pattern', 'form_plural_pattern', 'dual_pattern', 
        'diminutive_pattern', 'elative_pattern', 'numeral_type', 
        'form_attributive_short', 'form_attributive_long', 'form_opposite', 
        'zokk_morphology', 'morph_pattern', 'noun_type',
        'paucal_form', 'augmentative_form', 'paucal_pattern',
        'augmentative_pattern',
        'adj_masculine', 'adj_feminine', 'adj_plural', 'adj_elative',
        'adj_pattern', 'adj_gender'
    ];

    const tableInfo = await db.execute("PRAGMA table_info(entries)");
    const currentColumns = new Set(tableInfo.rows.map(r => r.name));

    for (const col of columnsToDrop) {
        if (currentColumns.has(col)) {
            console.log(`Dropping ${col}...`);
            try {
                await db.execute(`ALTER TABLE entries DROP COLUMN ${col}`);
            } catch (e) {
                console.error(`Failed to drop ${col}: ${e.message}`);
            }
        }
    }

    console.log('Cleanup complete!');
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
