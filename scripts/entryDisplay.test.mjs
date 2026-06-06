import assert from 'node:assert/strict';
import {
    getEntryAdjectiveMorphology,
    isFunctionWordEntryPos,
    resolveEntryViewKind,
} from '../src/lib/entryDisplay.ts';

assert.equal(
    resolveEntryViewKind({ pos: 'adjective', adjective_morphology: { gender: 'masculine' } }),
    'adjective',
    'adjectives should use adjective_morphology'
);

assert.equal(
    resolveEntryViewKind({ pos: 'v', verb_morphology: { form: 'II', class: 'strong' } }),
    'verb',
    'verb POS aliases should route to the verb view when morphology is present'
);

const adjAliasMorphology = { gender: 'feminine' };
const adjAliasEntry = { pos: 'adjective', adj_morphology: adjAliasMorphology };
assert.equal(
    resolveEntryViewKind(adjAliasEntry),
    'adjective',
    'adjectives should use adj_morphology when adjective_morphology is absent'
);
assert.equal(
    getEntryAdjectiveMorphology(adjAliasEntry),
    adjAliasMorphology,
    'adjective morphology alias should be returned as the display source'
);

assert.equal(
    resolveEntryViewKind({
        pos: 'participle',
        adjective_morphology: { gender: 'masculine' },
        participle_morphology: { participle_type: 'active', gender: 'masculine' },
    }),
    'participle',
    'participle POS should route to the participle view'
);

assert.equal(
    resolveEntryViewKind({
        pos: 'adjective',
        adjective_morphology: { gender: 'masculine' },
        participle_morphology: { participle_type: 'active', gender: 'masculine' },
    }),
    'adjective',
    'adjective entries with participle fields should stay adjective entries'
);

assert.equal(
    resolveEntryViewKind({
        pos: 'noun',
        noun_morphology: { gender: 'masculine' },
        participle_morphology: { participle_type: 'passive', gender: 'masculine' },
    }),
    'noun',
    'noun entries with participle fields should stay noun entries'
);

for (const pos of ['pronoun', 'particle', 'adverb', 'preposition', 'interjection', 'article', 'conjunction', 'interrogative', 'suffix']) {
    assert.equal(isFunctionWordEntryPos(pos), true, `${pos} should be a function-word display POS`);
    assert.equal(resolveEntryViewKind({ pos }), 'function-word', `${pos} should route to the function-word view`);
}

assert.equal(
    resolveEntryViewKind({
        pos: 'stem',
        zokk_morphology: { stem_string: 'serv', class_type: 'ir', is_hybrid: true, root: 's-r-v' },
    }),
    'zokk',
    'zokk-only entries should route to the zokk view'
);

assert.equal(
    resolveEntryViewKind({
        pos: 'verb',
        zokk_morphology: { stem: 'serv', zokk_class: 'ir', zokk_is_hybrid: true, root_consonants: 's-r-v-j' },
    }),
    'zokk',
    'Romance verb entries without Semitic verb morphology should route to the zokk view'
);

console.log('entryDisplay tests passed');
