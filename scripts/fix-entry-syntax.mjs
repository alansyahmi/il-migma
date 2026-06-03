import fs from 'fs';

const path = 'src/pages/Entry.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /const isHidden = !cell \|\| \(hideTheoreticalForms && \([\s\S]*?false\)\s*\);/,
    (match) => match.replace(/\);$/, '));')
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Entry.tsx syntax error');
