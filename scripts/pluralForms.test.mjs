import assert from 'node:assert/strict';
import { normalizePluralFormRows, pluralRowsToLegacyForms, pluralRowsToLegacyPatternString } from '../src/lib/pluralForms.ts';
import { entryToForm, formToPayload } from '../src/lib/entryAdapter.ts';

const run = () => {
    const rows = normalizePluralFormRows(['kotba', 'ktejjeb'], 'CaCCa, -iet');
    assert.strictEqual(rows.length, 2, 'should keep one row per plural');
    assert.deepStrictEqual(rows[0], { form: 'kotba', pattern: 'CaCCa' }, 'first plural row should keep its pattern');
    assert.deepStrictEqual(rows[1], { form: 'ktejjeb', pattern: '-iet' }, 'second plural row should keep its pattern');
    assert.strictEqual(pluralRowsToLegacyForms(rows).join(', '), 'kotba, ktejjeb', 'legacy plural string should stay ordered');
    assert.strictEqual(pluralRowsToLegacyPatternString(rows), 'CaCCa, -iet', 'legacy pattern string should stay ordered');

    const form = entryToForm({
        id: 'entry-1',
        headword: 'ktieb',
        pos: 'noun',
        inflections_pl: JSON.stringify(['kotba', 'ktejjeb']),
        form_plural_pattern: 'CaCCa, -iet',
    });

    assert.strictEqual(form.plural_forms.length, 2, 'entryToForm should hydrate plural rows');
    assert.deepStrictEqual(form.plural_forms[0], { form: 'kotba', pattern: 'CaCCa' }, 'first plural row should hydrate cleanly');
    assert.deepStrictEqual(form.plural_forms[1], { form: 'ktejjeb', pattern: '-iet' }, 'second plural row should hydrate cleanly');
    assert.strictEqual(form.inflections_pl, 'kotba, ktejjeb', 'entryToForm should keep the summary string in sync');

    const payload = formToPayload({
        ...form,
        plural_forms: [
            { form: 'kotba', pattern: 'CaCCa' },
            { form: 'ktejjeb', pattern: '-iet' },
        ],
    });

    assert.deepStrictEqual(payload.inflections_pl, ['kotba', 'ktejjeb'], 'payload should persist plural forms as an ordered array');
    assert.strictEqual(payload.form_plural_pattern, 'CaCCa, -iet', 'payload should persist plural patterns as an ordered string');
};

run();
console.log('pluralForms tests passed');
