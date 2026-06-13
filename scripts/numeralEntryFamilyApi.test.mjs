import assert from 'node:assert/strict';
import { resolveNumeralFamilyEntries } from '../functions/api/entry/[id].js';

const numeralRows = [
    {
        id: 'num-erbgħa',
        headword: 'erbgħa',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        resolved_root_consonants: 'r-b-għ',
        cv_notation: 'vCCvC',
        num_type: 'cardinal',
        num_attr_short: "erba'",
        num_attr_long: 'erbat',
        num_ordinal: "raba'",
        num_fractional: 'kwart',
        num_multiplier: 'rbiegħi',
        num_distributive: 'rbiegħ',
        stem: 'erb',
        s_class: 'ar',
        s_hybrid: 1,
        s_suffix: '-i',
        text_en: 'four',
        text_mt: 'erbgħa',
        gloss_en: 'four',
        gloss_mt: 'erbgħa',
    },
    {
        id: 'num-erbat',
        headword: 'erbat',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        resolved_root_consonants: 'r-b-għ',
        cv_notation: 'vCCvC',
        num_type: 'attributive_long',
        text_en: 'long attributive of four',
        text_mt: 'erbat',
        gloss_en: 'long attributive of four',
        gloss_mt: 'erbat',
    },
    {
        id: 'num-raba',
        headword: "raba'",
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        resolved_root_consonants: 'r-b-għ',
        cv_notation: 'CvCv',
        num_type: 'ordinal',
        text_en: 'fourth',
        text_mt: "raba'",
        gloss_en: 'fourth',
        gloss_mt: "raba'",
    },
    {
        id: 'num-kwart',
        headword: 'kwart',
        pos: 'numeral',
        root_consonants: '',
        resolved_root_consonants: '',
        cv_notation: 'CCvCC',
        num_type: 'fractional',
        text_en: 'quarter',
        text_mt: 'kwart',
        gloss_en: 'quarter',
        gloss_mt: 'kwart',
    },
    {
        id: 'num-rbiegh',
        headword: 'rbiegħ',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        resolved_root_consonants: 'r-b-għ',
        cv_notation: 'CCieC',
        num_type: 'distributive',
        text_en: 'four each',
        text_mt: 'rbiegħ',
        gloss_en: 'four each',
        gloss_mt: 'rbiegħ',
    },
    {
        id: 'num-rbieghi',
        headword: 'rbiegħi',
        pos: 'numeral',
        root_consonants: 'r-b-għ',
        resolved_root_consonants: 'r-b-għ',
        cv_notation: 'CCieCi',
        num_type: 'multiplier',
        text_en: 'quadruple',
        text_mt: 'rbiegħi',
        gloss_en: 'quadruple',
        gloss_mt: 'rbiegħi',
    },
    {
        id: 'noun-kwart',
        headword: 'kwart',
        pos: 'noun',
        root_consonants: 'r-b-għ',
        resolved_root_consonants: 'r-b-għ',
        cv_notation: 'CCvCC',
        text_en: 'quarter as a noun',
        text_mt: 'kwart',
        gloss_en: 'quarter as a noun',
        gloss_mt: 'kwart',
    },
];

class FakeClient {
    async execute(query) {
        const sql = typeof query === 'string' ? query : query.sql;
        const args = typeof query === 'string' ? [] : (query.args || []);
        const normalized = sql.replace(/\s+/g, ' ');

        if (normalized.includes('FROM entry_relationships r') && normalized.includes('r.entry_id = ?')) {
            return { rows: [] };
        }

        if (normalized.includes('FROM entry_relationships r') && normalized.includes('r.target_entry_id = ?')) {
            assert.equal(args[0], 'num-kwart', 'reciprocal lookup should start from the current derived numeral');
            return { rows: [numeralRows.find((row) => row.id === 'num-erbgħa')] };
        }

        if (normalized.includes("LOWER(TRIM(e.pos)) = 'numeral'") && normalized.includes('e.id != ?')) {
            const rootArgs = new Set(args.map(String));
            return {
                rows: numeralRows.filter((row) => (
                    row.pos === 'numeral'
                    && row.id !== 'num-kwart'
                    && rootArgs.has(row.root_consonants)
                )),
            };
        }

        throw new Error(`Unhandled SQL in fake client: ${normalized}`);
    }
}

const family = await resolveNumeralFamilyEntries(new FakeClient(), {
    currentEntryId: 'num-kwart',
    currentRootConsonants: '',
    explicitRelatedEntries: [
        {
            id: 'num-rbiegh',
            headword: 'rbiegħ',
            pos: 'numeral',
            relationship_source: 'explicit',
        },
    ],
});

assert.deepEqual(
    family.map((entry) => [entry.id, entry.relationship_source]),
    [
        ['num-rbiegh', 'explicit'],
        ['num-erbgħa', 'reciprocal'],
        ['num-erbat', 'same_root'],
        ['num-raba', 'same_root'],
        ['num-rbieghi', 'same_root'],
    ],
    'API numeral family resolver should merge explicit, reciprocal, and same-root numeral entries in deterministic order',
);

const cardinal = family.find((entry) => entry.id === 'num-erbgħa');
assert.equal(cardinal?.root_consonants, 'r-b-għ', 'reciprocal cardinal should carry its hydrated root key');
assert.equal(cardinal?.numeral_morphology?.fractional_form, 'kwart', 'reciprocal cardinal should carry hydrated numeral morphology');
assert.deepEqual(
    cardinal?.zokk_morphology,
    {
        stem: 'erb',
        zokk_class: 'ar',
        zokk_is_hybrid: true,
        root_consonants: 'r-b-għ',
        zokk_agentive_suffix: '-i',
    },
    'reciprocal cardinal should carry hydrated stem morphology for derived numeral provenance display',
);

const explicitRbiegh = family.find((entry) => entry.id === 'num-rbiegh');
assert.equal(explicitRbiegh?.relationship_source, 'explicit', 'explicit relationships should outrank same-root duplicates');
assert.equal(explicitRbiegh?.cv_pattern, 'CCieC', 'same-root duplicates should enrich explicit shallow entries');

assert.equal(
    family.some((entry) => entry.id === 'noun-kwart'),
    false,
    'API numeral family resolver should not include same-root non-numerals',
);

console.log('numeralEntryFamilyApi.test.mjs passed');
