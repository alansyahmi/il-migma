# Refined Results — AI Refinement Guide

> **Purpose:** This document defines the process for refining raw Wiktionary scrape results
> into high-quality, database-ready entries. It is written to be consumed by an AI agent
> (Claude, GPT, etc.) performing the refinement step in the Il-Migma data pipeline.

---

## Pipeline Position

```
Wiktionary HTML  ──[scraper.py]──▶  scraped-results/*.jsonl  ──[REFINE]──▶  refined-results/*.jsonl  ──[upload.py]──▶  Database
```

Raw scrapes contain English definitions, partial etymology chains, and mechanical tags.
The refinement step fills in Maltese definitions, usage examples, register/nuance,
smart tags, and corrects gaps before upload.

---

## 1. Input/Output Format & Database Schema Fields

Each line in the entries JSONL file represents a dictionary entry. Below is the standard format containing core fields, followed by all POS-specific database fields that should be populated/preserved during refinement:

```jsonc
{
  // ── Core Identity ──────────────────────────────────────────────────────
  "id":                 "n-kelma",           // {short_pos}-{slugified-headword}
  "headword":           "kelma",             // the headword in Maltese
  "pos":                "noun",              // part of speech (see POS enum below)
  "gender":             "feminine",          // "masculine" | "feminine" | "neutral" | null

  // ── Morphology ─────────────────────────────────────────────────────────
  "root_consonants":    "k-l-m",             // e.g. "k-t-b" or null (see Step 2.8)
  "stem":               null,                // "-headword-" if no root (see Step 2.8)
  "cv_pattern":         "1v2v3",             // 1V notation (see Step 2.12); null if no root
  "morph_pattern":      null,                // broken/derived pattern; null if no root
  "is_loanword":        0,                   // 0=Semitic/Arabic, 1=Romance/English/etc.
  "is_inflectable":     0,                   // 0 or 1; set 1 for verbs and inflecting nouns/adj
  "is_imala_blocked":   0,                   // 0 or 1; set 1 only for words where imala is blocked

  // ── Source & Etymology ─────────────────────────────────────────────────
  "source_language":    "Arabic",            // origin language or "Uncertain"
  "source_id":          "src-crowd",         // always "src-crowd" from scraper
  "source_citation":    "Wiktionary: kelma",
  "source_title":       "Wiktionary",
  "source_year":        null,
  "source_page":        "https://en.wiktionary.org/wiki/kelma",
  "source_publisher":   "Wiktionary",
  "etymology_chain":    [                    // array of EtymologyNode or []
    {
      "relationship":   "Inherited from",    // Borrowed from | Inherited from | Derived from | From | Cognate with | Related to | Via
      "language":       "Arabic",
      "term":           "كَلِمَة",           // source term in original script, or null
      "definition":     "word, speech",      // definition of the SOURCE term (often null)
      "pronunciation":  null                 // optional; rarely populated
    }
  ],
  "etymology_notes":    null,                // free-text or null

  // ── Definitions & Examples ─────────────────────────────────────────────
  "definitions": [                           // array of sense objects (≥1)
    {
      "text_en":        "a word, a unit of language",  // English (keep scraper text)
      "text_mt":        null,                          // Maltese — MUST fill (see Step 2.2)
      "register":       "",                            // Maltese label or "" (see Step 2.4)
      "nuance":         ""                             // "" except for participles ("adjective"/"noun")
    }
  ],
  "usage_examples":     [],                  // MUST fill 1–3 examples (see Step 2.3)

  // ── Extras ─────────────────────────────────────────────────────────────
  "related_entries":    [],                  // ["n-kliem"] — cross-referenced entry IDs
  "alternative_forms":  [],                  // [{ "headword": "variant", "type": "orthographic" }]
  "phonetics": [                             // MUST generate (see Step 2.10)
    { "dialect": "Standard", "ipa": "/ˈkɛl.mɐ/", "notes": null }
  ],
  "source_display":     null,
  "source_tooltip":     null,
  "sound_suffix":       null,                // e.g. "-ijiet", "-in"; rarely filled from scraper

  // ── Zokk (Stem Morphology for Loanwords) ───────────────────────────────
  "zokk_morphology":    null,                // JSON for DB; set by admin UI, not manually
  "zokk_class":         null,                // "ar" | "ir" | null
  "zokk_is_hybrid":     null,                // 0 | 1 | null
  "zokk_agentive_suffix": null,              // "atur" | "ist" | … | null
}

### POS-Specific Fields (Entries Table)

The `entries` table has columns for all POS types. Fill ONLY the fields relevant
to the entry's POS. Leave others as `null`.

#### Verbs (`pos: "verb"`)

| Field | Example | Notes |
|-------|---------|-------|
| `verb_form` | `"I"`, `"II"`, `"V"`, `"VI"`, `"VII"`, `"VIII"`, `"IX"`, `"X"` | Roman numeral, required |
| `verb_type` | `"triliteral"`, `"quadriliteral"` | Root length |
| `verb_class` | `"strong"`, `"weak"`, `"hollow"`, `"defective"`, `"doubled"` | Required |
| `verb_weak_class` | `"w-initial"`, `"j-final"` | Only for weak verbs |
| `verb_transitivity` | `"transitive"`, `"intransitive"`, `"ditransitive"` | Required |
| `verb_perfective_3sgm` | `"kiteb"` | 3sg masculine perfect |
| `verb_imperfective_3sgm` | `"jikteb"` | 3sg masculine imperfect |
| `verb_verbal_noun` | `"kitba"` | Verbal noun form |
| `verb_active_ptcp` | `"kieles"` | Active participle |
| `verb_passive_ptcp` | `"miktub"` | Passive participle |
| `verb_vowel_perf` | `"i-e"` | Vowels for perfective stem |
| `verb_vowel_impf` | `"i-e"` | Vowels for imperfective stem |
| `verb_vowel_impv` | `"i-e"` | Vowels for imperative stem |

→ Also set `is_inflectable: 1` and `is_imala_blocked: 0` (or `1` if imala is
blocked).

#### Nouns (`pos: "noun"`)

Nouns use `gender`, `stem`, `cv_pattern`, and `morph_pattern` at the entry
level. Detailed noun morphology (dual, diminutive, plural forms) lives in the
`noun_morphology` table — do NOT create it manually; the admin UI handles it.

| Field | Example | Notes |
|-------|---------|-------|
| `gender` | `"masculine"`, `"feminine"` | Always fill if known |
| `sound_suffix` | `"-ijiet"`, `"-iet"`, `"-in"`, `"-at"` | Sound plural suffix, if known |

#### Adjectives (`pos: "adjective"`)

| Field | Example | Notes |
|-------|---------|-------|
| `gender` | `"masculine"`, `"feminine"` | Lemma gender |
| `elative_form` | `"akbar"` (for `"kbir"`) | Comparative/superlative |

Detailed adjective morphology (feminine, plural, dual, diminutive forms) lives
in the `adj_morphology` table — do NOT create manually.

#### Participles (`pos: "participle"`)

| Field | Example | Notes |
|-------|---------|-------|
| `participle_type` | `"active"`, `"passive"` | Required |

Also set the `nuance` field on each definition to `"adjective"` or `"noun"`
to indicate how the participle functions in that sense.

#### Numerals (`pos: "numeral"`)

| Field | Example | Notes |
|-------|---------|-------|
| `numeral_type` | `"cardinal"`, `"ordinal"`, `"collective"`, `"distributive"`, `"multiplier"`, `"fractional"` | Required |
| `form_attributive_short` | `"tliet"` | Short form before nouns |
| `form_attributive_long` | `"tlieta"` | Long form in isolation |
| `numeral_ordinal` | `"tielet"` | Ordinal form |
| `numeral_adverbial` | e.g. `"darbtejn"` | Adverbial form |
| `numeral_fractional` | `"terz"` | Fractional form |
| `numeral_multiplier` | `"triplu"` | Multiplier form |
| `numeral_distributive` | e.g. `"tlieta tlieta"` | Distributive form |

#### Loanwords / Zokk (Stems)

For loanwords (`is_loanword: 1`) with no root consonants:

| Field | Example | Notes |
|-------|---------|-------|
| `stem` | `"-camfrin-"` | Always set (see Step 2.8) |
| `zokk_class` | `"ar"`, `"ir"` | Verb class if the stem inflects |
| `zokk_is_hybrid` | `0`, `1` | Semitic-Romance hybrid? |
| `zokk_agentive_suffix` | `"atur"`, `"ist"` | Agentive suffix if applicable |
| `cv_pattern` | `null` | Leave null |
| `morph_pattern` | `null` | Leave null |

#### Global Fields (all POS)

| Field | Example | When to Fill |
|-------|---------|-------------|
| `source_display` | `"Maltese-English Dictionary"` | Custom source label (rare) |
| `source_tooltip` | `"Aquilina 1987-1990"` | Source detail (rare) |
| `cv_pattern` | `"1v2v3"`, `"1a2a3"` | **Only** with root consonants (Step 2.12) |
| `morph_pattern` | `"12u3"`, `"1a22a3"` | **Only** with root consonants; for broken plurals |
| `sound_suffix` | `"-ijiet"`, `"-in"`, `"-iet"`, `"-at"` | Fill for sound-plural nouns |
| `is_imala_blocked` | `0`, `1` | Set `1` only for words resisting imala |
| `is_inflectable` | `0`, `1` | Set `1` for verbs, inflecting nouns/adjectives |

---

### Critical Fields to Fill

| Field | Scraper State | Refinement Target |
|-------|--------------|-------------------|
| `definitions[].text_mt` | Always `null` | Oxford-style Maltese definition (Capitalized) |
| `definitions[].register` | Always `""` | Register classification |
| `definitions[].nuance` | Always `""` | Set to `"adjective"` or `"noun"` for participles only; otherwise must be empty (`""`) |
| `usage_examples` | Always `[]` | 1–3 natural Maltese sentences |
| `source_language` | Sometimes `"Uncertain"` | Correct origin language |
| `etymology_chain[].definition` | Often `null` | Fill missing source-term glosses |
| `root_consonants` | Sometimes `null` | Fill for Semitic-origin words |
| `is_loanword` | Auto-detected, sometimes wrong | Verify & correct |
| `tags` (in entry_tags) | Mechanical only | Smart semantic tags (English-only) |
| `phonetics` | **Not present** | Generate IPA for Standard Maltese |
| `stem` | Usually `null` | Fill if a known stem exists |
| `alternative_forms` | **Not present** | Add spelling variants, or link to main form |

> **⚠️ ENGLISH ORTHOGRAPHY (CRITICAL):** You MUST always use **UK English** spelling for all English-language fields (e.g. `definitions[].text_en`, `etymology_chain[].definition`, and the `en` translations in `usage_examples`). Do NOT use US spelling (e.g. use `centre` instead of `center`, `colour` instead of `color`, `paralysed` instead of `paralyzed`, `grey` instead of `gray`).

> **Note on `nuance`:** For non-participle entries, do NOT put semantic shades in the definition's `nuance` field. Instead, map these shades directly into the entry's `tags` array in English (e.g., `"figurative"` or `"pejorative"`).

---

## 2. Refinement Process (Step by Step)

For each entry in the JSONL file, perform these steps in order.

### Step 2.1 — Skip Curated Entries

If the entry has `"curated": true`, **skip it entirely**. Do not modify curated entries.
The `--no-overwrite` flag in the scraper and uploader protects these, and so should you.

### Step 2.2 — Fill Maltese Definitions (`text_mt`)

This is the **most important** step. For every definition object where `text_mt` is `null`,
write a Maltese definition following **Oxford-style lexicographic principles**:

#### Oxford Defining Style (adapted for Maltese)

1. **Genus + Differentia.** Start with the broader category, then distinguish.
   - English: "a large carnivorous feline mammal (Panthera leo)"
   - Maltese pattern: "Annimal mammiferu ..." / "Għodda li ..." / "Azzjoni ta' ..."

2. **Use the defining vocabulary consistently.** Prefer common, well-understood Maltese
   words in definitions. Avoid defining a rare word with another rare word.

3. **Most common sense first.** If a word has multiple senses, the primary/oldest/most
   frequent sense comes first in the definitions array.

4. **Be concise.** A definition should be one phrase or short sentence. Avoid rambling.

5. **Avoid circularity.** Don't define "kiteb" as "il-kitba" and "kitba" as "l-azzjoni ta' min kiteb."

6. **Use standard Maltese orthography.** Follow Il-Kunsill tal-Malti conventions.
   No dialectal spellings in definitions unless the headword itself is dialectal.

7. **Match the POS.** A noun definition starts with a noun phrase; a verb definition
   typically starts with "Li ..." or an infinitive-like structure.

8. **Capitalize the first letter.** All definitions in `text_mt` MUST begin with a capital letter.

#### Definition Patterns by POS

| POS | Maltese Pattern | Example |
|-----|----------------|---------|
| **noun** | `[Artiklu] + [nom] + li/di/ta' + [karatteristika]` | "Għodda tal-injam li tintuża biex..." |
| **verb** | Verb phrase starting in 3rd person singular masculine (with `j-`/`ji-`) | "Jagħmel xi ħaġa..." / "Jikteb..." |
| **adjective** | descriptive phrase (avoid starting with "Li") | "Għandu kulur aħmar" / "Kbir, wiesa'" |
| **adverb** | `B'mod + [aġġettiv]` or adverbial phrase | "B'mod li juri..." / "F'dak il-post" |
| **preposition** | `[Kelma] + li + [relazzjoni]` | "Kelma li turi r-relazzjoni ta'..." |
| **conjunction** | `[Kelma] + li + [funzjoni]` | "Kelma li tgħaqqad..." |
| **pronoun** | `[Kelma] + li + [tieħu post]` | "Kelma li tieħu post l-isem..." |
| **numeral** | `[Numru/kelma] + li + [kwantità]` | "In-numru li jiġi wara..." |
| **interjection** | `[Kelma] + ta' + [emozzjoni]` | "Kelma li tesprimi..." |

#### Examples

```
headword: "dar"
text_en:  "a house, a building for human habitation"
text_mt:  "Bini fejn jgħixu n-nies; residenza, abitazzjoni"

headword: "kiteb"
text_en:  "to write"
text_mt:  "Jifforma ittri u kliem fuq wiċċ, speċjalment bil-pinna jew kompjuter"

headword: "sabiħ"
text_en:  "beautiful, pretty, handsome"
text_mt:  "Jogħġob lill-għajn jew lill-moħħ; pjaċevoli fid-dehra"

headword: "malajr"
text_en:  "quickly, fast"
text_mt:  "B'veloċità kbira; fi żmien qasir, b'ħeffa"

headword: "fuq"
text_en:  "on, upon, above"
text_mt:  "F'pożizzjoni ogħla minn xi ħaġa u f'kuntatt magħha; fil-wiċċ ta'"
```

#### Multi-Sense Words

> **⚠️ IMPORTANT UI LIMITATION:** The gloss UI throughout the Il-Migma website **still does not split glosses by `;`**. If you leave multiple numbered senses joined by `;` in a single `text_en` or `text_mt` string, the UI's `firstSenseText()` utility will aggressively truncate the string at the first semicolon, and **all subsequent senses will be invisible to the user**. 
> 
> Therefore, you MUST split them into separate definition objects.

When the English definition has multiple senses separated by `;` or distinct numbered
meanings, split them into separate definition objects, each with its own Maltese definition:

```jsonc
// Scraper output (single sense):
{ "text_en": "a house; a dynasty, a lineage", "text_mt": null, "register": "", "nuance": "" }

// Refined output (two senses):
[
  { "text_en": "a house, a building for human habitation", "text_mt": "Bini fejn jgħixu n-nies; residenza, abitazzjoni", "register": "", "nuance": "" },
  { "text_en": "a dynasty, a lineage, a ruling family", "text_mt": "Familja jew nisel ta' ħakkiema; dinastija", "register": "storiku", "nuance": "" } // nuance moved to entry tags, see Step 2.5
]
```

#### Extracting Parenthetical Qualifiers

Wiktionary English definitions often embed usage notes in parentheses:
`"a horse (archaic)"`, `"a friend (slang)"`, `"money (childish)"`.

**Always extract registers into the `register` field, but map semantic nuances directly to the entry-level `tags` list.** Register values (like slang, archaic, colloquial) are stored on the definition. Nuance values (like figurative, euphemistic, pejorative) must NOT be placed in the definition-level `nuance` field; instead, add them in English to the entry's `tags` array.

| Embedded in `text_en` | Clean `text_en` | Field to use | Value |
|----------------------|-----------------|-------------|-------|
| `"a horse (archaic)"` | `"a horse"` | `register` | `"arkajku"` |
| `"money (childish)"` | `"money"` | entry-level `tags` | `"childish"` |
| `"a friend (slang)"` | `"a friend"` | `register` | `"sleng"` |
| `"beautiful (figurative)"` | `"beautiful"` | entry-level `tags` | `"figurative"` |
| `"to die (euphemistic)"` | `"to die"` | entry-level `tags` | `"euphemistic"` |

**Mapping rule:** If the parenthetical describes a **usage domain/register** (archaic, slang, formal, colloquial, technical, literary), it goes in `register` on the definition. If it describes a **semantic shade** (figurative, euphemistic, pejorative, diminutive, childish), it must be added to the entry-level `tags` array in English (e.g. `["figurative"]`). The definition-level `nuance` field should remain empty (`""`).

---

### Step 2.3 — Add Usage Examples

For each entry, provide **1–3 natural Maltese sentences** showing the word in context.
These go into the `usage_examples` array (at the entry level, not per-sense).

#### Usage Example Guidelines

1. **Natural, idiomatic Maltese.** Write sentences a native speaker would actually say.
   Avoid stilted, textbook examples.

2. **Show typical collocations and constructions.** If a verb takes a specific preposition,
   show it. If a noun is typically used with certain adjectives, show it.

3. **Vary the context.** If multiple examples, show different registers or constructions.

4. **Include an English translation** for learners. Each example is a pair:

```jsonc
"usage_examples": [
  {
    "mt": "Il-kelma hi l-iżgħar unità tal-lingwa li għandha tifsira.",
    "en": "The word is the smallest unit of language that has meaning."
  }
]
```

5. **Prefer examples that disambiguate.** If a word has multiple senses, examples should
   clarify which sense is being shown.

6. **Keep sentences moderately complex.** Not too simple (avoid "Dan hu ktieb.") but not
   so complex they confuse learners.

#### Examples

```
headword: "kemm" (adverb)
examples:
  - { mt: "Kemm hu sabiħ dan il-post!", en: "How beautiful this place is!" }
  - { mt: "Ma nafx kemm se ndum hawn.", en: "I don't know how long I'll stay here." }

headword: "għajr" (preposition)
examples:
  - { mt: "Ġew kulħadd għajr hu.", en: "Everyone came except him." }
  - { mt: "M'għandix għajr lilek.", en: "I have no one other than you." }
```

---

### Step 2.4 — Assign Register and Nuance

For each definition sense, fill `register` where applicable. Leave `nuance` as `""` unless the POS is `"participle"`.

#### Register Values

Use these standard Maltese labels (leave empty for neutral/unmarked usage):

| Register | Label | When to Use |
|----------|-------|-------------|
| Formal | `formali` | Official, academic, or bureaucratic contexts |
| Literary | `letterarju` | Found primarily in literature/poetry |
| Colloquial | `kollokwali` | Everyday speech, informal |
| Archaic | `arkajku` | No longer in common use; historical |
| Obsolete | `obsolet` | Entirely out of use |
| Technical | `tekniku` | Domain-specific jargon (legal, medical, scientific) |
| Regional/Dialectal | `djalettali` | Specific to a region (e.g. Għawdex, l-Imġarr) |
| Slang | `sleng` | Very informal, often generational |
| Vulgar | `volgari` | Offensive or crude |
| Euphemistic | `ewfemistiku` | Used to avoid a blunt term |

#### Nuance Values (Participles Only)

For **participles** only, specify whether the sense functions as an adjective or noun:

| Nuance | When to Use |
|--------|-------------|
| `adjective` | Participle functions as an adjective in this sense |
| `noun` | Participle functions as a noun in this sense |

For all other Parts of Speech, the `nuance` field in the definition object must remain empty (`""`). Any semantic nuances must instead be mapped directly to English tags on the entry object.

#### Examples

```jsonc
// Archaic literary term (noun)
{ "text_en": "a steed, a noble horse", "text_mt": "Żiemel nobbli", "register": "letterarju", "nuance": "" }

// Colloquial adjective (nuance mapped to entry-level tags: ["metaphorical"])
{ "text_en": "cool, awesome (of a person)", "text_mt": "Simpattiku, attraenti", "register": "kollokwali", "nuance": "" }

// Pejorative usage (noun, nuance mapped to entry-level tags: ["pejorative"])
{ "text_en": "a gossip, a busybody", "text_mt": "Persuna li tindaħal f'ħaddieħor", "register": "", "nuance": "" }

// Participle sense functioning as a noun (participle nuance)
{ "text_en": "an employee", "text_mt": "Impjegat", "register": "", "nuance": "noun" }
```

### Step 2.5 — Smart Tagging

Assign tags following the taxonomy below. **The key principle: tags should add information
that is NOT already obvious from the entry's POS, headword, or etymology.**

#### Redundancy Rules (CRITICAL)

**NEVER assign a tag that merely restates what the data already says:**

- ❌ Don't tag `noun` on a noun entry — the `pos` field already says it.
- ❌ Don't tag `verb` on a verb entry.
- ❌ Don't tag `loanword` if `is_loanword` is already `1`.
- ❌ Don't tag `Semitic` if `root_consonants` already has a value.
- ❌ Don't tag `feminine` if `gender` is already `"feminine"`.
- ❌ Don't tag `plural` on a noun that's only plural — the POS and definitions say it.
- ❌ Don't tag `Maltese` — everything in the database is Maltese.

**VALID tags add NEW information:** domains, usage, register, or specific etymological characteristics.

#### Tag Taxonomy

##### A. Etymological Origin Tags

Only these two specific etymology tags are allowed:

| Tag | Description |
|-----|-------------|
| `rgħajn` | The letter **għ** represents Arabic **ghayn** (غ), NOT **ʿayn** (ع). Assign ONLY to words where għ = etymological ghayn (غ). |
| `hemża` | A radical `w` or `j` in the Semitic root corresponds historically to **hamza** (ء) (e.g. in the root `w-t-j` and the word `wita`). |

**Rule for `rgħajn` tag:** Assign ONLY when there is clear etymological evidence that the `għ` in the word corresponds to Arabic ghayn (غ) (NOT ʿayn (ع)). Do NOT tag `rgħajn` for normal `ʿayn` words or Romance loanwords.

```
Examples:
  għar    → għ = Arabic غ (ghayn) → tag: rgħajn  ✓
  għasfur → għ = Arabic ع (ʿayn)   → NO rgħajn tag (it's ʿayn)
  għajn   → għ = Arabic ع (ʿayn)   → NO rgħajn tag (it's ʿayn)
  gverta  → għ = Romance adaptation → NO rgħajn tag
```

##### B. Semantic Domain Tags (English-only)

Assign up to **3** domain tags per entry (fewer is better; only if clearly applicable).

| Tag | Domain |
|-----|--------|
| `agriculture` | Agriculture, farming, crops |
| `anatomy` | Body parts, anatomy |
| `animals` | Animals, fauna |
| `architecture` | Architecture, buildings |
| `art` | Art, aesthetics |
| `astronomy` | Astronomy, celestial |
| `sea` | Maritime, sea, fishing |
| `botany` | Botany, plants, flora |
| `geography` | Geography, places, topography |
| `food` | Food, drink, cuisine |
| `commerce` | Commerce, trade, economy |
| `family` | Family, kinship |
| `physics` | Physics, natural sciences |
| `war` | War, military |
| `law` | Law, legal |
| `mathematics` | Mathematics |
| `medicine` | Medicine, health |
| `music` | Music |
| `politics` | Politics, governance |
| `religion` | Religion, spirituality |
| `crafts` | Crafts, trades, professions |
| `sports` | Sports, games |
| `technology` | Technology, computing |
| `weather` | Weather, climate |
| `transport` | Transport, vehicles |
| `time` | Time, temporality |

##### C. Usage / Status Tags (English-only)

| Tag | When to Use |
|-----|-------------|
| `common` | Very high-frequency word |
| `rare` | Rare, infrequent |
| `archaic` | Outdated but still occasionally used |
| `neologism` | Neologism, recently coined |
| `purist` | Coined by Maltese language purists (often to replace loanwords) |

##### D. Register Tags (English-only)

These tags should match registers that are applied at the entry level rather than the definition level:

| Tag | When to Use |
|-----|-------------|
| `formal` | Official, academic, or bureaucratic contexts |
| `literary` | Found primarily in literature/poetry |
| `colloquial` | Everyday speech, informal |
| `archaic` | Outdated or historical register |
| `obsolete` | Entirely out of use |
| `technical` | Domain-specific jargon (legal, medical, scientific) |
| `dialectal` | Specific to a region (e.g. Gozitan, rural) |
| `gozitan` | Gozitan dialect specifically |
| `slang` | Very informal, often generational |
| `vulgar` | Offensive or crude |
| `euphemistic` | Used to avoid a blunt term |
| `figurative` | Used in a figurative or metaphorical sense |
| `pejorative` | Derogatory or expressing contempt |
| `childish` | Child language or nursery terms |

#### Tag Assignment Process

For each entry:
1. Check etymology chain/root characteristics → assign `rgħajn` or `hemża` if applicable.
2. Check semantic domain → assign up to 3 English domain tags.
3. Check usage constraints or semantic shades → assign relevant English usage/register/nuance tags (e.g. `pejorative`, `figurative`, `common`).
4. Sanity check: remove any tag that merely restates existing field values.

### Step 2.6 — Refine Source Language

If `source_language` is `"Uncertain"` or clearly wrong, determine the correct value:

1. If etymology chain has an Arabic/Semitic origin at the earliest node → `"Arabic"`
2. If etymology chain shows Romance origin → the specific Romance language (Italian, Sicilian, French, etc.)
3. If etymology chain shows English → `"English"`
4. If mixed origin (multiple donor languages in chain) → the most immediate non-Maltese ancestor
5. If truly uncertain and etymology chain is null/empty → `"Uncertain"` (keep)

Also verify `is_loanword`:
- `0` = Semitic/Arabic origin (inherited, not borrowed in the linguistic sense)
- `1` = Non-Semitic origin (Romance, English, etc.)

**Important distinction:** Maltese inherited its Arabic component through normal language
transmission (not borrowing in the historical linguistics sense). So Arabic-etymology
words are NOT loanwords in this schema. Romance and English words ARE loanwords.

### Step 2.7 — Fill Missing Etymology Definitions

Many etymology chain nodes have `"definition": null` for the source term (especially
Arabic terms written in Arabic script). Fill these in where possible:

```jsonc
// Before refinement:
{ "relationship": "From", "language": "Arabic", "term": "كَلِمَة", "definition": null }

// After refinement:
{ "relationship": "From", "language": "Arabic", "term": "كَلِمَة", "definition": "kelma; espressjoni; diskors qasir" }
```

The definition of the source term should be the **primary/oldest meaning** of that term
in the source language, translated to **English** (as these are cross-linguistic glosses).

This requires knowledge of the source language. If unsure, leave `null` rather than guess.

### Step 2.8 — Fill Missing Root Consonants & Stem

For Semitic-origin words, fill `root_consonants` if missing:

- Extract the three (or four) radical consonants from the Arabic etymon
- Format as `"k-t-b"` (lowercase, hyphen-separated)
- If the word is a Romance/English loan, leave `root_consonants` as `null`
- If the root is weak (contains w/j), include them: `"q-w-l"`, `"b-n-j"`
- For geminated roots (C2=C3), still write all three: `"ħ-b-b"`

```jsonc
// Before: "root_consonants": null, etymology shows Arabic كَلِمَة
// After:  "root_consonants": "k-l-m"

// Before: "root_consonants": null, word is Italian loan
// After:  "root_consonants": null  (keep null for Romance)
```

**Stem rule for patternless entries.** Words without root consonants (loanwords,
uncategorised words, proper nouns) MUST NOT have a `cv_pattern` or `morph_pattern`.
Instead, set `stem` to the headword wrapped in dashes:

```jsonc
// Loanword with no root:
{ "headword": "ittriċi", "root_consonants": null, "cv_pattern": null, "stem": "-ittriċi-" }

// Surname (proper noun):
{ "headword": "Caffari", "root_consonants": null, "cv_pattern": null, "stem": "-Caffari-" }
```

> ⚠️ **Multi-word phrases** (containing spaces, e.g. `"ċawl abjad"`) get
> neither a pattern nor a stem — leave both as `null`.

> ⚠️ **Rule summary:** patterns (`cv_pattern`, `morph_pattern`) are only valid
> for single-word entries with Semitic root consonants. Loanwords and proper
> nouns get a `stem` only. Multi-word entries get nothing.

### Step 2.9 — Fill Missing Related Entries

If `related_entries` is `[]` or incomplete, add cross-references:

- Synonyms, antonyms
- Morphologically related words (same root, different POS)
- Semantic relatives (co-hyponyms, hypernyms)

Only add entries that you are confident exist in the dataset.

### Step 2.10 — Generate IPA Pronunciation

Generate a **phonetics** array for each entry. At minimum, provide the **Standard Maltese**
pronunciation. Add dialectal variants (Għawdex, rural, etc.) only when the pronunciation
meaningfully differs from Standard.

#### Phonetics Array Structure

Add a `phonetics` field to the entry:

```jsonc
"phonetics": [
  {
    "dialect": "Standard",
    "ipa": "/ˈkɛl.mɐ/",
    "notes": null
  }
]
```

Each phonetics object has:
- `dialect` — `"Standard"`, `"Għawdex"`, `"L-Imġarr"`, `"Għarb"`, etc.
- `ipa` — IPA transcription with `/slashes/`, stress marker, and syllable dots
- `notes` — optional free-text note (e.g. "archaic pronunciation", "variant")

#### Maltese IPA Conventions

The IPA transcription MUST follow the conventions established in the Il-Migma
phonology engine (`src/lib/maltesePhonology.ts`). **Consistency across all entries
is critical.** Every AI refinement MUST use the same mapping.

##### Vowel → IPA Mapping

| Grapheme | IPA | Context |
|----------|-----|---------|
| `a` | `/ɐ/` | short a |
| `e` | `/ɛ/` | short e |
| `i` | `/ɪ/` | short i |
| `o` | `/ɔ/` | short o |
| `u` | `/ʊ/` | short u |
| `ie` | `/ɪː/` | always long ī (never /i/) |
| `â` | `/ɐː/` | long a (circumflex) |
| `ê` | `/ɛː/` | long e |
| `î` | `/ɪː/` | long i |
| `ô` | `/ɔː/` | long o |
| `û` | `/ʊː/` | long u |

##### Consonant → IPA Mapping

| Grapheme | IPA | Notes |
|----------|-----|-------|
| `b` | `/b/` | voiced bilabial stop |
| `ċ` | `/t͡ʃ/` | voiceless postalveolar affricate (English "ch") |
| `d` | `/d/` | voiced alveolar stop |
| `f` | `/f/` | voiceless labiodental fricative |
| `ġ` | `/d͡ʒ/` | voiced postalveolar affricate (English "j") |
| `g` | `/ɡ/` | voiced velar stop |
| `għ` | (see rules) | vowel lengthening or `/ħ/` word-finally |
| `h` | (see rules) | `/h/` internally, silent or `/ħ/` word-finally |
| `ħ` | `/ħ/` | voiceless pharyngeal fricative |
| `j` | `/j/` | palatal approximant (English "y") |
| `k` | `/k/` | voiceless velar stop |
| `l` | `/l/` | alveolar lateral approximant |
| `m` | `/m/` | bilabial nasal |
| `n` | `/n/` | alveolar nasal |
| `p` | `/p/` | voiceless bilabial stop |
| `q` | `/ʔ/` | glottal stop |
| `r` | `/r/` | alveolar trill |
| `s` | `/s/` | voiceless alveolar fricative |
| `t` | `/t/` | voiceless alveolar stop |
| `v` | `/v/` | voiced labiodental fricative |
| `w` | `/w/` | labial-velar approximant |
| `x` | `/ʃ/` | voiceless postalveolar fricative (English "sh") |
| `ż` | `/z/` | voiced alveolar fricative (English "z") |
| `z` | `/t͡s/` | voiceless alveolar affricate (like "ts") |

##### għ and h Rules (CRITICAL)

These are the most important and error-prone rules:

| Rule | Condition | IPA Result | Example |
|------|-----------|------------|---------|
| **għ + i** | `għi` sequence before vowel | `/ɛj/` | `għajjien` → `/ɛj.ˈjɪːn/` |
| **għ + u** | `għu` sequence before vowel | `/ɔw/` | `għuda` → `/ˈɔw.dɐ/` |
| **Word-final għ/h/ħ** | Any of these at end of word | `/ħ/` | `sabigħ` → `/sɐ.ˈbɪːħ/` |
| **Internal għ/h** | Before a consonant or between vowels | vowel lengthening `ː` | `magħna` → `/ˈmɐː.nɐ/` |
| **Long ħ cluster** | `għh`, `hħ`, `ħħ` | `/ħː/` | `agħha` → `/ˈɐħ.ħɐ/` |

**Rule of thumb:** When `għ` or `h` are not word-final and not in `għi`/`għu` clusters,
they function as **vowel-lengthening markers** — lengthen the preceding vowel with `ː`.

##### Final Obstruent Devoicing

Voiced obstruents devoice at the end of a word:

| Letter | Becomes | IPA |
|--------|---------|-----|
| `b` | `p` | `/p/` |
| `d` | `t` | `/t/` |
| `ġ` | `ċ` | `/t͡ʃ/` |
| `g` | `k` | `/k/` |
| `v` | `f` | `/f/` |
| `ż` | `s` | `/s/` |

##### Stress Rules

1. **Monosyllabic words:** No stress marker needed. `/ˈ/` is optional on single syllables.
2. **Polysyllabic words:** Stress is **penultimate** (second-to-last syllable) by default.
3. **Exception:** If the final syllable contains a long vowel (`ː`), stress falls on the
   **ultimate** (last) syllable.

| Word | Syllables | Stress | IPA |
|------|-----------|--------|-----|
| `kelma` | kel·ma | penultimate | `/ˈkɛl.mɐ/` |
| `sabiħ` | sa·bīħ | ultimate (long final) | `/sɐ.ˈbɪːħ/` |
| `għasfur` | għas·fur | penultimate | `/ɐːs.ˈfʊːr/` |
| `ktieb` | ktieb | monosyllabic | `/ktɪːp/` |

##### Formatting Rules

1. Enclose in `/slashes/`: `/ˈkɛl.mɐ/` ✓ — `ˈkɛl.mɐ` ✗ — `[ˈkɛl.mɐ]` ✗
2. Use `ˈ` (U+02C8) before the stressed syllable: `/sɐ.ˈbɪːħ/`
3. Use `.` (period) as syllable boundary: `/ˈkɛl.mɐ/`
4. Use `ː` (U+02D0) for long vowels: `/ɪː/`, `/ɐː/`, `/ʊː/`
5. Use tie bar `͡` for affricates: `/t͡ʃ/`, `/d͡ʒ/`, `/t͡s/`
6. **Never** use `i` for the `ie` vowel — always `/ɪː/`
7. **Never** use `a` for the short a — always `/ɐ/`

#### Dialectal Variants

Add dialectal pronunciations when well-established:

```jsonc
"phonetics": [
  { "dialect": "Standard", "ipa": "/ˈkɛl.mɐ/", "notes": null },
  { "dialect": "Għawdex",  "ipa": "/ˈkɛl.mɐ/", "notes": "Same as Standard" }
]
```

Only add a dialect entry when the pronunciation **differs** from Standard.
Common dialectal differences:

| Feature | Standard | Għawdex |
|---------|----------|---------|
| `ie` → `ì` | `/ɪː/` | `/ɪ/` (shortened) |
| Final `-a` | `/ɐ/` | `/ɐ/` (often identical) |
| `q` realization | `/ʔ/` | `/ʔ/` (identical) |

#### IPA Generation Process

For each entry:
1. Start with the headword, normalized to lowercase NFC
2. Apply `għi` → `/ɛj/`, `għu` → `/ɔw/` rules first
3. Apply word-final `għ`/`h`/`ħ` → `/ħ/`
4. Apply internal `għ`/`h` → vowel lengthening `ː`
5. Apply `ie` → `/ɪː/`
6. Apply final obstruent devoicing
7. Map each grapheme to IPA using the tables above
8. Clean up lengthening markers (orphaned `ː` → bind to preceding vowel)
9. Syllabify (each syllable has one vowel nucleus; use Maximal Onset Principle)
10. Determine stress (penultimate, unless final syllable has long vowel)
11. Place `ˈ` before stressed syllable, `.` between syllables
12. Wrap in `/slashes/`

#### Worked IPA Examples

```
headword: "kelma"       → /ˈkɛl.mɐ/
  kel·ma, stress on penultimate kel

headword: "sabiħ"       → /sɐ.ˈbɪːħ/
  għ→ː after i → sabīħ, then iː → /ɪː/, final ħ → /ħ/
  Stress on ultimate (long vowel in final syllable)

headword: "għasfur"     → /ɐːs.ˈfʊːr/
  Initial għ→ː after a → għasfūr, then aː → /ɐː/, û → /ʊː/
  Final r is not devoiced (r is an approximant, not an obstruent)

headword: "ktieb"       → /ktɪːp/
  ie → /ɪː/, final b → /p/ (devoicing), monosyllabic

headword: "dar"         → /dɐːr/
  Monosyllabic with lengthened a → /ɐː/ (from inherited Arabic long ā)

headword: "qalb"        → /ʔɐlp/
  Final b → /p/ (devoicing), monosyllabic

headword: "għajn"       → /ɛjn/  (or /ɐjn/ depending on dialect)
  għi → ɛj, monosyllabic

headword: "jiġifieri"   → /jɪ.d͡ʒɪː.ˈfɪː.rɪ/
  ġ → d͡ʒ, ie → ɪː, stress on penultimate fī
```

### Step 2.11 — Add Alternative Forms

If the entry has known orthographic variants, dialectal forms, or archaic spellings, add them to the `alternative_forms` array.

**CRITICAL RULE FOR ALTERNATIVE FORM GLOSSES:**
If the scraped entry is itself an alternative form, the scraper may produce definitions containing `"alternative form of [ENTRY2]"`. 
1. **Remove** this definition object from the entry's `definitions` array completely.
2. **Add** the relation to the entry's `alternative_forms` array linking it back to the canonical entry:
   ```jsonc
   "alternative_forms": [
     { "headword": "ENTRY2", "type": "orthographic" } // Type can also be "dialectal", "archaic", "obsolete", etc.
   ]
   ```

If no alternative forms/spelling variants are associated with the entry, set `alternative_forms` to `[]` or omit it.

---

### Step 2.12 — Pattern Prediction (1V Notation)

The system uses **1V notation** where root consonant positions are numbered
(`1`, `2`, `3`…) instead of the old `C`-based notation. For example, the
pattern `CvCvC` is written as `1v2v3` in 1V notation.

#### When to assign a pattern

Patterns (`cv_pattern`, `morph_pattern`) are ONLY valid when ALL of these
conditions hold:

| Condition | Why |
|-----------|-----|
| Root consonants exist (`root_consonants` is not null) | Patterns describe how root consonants map to a word form |
| Single-word headword (no spaces) | Phrases don't follow Semitic templates |
| Not a proper noun (headword starts lowercase) | Proper nouns (surnames, places) don't carry patterns |

If ANY condition fails, leave `cv_pattern` and `morph_pattern` as `null`.
Set `stem` to `"-{headword}-"` only if the headword is a single word (see
Step 2.8). Multi-word phrases get neither a pattern nor a stem.

#### How to derive the CV pattern

For Semitic-origin words that qualify, derive the pattern:

1. Identify the radical consonants from the Semitic root.
2. Replace the first radical with `1`, the second with `2`, the third with `3`, etc.
3. Represent short vowels as `v` (or their specific vowel `a`/`e`/`i`/`o`/`u`)
   and long vowels with a circumflex (`â`, `ê`, `î`, `ô`, `û`). The diphthong
   `ie` is mapped to `ie` in the pattern.
4. Non-root letters (prefixes, suffixes, infixes) remain as literal characters.

| Word | Root | CV Pattern | Notes |
|------|------|------------|-------|
| kiteb | k-t-b | `1v2v3` | CvCvC → 1v2v3 |
| kitba | k-t-b | `1v22a` | CvCCa → 1v22a |
| ktieb | k-t-b | `12ie3` | CCieC → 12ie3 |
| fqir | f-q-r | `12î3` | CCîC → 12î3 |
| ħabib | ħ-b-b | `1v2î3` | CvCîC (geminated root) |
| ħiereġ | ħ-r-ġ | `1ie2v3` | active participle |
| nkiteb | k-t-b | `n12v3` | with prefix `n-` |
| ċagħaq | ċ-għ-q | `1a2a3` | għ is a true consonant in the pattern |
| ċajpar | ċ-j-p-r | `1a23a4` | quadriliteral |

> **Important:** `għ` is treated as a true consonant in the root system — it
> gets its own position number. It does NOT trigger vowel-lengthening in the
> pattern notation (that's a phonetic/orthographic rule, not morphological).

#### Quick reference

| Old (C-based) | New (1V) |
|---------------|----------|
| `CvCvC` | `1v2v3` |
| `CaCaC` | `1a2a3` |
| `CCîC` | `12î3` |
| `CvCCa` | `1v22a` |
| `CâCvC` | `1â2v3` |
| `tCvCvC` | `t1v2v3` |
| `CwejCCa` | `1wej23a` |

---

## 3. Output Format

The refined output is the **same JSONL format** as the input — one JSON object per line, with all the same fields, but with the refined values filled in.

```jsonc
{
  "id": "n-kelma",
  "headword": "kelma",
  "pos": "noun",
  "gender": "feminine",
  "root_consonants": "k-l-m",
  "stem": null,
  "is_loanword": 0,
  "is_inflectable": 0,
  "source_language": "Arabic",
  "source_id": "src-crowd",
  "source_citation": "Wiktionary: kelma",
  "source_title": "Wiktionary",
  "source_year": null,
  "source_page": "https://en.wiktionary.org/wiki/kelma",
  "source_publisher": "Wiktionary",
  "etymology_chain": [
    {
      "relationship": "Inherited from",
      "language": "Arabic",
      "term": "كَلِمَة",
      "definition": "word; speech; short utterance"
    }
  ],
  "etymology_notes": null,
  "definitions": [
    {
      "text_en": "a word, a unit of language",
      "text_mt": "L-iżgħar unità tal-lingwa li għandha tifsira; vokablu",
      "register": "",
      "nuance": ""
    },
    {
      "text_en": "one's say, one's right to speak",
      "text_mt": "Id-dritt jew l-opportunità li wieħed jitkellem; kelmtek",
      "register": "kollokwali",
      "nuance": ""
    }
  ],
  "usage_examples": [
    {
      "mt": "Ma nifhimx din il-kelma; tista' tispjegahieli?",
      "en": "I don't understand this word; can you explain it to me?"
    },
    {
      "mt": "Din il-kelma ġejja mill-Għarbi.",
      "en": "This word comes from Arabic."
    }
  ],
  "related_entries": ["n-kliem", "n-kelmtejn"],
  "tags": ["common"], // English-only tag, nuance/register values are mapped to tags if applicable
  "phonetics": [
    { "dialect": "Standard", "ipa": "/ˈkɛl.mɐ/", "notes": null }
  ],
  "alternative_forms": []
}
```

### Output Rules

1. **One JSON object per line**, no trailing commas, no pretty-printing.
2. **UTF-8 encoding** with `\n` line endings.
3. **Write to `wiktionary-scraper/refined-results/<name>.jsonl`**, matching the source filename.
4. **Preserve entry ordering** from the source file.
5. **Never drop fields.** Every field in the input must appear in the output.
6. **Add new fields** that the scraper doesn't produce: `phonetics` (required), `alternative_forms` (optional).
7. **Never modify `id`, `headword`, `pos`, `source_*` fields** (except `source_language`).
8. **Do NOT overwrite `"curated": true` entries** — copy them through unchanged.
9. **The `tags` array is NOT in the entry body.** Tags go in a separate tags JSONL file with the same structure as the scraper's `--db-output-prefix` format:
   - `<name>-entries.jsonl`: entries with tags omitted from the body
   - `<name>-tags.jsonl`: unique tags (`id`, `name`, `category`, `description`)
   - `<name>-entry_tags.jsonl`: entry-to-tag junction (`entry_id`, `tag_id`)

   However, for single-file JSONL output (no `--db-output-prefix`), include a `tags` array field in each entry object containing the slugified tag names: `["common", "rgħajn"]`.

---

## 4. Quality Checklist

Before writing the output, verify each entry:

### Definitions
- [ ] Every `text_mt` is filled (not null, not empty string)
- [ ] Maltese definitions follow Oxford style (concise, genus+differentia, non-circular) and start with a capitalized letter
- [ ] Multi-sense entries have separate definition objects per sense
- [ ] Maltese orthography is correct (ċ, ġ, ħ, għ, ie, ż)
- [ ] Definition matches the POS (noun pattern for nouns, verb pattern for verbs, etc.)

### Usage Examples
- [ ] At least 1 example per entry (2–3 for common words)
- [ ] Examples are natural, idiomatic Maltese
- [ ] Each example has an English translation
- [ ] Examples show typical constructions and collocations

### Register & Nuance
- [ ] Register is filled where the word is not neutral
- [ ] Nuance is left empty (`""`) unless the POS is `"participle"` (where it must be `"adjective"` or `"noun"`)
- [ ] Semantic nuances are mapped as English-only tags to the entry object `tags` list

### Tags
- [ ] All tags are in English (except `rgħajn` and `hemża`)
- [ ] No morphology tags are assigned
- [ ] No redundant tags (nothing that restates POS, gender, loanword status, etc.)
- [ ] `rgħajn` tag applied correctly (only when għ = etymological ghayn (غ))
- [ ] `hemża` tag applied correctly (only when w/j in root corresponds to hamza)
- [ ] Semantic domain tags are accurate and limited to ≤3
- [ ] Tag slugs use lowercase ASCII-safe characters

### Etymology
- [ ] Missing source-term definitions filled where known
- [ ] `source_language` is not "Uncertain" unless truly unknown
- [ ] `is_loanword` correctly set (0 for Semitic, 1 for Romance/English/etc.)
- [ ] `root_consonants` filled for Semitic-origin words

### Phonetics
- [ ] Every entry has at least a `"Standard"` dialect IPA
- [ ] IPA uses `/slashes/`, not `[brackets]`
- [ ] `ie` is always `/ɪː/` (never `/i/` or `/iː/`)
- [ ] Short `a` is always `/ɐ/` (never `/a/`)
- [ ] Affricates use tie bars: `/t͡ʃ/`, `/d͡ʒ/`, `/t͡s/`
- [ ] `għ`/`h` rules applied correctly (word-final → `/ħ/`, internal → lengthening)
- [ ] Final obstruent devoicing applied (b→p, d→t, ġ→t͡ʃ, g→k, v→f, ż→s)
- [ ] Stress marker `ˈ` placed correctly (penultimate by default)
- [ ] Syllable dots `.` separate each syllable
- [ ] Long vowels marked with `ː`

### Data Integrity
- [ ] All original fields preserved
- [ ] No curated entries modified
- [ ] JSON is valid (no trailing commas, proper escaping)
- [ ] UTF-8 encoding correct (especially Maltese characters: ċ ġ ħ ż)
- [ ] `phonetics` array is present on every entry

---

## 5. Tag Taxonomy Quick Reference

### Tag Categories (for `category` field in tags table)

```
Etymology    — rgħajn, hemża
Domain       — agriculture, anatomy, animals, architecture, art, astronomy, sea, botany, geography, food, commerce, family, physics, war, law, mathematics, medicine, music, politics, religion, crafts, sports, technology, weather, transport, time
Usage        — common, rare, archaic, neologism, purist
Register     — formal, literary, colloquial, archaic, obsolete, technical, dialectal, gozitan, slang, vulgar, euphemistic, figurative, pejorative, childish
```

---

## 6. Appendices

### A. Common Maltese Defining Vocabulary

Use these words freely in definitions. They form the core defining vocabulary.

| Maltese | English |
|---------|---------|
| persuna | person |
| ħaġa | thing |
| annimal | animal |
| pjanta | plant |
| post | place |
| azzjoni | action |
| stat | state, condition |
| kwalità | quality |
| kwantità | quantity |
| għodda | tool |
| sustanza | substance |
| sensazzjoni | sensation, feeling |
| ġrajja | event |
| ħin | time |
| mod | way, manner |
| parti | part |
| grupp | group |
| tip | type, kind |
| bini | building |
| oġġett | object |
| materjal | material |

### B. Orthography Checklist for Maltese

- **ie** = long ī sound (not "ii")
- **għ** = silent/guttural (not "gh" except at end of word)
- **h** = silent at end of word; pronounced /h/ elsewhere
- **x** = /ʃ/ (sh sound)
- **q** = glottal stop /ʔ/
- **ż** = /z/
- **ż** ≠ **z** (ż is voiced /z/, z is voiceless /ts/)
- **ċ** = /tʃ/ (ch sound)
- **ġ** = /dʒ/ (j sound)
- No double vowels except "ie"
- Assimilated article: "il-" before moon letters, "ix-" before "x", "iċ-" before "ċ", etc.

### C. Example: Full Refinement

**Raw (scraped):**
```json
{"id": "n-għasfur", "headword": "għasfur", "pos": "noun", "gender": "masculine", "root_consonants": "għ-s-f-r", "stem": null, "is_loanword": 0, "is_inflectable": 0, "source_language": "Arabic", "source_id": "src-crowd", "source_citation": "Wiktionary: għasfur", "source_title": "Wiktionary", "source_year": null, "source_page": "https://en.wiktionary.org/wiki/g%C4%A7asfur", "source_publisher": "Wiktionary", "etymology_chain": [{"relationship": "Inherited from", "language": "Arabic", "term": "عُصْفُور", "definition": null}], "etymology_notes": null, "definitions": [{"text_en": "a bird", "text_mt": null, "register": "", "nuance": ""}, {"text_en": "a penis (childish)", "text_mt": null, "register": "", "nuance": ""}], "usage_examples": [], "related_entries": []}
```

**Refined:**
```json
{"id": "n-għasfur", "headword": "għasfur", "pos": "noun", "gender": "masculine", "root_consonants": "għ-s-f-r", "stem": null, "is_loanword": 0, "is_inflectable": 0, "source_language": "Arabic", "source_id": "src-crowd", "source_citation": "Wiktionary: għasfur", "source_title": "Wiktionary", "source_year": null, "source_page": "https://en.wiktionary.org/wiki/g%C4%A7asfur", "source_publisher": "Wiktionary", "etymology_chain": [{"relationship": "Inherited from", "language": "Arabic", "term": "عُصْفُور", "definition": "Small bird; sparrow"}], "etymology_notes": null, "definitions": [{"text_en": "a bird", "text_mt": "Annimal vertebrat bir-rix u l-ġwienaħ, ta' demm sħun, li jbid il-bajd", "register": "", "nuance": ""}, {"text_en": "a penis", "text_mt": "Il-pene; kelma tat-tfal għall-ġenitali maskili", "register": "kollokwali", "nuance": ""}], "usage_examples": [{"mt": "Kull filgħodu nisma' l-għasafar ikantaw.", "en": "Every morning I hear the birds singing."}, {"mt": "Rajt għasfur isfar sabiħ ħafna fil-ġnien.", "en": "I saw a very beautiful yellow bird in the garden."}], "related_entries": ["n-għasfur tal-bejt"], "tags": ["animals", "anatomy", "childish", "common"], "phonetics": [{"dialect": "Standard", "ipa": "/ɐːs.ˈfʊːr/", "notes": null}], "alternative_forms": []}
```

### D. Maltese IPA Quick Reference

> **Source:** This mapping is derived from the Il-Migma phonology engine at
> `src/lib/maltesePhonology.ts`. All AI-generated IPA MUST follow this mapping
> to maintain consistency with the application's IPA keyboard and automated
> transcription features.

#### Grapheme → IPA (one-to-one)

| Grapheme | IPA | Grapheme | IPA | Grapheme | IPA |
|----------|-----|----------|-----|----------|-----|
| `a` | `/ɐ/` | `k` | `/k/` | `t` | `/t/` |
| `b` | `/b/` | `l` | `/l/` | `u` | `/ʊ/` |
| `ċ` | `/t͡ʃ/` | `m` | `/m/` | `v` | `/v/` |
| `d` | `/d/` | `n` | `/n/` | `w` | `/w/` |
| `e` | `/ɛ/` | `o` | `/ɔ/` | `x` | `/ʃ/` |
| `f` | `/f/` | `p` | `/p/` | `ż` | `/z/` |
| `ġ` | `/d͡ʒ/` | `q` | `/ʔ/` | `z` | `/t͡s/` |
| `g` | `/ɡ/` | `r` | `/r/` | `ħ` | `/ħ/` |
| `i` | `/ɪ/` | `s` | `/s/` | `j` | `/j/` |

#### Special Grapheme Rules

| Grapheme | Context | IPA |
|----------|---------|-----|
| `ie` | Always | `/ɪː/` |
| `â/ê/î/ô/û` | Circumflex (long vowels) | `/ɐː/ /ɛː/ /ɪː/ /ɔː/ /ʊː/` |
| `għi` | Before vowel | `/ɛj/` |
| `għu` | Before vowel | `/ɔw/` |
| `għ` | Word-final | `/ħ/` |
| `għ` | Internal (non-final) | `ː` (lengthening of preceding vowel) |
| `h` | Word-final | `/ħ/` (or silent in some dialects) |
| `h` | Internal | `ː` (lengthening of preceding vowel) |
| `ħħ`/`għh`/`hħ` | Cluster | `/ħː/` |

#### Final Devoicing

| Letter | Final IPA | Letter | Final IPA |
|--------|-----------|----------|-----------|
| `b` | `/p/` | `g` | `/k/` |
| `d` | `/t/` | `v` | `/f/` |
| `ġ` | `/t͡ʃ/` | `ż` | `/s/` |

#### Stress & Syllabification

| Rule | Description |
|------|-------------|
| Syllable boundaries | `.` (period) between syllables |
| Stress marker | `ˈ` before the stressed syllable |
| Monosyllables | No stress marker (or optional `ˈ`) |
| Polysyllable stress | Penultimate by default |
| Long-final exception | Ultimate stress if final syllable has `ː` |

#### Common IPA Errors to Avoid

| ❌ Wrong | ✅ Correct | Why |
|---------|-----------|-----|
| `[kɛlma]` | `/ˈkɛl.mɐ/` | Use slashes, stress, syllables |
| `kel.ma` | `/ˈkɛl.mɐ/` | Must be IPA, not orthographic |
| `/ˈkɛlma/` | `/ˈkɛl.mɐ/` | Syllable dots required |
| `/iː/` | `/ɪː/` | `ie` → `/ɪː/`, never `/i/` or `/iː/` |
| `/a/` | `/ɐ/` | Short a is `/ɐ/`, not `/a/` |
| `/tʃ/` | `/t͡ʃ/` | Affricates use tie bar |
| `/ɛj/` for `għi` | `/ɛj/` ✓ | OK — this is correct |
| `/ɔw/` for `għu` | `/ɔw/` ✓ | OK — this is correct |

### E. Semitic Wiżen & Word Derivation Reference (Maltese 1v2v3)

This section maps standard Arabic patterns to predicted Maltese Wiżen templates using the **1v2v3** radical consonant notation (where `1`, `2`, `3` represent the radical positions, and `v` / specific vowels represent the vocalic template).

#### Noun & Adjective Derivations

| Pattern | Example | Maltese | 1v2v3 Form | Example | Meaning |
|---|---|---|---|---|---|
| فَعْل | فَهْم, نَصْر | fagħl | `1a23` | | abstract noun, action, concept |
| فِعْل | حِمْل, عِبْء, عِلْم | fegħl | `1e23` | għelm | noun/state |
| فُعْل | قُرْب, بُعْد | fogħol | `1o2o3` | bogħod | abstract quality |
| فَعَل | شَجَر، جَبَل | fagħal/figħel/fegħel | `1v2v3` | ġebel | concrete nouns |
| فَعِل | فَطِن، حَذِر | fegħel | `1e2e3` | | adjective/state |
| فَعُل | صَعُb، حَسُن | fogħol | `1o2o3` | | adjective/state |
| فِعَال | كِتاب , قِتال | fgħâl/fgħiel | `12â3` | ktieb | action/result |
| فُعَال | سُعال، زُكام | fgħâl | `12â3` | | sounds/illnesses |
| فَعَال | جَمَال، كَمال | fgħiel | `12â3` | | qualities |
| فَعَالَة | شَجَاعَة، كِتابة | fgħâla | `12â3a` | btala | profession/action |
| فِعَالَة | زِراعة، صِnaعة | fgħiela/fgħâla | `12â3a` | | occupation/activity |
| فُعُول | دُخول، خُروج | fgħul | `12u3` | dħul, ħruġ | action/result |
| فَعِيل | كَبِير، جَمِيل | fgħil | `12i3` | kbir, fqir | adjective, sometimes noun |
| فَعِيل | | fagħil | `1a2i3` | ħabib, sadiq | noun |
| فَعُول | صَبُور، شَكُور | fgħul | `12u3` | | intensive adjective |
| فَعْلان | غَضبان، عطشان | fagħlân | `1v23ân` | għatxan, għajjien | temporary state |
| فَعْلَى | كُبرى، صُغرى | *fogħla | `*1o23a` | | feminine adjective |
| فَعِلَة | حَذِرَة | fegħla | `1e23a` | ferħa | adjective |
| مَفْعَل | مَجْلِس, مَدْخَل | mifgħel, mafgħal | `mi12e3`/`ma12a3` | miġles, madħal | place noun |
| مَفْعَلَة | | mafagħla, mafgħla | `mv1v23a`/`mv123a` | matfgħa, miżirgħa | place noun |
| مِفْعَال | | mufgħâl, mufgħiel | `mu12â3` | musbieħ, muftieħ, munqar | tool noun |
| مِفْعَل | | mifgħel, mfall | `mi12e3`/`m1v23` | mibred, mqass, mħakka | tool noun |
| مِفْعَلَة | | mifigħla/mifegħla | `mi1v23a` | mikinsa/mikensa | tool noun |
| فَعّal | | fagħgħâl | `1v22â3` | kittieb, kelliem, sajjad | agent noun |
| أَفْعَل | | afgħal | `a12a3` | akbar | comparative |
| أَفْعَل | | afgħal | `a12a3` | aħdar | colour |
| فَعْلاء | | fagħla | `1a23a` | ħadra | colour (feminine) |
| يّ | | -i | `1v23i` | Malti, ċagħqi | nisba adjective |
| فَعْلَال | | fagħlâl, fagħliel | `1v23â4` | | noun (quadriliteral) |
| فَعْلَلَة | | | `1v23v4a` | | noun (quadriliteral) |
| فُعْلُول | | fagħlul | `1v23u4` | | noun (quadriliteral) |

#### Plural Derivations

##### Sound Plurals

| Suffiss | Ġens tan-nisel | 1v2v3 Form | Eżempji | Forom tas-soltu |
|---|---|---|---|---|
| `-ijiet` | Newtral | `-ijiet` | missirijiet | Maġġoranża tal-kliem. |
| `-iet` | Femminili | `-iet` | dnubiet, tfajliet | Il-kelma femminili. |
| `-at` | Femminili | `-3at` | triqat, fergħat, tebgħat | Il-kelma femminili u b’għ, ħ jew q fl-aħħar l-ittra tal-għerq. |
| `-in` | Maskili | `-in` | emmenin, ħallelin, serriqin, magħrufin | Nomi aġenti (`1a22â3`/`1a22ie3`) u partiċipji passivi bil-forma ta’ *mifgħul*. |
| `-n` | Maskili | `-n` | Maltin, Għawdxin, baħrin, beltin, laħmin, xewkin | Kull aġġettiv tan-*nisba*, jiġifieri l-aġġettivi Semitiċi li jtemmu bil-i. |
| `-jin` | Maskili | `-jin` | ħatjin | Kull kelma bl-ittra j fl-aħħar għerqha. |
| `-ien` | Maskili | `-ien` | bibien, għerien | Nomi bl-għerq moħfi. |
| `-an` | Maskili | `-an` | qigħan, ħitan | Nomi bl-għerq moħfi u b’għ, ħ, q jew t fl-aħħar l-ittra tal-għerq. |
| `-ien` | Maskili | `-ien` (special) | għotjien | Dil-kelma biss. |
| `-a` | Newtral/Femminili | `-a` | għalliema, ħaddiema, sajjieda | Nomi aġenti (`1a22al`/`1a22iel`). |

##### Broken Plurals

| Forma | 1v2v3 Form | Għadd l-ittri | Dgħajjef/Sħiħ | Sur il-Fagħal tas-Singular | Forma Għarbija |
|---|---|---|---|---|---|
| fgħiel | `12ie3` | 3 | | fagħal, fegħl, fgħil (għ = fegħiel) | **فِعَال/أَفْعَال** |
| fgħal | `12â3` | 3 | | fâgħel | **فِعَال/أَفْعَال** |
| fgħala | `12â3a` | 3 | | figħlâni | |
| fagħel | `1a2e3` | 3 | | fegħl (fagħla) | |
| figħel | `1i2e3` | 3 | | (figħla) | **فِعَل** |
| fogħol | `1o2o3` | 3 | | afgħal (fagħla/fogħla), fegħl, fgħil | **فُعْل/فُعَل/فُعُل** |
| fgħul | `12u3` | 3 | | fegħl, fogħla, fâgħel (għ = fegħul) | **فُعُول/أَفْعُل** |
| fgħula | `12u3a` | 3 | | fagħal, fagħel | |
| fogħul | `1o2u3` | 3 | | fogħl (ġerminat fit-2ni u t-3et) | **فُعْل/فُعَل/فُعُل** |
| fgħajjel | `12a3je3` | 3 | | fgħala, fgħul, fogħla | **فعائل** |
| fgħali | `12â3i` | 3 | | (fagħla), fagħlija/figħlija | |
| fgħieli | `12ie3i` | 3 | | (figħla) | |
| fogħla | `1o23a` | 3 | | fgħil (fgħila), ġerminat fl-1el u t-2ni | **فُعَلاء** |
| ifgħla | `i123a` | 3 | | figħel, fagħal, fgħiel | **أَفْعِلَة** |
| ofgħla | `o123a` | 3 | | fagħal (*qabar* <=> *oqbra*) | **أَفْعِلَة** |
| fogħgħiel | `1o22ie3` | 3 | | fâgħel | **فُعّال** |
| fgħija | `12i3a` | 3 | | fegħl (għerq ġerminat) | |
| fwiegħel | `1wie2e3` | 3 | | fâgħel, fewgħal (quadlitteral) | **فواعل** |
| fjal | `1jâ3` | 3 | Moħfi | fal | **فِعَال** |
| fjul | `1ju3` | 3 | Moħfi | fal/fiel, fajl/fejl | **فُعُول** |
| filan | `1i3ân` | 3 | Moħfi | fajl | **فِعْلان** |
| filien/felien | `1i3ien`/`1e3ien` | 3 | Moħfi | fal/fiel | **فِعْلان** |
| fjieli | `1jî3i` | 3 | Moħfi | fajl/fejl | |
| fwajjel | `1wa3je3` | 3 | Moħfi | fajl/fejl (fajla/fejla), hamża | |
| fwawal | `1wâ3a4` | 3 | Moħfi | fawla | |
| fojol | `1o3o4` | 3 | Moħfi | fajla/fejla | |
| fuwel | `1u3e4` | 3 | Moħfi | ifwel (*iswed* <=> *suwed* biss) | |
| fwal | `1wâ3` | 3 | Moħfi | fawl | |
| fwiel | `1wie3` | 3 | Moħfi | ful (fula), fewl | |
| fwiegħi | `1wie23i` | 3 | Nieqes | (fiegħja), fuwa | |
| mfagħel/mfagħal | `m1â2v3` | 3 | | mafgħal/mifgħal, mfagħla, mifgħul | **مفاعل/مفاعيل** |
| mifja | `mi1j3a` | 3 | Moħfi+Nieqes | mefa (*mera* <=> *mirja* biss) | |
| fgħalal | `12â3a4` | 4 | | fagħlul, fagħlil | |
| fgħalel | `12â3e4` | 4 | | fagħlul, fagħlil | |
| fgħielel | `12ie3e4` | 4 | | fagħlul, fagħlil, figħlil | |
| fgħagħal | `12â3a4` | 4 | | fagħlal | |
| fgħagħel | `12â3e4` | 4 | | fagħlul, fagħlil | |
| fgħolol | `12o3o4` | 4 | | fgħolla | |

##### Special Patterns

| Forma | Singular | Noti |
|---|---|---|
| nisa | mara | Special |
| snin | sena | Special |
| ulied | iben/bin/bint | Special |
| subien | tifel | Special |
| bniet | tifla | Special |

#### Verb Conjugation Stems (Forms II - X)

| Forma | Mamma | Nom / Verbal Noun | Passiv | Attiv | Mimmat |
|---|---|---|---|---|---|
| **I** | `1a2a3` | `12i3` / `12u3` | `ma12u3` | `1â2e3` | `ma12a3`/`mi12a3` |
| **II** | `1a22a3` | `ta12i3` / `ti12i3` | `m1a22a3` | `1a22ie3` | |
| **III** | `1â2a3` / `1â2a3` | `1e2i3` / `12i3` | `m1ie2a3` | | |
| **V** | `t1a22a3` | `t1a22i3` | `mit1a22a3` | | |
| **VI** | `t1ie2a3` / `t1â2a3` | `t1ie2i3` | `mit1ie2a3` | | |
| **VII** | `n1a2a3` / `nt1a2a3` | | | | |
| **VIII** | `ft1a2a3` | `ft1a2i3` / `ft1e2i3` | | | |
| **IX** | `12ie3` / `12â3` | | `mu12ie3`/`mo12ie3` | | |
| **Xa** | `sta12a3` | `sta12i3` | `mista12a3` | | |
| **Xb** | `st1a22a3` | `st1a22i3` | `mist1a22a3` | | |


