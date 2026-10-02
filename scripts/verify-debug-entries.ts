/**
 * scripts/verify-debug-entries.ts
 *
 * Verifies that debug entries, roots, stems, and API search/lookup functions
 * behave properly without requiring a database connection.
 */

import {
    DEBUG_ENTRIES,
    DEBUG_ROOTS,
    DEBUG_STEMS,
    getDebugEntry,
    getDebugRoot,
    getDebugStem,
    searchDebugEntries,
} from '../src/data/debugEntries';
import {
    apiGetEntry,
    apiGetRoot,
    apiSearch,
    apiGetHomeSummary,
    adminGetStem,
} from '../src/lib/api';

async function main() {
    console.log('=== VERIFYING DEBUG ENTRIES ===\n');

    console.log(`Total Debug Entries: ${DEBUG_ENTRIES.length}`);
    console.log(`Total Debug Roots: ${DEBUG_ROOTS.length}`);
    console.log(`Total Debug Stems: ${DEBUG_STEMS.length}`);

    // Check specific required verb entries
    const verbs = [
        'v-faghal',
        'v-faghghal',
        'v-fieghal',
        'v-tfaghghal',
        'v-tfieghal',
        'v-nfaghal',
        'v-ftaghal',
        'v-fghiel',
        'v-stafghal',
        'v-agixxa',
    ];
    for (const vId of verbs) {
        const res = await apiGetEntry(vId);
        if (!res?.entry) {
            throw new Error(`Missing verb entry: ${vId}`);
        }
        console.log(`✓ Verb: ${res.entry.id} -> ${res.entry.headword} (${res.entry.pos})`);
    }

    // Check active participles
    const activeParticiples = ['part-fieghel', 'part-faghghiel', 'part-faghiel'];
    for (const apId of activeParticiples) {
        const res = await apiGetEntry(apId);
        if (!res?.entry) {
            throw new Error(`Missing active participle: ${apId}`);
        }
        console.log(`✓ Active Participle: ${res.entry.id} -> ${res.entry.headword}, fem: ${res.entry.form_fem}, pl: ${res.entry.form_plural_pattern}`);
    }

    // Check passive participles
    const passiveParticiples = [
        'adj-mifghul',
        'adj-mfaghghal',
        'adj-mfieghal',
        'adj-mitfaghghal',
        'adj-mitfieghal',
        'adj-minfaghal',
        'adj-miftaghal',
        'adj-mufghiel',
        'adj-mistafghal',
    ];
    for (const ppId of passiveParticiples) {
        const res = await apiGetEntry(ppId);
        if (!res?.entry) {
            throw new Error(`Missing passive participle: ${ppId}`);
        }
        console.log(`✓ Passive Participle: ${res.entry.id} -> ${res.entry.headword}, fem: ${res.entry.form_fem}, pl: ${res.entry.form_plural_pattern}`);
    }

    // Check Verbal Nouns (Msoodir)
    const verbalNouns = [
        'n-faghl',
        'n-feghl',
        'n-foghol',
        'n-fghiel-masdar',
        'n-fghul',
        'n-fghil',
        'n-tafghil',
        'n-fieghil',
        'n-tfaghghil',
        'n-tfieghil',
        'n-nfighil',
        'n-ftaghil',
        'n-stafghil',
        'n-stafaghghil',
    ];
    for (const vnId of verbalNouns) {
        const res = await apiGetEntry(vnId);
        if (!res?.entry) {
            throw new Error(`Missing verbal noun: ${vnId}`);
        }
        console.log(`✓ Verbal Noun: ${res.entry.id} -> ${res.entry.headword}, singulative: ${res.entry.form_fem}`);
    }

    // Check Nom Mimmat (broken plurals only)
    const nomiMimmati = ['n-mifghel', 'n-mafghal', 'n-mufghiel', 'n-mifighla'];
    for (const nmId of nomiMimmati) {
        const res = await apiGetEntry(nmId);
        if (!res?.entry) {
            throw new Error(`Missing nom mimmat: ${nmId}`);
        }
        console.log(`✓ Nom Mimmat (broken-only): ${res.entry.id} -> ${res.entry.headword}, plural: ${res.entry.noun_morphology?.plural_forms?.join(', ')}`);
    }

    // Check Romance derivatives
    const romance = ['n-agir', 'n-azzjoni', 'n-agenta', 'adj-agili', 'adj-agitat', 'n-agitazzjoni'];
    for (const rId of romance) {
        const res = await apiGetEntry(rId);
        if (!res?.entry) {
            throw new Error(`Missing romance entry: ${rId}`);
        }
        console.log(`✓ Romance Derivative: ${res.entry.id} -> ${res.entry.headword}`);
    }

    // Check search queries
    const searchQueries = [
        'faghal',
        'faghghal',
        'faghghiel',
        'fieghel',
        'agixxa',
        'mifghul',
        'mitfaghghal',
        'mufghiel',
        'f-gh-l',
        'agir',
        'agili',
        'azzjoni',
    ];
    for (const q of searchQueries) {
        const res = await apiSearch(q);
        console.log(`✓ Search "${q}" -> found ${res.total} result(s)`);
        if (res.total === 0) {
            throw new Error(`Search for "${q}" unexpectedly returned 0 results!`);
        }
    }

    // Check Root lookup
    const rootRes = await apiGetRoot('root-f-gh-l');
    console.log(`✓ Root lookup "root-f-gh-l" -> ${rootRes.root?.consonants}`);

    // Check Stem lookup
    const stemRes = await adminGetStem('', 'stem-agi');
    console.log(`✓ Stem lookup "stem-agi" -> ${stemRes.stem?.stem_string}`);

    // Check Home summary fallback
    const homeSummary = await apiGetHomeSummary();
    console.log(`✓ Home summary counts -> total: ${homeSummary.counts.total}, semitic: ${homeSummary.counts.semitic}, romance: ${homeSummary.counts.romance}`);

    console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

main().catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
});
