
import { createClient } from '@libsql/client/web';

function normalizeRadical(val) {
    return decodeURIComponent(val || '').toLowerCase().trim().normalize('NFC');
}

function radicalVariants(r) {
    if (r === 'gh') return ['gh', 'għ'];
    if (r === 'għ') return ['għ', 'gh'];
    return [r];
}

function matchesRadical(actual, query) {
    if (!query) return true;
    const a = String(actual || '').toLowerCase().trim().normalize('NFC');
    if (a === query) return true;
    if (query === 'gh' && a === 'għ') return true;
    if (query === 'għ' && a === 'gh') return true;
    return false;
}

function inferVirtualRootMetadata(consonants, entryRows) {
    const consonantArray = consonants.split('-').map((c) => c.trim()).filter(Boolean);
    const primaryVerb = entryRows.find((r) => String(r.pos || '').toLowerCase() === 'verb' && r.verb_morphology?.form === 'I')
        || entryRows.find((r) => String(r.pos || '').toLowerCase() === 'verb')
        || null;
    const vm = primaryVerb?.verb_morphology;

    let strength = String(vm?.class || 'strong').trim().toLowerCase();
    if (strength === 'doubled') strength = 'geminated';
    if (!strength) strength = 'strong';
    let weakClass = vm?.weak_class ? String(vm.weak_class).trim().toLowerCase() : null;

    if (strength === 'strong' && !weakClass) {
        if (consonantArray.length === 3) {
            const [c1, c2, c3] = consonantArray;
            if (c3 === 'j' || c3 === 'w') {
                strength = 'weak';
                weakClass = 'defective';
            } else if (c2 === 'j' || c2 === 'w') {
                strength = 'weak';
                weakClass = 'hollow';
            } else if (c1 === 'w') {
                strength = 'weak';
                weakClass = 'assimilative';
            } else if (c2 && c2 === c3) {
                strength = 'geminated';
            }
        } else if (consonantArray.length === 4 && (consonantArray[3] === 'j' || consonantArray[3] === 'w')) {
            strength = 'weak';
            weakClass = 'defective';
        }
    }

    return {
        id: consonants,
        consonants,
        consonant_array: consonantArray,
        strength,
        weak_class: weakClass,
        vowel_set_perf: vm?.vowel_set_perf || 'a-a',
        vowel_set_impf: vm?.vowel_set_impf || 'i-a',
        vowel_set_imp: vm?.vowel_set_impv || 'o-o',
        is_imala_blocked: Boolean(primaryVerb?.is_imala_blocked),
        hidden_forms: [],
        is_virtual: true,
        entries: entryRows,
    };
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const r1 = normalizeRadical(url.searchParams.get('r1'));
    const r2 = normalizeRadical(url.searchParams.get('r2'));
    const r3 = normalizeRadical(url.searchParams.get('r3'));
    const r4 = normalizeRadical(url.searchParams.get('r4'));

    try {
        const dbUrl = env.TURSO_URL || env.VITE_TURSO_URL;
        const token = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN;
        const db = createClient({ url: dbUrl, authToken: token });

        let sql = `SELECT * FROM roots`;
        const conditions = [];
        const args = [];
        const radicals = [r1, r2, r3, r4];
        radicals.forEach((rad, idx) => {
            if (!rad) return;
            const vars = radicalVariants(rad);
            conditions.push(`LOWER(json_extract(consonant_array, '$[${idx}]')) IN (${vars.map(() => '?').join(', ')})`);
            args.push(...vars);
        });

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        } else {
            sql += ' ORDER BY consonants ASC LIMIT 100';
        }

        const result = await db.execute({ sql, args });
        const dbRoots = result.rows.map(r => {
            const copy = { ...r };
            try {
                copy.consonant_array = copy.consonant_array ? JSON.parse(copy.consonant_array) : [];
                copy.hidden_forms = copy.hidden_forms ? JSON.parse(copy.hidden_forms) : [];
            } catch (e) { }
            copy.strength = String(copy.strength || 'strong').trim().toLowerCase();
            if (copy.strength === 'doubled') copy.strength = 'geminated';
            copy.weak_class = copy.weak_class ? String(copy.weak_class).trim().toLowerCase() : null;
            return copy;
        });

        const entriesByRoot = new Map();
        const hasRadicalFilter = Boolean(r1 || r2 || r3 || r4);
        if (hasRadicalFilter || dbRoots.length > 0) {
            const entryConditions = ["e.root_consonants IS NOT NULL", "TRIM(e.root_consonants) != ''"];
            const entryArgs = [];

            if (hasRadicalFilter) {
                if (r1) {
                    const vars = radicalVariants(r1);
                    entryConditions.push(`(${vars.map(() => 'LOWER(TRIM(e.root_consonants)) LIKE ?').join(' OR ')})`);
                    entryArgs.push(...vars.map((v) => `${v}-%`));
                }
                if (r2) {
                    const vars = radicalVariants(r2);
                    entryConditions.push(`(${vars.map(() => 'LOWER(TRIM(e.root_consonants)) LIKE ?').join(' OR ')})`);
                    entryArgs.push(...vars.map((v) => `%-${v}-%`));
                }
                if (r3) {
                    const vars = radicalVariants(r3);
                    entryConditions.push(`(${vars.map(() => 'LOWER(TRIM(e.root_consonants)) LIKE ?').join(' OR ')})`);
                    entryArgs.push(...vars.map((v) => `%-${v}%`));
                }
                if (r4) {
                    const vars = radicalVariants(r4);
                    entryConditions.push(`(${vars.map(() => 'LOWER(TRIM(e.root_consonants)) LIKE ?').join(' OR ')})`);
                    entryArgs.push(...vars.map((v) => `%-${v}`));
                }
            } else {
                const rootKeys = Array.from(new Set(dbRoots.map((r) => String(r.consonants || '').trim().toLowerCase()).filter(Boolean)));
                if (rootKeys.length > 0) {
                    entryConditions.push(`LOWER(TRIM(e.root_consonants)) IN (${rootKeys.map(() => '?').join(', ')})`);
                    entryArgs.push(...rootKeys);
                }
            }

            const entrySql = `
                SELECT e.id, e.headword, e.pos, e.root_consonants, e.source_citation, e.is_imala_blocked,
                       COALESCE((
                           SELECT json_group_array(t.name)
                           FROM entry_tags et
                           JOIN tags t ON et.tag_id = t.id
                           WHERE et.entry_id = e.id
                       ), '[]') AS tags_json,
                       vm.form AS vm_form, vm.class AS vm_class, vm.weak_class AS vm_weak_class,
                       vm.perfective_3sgm, vm.imperfective_3sgm, vm.verbal_noun, vm.active_participle, vm.passive_participle,
                       vm.vowel_set_perf, vm.vowel_set_impf, vm.vowel_set_impv, vm.is_imala_blocked AS vm_is_imala_blocked,
                       pm.type AS pm_type, pm.verbal_form AS pm_verbal_form,
                       nm.noun_type AS nm_noun_type, nm.verbal_form AS nm_verbal_form
                FROM entries e
                LEFT JOIN verb_morphology vm ON vm.entry_id = e.id
                LEFT JOIN participle_morphology pm ON pm.entry_id = e.id
                LEFT JOIN noun_morphology nm ON nm.entry_id = e.id
                WHERE ${entryConditions.join(' AND ')}
                ORDER BY e.headword ASC
            `;

            const entryRes = await db.execute({ sql: entrySql, args: entryArgs });
            for (const row of entryRes.rows) {
                const consKey = String(row.root_consonants || '').trim().toLowerCase().normalize('NFC');
                if (!consKey) continue;
                const parts = consKey.split('-').map((p) => p.trim()).filter(Boolean);
                if (
                    !matchesRadical(parts[0], r1) ||
                    !matchesRadical(parts[1], r2) ||
                    !matchesRadical(parts[2], r3) ||
                    !matchesRadical(parts[3], r4)
                ) {
                    continue;
                }

                let tags = [];
                try {
                    tags = row.tags_json ? JSON.parse(row.tags_json) : [];
                } catch {}

                const hydratedEntry = {
                    id: row.id,
                    headword: row.headword,
                    pos: row.pos,
                    root_consonants: consKey,
                    source_citation: row.source_citation || undefined,
                    is_imala_blocked: Boolean(row.vm_is_imala_blocked ?? row.is_imala_blocked),
                    tags,
                    verb_morphology: (row.vm_form || row.vm_class || row.perfective_3sgm || row.imperfective_3sgm || row.vowel_set_perf) ? {
                        form: row.vm_form || undefined,
                        class: row.vm_class || undefined,
                        weak_class: row.vm_weak_class || undefined,
                        perfective_3sgm: row.perfective_3sgm || undefined,
                        imperfective_3sgm: row.imperfective_3sgm || undefined,
                        verbal_noun: row.verbal_noun || undefined,
                        active_participle: row.active_participle || undefined,
                        passive_participle: row.passive_participle || undefined,
                        vowel_set_perf: row.vowel_set_perf || undefined,
                        vowel_set_impf: row.vowel_set_impf || undefined,
                        vowel_set_impv: row.vowel_set_impv || undefined,
                        is_imala_blocked: row.vm_is_imala_blocked,
                    } : undefined,
                    participle_morphology: (row.pm_type || row.pm_verbal_form) ? {
                        type: row.pm_type || undefined,
                        verbal_form: row.pm_verbal_form || undefined,
                    } : undefined,
                    noun_morphology: (row.nm_noun_type || row.nm_verbal_form) ? {
                        noun_type: row.nm_noun_type || undefined,
                        verbal_form: row.nm_verbal_form || undefined,
                    } : undefined,
                    noun_type: row.nm_noun_type || undefined,
                };

                const bucket = entriesByRoot.get(consKey) || [];
                bucket.push(hydratedEntry);
                entriesByRoot.set(consKey, bucket);
            }
        }

        const seenConsonants = new Set();
        const roots = dbRoots.map((r) => {
            const consKey = String(r.consonants || '').trim().toLowerCase().normalize('NFC');
            seenConsonants.add(consKey);
            return {
                ...r,
                entries: entriesByRoot.get(consKey) || [],
            };
        });

        for (const [consKey, groupEntries] of entriesByRoot.entries()) {
            if (!seenConsonants.has(consKey)) {
                roots.push(inferVirtualRootMetadata(consKey, groupEntries));
            }
        }

        roots.sort((a, b) => String(a.consonants || '').localeCompare(String(b.consonants || '')));

        return new Response(JSON.stringify({ roots }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
