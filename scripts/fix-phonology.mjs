import fs from 'fs';

const path = 'src/lib/maltesePhonology.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /let masc = '';[\s\S]*?masc = `i\$\{c1\}\$\{c2\}\$\{v2\}\$\{c3\}`;\s*\}/,
    `let masc = '';
    if (allVowelsA) {
        masc = \`a\$\{c1\}\$\{c2\}a\$\{c3\}\`;
    } else {
        // If any radical is guttural, the adjacent masculine elative vowel shifts to "a".
        const v2 = (isGuttural(c1) || isGuttural(c2) || isGuttural(c3)) ? 'a' : 'e';
        
        if (isGeminated) {
            // e.g. ġ-d-d -> iġded (Standard) or eġded
            // Most geminated adjectives take iCCeC or aCCaC
            masc = \`i\$\{c1\}\$\{c2\}\$\{v2\}\$\{c3\}\`;
        } else {
            // Normal triliteral: iCCvC
            masc = \`i\$\{c1\}\$\{c2\}\$\{v2\}\$\{c3\}\`;
        }
    }`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed maltesePhonology.ts');
