import assert from 'node:assert/strict';
import {
    buildSuggestedEntryId,
    getEntryIdPrefix,
    normalizeEntryPos,
    slugifyEntryHeadword,
} from '../src/lib/entryId.ts';

const run = () => {
    assert.strictEqual(normalizeEntryPos('v'), 'verb', 'verb alias should normalize');
    assert.strictEqual(normalizeEntryPos('det'), 'article', 'article alias should normalize');
    assert.strictEqual(normalizeEntryPos('verbal noun'), 'verbal_noun', 'verbal noun alias should normalize');

    assert.strictEqual(getEntryIdPrefix('noun'), 'noun', 'noun prefix should stay canonical');
    assert.strictEqual(getEntryIdPrefix('participle', 'active'), 'ap', 'active participles should use ap prefix');
    assert.strictEqual(getEntryIdPrefix('participle', 'passive'), 'pp', 'passive participles should use pp prefix');
    assert.strictEqual(getEntryIdPrefix('verbal_noun'), 'vn', 'verbal noun should use vn prefix');

    assert.strictEqual(slugifyEntryHeadword("Ċaħda tal-lum!"), 'ċaħda-tal-lum', 'headword slug should preserve Maltese letters');
    assert.strictEqual(slugifyEntryHeadword('  Hello, world  '), 'hello-world', 'headword slug should trim and strip punctuation');

    assert.strictEqual(
        buildSuggestedEntryId({ headword: 'Kanta', pos: 'verb' }),
        'verb-kanta',
        'verbs should use the standardized verb prefix'
    );
    assert.strictEqual(
        buildSuggestedEntryId({ headword: 'Servitur', pos: 'participle', participleType: 'active' }),
        'ap-servitur',
        'active participles should use the active participle prefix'
    );
    assert.strictEqual(
        buildSuggestedEntryId({ headword: 'Servitu', pos: 'participle', participleType: 'passive' }),
        'pp-servitu',
        'passive participles should use the passive participle prefix'
    );
    assert.strictEqual(
        buildSuggestedEntryId({ headword: 'Nom Verbali', pos: 'verbal noun' }),
        'vn-nom-verbali',
        'verbal nouns should get the vn prefix'
    );
    assert.strictEqual(
        buildSuggestedEntryId({ headword: 'Għaqda', pos: 'adjective' }),
        'adj-għaqda',
        'adjectives should use the adj prefix'
    );
};

run();
console.log('entryId tests passed');
