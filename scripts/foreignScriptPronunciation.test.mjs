import assert from 'node:assert/strict';
import {
    generateForeignScriptPronunciation,
    transliterateBerberToMaltesePronunciation,
    transliterateArabicToMaltesePronunciation,
    transliterateGreekToMaltesePronunciation,
    transliterateItalianToMaltesePronunciation,
    transliterateSicilianToMaltesePronunciation,
} from '../src/lib/foreignScriptPronunciation.ts';

const assertEq = (actual, expected, message) => {
    assert.deepStrictEqual(actual, expected, message);
};

const run = () => {
    assertEq(
        transliterateArabicToMaltesePronunciation('كَتَبَ'),
        'kataba',
        'vocalized Arabic should transliterate into flat Maltese orthography',
    );

    assertEq(
        transliterateArabicToMaltesePronunciation('كِتَاب'),
        'kitâb',
        'Arabic madd letters should lengthen the preceding vowel',
    );

    assertEq(
        transliterateArabicToMaltesePronunciation('أَبْيَض'),
        'abyaḍ',
        'Arabic words with yod should keep a flat pronunciation string',
    );

    assertEq(transliterateArabicToMaltesePronunciation('ثَ'), 'θa', 'tha should map to theta');
    assertEq(transliterateArabicToMaltesePronunciation('ذَ'), 'đa', 'dhal should map to đ');
    assertEq(transliterateArabicToMaltesePronunciation('غَ'), 'gha', 'ghayn should map to gh');
    assertEq(transliterateArabicToMaltesePronunciation('بَة'), 'baẗ', 'ta marbuta should map to ẗ');
    assertEq(transliterateArabicToMaltesePronunciation('ءَ'), "'a", 'hamza should map to apostrophe');

    // Demonstratives, initial alif vowels, dagger alif, and tanwin
    assertEq(transliterateArabicToMaltesePronunciation('هٰذَا'), 'hâđâ', 'dagger alif should lengthen vowel to â');
    assertEq(transliterateArabicToMaltesePronunciation('ذَا'), 'đâ', 'dha should map to đâ');
    assertEq(transliterateArabicToMaltesePronunciation('ذِي'), 'đî', 'dhi should map to đî');
    assertEq(transliterateArabicToMaltesePronunciation('ذَو'), 'đaw', 'fatha before waw should form diphthong aw');
    assertEq(transliterateArabicToMaltesePronunciation('شَيْئًا'), "shay'an", 'hamza on ya carrier with tanwin fath should map to shay\'an');
    assertEq(transliterateArabicToMaltesePronunciation('أَبَدًا'), 'abadan', 'tanwin fath with terminal alif should produce an');
    assertEq(transliterateArabicToMaltesePronunciation('آخَر'), 'âkhar', 'madda alif should produce â');
    assertEq(transliterateArabicToMaltesePronunciation('أُخْرَى'), 'ukhrâ', 'alif with damma should produce u');
    assertEq(transliterateArabicToMaltesePronunciation('إِنْ كَانَ'), 'in kâna', 'alif with kasra should produce i');
    assertEq(transliterateArabicToMaltesePronunciation('إِذْ ذَا'), 'iđ đâ', 'alif with kasra in idh dha');
    assertEq(transliterateArabicToMaltesePronunciation('إِلَى كَمْ'), 'ilâ kam', 'alif with kasra in ila kam');
    assertEq(transliterateArabicToMaltesePronunciation('بِأَيِّ شَيْء'), "bi'ayyi shay'", 'medial hamza on alif in bi-ayyi shay');

    // Arabic alif lam (al-) article handling
    assertEq(transliterateArabicToMaltesePronunciation('اَلْ'), 'al-', 'standalone alif lam with sukūn should produce al-');
    assertEq(transliterateArabicToMaltesePronunciation('اَلْـ'), 'al-', 'standalone alif lam with tatweel should produce al-');
    assertEq(transliterateArabicToMaltesePronunciation('الـ'), 'al-', 'bare alif lam with tatweel should produce al-');
    assertEq(transliterateArabicToMaltesePronunciation('عَلَى + اَلْ'), 'għalâ + al-', 'preposition compounded with al- should preserve hyphen');
    assertEq(transliterateArabicToMaltesePronunciation('الْوَقْت'), 'al-waqt', 'prefixed article should hyphenate as al-');
    assertEq(transliterateArabicToMaltesePronunciation('الْمَكان'), 'al-makân', 'prefixed article before mīm should hyphenate as al-');
    assertEq(transliterateArabicToMaltesePronunciation('الْجُمْعَة'), 'al-ġumgħaẗ', 'prefixed article before jīm should hyphenate as al-');
    assertEq(transliterateArabicToMaltesePronunciation('النَّهَار'), 'al-nahâr', 'prefixed article before sun letter should be written as al-');
    assertEq(transliterateArabicToMaltesePronunciation('الثُّلَاثَاء'), 'al-θulâθâ\'', 'prefixed article before thā should be written as al-');
    assertEq(transliterateArabicToMaltesePronunciation('اَلَّذِي'), 'allađî', 'relative pronoun should produce solid allađî');

    assertEq(transliterateGreekToMaltesePronunciation('Αθήνα'), 'atina', 'Greek theta should flatten to t');
    assertEq(transliterateGreekToMaltesePronunciation('αυτο'), 'afto', 'Greek αυ should become af before voiceless consonants');
    assertEq(transliterateGreekToMaltesePronunciation('αυλή'), 'avli', 'Greek αυ should become av before voiced consonants');
    assertEq(transliterateGreekToMaltesePronunciation('μπάλα'), 'bala', 'Greek initial μπ should become b');
    assertEq(transliterateGreekToMaltesePronunciation('Γιώργος'), 'jorgos', 'Greek gamma before iota should sound Maltese-like');
    assertEq(transliterateGreekToMaltesePronunciation('Αυγή'), 'avji', 'Greek gamma before eta should soften to j');
    assertEq(transliterateGreekToMaltesePronunciation('ευχή'), 'efħi', 'Greek chi should collapse to a Maltese rough consonant');

    assertEq(transliterateBerberToMaltesePronunciation('ⴰⵣⵓⵍ'), 'ażul', 'Tifinagh z should become Maltese ż');
    assertEq(transliterateBerberToMaltesePronunciation('ⵜⴰⵎⴰⵣⵉⵖⵜ'), 'tamażigħt', 'Berber ghayn should map to għ in Maltese style');
    assertEq(transliterateBerberToMaltesePronunciation('ⵄ'), 'għ', 'Berber pharyngeal should map to għ');

    assertEq(transliterateItalianToMaltesePronunciation('cena'), 'ċena', 'Italian soft c should become ċ');
    assertEq(transliterateItalianToMaltesePronunciation('sciare'), 'xare', 'Italian sci should become Maltese x');
    assertEq(transliterateItalianToMaltesePronunciation('gnocchi'), 'njokki', 'Italian gn should become nj');

    assertEq(transliterateSicilianToMaltesePronunciation('cena'), 'xena', 'Sicilian soft c should become x');
    assertEq(transliterateSicilianToMaltesePronunciation('famigghia'), 'famiġġia', 'Sicilian ggh should become ġġ');
    assertEq(transliterateSicilianToMaltesePronunciation('cchiu'), 'kkiu', 'Sicilian cch should become kk');

    assertEq(
        generateForeignScriptPronunciation({ language: 'Arabic', term: 'كَتَبَ' }),
        'kataba',
        'Arabic etymology steps should auto-generate pronunciation from the source term',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Latin', term: 'كَتَبَ' }),
        'kataba',
        'Arabic script should still be detected even if the language label is missing or different',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Latin', term: 'Αθήνα' }),
        'atina',
        'Greek script should be detected even if the language label is Latin',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Latin', term: 'ⴰⵣⵓⵍ' }),
        'ażul',
        'Berber/Tifinagh script should be detected even if the language label is Latin',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Italian', term: 'cena' }),
        'ċena',
        'Italian source labels should auto-generate Maltese-style pronunciation',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Sicilian', term: 'famigghia' }),
        'famiġġia',
        'Sicilian source labels should auto-generate Maltese-style pronunciation',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Greek', script: 'Athina', term: 'Αθήνα' }),
        'atina',
        'the dispatcher should fall back from an unsupported script field to a supported source term',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Greek', term: 'Αθήνα (Athina)' }),
        'atina (Athina)',
        'mixed Greek and Latin input should keep unsupported text intact',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Arabic', term: 'kataba' }),
        '',
        'non-Arabic text should not produce a pronunciation guess yet',
    );

    assertEq(
        generateForeignScriptPronunciation({ language: 'Latin', term: 'cena' }),
        '',
        'plain Latin text without an Italian or Sicilian source label should still stay blank',
    );
};

run();
console.log('foreignScriptPronunciation tests passed');
