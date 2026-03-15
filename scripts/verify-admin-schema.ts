
import { buildEntryPayload } from '../src/lib/adminSchema.ts';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('Running buildEntryPayload verification tests...');

// 1. Noun with cv_pattern
const nounForm = {
    pos: 'noun',
    headword: 'ktieb',
    cv_pattern: 'CCieC',
    _rootConsonants: 'k-t-b',
    _privateField: 'should be stripped'
};
const nounPayload = buildEntryPayload(nounForm);
assert(nounPayload.cv_pattern === 'CCieC', 'Noun should retain cv_pattern');
assert(nounPayload._rootConsonants === undefined, 'Noun should strip _rootConsonants (as it is in ENTRY_PRIVATE_FIELDS)');
assert(nounPayload.root_consonants === 'k-t-b', 'Noun should map _rootConsonants to root_consonants');
console.log('✅ Noun test passed');

// 2. Adjective with cv_pattern
const adjForm = {
    pos: 'adjective',
    headword: 'kbir',
    cv_pattern: 'CCiC',
    _rootConsonants: 'k-b-r'
};
const adjPayload = buildEntryPayload(adjForm);
assert(adjPayload.cv_pattern === 'CCiC', 'Adjective should retain cv_pattern');
console.log('✅ Adjective test passed');

// 3. Verb with cv_pattern
const verbForm = {
    pos: 'verb',
    headword: 'fagħal',
    cv_pattern: 'CvCvC',
    _rootConsonants: 'f-għ-l'
};
const verbPayload = buildEntryPayload(verbForm);
assert(verbPayload.cv_pattern === 'CvCvC', 'Verb should retain cv_pattern');
console.log('✅ Verb test passed');

// 4. Numeral with cv_pattern
const numForm = {
    pos: 'numeral',
    headword: 'tnejn',
    cv_pattern: 'CCeyC',
    _rootConsonants: 't-n-j'
};
const numPayload = buildEntryPayload(numForm);
assert(numPayload.cv_pattern === 'CCeyC', 'Numeral should retain cv_pattern');
console.log('✅ Numeral test passed');

// 5. Participle with cv_pattern
const ptcpForm = {
    pos: 'participle',
    headword: 'miktub',
    cv_pattern: 'miCCuC',
    _rootConsonants: 'k-t-b'
};
const ptcpPayload = buildEntryPayload(ptcpForm);
assert(ptcpPayload.cv_pattern === 'miCCuC', 'Participle should retain cv_pattern');
console.log('✅ Participle test passed');

// 6. Adverb (not explicitly in POS_FEATURES, should use COMMON_FIELDS)
const advForm = {
    pos: 'adverb',
    headword: 'wisq',
    cv_pattern: 'CvCC',
    _rootConsonants: 'w-s-q'
};
const advPayload = buildEntryPayload(advForm);
assert(advPayload.cv_pattern === 'CvCC', 'Adverb should retain cv_pattern from COMMON_FIELDS');
console.log('✅ Adverb test passed');

// 7. Extra Fields handling
const extraForm = {
    pos: 'noun',
    headword: 'test',
    extraFields: {
        new_backend_field: 'data',
        forbidden_id: 'should-be-blocked',
        id: '999', // explicitly forbidden
        _private: 'should-be-blocked'
    }
};
const extraPayload = buildEntryPayload(extraForm);
assert(extraPayload.new_backend_field === 'data', 'Should passthrough unknown extra fields');
assert(extraPayload.forbidden_id === 'should-be-blocked', 'Unknown fields NOT in FORBIDDEN_FIELDS list should pass');
assert(extraPayload.id !== '999', 'Forbidden keys (like id) in extraFields should NOT overwrite payload.id');
assert(extraPayload._private === undefined, 'Private fields in extraFields should be stripped');
console.log('✅ Extra fields test passed');

console.log('All tests passed successfully!');
