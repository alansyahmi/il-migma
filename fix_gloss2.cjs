const fs = require('fs');
let content = fs.readFileSync('c:/Projects/il-migma/src/pages/Entry.tsx', 'utf8');

const regex1 = /\{\(\s*entry\.definitions\s*\?\?\s*\[\]\s*\)\.map\(\s*def\s*=>\s*\(\s*<li\s+key=\{def\.id\}>\{language\s*===\s*'mt'\s*&&\s*def\.text_mt\s*\?\s*def\.text_mt\s*:\s*def\.text_en\}<\/li>\s*\)\s*\)\}/g;

const replacement1 = `{(entry.definitions ?? []).flatMap(def => {
                                    const text = language === 'mt' && def.text_mt ? def.text_mt : def.text_en;
                                    return (text || '').split(/\\s*;\\s*/).filter(Boolean).map((part, i) => (
                                        <li key={\`\${def.id}-\${i}\`}>{part}</li>
                                    ));
                                })}`;

content = content.replace(regex1, replacement1);

fs.writeFileSync('c:/Projects/il-migma/src/pages/Entry.tsx', content);

let rootContent = fs.readFileSync('c:/Projects/il-migma/src/pages/Root.tsx', 'utf8');
const regex2 = /\{glossList\.map\(\s*\(\s*g\s*,\s*i\s*\)\s*=>\s*\(\s*<li\s+key=\{i\}>\{g\}<\/li>\s*\)\s*\)\}/g;
const replacement2 = `{glossList.flatMap(g => (g || '').split(/\\s*;\\s*/).filter(Boolean)).map((part, i) => (
                                        <li key={i}>{part}</li>
                                    ))}`;
rootContent = rootContent.replace(regex2, replacement2);
fs.writeFileSync('c:/Projects/il-migma/src/pages/Root.tsx', rootContent);
