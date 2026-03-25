import { createClient } from '@libsql/client';
import fs from 'fs';

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

const target = process.argv[2] || 'local';
const url = target === 'remote' ? vars.TURSO_URL : 'file:local.db';
const authToken = target === 'remote' ? vars.TURSO_AUTH_TOKEN : undefined;

const client = createClient({ url, authToken });

async function run() {
    // 1. Kanta (Hybrid)
    const kanta = {
        id: 'v_kanta',
        headword: 'kanta',
        pos: 'verb',
        is_loanword: 1,
        source_language: 'Italian',
        zokk_morphology: JSON.stringify({
            stem_string: 'kant',
            class_type: 'ar',
            is_hybrid: true,
            root: 'k-n-t-j'
        })
    };

    // 2. Servi (Non-Hybrid)
    const servi = {
        id: 'v_servi',
        headword: 'servi',
        pos: 'verb',
        is_loanword: 1,
        source_language: 'Italian',
        zokk_morphology: JSON.stringify({
            stem_string: 'serv',
            class_type: 'ir',
            is_hybrid: false
        })
    };

    // 3. Fajl (Class -ar, from English)
    const fajl = {
        id: 'v_fajl',
        headword: 'fajlja',
        pos: 'verb',
        is_loanword: 1,
        source_language: 'English',
        zokk_morphology: JSON.stringify({
            stem_string: 'fajl',
            class_type: 'ar',
            is_hybrid: false
        })
    };

    const entries = [kanta, servi, fajl];

    for (const e of entries) {
        console.log(`Inserting ${e.headword}...`);
        try {
            await client.execute({
                sql: `INSERT OR REPLACE INTO entries (id, headword, pos, is_loanword, source_language, zokk_morphology) VALUES (?, ?, ?, ?, ?, ?)`,
                args: [e.id, e.headword, e.pos, e.is_loanword, e.source_language, e.zokk_morphology]
            });
            
            // Add a dummy definition
            await client.execute({
                sql: `INSERT OR REPLACE INTO definitions (id, entry_id, sense_number, text_en, text_mt) VALUES (?, ?, 1, ?, ?)`,
                args: [`def_${e.id}`, e.id, `To ${e.headword}`, `Li ${e.headword}`]
            });
        } catch (err) {
            console.error(`Failed to insert ${e.headword}:`, err.message);
        }
    }

    console.log('Test data inserted.');
    process.exit(0);
}

run();
