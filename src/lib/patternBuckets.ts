export type PatternSourceItem = {
    cv?: unknown;
    wizen?: unknown;
    stress?: unknown;
    pos_types?: unknown;
    linguistic_role?: unknown;
    gender?: unknown;
};

export type PatternOption = { label: string; value: string; sub?: string };

export type PatternMetadataSummary = {
    posTypes: string[];
    role: string;
    gender: string;
    bucketLabel: string;
};

export function getPatternNotation(value: unknown) {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return String(record.cv || record.wizen || record.key || '').trim();
    }
    return '';
}

function normalizeToken(value: unknown) {
    return String(value || '').trim().toLowerCase();
}

function normalizeStringList(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function titleCase(value: string) {
    return value
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

export function getPatternMetadataSummary(value: unknown): PatternMetadataSummary {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const posTypes = normalizeStringList(record.pos_types).map((pos) => pos.toLowerCase());
    const role = normalizeToken(record.linguistic_role);
    const gender = normalizeToken(record.gender);

    let bucketLabel = '';
    if (role.startsWith('elative')) {
        bucketLabel = gender === 'masculine'
            ? 'Elative (Masc.)'
            : gender === 'feminine'
                ? 'Elative (Fem.)'
                : 'Elative';
    } else if (role === 'broken_plural') {
        bucketLabel = 'Broken plural';
    } else if (role === 'sound_plural') {
        bucketLabel = 'Sound plural';
    } else if (role === 'feminine_singular') {
        bucketLabel = 'Feminine singular';
    } else if (role === 'masculine_singular') {
        bucketLabel = 'Masculine singular';
    } else if (role === 'diminutive') {
        bucketLabel = 'Diminutive';
    } else if (posTypes.length > 0) {
        bucketLabel = `${titleCase(posTypes[0])} pattern`;
    } else {
        bucketLabel = 'General pattern';
    }

    return { posTypes, role, gender, bucketLabel };
}

export function buildPatternOptions(
    source: PatternSourceItem[],
    mode: 'standard' | 'arabised',
    filters: {
        pos?: string | string[];
        roles?: string[];
        gender?: string | string[];
        rolePrefix?: string;
    } = {},
): PatternOption[] {
    const posFilters = filters.pos
        ? (Array.isArray(filters.pos) ? filters.pos : [filters.pos]).map((pos) => normalizeToken(pos))
        : null;
    const roleFilters = filters.roles?.map((role) => normalizeToken(role)) ?? null;
    const genderFilters = filters.gender
        ? (Array.isArray(filters.gender) ? filters.gender : [filters.gender]).map((gender) => normalizeToken(gender))
        : null;
    const rolePrefix = filters.rolePrefix ? normalizeToken(filters.rolePrefix) : null;

    const unique = new Map<string, PatternOption>();

    source.forEach((item) => {
        const posTypes = normalizeStringList(item.pos_types).map((pos) => pos.toLowerCase());
        const role = normalizeToken(item.linguistic_role);
        const gender = normalizeToken(item.gender);
        const cv = String(item.cv || '').trim();
        const wizen = String(item.wizen || '').trim();

        if (!cv) return;
        if (posFilters && posTypes.length > 0 && !posTypes.some((pos) => posFilters.includes(pos))) return;
        if (roleFilters && role && !roleFilters.includes(role)) return;
        if (genderFilters && gender && !genderFilters.includes(gender)) return;
        if (rolePrefix && role && !role.startsWith(rolePrefix)) return;

        unique.set(cv, {
            label: mode === 'standard' ? cv : wizen,
            value: cv,
            sub: mode === 'standard' ? wizen : cv,
        });
    });

    return Array.from(unique.values());
}
