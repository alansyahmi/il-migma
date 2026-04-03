/**
 * Admin Config Schema Validation & Normalization
 * Shared logic for the Cloudflare Workers API.
 */

import { normalizePatternFormValue } from './patternMetadata.js';

const PATTERN_CATEGORIES = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];
const POS_ALLOWED_FIELDS = {
    verb: [],
    noun: ['strength', 'weak_class', 'gender'],
    adjective: ['gender'],
    participle: ['participle_type', 'gender'],
    numeral: ['numeral_type', 'gender'],
};

function nfc(value) {
    return typeof value === 'string' ? value.normalize('NFC').trim() : value;
}

function normalizeToken(value) {
    return String(value ?? '').trim().toLowerCase();
}

function normalizeStringList(value) {
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

function pruneEmptyObject(value) {
    if (!value || typeof value !== 'object') return {};
    return Object.fromEntries(
        Object.entries(value).filter(([, item]) => item !== undefined && item !== null && String(item).trim() !== '')
    );
}

function normalizeApplicabilityMetadata(pos, input) {
    const record = input && typeof input === 'object' ? input : {};
    const metadata = {};
    const allowedFields = POS_ALLOWED_FIELDS[normalizeToken(pos)] || [];

    if (record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)) {
        Object.assign(metadata, record.metadata);
    }

    allowedFields.forEach((field) => {
        if (record[field] !== undefined && record[field] !== null && String(record[field]).trim() !== '') {
            metadata[field] = nfc(record[field]);
        }
    });

    // Preserve any extra explicit metadata keys for forward compatibility.
    if (record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)) {
        Object.entries(record.metadata).forEach(([key, value]) => {
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                metadata[key] = nfc(value);
            }
        });
    }

    if (metadata.class !== undefined && metadata.strength === undefined) {
        metadata.strength = metadata.class;
    }

    return pruneEmptyObject(metadata);
}

function normalizeApplicabilities(value) {
    const normalizedPosTypes = normalizeStringList(value.pos_types);
    const rawApplicabilities = Array.isArray(value.applicabilities) ? value.applicabilities : [];

    if (rawApplicabilities.length > 0) {
        return rawApplicabilities
            .map((item) => {
                const pos = normalizeToken(item?.pos);
                if (!pos) return null;

                const metadata = normalizeApplicabilityMetadata(pos, item);
                const strength = nfc(item?.strength || metadata.strength || '');
                const gender = nfc(item?.gender || metadata.gender || '');
                const weakClass = nfc(item?.weakClass || metadata.weak_class || '');
                const participleType = nfc(item?.participleType || metadata.participle_type || '');
                const numeralType = nfc(item?.numeralType || metadata.numeral_type || '');

                if (strength) metadata.strength = strength;
                if (gender) metadata.gender = gender;
                if (weakClass) metadata.weak_class = weakClass;
                if (participleType) metadata.participle_type = participleType;
                if (numeralType) metadata.numeral_type = numeralType;
                delete metadata.class;
                delete metadata.linguistic_role;

                return {
                    pos,
                    strength,
                    gender,
                    weakClass,
                    participleType,
                    numeralType,
                    metadata,
                };
            })
            .filter(Boolean);
    }

    const legacyMetadata = normalizeApplicabilityMetadata(
        normalizedPosTypes[0] || '',
        {
            strength: value.strength || value.class,
            weak_class: value.weak_class,
            gender: value.gender,
            participle_type: value.participle_type,
            numeral_type: value.numeral_type,
            metadata: value.metadata,
        }
    );
    const strength = nfc(value.strength || legacyMetadata.strength || '');
    const gender = nfc(value.gender || legacyMetadata.gender || '');
    const weakClass = nfc(value.weak_class || legacyMetadata.weak_class || '');
    const participleType = nfc(value.participle_type || legacyMetadata.participle_type || '');
    const numeralType = nfc(value.numeral_type || legacyMetadata.numeral_type || '');

    if (strength) legacyMetadata.strength = strength;
    if (gender) legacyMetadata.gender = gender;
    if (weakClass) legacyMetadata.weak_class = weakClass;
    if (participleType) legacyMetadata.participle_type = participleType;
    if (numeralType) legacyMetadata.numeral_type = numeralType;

    return (normalizedPosTypes.length > 0 ? normalizedPosTypes : ['all']).map((pos) => ({
        pos,
        strength,
        gender,
        weakClass,
        participleType,
        numeralType,
        metadata: { ...legacyMetadata },
    }));
}

export function validateAndNormalize(category, value) {
    if (value === null || value === undefined) {
        throw new Error('Value is required');
    }

    // 1. Pattern Categories
    if (PATTERN_CATEGORIES.includes(category)) {
        let obj = value;

        // Backward compatibility: If it's a string, it's likely just the CV pattern
        if (typeof value === 'string') {
            obj = { cv: value, wizen: '', stress: 2, pos_types: [] };
        }

        if (typeof obj !== 'object' || obj === null) {
            throw new Error(`Invalid format for pattern category: ${category}`);
        }

        const normalized = normalizePatternFormValue(obj, category);

        if (!normalized.cv && !normalized.wizen) {
            throw new Error('Pattern must have at least CV or Wizen representation');
        }

        return normalized;
    }

    // 2. UI Terminology
    if (category === 'ui_terminology') {
        if (typeof value !== 'object' || value === null) {
            throw new Error('UI Terminology must be an object of localized strings');
        }

        const normalized = {
            en: nfc(value.en || ''),
            mt_standard: nfc(value.mt_standard || ''),
            mt_arabised: nfc(value.mt_arabised || '')
        };

        if (!normalized.en && !normalized.mt_standard && !normalized.mt_arabised) {
            throw new Error('UI Terminology must have at least one translation');
        }

        return normalized;
    }

    // 3. Verb Presets
    if (category === 'verb_preset') {
        if (typeof value !== 'object' || value === null) {
            throw new Error('Verb Preset must be an object');
        }

        const normalizeForm = (f) => ({
            cv: nfc(f?.cv || ''),
            wizen: nfc(f?.wizen || '')
        });

        const normalized = {
            en: nfc(value.en || ''),
            mt_standard: nfc(value.mt_standard || ''),
            mt_arabised: nfc(value.mt_arabised || ''),
            perfect: normalizeForm(value.perfect),
            passive: normalizeForm(value.passive),
            active: normalizeForm(value.active),
            verbal: normalizeForm(value.verbal)
        };

        if (!normalized.en && !normalized.mt_standard && !normalized.mt_arabised) {
            throw new Error('Verb Preset must have a name/label');
        }

        return normalized;
    }

    // 4. Default / Simple Labels
    // If it's a string, we wrap it into a localized object for consistency
    if (typeof value === 'string') {
        const val = nfc(value);
        return { en: val, mt_standard: val, mt_arabised: val };
    }

    if (typeof value === 'object' && value !== null) {
        return {
            en: nfc(value.en || ''),
            mt_standard: nfc(value.mt_standard || ''),
            mt_arabised: nfc(value.mt_arabised || '')
        };
    }

    return value;
}
