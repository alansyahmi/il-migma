const fs = require('fs');
let content = fs.readFileSync('c:/Projects/il-migma/src/pages/Entry.tsx', 'utf8');

// For line 4921 and 4933:
const regex1 = /\{\(entry\.definitions \?\? \[\]\)\.map\(def => \(\s*<li key=\{def\.id\}>\{formatDefinitionGloss\(def, language, term\)\}<\/li>\s*\)\)\}/g;
const replacement1 = `{(entry.definitions ?? []).flatMap(def => {
                                    const text = formatDefinitionGloss(def, language, term);
                                    return (text || '').split(/\\s*;\\s*/).filter(Boolean).map((part, i) => (
                                        <li key={\`\${def.id}-\${i}\`}>{part}</li>
                                    ));
                                })}`;

content = content.replace(regex1, replacement1);

// For line 5648 and 5663:
const regex2 = /\(entry\.definitions \?\? \[\]\)\.map\(def => \(\s*<li key=\{def\.id\}>\{language === 'mt' && def\.text_mt \? def\.text_mt : def\.text_en\}<\/li>\s*\)\)/g;
const replacement2 = `(entry.definitions ?? []).flatMap(def => {
                                        const text = language === 'mt' && def.text_mt ? def.text_mt : def.text_en;
                                        return (text || '').split(/\\s*;\\s*/).filter(Boolean).map((part, i) => (
                                            <li key={\`\${def.id}-\${i}\`}>{part}</li>
                                        ));
                                    })`;

content = content.replace(regex2, replacement2);

fs.writeFileSync('c:/Projects/il-migma/src/pages/Entry.tsx', content);
