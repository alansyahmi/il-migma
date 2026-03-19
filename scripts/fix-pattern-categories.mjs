/**
 * scripts/fix-pattern-categories.mjs
 *
 * One-time cleanup to fix miscategorized rows in `pattern_applicability`.
 *
 * Problem:
 * During previous migrations, some rows with IDs like `patternId_broken_pattern_all`
 * were inserted with category='cv_wizen_pattern' instead of the correct category
 * encoded in the ID (e.g., 'broken_pattern').
 *
 * Fix strategy:
 * 1. Read all rows from `pattern_applicability`.
 * 2. Parse the composite ID to infer the intended category.
 * 3. Update the row's category column if it doesn't match.
 *
 * Usage:
 *   node scripts/fix-pattern-categories.mjs
 *   node scripts/fix-pattern-categories.mjs --commit     (to actually apply changes)
 */

import { createClient } from '@libsql/client';

const commit = process.argv.includes('--commit');
const client = createClient({ url: 'file:local.db' });

const KNOWN_CATEGORIES = [
    'cv_wizen_pattern',
    'broken_pattern',
    'feminine_pattern',
    'sound_suffix',
    'adjective_pattern',
    'diminutive_pattern',
];

async function run() {
    console.log(`Mode: ${commit ? 'COMMIT' : 'DRY RUN'}`);

    const res = await client.execute('SELECT id, pattern_id, category FROM pattern_applicability');
    console.log(`Total rows: ${res.rows.length}`);

    let fixed = 0;
    let skipped = 0;
    let mismatches = [];

    for (const row of res.rows) {
        const id = row.id;
        // Try to infer category from the composite ID pattern:
        //   Format 1: patternId_category_pos (e.g. _broken_pattern_all)
        //   Format 2: patternId_category_stress (e.g. _broken_pattern_2)
        //   Format 3: patternId_category_pos_stress (e.g. _broken_pattern_all_2)
        let inferredCategory = null;

        for (const cat of KNOWN_CATEGORIES) {
            if (id.includes(`_${cat}_`)) {
                inferredCategory = cat;
                break;
            }
        }

        if (!inferredCategory) {
            skipped++;
            continue;
        }

        if (row.category !== inferredCategory) {
            mismatches.push({ id, currentCategory: row.category, inferredCategory });

            if (commit) {
                await client.execute({
                    sql: 'UPDATE pattern_applicability SET category = ? WHERE id = ?',
                    args: [inferredCategory, id],
                });
                console.log(`Fixed: [${id}] ${row.category} → ${inferredCategory}`);
            } else {
                console.log(`Would fix: [${id}] ${row.category} → ${inferredCategory}`);
            }
            fixed++;
        }
    }

    console.log(`\nSummary:`);
    console.log(`  Rows scanned:       ${res.rows.length}`);
    console.log(`  Mismatches found:   ${mismatches.length}`);
    console.log(`  Skipped (no match): ${skipped}`);

    if (!commit && mismatches.length > 0) {
        console.log(`\nRun with --commit to apply changes.`);
    }
}

run().catch(console.error);
