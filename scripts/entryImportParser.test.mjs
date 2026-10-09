import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cleanJsonc, parseEntryImportPayload, normalizeRawEntry } from '../src/lib/entryImportParser.ts';

test('cleanJsonc: strips comments and trailing commas while preserving strings', () => {
    const input = `
    // Leading comment
    {
        /* block comment */
        "url": "https://en.wiktionary.org/wiki/hu",
        "nested": {
            "comment_like": "// not a comment /* still not */",
            "escaped": "test \\"quote\\" and \\\\ backslash",
            "items": [
                1,
                2,
                3, // trailing comma here
            ],
        },
    }
    `;

    const { cleaned, hadComments, hadTrailingCommas } = cleanJsonc(input);
    assert.equal(hadComments, true);
    assert.equal(hadTrailingCommas, true);

    const parsed = JSON.parse(cleaned);
    assert.equal(parsed.url, 'https://en.wiktionary.org/wiki/hu');
    assert.equal(parsed.nested.comment_like, '// not a comment /* still not */');
    assert.equal(parsed.nested.escaped, 'test "quote" and \\ backslash');
    assert.deepEqual(parsed.nested.items, [1, 2, 3]);
});

test('cleanJsonc: handles UTF-8 BOM smoothly', () => {
    const input = '\uFEFF{"headword": "kelb", "pos": "noun"}';
    const { cleaned } = cleanJsonc(input);
    const parsed = JSON.parse(cleaned);
    assert.equal(parsed.headword, 'kelb');
});

test('normalizeRawEntry: unwraps wiktionary wrappers and extracts tags', () => {
    const wrapped = {
        entry: { headword: 'ċikka', pos: 'noun' },
        tags: [{ name: 'slang' }, 'colloquial'],
    };
    const normalized = normalizeRawEntry(wrapped);
    assert.ok(normalized);
    assert.equal(normalized.headword, 'ċikka');
    assert.equal(normalized.pos, 'noun');
    assert.deepEqual(normalized.tags, ['slang', 'colloquial']);
});

test('parseEntryImportPayload: parses JSONL format', () => {
    const jsonl = `
    {"entry": {"headword": "dar", "pos": "noun"}}
    // Comment line
    {"headword": "kiteb", "pos": "verb"}
    {"invalid": "no pos or headword"}
    `;
    const res = parseEntryImportPayload(jsonl, { filename: 'test.jsonl' });
    assert.equal(res.success, true);
    assert.equal(res.format, 'jsonl');
    assert.equal(res.validCount, 2);
    assert.equal(res.invalidCount, 1);
    assert.equal(res.entries[0].headword, 'dar');
    assert.equal(res.entries[1].headword, 'kiteb');
});

test('parseEntryImportPayload: parses 1000-most-common-maltese-words.json', () => {
    const filepath = path.resolve('docs/1000-most-common-maltese-words.json');
    if (!fs.existsSync(filepath)) return;

    const raw = fs.readFileSync(filepath, 'utf8');
    const res = parseEntryImportPayload(raw, { filename: '1000-most-common-maltese-words.json' });

    assert.equal(res.success, true);
    assert.equal(res.format, 'json');
    assert.equal(res.validCount, 932);
    assert.equal(res.entries[0].headword, 'hu');
});

test('parseEntryImportPayload: parses 1000-most-common-maltese-words.jsonc with categories & comments', () => {
    const filepath = path.resolve('docs/1000-most-common-maltese-words.jsonc');
    if (!fs.existsSync(filepath)) return;

    const raw = fs.readFileSync(filepath, 'utf8');
    const res = parseEntryImportPayload(raw, { filename: '1000-most-common-maltese-words.jsonc' });

    assert.equal(res.success, true);
    assert.equal(res.format, 'jsonc');
    assert.equal(res.validCount, 932);
    assert.ok(res.categories.length > 20);
    assert.ok(res.categories.includes('pronouns_determiners'));
    assert.ok(res.categories.includes('prepositions'));
    assert.equal(res.entries[0].headword, 'hu');
});

test('parseEntryImportPayload: parses category-specific file (e.g. prepositions.json)', () => {
    const filepath = path.resolve('docs/1000-words-categories/prepositions.json');
    if (!fs.existsSync(filepath)) return;

    const raw = fs.readFileSync(filepath, 'utf8');
    const res = parseEntryImportPayload(raw, { filename: 'prepositions.json' });

    assert.equal(res.success, true);
    assert.ok(res.validCount > 0);
    assert.equal(res.format, 'json');
});

test('parseEntryImportPayload: handles empty and invalid inputs gracefully', () => {
    const emptyRes = parseEntryImportPayload('   ');
    assert.equal(emptyRes.success, false);
    assert.ok(emptyRes.errors.length > 0);

    const malformedRes = parseEntryImportPayload('{ not valid json }');
    assert.equal(malformedRes.success, false);
    assert.ok(malformedRes.errors[0].includes('Failed to parse'));
});
