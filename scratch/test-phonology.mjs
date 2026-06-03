import { deriveMasculineFromFeminine } from '../src/lib/maltesePhonology.ts';

const words = [
    'kbira',      // kbir
    'sabiħa',     // sabiħ
    'twila',      // twil
    'safra',      // safer
    'ħamra',      // ħamer
    'Maltija',    // malti
    'kelliema',   // kelliem
    'għammiela',  // għammiel
    'għalliema',  // għalliem
    'ħelwa',      // ħelw -> ħelew (correct: ħelu)
    'ħafifa',     // ħafif
    'twajba',     // twajjeb
    'newwiela',   // newwiel
    'żgħira',     // żgħir
];

words.forEach(w => {
    console.log(`${w} -> ${deriveMasculineFromFeminine(w)}`);
});
process.exit(0);
