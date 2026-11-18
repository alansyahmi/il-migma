---
name: il-migma-batch-expansion
description: Use after auditing a DONE_<category>.json batch to fill out all Wiktionary- or verb.mt-attested verbal nouns, participles, derived verbs, and Romance stem derivatives on the batch's roots and stems without assigning frequency ranks.
---

# Il-Miġma Batch Expansion Skill

Use this skill after auditing a `docs/1000-words-categories/DONE_<category>.json` batch whenever expanding the batch to cover all attested root and stem derivatives.

## 1. Workflow Order

1. **Discover Existing DB Coverage**:
   - Query Turso (`entries` joined with `verb_morphology`) for all existing rows sharing the audited batch's `root_consonants` and `stem` values so you reuse existing entry IDs (`v-*`, `n-*`, `participle-*`) and identify unaudited entries.
2. **Strict Attestation Firewall**:
   - Verify every candidate derivative against **Wiktionary** (`en.wiktionary.org`) or **VerbMT** (`verb.mt`).
   - Never fabricate unattested theoretical forms (e.g., do not invent unattested active participles or nominalizations). If a base verb's `active_participle` or `verbal_noun` is unattested, keep it `null`.
3. **Phase A — Base Nominal & Participial Derivatives First**:
   - Append attested verbal nouns (`pos: "noun"`) and active/passive participles (`pos: "participle"`) of the audited base verbs first.
4. **Phase B — Derived Verbs & Their Derivatives Next**:
   - Append attested derived Semitic verbs (Forms II–X) and derived/passive Romance stem verbs, followed immediately by their attested verbal nouns (`pos: "noun"`) and participles (`pos: "participle"`).

## 2. Schema & Storage Rules

- **Paced Batching (10 Entries Max per Pass)**: Expand and audit in thorough batches of **10 entries** at a time so every definition, pattern, and note gets full lexicographical review.
- **In-Place Append**: Append expanded entries directly to the same `docs/1000-words-categories/DONE_<category>.json` file and update `total_entries`.
- **No Frequency Rank**: **Do not** assign `rank` or `source_frequency_rank` on appended derived entries.
- **Canonical Entry IDs**: Reuse existing Turso IDs where already present (for example `n-mgħoddi`); otherwise follow `src/lib/entryId.ts` (`v-<slug>`, `n-<slug>`, `participle-<slug>`, preserving Maltese letters `ċ`, `ġ`, `ħ`, `ż`, `għ` and stripping `'`).
- **POS Morphology Objects**:
  - `verb`: populate `verb_morphology` (`form`, `class`, `weak_class`, `transitivity`, `perfective_3sgm`, `imperfective_3sgm`, `verbal_noun`, `active_participle`, `passive_participle`, `vowel_set_perf`, `vowel_set_impf`, `vowel_set_impv`).
  - `noun`: populate `noun_morphology` (`gender`, `noun_type`, `singular_form`, `plural_forms`). Respect DB `gender` CHECK constraint (`masculine`, `feminine`, `neutral`, or `null`).
  - `participle`: populate `participle_morphology` (`type`, `gender`, `verbal_form`, `is_inflectable`, `form_masc_pattern`, `form_fem_pattern`, `form_plural_pattern`).
- **Relationships**: Link every derivative back to its parent verb in `related_entries` using `{ "target_entry_id": "<parent-id>", "relationship_type": "related" }`.
- **Lexicography, Notes & Pattern Standards**: Follow `il-migma-lexicography`:
  - **Non-Tautological, Concrete Maltese Definitions (`text_mt`)**: Never use the headword, its inflected forms, or its direct base verb to define it (e.g., never define `mxija` with `jimxi`, `twassil` with `twassal`, or `segwit` with `segwit`). Write natural, specific *Miklem*-grade genus-differentia Maltese definitions.
  - **No Boilerplate `usage_notes`**: Set `usage_notes: null` by default. Only populate `usage_notes` when there is a genuine grammatical rule, syntactic construction, phonological alternation, or notable idiomatic usage (such as `is-sena d-dieħla` or `bil-mixi`) — never restate the POS, Form number, or parent lemma.
  - **Zero `/` & Zero `;`**: Zero `/` in all text fields (`text_en`, `text_mt`, `notes`, `nuance`, `etymology_notes`); zero `;` in `definitions`.
  - **Pattern Rules (`'` = `għ` = `3`)**: Use `v` where a slot supports more than one vowel (`1v2v3`, `1v22v3`, `m1v22v3`), preserve fixed/elongated vowels (`â`, `ie`, `î`, `û`), and count final apostrophe `'` from etymological `għ` as radical `3`/`C3` (for example `mwaqqa'` → `m1v22v3` / `mC1vC2C2vC3`).
  - Semitic entries keep `stem: null`; Romance loanwords use hyphenated `-base-` stems with `root_consonants: null` and `is_loanword: 1`.
  - Verify every Arabic `etymology_chain` pronunciation with `generateForeignScriptPronunciation({ language: 'Arabic', term })`.
  - Use only controlled `register` keys (`standard`, `restricted`, etc.) and `!irregular` / `!Hamzated` / `!rgħajn` tags only where justified.

## 3. Verification Gate

Before pushing any expanded batch to Turso:
1. Validate JSON integrity, `total_entries === entries.length`, unique `id`s, zero `rank` on appended entries, zero `/` in text fields, and zero `;` in `definitions`.
2. Run `generateForeignScriptPronunciation({ language: 'Arabic', term })` on every Arabic etymology step and confirm exact match.
3. Run `generateConjugation()` on every Semitic verb entry and verify `rows[2].perfect === headword` and `rows[2].imperfect === verb_morphology.imperfective_3sgm`.
4. Run `node scripts/push-done-entries.mjs --category=<category> --dry-run`, then `--execute`.
