import assert from 'node:assert/strict';
import {
    buildSuggestedEntryId,
    getEntryIdFamily,
    getEntryIdVariants,
    getEntryIdPrefix,
    normalizeEntryId,
    normalizeEntryPos,
    slugifyEntryHeadword,
} from '../src/lib/entryId.ts';

const run = () => {
    assert.strictEqual(normalizeEntryPos('v'), 'verb', 'verb alias should normalize');
    assert.strictEqual(normalizeEntryPos('det'), 'article', 'article alias should normalize');
    assert.strictEqual(normalizeEntryPos('verbal noun'), 'verbal_noun', 'verbal noun alias should normalize');

    assert.strictEqual(getEntryIdPrefix('noun'), 'n', 'noun prefix should use the new canonical n- form');
    assert.strictEqual(getEntryIdPrefix('participle', 'active'), 'ap', 'active participles should use ap prefix');
    assert.strictEqual(getEntryIdPrefix('participle', 'passive'), 'pp', 'passive participles should use pp prefix');
    assert.strictEqual(getEntryIdPrefix('verbal_noun'), 'vn', 'verbal noun should use vn prefix');
    assert.strictEqual(getEntryIdPrefix('verb'), 'v', 'verb prefix should use the new canonical v- form');

    assert.strictEqual(normalizeEntryId('n-karta'), 'n-karta', 'noun ids should stay in the new canonical form');
    assert.strictEqual(normalizeEntryId('v-fagħal'), 'v-fagħal', 'verb ids should stay in the new canonical form');
    assert.strictEqual(normalizeEntryId('noun'), 'n', 'bare noun ids should normalize to n');
    assert.strictEqual(normalizeEntryId('verb'), 'v', 'bare verb ids should normalize to v');
    assert.strictEqual(normalizeEntryId('noun-karta'), 'n-karta', 'legacy noun ids should normalize to n-');
    assert.strictEqual(normalizeEntryId('verb-fagħal'), 'v-fagħal', 'legacy verb ids should normalize to v-');
    assert.deepStrictEqual(getEntryIdVariants('n-karta'), ['n-karta', 'noun-karta'], 'noun ids should match both canonical and legacy alias variants');
    assert.deepStrictEqual(getEntryIdVariants('v-fagħal'), ['v-fagħal', 'verb-fagħal'], 'verb ids should match both canonical and legacy alias variants');
    assert.deepStrictEqual(getEntryIdFamily('n-karta'), { exact: ['n-karta', 'noun-karta'], likePatterns: ['n-karta-%', 'noun-karta-%'] }, 'noun ids should expose both exact and suffix collision families');
    assert.deepStrictEqual(getEntryIdFamily('v-fagħal'), { exact: ['v-fagħal', 'verb-fagħal'], likePatterns: ['v-fagħal-%', 'verb-fagħal-%'] }, 'verb ids should expose both exact and suffix collision families');

    assert.strictEqual(slugifyEntryHeadword("Ċaħda tal-lum!"), 'ċaħda-tal-lum', 'headword slug should preserve Maltese letters');
    assert.strictEqual(slugifyEntryHeadword('  Hello, world  '), 'hello-world', 'headword slug should trim and strip punctuation');

    assert.strictEqual(
        buildSuggestedEntryId({ headword: 'Kanta', pos: 'verb' }),
        'v-kanta',
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
