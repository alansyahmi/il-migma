
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
dotenv.config({ path: resolve(ROOT, '.env') });

const db = createClient({
    url: process.env.VITE_TURSO_URL || 'file:local.db',
    authToken: process.env.VITE_TURSO_AUTH_TOKEN,
});

function uid() {
    return Math.random().toString(36).slice(2, 11);
}

function normalizePattern(cv) {
    if (!cv) return '';
    return cv.replace(/V/g, 'v').replace(/C/g, 'C');
}

function getWizen(cv) {
    const norm = normalizePattern(cv);
    let res = '';
    let cIdx = 0;
    const roots = ['f', 'għ', 'l', 'm', 'n', 'r', 's', 't'];
    for (let i = 0; i < norm.length; i++) {
        const char = norm[i];
        if (char === 'C') {
            res += roots[cIdx % roots.length];
            cIdx++;
        } else if (char === 'v') {
            res += 'a';
        } else {
            res += char;
        }
    }
    return res;
}

async function run() {
    try {
        console.log('--- Comprehensive Pattern Preset Synchronizer ---');

        // 1. Get from patterns table
        const patternTableRes = await db.execute("SELECT cv_notation, example_word FROM patterns");
        const tablePatterns = patternTableRes.rows.map(r => ({
            cv: normalizePattern(r.cv_notation),
            wizen: r.example_word || getWizen(r.cv_notation),
            category: 'cv_wizen_pattern'
        }));

        // 2. Get from broken_plural.xlsx
        let xlsPatterns = [];
        const xlsPath = resolve(ROOT, 'broken_plural.xlsx');
        if (fs.existsSync(xlsPath)) {
            const workbook = XLSX.readFile(xlsPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            rows.forEach(row => {
                const cv = String(row['CV pattern'] || row['cv_pattern'] || row['CV Pattern'] || '').trim();
                const plural = String(row['plural (orthographic)'] || row['plural'] || '').trim();
                if (cv) {
                    xlsPatterns.push({
                        cv: normalizePattern(cv),
                        wizen: plural || getWizen(cv),
                        category: 'broken_pattern'
                    });
                }
            });
        }

        // 3. Get from entries table (actual usage)
        const entriesRes = await db.execute("SELECT headword, pos, cv_pattern, lemma_pattern, inflections_pl FROM entries");
        const usagePatterns = [];
        entriesRes.rows.forEach(r => {
            if (r.cv_pattern) usagePatterns.push({ cv: r.cv_pattern, wizen: r.headword, category: 'cv_wizen_pattern' });
            if (r.lemma_pattern) usagePatterns.push({ cv: r.lemma_pattern, wizen: r.headword, category: 'cv_wizen_pattern' });
            if (r.inflections_pl) {
                try {
                    const pls = JSON.parse(r.inflections_pl);
                    pls.forEach(pl => {
                        // We don't have pattern here, but we can potentially derive it if we had roots.
                        // But for now we just skip or only use if we have pattern column.
                    });
                } catch {}
            }
        });

        // Merge all
        const all = [...tablePatterns, ...xlsPatterns, ...usagePatterns];
        const unique = {};
        all.forEach(p => {
            const compositeKey = `${p.category}:${p.cv}`;
            if (!unique[compositeKey]) unique[compositeKey] = p;
        });

        console.log(`Unique patterns identified: ${Object.keys(unique).length}`);

        let inserted = 0;
        for (const key in unique) {
            const p = unique[key];
            await db.execute({
                sql: `INSERT OR IGNORE INTO configs (id, category, key, value, sort_order) VALUES (?, ?, ?, ?, ?)`,
                args: [uid(), p.category, p.cv, JSON.stringify({ cv: p.cv, wizen: p.wizen }), 100]
            });
            inserted++;
        }

        console.log(`Synced ${inserted} patterns to configs table.`);
    } catch (e) {
        console.error('Sync failed:', e);
    }
}

run();
