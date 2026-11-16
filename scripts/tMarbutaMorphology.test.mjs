import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInflectionTableSuffix } from '../src/lib/inflectionTable.ts';
import { applyPossessiveSuffix } from '../src/lib/nounInflectionEngine.ts';
import { generateTheoreticalDual } from '../src/lib/maltesePhonology.ts';

const SUFFIXES = [0, 1, 2, 3, 4, 5, 6];
const possessives = (base, gender, pattern, ipa) =>
    SUFFIXES.map((idx) => applyInflectionTableSuffix(base, idx, gender, pattern, undefined, ipa));

test('t-marbuta duals generate -tejn forms for feminine and common -a nouns', () => {
    assert.equal(generateTheoreticalDual('Ġimgħa', 'Ġimgħat', '/ˈd͡ʒɪ.mɐː/', '1v23a', null, 'feminine'), 'Ġimagħtejn');
    assert.equal(generateTheoreticalDual('ġimgħa', 'ġimgħat', '/ˈd͡ʒɪ.mɐː/', '1v23a', null, 'feminine'), 'ġimagħtejn');
    assert.equal(generateTheoreticalDual('fergħa', 'friegħi', '/ˈfɛr.ɐː/', 'CvCCa', null, 'feminine'), 'feragħtejn');
    assert.equal(generateTheoreticalDual('xemgħa', 'xemgħat', '/ˈʃɛm.ɐː/', 'CvCCa', null, 'feminine'), 'xemagħtejn');
    assert.equal(generateTheoreticalDual('darba', 'darbiet', '/ˈdɐr.bɐ/', 'CvCCa', null, 'feminine'), 'darbtejn');
    assert.equal(generateTheoreticalDual('kelma', 'kliem', '/ˈkɛl.mɐ/', 'CvCCa', null, 'feminine'), 'kelmtejn');
    assert.equal(generateTheoreticalDual('sena', 'snin', '/ˈsɛ.nɐ/', 'CvCa', null, 'feminine'), 'sentejn');
    assert.equal(generateTheoreticalDual('familja', 'familji', '/fɐˈmɪl.jɐ/', '-a', null, 'feminine'), 'familtejn');
    assert.equal(generateTheoreticalDual('tarbija', 'trabi', '/tɐrˈbiː.jɐ/', 'CvCCvCa', null, 'common'), 'tarbitejn');
    assert.equal(generateTheoreticalDual('wiżna', 'wiżniet', '/ˈwɪz.nɐ/', '1v23a', null, 'feminine'), 'wiżintejn');
    assert.equal(generateTheoreticalDual('widna', 'widnejn', '/ˈwɪd.nɐ/', 'wi23a', null, 'feminine'), 'widintejn');
    assert.equal(generateTheoreticalDual('qoxra', 'qxur', '/ˈʔɔʃ.rɐ/', '1v23a', null, 'feminine'), 'qoxortejn');
    assert.equal(generateTheoreticalDual('festa', 'festi', '/ˈfɛs.tɐ/', '-a', null, 'feminine'), 'festtejn');
    assert.equal(generateTheoreticalDual('dar', 'djar', '/dɐːr/', 'CvC', null, 'feminine'), 'darejn');
});

test('t-marbuta R-licensing anaptyxis splits obstruent+sonorant clusters only on vowel possessives and duals', () => {
    assert.deepEqual(
        possessives('widna', 'feminine', 'wi23a', '/ˈwɪd.nɐ/'),
        ['widinti', 'widintek', 'widintu', 'widnitha', 'widnitna', 'widnitkom', 'widnithom'],
    );
    assert.deepEqual(
        possessives('wiżna', 'feminine', '1v23a', '/ˈwɪz.nɐ/'),
        ['wiżinti', 'wiżintek', 'wiżintu', 'wiżnitha', 'wiżnitna', 'wiżnitkom', 'wiżnithom'],
    );
    assert.deepEqual(
        possessives('qoxra', 'feminine', '1v23a', '/ˈʔɔʃ.rɐ/'),
        ['qoxorti', 'qoxortek', 'qoxortu', 'qoxritha', 'qoxritna', 'qoxritkom', 'qoxrithom'],
    );

    // Non-triggering clusters: silent h (fehma), l+m (kelma), obstruent+obstruent (qabda), geminate+r (ċattra)
    assert.deepEqual(
        possessives('fehma', 'feminine', '1v23a'),
        ['fehmti', 'fehmtek', 'fehmtu', 'fehmitha', 'fehmitna', 'fehmitkom', 'fehmithom'],
    );
    assert.deepEqual(
        possessives('kelma', 'feminine', '1v23a'),
        ['kelmti', 'kelmtek', 'kelmtu', 'kelmitha', 'kelmitna', 'kelmitkom', 'kelmithom'],
    );
    assert.deepEqual(
        possessives('qabda', 'feminine', '1v23a'),
        ['qabdti', 'qabdtek', 'qabdtu', 'qabditha', 'qabditna', 'qabditkom', 'qabdithom'],
    );
});

test('t-marbuta epenthetic -it- applies only to consonant clusters and -ta stems, while -Cgħa uses -agħt-', () => {
    // Consonant + għ before -a epenthesizes -a- before għ (ġimagħt-), resolving the cluster across all possessives
    assert.deepEqual(
        possessives('ġimgħa', 'feminine', '1v23a', '/ˈd͡ʒɪ.mɐː/'),
        ['ġimagħti', 'ġimagħtek', 'ġimagħtu', 'ġimagħtha', 'ġimagħtna', 'ġimagħtkom', 'ġimagħthom'],
    );
    assert.deepEqual(
        possessives('fergħa', 'feminine', 'CvCCa', '/ˈfɛr.ɐː/'),
        ['feragħti', 'feragħtek', 'feragħtu', 'feragħtha', 'feragħtna', 'feragħtkom', 'feragħthom'],
    );

    // Cluster stems without final għ insert -it- before consonant suffixes
    assert.deepEqual(
        possessives('darba', 'feminine', 'CvCCa', '/ˈdɐr.bɐ/'),
        ['darbti', 'darbtek', 'darbtu', 'darbitha', 'darbitna', 'darbitkom', 'darbithom'],
    );

    // Single consonant VCt stems keep -t- without epenthetic -i-
    assert.deepEqual(
        possessives('sena', 'feminine', 'CvCa', '/ˈsɛ.nɐ/'),
        ['senti', 'sentek', 'sentu', 'sentha', 'sentna', 'sentkom', 'senthom'],
    );
    assert.deepEqual(
        possessives('ħabiba', 'feminine', 'CvCvCa', '/ħɐˈbiː.bɐ/'),
        ['ħabibti', 'ħabibtek', 'ħabibtu', 'ħabibtha', 'ħabibtna', 'ħabibtkom', 'ħabibthom'],
    );
    assert.deepEqual(
        possessives('skola', 'feminine', '-a', '/ˈskɔː.lɐ/'),
        ['skolti', 'skoltek', 'skoltu', 'skoltha', 'skoltna', 'skoltkom', 'skolthom'],
    );
    assert.deepEqual(
        possessives('familja', 'feminine', '-a', '/fɐˈmɪl.jɐ/'),
        ['familti', 'familtek', 'familtu', 'familtha', 'familtna', 'familtkom', 'familthom'],
    );

    // Vocalic -ija stems (feminine & common) attach -t- directly without doubling i
    assert.deepEqual(
        possessives('tarbija', 'common', 'CvCCvCa', '/tɐrˈbiː.jɐ/'),
        ['tarbiti', 'tarbitek', 'tarbitu', 'tarbitha', 'tarbitna', 'tarbitkom', 'tarbithom'],
    );
    assert.deepEqual(
        possessives('tarbija', 'common', 'CvCCvCa'),
        ['tarbiti', 'tarbitek', 'tarbitu', 'tarbitha', 'tarbitna', 'tarbitkom', 'tarbithom'],
    );
});

test('t-marbuta preserves doubled -tt- on -ta stems and preserves w/j radicals outside -ija/-lja', () => {
    assert.deepEqual(
        possessives('festa', 'feminine', '-a', '/ˈfɛs.tɐ/'),
        ['festti', 'festtek', 'festtu', 'festitha', 'festitna', 'festitkom', 'festithom'],
    );
    assert.deepEqual(
        possessives('minuta', 'feminine', '-a', '/mɪˈnuː.tɐ/'),
        ['minutti', 'minuttek', 'minuttu', 'minutitha', 'minutitna', 'minutitkom', 'minutithom'],
    );
    assert.deepEqual(
        possessives('ġurnata', 'feminine', '-a', '/d͡ʒʊrˈnɐː.tɐ/'),
        ['ġurnatti', 'ġurnattek', 'ġurnattu', 'ġurnatitha', 'ġurnatitna', 'ġurnatitkom', 'ġurnatithom'],
    );

    // Preserve w radical in CCwa (għodwa) and j in -ajja (ħajja)
    assert.deepEqual(
        possessives('għodwa', 'feminine', 'CvCCa', '/ˈɐw.dwɐ/'),
        ['għodwti', 'għodwtek', 'għodwtu', 'għodwitha', 'għodwitna', 'għodwitkom', 'għodwithom'],
    );

    // Preserve ie before silent għ in -iegħa stems (siegħa -> siegħt-)
    assert.deepEqual(
        possessives('siegħa', 'feminine', '1â3a', '/ˈsɪː.jɐ/'),
        ['siegħti', 'siegħtek', 'siegħtu', 'siegħtha', 'siegħtna', 'siegħtkom', 'siegħthom'],
    );
    assert.deepEqual(
        SUFFIXES.map((idx) => applyPossessiveSuffix('ħajja', idx, 'feminine', 'CvCCa')),
        ['ħajti', 'ħajtek', 'ħajtu', 'ħajtha', 'ħajtna', 'ħajtkom', 'ħajthom'],
    );
});
