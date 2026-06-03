export type PatternSourceItem = {
    cv?: unknown;
    wizen?: unknown;
    stress?: unknown;
    pos_types?: unknown;
    linguistic_role?: unknown;
    gender?: unknown;
};

export type PatternOption = { label: string; value: string; sub?: string };

export const PATTERN_POS_OPTIONS = [
    'verb',
    'noun',
    'adjective',
    'participle',
    'numeral',
    'adverb',
    'preposition',
    'particle',
    'article',
    'interjection',
    'conjunction',
    'interrogative',
    'pronoun',
] as const;
export type PatternPos = typeof PATTERN_POS_OPTIONS[number];

export const PATTERN_BUCKET_LABELS: Record<string, string> = {
    cv_wizen_pattern: 'Pattern',
    broken_pattern: 'Broken plural',
    feminine_pattern: 'Feminine singular',
    sound_suffix: 'Sound Plural Suffix',
    derivational_suffix: 'Derivational Suffixes',
    dual_suffix: 'Dual suffix',
    diminutive_pattern: 'Diminutive',
    adjective_pattern: 'Elative',
};

export type PatternMetadataSummary = {
    posTypes: string[];
    gender: string;
    weakClass: string;
    bucketLabel: string;
    applicabilities: PatternApplicabilitySummary[];
};

export type PatternApplicabilityMetadata = Record<string, unknown>;

export type PatternApplicability = {
    pos: string;
    strength?: string;
    gender?: string;
    weakClass?: string;
    participleType?: string;
    numeralType?: string;
    metadata?: PatternApplicabilityMetadata;
    clientId?: string;
};

export type PatternFormValue = {
    cv?: string;
    wizen?: string;
    stress?: number;
    description?: string;
    pos_types?: string[];
    applicabilities?: PatternApplicability[];
    strength?: string;
    gender?: string;
    weak_class?: string;
    participle_type?: string;
    numeral_type?: string;
    metadata?: PatternApplicabilityMetadata;
};

export type PatternApplicabilitySummary = {
    pos: string;
    strength: string;
    gender: string;
    weakClass: string;
    participleType: string;
    numeralType: string;
    label: string;
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

function normalizeText(value: unknown) {
    return String(value || '').trim();
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

const PATTERN_POS_WITH_METADATA = new Set<PatternPos>(['verb', 'noun', 'adjective', 'participle', 'numeral']);

function hasPatternMetadata(pos: string) {
    return PATTERN_POS_WITH_METADATA.has(pos as PatternPos);
}

function createBlankApplicability(pos: string): PatternApplicability {
    return hasPatternMetadata(pos)
        ? {
            pos,
            strength: '',
            gender: '',
            weakClass: '',
            participleType: '',
            numeralType: '',
            metadata: {},
        }
        : {
            pos,
            metadata: {},
        };
}

export function mergePatternBucketApplicabilities(value: unknown, incomingPosTypes: unknown = []) {
    const normalized = normalizePatternFormValue(value);
    const existingApplicabilities = Array.isArray(normalized.applicabilities) ? normalized.applicabilities : [];
    const normalizedPosTypes = Array.isArray(normalized.pos_types) ? normalized.pos_types : [];
    const normalizedExistingPosTypes = (normalizedPosTypes.length > 0
        ? normalizedPosTypes
        : existingApplicabilities.map((app) => app.pos))
        .map((pos) => normalizePatternPos(pos))
        .filter(Boolean);
    const normalizedIncomingPosTypes = normalizeStringList(incomingPosTypes)
        .map((pos) => normalizePatternPos(pos))
        .filter(Boolean);

    const nextPosTypes = Array.from(new Set([
        ...normalizedExistingPosTypes,
        ...normalizedIncomingPosTypes,
        ...existingApplicabilities.map((app) => app.pos),
    ]));
    const nextApplicabilities = [...existingApplicabilities];

    nextPosTypes.forEach((pos) => {
        if (!nextApplicabilities.some((app) => app.pos === pos)) {
            nextApplicabilities.push(createBlankApplicability(pos));
        }
    });

    return {
        ...normalized,
        pos_types: nextPosTypes,
        applicabilities: nextApplicabilities,
    };
}

function normalizeApplicabilityMetadata(record: Record<string, unknown>) {
    const metadata = record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? { ...record.metadata as Record<string, unknown> }
        : {};

    Object.entries(record).forEach(([key, value]) => {
        if (['pos', 'metadata', 'clientId', 'id'].includes(key)) return;
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            metadata[key] = value;
        }
    });

    if (metadata.class !== undefined && metadata.strength === undefined) {
        metadata.strength = metadata.class;
    }

    return metadata;
}

function normalizePatternPos(value: unknown) {
    const pos = normalizeToken(value);
    return PATTERN_POS_OPTIONS.includes(pos as PatternPos) ? pos : '';
}

function normalizeApplicability(record: Record<string, unknown>) {
    const pos = normalizePatternPos(record.pos);
    if (!pos) return null;

    if (!hasPatternMetadata(pos)) {
        return {
            pos,
            metadata: {},
        } as PatternApplicability;
    }

    const metadata = normalizeApplicabilityMetadata(record);
    const strength = normalizeText(record.strength || metadata.strength);
    const gender = normalizeText(record.gender || metadata.gender);
    const weakClass = normalizeText(record.weakClass || metadata.weak_class);
    const participleType = normalizeText(record.participleType || metadata.participle_type);
    const numeralType = normalizeText(record.numeralType || metadata.numeral_type);
    const clientId = normalizeText(record.clientId || metadata.clientId || record.id || metadata.id);

    if (strength) metadata.strength = strength;
    if (gender) metadata.gender = gender;
    if (weakClass) metadata.weak_class = weakClass;
    if (participleType) metadata.participle_type = participleType;
    if (numeralType) metadata.numeral_type = numeralType;
    delete metadata.class;
    delete metadata.linguistic_role;
    delete metadata.clientId;
    delete metadata.id;

    return {
        pos,
        strength,
        gender,
        weakClass,
        participleType,
        numeralType,
        metadata,
        clientId,
    } as PatternApplicability;
}

export function normalizePatternFormValue(value: unknown): PatternFormValue {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const posTypes = normalizeStringList(record.pos_types)
        .map((pos) => normalizePatternPos(pos))
        .filter(Boolean);
    const rawApplicabilities = Array.isArray(record.applicabilities) ? record.applicabilities as Record<string, unknown>[] : [];

    const applicabilities = rawApplicabilities.length > 0
        ? rawApplicabilities
            .map((app) => normalizeApplicability(app))
            .filter(Boolean) as PatternApplicability[]
        : [];
    const firstApplicability = applicabilities[0] || null;
    const derivedStrength = normalizeText(
        record.strength ||
        firstApplicability?.strength ||
        firstApplicability?.metadata?.strength
    );
    const derivedGender = normalizeText(
        record.gender ||
        firstApplicability?.gender ||
        firstApplicability?.metadata?.gender
    );
    const derivedWeakClass = normalizeText(
        record.weak_class ||
        firstApplicability?.weakClass ||
        firstApplicability?.metadata?.weak_class
    );
    const derivedParticipleType = normalizeText(
        record.participle_type ||
        firstApplicability?.participleType ||
        firstApplicability?.metadata?.participle_type
    );
    const derivedNumeralType = normalizeText(
        record.numeral_type ||
        firstApplicability?.numeralType ||
        firstApplicability?.metadata?.numeral_type
    );

    if (applicabilities.length > 0) {
        return {
            cv: normalizeText(record.cv),
            wizen: normalizeText(record.wizen),
            stress: Number.isFinite(Number(record.stress)) ? Number(record.stress) : 2,
            description: normalizeText(record.description),
            pos_types: Array.from(new Set([
                ...(posTypes.length > 0 ? posTypes : applicabilities.map((app) => app.pos)),
                ...applicabilities.map((app) => app.pos),
            ])),
            applicabilities,
            strength: derivedStrength,
            gender: derivedGender,
            weak_class: derivedWeakClass,
            participle_type: derivedParticipleType,
            numeral_type: derivedNumeralType,
            metadata: record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
                ? record.metadata as PatternApplicabilityMetadata
                : {},
        };
    }

    const legacyMetadata = normalizeApplicabilityMetadata(record);
    const legacyStrength = normalizeText(derivedStrength || legacyMetadata.strength);
    const legacyGender = normalizeText(derivedGender || legacyMetadata.gender);
    const legacyWeakClass = normalizeText(derivedWeakClass || legacyMetadata.weak_class);
    const legacyParticipleType = normalizeText(derivedParticipleType || legacyMetadata.participle_type);
    const legacyNumeralType = normalizeText(derivedNumeralType || legacyMetadata.numeral_type);
    const legacyPosTypes = posTypes.length > 0 ? posTypes : ['all'];

    const buildLegacyApplicability = (pos: string) => {
        const normalizedPos = normalizePatternPos(pos);

        if (!normalizedPos) {
            return {
                pos,
                strength: legacyStrength,
                gender: legacyGender,
                weakClass: legacyWeakClass,
                participleType: legacyParticipleType,
                numeralType: legacyNumeralType,
                metadata: {
                    ...legacyMetadata,
                    strength: legacyStrength,
                    weak_class: legacyWeakClass,
                    participle_type: legacyParticipleType,
                    numeral_type: legacyNumeralType,
                    gender: legacyGender,
                },
            };
        }

        if (!hasPatternMetadata(normalizedPos)) {
            return createBlankApplicability(pos);
        }

        return {
            pos,
            strength: legacyStrength,
            gender: legacyGender,
            weakClass: legacyWeakClass,
            participleType: legacyParticipleType,
            numeralType: legacyNumeralType,
            metadata: {
                ...legacyMetadata,
                strength: legacyStrength,
                weak_class: legacyWeakClass,
                participle_type: legacyParticipleType,
                numeral_type: legacyNumeralType,
                gender: legacyGender,
            },
        };
    };

    return {
        cv: normalizeText(record.cv),
        wizen: normalizeText(record.wizen),
        stress: Number.isFinite(Number(record.stress)) ? Number(record.stress) : 2,
        description: normalizeText(record.description),
        pos_types: legacyPosTypes,
        applicabilities: legacyPosTypes.map((pos) => buildLegacyApplicability(pos)),
        strength: legacyStrength,
        gender: legacyGender,
        weak_class: legacyWeakClass,
        participle_type: legacyParticipleType,
        numeral_type: legacyNumeralType,
        metadata: legacyMetadata,
    };
}

export function getPatternApplicabilitySummary(value: unknown): PatternApplicabilitySummary[] {
    const normalized = normalizePatternFormValue(value);
    const applicabilities = normalized.applicabilities || [];

    return applicabilities.map((app) => {
        const metadata = (app.metadata || {}) as Record<string, unknown>;
        const strength = normalizeText(app.strength || metadata.strength);
        const weakClass = normalizeText(app.weakClass || metadata.weak_class);
        const gender = normalizeText(app.gender || metadata.gender);
        const participleType = normalizeText(app.participleType || metadata.participle_type);
        const numeralType = normalizeText(app.numeralType || metadata.numeral_type);
        const labelParts = [titleCase(app.pos)];

        if (strength) labelParts.push(strength.replace(/_/g, ' '));
        if (gender) labelParts.push(gender);
        if (weakClass) labelParts.push(weakClass);
        if (participleType) labelParts.push(participleType);
        if (numeralType) labelParts.push(numeralType);

        return {
            pos: app.pos,
            strength,
            gender,
            weakClass,
            participleType,
            numeralType,
            label: labelParts.filter(Boolean).join(' · '),
        };
    });
}

export function getPatternMetadataSummary(value: unknown, category?: string): PatternMetadataSummary {
    const normalized = normalizePatternFormValue(value);
    const posTypes = normalized.pos_types || [];
    const gender = normalizeToken(normalized.gender);
    const weakClass = normalizeToken(normalized.weak_class);
    const applicabilities = getPatternApplicabilitySummary(normalized);

    const bucketLabel = (category && PATTERN_BUCKET_LABELS[category]) || (posTypes.length > 0 ? `${titleCase(posTypes[0])} pattern` : 'General pattern');

    return { posTypes, gender, weakClass, bucketLabel, applicabilities };
}

export function buildPatternOptions(
    source: PatternSourceItem[],
    mode: 'standard' | 'arabised' | 'latinised',
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
        if (posFilters && posTypes.length > 0 && !posTypes.some((pos) => posFilters.includes(pos) || pos === 'all')) return;
        if (roleFilters && role && !roleFilters.includes(role)) return;
        if (genderFilters && gender && !genderFilters.includes(gender)) return;
        if (rolePrefix && role && !role.startsWith(rolePrefix)) return;

        const useStandardLabels = mode === 'standard' || mode === 'latinised';
        unique.set(cv, {
            label: useStandardLabels ? cv : wizen,
            value: cv,
            sub: useStandardLabels ? wizen : cv,
        });
    });

    return Array.from(unique.values());
}
