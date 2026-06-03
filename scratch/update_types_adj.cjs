const fs = require('fs');
const path = 'src/types/index.ts';
let content = fs.readFileSync(path, 'utf8');

const adjPart = content.indexOf('export interface AdjectiveMorphology');
const partPart = content.indexOf('export interface ParticipleMorphology');

if (adjPart !== -1 && partPart !== -1) {
    let adjContent = content.substring(adjPart, partPart);
    if (!adjContent.match(/\bpattern\?:\s*string;/)) {
        const lastBrace = adjContent.lastIndexOf('}');
        if (lastBrace !== -1) {
            adjContent = adjContent.substring(0, lastBrace) + '    pattern?: string;\n}';
            content = content.substring(0, adjPart) + adjContent + content.substring(partPart);
            fs.writeFileSync(path, content);
            console.log('Updated AdjectiveMorphology.');
        }
    } else {
        console.log('AdjectiveMorphology already has pattern.');
    }
}
