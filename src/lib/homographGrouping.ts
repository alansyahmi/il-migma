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
};

export const AUDIT_STATUS_PRIORITY: Record<string, number> = {
    approved: 3,
    reviewed: 2,
    pending: 1,
};

export function getAuditStatusScore(status?: string | null): number {
    if (!status) return 0;
    const s = String(status).trim().toLowerCase();
    return AUDIT_STATUS_PRIORITY[s] ?? 0;
}

export function getPosPriorityScore(pos?: string | null): number {
    if (!pos) return 999;
    const p = String(pos).trim().toLowerCase();
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
 * 1. Audit status: approved > reviewed > pending/unreviewed
 * 2. Frequency rank: lowest positive rank number wins
 * 3. POS hierarchy: noun/verb > adj > conj/prep > adv > intj
 * 4. Fallback: alphabetical by id
 */
export function compareEntryPriority(a: any, b: any): number {
    const auditA = getAuditStatusScore(a?.audit_status);
    const auditB = getAuditStatusScore(b?.audit_status);
    if (auditA !== auditB) return auditB - auditA; // Higher audit score first

    const rankA = getRankScore(a);
    const rankB = getRankScore(b);
    if (rankA !== rankB) return rankA - rankB; // Lower rank number first

    const posA = getPosPriorityScore(a?.pos);
    const posB = getPosPriorityScore(b?.pos);
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
