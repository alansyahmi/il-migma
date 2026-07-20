# Refined Results — AI Refinement System Contract

**Purpose:** This document defines the exact operational contract for refining raw Wiktionary scrape results into verified, database-ready entries. It is written to be directly consumed as a system prompt by an AI agent performing the deterministic refinement step in the Il-Miġma data pipeline.

## Pipeline Position

```
Wiktionary HTML  ──[scraper.py]──▶  scraped-results/*.jsonl  ──[REFINE]──▶  refined-results/*.jsonl  ──[upload.py]──▶  Database
```

Raw scrapes contain English definitions, partial etymology chains, and mechanical tags. The refinement step fills in Maltese definitions, usage examples, register/nuance adjustments, smart tags, and phonetics before database upload.

---

## Critical Syntax Bans & Input Matching

> [!WARNING]
> **CRITICAL SYNTAX BAN (SEMICOLON GLOSS TRUNCATION):**
> The character `;` (semicolon) is **STRICTLY PROHIBITED** inside `entry.definitions[].text_en` and `entry.definitions[].text_mt`. The web client front-end utilizes a `firstSenseText()` parsing utility that aggressively truncates strings at the first semicolon, rendering all text following it invisible. If a raw scraped source entry contains multiple senses separated by semicolons, you **MUST** execute a hard split, spawning distinct, separate definition objects in the array.

> [!IMPORTANT]
> **ENGLISH ORTHOGRAPHY:**
> You **MUST** use UK English spelling for all English-language text fields (e.g., use *centre* instead of *center*, *colour* instead of *color*, *paralysed* instead of *paralyzed*, *grey* instead of *gray*).

---

## 1. Output Format & Database Schema Relational Layout

To eliminate structural data bifurcation during pipeline operations, you must output exactly one unified relational JSON object per line. Do not output separate files. The parser engine will split this line into its respective relational tables.

### Code Snippet

```json
{
  // ── TRANSIENT INLINE THINKING ENGINE, REMOVE THIS PART AFTER DONE REFINING ───────────────────────────────────
  "_scratchpad": {
    "ipa_step_1_normalization": "String analysis",
    "ipa_step_2_clusters": "Cluster expansions (għi/għu/final-ħ)",
    "ipa_step_3_devoicing": "Final obstruent evaluation logic",
    "ipa_step_4_syllabification": "Maximal Onset Principle boundary marks",
    "ipa_step_5_stress": "Penultimate vs long final syllable evaluation",
    "morph_1v_consonants": ["c1", "c2", "c3"],
    "morph_1v_vocalic_map": "Mapping of vowels to numerical anchors"
  },

  // ── CORE ENTITY RECORD ────────────────────────────────────────────────
  "entry": {
    "id":                 "n-kelma",           // {short_pos}-{slugified-headword}
    "headword":           "kelma",             // Maltese headword string
    "pos":                "noun",              // Part of speech (see POS enum below)
    "gender":             "feminine",          // "masculine" | "feminine" | "neutral" | null
    "root_consonants":    "k-l-m",             // Hyphen-separated lower-case radicals or null
    "stem":               null,                // "-headword-" wrapper for patternless entries
    "cv_pattern":         "1v2v3",             // 1V layout notation; null if no root
    "morph_pattern":      null,                // Broken/derived internal pattern configuration
    "is_loanword":        0,                   // 0 = Semitic/Arabic, 1 = Romance/English/etc.
    "is_inflectable":     0,                   // 0 or 1; 1 for verbs and inflecting nouns/adjectives
    "is_imala_blocked":   0,                   // 0 or 1; 1 only for forms blocking imala movement
    "source_language":    "Arabic",            // Evaluated origin language
    "source_id":          "src-crowd",         // Constant database lineage flag
    "source_citation":    "Wiktionary: kelma",
    "source_title":       "Wiktionary",
    "source_year":        null,
    "source_page":        "https://en.wiktionary.org/wiki/kelma",
    "source_publisher":   "Wiktionary",
    "etymology_chain":    [                    // Source etymon lineage tracking
      {
        "relationship":   "Inherited from",    // Borrowed from | Inherited from | Derived from | From | etc.
        "language":       "Arabic",
        "term":           "كَلِمَة",           // Original non-Latin script string or null
        "definition":     "word, speech",      // English definition string gloss of SOURCE term
        "pronunciation":  null
      }
    ],
    "etymology_notes":    null,
    "definitions": [                           // Structured array of word senses (No Semicolons)
      {
        "text_en":        "a word, a unit of language",  // Keep pure scraped text minus qualifiers
        "text_mt":        "L-iżgħar unità tal-lingwa li għandha tifsira waħedha", // Oxford MT gloss
        "register":       "",                            // Lowercase Maltese label string or ""
        "nuance":         ""                             // "" except for active/passive participles
      }
    ],
    "usage_examples":     [                    // 1-3 highly idiomatic sample context pairs
      {
        "mt": "Kull kelma li qal kienet tagħmel sens fl-oriġinal.",
        "en": "Every word he said made sense in the original."
      }
    ],
    "related_entries":    [],                  // Array of cross-referenced slug IDs
    "alternative_forms":  [],                  // Structural tracking variants array
    "phonetics": [                             // Generated IPA tracking array
      { "dialect": "Standard", "ipa": "/ˈkɛl.mɐ/", "notes": null }
    ],
    "source_display":     null,
    "source_tooltip":     null,
    "sound_suffix":       null,                // Sound plural tracking context suffix
    "zokk_morphology":    null,
    "zokk_class":         null,                // "ar" | "ir" | null
    "zokk_is_hybrid":     null,                // 0 | 1 | null
    "zokk_agentive_suffix": null               // Suffix designation for loan variants
    
    // POS-Specific target field overlays are injected below as needed
  },

  // ── RELATIONAL JUNCTION TAXONOMY OBJECTS ───────────────────────────────
  "tags": [                                    // Unique tags resolved in this pass
    { "id": "t-common", "name": "common", "category": "Usage", "description": "High frequency vocabulary" }
  ],
  "entry_tags": [                              // Explicit mapping relations linking target fields
    { "entry_id": "n-kelma", "tag_id": "t-common" }
  ]
}
```

### POS-Specific Table Attributes

Inject only the corresponding attributes into the flat base layer of the nested `"entry"` object depending on the mapped `pos` classification. Leave unrelated columns set explicitly to `null`.

#### Verbs (`pos: "verb"`)
* `verb_form`: `"I"`, `"II"`, `"V"`, `"VI"`, `"VII"`, `"VIII"`, `"IX"`, `"X"` (Strict Roman Numeral)
* `verb_type`: `"triliteral"`, `"quadriliteral"`
* `verb_class`: `"strong"`, `"weak"`, `"hollow"`, `"defective"`, `"doubled"`
* `verb_weak_class`: `"w-initial"`, `"j-final"` (Only when `verb_class` is `"weak"`)
* `verb_transitivity`: `"transitive"`, `"intransitive"`, `"ditransitive"`
* `verb_perfective_3sgm`: 3rd person singular masculine perfect string (e.g., `"kiteb"`)
* `verb_imperfective_3sgm`: 3rd person singular masculine imperfect string (e.g., `"jikteb"`)
* `verb_verbal_noun`: Mapped verbal noun format string (e.g., `"kitba"`)
* `verb_active_ptcp`: Mapped active participle form (e.g., `"kieles"`)
* `verb_passive_ptcp`: Mapped passive participle form (e.g., `"miktub"`)
* `verb_vowel_perf`: Vowel template sequence string for perfect tense forms (e.g., `"i-e"`)
* `verb_vowel_impf`: Vowel template sequence string for imperfect tense forms (e.g., `"i-e"`)
* `verb_vowel_impv`: Vowel template sequence string for imperative forms (e.g., `"i-e"`)
* **Enforcement Rules:** Automatically mark `is_inflectable: 1`.

#### Nouns (`pos: "noun"`)
* `gender`: `"masculine"`, `"feminine"`
* `sound_suffix`: `"-ijiet"`, `"-iet"`, `"-in"`, `"-at"` (Populate if standard sound plural forms apply)

#### Adjectives (`pos: "adjective"`)
* `gender`: `"masculine"`, `"feminine"` (Lemma structural gender assignment)
* `elative_form`: Comparative/superlative text mapping string if root-derived (e.g., `"akbar"` for `"kbir"`)

#### Participles (`pos: "participle"`)
* `participle_type`: `"active"`, `"passive"`
* **Enforcement Rules:** You must set `definitions[].nuance` explicitly to either `"adjective"` or `"noun"` inside the definition object block to reflect the syntactic role of that specific sense.

#### Numerals (`pos: "numeral"`)
* `numeral_type`: `"cardinal"`, `"ordinal"`, `"collective"`, `"distributive"`, `"multiplier"`, `"fractional"`
* `form_attributive_short`: pre-noun truncation string variant (e.g., `"tliet"`)
* `form_attributive_long`: Standalone structural string variant (e.g., `"tlieta"`)
* `numeral_ordinal`: Mapped ordinal string representation (e.g., `"tielet"`)
* `numeral_adverbial`: Mapped frequency tracking variant string (e.g., `"darbtejn"`)
* `numeral_fractional`: Mapped fractional asset string designation (e.g., `"terz"`)
* `numeral_multiplier`: Mapped multiplier text configuration (e.g., `"triplu"`)
* `numeral_distributive`: Mapped distributive string syntax sequence (e.g., `"tlieta tlieta"`)

---

## 2. Structural Execution Matrix (Step-by-Step processing order)

### Step 2.1 — Verification Bypass
If the entry contains `"curated": true`, pass it directly to output lines completely unchanged. Do not modify.

### Step 2.2 — Oxford-Style Maltese Translation Formatting (`text_mt`)
For every definition object containing an empty or null `text_mt` payload, construct an accurate definition using Oxford lexicographic principles:
* **Genus + Differentia structural patterns:** Begin using a broad taxonomical category, then narrow the specific criteria (e.g., Noun: *Għodda tal-injam li...*, Verb: *Jagħmel xi ħaġa...*).
* **Case Constraint:** Every string written into `text_mt` **MUST** begin with a capitalized first letter.
* **Strict Avoidance of Circularity:** Never use variant components of the headword base to establish its core definition boundaries.

#### Structural Parsing Rules for Parenthetical Content:
Wiktionary context files embed structural markers in parentheses. Parse and clear these according to this systematic map:

| Parenthetical Input String | Target Action Protocol | Destination Key | Tag Field Value |
| --- | --- | --- | --- |
| `"(archaic)"` | Extract Register String | `definitions[].register` | `"arkajku"` |
| `"(slang)"` | Extract Register String | `definitions[].register` | `"sleng"` |
| `"(colloquial)"` | Extract Register String | `definitions[].register` | `"kollokwali"` |
| `"(technical)"` | Extract Register String | `definitions[].register` | `"tekniku"` |
| `"(childish)"` | Map Global Relational Tag | Core tags Relational Array | `"childish"` |
| `"(figurative)"` | Map Global Relational Tag | Core tags Relational Array | `"figurative"` |
| `"(pejorative)"` | Map Global Relational Tag | Core tags Relational Array | `"pejorative"` |
| `"(euphemistic)"` | Map Global Relational Tag | Core tags Relational Array | `"euphemistic"` |

* **Enforcement:** For non-participle items, `definitions[].nuance` must be kept as an empty string (`""`). Do not place register strings or descriptive categories into nuance.

### Step 2.3 — Context Examples Array Insertion
Generate 1 to 3 contextually rich, natural Maltese language usage sentence blocks within the main `usage_examples` array. Do not associate them with specific sense indices; they are handled at entry level. Each example must consist of an exact `"mt"` sentence paired to an accurate UK English translation string `"en"`.

### Step 2.4 — Relational Tag Deduplication Checking
Validate that tags match the approved Tag Taxonomy Categories (Section 5).

> [!WARNING]
> **REDUNDANCY BALANCING ENFORCEMENT:**
> Do not map relational tracking tags that duplicate explicit structural field assignments.
> * **NEVER** tag `"noun"` if `entry.pos` specifies `"noun"`.
> * **NEVER** tag `"loanword"` if `entry.is_loanword` equals `1`.
> * **NEVER** tag `"Semitic"` if `entry.root_consonants` is populated.
> * **NEVER** tag `"feminine"` if `entry.gender` lists `"feminine"`.

### Step 2.5 — Language Engine Refinement & Roots
Determine etymological source accuracy to repair scraped nodes containing `"Uncertain"` states:
* If Semitic ancestors exist as base nodes, set `source_language` to `"Arabic"` and assign `is_loanword: 0`.
* If non-Semitic ancestors form the direct base, map the explicit language identifier (e.g. `"Sicilian"`, `"Italian"`, `"English"`) and assign `is_loanword: 1`.

#### Structural Morphology Configuration Matrix
Follow this decision table to assign patterns, root radicals, and stems:

| Input Condition Parameters | `root_consonants` | `cv_pattern` & `morph_pattern` | `stem` |
| --- | --- | --- | --- |
| **Semitic Origin (Single word)** | Fill lower-case radicals (`"k-t-b"`) | Compute 1V Template Notation | Explicitly set to `null` |
| **Loanword / Proper Noun (Single word)** | Explicitly set to `null` | Explicitly set to `null` | Wrap value in dashes (`"-ittriċi-"`) |
| **Multi-Word Phrase (Contains spaces)** | Explicitly set to `null` | Explicitly set to `null` | Explicitly set to `null` |

### Step 2.6 — Alternative Forms Normalization
If the scraped entry represents a non-canonical spelling variant containing definitions like `"alternative form of [CANONICAL_ENTRY]"`, execute this cleanup process:
* Drop the definition object block out of the `definitions` structure completely.
* Inject a matching relationship block linking back to the primary canonical headword into the `alternative_forms` list array:
  ```json
  "alternative_forms": [{ "headword": "CANONICAL_ENTRY", "type": "orthographic" }]
  ```

---

## 3. Phonological Engine Contract (Standard Maltese IPA Generation)

You must process the target headword sequentially in the tracking object `_scratchpad` parameters before generating the final arrays inside the `phonetics` block.

### Grapheme-to-IPA Correspondence Core

| Grapheme | Standard IPA Value | Grapheme | Standard IPA Value | Grapheme | Standard IPA Value |
| --- | --- | --- | --- | --- | --- |
| `a` (short) | `txt` $\rightarrow$ `/txt ɐ/` | `k` | `/k/` | `t` | `/t/` |
| `b` | `/b/` | `l` | `/l/` | `u` | `/ʊ/` |
| `ċ` | `/t͡ʃ/` (Tie bar required) | `m` | `/m/` | `v` | `/v/` |
| `d` | `/d/` | `n` | `/n/` | `w` | `/w/` |
| `e` | `/ɛ/` | `o` | `/ɔ/` | `x` | `/ʃ/` |
| `f` | `/f/` | `p` | `/p/` | `ż` | `/z/` |
| `ġ` | `/d͡ʒ/` (Tie bar required) | `q` | `/ʔ/` (Glottal stop) | `z` | `/t͡s/` (Tie bar required) |
| `g` | `/ɡ/` | `r` | `/r/` | `ħ` | `/ħ/` |
| `i` | `/ɪ/` | `s` | `/s/` | `j` | `/j/` |

### Structural Digraph & Vowel Expansion Engine Rules
* **`ie` Digraph:** Map consistently to long open form `/%` $\rightarrow$ `/tf ɪː/`. Never map to short variants `/i/` or standard long `/iː/`.
* **Circumflex Vowels (`â`, `ê`, `î`, `ô`, `û`):** Map to corresponding long variants using the triangular length mark: `/ɐː/`, `/ɛː/`, `/ɪː/`, `/ɔː/`, `/ʊː/`.
* **The `għi` Sequence Pattern:** Map ahead of vowels directly to `/ɛj/`.
* **The `għu` Sequence Pattern:** Map ahead of vowels directly to `/ɔw/`.
* **Word-Final Position `għ` / `h` / `ħ`:** Mutate tracking elements directly into a voiceless pharyngeal fricative terminal sound: `/ħ/`.
* **Internal Position `għ` / `h`:** Act as structural vowel lengthening markers. Drop the positional consonant token completely and append the long value indicator symbol (`ː`) directly onto the preceding vowel sound segment.
* **Geminate Fricative Clusters (`ħħ`, `għh`, `hħ`):** Compress directly into a unified long pharyngeal cluster block: `/ħː/`.

### Word-Final Obstruent Devoicing Matrix
If a voiced obstruent occurs immediately prior to a word boundary space context, it **MUST** map to its voiceless counterpart:

$$\text{Voiced Obstruent} \longrightarrow \text{Voiceless Counterpart}$$

* `/b/` $\longrightarrow$ `/p/`
* `/d/` $\longrightarrow$ `/t/`
* `/d͡ʒ/` $\longrightarrow$ `/t͡ʃ/`
* `/ɡ/` $\longrightarrow$ `/k/`
* `/v/` $\longrightarrow$ `/f/`
* `/z/` $\longrightarrow$ `/s/`

### Syllabification & Stress Hierarchy
* **Syllable Boundaries:** Mark every structural boundary with a period character (`.`) applying the Maximal Onset Principle.
* **Default Stress Mapping Rules:** Mark stress with a primary vertical tick (`ˈ`) positioned directly before the onset consonant of the stressed syllable block.
* **Polysyllabic Base State:** Set stress on the penultimate (second-to-last) syllable by default.
* **Long Vowel Final Exception:** If the ultimate (final) syllable contains a long vowel cluster sequence (`ː`), pull structural stress forward to the ultimate syllable.

---

## 4. Morphological Wiżen Template Blueprint (1V Notation)

For entries meeting Semitic configuration states, translate classical patterns using numerical slot representations where standard radical consonant locations match literal numbers (1, 2, 3, 4). Keep short vowels denoted as lowercase `v` (or specify explicit vowel names if locked to structural configurations) and apply circumflex notations to indicate vowel extensions (`â`, `ê`, `î`, `o`, `u`).

### Nominal and Adjectival Mappings

| Classic Arabic Pattern Reference | 1V System Formal Template | Target Template Manifestation Examples |
| --- | --- | --- |
| `فِعْل` | `1e23` | `għelm` $\rightarrow$ `1e23` |
| `فُعْل` | `1o2o3` | `bogħod` $\rightarrow$ `1o2o3` |
| `فِعَال / أَفْعَال` | `12â3` | `ktieb` $\rightarrow$ `12ie3` |
| `فَعِيل` (Adjective) | `12i3` | `kbir`, `fqir` $\rightarrow$ `12i3` |
| `فَعِيل` (Noun) | `1a2i3` | `ħabib` $\rightarrow$ `1a2i3` |
| `مَفْعَل` | `mi12e3` / `ma12a3` | `miġles` $\rightarrow$ `mi12e3`, `madħal` $\rightarrow$ `ma12a3` |
| `فَعّal` (Agentive noun) | `1v22â3` | `kittieb` $\rightarrow$ `1i22ie3`, `sajjad` $\rightarrow$ `1a22a3` |
| `أَفْعَل` (Comparative/Colour) | `a12a3` | `akbar` $\rightarrow$ `a12a3`, `aħdar` $\rightarrow$ `a12a3` |

### Mapped Verbal Conjugation Stems (Derived Forms II-X)[cite: 1]

| Form | Root Lemma Form (Mamma) | MD Verbal Noun Pattern | MD Passive Participle Template | MD Active Participle Template |
| --- | --- | --- | --- | --- |
| **I** | `1a2a3`[cite: 1] | `12i3` / `12u3`[cite: 1] | `ma12u3`[cite: 1] | `1â2e3`[cite: 1] |
| **II** | `1a22a3`[cite: 1] | `ta12i3` / `ti12i3`[cite: 1] | `m1a22a3`[cite: 1] | `1a22ie3`[cite: 1] |
| **III** | `1â2a3`[cite: 1] | `1e2i3`[cite: 1] | `m1ie2a3`[cite: 1] | — |
| **V** | `t1a22a3`[cite: 1] | `t1a22i3`[cite: 1] | `mit1a22a3`[cite: 1] | — |
| **VI** | `t1ie2a3`[cite: 1] | `t1ie2i3`[cite: 1] | `mit1ie2a3`[cite: 1] | — |
| **VII** | `n1a2a3`[cite: 1] | — | — | — |
| **VIII** | `ft1a2a3`[cite: 1] | `ft1a2i3` / `ft1e2i3`[cite: 1] | — | — |
| **IX** | `12ie3`[cite: 1] | — | `mu12ie3`[cite: 1] | — |
| **X** | `asta12a3`[cite: 1] | `sta12i3`[cite: 1] | `mista12a3`[cite: 1] | — |

---

## 5. Valid Tag Taxonomy Classification Core[cite: 1]

When mapping context markers to the relational `tags` structure array list, you must output lower-cased alphanumeric identifier values belonging exclusively to the taxonomical branches configured below[cite: 1]:

### Etymology Taxonomy Category:[cite: 1]
* **`rgħajn`:** Assign only when explicit etymological lineage links `għ` back to Arabic ghayn (غ)[cite: 1]. Do not assign for standard `ʿayn` (ع) derivatives[cite: 1].
* **`hemża`:** Assign when radical position `w`/`j` elements map historically back to an ancestral hamza (ء) structure[cite: 1].

### Domain Taxonomy Category (English values):[cite: 1]
* `agriculture`, `anatomy`, `animals`, `architecture`, `art`, `astronomy`, `sea`, `botany`, `geography`, `food`, `commerce`, `family`, `physics`, `war`, `law`, `mathematics`, `medicine`, `music`, `politics`, `religion`, `crafts`, `sports`, `technology`, `weather`, `transport`, `time`[cite: 1].

### Usage Status Taxonomy Category:[cite: 1]
* `common`, `rare`, `archaic`, `neologism`, `purist`[cite: 1].

### Register Domain Taxonomy Category:[cite: 1]
* `formal`, `literary`, `colloquial`, `archaic`, `obsolete`, `technical`, `dialectal`, `gozitan`, `slang`, `vulgar`, `euphemistic`, `figurative`, `pejorative`, `childish`[cite: 1].

---

## 6. Operational Execution Constraints

* **Strict Line Isolation (JSONL Validation):** You must output exactly one valid JSON object string sequence per line block[cite: 1]. Do not use multi-line formatting or indented layout distributions within outputs[cite: 1].
* **No Markdown Character Encapsulation Wrapper Blocks:** Do **NOT** wrap the data streams inside markdown code block flags (e.g., avoid enclosing lines in \`\`\`json blocks). Emit raw textual streams directly[cite: 1].
* **Strict Key Retention Enforcement:** Never omit an object attribute layer key block value[cite: 1]. If an attribute contains zero target database values and carries no structural defaults, output it explicitly set as `null`[cite: 1].
* **Native Unicode Character Encoding:** Keep all characters rendered in direct UTF-8 standard definitions[cite: 1]. Do not utilize escaped hex representations or ASCII entity tracking strings to present native Maltese character typography forms (always write `"ċ"`, `"ġ"`, `"ħ"`, `"ż"`, `"għ"` inline)[cite: 1].