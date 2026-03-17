
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve('c:/Projects/il-migma/roots.xls');
if (!fs.existsSync(filePath)) {
    console.error('File not found');
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

if (rows.length > 0) {
    console.log('Row keys:', Object.keys(rows[0]));
    console.log('Example row:', rows[0]);
} else {
    console.log('No rows found');
}
