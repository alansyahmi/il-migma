
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Manual parsing of .dev.vars
const varsFile = '.dev.vars';
let vars = {};
if (fs.existsSync(varsFile)) {
    vars = fs.readFileSync(varsFile, 'utf-8')
        .split('\n')
        .reduce((acc, line) => {
            const [key, ...vals] = line.split('=');
            if (key && vals) acc[key.trim()] = vals.join('=').trim();
            return acc;
        }, {});
}

// Support both local and remote
const remoteUrl = vars.TURSO_URL;
const remoteToken = vars.TURSO_AUTH_TOKEN;
const localUrl = 'file:local.db';

const target = process.argv[2] || 'local'; // 'local' or 'remote'
const url = target === 'remote' ? remoteUrl : localUrl;
const authToken = target === 'remote' ? remoteToken : undefined;

if (!url) {
    console.error(`URL for ${target} missing`);
    process.exit(1);
}

console.log(`Targeting ${target} database at ${url}`);

const client = createClient({ url, authToken });

const columnsToAdd = [
    'gender',
    'inflections_pl',
    'form_fem',
    'form_masc',
    'dual_form',
    'diminutive_form',
    'paucal_form',
    'augmentative_form',
    'is_collective',
    'is_singulative',
    'noun_type',
    'vowel_set_sg',
    'vowel_set_pl',
    'vowel_set_opp',
    'vowel_set_dual',
    'lemma_pattern',
    'form_fem_pattern',
    'form_masc_pattern',
    'form_plural_pattern',
    'dual_pattern',
    'paucal_pattern',
    'augmentative_pattern',
    'elative_pattern',
    'diminutive_pattern',
    'verb_class',
    'verb_transitivity',
    'verb_perfective_3sgm',
    'verb_imperfective_3sgm',
    'verb_verbal_noun',
    'verb_vowel_perf',
    'verb_vowel_impf',
    'verb_vowel_impv',
    'verb_active_ptcp',
    'verb_passive_ptcp',
    'verb_form',
    'verb_type',
    'verb_weak_class',
    'elative_form',
    'participle_type',
    'numeral_type',
    'form_attributive_short',
    'form_attributive_long',
    'numeral_ordinal',
    'numeral_adverbial',
    'numeral_fractional',
    'numeral_multiplier',
    'numeral_distributive',
    'source_citation',
    'source_title',
    'source_year',
    'source_page',
    'source_publisher',
    'source_display',
    'source_tooltip',
    'etymology_chain',
    'etymology_notes',
    'cv_pattern',
    'morph_pattern',
    'sound_suffix',
    'zokk_morphology',
    'stem',
    'zokk_class',
    'zokk_is_hybrid',
    'zokk_agentive_suffix',
    'is_inflectable'
];

async function run() {
    for (const col of columnsToAdd) {
        const colType = col.startsWith('is_') ? 'BOOLEAN DEFAULT false' : 'TEXT';
        const sql = `ALTER TABLE entries ADD COLUMN ${col} ${colType}`;
        console.log(`Running: ${sql}`);
        try {
            await client.execute(sql);
            console.log(`Success.`);
        } catch (e) {
            if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
                console.warn(`Column ${col} already exists, skipping.`);
            } else {
                console.error(`Error adding ${col}: ${e.message}`);
            }
        }
    }
    console.log('Migration finished.');
    process.exit(0);
}

run();
