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
assertEq(buildVerbForm(strongQuad.rows[2].imperfect, false, 1, null, 'i-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'jqartsek', 'strong quadriliteral clitic imperfect DO 3ms');
assertEq(buildVerbForm(strongQuad.rows[2].imperfect, false, null, 3, 'i-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'jqartsilha', 'strong quadriliteral clitic imperfect IO 3ms');
assertEq(buildVerbForm(strongQuad.rows[2].imperfect, true, null, 3, 'i-a', strongQuad.rows[2].stems, strongQuad.blocksImala || false, 'I'), 'ma jqartsilhiex', 'strong quadriliteral negative clitic imperfect IO 3ms');
assertEq(buildVerbForm(strongQuad.imperative_sg, false, 1, null, 'a-a', strongQuad.imperative_sg_stems, strongQuad.blocksImala || false, 'I'), 'qartsek', 'strong quadriliteral clitic imperative DO');
assertEq(buildVerbForm(strongQuad.imperative_sg, false, null, 3, 'a-a', strongQuad.imperative_sg_stems, strongQuad.blocksImala || false, 'I'), 'qartsilha', 'strong quadriliteral clitic imperative IO');

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

console.log('quadriliteral root-form tests passed');
