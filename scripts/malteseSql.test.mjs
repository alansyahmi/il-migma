import test from 'node:test';
import assert from 'node:assert/strict';
import { malteseLower, malteseLowerSql } from '../functions/lib/malteseSql.js';

test('malteseLower folds ASCII and Maltese non-ASCII uppercase letters consistently', () => {
    assert.equal(malteseLower('Ġimgħa'), 'ġimgħa');
    assert.equal(malteseLower('Ħadd'), 'ħadd');
    assert.equal(malteseLower('Ċawl'), 'ċawl');
    assert.equal(malteseLower('Żmien'), 'żmien');
    assert.equal(malteseLower('ÀÈÌÒÙ'), 'àèìòù');
});

test('malteseLowerSql generates nested REPLACE(..., LOWER(expr)) for all Maltese capitals', () => {
    const sql = malteseLowerSql('e.headword');
    assert.ok(sql.includes('LOWER(e.headword)'), 'should start with LOWER(expr)');
    for (const [upper, lower] of [
        ['Ċ', 'ċ'],
        ['Ġ', 'ġ'],
        ['Ħ', 'ħ'],
        ['Ż', 'ż'],
        ['À', 'à'],
        ['È', 'è'],
        ['Ì', 'ì'],
        ['Ò', 'ò'],
        ['Ù', 'ù'],
    ]) {
        assert.ok(sql.includes(`'${upper}', '${lower}'`), `should map ${upper} -> ${lower}`);
    }
});
