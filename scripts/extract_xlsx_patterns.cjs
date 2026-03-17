
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve('c:/Projects/il-migma/broken_plural.xlsx');
if (!fs.existsSync(filePath)) {
    console.error('File not found');
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const patternMap = {}; // cv_pattern -> { singular, plural, gender }

rows.forEach(row => {
    const p = String(row['CV pattern'] || row['cv_pattern'] || row['CV Pattern'] || '').trim();
    const singular = String(row['singular (orthographic)'] || row['singular'] || '').trim();
    const plural = String(row['plural (orthographic)'] || row['plural'] || '').trim();
    const gender = String(row['gender'] || '').trim();
    const pos = String(row['pos'] || 'noun').toLowerCase();

    if (p && !patternMap[p]) {
        patternMap[p] = { singular, plural, gender, pos };
    }
});

console.log(JSON.stringify(patternMap, null, 2));
