const fs = require('fs');
const path = 'src/components/admin/EntryFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the start of NounFields
const nounFieldsStart = content.indexOf('const NounFields =');
const adjFieldsStart = content.indexOf('const AdjectiveFields =');

if (nounFieldsStart !== -1 && adjFieldsStart !== -1) {
    const nounFieldsContent = content.substring(nounFieldsStart, adjFieldsStart);
    // Look for the Elative section inside NounFields
    const elativeStart = nounFieldsContent.indexOf('<h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{t(\'Elative (Comparative)\'');
    if (elativeStart !== -1) {
        // Find the start of the surrounding div
        const divStart = nounFieldsContent.lastIndexOf('<div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">', elativeStart);
        if (divStart !== -1) {
            // Find the end of that div (it's the second one in the grid)
            // The grid ends with </div></div></div>);
            // We want to remove the entire div block.
            // Let's find the matching closing div.
            let depth = 0;
            let i = divStart;
            while (i < nounFieldsContent.length) {
                if (nounFieldsContent.substring(i, i + 4) === '<div') {
                    depth++;
                    i += 4;
                } else if (nounFieldsContent.substring(i, i + 5) === '</div') {
                    depth--;
                    i += 5;
                    if (depth === 0) break;
                } else {
                    i++;
                }
            }
            
            const fullDiv = nounFieldsContent.substring(divStart, i);
            console.log('Found div to remove:', fullDiv.substring(0, 50) + '...');
            
            const newNounFieldsContent = nounFieldsContent.replace(fullDiv, '');
            content = content.substring(0, nounFieldsStart) + newNounFieldsContent + content.substring(adjFieldsStart);
            fs.writeFileSync(path, content);
            console.log('Successfully removed elative section from NounFields.');
        } else {
            console.error('Could not find div start.');
        }
    } else {
        console.error('Could not find elative title in NounFields.');
    }
} else {
    console.error('Could not find NounFields or AdjectiveFields.');
}
