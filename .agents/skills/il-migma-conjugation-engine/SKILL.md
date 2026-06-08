---
name: il-migma-conjugation-engine
description: Use when editing Il-Migma Maltese verb morphology or src/lib/conjugationEngine.ts, especially weak defective, assimilative, hollow, geminated, stem-hybrid, Form I, Form VII, or root-preview behavior.
---

# Il-Migma Conjugation Engine

Use this skill for changes to `src/lib/conjugationEngine.ts`, `src/lib/verbMorphology.ts`, zokk/stem verb generation, or entry/root verb previews.

## Workflow

- Start with a focused failing assertion in `scripts/verbMorphology.test.mjs`, `scripts/engineVerbFixtures.test.mjs`, or `scripts/entryFormModalVerbPreview.test.mjs`.
- Prefer small pure helpers for morphology profiles, then route the specific form/strength/weak-class branch through the helper.
- Keep entry-level overrides distinct from root-level metadata. Entry headwords can disambiguate surfaces; root previews should only emit true root-level Form I surfaces.
- Verify direct engine output and preview output when the change affects both `generateConjugation()` and `generateRootForms()`.
- Run the narrow tests before build:
  - `npm run test:verb-morphology`
  - `npm run test:engine-verb-fixtures`
  - `npm run test:entry-form-verb-preview`
  - `npm run build`

## Engine Guardrails

- For Form I weak defective, preserve `nesa`: `ninsa/ninsew`, `nsejt/nesa/nsiet/nsew`, `insa/insew`.
- Treat `xela`, `xewa`, `uza`/`uża`, `wera`, and `ghala`/`għala` as true Form I defective profiles when supported by the entry or root.
- Do not model `xtara`, `xteha`, or `xtewa` as Form I. They belong outside the Form I defective upgrade path.
- For roots with multiple possible surfaces, use `headword` or `citationForm` only in entry generation. Do not make root preview guess unrelated Form I entries.
- For final weak forms, test no-clitic negatives through `buildVerbForm()` and `buildPerfectForm()`, not only positive rows.
- When imala blocking is entry-specific, prefer `verb_morphology.is_imala_blocked` over root metadata for generation input.

## Known Form I Defective Fixtures

- `nesa`: imperfect `ninsa, tinsa, jinsa, tinsa, ninsew, tinsew, jinsew`; perfect `nsejt, nsejt, nesa, nsiet, nsejna, nsejtu, nsew`; imperative `insa, insew`.
- `xela`: imperfect `nixli, tixli, jixli, tixli, nixlu, tixlu, jixlu`; perfect `xlejt, xlejt, xela, xliet, xlejna, xlejtu, xlew`; imperative `ixli, ixlu`.
- `xewa`: imperfect `nixwi, tixwi, jixwi, tixwi, nixwu, tixwu, jixwu`; perfect `xwejt, xwejt, xewa, xwiet, xwejna, xwejtu, xwew`; imperative `ixwi, ixwu`.
- `uża`: imperfect `nuża, tuża, juża, tuża, nużaw, tużaw, jużaw`; perfect `użajt, użajt, uża, użat, użajna, użajtu, użaw`; imperative `uża, użaw`.
- `wera`: imperfect `nuri, turi, juri, turi, nuru, turu, juru`; perfect `wrejt, wrejt, wera, wriet, wrejna, wrejtu, wrew`; imperative `uri, uru`.
- `għala`: imperfect `nagħli, tagħli, jagħli, tagħli, nagħlu, tagħlu, jagħlu`; perfect `għalejt, għalejt, għala, għaliet, għalejna, għalejtu, għalew`; imperative `agħli, agħlu`.
