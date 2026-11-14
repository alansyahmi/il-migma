/**
 * src/lib/homographGrouping.ts
 * Utility for grouping, prioritizing, and rolling up duplicate entries across different parts of speech (POS).
 */

export const POS_PRIORITY: Record<string, number> = {
    noun: 1,
    verb: 2,
    adjective: 3,
    conjunction: 4,
    preposition: 5,
    pronoun: 6,
    determiner: 7,
    numeral: 8,
    participle: 9,
    particle: 10,
    adverb: 11,
    interjection: 12,
    article: 13,
    suffix: 14,
    'proper noun': 15,
    proper_noun: 15,
    proper: 15,
    propn: 15,
};

export const AUDIT_STATUS_PRIORITY: Record<string, number> = {
    approved: 3,
    reviewed: 2,
    pending: 1,
};

/**
 * Helper to determine if an entry represents a proper noun (e.g. names, places, celestial bodies)
 * checking pos, noun_type, and tags.
 */
export function isProperNounEntry(entry: any): boolean {
    if (!entry) return false;
    const pos = String(entry.pos || '').trim().toLowerCase();
    if (pos === 'proper noun' || pos === 'proper_noun' || pos === 'proper' || pos === 'propn') {
        return true;
    }
    const nounType = String(
        entry.noun_type ||
        entry.noun_morphology?.noun_type ||
        entry.nm_noun_type ||
        ''
    ).trim().toLowerCase();
    if (nounType === 'proper' || nounType === 'proper noun' || nounType === 'proper_noun') {
        return true;
    }
    const tags = Array.isArray(entry.tags)
        ? entry.tags
        : (typeof entry.tags === 'string' && entry.tags
            ? (() => { try { return JSON.parse(entry.tags); } catch { return []; } })()
            : []);
    if (tags.some((t: any) => {
        const val = typeof t === 'string' ? t : (t?.name || t?.id || '');
        const s = String(val).trim().toLowerCase().replace(/^tag-/, '');
        return s === 'proper' || s === 'proper_noun' || s === 'proper noun';
    })) {
        return true;
    }

    // Capitalized headwords for nouns/untyped entries:
    // In Maltese dictionaries, citations for common nouns, numerals, verbs, and adjectives are lowercase.
    // Capitalized nouns (e.g. Erbgħa [Wednesday], Tnejn [Monday], Tlieta [Tuesday], Ħamis [Thursday], Wott, Qabru, Malta)
    // represent proper nouns (ismijiet proprji).
    const headword = String(entry.headword || '').trim();
    if (headword) {
        const first = headword[0];
        if (first === first.toUpperCase() && first !== first.toLowerCase()) {
            if (!pos || pos === 'noun' || pos === 'n' || String(entry.id || '').startsWith('n-')) {
                return true;
            }
        }
    }

    return false;
}

export function getAuditStatusScore(status?: string | null): number {
    if (!status) return 0;
    const s = String(status).trim().toLowerCase();
    return AUDIT_STATUS_PRIORITY[s] ?? 0;
}

export function getPosPriorityScore(pos?: string | null, entry?: any): number {
    if (entry && isProperNounEntry(entry)) {
        return 15;
    }
    if (!pos) return 999;
    const p = String(pos).trim().toLowerCase();
    if (p === 'proper noun' || p === 'proper_noun' || p === 'proper' || p === 'propn') {
        return 15;
    }
    return POS_PRIORITY[p] ?? 999;
}

export function getRankScore(entry: any): number {
    const rawRank = entry?.source_frequency_rank ?? entry?.rank;
    const num = Number(rawRank);
    if (!isNaN(num) && num > 0) return num;
    return 999999;
}

/**
 * Compares two entries using the established priority waterfall:
 * 0. Non-proper entries (common nouns, numerals, verbs, etc.) over proper nouns:
 *    common nouns and numerals always beat proper nouns.
 * 1. Audit status: approved > reviewed > pending/unreviewed
 * 2. Frequency rank: lowest positive rank number wins
 * 3. POS hierarchy: noun/verb > adj > conj/prep > adv > intj > proper noun
 * 4. Fallback: alphabetical by id
 */
export function compareEntryPriority(a: any, b: any): number {
    const properA = isProperNounEntry(a);
    const properB = isProperNounEntry(b);
    if (properA !== properB) {
        return properA ? 1 : -1; // Non-proper entry always takes priority over proper noun
    }

    const auditA = getAuditStatusScore(a?.audit_status);
    const auditB = getAuditStatusScore(b?.audit_status);
    if (auditA !== auditB) return auditB - auditA; // Higher audit score first

    const rankA = getRankScore(a);
    const rankB = getRankScore(b);
    if (rankA !== rankB) return rankA - rankB; // Lower rank number first

    const posA = getPosPriorityScore(a?.pos, a);
    const posB = getPosPriorityScore(b?.pos, b);
    if (posA !== posB) return posA - posB; // Lower POS priority number first

    return String(a?.id || '').localeCompare(String(b?.id || ''));
}

export interface GroupedHeadwordEntry<T> {
    headword: string;
    primary: T;
    siblings: T[];
    allEntries: T[];
    allPos: string[];
}

/**
 * Groups an array of entries by normalized headword, selecting the canonical primary
 * entry via the priority waterfall.
 */
export function groupEntriesByHeadword<T extends { headword: string; pos?: string }>(
    entries: T[]
): GroupedHeadwordEntry<T>[] {
    if (!Array.isArray(entries) || entries.length === 0) return [];

    const map = new Map<string, T[]>();

    for (const entry of entries) {
        if (!entry?.headword) continue;
        const key = String(entry.headword).trim().toLowerCase();
        const list = map.get(key) || [];
        list.push(entry);
        map.set(key, list);
    }

    const grouped: GroupedHeadwordEntry<T>[] = [];

    for (const [_, list] of map.entries()) {
        const sorted = [...list].sort(compareEntryPriority);
        const primary = sorted[0];
        const siblings = sorted.slice(1);
        const allPos = [...new Set(sorted.map(e => String(e.pos || '').trim().toLowerCase()).filter(Boolean))];

        grouped.push({
            headword: primary.headword,
            primary,
            siblings,
            allEntries: sorted,
            allPos,
        });
    }

    return grouped;
}
