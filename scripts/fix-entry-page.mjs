import fs from 'fs';

const path = 'src/pages/Entry.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: NounParadigmCellView
content = content.replace(
    'const isHidden = hideTheoreticalForms && (',
    'const isHidden = !cell || (hideTheoreticalForms && ('
);

// Fix 2: cellIsVisible in NounParadigmTable
content = content.replace(
    'const cellIsVisible = (cell: NounParadigmCell) => !(',
    'const cellIsVisible = (cell: NounParadigmCell) => cell && !('
);

// Fix 3: cellIsVisible in AdjectiveParadigmTable
// This one appears twice in the file (once in NounParadigmTable and once in AdjectiveParadigmTable)
// We need to replace BOTH or use a global regex.
content = content.replace(
    /const cellIsVisible = \(cell: NounParadigmCell\) => !\(/g,
    'const cellIsVisible = (cell: NounParadigmCell) => cell && !('
);

// Fix 4: elative useMemo in AdjectiveEntryView
content = content.replace(
    /const elative = useMemo\(\(\) => \{[\s\S]*?\}, \[am\.elative, rootConsonants, entry\.headword, entry\.tags\]\);/,
    `const elative = useMemo(() => {
        // Disable generation if any internal elative-blocking tag is present
        const isElativeDisabled = entry.tags?.some(tag => tag.includes('$') || isHiddenTag(tag));
        if (isElativeDisabled) return null;

        const manualElative = am.elative || (entry as any).elative_form;
        const generated = rootConsonants ? generateElative(rootConsonants, entry.headword) : null;
        
        if (!generated) {
            return manualElative ? { masculine: manualElative, feminine: null } : null;
        }
        return {
            masculine: manualElative || generated.masculine,
            feminine: generated.feminine,
            theoretical: !manualElative,
        };
    }, [am.elative, (entry as any).elative_form, rootConsonants, entry.headword, entry.tags]);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Entry.tsx');
