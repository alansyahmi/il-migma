import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTerm, resolveRegisterTerm, PREMADE_REGISTERS, isPremadeRegister, resolveRegisterDisplay } from '../src/lib/terminology.ts';
import { formatDefinitionGloss } from '../src/lib/entryDisplay.ts';
import { ADMIN_REGISTRY } from '../src/lib/adminCategoryRegistry.ts';

test('resolveRegisterTerm resolves baseline registers in English, Maltese Standard, and Arabised', () => {
    // 1. colloquial
    assert.equal(resolveRegisterTerm('colloquial', 'standard', 'en'), 'Colloquial');
    assert.equal(resolveRegisterTerm('colloquial', 'standard', 'mt'), 'Kollokwjali');
    assert.equal(resolveRegisterTerm('colloquial', 'arabised', 'mt'), "Ta' kotra");

    // 2. formal & informal
    assert.equal(resolveRegisterTerm('formal', 'standard', 'en'), 'Formal');
    assert.equal(resolveRegisterTerm('formal', 'standard', 'mt'), 'Formali');
    assert.equal(resolveRegisterTerm('formal', 'arabised', 'mt'), 'Formali');

    assert.equal(resolveRegisterTerm('informal', 'standard', 'en'), 'Informal');
    assert.equal(resolveRegisterTerm('informal', 'standard', 'mt'), 'Informali');
    assert.equal(resolveRegisterTerm('informal', 'arabised', 'mt'), 'Informali');

    // 3. slang
    assert.equal(resolveRegisterTerm('slang', 'standard', 'en'), 'Slang');
    assert.equal(resolveRegisterTerm('slang', 'standard', 'mt'), 'Slang');
    assert.equal(resolveRegisterTerm('slang', 'arabised', 'mt'), 'Slang');

    // 4. archaic
    assert.equal(resolveRegisterTerm('archaic', 'standard', 'en'), 'Archaic');
    assert.equal(resolveRegisterTerm('archaic', 'standard', 'mt'), 'Arkajku');
    assert.equal(resolveRegisterTerm('archaic', 'arabised', 'mt'), 'Qadim');

    // 5. obsolete
    assert.equal(resolveRegisterTerm('obsolete', 'standard', 'en'), 'Obsolete');
    assert.equal(resolveRegisterTerm('obsolete', 'standard', 'mt'), 'Obsolet');
    assert.equal(resolveRegisterTerm('obsolete', 'arabised', 'mt'), 'Batal');

    // 6. technical
    assert.equal(resolveRegisterTerm('technical', 'standard', 'en'), 'Technical');
    assert.equal(resolveRegisterTerm('technical', 'standard', 'mt'), 'Tekniku');
    assert.equal(resolveRegisterTerm('technical', 'arabised', 'mt'), 'Sengħi');

    // 7. dialectal
    assert.equal(resolveRegisterTerm('dialectal', 'standard', 'en'), 'Dialectal');
    assert.equal(resolveRegisterTerm('dialectal', 'standard', 'mt'), 'Djalettali');
    assert.equal(resolveRegisterTerm('dialectal', 'arabised', 'mt'), 'Lehġi');

    // 8. ecclesiastical
    assert.equal(resolveRegisterTerm('ecclesiastical', 'standard', 'en'), 'Ecclesiastical');
    assert.equal(resolveRegisterTerm('ecclesiastical', 'standard', 'mt'), 'Ekkleżjastiku');
    assert.equal(resolveRegisterTerm('ecclesiastical', 'arabised', 'mt'), 'Knisi');

    // 9. euphemistic
    assert.equal(resolveRegisterTerm('euphemistic', 'standard', 'en'), 'Euphemistic');
    assert.equal(resolveRegisterTerm('euphemistic', 'standard', 'mt'), 'Ewfemistiku');
    assert.equal(resolveRegisterTerm('euphemistic', 'arabised', 'mt'), 'Sattari');

    // 10. jargon
    assert.equal(resolveRegisterTerm('jargon', 'standard', 'en'), 'Jargon');
    assert.equal(resolveRegisterTerm('jargon', 'standard', 'mt'), 'Ġargon');
    assert.equal(resolveRegisterTerm('jargon', 'arabised', 'mt'), 'Ġargon');

    // 11. vulgar & taboo
    assert.equal(resolveRegisterTerm('vulgar', 'standard', 'en'), 'Vulgar');
    assert.equal(resolveRegisterTerm('vulgar', 'standard', 'mt'), 'Volgari');
    assert.equal(resolveRegisterTerm('vulgar', 'arabised', 'mt'), 'Faħxi');

    assert.equal(resolveRegisterTerm('taboo', 'standard', 'en'), 'Taboo');
    assert.equal(resolveRegisterTerm('taboo', 'standard', 'mt'), 'Tabù');
    assert.equal(resolveRegisterTerm('taboo', 'arabised', 'mt'), 'Maħrum');
});

test('resolveTerm transparently resolves reg- keys and register bare keys', () => {
    assert.equal(resolveTerm('reg-colloquial', 'standard', 'mt'), 'Kollokwjali');
    assert.equal(resolveTerm('reg-colloquial', 'arabised', 'mt'), "Ta' kotra");
    assert.equal(resolveTerm('colloquial', 'standard', 'mt'), 'Kollokwjali');
    assert.equal(resolveTerm('colloquial', 'arabised', 'mt'), "Ta' kotra");

    // UI term labels
    assert.equal(resolveTerm('register', 'standard', 'en'), 'Register');
    assert.equal(resolveTerm('register', 'standard', 'mt'), 'Reġistru');
    assert.equal(resolveTerm('registers', 'standard', 'mt'), 'Reġistri');
});

test('adminCategoryRegistry register transformOption translates both baseline and custom DB items', () => {
    const registerCat = ADMIN_REGISTRY.register;
    assert.ok(registerCat, 'register category exists in ADMIN_REGISTRY');
    assert.ok(registerCat.transformOption, 'register category has transformOption');

    // Baseline fallback item (value is null)
    const optEn = registerCat.transformOption({ key: 'colloquial', value: null }, 'standard', 'en');
    assert.deepEqual(optEn, { value: 'colloquial', label: 'Colloquial' });

    const optMtStd = registerCat.transformOption({ key: 'colloquial', value: null }, 'standard', 'mt');
    assert.deepEqual(optMtStd, { value: 'colloquial', label: 'Kollokwjali' });

    const optMtAr = registerCat.transformOption({ key: 'colloquial', value: null }, 'arabised', 'mt');
    assert.deepEqual(optMtAr, { value: 'colloquial', label: "Ta' kotra" });

    // Custom DB item with overrides
    const customItem = {
        key: 'slang-youth',
        value: { en: 'Youth Slang', mt_standard: 'Slang taż-Żgħażagħ', mt_arabised: 'Lsien iż-Żgħar' }
    };
    assert.deepEqual(registerCat.transformOption(customItem, 'standard', 'en'), { value: 'slang-youth', label: 'Youth Slang' });
    assert.deepEqual(registerCat.transformOption(customItem, 'standard', 'mt'), { value: 'slang-youth', label: 'Slang taż-Żgħażagħ' });
    assert.deepEqual(registerCat.transformOption(customItem, 'arabised', 'mt'), { value: 'slang-youth', label: 'Lsien iż-Żgħar' });

    // Legacy DB item with plain string value (e.g. "colloquial")
    const legacyItem = { key: 'colloquial', value: 'colloquial' };
    assert.deepEqual(registerCat.transformOption(legacyItem, 'standard', 'en'), { value: 'colloquial', label: 'Colloquial' });
    assert.deepEqual(registerCat.transformOption(legacyItem, 'standard', 'mt'), { value: 'colloquial', label: 'Kollokwjali' });
    assert.deepEqual(registerCat.transformOption(legacyItem, 'arabised', 'mt'), { value: 'colloquial', label: "Ta' kotra" });
});

test('formatDefinitionGloss localizes register lead-in bilingually', () => {
    const termMockEn = (key) => resolveRegisterTerm(key, 'standard', 'en');
    const termMockMtStd = (key) => resolveRegisterTerm(key, 'standard', 'mt');
    const termMockMtAr = (key) => resolveRegisterTerm(key, 'arabised', 'mt');

    const defColloquial = {
        text_en: 'cool person, friend',
        text_mt: 'ħabib kbir, persuna sew',
        register: 'colloquial'
    };

    assert.equal(
        formatDefinitionGloss(defColloquial, 'en', termMockEn),
        '(Colloquial) cool person, friend'
    );
    assert.equal(
        formatDefinitionGloss(defColloquial, 'mt', termMockMtStd),
        '(Kollokwjali) ħabib kbir, persuna sew'
    );
    assert.equal(
        formatDefinitionGloss(defColloquial, 'mt', termMockMtAr),
        "(Ta' kotra) ħabib kbir, persuna sew"
    );

    // Dialectal with specific dialect: shows dialect directly
    const defDialectal = {
        text_en: 'bread roll',
        text_mt: 'ħobża żgħira',
        register: 'dialectal',
        dialect: 'Għawdex'
    };
    assert.equal(
        formatDefinitionGloss(defDialectal, 'en', termMockEn),
        '(Għawdex) bread roll'
    );
    assert.equal(
        formatDefinitionGloss(defDialectal, 'mt', termMockMtStd),
        '(Għawdex) ħobża żgħira'
    );

    // Archaic with dialect
    const defArchaic = {
        text_en: 'constable',
        text_mt: 'pulizija antik',
        register: 'archaic',
        dialect: 'Vassalli'
    };
    assert.equal(
        formatDefinitionGloss(defArchaic, 'en', termMockEn),
        '(Archaic, (Vassalli)) constable'
    );
    assert.equal(
        formatDefinitionGloss(defArchaic, 'mt', termMockMtStd),
        '(Arkajku, (Vassalli)) pulizija antik'
    );
});

test('searchDebugEntries filters entries by definition register', async () => {
    const { searchDebugEntries, DEBUG_ENTRIES } = await import('../src/data/debugEntries.ts');
    
    // Inject a register into a test entry temporarily
    const originalRegister = DEBUG_ENTRIES[0].definitions[0].register;
    DEBUG_ENTRIES[0].definitions[0].register = 'colloquial';

    try {
        const resColloquial = searchDebugEntries('', { register: 'colloquial' });
        assert.ok(resColloquial.results.length >= 1, 'Should find at least 1 colloquial entry');
        assert.ok(resColloquial.results.some(e => e.id === DEBUG_ENTRIES[0].id));

        const resSlang = searchDebugEntries('', { register: 'slang' });
        assert.ok(!resSlang.results.some(e => e.id === DEBUG_ENTRIES[0].id), 'Should not match slang');
    } finally {
        DEBUG_ENTRIES[0].definitions[0].register = originalRegister;
    }
});

test('PREMADE_REGISTERS: contains all 23 controlled registers and rejects ad-hoc strings', () => {
    assert.equal(PREMADE_REGISTERS.length, 23);
    assert.ok(isPremadeRegister('colloquial'));
    assert.ok(isPremadeRegister('standard'));
    assert.ok(isPremadeRegister('formal'));
    assert.ok(isPremadeRegister('informal'));
    assert.ok(isPremadeRegister('slang'));
    assert.ok(isPremadeRegister('figurative'));
    assert.ok(isPremadeRegister('metaphorical'));
    assert.ok(isPremadeRegister('idiomatic'));
    assert.ok(isPremadeRegister('literary'));
    assert.ok(isPremadeRegister('poetic'));
    assert.ok(isPremadeRegister('archaic'));
    assert.ok(isPremadeRegister('obsolete'));
    assert.ok(isPremadeRegister('technical'));
    assert.ok(isPremadeRegister('dialectal'));
    assert.ok(isPremadeRegister('restricted'));
    assert.ok(isPremadeRegister('vulgar'));
    assert.ok(isPremadeRegister('taboo'));
    assert.ok(isPremadeRegister('derogatory'));
    assert.ok(isPremadeRegister('pejorative'));
    assert.ok(isPremadeRegister('humorous'));
    assert.ok(isPremadeRegister('euphemistic'));
    assert.ok(isPremadeRegister('ecclesiastical'));
    assert.ok(isPremadeRegister('jargon'));

    // Rejects ad-hoc / unapproved registers
    assert.equal(isPremadeRegister('archaic (formal)'), false);
    assert.equal(isPremadeRegister('obsolet'), false);
    assert.equal(isPremadeRegister('spoken'), false);
    assert.equal(isPremadeRegister('popular'), false);
});

test('resolveRegisterDisplay: handles string key, bilingual object, and JSON string', () => {
    // 1. String canonical key
    const stdEn = resolveRegisterDisplay('colloquial', 'standard', 'en');
    assert.deepEqual(stdEn, { key: 'colloquial', label: 'Colloquial', isDialectal: false });

    const stdMt = resolveRegisterDisplay('colloquial', 'standard', 'mt');
    assert.deepEqual(stdMt, { key: 'colloquial', label: 'Kollokwjali', isDialectal: false });

    const arabMt = resolveRegisterDisplay('colloquial', 'arabised', 'mt');
    assert.deepEqual(arabMt, { key: 'colloquial', label: "Ta' kotra", isDialectal: false });

    // 2. Bilingual object
    const objDef = { en: 'Colloquial', mt: 'Kollokwjali' };
    assert.deepEqual(resolveRegisterDisplay(objDef, 'standard', 'en'), {
        key: 'colloquial',
        label: 'Colloquial',
        isDialectal: false
    });
    assert.deepEqual(resolveRegisterDisplay(objDef, 'standard', 'mt'), {
        key: 'colloquial',
        label: 'Kollokwjali',
        isDialectal: false
    });

    // 3. Bilingual object with key
    const objWithKey = { key: 'archaic', en: 'Archaic', mt: 'Arkajku' };
    assert.deepEqual(resolveRegisterDisplay(objWithKey, 'standard', 'en'), {
        key: 'archaic',
        label: 'Archaic',
        isDialectal: false
    });
    assert.deepEqual(resolveRegisterDisplay(objWithKey, 'standard', 'mt'), {
        key: 'archaic',
        label: 'Arkajku',
        isDialectal: false
    });

    // 4. Dialectal detection
    const dial = resolveRegisterDisplay('dialectal', 'standard', 'en');
    assert.equal(dial?.isDialectal, true);

    // 5. Empty / null
    assert.equal(resolveRegisterDisplay(null), null);
    assert.equal(resolveRegisterDisplay(''), null);
});

test('formatDefinitionGloss: seamlessly formats bilingual object registers', () => {
    const termMockEn = (key) => resolveRegisterTerm(key, 'standard', 'en');
    const termMockMtStd = (key) => resolveRegisterTerm(key, 'standard', 'mt');

    const defBilingual = {
        text_en: 'companion, pal',
        text_mt: 'ħabib, sieħeb',
        register: { en: 'Colloquial', mt: 'Kollokwjali' }
    };

    assert.equal(
        formatDefinitionGloss(defBilingual, 'en', termMockEn),
        '(Colloquial) companion, pal'
    );
    assert.equal(
        formatDefinitionGloss(defBilingual, 'mt', termMockMtStd),
        '(Kollokwjali) ħabib, sieħeb'
    );
});

test('formatDefinitionGloss: omits unmarked standard register and localizes grammatical nuances', () => {
    const termMockEn = (key) => resolveTerm(key, 'standard', 'en');
    const termMockMtStd = (key) => resolveTerm(key, 'standard', 'mt');
    const termMockMtAr = (key) => resolveTerm(key, 'arabised', 'mt');

    // 1. Standard register without nuance -> completely unmarked baseline gloss
    const defStandard = {
        text_en: 'less, fewer',
        text_mt: "F'ammont jew livell iżgħar.",
        register: 'standard',
    };
    assert.equal(
        formatDefinitionGloss(defStandard, 'en', termMockEn),
        'less, fewer'
    );
    assert.equal(
        formatDefinitionGloss(defStandard, 'mt', termMockMtStd),
        "F'ammont jew livell iżgħar."
    );

    // 2. Standard register with comparative adverb nuance -> (Avverbju komparattiv) without (Standard)
    const defInqas = {
        text_en: 'less, fewer',
        text_mt: "F'ammont, fi grad jew f'livell iżgħar; b'mod inferjuri jew bi tnaqqis.",
        register: { key: 'standard', en: 'Standard', mt: 'Standard', arabised: 'Miqjiesi' },
        nuance: 'comparative degree adverb',
    };
    assert.equal(
        formatDefinitionGloss(defInqas, 'en', termMockEn),
        "(Comparative adverb) less, fewer"
    );
    assert.equal(
        formatDefinitionGloss(defInqas, 'mt', termMockMtStd),
        "(Avverbju komparattiv) F'ammont, fi grad jew f'livell iżgħar; b'mod inferjuri jew bi tnaqqis."
    );
    assert.equal(
        formatDefinitionGloss(defInqas, 'mt', termMockMtAr),
        "(Għatu komparattiv) F'ammont, fi grad jew f'livell iżgħar; b'mod inferjuri jew bi tnaqqis."
    );

    // 3. Marked register with nuance -> combines both cleanly
    const defHawna = {
        text_en: 'right here',
        text_mt: 'propju hawnhekk f’dan il-post',
        register: 'colloquial',
        nuance: 'emphatic spoken proximal adverb',
    };
    assert.equal(
        formatDefinitionGloss(defHawna, 'en', termMockEn),
        '(Colloquial, Emphatic proximal adverb) right here'
    );
    assert.equal(
        formatDefinitionGloss(defHawna, 'mt', termMockMtStd),
        '(Kollokwjali, Avverbju emfatiku fil-qrib) propju hawnhekk f’dan il-post'
    );
    assert.equal(
        formatDefinitionGloss(defHawna, 'mt', termMockMtAr),
        "(Ta' kotra, Għatu emfatiku fil-qrib) propju hawnhekk f’dan il-post"
    );

    // 4. Untranslated ad-hoc English nuance is suppressed in Maltese to prevent English leakage
    const defUntranslated = {
        text_en: 'some obscure sense',
        text_mt: 'tifsira oskura',
        register: 'standard',
        nuance: 'highly specific uncataloged nuance phrase',
    };
    assert.equal(
        formatDefinitionGloss(defUntranslated, 'en', termMockEn),
        '(Highly specific uncataloged nuance phrase) some obscure sense'
    );
    assert.equal(
        formatDefinitionGloss(defUntranslated, 'mt', termMockMtStd),
        'tifsira oskura'
    );
});


