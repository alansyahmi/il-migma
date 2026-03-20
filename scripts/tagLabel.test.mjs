import { normalizeTagKey, resolveTagLabel, stripTagPrefixes } from '../src/lib/tagLabel.ts';

const createTerm = (dict) => (key) => dict[key] ?? key;

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    assertEq(stripTagPrefixes('\\tag'), 'tag', 'stripTagPrefixes should remove \\ prefix');
    assertEq(stripTagPrefixes('!tag'), 'tag', 'stripTagPrefixes should remove ! prefix');
    assertEq(stripTagPrefixes('$tag'), 'tag', 'stripTagPrefixes should remove $ prefix');
    assertEq(stripTagPrefixes('!$\\tag'), 'tag', 'stripTagPrefixes should remove combined prefixes');

    assertEq(normalizeTagKey(' Common_Tag '), 'common-tag', 'normalizeTagKey should normalize underscores');
    assertEq(normalizeTagKey('Strong-Hybrid'), 'strong-hybrid', 'normalizeTagKey should keep hyphenated words');
    assertEq(normalizeTagKey('\\  SEMITIC   CORE  '), 'semitic-core', 'normalizeTagKey should normalize spacing and case');

    const scopedTerm = createTerm({
        'tag-common': 'Common (Tag)',
        common: 'Common',
    });
    assertEq(resolveTagLabel('!common', scopedTerm), 'Common (Tag)', 'resolveTagLabel should prefer tag-scoped translation');

    const directTerm = createTerm({
        common: 'Common',
    });
    assertEq(resolveTagLabel('$common', directTerm), 'Common', 'resolveTagLabel should fallback to direct term key');

    const emptyTerm = createTerm({});
    assertEq(resolveTagLabel('\\semitic-core', emptyTerm), 'semitic-core', 'resolveTagLabel should fallback to cleaned source');
};

run();
console.log('tagLabel tests passed');
