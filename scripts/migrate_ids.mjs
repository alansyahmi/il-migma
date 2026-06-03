import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

function loadDevVars() {
    const varsPath = path.resolve(process.cwd(), '.dev.vars');
    if (!fs.existsSync(varsPath)) return {};
    const content = fs.readFileSync(varsPath, 'utf-8');
    const vars = {};
    content.split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k && v.length > 0) vars[k.trim()] = v.join('=').trim();
    });
    return vars;
}

const vars = loadDevVars();
let URL = vars.TURSO_URL;
const TOKEN = vars.TURSO_AUTH_TOKEN;

if (!URL) {
    console.error('❌ TURSO_URL not found in .dev.vars');
    process.exit(1);
}

if (URL.startsWith('libsql://')) {
    URL = URL.replace('libsql://', 'https://');
}

console.log(`📡 Connecting to: ${URL}`);

const client = createClient({
    url: URL,
    authToken: TOKEN,
});

const POS_PREFIXES = {
    'noun': 'noun',
    'verb': 'verb',
    'adjective': 'adj',
    'adverb': 'adv',
    'preposition': 'prep',
    'conjunction': 'conj',
    'particle': 'part',
    'article': 'art',
    'pronoun': 'pron',
    'interrogative': 'int',
    'numeral': 'num',
    'interjection': 'intj'
};

function getStandardEntryId(pos, ptcp_type, headword) {
    let prefix = POS_PREFIXES[pos] || pos || 'entry';
    if (pos === 'participle') prefix = ptcp_type === 'active' ? 'ap' : 'pp';
    else if (pos === 'verbal_noun') prefix = 'vn';

    const safeHeadword = (headword || '').toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9àċġħżie-]/gi, '');

    return `${prefix}-${safeHeadword}`;
}

async function run() {
    console.log('🚀 Starting Robust ID Migration...');

    // 1. Fetch Mapping
    const rootsRes = await client.execute('SELECT id, consonants FROM roots');
    const rootMap = new Map();
    const rootUsage = new Map();
    for (const row of rootsRes.rows) {
        const base = `${row.consonants}`;
        let id = base;
        let count = rootUsage.get(base) || 0;
        if (count > 0) id = `${base}-${count + 1}`;
        rootUsage.set(base, count + 1);
        rootMap.set(row.id, id);
    }

    const entriesRes = await client.execute('SELECT id, pos, headword, participle_type FROM entries');
    const entryMap = new Map();
    const entryUsage = new Map();
    for (const row of entriesRes.rows) {
        const base = getStandardEntryId(row.pos, row.participle_type, row.headword);
        let id = base;
        let count = entryUsage.get(base) || 0;
        if (count > 0) id = `${base}-${count + 1}`;
        entryUsage.set(base, count + 1);
        entryMap.set(row.id, id);
    }

    console.log(`📊 Mapped ${rootMap.size} roots and ${entryMap.size} entries.`);

    // Helper for table columns
    const getCols = async (table) => {
        const res = await client.execute(`PRAGMA table_info(${table})`);
        return res.rows.map(r => r.name);
    };

    const rootCols = await getCols('roots');
    const entryCols = await getCols('entries');
    const rootDataCols = rootCols.filter(c => c !== 'id').join(', ');
    const entryDataCols = entryCols.filter(c => c !== 'id').join(', ');

    // 2. Roots Migration
    console.log('🌱 Migrating Roots...');
    for (const [oldId, newId] of rootMap) {
        if (oldId === newId) continue;
        console.log(`  ${oldId} -> ${newId}`);

        // a. Copy parent
        await client.execute({
            sql: `INSERT INTO roots (id, ${rootDataCols}) SELECT ?, ${rootDataCols} FROM roots WHERE id = ?`,
            args: [newId, oldId]
        });

        // b. Update child tables
        const childTables = [
            { name: 'root_pattern_forms', col: 'root_id' },
            // Add entries too if they reference root? 
            // In schema.sql, entries has root_consonants (text), but no direct root_id FK. 
            // root_pattern_forms references roots(id).
        ];
        for (const child of childTables) {
            await client.execute({
                sql: `UPDATE ${child.name} SET ${child.col} = ? WHERE ${child.col} = ?`,
                args: [newId, oldId]
            });
        }

        // c. Delete old parent
        await client.execute({ sql: `DELETE FROM roots WHERE id = ?`, args: [oldId] });
    }

    // 3. Entries Migration
    console.log('📖 Migrating Entries...');
    for (const [oldId, newId] of entryMap) {
        if (oldId === newId) continue;
        console.log(`  ${oldId} -> ${newId}`);

        // a. Copy parent
        await client.execute({
            sql: `INSERT INTO entries (id, ${entryDataCols}) SELECT ?, ${entryDataCols} FROM entries WHERE id = ?`,
            args: [newId, oldId]
        });

        // b. Update child tables
        const entryChildTables = [
            { name: 'definitions', col: 'entry_id' },
            { name: 'subentries', col: 'entry_id' },
            { name: 'phonetics', col: 'entry_id' },
            { name: 'audio_files', col: 'entry_id' },
            { name: 'dialect_variants', col: 'entry_id' },
            { name: 'attestation_reliability', col: 'entry_id' }
        ];
        for (const child of entryChildTables) {
            try {
                await client.execute({
                    sql: `UPDATE ${child.name} SET ${child.col} = ? WHERE ${child.col} = ?`,
                    args: [newId, oldId]
                });
            } catch (e) { /* skip missing tables */ }
        }

        // c. Delete old parent
        await client.execute({ sql: `DELETE FROM entries WHERE id = ?`, args: [oldId] });
    }

    // 4. Update JSON relationship arrays in roots
    console.log('📦 Updating JSON relationship arrays in roots...');
    const relCols = ['synonyms', 'antonyms', 'related_entries'].filter(c => rootCols.includes(c));
    if (relCols.length > 0) {
        const relRes = await client.execute(`SELECT id, ${relCols.join(', ')} FROM roots`);
        for (const row of relRes.rows) {
            let changed = false;
            const updateObj = {};
            relCols.forEach(f => {
                let list;
                try { list = JSON.parse(row[f] || '[]'); } catch (e) { list = []; }
                if (!Array.isArray(list)) list = [];

                list.forEach(item => {
                    if (rootMap.has(item.id)) {
                        item.id = rootMap.get(item.id);
                        changed = true;
                    }
                });
                if (changed) updateObj[f] = JSON.stringify(list);
            });

            if (Object.keys(updateObj).length > 0) {
                const sets = Object.keys(updateObj).map(k => `${k} = ?`).join(', ');
                await client.execute({
                    sql: `UPDATE roots SET ${sets} WHERE id = ?`,
                    args: [...Object.values(updateObj), row.id]
                });
            }
        }
    }

    console.log('✅ Robust Migration COMPLETED successfully.');
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Migration FAILED:', err);
    process.exit(1);
});
