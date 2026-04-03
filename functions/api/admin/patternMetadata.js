export const PATTERN_POS_OPTIONS = ['verb', 'noun', 'adjective', 'participle', 'numeral'];

export const PATTERN_BUCKET_LABELS = {
    cv_wizen_pattern: 'Pattern',
    broken_pattern: 'Broken plural',
    feminine_pattern: 'Feminine singular',
    sound_suffix: 'Sound plural',
    diminutive_pattern: 'Diminutive',
    adjective_pattern: 'Elative',
};

export const NOUN_CLASS_OPTIONS = [
    { label: 'Strong', value: 'strong' },
    { label: 'Weak', value: 'weak' },
];

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
            { key: 'classValue', label: 'Noun Class', kind: 'select', options: NOUN_CLASS_OPTIONS, emptyLabel: '-- Select --' },
            {
                key: 'weakClass',
                label: 'Weak Class',
                kind: 'select',
                optionSource: 'weak_class',
                emptyLabel: '-- Select --',
                showWhen: (app) => app.classValue === 'weak',
            },
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'text', placeholder: 'e.g. plural, collective, singular' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
        ],
    },
    verb: {
        label: 'Verb',
        fields: [
            { key: 'verbForm', label: 'Verb Form', kind: 'select', optionSource: 'verb_form', emptyLabel: '-- Select --' },
            { key: 'classCompatibility', label: 'Class Compatibility', kind: 'select', optionSource: 'verb_class', emptyLabel: '-- Select --' },
            { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Optional verb-specific notes...', rows: 3 },
        ],
    },
    adjective: {
        label: 'Adjective',
        fields: [
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'text', placeholder: 'e.g. elative, qualitative' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
        ],
    },
    participle: {
        label: 'Participle',
        fields: [
            { key: 'participleType', label: 'Participle Type', kind: 'select', options: PARTICIPLE_TYPE_OPTIONS, emptyLabel: '-- Select --' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
            { key: 'linguisticRole', label: 'Linguistic Role', kind: 'text', placeholder: 'e.g. active, passive, adjectival' },
        ],
    },
    numeral: {
        label: 'Numeral',
        fields: [
            { key: 'numeralType', label: 'Numeral Type', kind: 'select', options: NUMERAL_TYPE_OPTIONS, emptyLabel: '-- Select --' },
            { key: 'gender', label: 'Gender', kind: 'select', optionSource: 'gender', emptyLabel: '-- Any --' },
        ],
    },
};

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

const collectMetadata = (record) => {
    const metadata = record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? { ...record.metadata }
        : {};

    Object.entries(record).forEach(([key, value]) => {
        if (['pos', 'metadata'].includes(key)) return;
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            metadata[key] = value;
        }
    });

    return metadata;
};

const normalizeApplicabilityMetadata = (record) => {
    const metadata = collectMetadata(record);

    const classValue = firstNonEmpty(record.class, record.strength, metadata.class, metadata.strength);
    const weakClass = firstNonEmpty(record.weakClass, record.weak_class, metadata.weakClass, metadata.weak_class);
    const verbForm = firstNonEmpty(record.verbForm, record.verb_form, metadata.verbForm, metadata.verb_form);
    const classCompatibility = firstNonEmpty(
        record.classCompatibility,
        record.class_compatibility,
        metadata.classCompatibility,
        metadata.class_compatibility,
    );
    const linguisticRole = firstNonEmpty(
        record.linguisticRole,
        record.linguistic_role,
        metadata.linguisticRole,
        metadata.linguistic_role,
    );
    const gender = firstNonEmpty(record.gender, metadata.gender);
    const participleType = firstNonEmpty(
        record.participleType,
        record.participle_type,
        metadata.participleType,
        metadata.participle_type,
    );
    const numeralType = firstNonEmpty(
        record.numeralType,
        record.numeral_type,
        metadata.numeralType,
        metadata.numeral_type,
    );
    const notes = firstNonEmpty(record.notes, metadata.notes);

    if (classValue) metadata.class = classValue;
    if (weakClass) metadata.weak_class = weakClass;
    if (verbForm) metadata.verb_form = verbForm;
    if (classCompatibility) metadata.class_compatibility = classCompatibility;
    if (linguisticRole) metadata.linguistic_role = linguisticRole;
    if (gender) metadata.gender = gender;
    if (participleType) metadata.participle_type = participleType;
    if (numeralType) metadata.numeral_type = numeralType;
    if (notes) metadata.notes = notes;

    delete metadata.strength;
    delete metadata.weakClass;
    delete metadata.verbForm;
    delete metadata.classCompatibility;
    delete metadata.linguisticRole;
    delete metadata.participleType;
    delete metadata.numeralType;

    return {
        classValue,
        weakClass,
        verbForm,
        classCompatibility,
        linguisticRole,
        gender,
        participleType,
        numeralType,
        notes,
        metadata,
    };
};

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
    const metadata = collectMetadata(record);

    switch (pos) {
        case 'noun':
            return {
                pos,
                class: record.class || record.strength || metadata.class || metadata.strength || '',
                weak_class: record.weak_class || metadata.weak_class || '',
                linguistic_role: record.linguistic_role || metadata.linguistic_role || '',
                gender: record.gender || metadata.gender || '',
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
                metadata,
            };
        case 'participle':
            return {
                pos,
                participle_type: record.participle_type || metadata.participle_type || '',
                linguistic_role: record.linguistic_role || metadata.linguistic_role || '',
                gender: record.gender || metadata.gender || '',
                metadata,
            };
        case 'numeral':
            return {
                pos,
                numeral_type: record.numeral_type || metadata.numeral_type || '',
                gender: record.gender || metadata.gender || '',
                metadata,
            };
        default:
            return { pos, metadata };
    }
};

const normalizeApplicability = (record) => {
    const pos = normalizePatternPos(record.pos);
    if (!pos) return null;

    const metadata = normalizeApplicabilityMetadata(record);
    const classValue = normalizeText(record.class || record.strength || metadata.class || metadata.strength);
    const weakClass = normalizeText(record.weakClass || record.weak_class || metadata.weakClass || metadata.weak_class);
    const verbForm = normalizeText(record.verbForm || record.verb_form || metadata.verbForm || metadata.verb_form);
    const classCompatibility = normalizeText(
        record.classCompatibility || record.class_compatibility || metadata.classCompatibility || metadata.class_compatibility,
    );
    const linguisticRole = normalizeText(
        record.linguisticRole || record.linguistic_role || metadata.linguisticRole || metadata.linguistic_role,
    );
    const gender = normalizeText(record.gender || metadata.gender);
    const participleType = normalizeText(
        record.participleType || record.participle_type || metadata.participleType || metadata.participle_type,
    );
    const numeralType = normalizeText(
        record.numeralType || record.numeral_type || metadata.numeralType || metadata.numeral_type,
    );
    const notes = normalizeText(record.notes || metadata.notes);

    if (classValue) metadata.class = classValue;
    if (weakClass) metadata.weak_class = weakClass;
    if (verbForm) metadata.verb_form = verbForm;
    if (classCompatibility) metadata.class_compatibility = classCompatibility;
    if (linguisticRole) metadata.linguistic_role = linguisticRole;
    if (gender) metadata.gender = gender;
    if (participleType) metadata.participle_type = participleType;
    if (numeralType) metadata.numeral_type = numeralType;
    if (notes) metadata.notes = notes;

    return {
        pos,
        classValue,
        strength: classValue,
        weakClass: classValue === 'weak' ? weakClass : '',
        verbForm,
        classCompatibility,
        linguisticRole,
        gender,
        participleType,
        numeralType,
        notes,
        metadata,
    };
};

const normalizeApplicabilities = (value, category) => {
    const rawApplicabilities = Array.isArray(value.applicabilities) ? value.applicabilities : [];

    if (rawApplicabilities.length > 0) {
        return rawApplicabilities
            .map((item) => normalizeApplicability(item))
            .filter(Boolean);
    }

    const normalizedPosTypes = normalizePosList(value.pos_types);
    const inferredPosTypes = normalizedPosTypes.length > 0 ? normalizedPosTypes : inferLegacyPatternPosTypes(value, category);
    return inferredPosTypes
        .map((pos) => normalizeApplicability(buildLegacyApplicabilitySource(value, pos)))
        .filter(Boolean);
};

export function normalizePatternFormValue(value, category) {
    const record = value && typeof value === 'object' ? value : {};
    const cv = normalizeText(record.cv);
    const wizen = normalizeText(record.wizen);
    const stress = Number.isFinite(Number(record.stress)) ? Number(record.stress) : 2;
    const description = normalizeText(record.description);
    const posTypes = normalizePosList(record.pos_types);
    const applicabilities = normalizeApplicabilities(record, category);

    return {
        cv,
        wizen,
        stress,
        description,
        pos_types: posTypes.length > 0 ? posTypes : Array.from(new Set(applicabilities.map((app) => app.pos))),
        applicabilities,
        metadata: record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
            ? record.metadata
            : {},
    };
}

export function getPatternApplicabilitySummary(value, category) {
    const normalized = normalizePatternFormValue(value, category);
    const applicabilities = normalized.applicabilities || [];

    return applicabilities.map((app) => {
        const labelParts = [titleCase(app.pos)];

        if (app.pos === 'noun' && app.classValue) labelParts.push(`Noun Class ${app.classValue}`);
        if (app.pos === 'noun' && app.weakClass) labelParts.push(`Weak Class ${app.weakClass}`);
        if (app.pos === 'verb' && app.verbForm) labelParts.push(`Verb Form ${app.verbForm}`);
        if (app.pos === 'verb' && app.classCompatibility) labelParts.push(`Class Compatibility ${app.classCompatibility.replace(/_/g, ' ')}`);
        if (app.pos === 'adjective' && app.linguisticRole) labelParts.push(`Role ${app.linguisticRole}`);
        if (app.pos === 'adjective' && app.gender) labelParts.push(`Gender ${app.gender}`);
        if (app.pos === 'participle' && app.participleType) labelParts.push(`Participle Type ${app.participleType}`);
        if (app.pos === 'participle' && app.gender) labelParts.push(`Gender ${app.gender}`);
        if (app.pos === 'participle' && app.linguisticRole) labelParts.push(`Role ${app.linguisticRole}`);
        if (app.pos === 'numeral' && app.numeralType) labelParts.push(`Numeral Type ${app.numeralType}`);
        if (app.pos === 'numeral' && app.gender) labelParts.push(`Gender ${app.gender}`);
        if (!['noun', 'verb', 'adjective', 'participle', 'numeral'].includes(app.pos)) {
            if (app.classValue) labelParts.push(`Class ${app.classValue}`);
            if (app.weakClass) labelParts.push(`Weak ${app.weakClass}`);
            if (app.verbForm) labelParts.push(app.verbForm);
            if (app.classCompatibility) labelParts.push(app.classCompatibility.replace(/_/g, ' '));
            if (app.linguisticRole) labelParts.push(app.linguisticRole);
            if (app.gender) labelParts.push(app.gender);
            if (app.participleType) labelParts.push(app.participleType);
            if (app.numeralType) labelParts.push(app.numeralType);
        }
        if (app.notes) labelParts.push(app.notes);

        return {
            pos: app.pos,
            classValue: app.classValue || '',
            strength: app.classValue || '',
            weakClass: app.weakClass || '',
            verbForm: app.verbForm || '',
            classCompatibility: app.classCompatibility || '',
            linguisticRole: app.linguisticRole || '',
            gender: app.gender || '',
            participleType: app.participleType || '',
            numeralType: app.numeralType || '',
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
        gender: firstApplicability?.gender,
        weakClass: firstApplicability?.weakClass,
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
