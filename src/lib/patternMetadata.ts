export type PatternSourceItem = {
    cv?: unknown;
    wizen?: unknown;
    stress?: unknown;
    description?: unknown;
    pos_types?: unknown;
    applicabilities?: unknown;
    linguistic_role?: unknown;
    linguisticRole?: unknown;
    gender?: unknown;
    notes?: unknown;
    metadata?: unknown;
};

export type PatternOption = { label: string; value: string; sub?: string };

const PATTERN_LINGUISTIC_ROLE_ALIASES: Record<string, string> = {
    masculine_singular: 'singular',
    feminine_singular: 'singular',
    elative_masc: 'elative',
    elative_fem: 'elative',
};

export const PATTERN_LINGUISTIC_ROLE_OPTIONS: PatternOption[] = [
    { value: 'broken_plural', label: 'Broken plural' },
    { value: 'sound_plural', label: 'Sound plural' },
    { value: 'singular', label: 'Singular' },
    { value: 'dual', label: 'Dual' },
    { value: 'diminutive', label: 'Diminutive' },
    { value: 'collective', label: 'Collective' },
    { value: 'singulative', label: 'Singulative' },
    { value: 'elative', label: 'Elative' },
    { value: 'qualitative', label: 'Qualitative' },
    { value: 'adjectival', label: 'Adjectival' },
    { value: 'active', label: 'Active' },
    { value: 'passive', label: 'Passive' },
];

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

export const PARTICIPLE_TYPE_OPTIONS: PatternOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Passive', value: 'passive' },
];

export const NUMERAL_TYPE_OPTIONS: PatternOption[] = [
    { label: 'Cardinal', value: 'cardinal' },
    { label: 'Ordinal', value: 'ordinal' },
    { label: 'Collective', value: 'collective' },
    { label: 'Distributive', value: 'distributive' },
];

export type PatternApplicabilityMetadata = Record<string, unknown>;

export type PatternApplicability = {
    pos: PatternPos;
    linguisticRole?: string;
    gender?: string;
    notes?: string;
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
    linguistic_role?: string;
    linguisticRole?: string;
    gender?: string;
    notes?: string;
    metadata?: PatternApplicabilityMetadata;
};

export type PatternApplicabilitySummary = {
    pos: string;
    linguisticRole: string;
    gender: string;
    notes: string;
    label: string;
};

export type PatternMetadataSummary = {
    posTypes: string[];
    bucketLabel: string;
    applicabilities: PatternApplicabilitySummary[];
    linguisticRole?: string;
    gender?: string;
    notes?: string;
};

export type PatternFieldKind = 'select' | 'text' | 'textarea';

export type PatternFieldSpec = {
    key: string;
    label: string;
    kind: PatternFieldKind;
    optionSource?: string;
    options?: PatternOption[];
    placeholder?: string;
    rows?: number;
    emptyLabel?: string;
    showWhen?: (app: PatternApplicability) => boolean;
    metadataKey?: string;
};

export type PatternPosSchema = {
    label: string;
    fields: PatternFieldSpec[];
};

export const PATTERN_POS_SCHEMA: Record<PatternPos, PatternPosSchema> = {
    noun: {
        label: 'Noun',
        fields: [
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'select', options: PATTERN_LINGUISTIC_ROLE_OPTIONS, emptyLabel: '-- Select --' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
            { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Optional noun-specific notes...', rows: 3 },
        ],
    },
    verb: {
        label: 'Verb',
        fields: [
            { key: 'verbForm', label: 'Verb Form', kind: 'select', optionSource: 'verb_form', emptyLabel: '-- Select --', metadataKey: 'verb_form' },
            { key: 'classCompatibility', label: 'Class Compatibility', kind: 'select', optionSource: 'verb_class', emptyLabel: '-- Select --', metadataKey: 'class_compatibility' },
            { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Optional verb-specific notes...', rows: 3 },
        ],
    },
    adjective: {
        label: 'Adjective',
        fields: [
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'select', options: PATTERN_LINGUISTIC_ROLE_OPTIONS, emptyLabel: '-- Select --' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
            { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Optional adjective-specific notes...', rows: 3 },
        ],
    },
    participle: {
        label: 'Participle',
        fields: [
            { key: 'participleType', label: 'Participle Type', kind: 'select', options: PARTICIPLE_TYPE_OPTIONS, emptyLabel: '-- Select --', metadataKey: 'participle_type' },
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'select', options: PATTERN_LINGUISTIC_ROLE_OPTIONS, emptyLabel: '-- Select --' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
            { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Optional participle-specific notes...', rows: 3 },
        ],
    },
    numeral: {
        label: 'Numeral',
        fields: [
            { key: 'numeralType', label: 'Numeral Type', kind: 'select', options: NUMERAL_TYPE_OPTIONS, emptyLabel: '-- Select --', metadataKey: 'numeral_type' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
            { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Optional numeral-specific notes...', rows: 3 },
        ],
    },
    adverb: {
        label: 'Adverb',
        fields: [],
    },
    preposition: {
        label: 'Preposition',
        fields: [],
    },
    particle: {
        label: 'Particle',
        fields: [],
    },
    article: {
        label: 'Article',
        fields: [],
    },
    interjection: {
        label: 'Interjection',
        fields: [],
    },
    conjunction: {
        label: 'Conjunction',
        fields: [],
    },
    interrogative: {
        label: 'Interrogative',
        fields: [],
    },
    pronoun: {
        label: 'Pronoun',
        fields: [],
    },
};

const PATTERN_POS_WITH_METADATA = new Set<PatternPos>(['noun', 'verb', 'adjective', 'participle', 'numeral']);

function hasPatternMetadata(pos: string) {
    return PATTERN_POS_WITH_METADATA.has(pos as PatternPos);
}

export function getPatternPosSchema(pos: unknown) {
    const normalizedPos = normalizePatternPos(pos);
    return normalizedPos ? PATTERN_POS_SCHEMA[normalizedPos as PatternPos] : null;
}

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

export function normalizePatternLinguisticRoleValue(role: unknown) {
    const normalizedRole = normalizeText(role).toLowerCase();
    return PATTERN_LINGUISTIC_ROLE_ALIASES[normalizedRole] || normalizedRole;
}

function normalizeStringList(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeToken(item)).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => normalizeToken(item))
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

export function getPatternLinguisticRoleLabel(role: string) {
    const normalizedRole = normalizePatternLinguisticRoleValue(role);
    return PATTERN_LINGUISTIC_ROLE_OPTIONS.find((option) => option.value === normalizedRole)?.label
        || titleCase(normalizedRole);
}

function normalizePatternPos(value: unknown) {
    const pos = normalizeToken(value);
    return PATTERN_POS_OPTIONS.includes(pos as PatternPos) ? pos : '';
}

function normalizePosList(value: unknown) {
    return normalizeStringList(value)
        .map((pos) => normalizePatternPos(pos))
        .filter(Boolean);
}

const METADATA_KEY_ALIASES: Record<string, string> = {
    linguisticRole: 'linguistic_role',
    linguistic_role: 'linguistic_role',
    verbForm: 'verb_form',
    verb_form: 'verb_form',
    classCompatibility: 'class_compatibility',
    class_compatibility: 'class_compatibility',
    participleType: 'participle_type',
    participle_type: 'participle_type',
    numeralType: 'numeral_type',
    numeral_type: 'numeral_type',
};

const LEGACY_METADATA_KEYS = new Set(['class', 'classValue', 'strength', 'weakClass', 'weak_class']);

function normalizeMetadataKey(key: string) {
    return METADATA_KEY_ALIASES[key] || key;
}

function isMeaningfulValue(value: unknown) {
    return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
}

function addMetadataEntry(target: Record<string, unknown>, key: string, value: unknown) {
    if (!isMeaningfulValue(value)) return;

    if (key === 'metadata' && value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
            addMetadataEntry(target, nestedKey, nestedValue);
        });
        return;
    }

    const normalizedKey = normalizeMetadataKey(key);
    if (LEGACY_METADATA_KEYS.has(normalizedKey)) return;
    if (normalizedKey === 'linguistic_role' || normalizedKey === 'gender') return;

    target[normalizedKey] = value;
}

function collectMetadata(record: Record<string, unknown>, ignoreKeys: Set<string>) {
    const metadata: Record<string, unknown> = {};

    if (record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)) {
        Object.entries(record.metadata as Record<string, unknown>).forEach(([key, value]) => {
            addMetadataEntry(metadata, key, value);
        });
    }

    Object.entries(record).forEach(([key, value]) => {
        if (ignoreKeys.has(key)) return;
        addMetadataEntry(metadata, key, value);
    });

    return metadata;
}

function normalizeApplicabilityMetadata(record: Record<string, unknown>) {
    return collectMetadata(record, new Set(['pos', 'metadata', 'linguisticRole', 'linguistic_role', 'gender', 'clientId', 'id']));
}

function inferLegacyPatternPosTypes(record: Record<string, unknown>, category?: string) {
    const hasVerbFields = Boolean(record.verbForm || record.verb_form || record.classCompatibility || record.class_compatibility || record.notes);
    const hasParticipleFields = Boolean(record.participleType || record.participle_type);
    const hasNumeralFields = Boolean(record.numeralType || record.numeral_type);
    const hasNounFields = Boolean(record.class || record.strength || record.weakClass || record.weak_class);
    const hasSharedRoleFields = Boolean(record.linguisticRole || record.linguistic_role);

    if (hasVerbFields) return ['verb'];
    if (hasParticipleFields) return ['participle'];
    if (hasNumeralFields) return ['numeral'];
    if (hasNounFields || hasSharedRoleFields) return category === 'adjective_pattern' ? ['adjective'] : ['noun'];
    if (category === 'adjective_pattern') return ['adjective'];
    return ['noun'];
}

function buildLegacyApplicabilitySource(record: Record<string, unknown>, pos: string) {
    if (!hasPatternMetadata(pos)) {
        return { pos };
    }

    const metadata = collectMetadata(record, new Set(['pos', 'metadata', 'linguisticRole', 'linguistic_role', 'gender', 'clientId', 'id']));

    switch (pos) {
        case 'noun':
            return {
                pos,
                linguistic_role: record.linguistic_role || metadata.linguistic_role || '',
                gender: record.gender || metadata.gender || '',
                notes: record.notes || metadata.notes || '',
                metadata,
            };
        case 'verb':
            return {
                pos,
                verb_form: record.verb_form || metadata.verb_form || '',
                class_compatibility: record.class_compatibility || metadata.class_compatibility || '',
                notes: record.notes || metadata.notes || '',
                metadata,
            };
        case 'adjective':
            return {
                pos,
                linguistic_role: record.linguistic_role || metadata.linguistic_role || '',
                gender: record.gender || metadata.gender || '',
                notes: record.notes || metadata.notes || '',
                metadata,
            };
        case 'participle':
            return {
                pos,
                participle_type: record.participle_type || metadata.participle_type || '',
                linguistic_role: record.linguistic_role || metadata.linguistic_role || '',
                gender: record.gender || metadata.gender || '',
                notes: record.notes || metadata.notes || '',
                metadata,
            };
        case 'numeral':
            return {
                pos,
                numeral_type: record.numeral_type || metadata.numeral_type || '',
                gender: record.gender || metadata.gender || '',
                notes: record.notes || metadata.notes || '',
                metadata,
            };
        default:
            return { pos, metadata };
    }
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
    const metadataRecord = metadata as Record<string, unknown>;
    const linguisticRole = normalizeText(
        record.linguisticRole || record.linguistic_role || metadataRecord.linguisticRole || metadataRecord.linguistic_role,
    );
    const gender = normalizeText(record.gender || metadataRecord.gender);
    const notes = normalizeText(record.notes || metadataRecord.notes);
    const clientId = normalizeText(record.clientId || metadataRecord.clientId || record.id || metadataRecord.id);

    delete metadataRecord.linguistic_role;
    delete metadataRecord.gender;
    delete metadataRecord.clientId;
    delete metadataRecord.id;
    if (notes) metadataRecord.notes = notes;
    else delete metadataRecord.notes;

    return {
        pos,
        linguisticRole,
        gender,
        notes,
        metadata,
        clientId,
    } as PatternApplicability;
}

function normalizeApplicabilities(value: Record<string, unknown>, category?: string) {
    const rawApplicabilities = Array.isArray(value.applicabilities) ? value.applicabilities : [];

    if (rawApplicabilities.length > 0) {
        return rawApplicabilities
            .map((item) => normalizeApplicability(item as Record<string, unknown>))
            .filter(Boolean) as PatternApplicability[];
    }

    const normalizedPosTypes = normalizePosList(value.pos_types);
    const inferredPosTypes = normalizedPosTypes.length > 0 ? normalizedPosTypes : inferLegacyPatternPosTypes(value, category);
    return inferredPosTypes
        .map((pos) => normalizeApplicability(buildLegacyApplicabilitySource(value, pos)))
        .filter(Boolean) as PatternApplicability[];
}

export function normalizePatternFormValue(value: unknown, category?: string): PatternFormValue {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const cv = normalizeText(record.cv);
    const wizen = normalizeText(record.wizen);
    const stress = Number.isFinite(Number(record.stress)) ? Number(record.stress) : 2;
    const description = normalizeText(record.description);
    const posTypes = normalizePosList(record.pos_types);
    const applicabilities = normalizeApplicabilities(record, category);
    const notes = normalizeText(record.notes);
    const metadata = collectMetadata(
        record,
        new Set(['cv', 'wizen', 'stress', 'description', 'pos_types', 'applicabilities', 'metadata', 'linguisticRole', 'linguistic_role', 'gender']),
    );

    return {
        cv,
        wizen,
        stress,
        description,
        notes,
        pos_types: Array.from(new Set([
            ...(posTypes.length > 0 ? posTypes : applicabilities.map((app) => app.pos)),
            ...applicabilities.map((app) => app.pos),
        ])),
        applicabilities,
        metadata,
    };
}

export function getPatternApplicabilitySummary(value: unknown, category?: string): PatternApplicabilitySummary[] {
    const normalized = normalizePatternFormValue(value, category);
    const applicabilities = normalized.applicabilities || [];

    return applicabilities.map((app) => {
        const labelParts = [titleCase(app.pos)];

        if (app.linguisticRole) labelParts.push(`Role ${getPatternLinguisticRoleLabel(app.linguisticRole)}`);
        if (app.gender) labelParts.push(`Gender ${app.gender}`);
        if (app.notes) labelParts.push(app.notes);

        return {
            pos: app.pos,
            linguisticRole: app.linguisticRole || '',
            gender: app.gender || '',
            notes: app.notes || '',
            label: labelParts.filter(Boolean).join(' · '),
        };
    });
}

export function getPatternMetadataSummary(value: unknown, category?: string): PatternMetadataSummary {
    const normalized = normalizePatternFormValue(value, category);
    const posTypes = normalized.pos_types || [];
    const applicabilities = getPatternApplicabilitySummary(normalized, category);
    const firstApplicability = applicabilities[0];

    const bucketLabel = (category && PATTERN_BUCKET_LABELS[category]) || (posTypes.length > 0 ? `${titleCase(posTypes[0])} pattern` : 'General pattern');

    return {
        posTypes,
        bucketLabel,
        applicabilities,
        linguisticRole: firstApplicability?.linguisticRole || '',
        gender: firstApplicability?.gender || '',
        notes: firstApplicability?.notes || '',
    };
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
        if (roleFilters) {
            if (!role) return;
            if (!roleFilters.includes(role)) return;
        }
        if (genderFilters) {
            if (!gender) return;
            if (!genderFilters.includes(gender)) return;
        }
        if (rolePrefix) {
            if (!role) return;
            if (!role.startsWith(rolePrefix)) return;
        }

        unique.set(cv, {
            label: mode === 'standard' ? cv : wizen,
            value: cv,
            sub: mode === 'standard' ? wizen : cv,
        });
    });

    return Array.from(unique.values());
}
