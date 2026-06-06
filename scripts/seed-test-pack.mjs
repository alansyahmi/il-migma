import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureVerbMorphologyTable } from '../src/lib/verbMorphology.ts';
import { generateConjugation } from '../src/lib/conjugationEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run') || args.has('--preview');
const RESET = args.has('--reset');
const LOCAL = args.has('--local');

function now() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function pad(num) {
    return String(num).padStart(2, '0');
}

function readEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    return fs.readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith('#'))
        .reduce((acc, line) => {
            const idx = line.indexOf('=');
            if (idx === -1) return acc;
            const key = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();
            if (key) acc[key] = value;
            return acc;
        }, {});
}

function loadEnv() {
    const devVars = readEnvFile(path.resolve(ROOT, '.dev.vars'));
    if (Object.keys(devVars).length > 0) return devVars;
    return readEnvFile(path.resolve(ROOT, '.env'));
}

function asJson(value) {
    return JSON.stringify(value);
}

const tableColumnCache = new Map();

async function getTableColumns(client, table) {
    if (tableColumnCache.has(table)) return tableColumnCache.get(table);
    const res = await client.execute(`PRAGMA table_info(${table})`);
    const columns = new Set(res.rows.map((row) => String(row.name)));
    tableColumnCache.set(table, columns);
    return columns;
}

const ROOT_HEADWORDS = {
    noun: ['ktieb', 'kelma', 'għemil', 'ftuħ', 'qari'],
    verb: ['kiteb', 'kellem', 'għamel', 'fetaħ', 'ħareġ'],
    adjective: ['kbir', 'sabiħ', 'ġdid', 'twil', 'qasir'],
    participle: ['miktub', 'imkellem', 'magħmul', 'miftuħ', 'moqri'],
    verbal_noun: ['kitba', 'tkellim', 'għemil', 'ftuħ', 'ħruġ'],
};

const CLOSED_CLASS_HEADWORDS = {
    adverb: ['illum', 'dejjem', 'hawn', 'hemm', 'malajr'],
    preposition: ['fuq', 'taħt', 'għal', 'ma', 'bejn'],
    conjunction: ['u', 'jew', 'iżda', 'għax', 'meta'],
    particle: ['mhux', 'sa', 'anki', 'ukoll', 'qatt'],
    article: ['il', 'l', 'id', 'it', 'ix'],
    pronoun: ['jien', 'inti', 'hu', 'hi', 'aħna'],
    interrogative: ['min', 'xiex', 'fejn', 'meta', 'kif'],
    numeral: ['wieħed', 'tnejn', 'tlieta', 'erbgħa', 'ħamsa'],
    interjection: ['ħej', 'uffa', 'ah', 'iva', 'le'],
};

const SEMITIC_SOURCE_LANGUAGE = 'Arabic';

const PRIMARY_GLOSSES = {
    noun: ['book', 'word', 'deed', 'opening', 'reading'],
    verb: ['to write', 'to speak', 'to do', 'to open', 'to exit'],
    adjective: ['big', 'beautiful', 'new', 'long', 'short'],
    participle: ['written', 'spoken', 'made', 'opened', 'read'],
    verbal_noun: ['writing', 'talking', 'doing', 'opening', 'exit'],
    adverb: ['today', 'always', 'here', 'there', 'quickly'],
    preposition: ['on', 'under', 'for', 'with', 'between'],
    conjunction: ['and', 'or', 'but', 'because', 'when'],
    particle: ['not', 'until', 'also', 'too', 'never'],
    article: ['the', 'the', 'the', 'the', 'the'],
    pronoun: ['I', 'you', 'he', 'she', 'we'],
    interrogative: ['who', 'what', 'where', 'when', 'how'],
    numeral: ['one', 'two', 'three', 'four', 'five'],
    interjection: ['hey', 'oops', 'ah', 'yes', 'no'],
};

const SECONDARY_GLOSSES = {
    noun: ['a test book', 'a test word', 'a test deed', 'an opening', 'the act of reading'],
    verb: ['to pen', 'to address', 'to perform', 'to unlock', 'to go out'],
    adjective: ['large', 'lovely', 'fresh', 'tall', 'brief'],
    participle: ['in writing', 'in speech', 'constructed', 'opened', 'perceived'],
    verbal_noun: ['the act of writing', 'the act of speaking', 'the act of doing', 'the act of opening', 'the act of leaving'],
    adverb: ['right now', 'all the time', 'nearby', 'over there', 'in a hurry'],
    preposition: ['above', 'below', 'in favour of', 'together with', 'among'],
    conjunction: ['plus', 'either', 'however', 'since', 'while'],
    particle: ['not at all', 'from now on', 'also here', 'still', 'ever'],
    article: ['definite article', 'definite article before vowels', 'definite article', 'definite article', 'definite article'],
    pronoun: ['singular first person', 'singular second person', 'singular third person masculine', 'singular third person feminine', 'plural first person'],
    interrogative: ['interrogative pronoun', 'interrogative pronoun', 'interrogative adverb', 'interrogative adverb', 'interrogative adverb'],
    numeral: ['cardinal numeral', 'cardinal numeral', 'cardinal numeral', 'cardinal numeral', 'cardinal numeral'],
    interjection: ['greeting', 'expression of annoyance', 'expression of surprise', 'affirmative response', 'negative response'],
};

export const ENGINE_VERB_BRANCH_FIXTURES = [
    { branchKey: 'quadriliteral-form-i-strong', root: 'q-r-t-s', form: 'I', strength: 'strong', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'i-a', vowelSetImperative: 'a-a' },
    { branchKey: 'quadriliteral-form-i-weak-defective', root: 's-q-s-w', form: 'I', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'a-a', vowelSetImperfect: 'i-a', vowelSetImperative: 'a-a' },
    { branchKey: 'quadriliteral-form-ii-strong', root: 'b-l-n-d', form: 'II', strength: 'strong', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'i-a', vowelSetImperative: 'a-a' },
    { branchKey: 'quadriliteral-form-ii-weak-defective', root: 'ħ-r-b-j', form: 'II', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'a-a', vowelSetImperfect: 'i-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-i-strong', root: 'p-l-t', form: 'I', strength: 'strong', weakClass: null, vowelSetPerfect: 'i-e', vowelSetImperfect: 'i-e', vowelSetImperative: 'i-e' },
    { branchKey: 'form-i-geminated', root: 'd-m-m', form: 'I', strength: 'geminated', weakClass: null, vowelSetPerfect: 'e-a', vowelSetImperfect: 'i-a', vowelSetImperative: 'i-a' },
    { branchKey: 'form-i-strong-hybrid', root: 'l-f-għ', form: 'I', strength: 'strong-hybrid', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'i-a', vowelSetImperative: 'i-a' },
    { branchKey: 'form-i-weak-assimilative', root: 'w-ż-n', form: 'I', strength: 'weak', weakClass: 'assimilative', vowelSetPerfect: 'i-e', vowelSetImperfect: 'i-e', vowelSetImperative: 'i-e' },
    { branchKey: 'form-i-weak-hollow', root: 's-w-f', form: 'I', strength: 'weak', weakClass: 'hollow', vowelSetPerfect: 'a-a', vowelSetImperfect: 'u-u', vowelSetImperative: 'u-u' },
    { branchKey: 'form-i-weak-defective', root: 'ħ-b-y', form: 'I', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'a-i', vowelSetImperfect: 'a-i', vowelSetImperative: 'a-i' },
    { branchKey: 'form-ii-strong', root: 'k-s-r', form: 'II', strength: 'strong', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-ii-weak-assimilative', root: 'w-q-f', form: 'II', strength: 'weak', weakClass: 'assimilative', vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-ii-weak-hollow', root: 'd-w-b', form: 'II', strength: 'weak', weakClass: 'hollow', vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-ii-weak-defective', root: 'r-b-għ', form: 'II', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-i', vowelSetImperative: 'a-i' },
    { branchKey: 'form-ii-geminated', root: 'ġ-n-n', form: 'II', strength: 'geminated', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-iii-strong', root: 'b-r-k', form: 'III', strength: 'strong', weakClass: null, vowelSetPerfect: 'ie-e', vowelSetImperfect: 'ie-e', vowelSetImperative: 'ie-e' },
    { branchKey: 'form-iii-weak-assimilative', root: 'w-s-l', form: 'III', strength: 'weak', weakClass: 'assimilative', vowelSetPerfect: 'ie-e', vowelSetImperfect: 'ie-e', vowelSetImperative: 'ie-e' },
    { branchKey: 'form-iii-weak-hollow', root: 'q-w-m', form: 'III', strength: 'weak', weakClass: 'hollow', vowelSetPerfect: 'ie-e', vowelSetImperfect: 'ie-e', vowelSetImperative: 'ie-e' },
    { branchKey: 'form-iii-weak-defective', root: 'b-n-y', form: 'III', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'ie-a', vowelSetImperfect: 'ie-a', vowelSetImperative: 'ie-a' },
    { branchKey: 'form-iii-geminated', root: 'ħ-b-b', form: 'III', strength: 'geminated', weakClass: null, vowelSetPerfect: 'ie-a', vowelSetImperfect: 'ie-a', vowelSetImperative: 'ie-a' },
    { branchKey: 'form-iv', root: 'g-l-b', form: 'IV', strength: 'strong', weakClass: null, vowelSetPerfect: 'i-e', vowelSetImperfect: 'i-e', vowelSetImperative: 'i-e' },
    { branchKey: 'form-v-strong', root: 'f-r-k', form: 'V', strength: 'strong', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-v-weak-defective', root: 'n-s-y', form: 'V', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-i', vowelSetImperative: 'a-i' },
    { branchKey: 'form-v-weak-hollow', root: 'ħ-w-d', form: 'V', strength: 'weak', weakClass: 'hollow', vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-v-geminated', root: 't-m-m', form: 'V', strength: 'geminated', weakClass: null, vowelSetPerfect: 'e-a', vowelSetImperfect: 'e-a', vowelSetImperative: 'e-a' },
    { branchKey: 'form-vi-strong', root: 's-l-m', form: 'VI', strength: 'strong', weakClass: null, vowelSetPerfect: 'ie-a', vowelSetImperfect: 'ie-a', vowelSetImperative: 'ie-a' },
    { branchKey: 'form-vi-weak-hollow', root: 'q-w-m', form: 'VI', strength: 'weak', weakClass: 'hollow', vowelSetPerfect: 'ie-e', vowelSetImperfect: 'ie-e', vowelSetImperative: 'ie-e' },
    { branchKey: 'form-vi-weak-defective', root: 'r-m-y', form: 'VI', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'ie-a', vowelSetImperfect: 'ie-a', vowelSetImperative: 'ie-a' },
    { branchKey: 'form-vii', root: 'ħ-r-ġ', form: 'VII', strength: 'strong', weakClass: null, vowelSetPerfect: 'i-e', vowelSetImperfect: 'i-e', vowelSetImperative: 'i-e' },
    { branchKey: 'form-viii', root: 'ġ-b-d', form: 'VIII', strength: 'strong', weakClass: null, vowelSetPerfect: 'i-e', vowelSetImperfect: 'i-e', vowelSetImperative: 'i-e' },
    { branchKey: 'form-ix', root: 's-f-r', form: 'IX', strength: 'strong', weakClass: null, vowelSetPerfect: 'i-e', vowelSetImperfect: 'i-e', vowelSetImperative: 'i-e' },
    { branchKey: 'form-xa-strong', root: 'f-h-m', form: 'Xa', strength: 'strong', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-xa-strong-hybrid', root: 'r-f-għ', form: 'Xa', strength: 'strong-hybrid', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-xa-weak-defective', root: 't-l-y', form: 'Xa', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-i', vowelSetImperative: 'a-i' },
    { branchKey: 'form-xa-geminated', root: 'm-d-d', form: 'Xa', strength: 'geminated', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-xb-strong', root: 'q-s-m', form: 'Xb', strength: 'strong', weakClass: null, vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
    { branchKey: 'form-xb-weak-assimilative', root: 't-m-m', form: 'Xb', strength: 'weak', weakClass: 'assimilative', vowelSetPerfect: 'e-a', vowelSetImperfect: 'e-a', vowelSetImperative: 'e-a' },
    { branchKey: 'form-xb-weak-defective', root: 'ġ-r-y', form: 'Xb', strength: 'weak', weakClass: 'defective', vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-i', vowelSetImperative: 'a-i' },
    { branchKey: 'form-xb-weak-hollow', root: 'ħ-w-d', form: 'Xb', strength: 'weak', weakClass: 'hollow', vowelSetPerfect: 'a-a', vowelSetImperfect: 'a-a', vowelSetImperative: 'a-a' },
];

function makeRootFamily(index, consonants, strength, weakClass, vowelSetPerf, vowelSetImpf, vowelSetImp, gloss, sourceTerm) {
    return {
        id: `zz-root-${pad(index)}`,
        consonants,
        consonant_array: asJson(consonants.split('-')),
        strength,
        weak_class: weakClass ?? null,
        gloss: asJson([{ en: gloss.en, mt: gloss.mt }]),
        etymology: asJson({
            relationship: 'From',
            language: 'Seed Proto-Maltese',
            term: sourceTerm || consonants.replace(/-/g, ''),
            pronunciation: consonants,
            definition: gloss.en,
        }),
        source: 'seed-pack',
        hidden_forms: asJson([]),
        notes: `${gloss.en} family for bulk POS testing`,
        vowel_set_perf: vowelSetPerf,
        vowel_set_impf: vowelSetImpf,
        vowel_set_imp: vowelSetImp,
        synonyms: asJson([]),
        antonyms: asJson([]),
        related_entries: asJson([]),
    };
}

function generateEngineVerbConjugation(fixture) {
    return generateConjugation({
        root: fixture.root,
        form: fixture.form,
        strength: fixture.strength,
        weakClass: fixture.weakClass || undefined,
        vowelSetPerfect: fixture.vowelSetPerfect,
        vowelSetImperfect: fixture.vowelSetImperfect,
        vowelSetImperative: fixture.vowelSetImperative,
        isImalaBlocked: fixture.isImalaBlocked ?? fixture.root.includes('għ'),
    });
}

function engineFixtureId(index, kind) {
    return kind === 'root'
        ? `zz-root-verb-engine-${pad(index)}`
        : `zz-verb-engine-${pad(index)}`;
}

function makeEngineVerbRoot(fixture, index) {
    return {
        id: engineFixtureId(index, 'root'),
        consonants: fixture.root,
        consonant_array: asJson(fixture.root.split('-')),
        strength: fixture.strength,
        weak_class: fixture.weakClass ?? null,
        gloss: asJson([{ en: `engine branch ${fixture.branchKey}`, mt: fixture.branchKey }]),
        etymology: asJson({
            relationship: 'Fixture',
            language: 'Il-Miġma seed pack',
            term: fixture.branchKey,
            pronunciation: fixture.root,
            definition: `Conjugation engine branch fixture for ${fixture.branchKey}`,
        }),
        source: 'seed-pack',
        hidden_forms: asJson([]),
        notes: `Verb entry-view fixture for ${fixture.branchKey}`,
        vowel_set_perf: fixture.vowelSetPerfect,
        vowel_set_impf: fixture.vowelSetImperfect,
        vowel_set_imp: fixture.vowelSetImperative,
        synonyms: asJson([]),
        antonyms: asJson([]),
        related_entries: asJson([]),
    };
}

function makeEngineVerbEntry(fixture, index) {
    const conjugation = generateEngineVerbConjugation(fixture);
    const citationRow = conjugation.rows.find((row) => row.person_mt === '3ms') || conjugation.rows[2];
    const headword = citationRow.perfect;

    return {
        ...makeEntryBase('verb', index, 'engine-branch', { source: 'seed-pack' }, headword),
        id: engineFixtureId(index, 'verb'),
        headword,
        tags: asJson(['seed', 'verb', 'engine-branch', fixture.branchKey]),
        root_consonants: fixture.root,
        verb_form: fixture.form,
        verb_class: fixture.strength,
        verb_weak_class: fixture.weakClass ?? null,
        verb_transitivity: 'both',
        verb_perfective_3sgm: citationRow.perfect,
        verb_imperfective_3sgm: citationRow.imperfect,
        verb_verbal_noun: `${headword}-vn`,
        verb_active_ptcp: `${headword}-ap`,
        verb_passive_ptcp: `${headword}-pp`,
        verb_vowel_perf: fixture.vowelSetPerfect,
        verb_vowel_impf: fixture.vowelSetImperfect,
        verb_vowel_impv: fixture.vowelSetImperative,
        verb_type: 'engine-branch',
        is_loanword: 0,
        source_language: SEMITIC_SOURCE_LANGUAGE,
        source_citation: `Fixture pack verb engine ${pad(index)}: ${fixture.branchKey}`,
    };
}

function verbMorphologyRowFromEntry(entry) {
    return {
        entry_id: entry.id,
        form: entry.verb_form || null,
        class: entry.verb_class || null,
        weak_class: entry.verb_weak_class || null,
        transitivity: entry.verb_transitivity || null,
        perfective_3sgm: entry.verb_perfective_3sgm || null,
        imperfective_3sgm: entry.verb_imperfective_3sgm || null,
        verbal_noun: entry.verb_verbal_noun || null,
        active_participle: entry.verb_active_ptcp || null,
        passive_participle: entry.verb_passive_ptcp || null,
        vowel_set_perf: entry.verb_vowel_perf || null,
        vowel_set_impf: entry.verb_vowel_impf || null,
        vowel_set_impv: entry.verb_vowel_impv || null,
        type: entry.verb_type || null,
    };
}

function makeStemFamily(index, stemString, classType, isHybrid, root, agentiveSuffix, sourceLanguage, gloss) {
    return {
        stem_string: stemString,
        class_type: classType,
        is_hybrid: isHybrid ? 1 : 0,
        root,
        agentive_suffix: agentiveSuffix ?? null,
        tags: asJson(['seed', 'stem', `family-${index}`]),
        source: sourceLanguage,
        glosses: asJson([
            gloss,
        ]),
        etymology: asJson({
            relationship: 'From',
            language: sourceLanguage,
            term: stemString,
            pronunciation: stemString,
            definition: gloss.en,
        }),
        synonyms: asJson([]),
        antonyms: asJson([]),
        related_stems: asJson([]),
    };
}

function makeDefinitions(pos, index, headword) {
    const primary = PRIMARY_GLOSSES[pos]?.[index - 1] || `${pos} fixture`;
    const secondary = SECONDARY_GLOSSES[pos]?.[index - 1];
    const defs = [
        {
            text_mt: headword,
            text_en: primary,
        },
    ];

    if (secondary) {
        defs.push({
            text_mt: `${headword} (sagħtejn)`,
            text_en: secondary,
        });
    }

    return defs;
}

function makePhonetics(pos, index, headword) {
    if (![1, 3].includes(index)) return [];
    return [
        {
            ipa: `/${headword}/`,
            dialect: 'Standard',
            notes: `Fixture pronunciation for ${pos} ${index}`,
        },
    ];
}

function makeEtymologyChain(sourceLabel, headword, index) {
    if (index !== 1) return [];
    return [
        {
            relationship: 'From',
            language: sourceLabel,
            term: headword,
            pronunciation: headword,
            definition: `Fixture origin note for ${headword}`,
        },
        {
            relationship: 'Via',
            language: 'Seed Maltese',
            term: `${headword}-proto`,
            pronunciation: `${headword}-proto`,
            definition: `Intermediate fixture layer for ${headword}`,
        },
    ];
}

function definitionNuance(pos, senseIndex) {
    if (senseIndex !== 0) return null;
    if (pos === 'noun' || pos === 'adjective') return pos;
    return null;
}

function makeEntryBase(pos, index, familyKind, familyRef, headword) {
    return {
        id: `zz-${pos}-${pad(index)}`,
        headword,
        pos,
        tags: asJson(['seed', pos, familyKind, `variant-${index}`]),
        definitions: makeDefinitions(pos, index, headword),
        phonetics: makePhonetics(pos, index, headword),
        etymology_chain: makeEtymologyChain(familyRef.source || 'Seed source', headword, index),
        is_inflectable: 1,
        source_citation: `Fixture pack ${pos} ${index}`,
        usage_example: `Example usage of ${headword}`,
        usage_example_en: `Example usage of ${headword}`,
    };
}

function finalizeEntryForInsert(entry) {
    if (Array.isArray(entry.definitions)) {
        entry.definitions = asJson(entry.definitions);
    }
    delete entry.phonetics;
}

function rootEntry(pos, index, root) {
    const headword = ROOT_HEADWORDS[pos]?.[index - 1] || `zz-${pos}-${pad(index)}`;
    const base = makeEntryBase(pos, index, 'root', root, headword);

    switch (pos) {
        case 'noun':
            return {
                ...base,
                gender: ['masculine', 'feminine', 'masculine', 'masculine', 'masculine'][index - 1],
                inflections_pl: asJson(['kotba', 'kliem', 'għemejjel', 'ftuħijiet', 'qarijiet'][index - 1] ? [['kotba', 'kliem', 'għemejjel', 'ftuħijiet', 'qarijiet'][index - 1]] : []),
                form_fem: [null, null, null, null, null][index - 1],
                form_masc: [null, null, null, null, null][index - 1],
                dual_form: ['ktiebin', 'kelmtejn', 'għemilejn', 'ftuħtejn', 'qaritejn'][index - 1],
                diminutive_form: ['ktiebit', 'kelmitek', 'għemilek', 'ftuħiet', 'qarijat'][index - 1],
                is_collective: index === 3 ? 1 : 0,
                is_singulative: index === 4 ? 1 : 0,
                root_consonants: root.consonants,
                cv_pattern: ['CCVVC', 'CVCVC', 'CVCVC', 'CCVC', 'CVCV'][index - 1],
                morph_pattern: ['broken_plural', 'sound_plural', 'broken_plural', 'sound_plural', 'broken_plural'][index - 1],
                source_language: SEMITIC_SOURCE_LANGUAGE,
                is_loanword: 0,
                vowel_set_sg: ['i-e', 'e-e', 'a-a', 'u-u', 'a-i'][index - 1],
                vowel_set_pl: ['o-a', 'i-e', 'e-e', 'u-a', 'a-i'][index - 1],
                vowel_set_opp: ['o-a', 'i-a', 'e-a', 'u-i', 'a-u'][index - 1],
                vowel_set_dual: ['i-e', 'e-e', 'a-a', 'u-u', 'a-i'][index - 1],
            };
        case 'verb':
            return {
                ...base,
                root_consonants: root.consonants,
                verb_form: ['I', 'II', 'I', 'I', 'I'][index - 1],
                verb_class: ['strong', 'strong', 'strong', 'strong', 'weak'][index - 1],
                verb_weak_class: [null, null, null, null, 'defective'][index - 1],
                verb_transitivity: ['transitive', 'intransitive', 'both', 'transitive', 'both'][index - 1],
                verb_perfective_3sgm: headword,
                verb_imperfective_3sgm: ['jikteb', 'jitkellem', 'jagħmel', 'jiftaħ', 'jaqra'][index - 1],
                verb_verbal_noun: ['kitba', 'tkellim', 'għemil', 'ftuħ', 'qari'][index - 1],
                verb_active_ptcp: ['kittieb', 'kelliem', 'agħmil', 'fetaħ', 'qari'][index - 1],
                verb_passive_ptcp: ['miktub', 'imkellem', 'magħmul', 'miftuħ', 'moqri'][index - 1],
                verb_vowel_perf: root.vowel_set_perf,
                verb_vowel_impf: root.vowel_set_impf,
                verb_vowel_impv: root.vowel_set_imp,
                verb_type: 'root',
                is_loanword: 0,
                source_language: SEMITIC_SOURCE_LANGUAGE,
            };
        case 'adjective':
            return {
                ...base,
                gender: ['masculine', 'feminine', 'masculine', 'masculine', 'masculine'][index - 1],
                inflections_pl: asJson([
                    ['kbar'],
                    ['sbieħ'],
                    ['ġodda'],
                    ['twal'],
                    ['qosra'],
                ][index - 1]),
                form_masc: [headword, headword, headword, headword, headword][index - 1],
                form_fem: ['kbira', 'sabiħa', 'ġdida', 'twila', 'qasira'][index - 1],
                elative_form: ['ikbar', 'isbaħ', 'aktar ġdid', 'itwal', 'iqsar'][index - 1],
                root_consonants: root.consonants,
                cv_pattern: ['CVCVC', 'CVCVC', 'CVCVC', 'CVCC', 'CVCC'][index - 1],
                morph_pattern: ['comparative', 'comparative', 'comparative', 'comparative', 'comparative'][index - 1],
                source_language: SEMITIC_SOURCE_LANGUAGE,
                is_loanword: 0,
                vowel_set_sg: ['i-a', 'i-a', 'i-a', 'i-a', 'i-a'][index - 1],
                vowel_set_pl: ['a-a', 'i-e', 'o-a', 'a-a', 'o-a'][index - 1],
                vowel_set_opp: ['i-a', 'i-e', 'o-e', 'i-a', 'o-e'][index - 1],
                vowel_set_dual: ['i-a', 'i-a', 'i-a', 'i-a', 'i-a'][index - 1],
            };
        case 'participle':
            return {
                ...base,
                gender: ['masculine', 'feminine', 'masculine', 'feminine', 'masculine'][index - 1],
                participle_type: ['passive', 'passive', 'passive', 'passive', 'passive'][index - 1],
                root_consonants: root.consonants,
                verb_form: ['I', 'II', 'I', 'I', 'I'][index - 1],
                verb_class: ['strong', 'strong', 'strong', 'strong', 'weak'][index - 1],
                verb_active_ptcp: ['qari', 'kelliem', 'għamil', 'fetaħ', 'qari'][index - 1],
                verb_passive_ptcp: headword,
                source_language: SEMITIC_SOURCE_LANGUAGE,
                is_loanword: 0,
            };
        case 'verbal_noun':
            return {
                ...base,
                root_consonants: root.consonants,
                verb_form: ['I', 'II', 'I', 'I', 'I'][index - 1],
                verb_class: ['strong', 'strong', 'strong', 'strong', 'weak'][index - 1],
                verb_verbal_noun: headword,
                source_language: SEMITIC_SOURCE_LANGUAGE,
                is_loanword: 0,
                tags: asJson(['seed', pos, 'root', `variant-${index}`, 'verbal-noun']),
            };
        default:
            throw new Error(`Unsupported root-linked POS: ${pos}`);
    }
}

function stemMorphology(stem) {
    return {
        stem_string: stem.stem_string,
        class_type: stem.class_type,
        is_hybrid: !!stem.is_hybrid,
        root: stem.root || null,
        agentive_suffix: stem.agentive_suffix || null,
    };
}

function stemEntry(pos, index, stem) {
    const headword = ['servi', 'fajlja', 'telefona', 'mobilizza', 'tassigura'][index - 1] || `zz-${pos}-${pad(index)}`;
    const base = makeEntryBase(pos, index, 'stem', stem, headword);

    switch (pos) {
        case 'verb':
            return {
                ...base,
                is_loanword: 1,
                is_inflectable: 1,
                source_language: stem.source || 'Italian',
                zokk_morphology: asJson(stemMorphology(stem)),
                verb_form: ['I', 'I', 'II', 'III', 'I'][index - 1],
                verb_class: 'loan',
                verb_weak_class: null,
                verb_transitivity: ['transitive', 'both', 'intransitive', 'transitive', 'both'][index - 1],
                verb_perfective_3sgm: headword,
                verb_imperfective_3sgm: `j${headword}`,
                verb_verbal_noun: `${headword}-vn`,
                verb_active_ptcp: `${headword}-ap`,
                verb_passive_ptcp: `${headword}-pp`,
                verb_vowel_perf: 'a-a',
                verb_vowel_impf: 'a-a',
                verb_vowel_impv: 'a-a',
                verb_type: 'loan',
                root_consonants: null,
            };
        case 'adverb':
        case 'preposition':
        case 'conjunction':
        case 'particle':
        case 'article':
        case 'pronoun':
        case 'interrogative':
        case 'numeral':
        case 'interjection':
            return {
                ...base,
                is_loanword: 0,
                is_inflectable: pos === 'pronoun' ? 1 : 0,
                source_language: 'Uncertain',
                root_consonants: null,
                gender: pos === 'pronoun' && index % 2 === 0 ? 'neutral' : null,
            };
        default:
            throw new Error(`Unsupported stem-linked POS: ${pos}`);
    }
}

function closedClassEntry(pos, index) {
    const headword = CLOSED_CLASS_HEADWORDS[pos]?.[index - 1] || `zz-${pos}-${pad(index)}`;
    const base = makeEntryBase(pos, index, 'closed-class', { source: 'Uncertain' }, headword);
    const numeralSeedForms = headword === 'tlieta'
        ? {
            numeral_type: 'cardinal',
            form_attributive_short: 'tliet',
            form_attributive_short_pattern: 'CvCVC',
            form_attributive_long: 'tlitt',
            ordinal_form: 'tielet',
            adverbial_form: 'tliet darbiet',
            fractional_form: 'terz',
            multiplier_form: 'triplu',
            distributive_form: 'tlieta tlieta',
        }
        : null;

    return {
        ...base,
        is_loanword: 0,
        is_inflectable: pos === 'pronoun' ? 1 : 0,
        source_language: 'Uncertain',
        root_consonants: null,
        gender: pos === 'pronoun' && index % 2 === 0 ? 'neutral' : null,
        numeral_type: pos === 'numeral'
            ? numeralSeedForms?.numeral_type || ['cardinal', 'ordinal', 'adverbial', 'fractional', 'multiplier'][index - 1]
            : null,
        form_attributive_short: pos === 'numeral'
            ? numeralSeedForms?.form_attributive_short || headword
            : null,
        form_attributive_short_pattern: pos === 'numeral'
            ? numeralSeedForms?.form_attributive_short_pattern || null
            : null,
        form_attributive_long: pos === 'numeral'
            ? numeralSeedForms?.form_attributive_long || `${headword} (long)`
            : null,
        ordinal_form: pos === 'numeral' ? numeralSeedForms?.ordinal_form || null : null,
        adverbial_form: pos === 'numeral' ? numeralSeedForms?.adverbial_form || null : null,
        fractional_form: pos === 'numeral' ? numeralSeedForms?.fractional_form || null : null,
        multiplier_form: pos === 'numeral' ? numeralSeedForms?.multiplier_form || null : null,
        distributive_form: pos === 'numeral' ? numeralSeedForms?.distributive_form || null : null,
        form_opposite: null,
        tags: asJson(['seed', pos, 'closed-class', `variant-${index}`]),
    };
}

export function buildSeedPack() {
    const baseRoots = [
        makeRootFamily(1, 'k-t-b', 'strong', null, 'i-e', 'i-e', 'i-u', { en: 'write', mt: 'ikteb' }, 'כתב'),
        makeRootFamily(2, 'k-l-m', 'strong', null, 'e-e', 'e-e', 'e-e', { en: 'speak / word', mt: 'kelma' }, 'كلم'),
        makeRootFamily(3, 'għ-m-l', 'strong', null, 'a-a', 'a-a', 'a-a', { en: 'do / make', mt: 'agħmel' }, 'عمل'),
        makeRootFamily(4, 'f-t-ħ', 'strong', null, 'e-e', 'e-e', 'e-e', { en: 'open', mt: 'iftaħ' }, 'فتح'),
        makeRootFamily(5, 'q-r-y', 'weak', 'defective', 'a-i', 'a-i', 'a-i', { en: 'read', mt: 'aqra' }, 'قرأ'),
    ].map((root, index) => ({
        ...root,
        verb_class: root.strength === 'weak' ? 'weak' : 'strong',
    }));
    const engineVerbRoots = ENGINE_VERB_BRANCH_FIXTURES.map((fixture, index) => makeEngineVerbRoot(fixture, index + 1));
    const roots = [...baseRoots, ...engineVerbRoots];

    const stems = [
        makeStemFamily(1, 'serv', 'ar', false, null, '-i', 'Italian', { en: 'serve', mt: 'servizz' }),
        makeStemFamily(2, 'fajl', 'ar', false, null, '-ja', 'English', { en: 'file', mt: 'fajl' }),
        makeStemFamily(3, 'telefon', 'ir', false, null, '-a', 'English', { en: 'telephone', mt: 'telefon' }),
        makeStemFamily(4, 'mobil', 'ir', false, null, '-izza', 'English', { en: 'mobile', mt: 'mobile' }),
        makeStemFamily(5, 'taksi', 'ar', false, null, '-a', 'Italian', { en: 'taxi', mt: 'taksi' }),
    ];

    const entries = [];
    const childRows = {
        definitions: [],
        phonetics: [],
        verb_morphology: [],
    };

    const closedClassPos = ['adverb', 'preposition', 'conjunction', 'particle', 'article', 'pronoun', 'interrogative', 'numeral', 'interjection'];
    const rootLinkedPos = ['noun', 'adjective', 'participle', 'verbal_noun'];
    const stemLinkedPos = ['adverb', 'preposition', 'conjunction', 'particle', 'article', 'pronoun', 'interrogative', 'numeral', 'interjection'];

    // Put closed-class items first so the homepage recent feed still has room for Semitic and Romance rows.
    for (const pos of closedClassPos) {
        for (let i = 1; i <= 5; i += 1) {
            const entry = closedClassEntry(pos, i);
            entries.push(entry);
            childRows.definitions.push(...entry.definitions.map((definition, senseIndex) => ({
                id: `zz-def-${pos}-${pad(i)}-${senseIndex + 1}`,
                entry_id: entry.id,
                subentry_id: null,
                sense_number: senseIndex + 1,
                text_mt: definition.text_mt,
                text_en: definition.text_en,
                register: pos === 'article' && i === 1 ? 'formal' : null,
                nuance: null,
                field: pos,
                sort_order: senseIndex,
            })));
            for (const ph of entry.phonetics) {
                childRows.phonetics.push({
                    id: `zz-phon-${pos}-${pad(i)}`,
                    entry_id: entry.id,
                    subentry_id: null,
                    ipa: ph.ipa,
                    dialect: ph.dialect,
                    notes: ph.notes,
                });
            }
            // keep entry-level JSON fields so they persist with the entries row
            finalizeEntryForInsert(entry);
        }
    }

    for (const pos of rootLinkedPos) {
        for (let i = 1; i <= 5; i += 1) {
            const root = roots[i - 1];
            const entry = rootEntry(pos, i, root);
            entries.push(entry);
            childRows.definitions.push(...entry.definitions.map((definition, senseIndex) => ({
                id: `zz-def-${pos}-${pad(i)}-${senseIndex + 1}`,
                entry_id: entry.id,
                subentry_id: null,
                sense_number: senseIndex + 1,
                text_mt: definition.text_mt,
                text_en: definition.text_en,
                register: senseIndex === 0 && i === 1 ? 'formal' : null,
                nuance: definitionNuance(pos, senseIndex),
                field: pos,
                sort_order: senseIndex,
            })));

            for (const ph of entry.phonetics) {
                childRows.phonetics.push({
                    id: `zz-phon-${pos}-${pad(i)}`,
                    entry_id: entry.id,
                    subentry_id: null,
                    ipa: ph.ipa,
                    dialect: ph.dialect,
                    notes: ph.notes,
                });
            }

            // keep entry-level JSON fields so they persist with the entries row
            finalizeEntryForInsert(entry);
        }
    }

    const tlietaEntry = entries.find((entry) => entry.id === 'zz-numeral-03');
    const tieletEntry = {
        ...makeEntryBase('numeral', 6, 'closed-class-derived', { source: 'Wiktionary' }, 'tielet'),
        is_loanword: 0,
        is_inflectable: 0,
        source_language: 'Wiktionary',
        root_consonants: 't-l-t',
        gender: null,
        numeral_type: 'ordinal',
        form_attributive_short: 'tielet',
        form_attributive_short_pattern: 'CâCvC',
        form_attributive_long: 'tielet',
        ordinal_form: 'tielet',
        adverbial_form: null,
        fractional_form: null,
        multiplier_form: null,
        distributive_form: null,
        related_entries: asJson([
            { id: 'zz-numeral-03', headword: 'tlieta', gloss_en: 'three', gloss_mt: 'tlieta' },
        ]),
    };
    const tlittEntry = {
        ...makeEntryBase('numeral', 7, 'closed-class-derived', { source: 'Wiktionary' }, 'tlitt'),
        is_loanword: 0,
        is_inflectable: 0,
        source_language: 'Wiktionary',
        root_consonants: 't-l-t',
        gender: null,
        numeral_type: 'cardinal',
        form_attributive_short: 'tlitt',
        form_attributive_short_pattern: 'CâCC',
        form_attributive_long: 'tlitt',
        ordinal_form: null,
        adverbial_form: null,
        fractional_form: null,
        multiplier_form: null,
        distributive_form: null,
        related_entries: asJson([
            { id: 'zz-numeral-03', headword: 'tlieta', gloss_en: 'three', gloss_mt: 'tlieta' },
        ]),
    };

    if (tlietaEntry) {
        tlietaEntry.related_entries = asJson([
            { id: 'zz-numeral-06', headword: 'tielet', gloss_en: 'third', gloss_mt: 'tielet' },
            { id: 'zz-numeral-07', headword: 'tlitt', gloss_en: 'short attributive form of three', gloss_mt: 'tlitt' },
        ]);
    }

    entries.push(tieletEntry, tlittEntry);
    childRows.definitions.push(
        ...tieletEntry.definitions.map((definition, senseIndex) => ({
            id: `zz-def-numeral-06-${senseIndex + 1}`,
            entry_id: tieletEntry.id,
            subentry_id: null,
            sense_number: senseIndex + 1,
            text_mt: definition.text_mt,
            text_en: definition.text_en,
            register: null,
            nuance: null,
            field: 'numeral',
            sort_order: senseIndex,
        })),
        ...tlittEntry.definitions.map((definition, senseIndex) => ({
            id: `zz-def-numeral-07-${senseIndex + 1}`,
            entry_id: tlittEntry.id,
            subentry_id: null,
            sense_number: senseIndex + 1,
            text_mt: definition.text_mt,
            text_en: definition.text_en,
            register: null,
            nuance: null,
            field: 'numeral',
            sort_order: senseIndex,
        })),
    );
    finalizeEntryForInsert(tieletEntry);
    finalizeEntryForInsert(tlittEntry);

    // Verb pack: 3 root-linked rows and 2 stem-linked rows so the POS exercises both code paths.
    for (let i = 1; i <= 3; i += 1) {
        const root = roots[i - 1];
        const entry = rootEntry('verb', i, root);
        entries.push(entry);
        childRows.definitions.push(...entry.definitions.map((definition, senseIndex) => ({
            id: `zz-def-verb-root-${pad(i)}-${senseIndex + 1}`,
            entry_id: entry.id,
            subentry_id: null,
            sense_number: senseIndex + 1,
            text_mt: definition.text_mt,
            text_en: definition.text_en,
            register: null,
            nuance: null,
            field: 'verb',
            sort_order: senseIndex,
        })));
        for (const ph of entry.phonetics) {
            childRows.phonetics.push({
                id: `zz-phon-verb-root-${pad(i)}`,
                entry_id: entry.id,
                subentry_id: null,
                ipa: ph.ipa,
                dialect: ph.dialect,
                notes: ph.notes,
            });
        }
            // keep `etymology_chain` on entry (persisted as part of entries row)
            childRows.verb_morphology.push({
            entry_id: entry.id,
            form: entry.verb_form || null,
            class: entry.verb_class || null,
            weak_class: entry.verb_weak_class || null,
            transitivity: entry.verb_transitivity || null,
            perfective_3sgm: entry.verb_perfective_3sgm || null,
            imperfective_3sgm: entry.verb_imperfective_3sgm || null,
            verbal_noun: entry.verb_verbal_noun || null,
            active_participle: entry.verb_active_ptcp || null,
            passive_participle: entry.verb_passive_ptcp || null,
            vowel_set_perf: entry.verb_vowel_perf || null,
            vowel_set_impf: entry.verb_vowel_impf || null,
            vowel_set_impv: entry.verb_vowel_impv || null,
            type: entry.verb_type || null,
        });
        finalizeEntryForInsert(entry);
    }

    for (let i = 4; i <= 5; i += 1) {
        const stem = stems[i - 4];
        const entry = stemEntry('verb', i, stem);
        entries.push(entry);
        childRows.definitions.push(...entry.definitions.map((definition, senseIndex) => ({
            id: `zz-def-verb-stem-${pad(i)}-${senseIndex + 1}`,
            entry_id: entry.id,
            subentry_id: null,
            sense_number: senseIndex + 1,
            text_mt: definition.text_mt,
            text_en: definition.text_en,
            register: null,
            nuance: null,
            field: 'verb',
            sort_order: senseIndex,
        })));
        for (const ph of entry.phonetics) {
            childRows.phonetics.push({
                id: `zz-phon-verb-stem-${pad(i)}`,
                entry_id: entry.id,
                subentry_id: null,
                ipa: ph.ipa,
                dialect: ph.dialect,
                notes: ph.notes,
            });
        }
        // keep `etymology_chain` on entry (persisted as part of entries row)
        childRows.verb_morphology.push({
            entry_id: entry.id,
            form: entry.verb_form || null,
            class: entry.verb_class || null,
            weak_class: entry.verb_weak_class || null,
            transitivity: entry.verb_transitivity || null,
            perfective_3sgm: entry.verb_perfective_3sgm || null,
            imperfective_3sgm: entry.verb_imperfective_3sgm || null,
            verbal_noun: entry.verb_verbal_noun || null,
            active_participle: entry.verb_active_ptcp || null,
            passive_participle: entry.verb_passive_ptcp || null,
            vowel_set_perf: entry.verb_vowel_perf || null,
            vowel_set_impf: entry.verb_vowel_impf || null,
            vowel_set_impv: entry.verb_vowel_impv || null,
            type: entry.verb_type || null,
        });
        finalizeEntryForInsert(entry);
    }

    ENGINE_VERB_BRANCH_FIXTURES.forEach((fixture, index) => {
        const fixtureIndex = index + 1;
        const entry = makeEngineVerbEntry(fixture, fixtureIndex);
        entries.push(entry);
        childRows.definitions.push(...entry.definitions.map((definition, senseIndex) => ({
            id: `zz-def-verb-engine-${pad(fixtureIndex)}-${senseIndex + 1}`,
            entry_id: entry.id,
            subentry_id: null,
            sense_number: senseIndex + 1,
            text_mt: definition.text_mt,
            text_en: senseIndex === 0
                ? `engine branch fixture: ${fixture.branchKey}`
                : definition.text_en,
            register: null,
            nuance: null,
            field: 'verb',
            sort_order: senseIndex,
        })));
        for (const ph of entry.phonetics) {
            childRows.phonetics.push({
                id: `zz-phon-verb-engine-${pad(fixtureIndex)}`,
                entry_id: entry.id,
                subentry_id: null,
                ipa: ph.ipa,
                dialect: ph.dialect,
                notes: ph.notes,
            });
        }
        childRows.verb_morphology.push(verbMorphologyRowFromEntry(entry));
        finalizeEntryForInsert(entry);
    });

    return { roots, stems, entries, childRows };
}

async function ensureZokkColumn(client) {
    const info = await client.execute('PRAGMA table_info(entries)');
    const hasColumn = info.rows.some((row) => String(row.name) === 'zokk_morphology');
    if (hasColumn) return;
    await client.execute('ALTER TABLE entries ADD COLUMN zokk_morphology TEXT');
}

async function resetSeedPack(client) {
    const deletes = [
        "DELETE FROM phonetics WHERE entry_id LIKE 'zz-%'",
        "DELETE FROM definitions WHERE entry_id LIKE 'zz-%'",
        "DELETE FROM attestation_reliability WHERE entry_id LIKE 'zz-%'",
        "DELETE FROM subentries WHERE entry_id LIKE 'zz-%'",
        "DELETE FROM audio_files WHERE entry_id LIKE 'zz-%'",
        "DELETE FROM dialect_variants WHERE entry_id LIKE 'zz-%'",
        "DELETE FROM verb_morphology WHERE entry_id LIKE 'zz-%'",
        "DELETE FROM entries WHERE id LIKE 'zz-%'",
        "DELETE FROM roots WHERE id LIKE 'zz-root-%'",
        "DELETE FROM stems WHERE stem_string LIKE 'zz-%'",
    ];

    for (const sql of deletes) {
        await client.execute(sql);
    }
}

async function insertSql(client, table, row) {
    const columns = await getTableColumns(client, table);
    const entries = Object.entries(row).filter(([key]) => {
        if (table === 'entries' && String(key).startsWith('verb_')) return false;
        return columns.has(key);
    });
    if (entries.length === 0) {
        throw new Error(`No writable columns found for ${table}`);
    }

    const cols = entries.map(([key]) => key);
    const placeholders = cols.map(() => '?').join(', ');
    return {
        sql: `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
        args: entries.map(([, value]) => value),
    };
}

async function main() {
    const seedPack = buildSeedPack();

    if (DRY_RUN) {
        console.log('Seed pack preview');
        console.log(`  Roots:       ${seedPack.roots.length}`);
        console.log(`  Stems:       ${seedPack.stems.length}`);
        console.log(`  Entries:     ${seedPack.entries.length}`);
        console.log(`  Definitions: ${seedPack.childRows.definitions.length}`);
        console.log(`  Phonetics:   ${seedPack.childRows.phonetics.length}`);
        const etymCountPreview = seedPack.entries.reduce((n, e) => n + ((e.etymology_chain && e.etymology_chain.length) ? 1 : 0), 0);
        console.log(`  Etymologies: ${etymCountPreview}`);
        console.log(`  Verb morph:  ${seedPack.childRows.verb_morphology.length}`);

        const byPos = seedPack.entries.reduce((acc, entry) => {
            const key = `${entry.pos}:${entry.zokk_morphology ? 'stem' : (entry.root_consonants ? 'root' : 'plain')}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        console.log('  POS summary:');
        for (const [key, value] of Object.entries(byPos).sort(([a], [b]) => a.localeCompare(b))) {
            console.log(`    ${key} -> ${value}`);
        }
        return;
    }

    const env = loadEnv();
    const url = LOCAL ? 'file:local.db' : env.TURSO_URL || env.VITE_TURSO_URL;
    const authToken = LOCAL ? undefined : env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;

    if (!url) {
        throw new Error('Missing TURSO_URL or VITE_TURSO_URL. Create .dev.vars for the clone first.');
    }

    const client = createClient({ url, authToken });
    await ensureVerbMorphologyTable(client);
    await ensureZokkColumn(client);

    if (RESET) {
        console.log('Resetting existing seed pack rows...');
        await resetSeedPack(client);
    }

    console.log(`Seeding ${seedPack.roots.length} roots, ${seedPack.stems.length} stems, and ${seedPack.entries.length} entries...`);

    for (const root of seedPack.roots) {
        await client.execute(await insertSql(client, 'roots', root));
    }

    for (const stem of seedPack.stems) {
        await client.execute(await insertSql(client, 'stems', stem));
    }

    for (const entry of seedPack.entries) {
        await client.execute(await insertSql(client, 'entries', entry));
    }

    const definitionColumns = await getTableColumns(client, 'definitions');
    if (definitionColumns.size > 0) {
        for (const def of seedPack.childRows.definitions) {
            await client.execute(await insertSql(client, 'definitions', def));
        }
    } else {
        console.warn('Definitions child table not found; using entries.definitions JSON only.');
    }

    for (const phon of seedPack.childRows.phonetics) {
        await client.execute(await insertSql(client, 'phonetics', phon));
    }

    // Etymology chains are stored on the `entries` row as `etymology_chain` and will
    // be persisted by the entries insertion above; no separate etymology table.

    for (const verbMorphology of seedPack.childRows.verb_morphology) {
        await client.execute(await insertSql(client, 'verb_morphology', verbMorphology));
    }

    try {
        await client.execute("INSERT INTO entries_fts(entries_fts) VALUES('rebuild')");
    } catch (error) {
        console.warn('FTS rebuild skipped:', error.message);
    }

    const etymCount = seedPack.entries.reduce((n, e) => n + ((e.etymology_chain && e.etymology_chain.length) ? 1 : 0), 0);
    console.log('Seed complete:', {
        roots: seedPack.roots.length,
        stems: seedPack.stems.length,
        entries: seedPack.entries.length,
        definitions: seedPack.childRows.definitions.length,
        phonetics: seedPack.childRows.phonetics.length,
        entriesWithEtymology: etymCount,
        verb_morphology: seedPack.childRows.verb_morphology.length,
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main().catch((error) => {
        console.error('Seed pack failed:', error);
        process.exitCode = 1;
    });
}
