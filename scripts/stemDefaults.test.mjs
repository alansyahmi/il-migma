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
    assertEq(finalWeakFormII.strength, 'strong', 'Manual Form II final-għ strong verbs should keep the saved strong class');
    assertEq(finalWeakFormII.weak_class, null, 'Manual non-weak classes should not leak a weak class');

    const finalWeakFormIIHybrid = resolveVerbClassification({
        form: 'II',
        headword: "rabba'",
        verb_class: 'strong-hybrid',
        verb_weak_class: 'defective',
        root: { consonants: 'r-b-għ', strength: 'strong', weak_class: null },
    });
    assertEq(finalWeakFormIIHybrid.strength, 'strong-hybrid', 'Manual Form II strong-hybrid verbs should keep the saved strong-hybrid class');
    assertEq(finalWeakFormIIHybrid.weak_class, null, 'Manual strong-hybrid verbs should ignore stale weak class data');

    const blankFinalWeakFormII = resolveVerbClassification({
        form: 'II',
        headword: "rabba'",
        root: { consonants: 'r-b-għ', strength: 'strong', weak_class: null },
    });
    assertEq(blankFinalWeakFormII.strength, 'strong-hybrid', 'Blank Form II final-għ verbs should now infer strong-hybrid strength');
    assertEq(blankFinalWeakFormII.weak_class, null, 'Blank Form II strong-hybrid inference should not invent a weak class');

    const strongFormII = resolveVerbClassification({
        form: 'II',
        headword: 'kisser',
        verb_class: 'strong',
        root: { consonants: 'k-s-r', strength: 'strong', weak_class: null },
    });
    assertEq(strongFormII.strength, 'strong', 'Ordinary Form II strong verbs should stay strong');
    assertEq(strongFormII.weak_class, null, 'Ordinary Form II strong verbs should not invent a weak class');

    const refaBlank = resolveVerbClassification({
        form: 'I',
        headword: "refa'",
        root: { consonants: 'r-f-għ', strength: 'strong', weak_class: null },
    });
    assertEq(refaBlank.strength, 'strong-hybrid', "Blank Form I final-għ apostrophe verbs should still infer strong-hybrid");
    assertEq(refaBlank.weak_class, null, 'Blank Form I strong-hybrid inference should not invent a weak class');

    const qietaBlank = resolveVerbClassification({
        form: 'III',
        headword: "qieta'",
        root: { consonants: 'q-t-għ', strength: 'strong', weak_class: null },
    });
    assertEq(qietaBlank.strength, 'strong-hybrid', "Blank Form III final-għ apostrophe verbs should infer strong-hybrid");
    assertEq(qietaBlank.weak_class, null, 'Blank Form III strong-hybrid inference should not invent a weak class');

    for (const [form, headword, root] of [
        ['V', "trabba'", 'r-b-għ'],
        ['VI', "tqieta'", 'q-t-għ'],
        ['VII', "nrefa'", 'r-f-għ'],
        ['Xb', "strabba'", 'r-b-għ'],
    ]) {
        const higherHybridBlank = resolveVerbClassification({
            form,
            headword,
            root: { consonants: root, strength: 'strong', weak_class: null },
        });
        assertEq(higherHybridBlank.strength, 'strong-hybrid', `Blank Form ${form} final-għ apostrophe verbs should infer strong-hybrid`);
        assertEq(higherHybridBlank.weak_class, null, `Blank Form ${form} strong-hybrid inference should not invent a weak class`);
    }

    const qietaManualStrong = resolveVerbClassification({
        form: 'III',
        headword: "qieta'",
        verb_class: 'strong',
        root: { consonants: 'q-t-għ', strength: 'strong', weak_class: null },
    });
    assertEq(qietaManualStrong.strength, 'strong', 'Manual Form III strong class should remain authoritative');
    assertEq(qietaManualStrong.weak_class, null, 'Manual Form III strong class should not leak a weak class');

    const manualWeak = resolveVerbClassification({
        form: 'II',
        headword: "rabba'",
        verb_class: 'weak',
        verb_weak_class: 'defective',
        root: { consonants: 'r-b-għ', strength: 'strong', weak_class: null },
    });
    assertEq(manualWeak.strength, 'weak', 'Manual weak class should be preserved');
    assertEq(manualWeak.weak_class, 'defective', 'Manual weak defective class should be preserved');

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
