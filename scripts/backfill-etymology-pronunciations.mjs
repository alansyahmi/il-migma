import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateForeignScriptPronunciation } from '../src/lib/foreignScriptPronunciation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORIES_DIR = path.resolve(__dirname, '../docs/1000-words-categories');
const isApply = process.argv.includes('--apply');

const MANUAL_PRONUNCIATIONS = {
    'וְ־': 've-',
};

const files = fs.readdirSync(CATEGORIES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'artifacts.json' && f !== 'index.json');

let totalSteps = 0;
let alreadyHad = 0;
let newlyFilled = 0;
let stillMissing = 0;
const missingSamples = [];

for (const file of files) {
    const filePath = path.join(CATEGORIES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    let fileChanged = false;
    let fileFilled = 0;

    for (const entry of data.entries || []) {
        for (const step of entry.etymology_chain || []) {
            totalSteps++;

            // Clean any forward slashes in term
            if (step.term && typeof step.term === 'string' && step.term.includes('/')) {
                step.term = step.term.replace(/\s*\/\s*/g, ' jew ').trim();
                fileChanged = true;
            }

            // Standardize standalone or suffixed Arabic article prefix to اَلْـ
            if (step.language === 'Arabic' || step.language === 'Classical Arabic') {
                if (step.term === 'اَلْ') {
                    step.term = 'اَلْـ';
                    fileChanged = true;
                } else if (typeof step.term === 'string' && step.term.endsWith('+ اَلْ')) {
                    step.term = step.term.replace(/\+\s*اَلْ$/, '+ اَلْـ');
                    fileChanged = true;
                }
            }

            // Check manual map
            if (step.term && MANUAL_PRONUNCIATIONS[step.term]) {
                if (step.pronunciation !== MANUAL_PRONUNCIATIONS[step.term]) {
                    step.pronunciation = MANUAL_PRONUNCIATIONS[step.term];
                    newlyFilled++;
                    fileFilled++;
                    fileChanged = true;
                }
                continue;
            }

            // Generate using engine
            const gen = generateForeignScriptPronunciation({
                language: step.language,
                term: step.term,
                script: step.script,
            });

            if (gen && gen.trim()) {
                if (step.pronunciation !== gen.trim()) {
                    step.pronunciation = gen.trim();
                    newlyFilled++;
                    fileFilled++;
                    fileChanged = true;
                } else {
                    alreadyHad++;
                }
            } else if (step.pronunciation && String(step.pronunciation).trim()) {
                alreadyHad++;
            } else {
                stillMissing++;
                if (missingSamples.length < 30) {
                    missingSamples.push({
                        file,
                        entry: entry.id,
                        language: step.language,
                        term: step.term,
                    });
                }
            }
        }
    }

    if (isApply && fileChanged) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`[APPLIED] ${file}: backfilled ${fileFilled} pronunciations`);
    } else {
        console.log(`[DRY-RUN] ${file}: would backfill ${fileFilled} pronunciations`);
    }
}

console.log('--- SUMMARY ---');
console.log(`Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);
console.log(`Total etymology steps: ${totalSteps}`);
console.log(`Already had pronunciation: ${alreadyHad}`);
console.log(`Newly filled pronunciation: ${newlyFilled}`);
console.log(`Still without pronunciation: ${stillMissing}`);
console.log('Remaining without pronunciation (typically Latin/Romance source terms in Latin alphabet):');
for (const s of missingSamples.slice(0, 15)) {
    console.log(`  ${s.file} | ${s.entry} | [${s.language}] ${s.term}`);
}
