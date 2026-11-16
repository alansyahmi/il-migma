# Stem Stripping & Affix Rules (*Iz-Zokk*)

> Canonical specification for deriving hyphen-delimited **Zokk stems** (`-stem-`) for non-Semitic / loanword entries in *Il-Miġma'*.
> Source of truth in code: [`src/lib/stemStripping.ts`](../src/lib/stemStripping.ts) (also rendered as a live guide under **Stem Search** on the website).

---

## Core Principles

1. **Semitic vs Non-Semitic Separation**:
   - Semitic entries **never** receive a `stem` (`stem: null`); they use `root_consonants` (e.g. `k-t-b`, `m-j-w`, `'-l-f`), `cv_pattern`, and `morph_pattern`.
   - Romance, English, and other non-Semitic loanwords use `root_consonants: null` and a canonical **hyphen-delimited Zokk stem** formatted as `-base-`.
2. **Strip All Productive Affixes**:
   - Do not store unstripped surface lemmas (`"biljun"`, `"żero"`, `"ċajtier"`) as `stem`.
   - Strip all inflectional endings, derivational suffixes, and separable derivational prefixes so cognate words group together on the same Stem page (e.g. `kwadruplu` + `kwadriljun` → `-kwadr-`, `deċmu` + `deċuplu` + `deċiljun` → `-deċ-`, `triljun` + `triplu` → `-tri-`).
3. **Orthographic Alignment for Variant Spellings**:
   - Phonetic or spelling variants of the same loanword share the canonical orthographic stem where helpful (e.g. `zero` + `żero` → `-żer-`, `sistiljun` + `sestiljun` → `-sest-`).
4. **Multi-Root Semitic Phrases**:
   - Phrasal entries built around a single Semitic root carry that root with `stem: null` (e.g. `elf l-eluf` → `'-l-f`).
   - Expressions combining multiple distinct roots keep `root_consonants: null` and `stem: null` (e.g. `għaxar mitt elf`).

---

## Affixes Stripped Going Forward

### 1. Numeral Scale, Multiplicative & Ordinal Suffixes
| Affix | Role | Examples (`headword` → `stem`) |
|---|---|---|
| `-iljun` / `-ljun` | Large-scale cardinals | `biljun` → `-bi-`, `triljun` → `-tri-`, `kwadriljun` → `-kwadr-`, `kwintiljun` → `-kwint-`, `sestiljun` → `-sest-`, `settiljun` → `-sett-`, `ottiljun` → `-ott-`, `noniljun` → `-non-`, `deċiljun` → `-deċ-` |
| `-uplu` / `-plu` | Multiplicatives | `triplu` → `-tri-`, `kwadruplu` → `-kwadr-`, `kwintuplu` → `-kwint-`, `sestuplu` → `-sest-`, `settuplu` → `-sett-`, `ottuplu` → `-ott-`, `nonuplu` → `-non-`, `deċuplu` → `-deċ-`, `ċentuplu` → `-ċent-` |
| `-imu` / `-mu` / `-av` | Romance ordinals & fractions | `settimu` → `-sett-`, `deċmu` → `-deċ-`, `ottav` → `-ott-` |

### 2. Nominal & Adjectival Derivational Suffixes
| Affix | Role | Examples |
|---|---|---|
| `-ier` / `-iera` | Agentive / habitual quality | `ċajtier` → `-ċajt-` |
| `-ali` / `-jali` | Relational adjective | `ċentrali` → `-ċentr-`, `ċelestjali` → `-ċelest-` |
| `-iku` / `-ika` | Technical / learned adjective | `ċentriku` → `-ċentr-`, `ċikloniku` → `-ċiklon-` |
| `-abbli` / `-ibbli` | Possibility / capability adjective | `ċensurabbli` → `-ċensur-` |
| `-iż` / `-iża` | Demonym / origin | `Ċiniż` → `-Ċina-` |
| `-tura` / `-azzjoni` / `-izzjoni` / `-erija` / `-ità` / `-tà` / `-iżmu` / `-ist(a)` / `-ment` | Abstract nouns, collectives, practitioners | `ċanfrinatura` → `-ċanfrin-` |

### 3. Inflectional & Thematic Terminal Endings
| Affix | Role | Examples |
|---|---|---|
| `-u` / `-o` / `-a` / `-e` / `-i` | Singular thematic / gender vowel | `żero` → `-żer-`, `doppju` → `-doppj-`, `ċertu` → `-ċert-`, `ċelebri` → `-ċelebr-` |
| `-i` / `-iet` / `-ijiet` / `-s` / `-es` | Plural inflections | `biljuni` → `-bi-`, `żerijiet` → `-żer-` |

### 4. Verbal Zokk & Participial Endings
| Affix | Role | Notes |
|---|---|---|
| `-a` / `-i` / `-ar` / `-ir` / `-ixx-` | Loan verb citation / class markers | Used directly by `zokkEngine.ts` (e.g. `ipparkja` → `-ipparkj-`) |
| `-at` / `-it` / `-ant` / `-ent` / `-ment` | Participles & deverbal nouns | Stripped back to verbal Zokk stem |

### 5. Separable Derivational Prefixes
| Prefix | Role | Notes |
|---|---|---|
| `arċi-`, `anti-`, `dis-`, `eks-`, `in-` / `im-`, `kontra-`, `mikro-`, `pre-`, `ri-` / `re-`, `sotto-`, `super-`, `ultra-` | Productive loan prefixes | Stripped when deriving transparently from an attested base stem (e.g. `arċisqof` → `-isqof-`) |
