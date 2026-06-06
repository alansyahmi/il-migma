import { resolveStemDefaults, resolveVerbClassification } from '../src/lib/stemDefaults.ts';

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

    const finalWeakFormII = resolveVerbClassification({
        form: 'II',
        headword: "rabba'",
        verb_class: 'strong',
        root: { consonants: 'r-b-għ', strength: 'strong', weak_class: null },
    });
    assertEq(finalWeakFormII.strength, 'weak', 'Form II final-għ verbs should not fall through to the strong generator');
    assertEq(finalWeakFormII.weak_class, 'defective', 'Form II final-għ verbs should resolve to defective weak class');

    const strongFormII = resolveVerbClassification({
        form: 'II',
        headword: 'kisser',
        verb_class: 'strong',
        root: { consonants: 'k-s-r', strength: 'strong', weak_class: null },
    });
    assertEq(strongFormII.strength, 'strong', 'Ordinary Form II strong verbs should stay strong');
    assertEq(strongFormII.weak_class, null, 'Ordinary Form II strong verbs should not invent a weak class');

    const quadriliteralLabel = resolveVerbClassification({
        form: 'I',
        headword: 'qartas',
        verb_class: 'quadriliteral',
        root_consonants: 'q-r-t-s',
    });
    assertEq(quadriliteralLabel.strength, 'strong', 'Quadriliteral labels should resolve to engine strong strength');
    assertEq(quadriliteralLabel.weak_class, null, 'Quadriliteral labels should not imply weak defective class');
};

run();
console.log('stemDefaults tests passed');
