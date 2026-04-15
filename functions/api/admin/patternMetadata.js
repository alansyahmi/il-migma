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
];

export const PATTERN_BUCKET_LABELS = {
    cv_wizen_pattern: 'Pattern',
    broken_pattern: 'Broken plural',
    feminine_pattern: 'Feminine singular',
    sound_suffix: 'Sound Plural Suffix',
    derivational_suffix: 'Derivational Suffixes',
    dual_suffix: 'Dual suffix',
    diminutive_pattern: 'Diminutive',
    adjective_pattern: 'Elative',
};

export const PARTICIPLE_TYPE_OPTIONS = [
    { label: 'Active', value: 'active' },
    { label: 'Passive', value: 'passive' },
];

export const NUMERAL_TYPE_OPTIONS = [
    { label: 'Cardinal', value: 'cardinal' },
    { label: 'Ordinal', value: 'ordinal' },
    { label: 'Collective', value: 'collective' },
    { label: 'Distributive', value: 'distributive' },
];

export const PATTERN_POS_SCHEMA = {
    noun: {
        label: 'Noun',
        fields: [
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'text', placeholder: 'e.g. plural, collective, singular' },
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
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'text', placeholder: 'e.g. elative, qualitative' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
            { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Optional adjective-specific notes...', rows: 3 },
        ],
    },
    participle: {
        label: 'Participle',
        fields: [
            { key: 'participleType', label: 'Participle Type', kind: 'select', options: PARTICIPLE_TYPE_OPTIONS, emptyLabel: '-- Select --', metadataKey: 'participle_type' },
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'text', placeholder: 'e.g. active, passive, adjectival' },
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

const PATTERN_POS_WITH_METADATA = new Set(['noun', 'verb', 'adjective', 'participle', 'numeral']);

const hasPatternMetadata = (pos) => PATTERN_POS_WITH_METADATA.has(pos);

export function getPatternPosSchema(pos) {
    const normalizedPos = normalizePatternPos(pos);
    return normalizedPos ? PATTERN_POS_SCHEMA[normalizedPos] : null;
}

export function getPatternNotation(value) {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') {
        const record = value;
        return String(record.cv || record.wizen || record.key || '').trim();
    }
    return '';
}

const normalizeToken = (value) => String(value || '').trim().toLowerCase();
const normalizeText = (value) => String(value || '').trim();
const normalizeStringList = (value) => {
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
};

const titleCase = (value) => value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const firstNonEmpty = (...values) => {
    for (const value of values) {
        const text = normalizeText(value);
        if (text) return text;
    }
    return '';
};

const normalizePatternPos = (value) => {
    const pos = normalizeToken(value);
    return PATTERN_POS_OPTIONS.includes(pos) ? pos : '';
};

const normalizePosList = (value) => normalizeStringList(value)
    .map((pos) => normalizePatternPos(pos))
    .filter(Boolean);

const METADATA_KEY_ALIASES = {
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

const normalizeMetadataKey = (key) => METADATA_KEY_ALIASES[key] || key;
const isMeaningfulValue = (value) => value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');

const addMetadataEntry = (target, key, value) => {
    if (!isMeaningfulValue(value)) return;

    if (key === 'metadata' && value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([nestedKey, nestedValue]) => addMetadataEntry(target, nestedKey, nestedValue));
        return;
    }

    const normalizedKey = normalizeMetadataKey(key);
    if (LEGACY_METADATA_KEYS.has(normalizedKey)) return;
    if (normalizedKey === 'clientId' || normalizedKey === 'id') return;
    if (normalizedKey === 'linguistic_role' || normalizedKey === 'gender') return;

    target[normalizedKey] = value;
};

const collectMetadata = (record, ignoreKeys) => {
    const metadata = {};

    if (record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)) {
        Object.entries(record.metadata).forEach(([key, value]) => addMetadataEntry(metadata, key, value));
    }

    Object.entries(record).forEach(([key, value]) => {
        if (ignoreKeys.has(key)) return;
        addMetadataEntry(metadata, key, value);
    });

    return metadata;
};

const normalizeApplicabilityMetadata = (record) => collectMetadata(record, new Set(['pos', 'metadata', 'linguisticRole', 'linguistic_role', 'gender', 'clientId', 'id']));

const inferLegacyPatternPosTypes = (record, category) => {
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
};

const buildLegacyApplicabilitySource = (record, pos) => {
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
};

const createBlankApplicability = (pos) => ({
    pos,
    linguisticRole: '',
    gender: '',
    notes: '',
    metadata: {},
});

const normalizeApplicability = (record) => {
    const pos = normalizePatternPos(record.pos);
    if (!pos) return null;

    if (!hasPatternMetadata(pos)) {
        return {
            pos,
            metadata: {},
        };
    }

    const metadata = normalizeApplicabilityMetadata(record);
    const linguisticRole = normalizeText(
        record.linguisticRole || record.linguistic_role || metadata.linguisticRole || metadata.linguistic_role,
    );
    const gender = normalizeText(record.gender || metadata.gender);
    const notes = normalizeText(record.notes || metadata.notes);
    const clientId = normalizeText(record.clientId || metadata.clientId || record.id || metadata.id);

    delete metadata.linguistic_role;
    delete metadata.gender;
    delete metadata.clientId;
    delete metadata.id;
    if (notes) metadata.notes = notes;
    else delete metadata.notes;

    return {
        pos,
        linguisticRole,
        gender,
        notes,
        metadata,
        clientId,
    };
};

const normalizeApplicabilities = (value, category) => {
    const rawApplicabilities = Array.isArray(value.applicabilities) ? value.applicabilities : [];
    const normalizedPosTypes = normalizePosList(value.pos_types);

    if (rawApplicabilities.length > 0) {
        const normalizedApplicabilities = rawApplicabilities
            .map((item) => normalizeApplicability(item))
            .filter(Boolean);
        return {
            applicabilities: normalizedApplicabilities,
            posTypes: Array.from(new Set([
                ...(normalizedPosTypes.length > 0 ? normalizedPosTypes : normalizedApplicabilities.map((app) => app.pos)),
                ...normalizedApplicabilities.map((app) => app.pos),
            ])),
        };
    }

    const inferredPosTypes = normalizedPosTypes.length > 0 ? normalizedPosTypes : inferLegacyPatternPosTypes(value, category);
    return {
        applicabilities: inferredPosTypes
            .map((pos) => normalizeApplicability(buildLegacyApplicabilitySource(value, pos)))
            .filter(Boolean),
        posTypes: inferredPosTypes,
    };
};

export function normalizePatternFormValue(value, category) {
    const record = value && typeof value === 'object' ? value : {};
    const cv = normalizeText(record.cv);
    const wizen = normalizeText(record.wizen);
    const stress = Number.isFinite(Number(record.stress)) ? Number(record.stress) : 2;
    const description = normalizeText(record.description);
    const rawPosTypes = normalizePosList(record.pos_types);
    const { applicabilities, posTypes } = normalizeApplicabilities(record, category);
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
            ...(rawPosTypes.length > 0 ? rawPosTypes : posTypes),
            ...applicabilities.map((app) => app.pos),
        ])),
        applicabilities,
        metadata,
    };
}

export function getPatternApplicabilitySummary(value, category) {
    const normalized = normalizePatternFormValue(value, category);
    const applicabilities = normalized.applicabilities || [];

    return applicabilities.map((app) => {
        const labelParts = [titleCase(app.pos)];

        if (app.linguisticRole) labelParts.push(`Role ${app.linguisticRole}`);
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

export function getPatternMetadataSummary(value, category) {
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

export function buildPatternOptions(source, mode, filters = {}) {
    const posFilters = filters.pos
        ? (Array.isArray(filters.pos) ? filters.pos : [filters.pos]).map((pos) => normalizeToken(pos))
        : null;
    const roleFilters = filters.roles?.map((role) => normalizeToken(role)) ?? null;
    const genderFilters = filters.gender
        ? (Array.isArray(filters.gender) ? filters.gender : [filters.gender]).map((gender) => normalizeToken(gender))
        : null;
    const rolePrefix = filters.rolePrefix ? normalizeToken(filters.rolePrefix) : null;

    const unique = new Map();

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
