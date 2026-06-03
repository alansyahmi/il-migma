import assert from 'node:assert/strict';
import { deriveMasculineFromFeminine } from '../src/lib/maltesePhonology.ts';

const run = () => {
    console.log('Running adjectiveFeminineMascSync tests...');

    // 1. Basic cases (drop -a)
    assert.equal(deriveMasculineFromFeminine('kbira'), 'kbir');
    assert.equal(deriveMasculineFromFeminine('twila'), 'twil');
    assert.equal(deriveMasculineFromFeminine('sabiħa'), 'sabiħ');

    // 2. Syncopated adjectives (CCC sequence insertion of 'e')
    assert.equal(deriveMasculineFromFeminine('safra'), 'safer');
    assert.equal(deriveMasculineFromFeminine('ħamra'), 'ħamer');

    // 3. -ija ending -> -i
    assert.equal(deriveMasculineFromFeminine('Maltija'), 'malti');
    assert.equal(deriveMasculineFromFeminine('maltija'), 'malti');

    // 4. Empty/null guards
    assert.equal(deriveMasculineFromFeminine(''), null);

    console.log('adjectiveFeminineMascSync tests passed successfully!');
};

run();
