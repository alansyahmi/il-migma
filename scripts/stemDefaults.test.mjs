import { resolveStemDefaults } from '../src/lib/stemDefaults.ts';

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const run = () => {
    const defaulted = resolveStemDefaults();
    assertEq(defaulted.strength, 'weak', 'Stems should default to weak strength');
    assertEq(defaulted.weak_class, 'defective', 'Stems should default to defective weak class');

    const explicitWeak = resolveStemDefaults({ strength: 'weak' });
    assertEq(explicitWeak.strength, 'weak', 'Explicit weak strength should be preserved');
    assertEq(explicitWeak.weak_class, 'defective', 'Weak stems should still default to defective when weak_class is missing');

    const explicitStrong = resolveStemDefaults({ strength: 'strong', weak_class: 'hollow' });
    assertEq(explicitStrong.strength, 'strong', 'Explicit strong strength should be preserved');
    assertEq(explicitStrong.weak_class, 'hollow', 'Explicit weak class should be preserved');
};

run();
console.log('stemDefaults tests passed');
