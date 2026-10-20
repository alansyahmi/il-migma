import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTerm, resolveTermByEnglish } from '../src/lib/terminology.ts';
import { formatEtymologySentenceLeadIn, formatEtymologyConnector } from '../src/components/dictionary/etymology.ts';

test('resolveTerm: English language normalization and capitalization', () => {
    assert.equal(resolveTerm('Classical Arabic', 'standard', 'en'), 'Classical Arabic');
    assert.equal(resolveTerm('classical arabic', 'standard', 'en'), 'Classical Arabic');
    assert.equal(resolveTerm('classical-arabic', 'standard', 'en'), 'Classical Arabic');
    assert.equal(resolveTerm('Maghrebi Arabic', 'standard', 'en'), 'Maghrebi Arabic');
    assert.equal(resolveTerm('Siculo-Arabic', 'standard', 'en'), 'Siculo-Arabic');
    assert.equal(resolveTerm('Ancient Greek', 'standard', 'en'), 'Ancient Greek');
    assert.equal(resolveTerm('Late Latin', 'standard', 'en'), 'Late Latin');
    assert.equal(resolveTerm('Vulgar Latin', 'standard', 'en'), 'Vulgar Latin');
    assert.equal(resolveTerm('Old French', 'standard', 'en'), 'Old French');
    assert.equal(resolveTerm('Hebrew', 'standard', 'en'), 'Hebrew');
    assert.equal(resolveTerm('Persian', 'standard', 'en'), 'Persian');
});

test('resolveTerm: Maltese localization for languages and varieties', () => {
    assert.equal(resolveTerm('Arabic', 'standard', 'mt'), 'Għarbi');
    assert.equal(resolveTerm('Classical Arabic', 'standard', 'mt'), 'Għarbi Klassiku');
    assert.equal(resolveTerm('classical arabic', 'standard', 'mt'), 'Għarbi Klassiku');
    assert.equal(resolveTerm('Maghrebi Arabic', 'standard', 'mt'), 'Għarbi Magrebi');
    assert.equal(resolveTerm('Siculo-Arabic', 'standard', 'mt'), 'Għarbi Sqalli');
    assert.equal(resolveTerm('Ancient Greek', 'standard', 'mt'), 'Grieg Antik');
    assert.equal(resolveTerm('Late Latin', 'standard', 'mt'), 'Latin Tardiv');
    assert.equal(resolveTerm('Vulgar Latin', 'standard', 'mt'), 'Latin Volgari');
    assert.equal(resolveTerm('Old French', 'standard', 'mt'), 'Franċiż Qadim');
    assert.equal(resolveTerm('Hebrew', 'standard', 'mt'), 'Ebrajk');
    assert.equal(resolveTerm('Persian', 'standard', 'mt'), 'Persjan');
    assert.equal(resolveTerm('Persian', 'arabised', 'mt'), 'Farsi');
});

test('resolveTerm: Preserves unknown term casing without lowercasing', () => {
    assert.equal(resolveTerm('CustomUnlistedLanguage', 'standard', 'en'), 'CustomUnlistedLanguage');
});

test('resolveTerm: Etymology relationships in Maltese and English', () => {
    assert.equal(resolveTerm('Inherited from', 'standard', 'en'), 'Inherited from');
    assert.equal(resolveTerm('Inherited from', 'standard', 'mt'), 'Imnissel minn');
    assert.equal(resolveTerm('Borrowed from', 'standard', 'mt'), 'Misluf minn');
    assert.equal(resolveTerm('Derived from', 'standard', 'mt'), 'Derivat minn');
});

test('formatEtymologySentenceLeadIn: Handles localized prefix and relationships', () => {
    const termEn = (k) => resolveTerm(k, 'standard', 'en');
    const termMt = (k) => resolveTerm(k, 'standard', 'mt');

    assert.equal(formatEtymologySentenceLeadIn('From', 'Inherited from', termEn), 'Inherited from');
    assert.equal(formatEtymologySentenceLeadIn('Minn', 'Inherited from', termMt), 'Imnissel minn');
    assert.equal(formatEtymologySentenceLeadIn('Minn', 'Borrowed from', termMt), 'Misluf minn');
});

test('formatEtymologyConnector: Translates conjunctive connectors', () => {
    const termMt = (k) => resolveTerm(k, 'standard', 'mt');
    assert.equal(formatEtymologyConnector('and', termMt), 'u');
    assert.equal(formatEtymologyConnector('or', termMt), 'jew');
});

test('resolveTerm: usage-examples localization', () => {
    assert.equal(resolveTerm('usage-examples', 'standard', 'en'), 'Usage Examples');
    assert.equal(resolveTerm('usage-examples', 'standard', 'mt'), 'Eżempji tal-Użu');
    assert.equal(resolveTerm('usage-examples', 'arabised', 'mt'), 'Xbihat tal-Użu');
});

test('resolveTerm: variant and alternative form types localization', () => {
    assert.equal(resolveTerm('variant', 'standard', 'en'), 'Variant');
    assert.equal(resolveTerm('variant', 'standard', 'mt'), 'Varjant');
    assert.equal(resolveTerm('variant-matched', 'standard', 'en'), 'Variant');
    assert.equal(resolveTerm('variant-matched', 'standard', 'mt'), 'Varjant');
    assert.equal(resolveTerm('orthographic', 'standard', 'en'), 'Orthographic');
    assert.equal(resolveTerm('orthographic', 'standard', 'mt'), 'Ortografika');
    assert.equal(resolveTerm('archaic', 'standard', 'en'), 'Archaic');
    assert.equal(resolveTerm('archaic', 'standard', 'mt'), 'Arkajka');
    assert.equal(resolveTerm('dialectal', 'standard', 'en'), 'Dialectal');
    assert.equal(resolveTerm('dialectal', 'standard', 'mt'), 'Djalettali');
});


