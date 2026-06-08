---
name: verbmt-fixture-testing
description: Use when comparing Il-Migma generated Maltese verb tables with VerbMT pages, adding regression fixtures, or validating positive, negative, imperative, and clitic stems from external verb references.
---

# VerbMT Fixture Testing

Use this skill when a user cites VerbMT, screenshots a VerbMT table, or asks to make Il-Migma conjugation output match a Maltese reference table.

## Workflow

- If the user asks to look up VerbMT or provides URLs, verify the reference forms before editing.
- Convert reference tables into direct engine assertions first. Include positives, imperatives, and representative no-clitic negatives.
- Test negatives by calling:
  - `buildVerbForm(row.imperfect, true, null, null, input.vowelSetImperfect, row.stems, table.blocksImala || false, input.form)`
  - `buildPerfectForm(row.perfect, row.perfect_neg ?? row.perfect, true, null, null, input.vowelSetPerfect, row.stems, table.blocksImala || false, input.form)`
- When root previews are affected, add `generateRootForms()` assertions in addition to `generateConjugation()` assertions.
- Prefer table-driven cases with labels, expected imperfect rows, perfect rows, imperative pair, and named negative expectations.

## Fixture Discipline

- Keep fixture changes scoped to the exact form, strength, and weak class under investigation.
- Do not route broad generic branches through a special-case table unless the reference pattern is genuinely shared.
- Use `headword` or `citationForm` in test inputs when the same root can surface as multiple entries.
- Preserve user exclusions explicitly in tests. Example: when true Form I defective includes `xewa`, assert that `xtewa` is not generated as Form I.
- Re-run all affected script tests plus `npm run build` before finishing.

## Common Commands

- `npm run test:verb-morphology`
- `npm run test:engine-verb-fixtures`
- `npm run test:entry-form-verb-preview`
- `npm run build`
