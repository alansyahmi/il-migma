import { normalizeEntryDefinitions } from '../src/lib/adminUtils.ts';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    const single = normalizeEntryDefinitions([
        { text_en: 'god, deity', text_mt: 'alla li jħobb il-paċi ' },
    ]);

    assertEq(single.length, 1, 'Single Maltese definition should stay as one row');
    assertEq(single[0].text_mt, 'alla li jħobb il-paċi ', 'Live normalization should preserve trailing spaces while editing');

    const split = normalizeEntryDefinitions([
        { text_en: 'a; b', text_mt: 'li jagħmel; li jkun' },
    ]);

    assertEq(split.length, 2, 'Semicolon-separated definitions should still split into two rows');
    assertEq(split[0].text_mt, 'li jagħmel', 'First split definition should be trimmed');
    assertEq(split[1].text_mt, 'li jkun', 'Second split definition should be trimmed');

    const blank = normalizeEntryDefinitions([
        { text_en: '', text_mt: '   ' },
    ]);

    assertEq(blank[0].text_mt, null, 'Whitespace-only Maltese text should still normalize to null');
};

run();
console.log('adminUtils tests passed');
