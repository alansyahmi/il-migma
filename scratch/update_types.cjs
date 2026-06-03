const fs = require('fs');
const path = 'src/types/index.ts';
let content = fs.readFileSync(path, 'utf8');

// Update NounMorphology
content = content.replace(/antonyms\?: any\[\];\n}/, 'antonyms?: any[];\n    pattern?: string;\n}');

// Update AdjectiveMorphology
content = content.replace(/antonyms\?: any\[\];\n}/, 'antonyms?: any[];\n    pattern?: string;\n}');
// Wait, that might replace the first one twice. 

// Better:
const nounPart = content.indexOf('export interface NounMorphology');
const verbPart = content.indexOf('export interface VerbMorphology');
const adjPart = content.indexOf('export interface AdjectiveMorphology');
const partPart = content.indexOf('export interface ParticipleMorphology');

if (nounPart !== -1 && verbPart !== -1) {
    let nounContent = content.substring(nounPart, verbPart);
    nounContent = nounContent.replace(/}\s*$/, '    pattern?: string;\n}\n');
    content = content.substring(0, nounPart) + nounContent + content.substring(verbPart);
}

if (adjPart !== -1 && partPart !== -1) {
    let adjContent = content.substring(adjPart, partPart);
    adjContent = adjContent.replace(/}\s*$/, '    pattern?: string;\n}\n');
    content = content.substring(0, adjPart) + adjContent + content.substring(partPart);
}

fs.writeFileSync(path, content);
