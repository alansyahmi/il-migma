# Il-Miġma Lexicographical Definition Standard

---

## 1. Philosophy & Purpose

Il-Miġma follows an **Asymmetrical Monolingual–Bilingual Model**:
1. **Maltese (`text_mt`)**: The primary, authoritative, native lexicographical definition. It follows the rigorous monolingual standards of **Erin Serracino-Inglott's *Il-Miklem Malti*** and modern European lexicography (e.g. Oxford, Académie Française), rooted in shared Semitic structural traditions (Modern Standard Arabic and Modern Hebrew).
2. **English (`text_en`)**: A concise bilingual translation gloss (e.g. `"under, below, beneath"` or `"for, to"`), optimized for quick foreign-language reference and high-speed search indexability.
3. **Usage Notes (`usage_notes`)**: Grammatical rules, syntactic constraints, and phonological alternations live in the dedicated bilingual Usage Notes card, never contaminating the definition string.

---

## 2. Universal Lexicographical Rules

### Rule 1: No Circularity (Tautology Ban)
A definition must **never** begin with or include the headword lemma to define itself.
* ❌ *Bad*: `bħala` defined as `"bħala, fil-kariga ta'..."`
* ❌ *Bad*: `taħt` defined as `"taħt, f'post aktar baxx minn..."`
* ❌ *Bad*: `għal` defined as `"għal, maħsub għal persuna..."`
* ✅ *Good*: `bħala` defined as `"Fil-kariga, fir-rwol jew fil-funzjoni ta'"`
* ✅ *Good*: `taħt` defined as `"F'post jew f'livell aktar baxx minn"`
* ✅ *Good*: `għal` defined as `"Juri l-persuna jew il-ħaġa li tirċievi benefiċċju jew effett"`

### Rule 2: No Direct Calquing of English Glosses
Maltese definitions must not be literal translations of English idiom or syntax. They must express native Maltese semantic and syntactic concepts.
* ❌ *Bad*: `"Azzjoni ta' kif wieħed to enter jew iwettaqha"`
* ❌ *Bad*: `"għal medda ta' żmien"` (calqued directly from "for a period of time")
* ✅ *Good*: `"Jidħol f'post jew spazju magħluq"`
* ✅ *Good*: `"Jindika tul ta' ħin jew dewmien kontinwu"`

### Rule 3: Separation of Senses vs Inflected Forms
Definitions explain *meaning*, not paradigm lists. Never list inflected clitic forms inside a definition string.
* ❌ *Bad*: `ta'` defined as `"tiegħi, tiegħek, tiegħu, tagħha..."`
* ✅ *Good*: `ta'` defined as `"Juri sjieda pussessiva marbuta mal-persuna grammatikali"`

### Rule 4: Pre-Made Controlled Register Vocabulary & Bilingual Storage
Definitions must strictly draw from the 23 controlled pre-made registers. Ad-hoc strings (e.g. `archaic (formal)`, `obsolet`, `spoken`, `popular`) are strictly forbidden.
* **Canonical Key (Preferred)**: Store as a lowercase pre-made identifier (e.g. `"register": "colloquial"`). Il-Miġma's linguistic engine resolves this bilingually across all interface modes (English: *Colloquial*, Maltese Standard: *Kollokwjali*, Maltese Arabised: *Ta' kuljum*).
* **Bilingual Object Format**: If stored explicitly as an object, it must strictly use the pre-made bilingual labels:
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
* **Controlled Vocabulary (23 Pre-Made Registers)**:
  `standard`, `formal`, `informal`, `colloquial`, `slang`, `figurative`, `metaphorical`, `idiomatic`, `literary`, `poetic`, `archaic`, `obsolete`, `technical`, `dialectal`, `restricted`, `vulgar`, `taboo`, `derogatory`, `pejorative`, `humorous`, `euphemistic`, `ecclesiastical`, `jargon`.
* **Dialect Separation**: Pair `"register": "dialectal"` with `"dialect": "Għawdex"`, `"dialect": "Żejtun"`, etc. Never encode dialect localities in the register field.
* **Nuance Separation**: Contextual or rhetorical nuances belong in `"nuance"` or `"usage_notes"`, not in `register`.

---

## 3. Definitional Formulae by Part of Speech (POS)

### A. Prepositions & Spatial Relators (`preposition`)
Prepositions use a two-track contextual formula:
1. **Concrete Spatial / Locative / Directional senses**:
   Use direct relational phrases without meta-verbs:
   * `"F'post jew f'livell aktar baxx minn"` (*taħt*)
   * `"F'post jew f'pożizzjoni ogħla minn, b'kuntatt ma' wiċċ jew mingħajru"` (*fuq*)
   * `"B'moviment lejn jew f'direzzjoni ta'"` (*lejn*)
   * `"Fuq ġewwa jew fil-limiti ta' spazju jew post"` (*fi*)
2. **Abstract / Grammatical / Functional senses**:
   Use standard functional verbs (`Juri...`, `Jindika...`, `Użat biex...`):
   * `"Juri l-persuna jew l-entità li tibbenefika minn azzjoni"` (*għal - benefactive*)
   * `"Jindika l-għodda, il-mezz jew il-mod kif titwettaq azzjoni"` (*bi - instrumental*)
   * `"Juri relazzjoni ta' pussess, oriġini, materjal jew appartenenza"` (*ta' - genitive*)
   * `"Jindika tqabbil jew xebh ma' ħaġa oħra"` (*bħal - comparative*)

---

### B. Verbs (`verb`)
Following **Modern Standard Arabic (*Al-Mu‘jam al-Wasīṭ*)** and **Serracino-Inglott's *Il-Miklem Malti***, verbs are defined in the **3rd person singular masculine imperfective (habitual present)**:

| Category | Maltese Formula | Example |
|---|---|---|
| **Action / Motion** | `Jagħmel / Jimxi / Iqiegħed...` | *daħal*: `"Jidħol f'post jew spazju magħluq minn barra"` |
| **Causative / Transitive** | `Iġiegħel / Iwassal biex...` | *kisser*: `"Iġiegħel ħaġa tinqasam f'biċċiet żgħar b'daqqa jew b'forza"` |
| **State / Condition** | `Ikun fi stat ta' / Jinsab...` | *strieħ*: `"Jinsab fi stat ta' kwiet u jieqaf minn xogħol jew taħbit"` |
| **Communication / Mental** | `Jesprimi / Jaħseb / Juri...` | *ftakar*: `"Iġib f'moħħu tagħrif, ġrajja jew persuna mill-passat"` |

---

### C. Nouns (`noun`)
Following the **Shared Semitic Genus-Differentia Framework** (Arabic *Al-Wasīṭ* / Hebrew *Even-Shoshan*), nouns define the broad category (genus) followed by distinguishing criteria (differentia). High-frequency native synonyms are appended after a semicolon:

| Category | Semitic Formula | Maltese Template | Example |
|---|---|---|---|
| **Tools & Objects** | آلَةٌ لِـ / כְּלִי הַמְּשַׁמֵּשׁ לִـ | `Għodda / strument / apparat użat biex...; [sinonimu]` | *mannara*: `"Għodda magħmula minn xafra tal-ħadid imwaħħla ma' manku tal-injam, użata biex taqta' s-siġar jew tqaċċat l-injam; faStandard"` |
| **Places & Buildings** | مَكَانٌ يُعَدُّ لِـ / מָקוֹם שֶׁבּוֹ | `Post / bini maħsub għal / fejn...; [sinonimu]` | *għorfa*: `"Kamra żgħira maħsuba għall-għixien jew għall-ħażna; kamra"` |
| **Agents & Professions** | مَنْ يَقُومُ بِـ / מִי שֶׁעוֹسֵק בִּـ | `Persuna li tħaddem / taħdem f'...; [sinonimu]` | *furnar*: `"Persuna li xogħolha hu li tagħġen u taħmi l-ħobż; ħabbież"` |
| **Abstract States / Events** | حَالَةُ / מַצָּב שֶׁל | `Stat, qagħda jew sentiment ta'...; [sinonimu]` | *ferħ*: `"Sentiment qawwi ta' kuntentizza u sodisfazzjon kbir; hena"` |

---

### D. Adjectives (`adjective`)
Adjectives describe attributes, qualities, or affiliations, matching Semitic conventions (*dhū / ba'al / mansūb ilā*):

| Category | Maltese Formula | Example |
|---|---|---|
| **Relational / Attributive** | `Li għandu x'jaqsam ma'...; [sinonimu]` | *marittimu*: `"Li għandu x'jaqsam mal-baħar, man-navigazzjoni jew mal-vapuri; tal-baħar"` |
| **Possessive / Qualitative** | `Li għandu / li fih...; [sinonimu]` | *għani*: `"Li għandu ħafna ġid, flus jew proprjetà; sinjur"` |
| **Direct Quality** | `Li hu...; [sinonimu]` | *qasir*: `"Li hu ta' tul jew ta' statura żgħira; mhux twil"` |

---

## 4. Comparison Table: Before vs After

| Headword | Sense | Before (Calqued / Circular) | After (Il-Miġma Standard) |
|---|---|---|---|
| **ta'** | Genitive | `"ta', ta' pussess jew proprjetà"` | `"Juri relazzjoni ta' pussess, appartenenza jew oriġini"` |
| **ta'** | Material | `"magħmul minn, li jikkaratterizza kwalità..."` | `"Juri l-materjal li minnu hi magħmula ħaġa, jew il-karatteristika tagħha"` |
| **taħt** | Spatial | `"taħt, f'post jew livell aktar baxx minn"` | `"F'post jew f'livell aktar baxx minn, mgħotti minn xi ħaġa oħra"` |
| **fuq** | Spatial | `"fuq, f'post jew livell ogħla minn"` | `"F'post jew f'pożizzjoni ogħla minn, b'kuntatt ma' wiċċ jew f'livell superjuri"` |
| **għal** | Benefactive | `"għal, maħsub għal persuna jew benefiċjarju"` | `"Juri l-persuna jew l-entità li tibbenefika minn azzjoni jew li lejha hi maħsuba"` |
| **għal** | Purpose | `"biex, bl-iskop li"` | `"Jindika l-iskop, ir-raġuni jew il-mira ta' għemil"` |
| **bi** | Instrumental | `"bi, bl-użu ta' għodda jew mezz"` | `"Jindika l-għodda, il-mezz jew l-istrument li bih titwettaq azzjoni"` |
| **bħala** | Role | `"bħala, fil-kariga jew fil-funzjoni ta'"` | `"Fil-kariga, fir-rwol jew fil-kapaċità uffiċjali ta'"` |
