export type PatternSourceItem = {
    cv?: unknown;
    wizen?: unknown;
    stress?: unknown;
    pos_types?: unknown;
    linguistic_role?: unknown;
    gender?: unknown;
};

export type PatternOption = { label: string; value: string; sub?: string };

export const PATTERN_POS_OPTIONS = ['verb', 'noun', 'adjective', 'participle', 'numeral'] as const;
export type PatternPos = typeof PATTERN_POS_OPTIONS[number];

export const PATTERN_BUCKET_LABELS: Record<string, string> = {
    cv_wizen_pattern: 'Pattern',
    broken_pattern: 'Broken plural',
    feminine_pattern: 'Feminine singular',
    sound_suffix: 'Sound plural',
    diminutive_pattern: 'Diminutive',
    adjective_pattern: 'Elative',
};

export const NOUN_CLASS_OPTIONS: PatternOption[] = [
    { label: 'Strong', value: 'strong' },
    { label: 'Weak', value: 'weak' },
];

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
    classValue?: string;
    strength?: string;
    weakClass?: string;
    verbForm?: string;
    classCompatibility?: string;
    linguisticRole?: string;
    gender?: string;
    participleType?: string;
    numeralType?: string;
    notes?: string;
    metadata?: PatternApplicabilityMetadata;
};

export type PatternFormValue = {
    cv?: string;
    wizen?: string;
    stress?: number;
    description?: string;
    pos_types?: string[];
    applicabilities?: PatternApplicability[];
    class?: string;
    strength?: string;
    weak_class?: string;
    verb_form?: string;
    class_compatibility?: string;
    linguistic_role?: string;
    gender?: string;
    participle_type?: string;
    numeral_type?: string;
    notes?: string;
    metadata?: PatternApplicabilityMetadata;
};

export type PatternApplicabilitySummary = {
    pos: string;
    classValue: string;
    weakClass: string;
    verbForm: string;
    classCompatibility: string;
    linguisticRole: string;
    gender: string;
    participleType: string;
    numeralType: string;
    notes: string;
    label: string;
};

export type PatternMetadataSummary = {
    posTypes: string[];
    bucketLabel: string;
    applicabilities: PatternApplicabilitySummary[];
    gender?: string;
    weakClass?: string;
};

export type PatternFieldKind = 'select' | 'text' | 'textarea';

export type PatternFieldSpec = {
    key: keyof PatternApplicability;
    label: string;
    kind: PatternFieldKind;
    optionSource?: string;
    options?: PatternOption[];
    placeholder?: string;
    rows?: number;
    emptyLabel?: string;
    showWhen?: (app: PatternApplicability) => boolean;
};

export type PatternPosSchema = {
    label: string;
    fields: PatternFieldSpec[];
};

export const PATTERN_POS_SCHEMA: Record<PatternPos, PatternPosSchema> = {
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

function firstNonEmpty(...values: unknown[]) {
    for (const value of values) {
        const text = normalizeText(value);
        if (text) return text;
    }
    return '';
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

function collectMetadata(record: Record<string, unknown>) {
    const metadata = record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? { ...(record.metadata as Record<string, unknown>) }
        : {};

    Object.entries(record).forEach(([key, value]) => {
        if (['pos', 'metadata'].includes(key)) return;
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            metadata[key] = value;
        }
    });

    return metadata;
}

function normalizeApplicabilityMetadata(record: Record<string, unknown>) {
    const metadata = collectMetadata(record);
    const metadataRecord = metadata as Record<string, unknown>;

    const classValue = firstNonEmpty(record.class, record.strength, metadataRecord.class, metadataRecord.strength);
    const weakClass = firstNonEmpty(record.weakClass, record.weak_class, metadataRecord.weakClass, metadataRecord.weak_class);
    const verbForm = firstNonEmpty(record.verbForm, record.verb_form, metadataRecord.verbForm, metadataRecord.verb_form);
    const classCompatibility = firstNonEmpty(
        record.classCompatibility,
        record.class_compatibility,
        metadataRecord.classCompatibility,
        metadataRecord.class_compatibility,
    );
    const linguisticRole = firstNonEmpty(
        record.linguisticRole,
        record.linguistic_role,
        metadataRecord.linguisticRole,
        metadataRecord.linguistic_role,
    );
    const gender = firstNonEmpty(record.gender, metadataRecord.gender);
    const participleType = firstNonEmpty(
        record.participleType,
        record.participle_type,
        metadataRecord.participleType,
        metadataRecord.participle_type,
    );
    const numeralType = firstNonEmpty(
        record.numeralType,
        record.numeral_type,
        metadataRecord.numeralType,
        metadataRecord.numeral_type,
    );
    const notes = firstNonEmpty(record.notes, metadataRecord.notes);

    if (classValue) metadataRecord.class = classValue;
    if (weakClass) metadataRecord.weak_class = weakClass;
    if (verbForm) metadataRecord.verb_form = verbForm;
    if (classCompatibility) metadataRecord.class_compatibility = classCompatibility;
    if (linguisticRole) metadataRecord.linguistic_role = linguisticRole;
    if (gender) metadataRecord.gender = gender;
    if (participleType) metadataRecord.participle_type = participleType;
    if (numeralType) metadataRecord.numeral_type = numeralType;
    if (notes) metadataRecord.notes = notes;

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
}

function normalizeApplicability(record: Record<string, unknown>) {
    const pos = normalizePatternPos(record.pos);
    if (!pos) return null;

    const metadata = normalizeApplicabilityMetadata(record);
    const metadataRecord = metadata as Record<string, unknown>;
    const classValue = normalizeText(record.class || record.strength || metadataRecord.class || metadataRecord.strength);
    const weakClass = normalizeText(record.weakClass || record.weak_class || metadataRecord.weakClass || metadataRecord.weak_class);
    const verbForm = normalizeText(record.verbForm || record.verb_form || metadataRecord.verbForm || metadataRecord.verb_form);
    const classCompatibility = normalizeText(
        record.classCompatibility || record.class_compatibility || metadataRecord.classCompatibility || metadataRecord.class_compatibility,
    );
    const linguisticRole = normalizeText(
        record.linguisticRole || record.linguistic_role || metadataRecord.linguisticRole || metadataRecord.linguistic_role,
    );
    const gender = normalizeText(record.gender || metadataRecord.gender);
    const participleType = normalizeText(
        record.participleType || record.participle_type || metadataRecord.participleType || metadataRecord.participle_type,
    );
    const numeralType = normalizeText(
        record.numeralType || record.numeral_type || metadataRecord.numeralType || metadataRecord.numeral_type,
    );
    const notes = normalizeText(record.notes || metadataRecord.notes);

    if (classValue) metadataRecord.class = classValue;
    if (weakClass) metadataRecord.weak_class = weakClass;
    if (verbForm) metadataRecord.verb_form = verbForm;
    if (classCompatibility) metadataRecord.class_compatibility = classCompatibility;
    if (linguisticRole) metadataRecord.linguistic_role = linguisticRole;
    if (gender) metadataRecord.gender = gender;
    if (participleType) metadataRecord.participle_type = participleType;
    if (numeralType) metadataRecord.numeral_type = numeralType;
    if (notes) metadataRecord.notes = notes;

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

    return {
        cv,
        wizen,
        stress,
        description,
        pos_types: posTypes.length > 0 ? posTypes : Array.from(new Set(applicabilities.map((app) => app.pos))),
        applicabilities,
        metadata: record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
            ? record.metadata as PatternApplicabilityMetadata
            : {},
    };
}

export function getPatternApplicabilitySummary(value: unknown, category?: string): PatternApplicabilitySummary[] {
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
        gender: firstApplicability?.gender,
        weakClass: firstApplicability?.weakClass,
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
