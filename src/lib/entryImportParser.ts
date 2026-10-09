/**
 * High-performance Parser and Normalizer for Entry Imports (.json, .jsonc, .jsonl).
 * Supports:
 * - Line-delimited JSON (.jsonl)
 * - Standard JSON (.json)
 * - JSON with Comments and Trailing Commas (.jsonc)
 * - Root arrays of entries: [ {...}, ... ]
 * - Root objects with entries array: { "entries": [ ... ] } or { "data": [ ... ] }
 * - Category-grouped objects: { "metadata": {...}, "nouns": [...], "verbs": [...] }
 * - Wiktionary-scraper wrappers: { "entry": {...}, "tags": [...] }
 */

export interface EntryImportParseResult {
    success: boolean;
    format: 'json' | 'jsonc' | 'jsonl';
    entries: Record<string, any>[];
    total: number;
    validCount: number;
    invalidCount: number;
    categories: string[];
    warnings: string[];
    errors: string[];
    sample: Record<string, any>[];
}

/**
 * Strips JSONC comments (// and /*...*\/) and trailing commas in a single O(N) pass,
 * preserving line breaks and character positions. Completely safe with URLs and escaped strings.
 */
export function cleanJsonc(input: string): { cleaned: string; hadComments: boolean; hadTrailingCommas: boolean } {
    let result = '';
    let insideString = false;
    let stringQuote = '';
    let isEscaped = false;
    let insideSingle = false;
    let insideMulti = false;
    let pendingComma = false;
    let bufferedWhitespace = '';
    let hadComments = false;
    let hadTrailingCommas = false;

    // Handle UTF-8 BOM
    const startIdx = input.charCodeAt(0) === 0xFEFF ? 1 : 0;

    for (let i = startIdx; i < input.length; i++) {
        const char = input[i];
        const nextChar = input[i + 1];

        // 1. Inside single-line comment //
        if (insideSingle) {
            if (char === '\n' || char === '\r') {
                insideSingle = false;
                result += char;
            }
            continue;
        }

        // 2. Inside multi-line comment /* ... */
        if (insideMulti) {
            if (char === '*' && nextChar === '/') {
                insideMulti = false;
                i++; // skip /
            } else if (char === '\n') {
                result += char; // retain line numbering
            }
            continue;
        }

        // 3. Inside string literal
        if (insideString) {
            result += char;
            if (isEscaped) {
                isEscaped = false;
            } else if (char === '\\') {
                isEscaped = true;
            } else if (char === stringQuote) {
                insideString = false;
            }
            continue;
        }

        // 4. Entering string literal
        if (char === '"' || char === "'") {
            if (pendingComma) {
                result += ',' + bufferedWhitespace;
                pendingComma = false;
                bufferedWhitespace = '';
            }
            insideString = true;
            stringQuote = char;
            isEscaped = false;
            result += char;
            continue;
        }

        // 5. Entering single-line comment //
        if (char === '/' && nextChar === '/') {
            hadComments = true;
            insideSingle = true;
            i++; // skip next /
            continue;
        }

        // 6. Entering multi-line comment /*
        if (char === '/' && nextChar === '*') {
            hadComments = true;
            insideMulti = true;
            i++; // skip next *
            continue;
        }

        // 7. Comma detection for trailing comma elimination
        if (char === ',') {
            if (pendingComma) {
                result += ',' + bufferedWhitespace;
                bufferedWhitespace = '';
            }
            pendingComma = true;
            continue;
        }

        // 8. Closing brackets: if preceded by pendingComma, it's a trailing comma!
        if (char === '}' || char === ']') {
            if (pendingComma) {
                hadTrailingCommas = true;
                pendingComma = false;
            }
            result += bufferedWhitespace + char;
            bufferedWhitespace = '';
            continue;
        }

        // 9. Whitespace outside string
        if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
            if (pendingComma) {
                bufferedWhitespace += char;
            } else {
                result += char;
            }
            continue;
        }

        // 10. Any other token (number, boolean, identifier, colon, opening bracket, etc.)
        if (pendingComma) {
            result += ',' + bufferedWhitespace;
            pendingComma = false;
            bufferedWhitespace = '';
        }
        result += char;
    }

    if (pendingComma) {
        result += ',' + bufferedWhitespace;
    }

    return { cleaned: result, hadComments, hadTrailingCommas };
}

/**
 * Normalizes an raw item (which may be a bare entry or wrapped in { entry: ..., tags: ... }).
 */
export function normalizeRawEntry(rawItem: any, fallbackCategory?: string): Record<string, any> | null {
    if (!rawItem || typeof rawItem !== 'object') return null;

    let entry: Record<string, any>;
    if (rawItem.entry && typeof rawItem.entry === 'object') {
        entry = { ...rawItem.entry };
        if (Array.isArray(rawItem.tags) && !entry.tags) {
            entry.tags = rawItem.tags.map((t: any) => (typeof t === 'object' && t?.name ? t.name : String(t)));
        } else if (Array.isArray(rawItem.entry_tags) && !entry.tags) {
            entry.tags = rawItem.entry_tags.map((t: any) => (typeof t === 'object' && t?.name ? t.name : String(t)));
        }
    } else {
        entry = { ...rawItem };
    }

    if (!entry.headword || !entry.pos) {
        return null;
    }

    // Attach fallback category if provided and not already specified
    if (fallbackCategory && !entry.theme && !entry.category) {
        entry.theme = fallbackCategory;
    }

    return entry;
}

/**
 * Parses raw text input into a standardized list of entries, auto-detecting
 * whether the format is JSONL, JSON, or JSONC.
 */
export function parseEntryImportPayload(
    text: string,
    options: { filename?: string } = {}
): EntryImportParseResult {
    const filename = (options.filename || '').toLowerCase();
    const warnings: string[] = [];
    const categoriesSet = new Set<string>();

    const trimmed = text.trim();
    if (!trimmed) {
        return {
            success: false,
            format: 'json',
            entries: [],
            total: 0,
            validCount: 0,
            invalidCount: 0,
            categories: [],
            warnings: [],
            errors: ['The provided input is empty.'],
            sample: [],
        };
    }

    const isJsonlExt = filename.endsWith('.jsonl');
    const isJsoncExt = filename.endsWith('.jsonc');

    // Strategy 1: If file extension is .jsonl, or looks like multiple JSON lines
    if (isJsonlExt || (!filename && !trimmed.startsWith('{') && !trimmed.startsWith('['))) {
        const jsonlResult = tryParseJsonl(text, warnings);
        if (jsonlResult) {
            return jsonlResult;
        }
    }

    // Strategy 2: Parse as JSON / JSONC
    try {
        const { cleaned, hadComments, hadTrailingCommas } = cleanJsonc(text);
        const parsed = JSON.parse(cleaned);
        const format: 'json' | 'jsonc' | 'jsonl' = (isJsoncExt || hadComments || hadTrailingCommas) ? 'jsonc' : 'json';

        const validEntries: Record<string, any>[] = [];
        let invalidCount = 0;

        // Shape A: Root is an Array [ {...}, ... ]
        if (Array.isArray(parsed)) {
            for (let i = 0; i < parsed.length; i++) {
                const normalized = normalizeRawEntry(parsed[i]);
                if (normalized) {
                    validEntries.push(normalized);
                    if (normalized.theme) categoriesSet.add(normalized.theme);
                } else {
                    invalidCount++;
                    if (invalidCount <= 5) {
                        warnings.push(`Item #${i + 1} is missing required 'headword' or 'pos'.`);
                    }
                }
            }
        }
        // Shape B: Root is an Object
        else if (parsed && typeof parsed === 'object') {
            // Check for direct array wrappers: "entries", "data", "items", "results"
            const directArrayKey = ['entries', 'data', 'items', 'results'].find(
                (k) => Array.isArray(parsed[k])
            );

            if (directArrayKey) {
                const arr = parsed[directArrayKey] as any[];
                for (let i = 0; i < arr.length; i++) {
                    const normalized = normalizeRawEntry(arr[i]);
                    if (normalized) {
                        validEntries.push(normalized);
                        if (normalized.theme) categoriesSet.add(normalized.theme);
                    } else {
                        invalidCount++;
                        if (invalidCount <= 5) {
                            warnings.push(`Entry #${i + 1} in '${directArrayKey}' is missing 'headword' or 'pos'.`);
                        }
                    }
                }
            } else {
                // Shape C: Category-grouped object (e.g. 1000-most-common-maltese-words.jsonc)
                // Keys like "pronouns_determiners": [ ... ], "prepositions": [ ... ]
                let foundCategoryArrays = false;
                for (const [key, value] of Object.entries(parsed)) {
                    if (key === 'metadata' || key === 'total_entries' || key === 'total_categories') {
                        continue;
                    }

                    if (Array.isArray(value)) {
                        foundCategoryArrays = true;
                        categoriesSet.add(key);
                        for (let i = 0; i < value.length; i++) {
                            const normalized = normalizeRawEntry(value[i], key);
                            if (normalized) {
                                validEntries.push(normalized);
                            } else {
                                invalidCount++;
                                if (invalidCount <= 5) {
                                    warnings.push(`Item #${i + 1} under '${key}' is missing 'headword' or 'pos'.`);
                                }
                            }
                        }
                    }
                }

                // Shape D: Single entry object at root
                if (!foundCategoryArrays) {
                    const normalized = normalizeRawEntry(parsed);
                    if (normalized) {
                        validEntries.push(normalized);
                    } else {
                        return {
                            success: false,
                            format,
                            entries: [],
                            total: 0,
                            validCount: 0,
                            invalidCount: 1,
                            categories: [],
                            warnings,
                            errors: ["The JSON object does not contain any entries or recognized array fields ('entries', categories, etc.)."],
                            sample: [],
                        };
                    }
                }
            }
        }

        if (invalidCount > 5) {
            warnings.push(`...plus ${invalidCount - 5} more invalid items.`);
        }

        const total = validEntries.length + invalidCount;
        return {
            success: validEntries.length > 0,
            format,
            entries: validEntries,
            total,
            validCount: validEntries.length,
            invalidCount,
            categories: Array.from(categoriesSet),
            warnings,
            errors: validEntries.length === 0 ? ['No valid dictionary entries found in file.'] : [],
            sample: validEntries.slice(0, 5),
        };
    } catch (jsonErr: any) {
        // If JSON parsing failed, try JSONL as fallback (especially if user pasted lines or forgot .jsonl extension)
        const jsonlFallback = tryParseJsonl(text, warnings);
        if (jsonlFallback && jsonlFallback.validCount > 0) {
            return jsonlFallback;
        }

        return {
            success: false,
            format: isJsoncExt ? 'jsonc' : 'json',
            entries: [],
            total: 0,
            validCount: 0,
            invalidCount: 0,
            categories: [],
            warnings,
            errors: [`Failed to parse JSON/JSONC: ${jsonErr.message}`],
            sample: [],
        };
    }
}

function tryParseJsonl(text: string, warnings: string[]): EntryImportParseResult | null {
    const rawLines = text.split(/\r?\n/).map((l) => l.trim());
    const validEntries: Record<string, any>[] = [];
    let invalidCount = 0;
    let jsonLinesFound = 0;

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (!line || line.startsWith('//') || line.startsWith('#')) {
            continue; // Skip comments and empty lines
        }

        let parsedLine: any;
        try {
            parsedLine = JSON.parse(line);
            jsonLinesFound++;
        } catch {
            // Not a valid JSON line
            continue;
        }

        const normalized = normalizeRawEntry(parsedLine);
        if (normalized) {
            validEntries.push(normalized);
        } else {
            invalidCount++;
            if (invalidCount <= 5) {
                warnings.push(`Line #${i + 1} is missing required 'headword' or 'pos'.`);
            }
        }
    }

    if (jsonLinesFound === 0) {
        return null;
    }

    if (invalidCount > 5) {
        warnings.push(`...plus ${invalidCount - 5} more invalid lines.`);
    }

    const total = validEntries.length + invalidCount;
    return {
        success: validEntries.length > 0,
        format: 'jsonl',
        entries: validEntries,
        total,
        validCount: validEntries.length,
        invalidCount,
        categories: [],
        warnings,
        errors: validEntries.length === 0 ? ['Found JSON lines, but none contained valid headword and pos fields.'] : [],
        sample: validEntries.slice(0, 5),
    };
}
