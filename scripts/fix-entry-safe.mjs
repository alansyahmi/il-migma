import fs from 'fs';

const path = 'src/pages/Entry.tsx';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

// Fix 1: NounParadigmCellView (line 659)
lines[658] = lines[658].replace(
    'const isHidden = hideTheoreticalForms && (',
    'const isHidden = !cell || (hideTheoreticalForms && ('
);
lines[662] = lines[662].replace(');', '));');
lines[664] = '    if (isHidden || !cell) {';

// Fix 2: NounParadigmTable cellIsVisible (line 734)
lines[733] = lines[733].replace(
    'const cellIsVisible = (cell: NounParadigmCell) => !(',
    'const cellIsVisible = (cell: NounParadigmCell) => cell && !('
);

// Fix 3: AdjectiveParadigmTable cellIsVisible (line 898)
lines[897] = lines[897].replace(
    'const cellIsVisible = (cell: NounParadigmCell) => !(',
    'const cellIsVisible = (cell: NounParadigmCell) => cell && !('
);

// Fix 4: AdjectiveEntryView elative useMemo (lines 4119-4132)
const startIdx = 4118;
const endIdx = 4131;
const newElativeLogic = `    const elative = useMemo(() => {
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
    }, [am.elative, (entry as any).elative_form, rootConsonants, entry.headword, entry.tags]);`;

lines.splice(startIdx, endIdx - startIdx + 1, newElativeLogic);

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Fixed Entry.tsx (Line-based)');
