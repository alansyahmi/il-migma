# Search API (`GET /api/search`)

The search endpoint supports dictionary lookup, morphology filters, root filters, and result ordering controls.

Implementation source: [`functions/api/search.js`](../functions/api/search.js).

## Endpoint

```http
GET /api/search
```

## Response shape

```json
{
  "results": [
    {
      "id": "...",
      "headword": "kiteb",
      "pos": "verb",
      "definition_en": "...",
      "definition_mt": "...",
      "root_pattern_form": { "root": { "consonants": "k-t-b" }, "pattern": { "cv_notation": "CiCeC" } }
    }
  ],
  "total": 123,
  "query": "kit"
}
```

## Query parameters

### Text search controls

- `q` — search text.
- `regex=true` — treat `q` as a regex-like expression translated to SQLite `GLOB`.
- `lemma=true` — search lemma/headword dimensions.
- `word_forms=true` — search word-form fields (`noun_plural_forms`, `verb_verbal_noun`).
- `gloss=true` — search English gloss (`definitions.text_en`).

If no field toggle is provided, the endpoint searches a broad set (headword + FTS + root consonants).

### Lexical/morphology filters

- `pos` — filter by part of speech.
- `type` — root/language mode:
  - `semitic`: entries with Semitic-source behavior
  - `romance`: entries with Romance-source language set
  - other values: matches `roots.strength` or `entries.verb_class`
- `v` — vowel set (`roots.vowel_set_perf` or `entries.verb_vowel_perf`).
- `wizen` — pattern filter (`patterns.wizen_notation`, `patterns.cv_notation`, or `entries.cv_pattern`).
- `form` — verb form (`entries.verb_form`).
- `verb_type` — `entries.verb_type`.
- `source` — source filter over root/entry source fields.
- `root_id` — direct root targeting by id or consonant skeleton.

### Radical filters

- `r1`, `r2`, `r3`, `r4` — constrain consonant slots for root lookup.

### Result controls

- `limit` — number of rows (max 100; `limit=0` returns only total).
- `offset` — pagination offset.
- `random=1|true` — random ordering.
- `recent=true` — `created_at DESC` ordering.

## Ordering behavior

When not random/recent, results are prioritized by relevance bucket:

1. exact headword match
2. headword prefix match
3. root consonant match
4. alphabetical fallback (`headword ASC`)

## Example requests

```bash
# General search
curl '/api/search?q=kit&limit=20'

# Search only by English gloss
curl '/api/search?q=write&gloss=true&limit=20'

# Search verbs by form and pattern
curl '/api/search?pos=verb&form=II&wizen=CaCCeC'

# Root-constrained lookup
curl '/api/search?root_id=k-t-b'

# Radical slot filtering
curl '/api/search?r1=k&r2=t&r3=b'

# Count only (no rows)
curl '/api/search?type=semitic&limit=0'
```

## Notes for integrators

- Text is normalized to lowercase + NFC during query handling.
- `regex=true` is implemented using translated `GLOB`, not full PCRE.
- Response rows include normalized helper fields for UI (`definition_en`, `verb_morphology`, `root_pattern_form`).
- CORS header is permissive (`Access-Control-Allow-Origin: *`).
