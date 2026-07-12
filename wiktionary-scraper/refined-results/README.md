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

## 1. Input Format

Each line is a JSON object with these fields (from the scraper):

```jsonc
{
  "id":                 "n-kelma",           // {short_pos}-{slugified-headword}
  "headword":           "kelma",             // the headword in Maltese
  "pos":                "noun",              // part of speech (noun, verb, adj, adv, prep, conj, part, art, pron, int, num, intj, participle, verbal_noun)
  "gender":             "feminine",          // "masculine" | "feminine" | "neutral" | null
  "root_consonants":    "k-l-m",             // e.g. "k-t-b" or null if unknown/unanalyzable
  "stem":               null,                // canonical stem reference (usually null from scraper)
  "is_loanword":        0,                   // 0 or 1 (scraper auto-detects from etymology chain)
  "is_inflectable":     0,                   // 0 or 1 (typically 0 from scraper)
  "source_language":    "Arabic",            // origin language or "Uncertain"
  "source_id":          "src-crowd",         // always "src-crowd" from scraper
  "source_citation":    "Wiktionary: kelma",
  "source_title":       "Wiktionary",
  "source_year":        null,
  "source_page":        "https://en.wiktionary.org/wiki/kelma",
  "source_publisher":   "Wiktionary",
  "etymology_chain":    [                    // array of EtymologyNode objects or null
    {
      "relationship":   "Inherited from",    // Borrowed from | Inherited from | Derived from | From | Cognate with | Related to | Via
      "language":       "Arabic",
      "term":           "كَلِمَة",           // source term in original script or null
      "definition":     "word, speech"       // definition of the source term or null (often null!)
    }
  ],
  "etymology_notes":    null,                // free-text etymology notes or null
  "definitions": [                           // array of sense objects
    {
      "text_en":        "a word, a unit of language",  // English definition (from Wiktionary)
      "text_mt":        null,                          // Maltese definition — ALWAYS null, needs filling
      "register":       "",                            // register label — ALWAYS empty, needs filling
      "nuance":         ""                             // semantic nuance — ALWAYS empty, needs filling
    }
  ],
  "usage_examples":     [],                  // ALWAYS empty from scraper; needs filling
  "related_entries":    ["n-kliem"],         // cross-referenced entry IDs
  "curated":            true                 // if present, entry was manually edited; DO NOT overwrite
}
```

### Critical Fields to Fill

| Field | Scraper State | Refinement Target |
|-------|--------------|-------------------|
| `definitions[].text_mt` | Always `null` | Oxford-style Maltese definition |
| `definitions[].register` | Always `""` | Register classification |
| `definitions[].nuance` | Always `""` | Semantic nuance/shade |
| `usage_examples` | Always `[]` | 1–3 natural Maltese sentences |
| `source_language` | Sometimes `"Uncertain"` | Correct origin language |
| `etymology_chain[].definition` | Often `null` | Fill missing source-term glosses |
| `root_consonants` | Sometimes `null` | Fill for Semitic-origin words |
| `is_loanword` | Auto-detected, sometimes wrong | Verify & correct |
| `tags` (in entry_tags) | Mechanical only | Smart semantic tags |
| `phonetics` | **Not present** | Generate IPA for Standard Maltese |
| `stem` | Usually `null` | Fill if a known stem exists |
| `alternative_forms` | **Not present** | Add known spelling variants, dialectal forms |

> **Note on `nuance`:** The `nuance` field exists in the database schema and the TypeScript
> `Definition` type, but it is **not yet rendered** in the frontend UI (EntryCard or Entry page).
> Fill it anyway — the data will surface once the UI catches up.

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
   - Maltese pattern: "annimal mammiferu ..." / "għodda li ..." / "azzjoni ta' ..."

2. **Use the defining vocabulary consistently.** Prefer common, well-understood Maltese
   words in definitions. Avoid defining a rare word with another rare word.

3. **Most common sense first.** If a word has multiple senses, the primary/oldest/most
   frequent sense comes first in the definitions array.

4. **Be concise.** A definition should be one phrase or short sentence. Avoid rambling.

5. **Avoid circularity.** Don't define "kiteb" as "il-kitba" and "kitba" as "l-azzjoni ta' min kiteb."

6. **Use standard Maltese orthography.** Follow Il-Kunsill tal-Malti conventions.
   No dialectal spellings in definitions unless the headword itself is dialectal.

7. **Match the POS.** A noun definition starts with a noun phrase; a verb definition
   typically starts with "li ..." or an infinitive-like structure.

#### Definition Patterns by POS

| POS | Maltese Pattern | Example |
|-----|----------------|---------|
| **noun** | `[artiklu] + [nom] + li/di/ta' + [karatteristika]` | "għodda tal-injam li tintuża biex..." |
| **verb** | `li + [azzjoni]` or verb phrase | "li tagħmel xi ħaġa..." / "tikteb..." |
| **adjective** | `li + [kwalità]` or descriptive phrase | "li għandu kulur aħmar" / "kbir, wiesa'" |
| **adverb** | `b'mod + [aġġettiv]` or adverbial phrase | "b'mod li juri..." / "f'dak il-post" |
| **preposition** | `[kelma] + li + [relazzjoni]` | "kelma li turi r-relazzjoni ta'..." |
| **conjunction** | `[kelma] + li + [funzjoni]` | "kelma li tgħaqqad..." |
| **pronoun** | `[kelma] + li + [tieħu post]` | "kelma li tieħu post l-isem..." |
| **numeral** | `[numru/kelma] + li + [kwantità]` | "in-numru li jiġi wara..." |
| **interjection** | `[kelma] + ta' + [emozzjoni]` | "kelma li tesprimi..." |

#### Examples

```
headword: "dar"
text_en:  "a house, a building for human habitation"
text_mt:  "bini fejn jgħixu n-nies; residenza, abitazzjoni"

headword: "kiteb"
text_en:  "to write"
text_mt:  "li tifforma ittri u kliem fuq wiċċ, speċjalment bil-pinna jew kompjuter"

headword: "sabiħ"
text_en:  "beautiful, pretty, handsome"
text_mt:  "li jogħġob lill-għajn jew lill-moħħ; pjaċevoli fid-dehra"

headword: "malajr"
text_en:  "quickly, fast"
text_mt:  "b'veloċità kbira; fi żmien qasir, b'ħeffa"

headword: "fuq"
text_en:  "on, upon, above"
text_mt:  "f'pożizzjoni ogħla minn xi ħaġa u f'kuntatt magħha; fil-wiċċ ta'"
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
  { "text_en": "a house, a building for human habitation", "text_mt": "bini fejn jgħixu n-nies; residenza, abitazzjoni", "register": "", "nuance": "" },
  { "text_en": "a dynasty, a lineage, a ruling family", "text_mt": "familja jew nisel ta' ħakkiema; dinastija", "register": "storiku", "nuance": "estensjoni metaforika" }
]
```

#### Extracting Parenthetical Qualifiers

Wiktionary English definitions often embed usage notes in parentheses:
`"a horse (archaic)"`, `"a friend (slang)"`, `"money (childish)"`.

**Always extract these into the `register` or `nuance` field** — never leave them
embedded in `text_en`. Clean `text_en` is easier to search and lets the UI format
them consistently (e.g. "(archaic) a horse").

| Embedded in `text_en` | Clean `text_en` | Field to use | Value |
|----------------------|-----------------|-------------|-------|
| `"a horse (archaic)"` | `"a horse"` | `register` | `"arkajku"` |
| `"money (childish)"` | `"money"` | `nuance` | `"tat-tfal"` |
| `"a friend (slang)"` | `"a friend"` | `register` | `"sleng"` |
| `"beautiful (figurative)"` | `"beautiful"` | `nuance` | `"figurattiv"` |
| `"to die (euphemistic)"` | `"to die"` | `nuance` | `"ewfemistiku"` |

**Mapping rule:** If the parenthetical describes a **usage domain** (archaic, slang,
formal, colloquial, technical, literary), it goes in `register`. If it describes a
**semantic shade** (figurative, euphemistic, pejorative, diminutive, childish), it
goes in `nuance`.

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

### Step 2.4 — Assign Register and Nuance

For each definition sense, fill `register` and `nuance` where applicable.

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

#### Nuance Values

Use these to qualify the semantic shade (leave empty for neutral):

| Nuance | When to Use |
|--------|-------------|
| `estensjoni metaforika` | Metaphorical extension of a literal sense |
| `tisgħir` | Diminutive sense |
| `tkabbir` | Augmentative sense |
| `peġġorattiv` | Pejorative/derogatory connotation |
| `meljorattiv` | Positive/elevating connotation |
| `ironiku` | Ironic usage |
| `figurattiv` | Figurative (but not fully metaphorical) |
| `rar` | Rarely used in this sense |
| `tat-tfal` | Childish/child-language usage |

#### Examples

```jsonc
// Archaic literary term
{ "text_en": "a steed, a noble horse", "text_mt": "żiemel nobbli", "register": "letterarju", "nuance": "" }

// Colloquial extension
{ "text_en": "cool, awesome (of a person)", "text_mt": "simpattiku, attraenti", "register": "kollokwali", "nuance": "estensjoni metaforika" }

// Pejorative usage
{ "text_en": "a gossip, a busybody", "text_mt": "persuna li tindaħal f'ħaddieħor", "register": "", "nuance": "peġġorattiv" }
```

### Step 2.5 — Smart Tagging

Assign tags following the taxonomy below. **The key principle: tags should add information
that is NOT already obvious from the entry's POS, headword, or etymology.**

#### Redundancy Rules (CRITICAL)

**NEVER assign a tag that merely restates what the data already says:**

- ❌ Don't tag `noun` on a noun entry — the `pos` field already says it.
- ❌ Don't tag `verb` on a verb entry.
- ❌ Don't tag `misluf` if `is_loanword` is already `1`.
- ❌ Don't tag `għerq semitiku` if `root_consonants` already has a value.
- ❌ Don't tag `femminil` if `gender` is already `"feminine"`.
- ❌ Don't tag `plural` on a noun that's only plural — the POS and definitions say it.
- ❌ Don't tag `Malti` or `ilsien Malti` — everything in the database is Maltese.

**VALID tags add NEW information:** register, domain, morphology type, etymology source,
usage restrictions, semantic categories.

#### Tag Taxonomy

##### A. Etymological Origin Tags

| Tag | Description |
|-----|-------------|
| `għajn` | The letter **għ** represents Arabic **ʿayn** (غ/ع), NOT Romance /g/. Assign to words where għ = etymological ʿayn/ghayn. |
| `latinat` | Word ultimately from Latin, Italian, or Sicilian (even if via another Romance language) |
| `ingliż` | Modern English borrowing |
| `franċiż` | French borrowing |
| `germaniż` | Borrowed from Germanic languages |
| `berberu` | Of Berber/Amazigh origin |
| `feniċju` | Of Phoenician/Punic substrate origin |
| `grieg` | Of Greek origin (ancient or modern) |
| `tork` | Of Turkish/Ottoman origin |
| `spanjol` | Of Spanish origin |

**Rule for `għajn` tag:** Assign ONLY when there is clear etymological evidence that the
`għ` in the word corresponds to Arabic ʿayn (ع) or ghayn (غ). The etymology chain or
source must show Arabic origin. If the `għ` is part of a Romance loanword adaptation
(e.g., orthographic convention, not etymology), do NOT tag `għajn`.

```
Examples:
  għasfur → għ = Arabic ع (ʿayn) → tag: għajn  ✓
  għajn   → għ = Arabic ع (ʿayn) → tag: għajn  ✓
  għax    → għ = Arabic ع (ʿayn) → tag: għajn  ✓
  għar    → għ = Arabic غ (ghayn) → tag: għajn  ✓
  stess   → Romance origin, no għ     → NO għajn tag
  gverta  → għ = orthographic, not ع   → NO għajn tag (it's from Italian "coperta")
```

##### B. Semantic Domain Tags

Assign up to **3** domain tags per entry (fewer is better; only if clearly applicable).

| Tag | Domain |
|-----|--------|
| `agrikoltura` | Agriculture, farming, crops |
| `anatomija` | Body parts, anatomy |
| `annimali` | Animals, fauna |
| `arkitettura` | Architecture, buildings |
| `arti` | Art, aesthetics |
| `astronomija` | Astronomy, celestial |
| `baħar` | Maritime, sea, fishing |
| `botanika` | Botany, plants, flora |
| `ġeografija` | Geography, places, topography |
| `ikel` | Food, drink, cuisine |
| `kummerċ` | Commerce, trade, economy |
| `familja` | Family, kinship |
| `fiżika` | Physics, natural sciences |
| `gwerra` | War, military |
| `liġi` | Law, legal |
| `matematika` | Mathematics |
| `mediċina` | Medicine, health |
| `mużika` | Music |
| `politika` | Politics, governance |
| `reliġjon` | Religion, spirituality |
| `snajja` | Crafts, trades, professions |
| `sport` | Sports, games |
| `teknoloġija` | Technology, computing |
| `temp` | Weather, climate |
| `trasport` | Transport, vehicles |
| `żmien` | Time, temporality |

##### C. Morphological & Grammatical Tags

Assign only when it adds information beyond the POS field:

| Tag | When to Use |
|-----|-------------|
| `semi` | Semitic-origin word following Arabic morphological patterns |
| `mżewweġ` | Geminated root (C2=C3, like k-b-b) |
| `magħlul` | Weak root (contains w, j, or vowel as radical) |
| `mifrud` | Singular-only or uncountable |
| `kollettiv` | Collective noun (describes a group; singulative exists separately) |
| `tad-djalett` | Dialectal variant |
| `għawdxi` | Gozitan dialect specifically |
| `transittiv` | Transitive verb |
| `intransittiv` | Intransitive verb |
| `riflessiv` | Reflexive usage |
| `denominali` | Denominal formation (noun-derived) |
| `deverbali` | Deverbal formation (verb-derived) |

##### D. Usage / Status Tags

| Tag | When to Use |
|-----|-------------|
| `komuni` | Very high-frequency word |
| `rar` | Rare, infrequent |
| `antikwat` | Outdated but still occasionally used |
| `neoloġiżmu` | Neologism, recently coined |
| `purist` | Coined by Maltese language purists (often to replace loanwords) |

#### Tag Assignment Process

For each entry:
1. Check etymology chain → assign up to 2 origin tags
2. Check semantic domain → assign up to 3 domain tags
3. Check morphology → assign relevant morphological tags
4. Sanity check: remove any tag that merely restates existing field values

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

### Step 2.8 — Fill Missing Root Consonants

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

If the entry has known orthographic variants, dialectal forms, or archaic spellings,
add an `alternative_forms` array:

```jsonc
"alternative_forms": [
  { "headword": "kallura", "type": "dialectal" },
  { "headword": "kalora",  "type": "archaic" }
]
```

Types: `"orthographic"`, `"dialectal"`, `"archaic"`, `"abbreviated"`, `"obsolete"`.

If no alternative forms are known, omit the field or set to `[]`.

---

## 3. Output Format

The refined output is the **same JSONL format** as the input — one JSON object per line,
with all the same fields, but with the refined values filled in.

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
      "text_mt": "l-iżgħar unità tal-lingwa li għandha tifsira; vokablu",
      "register": "",
      "nuance": ""
    },
    {
      "text_en": "one's say, one's right to speak",
      "text_mt": "id-dritt jew l-opportunità li wieħed jitkellem; kelmtek",
      "register": "kollokwali",
      "nuance": "estensjoni metaforika"
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
  "tags": ["semi", "għajn", "komuni"],
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
9. **The `tags` array is NOT in the entry body.** Tags go in a separate tags JSONL file
   with the same structure as the scraper's `--db-output-prefix` format:
   - `<name>-entries.jsonl`: entries with tags omitted from the body
   - `<name>-tags.jsonl`: unique tags (`id`, `name`, `category`, `description`)
   - `<name>-entry_tags.jsonl`: entry-to-tag junction (`entry_id`, `tag_id`)

   However, for single-file JSONL output (no `--db-output-prefix`), include a `tags` array
   field in each entry object containing the slugified tag names: `["għajn", "semi", "komuni"]`.

---

## 4. Quality Checklist

Before writing the output, verify each entry:

### Definitions
- [ ] Every `text_mt` is filled (not null, not empty string)
- [ ] Maltese definitions follow Oxford style (concise, genus+differentia, non-circular)
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
- [ ] Nuance is filled where a sense has a special shade
- [ ] Labels use the standard Maltese terms from the taxonomy

### Tags
- [ ] No redundant tags (nothing that restates POS, gender, loanword status, etc.)
- [ ] `għajn` tag applied correctly (only when għ = Arabic ʿayn/ghayn)
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
Etymology    — għajn, latinat, ingliż, franċiż, germaniż, berberu, feniċju, grieg, tork, spanjol
Domain       — agrikoltura, anatomija, annimali, arkitettura, arti, astronomija, baħar, botanika, ġeografija, ikel, kummerċ, familja, fiżika, gwerra, liġi, matematika, mediċina, mużika, politika, reliġjon, snajja, sport, teknoloġija, temp, trasport, żmien
Morphology   — semi, mżewweġ, magħlul, mifrud, kollettiv, transittiv, intransittiv, riflessiv, denominali, deverbali
Usage        — komuni, rar, antikwat, neoloġiżmu, purist
Register     — formali, letterarju, kollokwali, arkajku, obsolet, tekniku, djalettali, għawdxi, sleng, volgari, ewfemistiku
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
{"id": "n-għasfur", "headword": "għasfur", "pos": "noun", "gender": "masculine", "root_consonants": "għ-s-f-r", "stem": null, "is_loanword": 0, "is_inflectable": 0, "source_language": "Arabic", "source_id": "src-crowd", "source_citation": "Wiktionary: għasfur", "source_title": "Wiktionary", "source_year": null, "source_page": "https://en.wiktionary.org/wiki/g%C4%A7asfur", "source_publisher": "Wiktionary", "etymology_chain": [{"relationship": "Inherited from", "language": "Arabic", "term": "عُصْفُور", "definition": "small bird; sparrow"}], "etymology_notes": null, "definitions": [{"text_en": "a bird", "text_mt": "annimal vertebrat bir-rix u l-ġwienaħ, ta' demm sħun, li jbid il-bajd", "register": "", "nuance": ""}, {"text_en": "a penis", "text_mt": "il-pene; kelma tat-tfal għall-ġenitali maskili", "register": "kollokwali", "nuance": "tat-tfal"}], "usage_examples": [{"mt": "Kul filgħodu nisma' l-għasafar ikantaw.", "en": "Every morning I hear the birds singing."}, {"mt": "Rajt għasfur isfar sabiħ ħafna fil-ġnien.", "en": "I saw a very beautiful yellow bird in the garden."}], "related_entries": ["n-għasfur tal-bejt"], "tags": ["għajn", "semi", "annimali", "anatomija", "komuni"], "phonetics": [{"dialect": "Standard", "ipa": "/ɐːs.ˈfʊːr/", "notes": null}], "alternative_forms": []}
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

