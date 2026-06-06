import assert from 'node:assert/strict';
import { ensureVerbClassFallbackOptions, ensureVerbClassFallbackValues } from '../src/lib/verbClassOptions.ts';

const run = () => {
    const baseValues = ['strong', 'weak', 'doubled', 'quadriliteral', 'loan'];
    const mergedValues = ensureVerbClassFallbackValues(baseValues);
    assert.ok(mergedValues.includes('strong-hybrid'), 'verb class fallback values should include strong-hybrid');

    const mergedOptions = ensureVerbClassFallbackOptions(
        [{ value: 'strong', label: 'Strong' }, { value: 'weak', label: 'Weak' }],
        (value) => value,
    );
    assert.ok(mergedOptions.some((option) => option.value === 'strong-hybrid'), 'verb class options should include strong-hybrid even when the DB list is incomplete');
};

run();
console.log('adminConfig options tests passed');
