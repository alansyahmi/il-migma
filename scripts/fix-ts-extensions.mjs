import fs from 'fs';
import path from 'path';

const filesToFix = [
    'src/components/dictionary/etymology.ts',
    'src/lib/adminSchema.ts',
    'src/lib/entryAdapter.ts',
    'src/lib/entryHydration.ts',
    'src/lib/inflectionTable.ts',
    'src/lib/nounInflectionEngine.ts',
    'src/lib/stemSearchPreview.ts',
    'src/lib/suffixMatching.ts',
    'src/lib/maltesePhonology.ts',
    'src/lib/numeralMorphology.ts',
];

for (const file of filesToFix) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    const before = content;
    // Replace '.ts' in import paths but NOT .tsx
    content = content.replace(/from '(\.\.?\/[^']*?)\.ts'/g, "from '$1'");
    content = content.replace(/from "(\.\.?\/[^"]*?)\.ts"/g, 'from "$1"');
    if (content !== before) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed: ${file}`);
    } else {
        console.log(`No change: ${file}`);
    }
}
console.log('Done');
