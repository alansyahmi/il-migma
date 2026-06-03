import {
    buildExportBundle,
    resolveExportBundleTableNames,
    EXPORT_BUNDLE_PRESETS,
} from '../functions/api/admin/db-tools.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const assertEq = (actual, expected, message) => {
    const same = JSON.stringify(actual) === JSON.stringify(expected);
    if (!same) {
        throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
    }
};

const makeClient = () => {
    const calls = [];
    const client = {
        async execute(sql) {
            const text = typeof sql === 'string' ? sql : sql.sql;
            calls.push(text);

            const selectMatch = text.match(/^SELECT \* FROM ([A-Za-z_][A-Za-z0-9_]*) LIMIT (\d+)$/i);
            if (selectMatch) {
                const table = selectMatch[1];
                return {
                    columns: ['id', 'table_name'],
                    rows: [{ id: `${table}-1`, table_name: table }],
                };
            }

            const countMatch = text.match(/^SELECT COUNT\(\*\) as total FROM ([A-Za-z_][A-Za-z0-9_]*)$/i);
            if (countMatch) {
                const table = countMatch[1];
                const total = table === 'entries' ? 2 : 1;
                return { rows: [{ total }] };
            }

            throw new Error(`Unexpected SQL: ${text}`);
        },
    };

    return { client, calls };
};

const run = async () => {
    const presetTables = EXPORT_BUNDLE_PRESETS['entry-linking'];
    assert(Array.isArray(presetTables) && presetTables.length > 0, 'entry-linking preset should exist');

    const resolved = resolveExportBundleTableNames({ preset: 'entry-linking' });
    assertEq(resolved, presetTables, 'entry-linking preset should resolve in the declared order');

    const deduped = resolveExportBundleTableNames({ tables: ['entries', 'definitions', 'entries'] });
    assertEq(deduped, ['entries', 'definitions'], 'explicit export table lists should dedupe repeated tables');

    const { client, calls } = makeClient();
    const bundle = await buildExportBundle(client, { preset: 'entry-linking', limit: 1 });

    assertEq(bundle.tableOrder, presetTables, 'bundle should preserve preset ordering');
    assert(bundle.tables.entries.truncated === true, 'entries table should be marked truncated when limit is below total');
    assert(bundle.tables.definitions.truncated === false, 'single-row tables should not be marked truncated');
    assert(bundle.totalRows === presetTables.length + 1, 'bundle totalRows should sum table totals');
    assert(bundle.truncatedTables.includes('entries'), 'bundle should track truncated tables');
    assert(calls.length === presetTables.length * 2, 'bundle builder should query each table twice');
};

await run();
console.log('dbToolsExport tests passed');
