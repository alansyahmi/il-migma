import test from 'node:test';
import assert from 'node:assert/strict';
import {
    compareSortValues,
    sortByAccessor,
    toggleSortState,
} from '../src/lib/adminTableSort.ts';
import {
    readPersistedAdminState,
    readPersistedAdminString,
    writePersistedAdminState,
    writePersistedAdminString,
} from '../src/lib/adminPersistence.ts';

test('toggleSortState flips active key direction and applies defaultDir on new keys', () => {
    const first = toggleSortState(null, 'date', 'desc');
    assert.deepEqual(first, { key: 'date', dir: 'desc' });

    const flipped = toggleSortState(first, 'date', 'desc');
    assert.deepEqual(flipped, { key: 'date', dir: 'asc' });

    const switched = toggleSortState(flipped, 'headword', 'asc');
    assert.deepEqual(switched, { key: 'headword', dir: 'asc' });
});

test('compareSortValues keeps empty values last in both directions', () => {
    assert.equal(compareSortValues('', 'alpha', 'asc'), 1);
    assert.equal(compareSortValues('', 'alpha', 'desc'), 1);
    assert.equal(compareSortValues('alpha', null, 'asc'), -1);
    assert.equal(compareSortValues('alpha', null, 'desc'), -1);
    assert.equal(compareSortValues('', null, 'asc'), 0);
});

test('sortByAccessor sorts strings, numbers, and numeric strings when requested', () => {
    const items = [
        { name: 'b', count: 2, strNum: '10' },
        { name: '', count: 5, strNum: '2' },
        { name: 'a', count: 10, strNum: '1' },
    ];

    const byName = sortByAccessor(items, 'asc', (x) => x.name);
    assert.deepEqual(byName.map((x) => x.name), ['a', 'b', '']);

    const byCountDesc = sortByAccessor(items, 'desc', (x) => x.count);
    assert.deepEqual(byCountDesc.map((x) => x.count), [10, 5, 2]);

    const byStrNum = sortByAccessor(items, 'asc', (x) => x.strNum, undefined, { numericStrings: true });
    assert.deepEqual(byStrNum.map((x) => x.strNum), ['1', '2', '10']);
});

test('adminPersistence reads, sanitizes, and writes localStorage safely', () => {
    const store = new Map();
    const originalWindow = globalThis.window;
    globalThis.window = {
        localStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => { store.set(k, String(v)); },
        },
    };

    try {
        const defaults = { page: 1, viewMode: 'list' };
        assert.deepEqual(readPersistedAdminState('k1', defaults), defaults);

        writePersistedAdminState('k1', { page: 4, viewMode: 'grid' });
        assert.deepEqual(
            readPersistedAdminState('k1', defaults, (raw, d) => ({
                page: typeof raw.page === 'number' && raw.page >= 1 ? raw.page : d.page,
                viewMode: raw.viewMode === 'grid' || raw.viewMode === 'list' ? raw.viewMode : d.viewMode,
            })),
            { page: 4, viewMode: 'grid' },
        );

        store.set('k1', '{invalid-json');
        assert.deepEqual(readPersistedAdminState('k1', defaults), defaults);

        writePersistedAdminString('k2', 'roots');
        assert.equal(
            readPersistedAdminString('k2', 'entries', (v) => v === 'entries' || v === 'roots'),
            'roots',
        );
        assert.equal(
            readPersistedAdminString('k2', 'entries', (v) => v === 'entries'),
            'entries',
        );
    } finally {
        if (originalWindow === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = originalWindow;
        }
    }
});
