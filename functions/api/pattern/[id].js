/**
 * GET /api/pattern/:id
 * Fetch a single pattern with its metadata and a sample of entries using it.
 */

import { createClient } from '@libsql/client/web';
import { normalizePluralFormRows } from '../../../src/lib/pluralForms.ts';

const POS_GROUP_ORDER = [
    'verb',
    'noun',
    'adjective',
    'adverb',
    'numeral',
    'participle',
    'pronoun',
    'preposition',
    'conjunction',
    'article',
    'interjection',
    'particle',
    'other',
];

const MORPHOLOGY_GROUP_ORDER = ['lemma', 'broken_plural', 'sound_plural', 'dual', 'augmentative', 'other'];
const MORPHOLOGY_ROLE_LABELS = {
    lemma: 'Lemma',
    broken_plural: 'Broken Plural',
    sound_plural: 'Sound Plural',
    dual: 'Dual',
    augmentative: 'Augmentative',
    other: 'Other',
};

function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
}

function titleCase(value) {
    return String(value || '')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function normalizeText(value) {
    return String(value || '').trim();
}

function normalizePatternField(value) {
    return normalizeToken(value).replace(/\s+/g, '');
}

function splitPatternValues(value) {
    return String(value || '')
        .split(',')
        .map((part) => normalizePatternField(part))
        .filter(Boolean);
}

function matchesPatternNotation(value, notation) {
    const target = normalizePatternField(notation);
    if (!target) return false;

    const source = normalizePatternField(value);
    if (!source) return false;
    if (source === target) return true;

    return splitPatternValues(value).some((part) => part === target);
}

function readPathValue(source, path) {
    if (!source) return undefined;

    const parts = String(path || '').split('.');
    let current = source;

    for (const part of parts) {
        if (!current || typeof current !== 'object') return undefined;
        current = current[part];
    }

    return current;
}

function getPosGroupKey(value) {
    const key = normalizeToken(value);
    return key || 'other';
}

function getPosGroupLabel(key) {
    return key === 'other' ? 'Other' : titleCase(key);
}

function getMorphologyGroupLabel(key) {
    return MORPHOLOGY_ROLE_LABELS[key] || getPosGroupLabel(key);
}

function getMatchingPluralDisplay(row, patternNotation) {
    const target = normalizePatternField(patternNotation);
    if (!target) return null;

    const headword = normalizeText(row.headword).normalize('NFC').toLowerCase();
    const pluralRows = normalizePluralFormRows(row.inflections_pl, row.form_plural_pattern)
        .map((pluralRow) => ({
            form: normalizeText(pluralRow.form),
            pattern: normalizePatternField(pluralRow.pattern),
        }))
        .filter((pluralRow) => pluralRow.form || pluralRow.pattern);

    const matchingRow = pluralRows.find((pluralRow) => {
        if (!pluralRow.pattern || !matchesPatternNotation(pluralRow.pattern, target)) {
            return false;
        }

        const normalizedForm = pluralRow.form.normalize('NFC').toLowerCase();
        return normalizedForm && normalizedForm !== headword;
    }) || pluralRows.find((pluralRow) => pluralRow.pattern && matchesPatternNotation(pluralRow.pattern, target));

    if (!matchingRow?.form) return null;

    const normalizedPlural = matchingRow.form.normalize('NFC').toLowerCase();
    if (!normalizedPlural || normalizedPlural === headword) return null;

    return matchingRow.form;
}

function resolveMorphologyMatch(row, patternNotation) {
    const pluralField = ['nm_plural_pattern', 'nm_sound_plural'].find((field) =>
        matchesPatternNotation(readPathValue(row, field), patternNotation),
    );

    if (pluralField) {
        const pluralDisplay = getMatchingPluralDisplay(row, patternNotation);
        const key = pluralField === 'nm_sound_plural' ? 'sound_plural' : 'broken_plural';
        return {
            key,
            label: MORPHOLOGY_ROLE_LABELS[key],
            match: {
                role: 'plural',
                displayValue: pluralDisplay || normalizeText(row.headword),
                sourceField: pluralField,
                matchedSuffix: normalizePatternField(patternNotation),
            },
        };
    }

    const dualField = ['nm_dual_pattern'].find((field) =>
        matchesPatternNotation(readPathValue(row, field), patternNotation),
    );

    if (dualField) {
        return {
            key: 'dual',
            label: MORPHOLOGY_ROLE_LABELS.dual,
            match: {
                role: 'dual',
                displayValue: normalizeText(row.headword),
                sourceField: dualField,
                matchedSuffix: normalizePatternField(patternNotation),
            },
        };
    }

    const derivationalField = ['nm_augmentative_pattern', 'nm_pattern'].find((field) =>
        matchesPatternNotation(readPathValue(row, field), patternNotation),
    );

    if (derivationalField) {
        const key = derivationalField === 'nm_augmentative_pattern' ? 'augmentative' : 'lemma';
        return {
            key,
            label: MORPHOLOGY_ROLE_LABELS[key],
            match: {
                role: 'derivational',
                displayValue: normalizeText(row.headword),
                sourceField: derivationalField,
                matchedSuffix: normalizePatternField(patternNotation),
            },
        };
    }

    const lemmaField = matchesPatternNotation(readPathValue(row, 'am_pattern'), patternNotation);

    if (lemmaField) {
        return {
            key: 'lemma',
            label: MORPHOLOGY_ROLE_LABELS.lemma,
            match: {
                role: 'lemma',
                displayValue: normalizeText(row.headword),
                sourceField: 'am_pattern',
                matchedSuffix: normalizePatternField(patternNotation),
            },
        };
    }

    return {
        key: 'other',
        label: MORPHOLOGY_ROLE_LABELS.other,
        match: null,
    };
}

function buildGroups(entries, order, getKey, getLabel) {
    const buckets = new Map();

    entries.forEach((entry) => {
        const key = getKey(entry);
        const next = buckets.get(key) || [];
        next.push(entry);
        buckets.set(key, next);
    });

    return order
        .filter((key) => (buckets.get(key) || []).length > 0)
        .map((key) => ({
            key,
            label: getLabel(key),
            count: buckets.get(key).length,
            entries: (buckets.get(key) || []).sort((a, b) => {
                const left = normalizeText(a.headword).toLowerCase();
                const right = normalizeText(b.headword).toLowerCase();
                return left.localeCompare(right);
            }),
        }));
}

export async function onRequestGet({ params, env }) {
    const { id } = params;
    if (!id) return json({ error: 'Missing id' }, 400);

    try {
        const url = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url, authToken: token });

        // 1. Fetch Pattern metadata
        const patternRes = await db.execute({
            sql: `SELECT * FROM patterns WHERE id = ?`,
            args: [id]
        });

        if (!patternRes.rows.length) return json({ error: 'Pattern not found' }, 404);
        const pattern = patternRes.rows[0];

        // 2. Fetch Applicability (Roles)
        const appRes = await db.execute({
            sql: `SELECT DISTINCT category, pos, linguistic_role, gender, stress 
                  FROM pattern_applicability 
                  WHERE pattern_id = ? AND is_active = 1`,
            args: [id]
        });

        // 3. Fetch sample entries
        // We look for entries matching this pattern ID via root_pattern_forms, direct CV notation,
        // or plural/morph pattern fields that carry the same pattern notation.
        // If the entry has multiple plural realizations, carry forward the one that matches this pattern.
        const patternNotation = pattern.cv_notation || pattern.wizen_notation || '';
        const normalizedPatternNotation = normalizePatternField(patternNotation);
        const tokenLike = normalizedPatternNotation ? `%,${normalizedPatternNotation},%` : '';
        const entriesRes = await db.execute({
            sql: `SELECT e.id, e.headword, e.pos,
                         nm.plural_forms AS nm_plural_forms, nm.form_plural_pattern AS nm_plural_pattern,
                         nm.sound_plural AS nm_sound_plural, nm.dual_pattern AS nm_dual_pattern,
                         nm.augmentative_pattern AS nm_augmentative_pattern,
                         nm.pattern AS nm_pattern,
                         am.pattern AS am_pattern,
                         COALESCE(r.consonants, e.root_consonants) AS root_consonants, r.id AS root_id,
                         json_extract(e.definitions, '$[0].text_en') as definition
                  FROM entries e
                  LEFT JOIN root_pattern_forms rpf ON rpf.id = e.id
                  LEFT JOIN roots r ON r.id = rpf.root_id OR r.consonants = e.root_consonants
                  LEFT JOIN noun_morphology nm ON nm.entry_id = e.id
                  LEFT JOIN adj_morphology am ON am.entry_id = e.id
                  WHERE rpf.pattern_id = ?
                     OR LOWER(COALESCE(am.pattern, '')) = LOWER(?)
                     OR (',' || LOWER(REPLACE(COALESCE(nm.form_plural_pattern, ''), ' ', '')) || ',') LIKE ?
                     OR (',' || LOWER(REPLACE(COALESCE(nm.dual_pattern, ''), ' ', '')) || ',') LIKE ?
                     OR (',' || LOWER(REPLACE(COALESCE(nm.sound_plural, ''), ' ', '')) || ',') LIKE ?
                     OR (',' || LOWER(REPLACE(COALESCE(nm.augmentative_pattern, ''), ' ', '')) || ',') LIKE ?
                  LIMIT 50`,
            args: [
                id,
                patternNotation,
                tokenLike,
                tokenLike,
                tokenLike,
                tokenLike,
                tokenLike,
                tokenLike,
            ]
        });

        const entries = entriesRes.rows.map((row) => {
            const plural_display = getMatchingPluralDisplay(row, patternNotation);
            const pos_group_key = getPosGroupKey(row.pos);
            const pos_group_label = getPosGroupLabel(pos_group_key);
            const morphologyMatch = resolveMorphologyMatch(row, patternNotation);

            return {
                ...row,
                plural_display,
                match_role: morphologyMatch.match?.role || null,
                match_display_value: morphologyMatch.match?.displayValue || null,
                match_source_field: morphologyMatch.match?.sourceField || null,
                pos_group_key,
                pos_group_label,
                morphology_group_key: morphologyMatch.key,
                morphology_group_label: morphologyMatch.label,
            };
        });

        const entryGroups = {
            pos: buildGroups(
                entries,
                POS_GROUP_ORDER,
                (entry) => entry.pos_group_key || 'other',
                (key) => getPosGroupLabel(key),
            ),
            morphology: buildGroups(
                entries,
                MORPHOLOGY_GROUP_ORDER,
                (entry) => entry.morphology_group_key || 'other',
                (key) => getMorphologyGroupLabel(key),
            ),
        };

        return json({
            pattern,
            roles: appRes.rows,
            entries,
            entry_groups: entryGroups,
        });

    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
