import { createClient } from '@libsql/client';
import fs from 'node:fs';

const vars = fs.existsSync('.dev.vars')
    ? Object.fromEntries(fs.readFileSync('.dev.vars', 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith('#'))
        .map((line) => {
            const index = line.indexOf('=');
            return [line.slice(0, index), line.slice(index + 1)];
        }))
    : {};

const target = process.argv.includes('--local') ? 'local' : 'remote';
const url = target === 'local' ? 'file:local.db' : vars.TURSO_URL;
const authToken = target === 'local' ? undefined : vars.TURSO_AUTH_TOKEN;

if (!url) {
    console.error(`Missing database URL for ${target}`);
    process.exit(1);
}

const client = createClient({ url, authToken });

const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function json(value) {
    return JSON.stringify(value);
}

const entries = [
    {
        id: 'num-tlieta',
        headword: 'tlieta',
        pos: 'numeral',
        gender: 'feminine',
        root_consonants: 't-l-t',
        is_loanword: 0,
        is_inflectable: 0,
        source_language: 'Wiktionary',
        source_citation: 'Wiktionary',
        source_display: 'Wiktionary',
        definitions: json([{ text_en: 'three', text_mt: 'tlieta' }]),
        usage_examples: json([{ text_en: 'three books', text_mt: 'tliet kotba' }]),
        cv_pattern: 'CâCvC',
        numeral_type: 'cardinal',
        form_attributive_short: 'tliet',
        form_attributive_short_pattern: 'CvCVC',
        form_attributive_long: 'tlitt',
        numeral_ordinal: 'tielet',
        numeral_adverbial: 'tliet darbiet',
        numeral_fractional: 'terz',
        numeral_multiplier: 'triplu',
        numeral_distributive: 'tlieta tlieta',
        created_at: now,
        updated_at: now,
    },
    {
        id: 'num-tielet',
        headword: 'tielet',
        pos: 'numeral',
        gender: 'masculine',
        root_consonants: 't-l-t',
        is_loanword: 0,
        is_inflectable: 0,
        source_language: 'Wiktionary',
        source_citation: 'Wiktionary',
        source_display: 'Wiktionary',
        definitions: json([{ text_en: 'third', text_mt: 'tielet' }]),
        usage_examples: json([{ text_en: 'the third one', text_mt: 'it-tielet wieħed' }]),
        cv_pattern: 'CâCvC',
        numeral_type: 'ordinal',
        form_attributive_short: 'tielet',
        form_attributive_short_pattern: 'CâCvC',
        form_attributive_long: 'tielet',
        ordinal_form: 'tielet',
        created_at: now,
        updated_at: now,
    },
    {
        id: 'num-tlitt',
        headword: 'tlitt',
        pos: 'numeral',
        gender: 'masculine',
        root_consonants: 't-l-t',
        is_loanword: 0,
        is_inflectable: 0,
        source_language: 'Wiktionary',
        source_citation: 'Wiktionary',
        source_display: 'Wiktionary',
        definitions: json([{ text_en: 'short attributive form of three', text_mt: 'forma attributtiva qasira ta\' tlieta' }]),
        usage_examples: json([{ text_en: 'three men', text_mt: 'tlitt irġiel' }]),
        cv_pattern: 'CâCC',
        numeral_type: 'cardinal',
        form_attributive_short: 'tlitt',
        form_attributive_short_pattern: 'CâCC',
        form_attributive_long: 'tlitt',
        created_at: now,
        updated_at: now,
    },
];

const relationships = [
    { id: 'rel-num-tlieta-num-tielet', entry_id: 'num-tlieta', target_entry_id: 'num-tielet', relationship_type: 'related', sort_order: 0, created_at: now },
    { id: 'rel-num-tlieta-num-tlitt', entry_id: 'num-tlieta', target_entry_id: 'num-tlitt', relationship_type: 'related', sort_order: 1, created_at: now },
    { id: 'rel-num-tielet-num-tlieta', entry_id: 'num-tielet', target_entry_id: 'num-tlieta', relationship_type: 'related', sort_order: 0, created_at: now },
    { id: 'rel-num-tlitt-num-tlieta', entry_id: 'num-tlitt', target_entry_id: 'num-tlieta', relationship_type: 'related', sort_order: 0, created_at: now },
];

async function run() {
    console.log(`Seeding tlieta numeral fixtures into ${target} DB at ${url}...`);

    await client.execute({
        sql: `DELETE FROM entry_relationships WHERE id IN (?, ?, ?, ?)`,
        args: relationships.map((r) => r.id),
    });
    await client.execute({
        sql: `DELETE FROM numeral_morphology WHERE entry_id IN (?, ?, ?)`,
        args: entries.map((e) => e.id),
    });
    await client.execute({
        sql: `DELETE FROM entries WHERE id IN (?, ?, ?)`,
        args: entries.map((e) => e.id),
    });

    for (const entry of entries) {
        await client.execute({
            sql: `INSERT INTO entries (
                id, headword, pos, gender, root_consonants, is_loanword, is_inflectable,
                source_language, source_citation, source_display, definitions, usage_examples,
                cv_pattern, numeral_type, form_attributive_short,
                form_attributive_long, numeral_ordinal, numeral_adverbial, numeral_fractional,
                numeral_multiplier, numeral_distributive, created_at, updated_at
            ) VALUES (${new Array(23).fill('?').join(', ')})`,
            args: [
                entry.id, entry.headword, entry.pos, entry.gender, entry.root_consonants,
                entry.is_loanword, entry.is_inflectable, entry.source_language, entry.source_citation,
                entry.source_display, entry.definitions, entry.usage_examples, entry.cv_pattern,
                entry.numeral_type, entry.form_attributive_short,
                entry.form_attributive_long, entry.numeral_ordinal || null, entry.numeral_adverbial || null,
                entry.numeral_fractional || null, entry.numeral_multiplier || null, entry.numeral_distributive || null,
                entry.created_at, entry.updated_at,
            ],
        });

        await client.execute({
            sql: `INSERT INTO numeral_morphology (
                entry_id, numeral_type, form_attributive_short, form_attributive_short_pattern,
                form_attributive_long, ordinal_form, adverbial_form, fractional_form,
                multiplier_form, distributive_form, created_at, updated_at
            ) VALUES (${new Array(12).fill('?').join(', ')})`,
            args: [
                entry.id, entry.numeral_type, entry.form_attributive_short, entry.form_attributive_short_pattern,
                entry.form_attributive_long, entry.numeral_ordinal || null, entry.numeral_adverbial || null,
                entry.numeral_fractional || null, entry.numeral_multiplier || null, entry.numeral_distributive || null,
                entry.created_at, entry.updated_at,
            ],
        });
    }

    for (const rel of relationships) {
        await client.execute({
            sql: `INSERT INTO entry_relationships (id, entry_id, target_entry_id, relationship_type, sort_order, created_at)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [rel.id, rel.entry_id, rel.target_entry_id, rel.relationship_type, rel.sort_order, rel.created_at],
        });
    }

    console.log('Seeded tlieta fixtures successfully.');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
