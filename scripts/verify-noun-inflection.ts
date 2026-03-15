import { applyPossessiveSuffix } from '../src/lib/nounInflectionEngine.ts';

const testCases = [
    { base: 'ktieb', gender: 'masculine' as const, pattern: 'CCvC' },
    { base: 'tifel', gender: 'masculine' as const, pattern: 'CvCvC' },
    { base: 'zija', gender: 'feminine' as const, pattern: 'CvCa' },
    { base: 'mara', gender: 'feminine' as const, pattern: undefined },
    { base: 'kotba', gender: 'masculine' as const, pattern: 'CvCCa' }, 
    { base: 'ilsna', gender: 'masculine' as const, pattern: 'iCCCa' },
];

const suffixes = [0, 1, 2, 3, 4, 5, 6];

for (const t of testCases) {
    console.log(`\n=== ${t.base} (${t.gender}) ===`);
    const results = suffixes.map(idx => applyPossessiveSuffix(t.base, idx as any, t.gender, t.pattern));
    console.log(results.join(' | '));
}
