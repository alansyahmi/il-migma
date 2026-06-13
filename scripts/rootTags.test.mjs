import { normalizeRootTags } from '../src/lib/adminUtils.ts';

const assertEq = (actual, expected, message) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
    }
};

const run = () => {
    assertEq(normalizeRootTags(null), [], 'normalizeRootTags should handle empty values');
    assertEq(normalizeRootTags(['core', '  legacy  ']), ['core', 'legacy'], 'normalizeRootTags should trim arrays');
    assertEq(normalizeRootTags('["core","legacy"]'), ['core', 'legacy'], 'normalizeRootTags should parse JSON arrays');
    assertEq(normalizeRootTags('core, legacy,  '), ['core', 'legacy'], 'normalizeRootTags should split comma-separated values');
    assertEq(normalizeRootTags(' core '), ['core'], 'normalizeRootTags should trim single legacy values');
};

run();
console.log('rootTags tests passed');
