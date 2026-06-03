# Test Entry Seeding Guide

This guide shows how to add test entries to a Turso clone so you can exercise the full Il-Miġma' UI and API surface without touching production.

Implementation references:
- Entry create/update handler: [`functions/api/admin/entries.js`](../functions/api/admin/entries.js)
- Entry schema: [`db/schema.sql`](../db/schema.sql)
- POS union types: [`src/types/index.ts`](../src/types/index.ts)
- Smoke test helper: [`npm run validate:api`](../scripts/validate_api.mjs)
- Stem seed helper: [`scripts/test-zokk-entry.mjs`](../scripts/test-zokk-entry.mjs)
- Bulk seed pack script: [`scripts/seed-test-pack.mjs`](../scripts/seed-test-pack.mjs)

---

## 1. Recommended workflow

1. Clone production into a separate Turso database.
2. Point `.dev.vars` at the clone for `npm run dev:api`.
3. Point `.env` at the same clone if you are also running the Vite frontend.
4. Seed the clone with one test row for each POS.
5. Run `npm run validate:api` to confirm create/read/delete works.

The local admin endpoints bypass Clerk on `localhost`, so a dummy token is enough during dev.

---

## 2. What the entry API accepts

The entry CRUD API creates rows in the `entries` table and stores etymology data directly on the entry via `etymology_chain` and `etymology_notes` (no separate `etymologies` table).

### Required fields

- `headword`
- `pos`

### Safe defaults

- `id` is optional. If omitted, the API generates one from `pos` and `headword`.
- `definitions` is optional, but at least one definition is strongly recommended for search testing.
- `tags` should be an array of strings.
- `phonetics` should be an array of objects.
- `etymology_chain` should be an array of etymology nodes.
- `is_loanword` should be a boolean.

### Fields that are stored as JSON text

Send these as real arrays/objects in JSON. The API will stringify them before saving.

- `tags`
- `inflections_pl`
- `synonyms`
- `antonyms`
- `related_entries`
- `definitions`
- `phonetics`
- `etymology_chain`

### Helper aliases

- `_rootConsonants` or `root_consonants` can be used for root linkage.
- `_formLabel` or `verb_form` can be used for verb form.

### Normalisation rules

- `gender` is normalized to `masculine`, `feminine`, or `neutral`.
- `headword` and string fields are NFC-normalised by the server.
- Arrays are stored as JSON strings in SQLite/libSQL.

### Useful enum values

- `source_language`: `Arabic`, `Sicilian`, `Italian`, `Latin`, `French`, `English`, `Spanish`, `Berber`, `Greek`, `Uncertain`
- `participle_type`: `active`, `passive`
- `numeral_type`: `cardinal`, `ordinal`, `adverbial`, `fractional`, `multiplier`, `distributive`

---

## 3. POS matrix

Use one row per POS so every major UI filter and renderer gets exercised.

| POS | Canonical `pos` value | Recommended test fields |
|---|---|---|
| Noun | `noun` | `gender`, `inflections_pl`, `is_collective`, `is_singulative`, `root_consonants`, `definitions`, `phonetics`, `tags` |
| Verb | `verb` | `root_consonants`, `verb_form`, `verb_class`, `verb_transitivity`, `verb_perfective_3sgm`, `verb_imperfective_3sgm`, `verb_verbal_noun`, `verb_active_ptcp`, `verb_passive_ptcp`, `verb_vowel_perf`, `verb_vowel_impf`, `definitions` |
| Adjective | `adjective` | `gender`, `inflections_pl`, `form_masc`, `form_fem`, `elative_form`, `vowel_set_sg`, `vowel_set_pl`, `vowel_set_opp`, `definitions` |
| Adverb | `adverb` | `definitions`, `tags`, `source_language` if you want source filtering coverage |
| Preposition | `preposition` | `definitions`, `tags`, `source_language` if you want source filtering coverage |
| Conjunction | `conjunction` | `definitions`, `tags` |
| Particle | `particle` | `definitions`, `tags` |
| Article | `article` | `definitions`, `tags` |
| Pronoun | `pronoun` | `definitions`, `tags`, optional `gender` if you want the UI to display it |
| Interrogative | `interrogative` | `definitions`, `tags` |
| Numeral | `numeral` | `numeral_type`, `form_attributive_short`, `form_attributive_long`, `form_opposite`, `definitions`, `tags` |
| Participle | `participle` | `participle_type`, `gender`, `root_consonants`, `verb_form`, `verb_class`, `verb_active_ptcp`, `verb_passive_ptcp`, `definitions` |
| Verbal noun | `verbal_noun` | `verb_verbal_noun`, `root_consonants`, `verb_form`, `verb_class`, `definitions`, `tags` |
| Interjection | `interjection` | `definitions`, `tags` |

If you want to test the search filters well, make sure at least one entry has:

- a `root_consonants` value
- a `cv_pattern`
- a `source_language`
- a `tags` array
- multiple definitions
- at least one phonetic transcription
- at least one etymology chain

---

## 4. Copy-paste payload templates

### 4.1 Simple closed-class entry

Use this for `adverb`, `preposition`, `conjunction`, `particle`, `article`, `pronoun`, `interrogative`, and `interjection`.

```json
{
  "headword": "test-adv-01",
  "pos": "adverb",
  "definitions": [
    {
      "text_en": "in a test manner",
      "text_mt": "b'mod ta' prova"
    }
  ],
  "tags": ["test", "closed-class"],
  "source_language": "Uncertain",
  "is_loanword": false
}
```

Change only `pos` and `headword` for the other closed-class POS.

### 4.2 Noun

```json
{
  "headword": "test-noun-01",
  "pos": "noun",
  "gender": "feminine",
  
  "inflections_pl": ["test-noun-01s", "test-noun-01ies"],
  "is_collective": false,
  "is_singulative": false,
  "root_consonants": "t-s-t",
  "cv_pattern": "CaCaC",
  "definitions": [
    {
      "text_en": "a test noun",
      "text_mt": "nom ta' prova"
    }
  ],
  "phonetics": [
    {
      "ipa": "ˈtɛst.nuːn",
      "dialect": "Standard"
    }
  ],
  "tags": ["test", "noun"],
  "source_language": "Uncertain"
}
```

Useful extra fields for nouns:

- `form_fem`
- `form_masc`
- `dual_form`
- `diminutive_form`
- `vowel_set_sg`
- `vowel_set_pl`
- `vowel_set_opp`
- `vowel_set_dual`

### 4.3 Verb

```json
{
  "headword": "test-verb-01",
  "pos": "verb",
  "root_consonants": "t-s-t",
  "verb_form": "I",
  "verb_class": "strong",
  "verb_transitivity": "both",
  "verb_perfective_3sgm": "test-verb-01",
  "verb_imperfective_3sgm": "jittest-verb-01",
  "verb_verbal_noun": "testing",
  "verb_active_ptcp": "test-ant",
  "verb_passive_ptcp": "test-ut",
  "verb_vowel_perf": "i-e",
  "verb_vowel_impf": "i-e",
  "definitions": [
    {
      "text_en": "to test",
      "text_mt": "jittestja"
    }
  ],
  "tags": ["test", "verb"]
}
```

Useful extra fields for verbs:

- `verb_weak_class`
- `verb_vowel_impv`
- `source_language`
- `is_loanword`
- `cv_pattern`

### 4.4 Adjective

```json
{
  "headword": "test-adj-01",
  "pos": "adjective",
  "gender": "masculine",
  
  "inflections_pl": ["test-adj-01a", "test-adj-01i"],
  "form_masc": "test-adj-01",
  "form_fem": "test-adj-01a",
  "elative_form": "aktar test-adj-01",
  "vowel_set_sg": "a-a",
  "vowel_set_pl": "i-i",
  "vowel_set_opp": "a-i",
  "definitions": [
    {
      "text_en": "test adjective",
      "text_mt": "aġġettiv ta' prova"
    }
  ],
  "tags": ["test", "adjective"]
}
```

Useful extra fields for adjectives:

- `form_fem_pattern`
- `form_masc_pattern`
- `form_plural_pattern`
- `dual_pattern`
- `source_language`

### 4.5 Numeral

```json
{
  "headword": "test-num-01",
  "pos": "numeral",
  "numeral_type": "cardinal",
  "form_attributive_short": "test-num-short",
  "form_attributive_long": "test-num-long",
  "form_opposite": "test-num-opposite",
  "definitions": [
    {
      "text_en": "test numeral",
      "text_mt": "numru ta' prova"
    }
  ],
  "tags": ["test", "numeral"]
}
```

Useful extra fields for numerals:

- `gender`

- `form_fem_pattern`
- `form_masc_pattern`
- `form_plural_pattern`
- `dual_pattern`

### 4.6 Participle

```json
{
  "headword": "test-ptcp-01",
  "pos": "participle",
  "participle_type": "active",
  "gender": "masculine",
  "root_consonants": "t-s-t",
  "verb_form": "I",
  "verb_class": "strong",
  "verb_active_ptcp": "test-ptcp-01",
  "definitions": [
    {
      "text_en": "test participle",
      "text_mt": "partiċipju ta' prova"
    }
  ],
  "tags": ["test", "participle"]
}
```

Useful extra fields for participles:

- `verb_weak_class`
- `verb_passive_ptcp`
- `verb_vowel_perf`
- `verb_vowel_impf`
- `source_language`

### 4.7 Verbal noun

```json
{
  "headword": "test-vn-01",
  "pos": "verbal_noun",
  "verb_verbal_noun": "test-vn-01",
  "root_consonants": "t-s-t",
  "verb_form": "I",
  "verb_class": "strong",
  "definitions": [
    {
      "text_en": "test verbal noun",
      "text_mt": "nom verbi ta' prova"
    }
  ],
  "tags": ["test", "verbal-noun"]
}
```

Useful extra fields for verbal nouns:

- `verb_transitivity`
- `verb_vowel_perf`
- `verb_vowel_impf`
- `phonetics`

### 4.8 Stem metadata / Zokk entries

Stem-linked entries use two layers:

- the `stems` table, which stores the canonical stem metadata
- the `entries.zokk_morphology` JSON blob, which links a specific entry back to a stem for search and display

#### Stem table payload

Use `/api/admin/stems` for this shape:

```json
{
  "stem_string": "teststem",
  "class_type": "ar",
  "is_hybrid": false,
  "root": "t-s-t",
  "agentive_suffix": "",
  "tags": ["test", "stem"],
  "source": "Uncertain",
  "glosses": [
    {
      "en": "test stem",
      "mt": "zokk ta' prova"
    }
  ],
  "etymology": {
    "relationship": "From",
    "language": "Unknown",
    "term": "teststem",
    "pronunciation": "",
    "definition": "test stem"
  },
  "synonyms": [],
  "antonyms": [],
  "related_stems": []
}
```

`class_type` must be `ar` or `ir`. `is_hybrid` should be `true` for hybrid stems and `false` otherwise.

#### Entry payload with stem metadata

If you want the entry itself to be discoverable via `stem_string`, include `zokk_morphology` on the entry:

```json
{
  "headword": "test-stem-entry-01",
  "pos": "verb",
  "is_loanword": true,
  "source_language": "English",
  "zokk_morphology": {
    "stem_string": "teststem",
    "class_type": "ar",
    "is_hybrid": false,
    "root": "t-s-t",
    "agentive_suffix": ""
  },
  "definitions": [
    {
      "text_en": "a stem-linked test entry",
      "text_mt": "entry marbuta ma' zokk ta' prova"
    }
  ],
  "tags": ["test", "zokk"]
}
```

If you want a working copy-paste reference, see [`scripts/test-zokk-entry.mjs`](../scripts/test-zokk-entry.mjs), which already seeds `kant`, `servi`, and `fajl` with stem metadata.

---

## 5. Bulk seed pack

If you want a complete fixture instead of pasting entries one by one, use the bulk seed pack:

```bash
npm run seed:test-pack -- --dry-run
npm run seed:test-pack -- --reset
```

What it does:

- creates 5 entries for each POS
- uses root-linked rows for `noun`, `verb`, `adjective`, `participle`, and `verbal_noun`
- uses stem-linked rows for the closed-class POS set
- creates matching rows in `roots`, `stems`, `definitions`, and `phonetics` (etymology stored on `entries.etymology_chain`)
- rebuilds `entries_fts` at the end

The generated data is intentionally synthetic and prefixed with `zz-` so it is easy to find and safely delete.

---

## 6. How to submit the payload

### Option A: curl

```bash
curl -X POST http://localhost:8788/api/admin/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy-token-bypass" \
  -d @payload.json
```

### Option B: browser Admin UI

Open `/admin` and use the entry editor or DB tools while `npm run dev:api` is running.

### Option C: smoke test script

Run:

```bash
npm run validate:api
```

That script creates a sample root and a sample entry, then deletes them again so you can confirm the round-trip without leaving test junk behind.

---

## 6. Suggested test pack

If you want to test everything, add at least one entry for each of these POS values:

- `noun`
- `verb`
- `adjective`
- `adverb`
- `preposition`
- `conjunction`
- `particle`
- `article`
- `pronoun`
- `interrogative`
- `numeral`
- `participle`
- `verbal_noun`
- `interjection`

For best coverage, include:

- one root-linked Semitic-style entry
- one Romance-source entry
- one loanword
- one multi-definition entry
- one entry with phonetics
- one entry with etymology
- one entry with tags
- one entry with plural forms
- one entry with a pattern field

---

## 7. Validation checklist

- `GET /api/search?q=<headword>` returns the entry
- `GET /api/search?pos=<pos>` returns the entry in the right POS bucket
- `GET /api/search?root_id=t-s-t` returns the root-linked entry if you set one
- `/admin` shows the entry in the list view
- definitions show up in the entry detail page
- phonetics render where present
- tags are searchable
- `npm run validate:api` completes without errors
