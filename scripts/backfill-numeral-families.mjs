import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client/web';
import {
    NUMERAL_ROLE_META,
    NUMERAL_ROLE_ORDER,
    buildNumeralMorphologyDisplayForms,
    normalizeNumeralLookupKey,
    normalizeNumeralRole,
} from '../src/lib/numeralMorphology.ts';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

const ROLE_FIELD_ALIASES = {
    attributive_short: ['form_attributive_short', 'num_attr_short'],
    attributive_long: ['form_attributive_long', 'num_attr_long'],
    ordinal: ['ordinal_form', 'num_ordinal', 'numeral_ordinal'],
    adverbial: ['adverbial_form', 'num_adverbial', 'numeral_adverbial'],
    fractional: ['fractional_form', 'num_fractional', 'numeral_fractional'],
    multiplier: ['multiplier_form', 'num_multiplier', 'numeral_multiplier'],
    distributive: ['distributive_form', 'num_distributive', 'numeral_distributive'],
};

function firstValue(entry, keys) {
    for (const key of keys) {
        const value = entry?.[key] ?? entry?.numeral_morphology?.[key];
        if (value !== undefined && value !== null && String(value).trim()) return value;
    }
    return null;
}

function splitSurfaceValues(value) {
    if (Array.isArray(value)) {
        return value.flatMap(splitSurfaceValues);
    }
    if (value && typeof value === 'object') {
        return splitSurfaceValues(value.value ?? value.form ?? '');
    }
    const text = String(value || '').trim();
    if (!text) return [];
    if (text.startsWith('[')) {
        try {
            return splitSurfaceValues(JSON.parse(text));
        } catch {
            return [text];
        }
    }
    return [text];
}

function normalizeSurface(value) {
    return normalizeNumeralLookupKey(String(value || '').replace(/^[*✦]\s*/, '').trim());
}

function resolveExplicitRole(entry) {
    return (
        normalizeNumeralRole(entry?.numeral_type)
        || normalizeNumeralRole(entry?.numeral_morphology?.numeral_type)
        || normalizeNumeralRole(entry?.num_type)
    );
}

function resolveRole(entry) {
    return resolveExplicitRole(entry) || 'cardinal';
}

function normalizedRoot(entry) {
    return String(entry?.root_consonants || entry?.root_pattern_form?.root?.consonants || '')
        .trim()
        .toLowerCase();
}

function normalizeNumeralRow(entry) {
    const morphology = {};
    const explicitRole = resolveExplicitRole(entry);
    if (explicitRole) morphology.numeral_type = explicitRole;

    for (const [roleKey, aliases] of Object.entries(ROLE_FIELD_ALIASES)) {
        const value = firstValue(entry, aliases);
        if (value !== null && NUMERAL_ROLE_META[roleKey]?.dbField) {
            morphology[NUMERAL_ROLE_META[roleKey].dbField] = value;
        }
    }

    const shortPattern = firstValue(entry, ['form_attributive_short_pattern', 'num_attr_short_pattern']);
    if (shortPattern) morphology.form_attributive_short_pattern = shortPattern;
    const pluralPattern = firstValue(entry, ['form_plural_pattern', 'num_plural_pattern']);
    if (pluralPattern) morphology.form_plural_pattern = pluralPattern;

    return {
        ...entry,
        pos: entry.pos || 'numeral',
        root_consonants: normalizedRoot(entry),
        ...(explicitRole ? { numeral_type: explicitRole } : {}),
        numeral_morphology: {
            ...(entry.numeral_morphology || {}),
            ...morphology,
        },
    };
}

function relationshipId(entryId, targetEntryId) {
    return `rel_${entryId}_${targetEntryId}_related`;
}

function relationshipKey(entryId, targetEntryId) {
    return `${entryId}\u0000${targetEntryId}\u0000related`;
}

function buildExistingRelationshipSet(existingRelationships) {
    return new Set((existingRelationships || [])
        .filter((rel) => String(rel.relationship_type || 'related') === 'related')
        .map((rel) => relationshipKey(String(rel.entry_id || ''), String(rel.target_entry_id || ''))));
}

function findEntryBySurface(entries, surface) {
    const key = normalizeSurface(surface);
    if (!key) return null;
    return entries.find((entry) => normalizeSurface(entry.headword) === key) || null;
}

function collectSavedSurfaceConflicts(cardinal, sameRootEntries) {
    const conflicts = [];
    const conflictKeys = new Set();

    for (const role of NUMERAL_ROLE_ORDER) {
        if (role === 'cardinal') continue;
        const dbField = NUMERAL_ROLE_META[role].dbField;
        if (!dbField) continue;

        splitSurfaceValues(cardinal.numeral_morphology?.[dbField]).forEach((surface) => {
            const matched = findEntryBySurface(sameRootEntries, surface);
            const matchedRole = matched ? resolveExplicitRole(matched) : null;
            if (!matched || !matchedRole || matchedRole === role) return;

            conflictKeys.add(`${role}:${matched.id}`);
            conflicts.push({
                cardinalId: cardinal.id,
                role,
                surface,
                matchedEntryId: matched.id,
                matchedHeadword: matched.headword,
                matchedRole,
            });
        });
    }

    return { conflicts, conflictKeys };
}

function addPlannedRelationship(plan, existingKeys, seenKeys, entryId, targetEntryId) {
    if (!entryId || !targetEntryId || entryId === targetEntryId) return;
    const key = relationshipKey(entryId, targetEntryId);
    if (existingKeys.has(key) || seenKeys.has(key)) return;
    seenKeys.add(key);
    plan.relationships.push({
        id: relationshipId(entryId, targetEntryId),
        entryId,
        targetEntryId,
        relationshipType: 'related',
    });
}

export function buildNumeralFamilyBackfillPlan(entries, existingRelationships = []) {
    const rawNumerals = (entries || [])
        .filter((entry) => String(entry?.pos || '').trim().toLowerCase() === 'numeral');
    const numerals = rawNumerals.map(normalizeNumeralRow);
    const existingKeys = buildExistingRelationshipSet(existingRelationships);
    const seenRelationshipKeys = new Set();
    const plan = {
        roleMirrors: [],
        relationships: [],
        conflicts: [],
    };

    for (const entry of rawNumerals) {
        const topLevelRole = normalizeNumeralRole(entry?.numeral_type);
        const normalizedRole = normalizeNumeralRole(entry?.num_type || entry?.numeral_morphology?.numeral_type);
        if (topLevelRole && !normalizedRole) {
            plan.roleMirrors.push({ entryId: entry.id, role: topLevelRole });
        }
    }

    for (const cardinal of numerals.filter((entry) => resolveRole(entry) === 'cardinal')) {
        const root = normalizedRoot(cardinal);
        if (!root) continue;

        const sameRootEntries = numerals.filter((entry) => entry.id !== cardinal.id && normalizedRoot(entry) === root);
        if (sameRootEntries.length === 0) continue;

        const { conflicts, conflictKeys } = collectSavedSurfaceConflicts(cardinal, sameRootEntries);
        plan.conflicts.push(...conflicts);

        const displayForms = buildNumeralMorphologyDisplayForms(
            cardinal.headword || '',
            root,
            cardinal.numeral_morphology || { numeral_type: 'cardinal' },
            sameRootEntries,
        );

        for (const role of NUMERAL_ROLE_ORDER) {
            if (role === 'cardinal') continue;
            const displayKey = NUMERAL_ROLE_META[role].displayKey;
            const values = Array.isArray(displayForms[displayKey]) ? displayForms[displayKey] : [];
            for (const value of values) {
                if (!value.entryId || value.entryId === cardinal.id) continue;
                if (conflictKeys.has(`${role}:${value.entryId}`)) continue;
                addPlannedRelationship(plan, existingKeys, seenRelationshipKeys, cardinal.id, value.entryId);
                addPlannedRelationship(plan, existingKeys, seenRelationshipKeys, value.entryId, cardinal.id);
            }
        }
    }

    plan.roleMirrors.sort((a, b) => a.entryId.localeCompare(b.entryId));
    return plan;
}

function loadEnv() {
    const env = { ...process.env };
    for (const filename of ['.dev.vars', '.env']) {
        const filePath = path.join(PROJECT_ROOT, filename);
        if (!fs.existsSync(filePath)) continue;
        const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const index = trimmed.indexOf('=');
            if (index <= 0) continue;
            const key = trimmed.slice(0, index).trim();
            const value = trimmed.slice(index + 1).trim();
            if (!env[key]) env[key] = value;
        }
    }
    return env;
}

async function fetchNumeralEntries(client) {
    const res = await client.execute(`
        SELECT
            e.id,
            e.headword,
            e.pos,
            e.root_consonants,
            e.cv_pattern,
            e.numeral_type,
            num.numeral_type AS num_type,
            num.form_attributive_short AS num_attr_short,
            num.form_attributive_short_pattern AS num_attr_short_pattern,
            num.form_attributive_long AS num_attr_long,
            num.ordinal_form AS num_ordinal,
            num.adverbial_form AS num_adverbial,
            num.fractional_form AS num_fractional,
            num.multiplier_form AS num_multiplier,
            num.distributive_form AS num_distributive,
            num.form_plural_pattern AS num_plural_pattern
        FROM entries e
        LEFT JOIN numeral_morphology num ON num.entry_id = e.id
        WHERE LOWER(TRIM(e.pos)) = 'numeral'
    `);
    return res.rows;
}

async function fetchExistingRelationships(client) {
    const res = await client.execute(`
        SELECT entry_id, target_entry_id, relationship_type
        FROM entry_relationships
        WHERE relationship_type = 'related'
    `);
    return res.rows;
}

async function applyBackfillPlan(client, plan) {
    for (const mirror of plan.roleMirrors) {
        await client.execute({
            sql: `
                INSERT INTO numeral_morphology (entry_id, numeral_type, updated_at)
                VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
                ON CONFLICT(entry_id) DO UPDATE SET
                    numeral_type = excluded.numeral_type,
                    updated_at = excluded.updated_at
                WHERE numeral_morphology.numeral_type IS NULL
                   OR TRIM(numeral_morphology.numeral_type) = ''
            `,
            args: [mirror.entryId, mirror.role],
        });
    }

    for (const rel of plan.relationships) {
        await client.execute({
            sql: `
                INSERT OR IGNORE INTO entry_relationships (
                    id, entry_id, target_entry_id, relationship_type, sort_order, created_at
                )
                VALUES (?, ?, ?, 'related', 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            `,
            args: [rel.id, rel.entryId, rel.targetEntryId],
        });
    }
}

function logPlan(plan, execute) {
    console.log(`${execute ? 'Executing' : 'Dry run'} numeral family backfill`);
    console.log(`Role mirrors: ${plan.roleMirrors.length}`);
    plan.roleMirrors.forEach((item) => console.log(`  ${item.entryId}: ${item.role}`));
    console.log(`Relationships to insert: ${plan.relationships.length}`);
    plan.relationships.forEach((item) => console.log(`  ${item.entryId} -> ${item.targetEntryId}`));
    console.log(`Conflicts: ${plan.conflicts.length}`);
    plan.conflicts.forEach((item) => {
        console.log(`  ${item.cardinalId} ${item.role}="${item.surface}" matches ${item.matchedEntryId} (${item.matchedRole})`);
    });
    if (!execute) console.log('No writes performed. Re-run with --execute to apply.');
}

export async function runNumeralFamilyBackfill({ execute = false, env = loadEnv() } = {}) {
    const url = env.TURSO_URL || env.VITE_TURSO_URL;
    const authToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
    if (!url) throw new Error('Missing TURSO_URL or VITE_TURSO_URL');

    const client = createClient({ url, authToken });
    const [entries, relationships] = await Promise.all([
        fetchNumeralEntries(client),
        fetchExistingRelationships(client),
    ]);
    const plan = buildNumeralFamilyBackfillPlan(entries, relationships);
    logPlan(plan, execute);
    if (execute) await applyBackfillPlan(client, plan);
    return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runNumeralFamilyBackfill({ execute: process.argv.includes('--execute') })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
