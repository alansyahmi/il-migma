import { generateConjugation } from '../src/lib/conjugationEngine.js';

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
