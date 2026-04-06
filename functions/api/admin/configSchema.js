/**
 * Admin Config Schema Validation & Normalization
 * Shared logic for the Cloudflare Workers API.
 */

import { normalizePatternFormValue } from './patternMetadata.js';

const PATTERN_CATEGORIES = ['cv_wizen_pattern', 'broken_pattern', 'feminine_pattern', 'sound_suffix', 'diminutive_pattern', 'adjective_pattern'];

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
