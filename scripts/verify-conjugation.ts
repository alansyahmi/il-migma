import { generateConjugation, generateRootForms } from '../src/lib/conjugationEngine.ts';
import { buildPerfectForm, buildVerbForm } from '../src/lib/suffixEngine.ts';

const testCases = [
    { root: 'k-t-b', perfect: 'e-e', imperfect: 'i-e', form: 'I', strength: 'strong' },
    { root: 'w-r-t', perfect: 'i-e', imperfect: 'j-e', form: 'I', strength: 'weak', weakClass: 'assimilative' },
    { root: 'd-w-r', perfect: 'o-a', imperfect: 'j-u', form: 'I', strength: 'weak', weakClass: 'hollow' },
    { root: 'd-l-l', perfect: 'e-a', imperfect: 'i-a', form: 'I', strength: 'geminated' },
    { root: 'b-d-a', perfect: 'e-a', imperfect: 'i-a', form: 'I', strength: 'weak', weakClass: 'defective' },
    { root: 'l-q-għ', perfect: 'a-a', imperfect: 'i-a', form: 'I', strength: 'strong-hybrid' },
];

for (const t of testCases) {
    try {
        const res = generateConjugation({
            root: t.root,
            vowelSetPerfect: t.perfect,
            vowelSetImperfect: t.imperfect,
            vowelSetImperative: 'a',
            form: t.form,
            strength: t.strength,
            weakClass: t.weakClass,
            is_active: 1
        });
        console.log(`\n=== ${t.root} (Form ${t.form} ${t.strength}) ===`);
        console.table(res.rows.map(r => ({
            person: r.person_mt,
            perf: r.perfect,
            impf: r.imperfect,
            impf1: r.stems.impfType1,
            impf2: r.stems.impfType2
        })));
    } catch (e) {
        console.error(`Error generating ${t.root}:`, e);
    }
}

const assertEq = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
};

const verifyRootForms = (label, root, perfect, imperfect, strength, weakClass, expectations) => {
    const forms = generateRootForms(root, perfect, imperfect, strength, weakClass);
    assertEq(forms.length, 2, `${label} should return exactly 2 forms`);
    assertEq(forms[0].form, 'I', `${label} form 1 should be Form I`);
    assertEq(forms[1].form, 'II', `${label} form 2 should be Form II`);
    for (const [field, expected] of Object.entries(expectations.formI)) {
        assertEq(forms[0][field], expected, `${label} Form I ${field}`);
    }
    for (const [field, expected] of Object.entries(expectations.formII)) {
        assertEq(forms[1][field], expected, `${label} Form II ${field}`);
    }
};

const verifyQuadriliteralConjugation = (label, input, expectations) => {
    const table = generateConjugation(input);
    assertEq(table.rows.length, 7, `${label} should return 7 person rows`);
    assertEq(table.imperative_sg, expectations.imperative_sg, `${label} imperative singular`);
    assertEq(table.imperative_pl, expectations.imperative_pl, `${label} imperative plural`);

    const row3ms = table.rows[2];
    assertEq(row3ms.perfect, expectations.row3ms.perfect, `${label} 3ms perfect`);
    assertEq(row3ms.imperfect, expectations.row3ms.imperfect, `${label} 3ms imperfect`);
    assertEq(row3ms.perfect_neg ?? '', expectations.row3ms.perfect_neg ?? '', `${label} 3ms perfect negative`);

    const row1s = table.rows[0];
    assertEq(row1s.perfect, expectations.row1s.perfect, `${label} 1s perfect`);
    assertEq(row1s.imperfect, expectations.row1s.imperfect, `${label} 1s imperfect`);
};

verifyRootForms(
    'quadriliteral strong',
    'q-r-t-s',
    'a-a',
    'i-a',
    'strong',
    undefined,
    {
        formI: {
            perfect: 'qartas',
            imperfect: 'jqartas',
            imperative: 'qartas',
            passiveParticiple: 'mqartas',
            activeParticiple: 'qarties',
            verbalNoun: 'qartis',
        },
        formII: {
            perfect: 'tqartas',
            imperfect: 'jitqartas',
            imperative: 'tqartas',
            passiveParticiple: 'mitqartas',
            activeParticiple: '-',
            verbalNoun: 'tqartir',
        },
    }
);

verifyRootForms(
    'quadriliteral strong gharghar',
    'għ-r-għ-r',
    'a-a',
    'i-a',
    'strong',
    undefined,
    {
        formI: {
            perfect: 'għargħar',
            imperfect: 'jgħargħar',
            imperative: 'għargħar',
            passiveParticiple: 'mgħargħar',
            activeParticiple: 'għargħier',
            verbalNoun: 'għargħir',
        },
        formII: {
            perfect: 'tgħargħar',
            imperfect: 'jitgħargħar',
            imperative: 'tgħargħar',
            passiveParticiple: 'mitgħargħar',
            activeParticiple: '-',
            verbalNoun: 'tgħargħir',
        },
    }
);

verifyRootForms(
    'quadriliteral defective',
    's-q-s-w',
    'a-a',
    'i-a',
    'weak',
    'defective',
    {
        formI: {
            perfect: 'saqsa',
            imperfect: 'jsaqsi',
            imperative: 'saqsi',
            passiveParticiple: 'msaqsi',
            activeParticiple: 'saqsej',
            verbalNoun: 'saqsi',
        },
        formII: {
            perfect: 'ssaqsa',
            imperfect: 'jissaqsi',
            imperative: 'ssaqsa',
            passiveParticiple: 'missaqsi',
            activeParticiple: '-',
            verbalNoun: 'ssaqsija',
        },
    }
);

verifyQuadriliteralConjugation(
    'quadriliteral strong conjugation',
    {
        root: 'q-r-t-s',
        form: 'I',
        strength: 'strong',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'i-a',
        vowelSetImperative: 'a-a',
        isImalaBlocked: false,
    },
    {
        imperative_sg: 'qartas',
        imperative_pl: 'qartsu',
        row3ms: {
            perfect: 'qartas',
            imperfect: 'jqartas',
            perfect_neg: 'qartas',
        },
        row1s: {
            perfect: 'qartast',
            imperfect: 'nqartas',
        },
    }
);

verifyQuadriliteralConjugation(
    'quadriliteral strong conjugation form II',
    {
        root: 'q-r-t-s',
        form: 'II',
        strength: 'strong',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'i-a',
        vowelSetImperative: 'a-a',
        isImalaBlocked: false,
    },
    {
        imperative_sg: 'tqartas',
        imperative_pl: 'tqartsu',
        row3ms: {
            perfect: 'tqartas',
            imperfect: 'jitqartas',
            perfect_neg: 'tqartas',
        },
        row1s: {
            perfect: 'tqartast',
            imperfect: 'jitqartas',
        },
    }
);

const strongQuad = generateConjugation({
    root: 'q-r-t-s',
    form: 'I',
    strength: 'strong',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'i-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: false,
});

assertEq(buildPerfectForm(strongQuad.rows[0].perfect, strongQuad.rows[0].perfect_neg ?? strongQuad.rows[0].perfect, true, null, null, 'a-a', strongQuad.rows[0].stems, strongQuad.blocksImala || false, 'I'), 'ma qartastx', 'strong quadriliteral negative perfect 1s');
assertEq(buildPerfectForm(strongQuad.rows[2].perfect, strongQuad.rows[2].perfect_neg ?? strongQuad.rows[2].perfect, true, null, null, 'a-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'ma qartasx', 'strong quadriliteral negative perfect 3ms');
assertEq(buildPerfectForm(strongQuad.rows[3].perfect, strongQuad.rows[3].perfect_neg ?? strongQuad.rows[3].perfect, true, null, null, 'a-a', strongQuad.rows[3].stems, strongQuad.blocksImala || false, 'I'), 'ma qartsitx', 'strong quadriliteral negative perfect 3fs');
assertEq(buildPerfectForm(strongQuad.rows[4].perfect, strongQuad.rows[4].perfect_neg ?? strongQuad.rows[4].perfect, true, null, null, 'a-a', strongQuad.rows[4].stems, strongQuad.blocksImala || false, 'I'), 'ma qartasniex', 'strong quadriliteral negative perfect 1p');
assertEq(buildVerbForm(strongQuad.rows[0].imperfect, true, null, null, 'i-a', strongQuad.rows[0].stems, strongQuad.blocksImala || false, 'I'), 'ma nqartisx', 'strong quadriliteral negative imperfect 1s');
assertEq(buildVerbForm(strongQuad.rows[2].imperfect, true, null, null, 'i-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'ma jqartisx', 'strong quadriliteral negative imperfect 3ms');
assertEq(buildVerbForm(strongQuad.rows[4].imperfect, true, null, null, 'i-a', strongQuad.rows[4].stems, strongQuad.blocksImala || false, 'I'), 'ma nqartsux', 'strong quadriliteral negative imperfect 1p');
assertEq(buildPerfectForm(strongQuad.rows[2].perfect, strongQuad.rows[2].perfect_neg ?? strongQuad.rows[2].perfect, false, 1, null, 'a-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'qartsek', 'strong quadriliteral clitic perfect DO 3ms');
assertEq(buildPerfectForm(strongQuad.rows[2].perfect, strongQuad.rows[2].perfect_neg ?? strongQuad.rows[2].perfect, false, null, 3, 'a-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'qartsilha', 'strong quadriliteral clitic perfect IO 3ms');
assertEq(buildPerfectForm(strongQuad.rows[3].perfect, strongQuad.rows[3].perfect_neg ?? strongQuad.rows[3].perfect, false, 0, null, 'a-a', strongQuad.rows[3].stems, strongQuad.blocksImala || false, 'I'), 'qartsitni', 'strong quadriliteral clitic perfect DO 1s 3fs');
assertEq(buildPerfectForm(strongQuad.rows[3].perfect, strongQuad.rows[3].perfect_neg ?? strongQuad.rows[3].perfect, false, 1, null, 'a-a', strongQuad.rows[3].stems, strongQuad.blocksImala || false, 'I'), 'qartsitek', 'strong quadriliteral clitic perfect DO 2s 3fs');
assertEq(buildPerfectForm(strongQuad.rows[3].perfect, strongQuad.rows[3].perfect_neg ?? strongQuad.rows[3].perfect, true, 0, null, 'a-a', strongQuad.rows[3].stems, strongQuad.blocksImala || false, 'I'), 'ma qartsitnix', 'strong quadriliteral negative clitic perfect DO 1s 3fs');
assertEq(buildPerfectForm(strongQuad.rows[3].perfect, strongQuad.rows[3].perfect_neg ?? strongQuad.rows[3].perfect, true, 1, null, 'a-a', strongQuad.rows[3].stems, strongQuad.blocksImala || false, 'I'), 'ma qartsitekx', 'strong quadriliteral negative clitic perfect DO 2s 3fs');
assertEq(buildPerfectForm(strongQuad.rows[2].perfect, strongQuad.rows[2].perfect_neg ?? strongQuad.rows[2].perfect, true, 1, null, 'a-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'ma qartsekx', 'strong quadriliteral negative clitic perfect DO 3ms');

const temmekFormII = generateConjugation({
    root: 't-m-m',
    form: 'II',
    strength: 'geminated',
    vowelSetPerfect: 'e-e',
    vowelSetImperfect: 'e-e',
    vowelSetImperative: 'e-e',
    isImalaBlocked: false,
});
assertEq(buildPerfectForm(temmekFormII.rows[3].perfect, temmekFormII.rows[3].perfect_neg ?? temmekFormII.rows[3].perfect, false, 1, null, 'e-e', temmekFormII.rows[3].stems, temmekFormII.blocksImala || false, 'II'), 'temmitek', 'Form II 3fs perfect DO 2s should use attached -it stem');

const nesseFormII = generateConjugation({
    root: 'n-s-y',
    form: 'II',
    strength: 'weak',
    weakClass: 'defective',
    vowelSetPerfect: 'e-e',
    vowelSetImperfect: 'e-e',
    vowelSetImperative: 'e-e',
    isImalaBlocked: false,
});
assertEq(nesseFormII.imperative_sg, 'nesse', 'Form II defective singular imperative should keep the doubled stem');
assertEq(buildVerbForm(nesseFormII.imperative_sg, false, 1, null, 'e-e', nesseFormII.imperative_sg_stems, nesseFormII.blocksImala || false, 'II'), 'nessik', 'Form II defective suffixed singular imperative should not fall back to Form I stem');
assertEq(buildVerbForm(nesseFormII.imperative_sg, false, 5, null, 'e-e', nesseFormII.imperative_sg_stems, nesseFormII.blocksImala || false, 'II'), 'nessikom', 'Form II defective suffixed singular imperative should keep the doubled stem before -kom');

const formVDefective = generateConjugation({
    root: 'n-s-y',
    form: 'V',
    strength: 'weak',
    weakClass: 'defective',
    vowelSetPerfect: 'e-e',
    vowelSetImperfect: 'e-e',
    vowelSetImperative: 'e-e',
    isImalaBlocked: false,
});
assertEq(formVDefective.imperative_sg, 'tnesse', 'Form V defective singular imperative should keep the derived t- shape');
assertEq(buildVerbForm(formVDefective.imperative_sg, false, 5, null, 'e-e', formVDefective.imperative_sg_stems, formVDefective.blocksImala || false, 'V'), 'tnessikom', 'Form V defective suffixed singular imperative should not fall back to Form II stem');
assertEq(buildVerbForm(strongQuad.rows[2].imperfect, false, 1, null, 'i-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'jqartsek', 'strong quadriliteral clitic imperfect DO 3ms');
assertEq(buildVerbForm(strongQuad.rows[2].imperfect, false, null, 3, 'i-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'jqartsilha', 'strong quadriliteral clitic imperfect IO 3ms');
assertEq(buildVerbForm(strongQuad.rows[2].imperfect, true, null, 3, 'i-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'ma jqartsilhiex', 'strong quadriliteral negative clitic imperfect IO 3ms');
assertEq(buildVerbForm(strongQuad.imperative_sg, false, 1, null, 'a-a', strongQuad.imperative_sg_stems, strongQuad.blocksImala || false, 'I'), 'qartsek', 'strong quadriliteral clitic imperative DO');
assertEq(buildVerbForm(strongQuad.imperative_sg, false, null, 3, 'a-a', strongQuad.imperative_sg_stems, strongQuad.blocksImala || false, 'I'), 'qartsilha', 'strong quadriliteral clitic imperative IO');

const finalGħFormI = generateConjugation({
    root: 'r-f-għ',
    form: 'I',
    strength: 'strong-hybrid',
    vowelSetPerfect: 'e-a',
    vowelSetImperfect: 'e-a',
    vowelSetImperative: 'i-a',
    isImalaBlocked: true,
});
assertEq(finalGħFormI.rows[2].imperfect, "jerfa'", "Form I final-għ baseline should keep apostrophe in unsuffixed imperfect");
assertEq(buildVerbForm(finalGħFormI.rows[2].imperfect, false, 3, null, 'e-a', finalGħFormI.rows[2].stems, finalGħFormI.blocksImala || false, 'I'), 'jerfagħha', 'Form I final-għ baseline should use underlying għ before -ha');
assertEq(buildVerbForm(finalGħFormI.rows[2].imperfect, false, 1, null, 'e-a', finalGħFormI.rows[2].stems, finalGħFormI.blocksImala || false, 'I'), 'jerfgħek', 'Form I final-għ baseline should use syncopated għ before -ek');
assertEq(buildVerbForm(finalGħFormI.imperative_sg, false, 3, null, 'i-a', finalGħFormI.imperative_sg_stems, finalGħFormI.blocksImala || false, 'I'), 'irfagħha', 'Form I final-għ baseline imperative should use underlying għ before -ha');

const finalGħFormIIHybrid = generateConjugation({
    root: 'r-b-għ',
    form: 'II',
    strength: 'strong-hybrid',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'a-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: true,
});
assertEq(finalGħFormIIHybrid.rows[2].imperfect, "jrabba'", "Form II strong-hybrid should keep apostrophe in unsuffixed imperfect");
assertEq(finalGħFormIIHybrid.rows[2].perfect, "rabba'", "Form II strong-hybrid should keep apostrophe in unsuffixed perfect");
assertEq(buildVerbForm(finalGħFormIIHybrid.rows[2].imperfect, false, 3, null, 'a-a', finalGħFormIIHybrid.rows[2].stems, finalGħFormIIHybrid.blocksImala || false, 'II'), 'jrabbagħha', 'Form II strong-hybrid imperfect should use underlying għ before -ha');
assertEq(buildVerbForm(finalGħFormIIHybrid.rows[2].imperfect, false, 1, null, 'a-a', finalGħFormIIHybrid.rows[2].stems, finalGħFormIIHybrid.blocksImala || false, 'II'), 'jrabbgħek', 'Form II strong-hybrid imperfect should use syncopated għ before -ek');
assertEq(buildPerfectForm(finalGħFormIIHybrid.rows[2].perfect, finalGħFormIIHybrid.rows[2].perfect_neg ?? finalGħFormIIHybrid.rows[2].perfect, false, 3, null, 'a-a', finalGħFormIIHybrid.rows[2].stems, finalGħFormIIHybrid.blocksImala || false, 'II'), 'rabbagħha', 'Form II strong-hybrid perfect should use underlying għ before -ha');
assertEq(buildPerfectForm(finalGħFormIIHybrid.rows[2].perfect, finalGħFormIIHybrid.rows[2].perfect_neg ?? finalGħFormIIHybrid.rows[2].perfect, false, 1, null, 'a-a', finalGħFormIIHybrid.rows[2].stems, finalGħFormIIHybrid.blocksImala || false, 'II'), 'rabbgħek', 'Form II strong-hybrid perfect should use syncopated għ before -ek');
assertEq(buildVerbForm(finalGħFormIIHybrid.imperative_sg, false, 3, null, 'a-a', finalGħFormIIHybrid.imperative_sg_stems, finalGħFormIIHybrid.blocksImala || false, 'II'), 'rabbagħha', 'Form II strong-hybrid imperative should use underlying għ before -ha');
assertEq(buildVerbForm(finalGħFormIIHybrid.imperative_sg, false, 1, null, 'a-a', finalGħFormIIHybrid.imperative_sg_stems, finalGħFormIIHybrid.blocksImala || false, 'II'), 'rabbgħek', 'Form II strong-hybrid imperative should use syncopated għ before -ek');

const finalGħFormIIIHybrid = generateConjugation({
    root: 'q-t-għ',
    form: 'III',
    strength: 'strong-hybrid',
    vowelSetPerfect: 'ie-a',
    vowelSetImperfect: 'ie-a',
    vowelSetImperative: 'ie-a',
    isImalaBlocked: true,
});
assertEq(finalGħFormIIIHybrid.rows[2].imperfect, "jqieta'", "Form III strong-hybrid should keep apostrophe in unsuffixed imperfect");
assertEq(finalGħFormIIIHybrid.rows[2].perfect, "qieta'", "Form III strong-hybrid should keep apostrophe in unsuffixed perfect");
assertEq(buildVerbForm(finalGħFormIIIHybrid.rows[2].imperfect, false, 3, null, 'ie-a', finalGħFormIIIHybrid.rows[2].stems, finalGħFormIIIHybrid.blocksImala || false, 'III'), 'jqetagħha', 'Form III strong-hybrid imperfect should use underlying għ before -ha and keep Form III ie-shortening');
assertEq(buildVerbForm(finalGħFormIIIHybrid.rows[2].imperfect, false, 1, null, 'ie-a', finalGħFormIIIHybrid.rows[2].stems, finalGħFormIIIHybrid.blocksImala || false, 'III'), 'jqetgħek', 'Form III strong-hybrid imperfect should use syncopated għ before -ek and keep Form III ie-shortening');
assertEq(buildPerfectForm(finalGħFormIIIHybrid.rows[2].perfect, finalGħFormIIIHybrid.rows[2].perfect_neg ?? finalGħFormIIIHybrid.rows[2].perfect, false, 3, null, 'ie-a', finalGħFormIIIHybrid.rows[2].stems, finalGħFormIIIHybrid.blocksImala || false, 'III'), 'qetagħha', 'Form III strong-hybrid perfect should use underlying għ before -ha and keep Form III ie-shortening');
assertEq(buildPerfectForm(finalGħFormIIIHybrid.rows[2].perfect, finalGħFormIIIHybrid.rows[2].perfect_neg ?? finalGħFormIIIHybrid.rows[2].perfect, false, 1, null, 'ie-a', finalGħFormIIIHybrid.rows[2].stems, finalGħFormIIIHybrid.blocksImala || false, 'III'), 'qetgħek', 'Form III strong-hybrid perfect should use syncopated għ before -ek and keep Form III ie-shortening');
assertEq(buildVerbForm(finalGħFormIIIHybrid.imperative_sg, false, 3, null, 'ie-a', finalGħFormIIIHybrid.imperative_sg_stems, finalGħFormIIIHybrid.blocksImala || false, 'III'), 'qetagħha', 'Form III strong-hybrid imperative should use underlying għ before -ha and keep Form III ie-shortening');
assertEq(buildVerbForm(finalGħFormIIIHybrid.imperative_sg, false, 1, null, 'ie-a', finalGħFormIIIHybrid.imperative_sg_stems, finalGħFormIIIHybrid.blocksImala || false, 'III'), 'qetgħek', 'Form III strong-hybrid imperative should use syncopated għ before -ek and keep Form III ie-shortening');

const finalGħFormVHybrid = generateConjugation({
    root: 'r-b-għ',
    form: 'V',
    strength: 'strong-hybrid',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'a-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: true,
});
assertEq(finalGħFormVHybrid.rows[2].perfect, "trabba'", "Form V strong-hybrid should derive visible perfect from Form II hybrid");
assertEq(finalGħFormVHybrid.rows[2].imperfect, "jitrabba'", "Form V strong-hybrid should derive visible imperfect from Form II hybrid");
assertEq(finalGħFormVHybrid.imperative_sg, "trabba'", "Form V strong-hybrid should derive visible imperative from Form II hybrid");
assertEq(buildVerbForm(finalGħFormVHybrid.rows[2].imperfect, false, 3, null, 'a-a', finalGħFormVHybrid.rows[2].stems, finalGħFormVHybrid.blocksImala || false, 'V'), 'jitrabbagħha', 'Form V strong-hybrid imperfect should keep underlying għ before -ha');
assertEq(buildVerbForm(finalGħFormVHybrid.rows[2].imperfect, false, 1, null, 'a-a', finalGħFormVHybrid.rows[2].stems, finalGħFormVHybrid.blocksImala || false, 'V'), 'jitrabbgħek', 'Form V strong-hybrid imperfect should keep syncopated għ before -ek');
assertEq(buildPerfectForm(finalGħFormVHybrid.rows[2].perfect, finalGħFormVHybrid.rows[2].perfect_neg ?? finalGħFormVHybrid.rows[2].perfect, false, 3, null, 'a-a', finalGħFormVHybrid.rows[2].stems, finalGħFormVHybrid.blocksImala || false, 'V'), 'trabbagħha', 'Form V strong-hybrid perfect should keep underlying għ before -ha');

const finalGħFormVIHybrid = generateConjugation({
    root: 'q-t-għ',
    form: 'VI',
    strength: 'strong-hybrid',
    vowelSetPerfect: 'ie-a',
    vowelSetImperfect: 'ie-a',
    vowelSetImperative: 'ie-a',
    isImalaBlocked: true,
});
assertEq(finalGħFormVIHybrid.rows[2].perfect, "tqieta'", "Form VI strong-hybrid should derive visible perfect from Form III hybrid");
assertEq(finalGħFormVIHybrid.rows[2].imperfect, "jitqieta'", "Form VI strong-hybrid should derive visible imperfect from Form III hybrid");
assertEq(finalGħFormVIHybrid.imperative_sg, "tqieta'", "Form VI strong-hybrid should derive visible imperative from Form III hybrid");
assertEq(buildVerbForm(finalGħFormVIHybrid.rows[2].imperfect, false, 3, null, 'ie-a', finalGħFormVIHybrid.rows[2].stems, finalGħFormVIHybrid.blocksImala || false, 'VI'), 'jitqetagħha', 'Form VI strong-hybrid imperfect should keep underlying għ before -ha and Form VI ie-shortening');
assertEq(buildVerbForm(finalGħFormVIHybrid.rows[2].imperfect, false, 1, null, 'ie-a', finalGħFormVIHybrid.rows[2].stems, finalGħFormVIHybrid.blocksImala || false, 'VI'), 'jitqetgħek', 'Form VI strong-hybrid imperfect should keep syncopated għ before -ek and Form VI ie-shortening');
assertEq(buildPerfectForm(finalGħFormVIHybrid.rows[2].perfect, finalGħFormVIHybrid.rows[2].perfect_neg ?? finalGħFormVIHybrid.rows[2].perfect, false, 3, null, 'ie-a', finalGħFormVIHybrid.rows[2].stems, finalGħFormVIHybrid.blocksImala || false, 'VI'), 'tqetagħha', 'Form VI strong-hybrid perfect should keep underlying għ before -ha and Form VI ie-shortening');

const finalGħFormVIIHybrid = generateConjugation({
    root: 'r-f-għ',
    form: 'VII',
    strength: 'strong-hybrid',
    vowelSetPerfect: 'e-a',
    vowelSetImperfect: 'e-a',
    vowelSetImperative: 'i-a',
    isImalaBlocked: true,
});
assertEq(finalGħFormVIIHybrid.rows[2].perfect, 'nrefa', "Form VII strong-hybrid should derive visible perfect from Form I hybrid");
assertEq(finalGħFormVIIHybrid.rows[2].imperfect, "jinrefa'", "Form VII strong-hybrid should derive visible imperfect from Form I hybrid");
assertEq(finalGħFormVIIHybrid.imperative_sg, "nirfa'", "Form VII strong-hybrid should derive visible imperative from Form I hybrid");
assertEq(buildVerbForm(finalGħFormVIIHybrid.rows[2].imperfect, false, 3, null, 'e-a', finalGħFormVIIHybrid.rows[2].stems, finalGħFormVIIHybrid.blocksImala || false, 'VII'), 'jinrefagħha', 'Form VII strong-hybrid imperfect should keep underlying għ before -ha');
assertEq(buildVerbForm(finalGħFormVIIHybrid.rows[2].imperfect, false, 1, null, 'e-a', finalGħFormVIIHybrid.rows[2].stems, finalGħFormVIIHybrid.blocksImala || false, 'VII'), 'jinrefgħek', 'Form VII strong-hybrid imperfect should keep syncopated għ before -ek');
assertEq(buildPerfectForm(finalGħFormVIIHybrid.rows[2].perfect, finalGħFormVIIHybrid.rows[2].perfect_neg ?? finalGħFormVIIHybrid.rows[2].perfect, false, 3, null, 'e-a', finalGħFormVIIHybrid.rows[2].stems, finalGħFormVIIHybrid.blocksImala || false, 'VII'), 'nrefagħha', 'Form VII strong-hybrid perfect should keep underlying għ before -ha');

const finalGħFormXaHybrid = generateConjugation({
    root: 'r-f-għ',
    form: 'Xa',
    strength: 'strong-hybrid',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'a-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: true,
});
assertEq(finalGħFormXaHybrid.rows[2].perfect, 'starfa', "Form Xa strong-hybrid should follow Form I final-għ perfect surface behavior");
assertEq(finalGħFormXaHybrid.rows[2].imperfect, "jistarfa'", "Form Xa strong-hybrid should follow Form I final-għ imperfect apostrophe behavior");
assertEq(finalGħFormXaHybrid.imperative_sg, "starfa'", "Form Xa strong-hybrid should follow Form I final-għ imperative apostrophe behavior");
assertEq(buildVerbForm(finalGħFormXaHybrid.rows[2].imperfect, false, 3, null, 'a-a', finalGħFormXaHybrid.rows[2].stems, finalGħFormXaHybrid.blocksImala || false, 'Xa'), 'jistarfagħha', 'Form Xa strong-hybrid imperfect should keep underlying għ before -ha');
assertEq(buildVerbForm(finalGħFormXaHybrid.rows[2].imperfect, false, 1, null, 'a-a', finalGħFormXaHybrid.rows[2].stems, finalGħFormXaHybrid.blocksImala || false, 'Xa'), 'jistarfgħek', 'Form Xa strong-hybrid imperfect should keep syncopated għ before -ek');
assertEq(buildPerfectForm(finalGħFormXaHybrid.rows[2].perfect, finalGħFormXaHybrid.rows[2].perfect_neg ?? finalGħFormXaHybrid.rows[2].perfect, false, 3, null, 'a-a', finalGħFormXaHybrid.rows[2].stems, finalGħFormXaHybrid.blocksImala || false, 'Xa'), 'starfagħha', 'Form Xa strong-hybrid perfect should keep underlying għ before -ha');

const finalGħFormXbHybrid = generateConjugation({
    root: 'r-b-għ',
    form: 'Xb',
    strength: 'strong-hybrid',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'a-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: true,
});
assertEq(finalGħFormXbHybrid.rows[2].perfect, "strabba'", "Form Xb strong-hybrid should derive visible perfect from Form II hybrid");
assertEq(finalGħFormXbHybrid.rows[2].imperfect, "jistrabba'", "Form Xb strong-hybrid should derive visible imperfect from Form II hybrid");
assertEq(finalGħFormXbHybrid.imperative_sg, "strabba'", "Form Xb strong-hybrid should derive visible imperative from Form II hybrid");
assertEq(buildVerbForm(finalGħFormXbHybrid.rows[2].imperfect, false, 3, null, 'a-a', finalGħFormXbHybrid.rows[2].stems, finalGħFormXbHybrid.blocksImala || false, 'Xb'), 'jistrabbagħha', 'Form Xb strong-hybrid imperfect should keep underlying għ before -ha');
assertEq(buildVerbForm(finalGħFormXbHybrid.rows[2].imperfect, false, 1, null, 'a-a', finalGħFormXbHybrid.rows[2].stems, finalGħFormXbHybrid.blocksImala || false, 'Xb'), 'jistrabbgħek', 'Form Xb strong-hybrid imperfect should keep syncopated għ before -ek');
assertEq(buildPerfectForm(finalGħFormXbHybrid.rows[2].perfect, finalGħFormXbHybrid.rows[2].perfect_neg ?? finalGħFormXbHybrid.rows[2].perfect, false, 3, null, 'a-a', finalGħFormXbHybrid.rows[2].stems, finalGħFormXbHybrid.blocksImala || false, 'Xb'), 'strabbagħha', 'Form Xb strong-hybrid perfect should keep underlying għ before -ha');

const formVAssimilatedT = generateConjugation({
    root: 's-l-m',
    form: 'V',
    strength: 'strong',
    vowelSetPerfect: 'e-e',
    vowelSetImperfect: 'i-e',
    vowelSetImperative: 'e-e',
    isImalaBlocked: false,
});
assertEq(formVAssimilatedT.rows[0].imperfect, 'nissillem', 'Form V derivational t should assimilate after n-i');
assertEq(formVAssimilatedT.rows[1].imperfect, 'tissillem', 'Form V derivational t should assimilate after t-i');
assertEq(formVAssimilatedT.rows[2].imperfect, 'jissillem', 'Form V derivational t should assimilate after j-i');
assertEq(formVAssimilatedT.rows[2].perfect, 'ssellem', 'Form V 3ms perfect should assimilate derivational t');
assertEq(formVAssimilatedT.imperative_sg, 'ssellem', 'Form V singular imperative should assimilate derivational t');

const formVIAssimilatedT = generateConjugation({
    root: 's-l-m',
    form: 'VI',
    strength: 'strong',
    vowelSetPerfect: 'e-e',
    vowelSetImperfect: 'i-e',
    vowelSetImperative: 'e-e',
    isImalaBlocked: false,
});
assertEq(formVIAssimilatedT.rows[0].imperfect, 'nissilem', 'Form VI derivational t should assimilate after n-i');
assertEq(formVIAssimilatedT.rows[1].imperfect, 'tissilem', 'Form VI derivational t should assimilate after t-i');
assertEq(formVIAssimilatedT.rows[2].imperfect, 'jissilem', 'Form VI derivational t should assimilate after j-i');
assertEq(formVIAssimilatedT.rows[2].perfect, 'sselem', 'Form VI 3ms perfect should assimilate derivational t');
assertEq(formVIAssimilatedT.imperative_sg, 'sselem', 'Form VI singular imperative should assimilate derivational t');

const formIVHareg = generateConjugation({
    root: 'ħ-r-ġ',
    form: 'IV',
    strength: 'strong',
    vowelSetPerfect: 'o-o',
    vowelSetImperfect: 'o-o',
    vowelSetImperative: 'o-o',
    isImalaBlocked: false,
});
assertEq(formIVHareg.rows[2].imperfect, 'joħroġ', 'Form IV sonorant C2 should keep singular visible imperfect');
assertEq(formIVHareg.rows[4].imperfect, 'noħorġu', 'Form IV sonorant C2 1p imperfect should metathesize the theme vowel');
assertEq(formIVHareg.rows[5].imperfect, 'toħorġu', 'Form IV sonorant C2 2p imperfect should metathesize the theme vowel');
assertEq(formIVHareg.rows[6].imperfect, 'joħorġu', 'Form IV sonorant C2 3p imperfect should metathesize the theme vowel');
assertEq(formIVHareg.imperative_sg, 'oħroġ', 'Form IV sonorant C2 should keep singular visible imperative');
assertEq(formIVHareg.imperative_pl, 'oħorġu', 'Form IV sonorant C2 plural imperative should metathesize the theme vowel');
assertEq(formIVHareg.rows[2].stems.syncopated, 'joħorġ', 'Form IV sonorant C2 3ms syncopated stem should not expose raw oħrġ');
assertEq(formIVHareg.rows[6].stems.syncopated, 'joħorġu', 'Form IV sonorant C2 3p syncopated stem should not expose raw oħrġ');
assertEq(formIVHareg.imperative_sg_stems?.syncopated, 'oħorġ', 'Form IV sonorant C2 imperative singular syncopated stem should not expose raw oħrġ');
assertEq(formIVHareg.imperative_pl_stems?.syncopated, 'oħorġu', 'Form IV sonorant C2 imperative plural syncopated stem should not expose raw oħrġ');
assertEq(buildVerbForm(formIVHareg.rows[2].imperfect, false, 1, null, 'o-o', formIVHareg.rows[2].stems, formIVHareg.blocksImala || false, 'IV'), 'joħorġok', 'Form IV sonorant C2 suffixed imperfect should use metathesized syncopated stem');
assertEq(buildVerbForm(formIVHareg.imperative_sg, false, 1, null, 'o-o', formIVHareg.imperative_sg_stems, formIVHareg.blocksImala || false, 'IV'), 'oħorġok', 'Form IV sonorant C2 suffixed imperative should use metathesized syncopated stem');
assertEq(formIVHareg.rows[2].perfect, 'oħroġ', 'Form IV sonorant C2 should keep singular visible perfect');
assertEq(formIVHareg.rows[3].perfect, 'oħorġet', 'Form IV sonorant C2 3fs perfect should metathesize the syncopated stem');
assertEq(formIVHareg.rows[6].perfect, 'oħorġu', 'Form IV sonorant C2 3p perfect should metathesize the syncopated stem');
assertEq(formIVHareg.rows[2].stems.perfectSyncopated, 'oħorġ', 'Form IV sonorant C2 3ms perfect syncopated stem should not expose raw oħrġ');
assertEq(formIVHareg.rows[3].stems.perfectAttached, 'oħorġit', 'Form IV sonorant C2 3fs perfect attached stem should not expose raw oħrġ');
assertEq(buildPerfectForm(formIVHareg.rows[2].perfect, formIVHareg.rows[2].perfect_neg ?? formIVHareg.rows[2].perfect, false, 2, null, 'o-o', formIVHareg.rows[2].stems, formIVHareg.blocksImala || false, 'IV'), 'oħorġu', 'Form IV sonorant C2 3ms perfect with DO -u should use metathesized syncopated stem');
assertEq(buildPerfectForm(formIVHareg.rows[3].perfect, formIVHareg.rows[3].perfect_neg ?? formIVHareg.rows[3].perfect, false, 2, null, 'o-o', formIVHareg.rows[3].stems, formIVHareg.blocksImala || false, 'IV'), 'oħorġitu', 'Form IV sonorant C2 3fs perfect with DO -u should use metathesized attached stem');
assertEq(buildPerfectForm(formIVHareg.rows[6].perfect, formIVHareg.rows[6].perfect_neg ?? formIVHareg.rows[6].perfect, false, 2, null, 'o-o', formIVHareg.rows[6].stems, formIVHareg.blocksImala || false, 'IV'), 'oħorġuh', 'Form IV sonorant C2 3p perfect with DO -u should use metathesized plural stem');

const formIVControl = generateConjugation({
    root: 'k-t-b',
    form: 'IV',
    strength: 'strong',
    vowelSetPerfect: 'i-e',
    vowelSetImperfect: 'i-e',
    vowelSetImperative: 'i-e',
    isImalaBlocked: false,
});
assertEq(formIVControl.rows[6].imperfect, 'jiktbu', 'Form IV non-sonorant C2 control should keep existing syncopated plural');
assertEq(formIVControl.imperative_pl, 'iktbu', 'Form IV non-sonorant C2 control should keep existing syncopated imperative plural');

const strongQuadGharghar = generateConjugation({
    root: 'għ-r-għ-r',
    form: 'I',
    strength: 'strong',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'i-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: false,
});

assertEq(strongQuadGharghar.rows[3].perfect, 'għargħret', 'strong quadriliteral għargħar 3fs perfect');
assertEq(
    buildPerfectForm(
        strongQuadGharghar.rows[3].perfect,
        strongQuadGharghar.rows[3].perfect_neg ?? strongQuadGharghar.rows[3].perfect,
        false,
        null,
        0,
        'a-a',
        strongQuadGharghar.rows[3].stems,
        strongQuadGharghar.blocksImala || false,
        'I',
    ),
    'għargħritli',
    'strong quadriliteral għargħar clitic perfect IO 3fs',
);
assertEq(
    buildPerfectForm(
        strongQuadGharghar.rows[3].perfect,
        strongQuadGharghar.rows[3].perfect_neg ?? strongQuadGharghar.rows[3].perfect,
        true,
        null,
        0,
        'a-a',
        strongQuadGharghar.rows[3].stems,
        strongQuadGharghar.blocksImala || false,
        'I',
    ),
    'ma għargħritlix',
    'strong quadriliteral għargħar negative clitic perfect IO 3fs',
);

verifyQuadriliteralConjugation(
    'quadriliteral defective conjugation',
    {
        root: 's-q-s-w',
        form: 'I',
        strength: 'weak',
        weakClass: 'defective',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'i-a',
        vowelSetImperative: 'a-a',
        isImalaBlocked: false,
    },
    {
        imperative_sg: 'saqsi',
        imperative_pl: 'saqsu',
        row3ms: {
            perfect: 'saqsa',
            imperfect: 'jsaqsi',
            perfect_neg: 'saqsa',
        },
        row1s: {
            perfect: 'saqsejt',
            imperfect: 'nsaqsi',
        },
    }
);

verifyQuadriliteralConjugation(
    'quadriliteral defective conjugation form II',
    {
        root: 's-q-s-w',
        form: 'II',
        strength: 'weak',
        weakClass: 'defective',
        vowelSetPerfect: 'a-a',
        vowelSetImperfect: 'i-a',
        vowelSetImperative: 'a-a',
        isImalaBlocked: false,
    },
    {
        imperative_sg: 'ssaqsi',
        imperative_pl: 'ssaqsu',
        row3ms: {
            perfect: 'ssaqsa',
            imperfect: 'jissaqsi',
            perfect_neg: 'ssaqsa',
        },
        row1s: {
            perfect: 'ssaqsejt',
            imperfect: 'jissaqsi',
        },
    }
);

const weakQuadFormI = generateConjugation({
    root: 's-q-s-w',
    form: 'I',
    strength: 'weak',
    weakClass: 'defective',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'i-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: false,
});

assertEq(weakQuadFormI.rows[0].perfect, 'saqsejt', 'weak quadriliteral Form I 1s perfect');
assertEq(weakQuadFormI.rows[1].perfect, 'saqsejt', 'weak quadriliteral Form I 2s perfect');
assertEq(weakQuadFormI.rows[2].perfect, 'saqsa', 'weak quadriliteral Form I 3ms perfect');
assertEq(weakQuadFormI.rows[3].perfect, 'saqsiet', 'weak quadriliteral Form I 3fs perfect');
assertEq(weakQuadFormI.rows[4].perfect, 'saqsejna', 'weak quadriliteral Form I 1p perfect');
assertEq(weakQuadFormI.rows[5].perfect, 'saqsejtu', 'weak quadriliteral Form I 2p perfect');
assertEq(weakQuadFormI.rows[6].perfect, 'saqsew', 'weak quadriliteral Form I 3p perfect');
assertEq(weakQuadFormI.rows[0].imperfect, 'nsaqsi', 'weak quadriliteral Form I 1s imperfect');
assertEq(weakQuadFormI.rows[1].imperfect, 'ssaqsi', 'weak quadriliteral Form I 2s imperfect');
assertEq(weakQuadFormI.rows[2].imperfect, 'jsaqsi', 'weak quadriliteral Form I 3ms imperfect');
assertEq(weakQuadFormI.rows[3].imperfect, 'ssaqsi', 'weak quadriliteral Form I 3fs imperfect');
assertEq(weakQuadFormI.rows[4].imperfect, 'nsaqsu', 'weak quadriliteral Form I 1p imperfect');
assertEq(weakQuadFormI.rows[5].imperfect, 'ssaqsu', 'weak quadriliteral Form I 2p imperfect');
assertEq(weakQuadFormI.rows[6].imperfect, 'jsaqsu', 'weak quadriliteral Form I 3p imperfect');
assertEq(buildPerfectForm(weakQuadFormI.rows[2].perfect, weakQuadFormI.rows[2].perfect_neg ?? weakQuadFormI.rows[2].perfect, false, 0, null, 'a-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'saqsini', 'weak quadriliteral clitic perfect DO 1s');
assertEq(buildPerfectForm(weakQuadFormI.rows[2].perfect, weakQuadFormI.rows[2].perfect_neg ?? weakQuadFormI.rows[2].perfect, false, 2, null, 'a-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'saqsih', 'weak quadriliteral clitic perfect DO 3ms');
assertEq(buildPerfectForm(weakQuadFormI.rows[3].perfect, weakQuadFormI.rows[3].perfect_neg ?? weakQuadFormI.rows[3].perfect, false, 0, null, 'a-a', weakQuadFormI.rows[3].stems, weakQuadFormI.blocksImala || false, 'I'), 'saqsitni', 'weak quadriliteral clitic perfect DO 1s 3fs');
assertEq(buildPerfectForm(weakQuadFormI.rows[2].perfect, weakQuadFormI.rows[2].perfect_neg ?? weakQuadFormI.rows[2].perfect, false, 1, null, 'a-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'saqsik', 'weak quadriliteral clitic perfect DO 2s');
assertEq(buildPerfectForm(weakQuadFormI.rows[2].perfect, weakQuadFormI.rows[2].perfect_neg ?? weakQuadFormI.rows[2].perfect, false, null, 3, 'a-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'saqsilha', 'weak quadriliteral clitic perfect IO 3ms');
assertEq(buildPerfectForm(weakQuadFormI.rows[2].perfect, weakQuadFormI.rows[2].perfect_neg ?? weakQuadFormI.rows[2].perfect, true, 1, null, 'a-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'ma saqsikx', 'weak quadriliteral negative clitic perfect DO 2s');
assertEq(buildPerfectForm(weakQuadFormI.rows[2].perfect, weakQuadFormI.rows[2].perfect_neg ?? weakQuadFormI.rows[2].perfect, true, 0, null, 'a-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'ma saqsinix', 'weak quadriliteral negative clitic perfect DO 1s');
assertEq(buildPerfectForm(weakQuadFormI.rows[2].perfect, weakQuadFormI.rows[2].perfect_neg ?? weakQuadFormI.rows[2].perfect, true, 2, null, 'a-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'ma saqsihx', 'weak quadriliteral negative clitic perfect DO 3ms');
assertEq(buildPerfectForm(weakQuadFormI.rows[3].perfect, weakQuadFormI.rows[3].perfect_neg ?? weakQuadFormI.rows[3].perfect, true, 0, null, 'a-a', weakQuadFormI.rows[3].stems, weakQuadFormI.blocksImala || false, 'I'), 'ma saqsitnix', 'weak quadriliteral negative clitic perfect DO 1s 3fs');
assertEq(buildVerbForm(weakQuadFormI.rows[2].imperfect, false, 1, null, 'i-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'jsaqsik', 'weak quadriliteral clitic imperfect DO 3ms');
assertEq(buildVerbForm(weakQuadFormI.rows[2].imperfect, false, null, 3, 'i-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'jsaqsilha', 'weak quadriliteral clitic imperfect IO 3ms');
assertEq(buildVerbForm(weakQuadFormI.rows[2].imperfect, true, null, 3, 'i-a', weakQuadFormI.rows[2].stems, weakQuadFormI.blocksImala || false, 'I'), 'ma jsaqsilhiex', 'weak quadriliteral negative clitic imperfect IO 3ms');
assertEq(buildVerbForm(weakQuadFormI.imperative_sg, false, 1, null, 'a-a', weakQuadFormI.imperative_sg_stems, weakQuadFormI.blocksImala || false, 'I'), 'saqsik', 'weak quadriliteral clitic imperative DO');
assertEq(buildVerbForm(weakQuadFormI.imperative_sg, false, null, 3, 'a-a', weakQuadFormI.imperative_sg_stems, weakQuadFormI.blocksImala || false, 'I'), 'saqsilha', 'weak quadriliteral clitic imperative IO');

const weakQuadFormII = generateConjugation({
    root: 's-q-s-w',
    form: 'II',
    strength: 'weak',
    weakClass: 'defective',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'i-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: false,
});

assertEq(weakQuadFormII.rows[0].perfect, 'ssaqsejt', 'weak quadriliteral Form II 1s perfect');
assertEq(weakQuadFormII.rows[1].perfect, 'ssaqsejt', 'weak quadriliteral Form II 2s perfect');
assertEq(weakQuadFormII.rows[2].perfect, 'ssaqsa', 'weak quadriliteral Form II 3ms perfect');
assertEq(weakQuadFormII.rows[3].perfect, 'ssaqsiet', 'weak quadriliteral Form II 3fs perfect');
assertEq(weakQuadFormII.rows[4].perfect, 'ssaqsejna', 'weak quadriliteral Form II 1p perfect');
assertEq(weakQuadFormII.rows[5].perfect, 'ssaqsejtu', 'weak quadriliteral Form II 2p perfect');
assertEq(weakQuadFormII.rows[6].perfect, 'ssaqsew', 'weak quadriliteral Form II 3p perfect');
assertEq(weakQuadFormII.rows[0].imperfect, 'jissaqsi', 'weak quadriliteral Form II 1s imperfect');
assertEq(weakQuadFormII.rows[1].imperfect, 'jissaqsi', 'weak quadriliteral Form II 2s imperfect');
assertEq(weakQuadFormII.rows[2].imperfect, 'jissaqsi', 'weak quadriliteral Form II 3ms imperfect');
assertEq(weakQuadFormII.rows[3].imperfect, 'jissaqsi', 'weak quadriliteral Form II 3fs imperfect');
assertEq(weakQuadFormII.rows[4].imperfect, 'jissaqsu', 'weak quadriliteral Form II 1p imperfect');
assertEq(weakQuadFormII.rows[5].imperfect, 'jissaqsu', 'weak quadriliteral Form II 2p imperfect');
assertEq(weakQuadFormII.rows[6].imperfect, 'jissaqsu', 'weak quadriliteral Form II 3p imperfect');

const hollowBlocked = generateConjugation({
    root: 'd-w-r',
    form: 'II',
    strength: 'weak',
    weakClass: 'hollow',
    vowelSetPerfect: 'a-a',
    vowelSetImperfect: 'a-a',
    vowelSetImperative: 'a-a',
    isImalaBlocked: true,
});

assertEq(hollowBlocked.blocksImala, true, 'blocked hollow Form II should expose blocked metadata');
assertEq(hollowBlocked.rows[0].perfect, 'dawwart', 'blocked hollow Form II 1s perfect');
assertEq(hollowBlocked.rows[1].perfect, 'dawwart', 'blocked hollow Form II 2s perfect');
assertEq(hollowBlocked.rows[2].perfect, 'dawwar', 'blocked hollow Form II 3ms perfect');
assertEq(hollowBlocked.rows[4].perfect, 'dawwarna', 'blocked hollow Form II 1p perfect');
assertEq(hollowBlocked.rows[5].perfect, 'dawwartu', 'blocked hollow Form II 2p perfect');

const weakQuadRootFormsII = generateRootForms('s-q-s-w', 'a-a', 'i-a', 'weak', 'defective');
assertEq(weakQuadRootFormsII[1].verbalNoun, 'ssaqsija', 'weak quadriliteral Form II verbal noun');

const triliteralForms = generateRootForms('k-t-b', 'e-e', 'i-e', 'strong');
assertEq(triliteralForms.length, 11, 'triliteral regression should still return 11 forms');
assertEq(triliteralForms[0].form, 'I', 'triliteral regression first form should be I');
assertEq(triliteralForms[triliteralForms.length - 1].form, 'Xb', 'triliteral regression last form should be Xb');

const slemRootForms = generateRootForms('s-l-m', 'e-e', 'i-e', 'strong');
const slemFormV = slemRootForms.find((form) => form.form === 'V');
const slemFormVI = slemRootForms.find((form) => form.form === 'VI');
assertEq(slemFormV?.perfect, 'ssellem', 'generated Form V root-form perfect should assimilate derivational t');
assertEq(slemFormV?.imperfect, 'jissellem', 'generated Form V root-form imperfect should assimilate derivational t');
assertEq(slemFormV?.imperative, 'ssellem', 'generated Form V root-form imperative should assimilate derivational t');
assertEq(slemFormV?.passiveParticiple, 'missellem', 'generated Form V passive participle should assimilate derivational t');
assertEq(slemFormV?.verbalNoun, 'ssellim', 'generated Form V verbal noun should assimilate derivational t');
assertEq(slemFormVI?.perfect, 'ssielem', 'generated Form VI root-form perfect should assimilate derivational t');
assertEq(slemFormVI?.imperfect, 'jissielem', 'generated Form VI root-form imperfect should assimilate derivational t');
assertEq(slemFormVI?.imperative, 'ssielem', 'generated Form VI root-form imperative should assimilate derivational t');
assertEq(slemFormVI?.passiveParticiple, 'missielem', 'generated Form VI passive participle should assimilate derivational t');
assertEq(slemFormVI?.verbalNoun, 'ssielim', 'generated Form VI verbal noun should assimilate derivational t');

console.log('quadriliteral root-form tests passed');
