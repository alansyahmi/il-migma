---
name: il-migma-lexicography
description: Use when authoring, refining, or auditing dictionary entries in Il-Miġma, including Maltese definition standards, bilingual English glosses, Usage Notes extraction, Semitic genus-differentia patterns, and tautology elimination.
---

# Il-Miġma Lexicographical Standard & Entry Builder

Use this skill whenever authoring, reviewing, importing, or editing entries in Il-Miġma (`docs/1000-words-categories/*.json`, DB migrations, or the admin portal).

---

## 1. Core Model & Philosophy

Il-Miġma adopts an **Asymmetrical Monolingual–Bilingual Architecture**:
1. **Maltese (`text_mt`)**: The primary, authoritative, native lexicographical definition. It follows the rigorous standards of **Erin Serracino-Inglott's *Il-Miklem Malti*** and modern European lexicography (Oxford, Académie Française), rooted in shared Semitic structural traditions (Modern Standard Arabic *Al-Mu‘jam al-Wasīṭ* and Hebrew *Even-Shoshan*).
2. **English (`text_en`)**: A concise translation gloss (e.g. `"under, below, beneath"`, `"for, to"`), optimized for quick foreign-language reference and high-speed search indexability.
3. **Usage Notes (`usage_notes`)**: Grammatical rules, syntactic constraints, and phonological alternations live in the dedicated bilingual Usage Notes card, never contaminating the definition string.

---

## 2. Hard Lexicographical Guardrails

1. **Strict Tautology & Circularity Ban**:
   * A definition must **never** open with or contain the headword lemma to define itself.
   * ❌ *Forbidden*: `bħala` defined as `"bħala, fil-kariga ta'..."`
   * ❌ *Forbidden*: `taħt` defined as `"taħt, f'post aktar baxx minn..."`
   * ❌ *Forbidden*: `għal` defined as `"għal, maħsub għal persuna..."`
   * ✅ *Standard*: `bħala` → `"Fil-kariga, fir-rwol jew fil-kapaċità uffiċjali ta' persuna jew ħaġa"`
   * ✅ *Standard*: `taħt` → `"F'post jew f'livell aktar baxx minn, mgħotti minn xi ħaġa oħra"`
   * ✅ *Standard*: `għal` → `"Juri l-persuna, l-oġġett jew l-entità li lejha hi maħsuba ħaġa"`

2. **No Direct English Calques**:
   * Never translate English idioms word-for-word into Maltese.
   * ❌ *Forbidden*: `"għal medda ta' żmien"` (calqued from "for a period of time")
   * ❌ *Forbidden*: `"Azzjoni ta' kif wieħed to enter jew iwettaqha"`
   * ✅ *Standard*: `"Jindika tul ta' ħin, medda determinata jew appuntament fi żmien stabbilit"`
   * ✅ *Standard*: `"Jidħol f'post jew spazju magħluq minn barra"`

3. **No Clitic Paradigm Enumeration in Definitions**:
   * Definitions explain *meaning*, not morphological paradigm lists.
   * ❌ *Forbidden*: `ta'` defined as `"tiegħi, tiegħek, tiegħu, tagħha..."`
   * ✅ *Standard*: `"Juri sjieda pussessiva marbuta mal-persuna grammatikali meta jingħaqad ma' pronomi mehmuża"`

4. **Zero Forward Slashes Ban**:
   * Forward slashes (`/`) are strictly banned in all text fields (`text_en`, `text_mt`, `notes`, `nuance`, `etymology_notes`). Use commas, "jew", or "or".

5. **Full Maltese Orthography in IDs**:
   * IDs must use full Maltese orthography (e.g. `prep-taħt`, `prep-għall`, `prep-bħall`, `adv-minn-taħt`, `pron-taħtiex`). Never strip ħ, għ, or diacritics in IDs.

6. **Semitic Stems Constraint**:
   * Semitic words must keep `stem: null` (they use `root_consonants`). Non-Semitic loanwords use `stem`.

7. **Mandatory Foreign Script Pronunciation in Etymology Chains**:
   * Whenever an etymology step contains foreign script terms (especially Arabic and Classical Arabic, as well as Greek, Berber/Tifinagh, Sicilian, or Italian), the `pronunciation` field must be populated.
   * ❌ *Forbidden (missing pronunciation)*:
     ```json
     {
       "relationship": "Inherited from",
       "language": "Arabic",
       "term": "أَمَّا",
       "definition": "as for; however, but"
     }
     ```
   * ✅ *Standard (populated with romanized Maltese-style pronunciation)*:
     ```json
     {
       "relationship": "Inherited from",
       "language": "Arabic",
       "term": "أَمَّا",
       "pronunciation": "ammâ",
       "definition": "as for; however, but"
     }
     ```
   * **Core Engine Auto-Generator**: Always use or adhere to `generateForeignScriptPronunciation({ language, term, script })` from `src/lib/foreignScriptPronunciation.ts`.
   * **Arabic Vocalization Standard**: Ensure Arabic etymological headwords in `term` are vocalized with accurate diacritics / harakāt (e.g., `اَلَّذِي`, `أَمَّا`, `إِنْ كَانَ`, `هٰذَا`, `شَيْئًا`, `كُلّ`) so that the core engine generates precise pronunciation strings (`allađî`, `ammâ`, `in kâna`, `hâđâ`, `shay'an`, `kull`).

8. **Arabic Definite Article Convention (`al-`)**:
   * The Arabic definite article *alif lām* (ancestor of Maltese *il-* / *l-*) must **always** be written with a trailing hyphen as `al-` in romanized pronunciation.
   * This applies across all contexts:
     * **Standalone & Articles**: `"pronunciation": "al-"` for `art-il` and `art-l` (`term: "اَلْـ"`).
     * **Prepositional compounds**: `"għalâ + al-"`, `"magħa + al-"`, `"min + al-"`, `"bi + ħâl + al-"`, `"fî + al- + qarîb"`.
     * **Prefixed nouns**: Always hyphenated before the base noun (e.g. `al-waqt`, `al-ġumgħaẗ`, `al-makân`, `al-ghuduwwi`, `al-nahâr`, `al-θulâθâ'`).
     * **Relative Pronoun Fusion**: Arabic relative pronouns with historically fused article are written solid without hyphen: `allađî` (`اَلَّذِي`), `allatî` (`اَلَّتِي`), `allađîna` (`اَلَّذِينَ`).
   * ❌ *Forbidden*: `"al"`, `"alwaqt"`, `"alġumgħaẗ"`, `"alnnahâr"`, `"għalâ + al"`, `"al-lađî"`.
   * ✅ *Standard*: `"al-"`, `"al-waqt"`, `"al-ġumgħaẗ"`, `"al-nahâr"`, `"għalâ + al-"`, `"allađî"`.

9. **Pre-Made Controlled Register Vocabulary & Bilingual Storage**:
   * **Exclusivity of Pre-Made Registers**: Definitions must **only** use the 23 controlled pre-made registers configured in the Il-Miġma registry. Free-form ad-hoc strings (e.g. `archaic (formal)`, `obsolet`, `spoken`, `popular`, `biblical`, `religious`, `traditional`) are **strictly forbidden**.
   * **Bilingual Storage Standards**:
     * **Canonical Key (Preferred)**: Store as a lowercase pre-made identifier (e.g. `"register": "colloquial"`). Il-Miġma's linguistic engine resolves this bilingually across all interface modes (English: *Colloquial*, Maltese Standard: *Kollokwjali*, Maltese Arabised: *Ta' kuljum*).
     * **Bilingual Object Format**: If stored explicitly as a bilingual object, it must strictly use the pre-made labels:
       ```json
       "register": {
         "en": "Colloquial",
         "mt": "Kollokwjali"
       }
       ```
       or with canonical key:
       ```json
       "register": {
         "key": "colloquial",
         "en": "Colloquial",
         "mt": "Kollokwjali"
       }
       ```
   * **Master Table of the 23 Pre-Made Registers**:
     | Canonical Key | English (`en`) | Maltese Standard (`mt`) | Maltese Arabised (`arabised`) | Lexicographical Scope |
     | :--- | :--- | :--- | :--- | :--- |
     | `standard` | Standard | Standard | Miqjiesi | Unmarked baseline speech and writing |
     | `formal` | Formal | Formali | Formali | High register, official, polite, public |
     | `informal` | Informal | Informali | Informali | Casual everyday communication |
     | `colloquial` | Colloquial | Kollokwjali | Ta' kotra | Common spoken idiom, popular speech |
     | `slang` | Slang | Slang | Slang | Subcultural, youth, or street argot |
     | `figurative` | Figurative | Figurattiv | Suri | Non-literal / extended metaphorical sense |
     | `metaphorical`| Metaphorical | Metaforiku | Metaforiku | Expressive transfer of imagery |
     | `idiomatic` | Idiomatic | Idjomatiku | Idjomatiku | Fixed phrasal expression / construction |
     | `literary` | Literary | Letterarju | Ittrari | Elevated prose, belletristic writing |
     | `poetic` | Poetic | Poetiku | Poetiku | Verse, high poetry, classical meter |
     | `archaic` | Archaic | Arkajku | Qadim | Historical / antiquated (Serracino-Inglott / Vassalli) |
     | `obsolete` | Obsolete | Obsolet | Mitfi | Extinct / no longer in active use |
     | `technical` | Technical | Tekniku | Sengħi | Specialized trade, craft, or scientific terms |
     | `dialectal` | Dialectal | Djalettali | Lehġi | Regional / village speech (pair with `dialect` field) |
     | `restricted` | Restricted | Ristrett | Ristrett | Contextually or syntactically constrained |
     | `vulgar` | Vulgar | Volgari | Faħxi | Offensive, obscene, or crude speech |
     | `taboo` | Taboo | Tabù | Maħrum | Culturally / socially forbidden or censured |
     | `derogatory` | Derogatory | Dispreġjattiv | Imżeblaħ | Disparaging or belittling tone |
     | `pejorative` | Pejorative | Peggjorattiv | Ħaqqari | Deprecatory / negative connotation |
     | `humorous` | Humorous | Umoristiku | Daħħieki | Comedic, playful, or jocular expression |
     | `euphemistic` | Euphemistic | Ewfemistiku | Sattari | Softening / polite substitution |
     | `ecclesiastical` | Ecclesiastical | Ekkleżjastiku | Knisi | Religious, church liturgical, or sacerdotal |
     | `jargon` | Jargon | Ġargon | Ġargon | In-group / professional jargon |
   * **Dialect vs Register Separation**: If an entry is dialectal, set `"register": "dialectal"` and specify the location in `"dialect": "Għawdex"`, `"dialect": "Żejtun"`, etc. Never embed village names into the `register` field.
   * **Nuance vs Register Separation**: Oratorical, sermon-specific, or grammatical nuances belong in `"nuance": "..."` or `"usage_notes"`, not in `register`.

---

## 3. Definitional Formulae by Part of Speech (POS)

### A. Prepositions & Spatial Relators (`preposition`)
* **Concrete Spatial / Locative**: Direct relational phrases without meta-verbs:
  * `"F'post jew f'livell aktar baxx minn..."` (*taħt*)
  * `"F'post jew f'pożizzjoni ogħla minn, b'kuntatt ma' wiċċ..."` (*fuq*)
  * `"B'moviment, rotta jew vjaġġ li jimmira lejn..."` (*lejn*)
  * `"Fuq ġewwa jew fil-limiti ta' spazju..."` (*fi*)
* **Abstract / Grammatical**: Functional verbs (`Juri...`, `Jindika...`):
  * `"Juri relazzjoni ta' pussess, appartenenza, proprjetà jew oriġini"` (*ta'*)
  * `"Juri l-persuna, l-oġġett jew l-entità li lejha hi maħsuba ħaġa"` (*għal*)
  * `"Fl-istess post jew kumpanija ta' ħaddieħor, f'azzjoni jew qagħda miftiehma flimkien"` (*ma'*)
  * `"Jindika l-għodda, il-mezz jew l-istrument li bih titwettaq azzjoni"` (*bi*)
* **Articulated Forms (`tal-`, `fil-`, `għall-`, `mal-`, etc.)**:
  * `"Forma magħquda tal-prepożizzjoni [X] mal-artiklu ddeterminat, li tindika [funzjoni]"`
* **Assimilated Forms (`tat-`, `tad-`, `tas-`, `fit-`, etc.)**:
  * `"Varjant fonetiku assimilat ta' [X] quddiem konsonanti koronali [litra]"`

### B. Verbs (`verb`)
Following **MSA *Al-Mu‘jam al-Wasīṭ*** and **Serracino-Inglott's *Il-Miklem Malti***, define verbs in the **3rd person singular masculine imperfective (habitual present)**:
* **Motion / Action**: `"Jidħol f'post...", "Iqiegħed f'post...", "Iħallas..."`
* **Causative / Transitive**: `"Iġiegħel jew iwassal biex..."`
* **State / Condition**: `"Jinsab fi stat ta'...", "Ikun f'qagħda ta'..."`
* **Mental / Speech**: `"Iġib f'moħħu...", "Jesprimi bil-kliem..."`

### C. Nouns (`noun`)
Following the **Shared Semitic Genus-Differentia Framework** (Arabic *Al-Wasīṭ* / Hebrew *Even-Shoshan*): genus + distinguishing features + high-frequency synonym after semicolon:
* **Tools / Objects**: `"Għodda/strument/apparat użat biex...; [sinonimu]"`
* **Places / Buildings**: `"Post/bini maħsub għal/fejn...; [sinonimu]"`
* **Agents / Professions**: `"Persuna li tħaddem/taħdem f'...; [sinonimu]"`
* **Abstract / States**: `"Stat, qagħda jew sentiment ta'...; [sinonimu]"`

### D. Adjectives (`adjective`)
* **Relational / Attributive**: `"Li għandu x'jaqsam ma'...; [sinonimu]"`
* **Possessive / Qualitative**: `"Li għandu/fih...; [sinonimu]"`
* **Direct Quality**: `"Li hu...; [sinonimu]"`

---

## 4. Verification & Audit Workflow

Before committing changes to any category file or importing to the database:
1. **Audit for Tautologies**:
   * Ensure no sense begins with or circular-references its headword.
2. **Audit Slashes**:
   * Run a regex search for `/` in text fields across the file.
3. **Verify Cross-References**:
   * Ensure all `alternative_forms` and `related_entries` target valid entry IDs.
4. **Audit Registers Against Pre-Made Controlled Vocabulary**:
   * Ensure every definition's `register` field is either empty or matches one of the 23 valid pre-made keys (or a bilingual `{ en, mt }` object adhering to the pre-made set). Zero ad-hoc free-text strings permitted.
5. **Audit Foreign Script Etymology Pronunciations**:
   * Ensure all non-Latin / Arabic etymology chain steps have non-empty `pronunciation` fields inferred via `generateForeignScriptPronunciation`.
6. **Run Codebase Verification Suite**:
   * `npm run typecheck`
   * `npm run test:register-localization`
   * `npm run test:foreign-script-pronunciation`
   * `npm run test:batch-import-entries`
   * `npm run build`

