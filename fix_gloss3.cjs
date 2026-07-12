const fs = require('fs');
let content = fs.readFileSync('c:/Projects/il-migma/src/pages/Entry.tsx', 'utf8');

const regex1 = /\{entry\.definitions\?\.map\(def => \(\s*<li key=\{def\.id\}>\{language === 'mt' && def\.text_mt \? def\.text_mt : def\.text_en\}<\/li>\s*\)\)\s*\|\|\s*<li>-<\/li>\}/g;

const replacement1 = `{(entry.definitions ?? []).flatMap(def => {
                                    const text = language === 'mt' && def.text_mt ? def.text_mt : def.text_en;
                                    return (text || '').split(/\\s*;\\s*/).filter(Boolean).map((part, i) => (
                                        <li key={\`\${def.id}-\${i}\`}>{part}</li>
                                    ));
                                })}
                                {(!entry.definitions || entry.definitions.length === 0) && <li>-</li>}`;

content = content.replace(regex1, replacement1);

fs.writeFileSync('c:/Projects/il-migma/src/pages/Entry.tsx', content);

