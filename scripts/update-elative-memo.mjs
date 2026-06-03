import fs from 'fs';

const path = 'src/pages/Entry.tsx';
let content = fs.readFileSync(path, 'utf8');

// Use a more flexible regex for the elative useMemo block
const oldBlockRegex = /const elative = useMemo\(\(\) => \{[\s\S]*?if \(isElativeDisabled\) return null;[\s\S]*?const generated = rootConsonants \? generateElative\(rootConsonants, entry\.headword\) : null;[\s\S]*?return am\.elative \? \{ masculine: am\.elative, feminine: null \} : null;[\s\S]*?return \{[\s\S]*?masculine: am\.elative \|\| generated\.masculine,[\s\S]*?feminine: generated\.feminine,[\s\S]*?\};[\s\S]*?\}, \[am\.elative, rootConsonants, entry\.headword, entry\.tags\]\);/;

const newBlock = `const elative = useMemo(() => {
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

if (oldBlockRegex.test(content)) {
    content = content.replace(oldBlockRegex, newBlock);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated elative useMemo');
} else {
    console.error('Could not find elative useMemo block with regex');
}
