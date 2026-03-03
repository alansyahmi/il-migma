# Naming Conventions

---

## File Naming

| Layer | Convention | Examples |
|---|---|---|
| **Pages** | PascalCase `.tsx` | `Root.tsx`, `Admin.tsx`, `AdvancedSearch.tsx` |
| **Components** | PascalCase `.tsx` | `RootFormModal.tsx`, `ConjugationTable.tsx` |
| **Lib (logic)** | camelCase `.ts` | `conjugationEngine.ts`, `suffixEngine.ts`, `adminUtils.ts` |
| **Hooks** | `use` + PascalCase `.ts` | `useRootData.ts` |
| **Server functions** | kebab-case or `[param].js` | `roots.js`, `[id].js`, `hidden-forms.js` |
| **Types** | `index.ts` only | Single barrel file at `src/types/index.ts` |

---

## Function Naming

### Client-Side (`src/lib/`)

| Prefix | Meaning | Example |
|---|---|---|
| `gen*` | **Generator** — produces a full conjugation table from root data | `genStrong()`, `genHollow()`, `genFormIIStrong()` |
| `generate*` | **High-level generator** — public entry point | `generateConjugation()`, `generateRootForms()` |
| `apply*` | **Transformer** — mutates a stem string | `applyDo()`, `applyIo()`, `applyReverseImala()`, `applyAttachedShift()` |
| `build*` | **Builder** — assembles a compound output from parts | `buildPrefix()`, `buildVerbForm()`, `buildPerfectForm()`, `buildRootPayload()`, `buildEntryPayload()` |
| `parse*` | **Parser** — extracts structured data from a string | `parseVset()` |
| `normalize*` | **Normaliser** — safely parses JSON with fallbacks for legacy data | `normalizeRootGloss()`, `normalizeRootEtymology()`, `normalizeRootRelationships()` |
| `is*` / `has*` / `needs*` | **Guard** — boolean predicate | `isGuttural()`, `isPharyngeal()`, `hasIorE()`, `needsIl()` |
| `get*` | **Accessor** — retrieves or derives a value | `getDoLabels()`, `getIoLabels()`, `getAudioUrl()` |
| `api*` | **API client** — calls a Cloudflare Pages Function | `apiSearch()`, `apiGetRoot()`, `apiGetEntry()`, `apiChat()` |
| `admin*` | **Admin API client** — authenticated admin CRUD call | `adminListRoots()`, `adminCreateEntry()`, `adminUpdateRoot()` |
| `n()` | **Null normaliser** — converts empty strings/undefined to `null` and NFC-normalises strings | Used in both client (`adminSchema.ts`) and server (`roots.js`) |

### Server-Side (`functions/api/`)

| Export | Meaning |
|---|---|
| `onRequestGet` | HTTP GET handler |
| `onRequestPost` | HTTP POST handler (create) |
| `onRequestPut` | HTTP PUT handler (update) |
| `onRequestDelete` | HTTP DELETE handler |
| `verifyAdmin()` | Check Clerk JWT for admin role; bypassed in localhost dev |
| `db()` | Create a Turso client from env vars |
| `json()` | Wrap a response in JSON with CORS headers |
| `unauthorized()` | Return a 401 response |
| `n()` | Same null normaliser as client-side |

---

## Database Column Naming

| Convention | Examples |
|---|---|
| `snake_case` always | `vowel_set_perf`, `root_pattern_form_id`, `is_loanword` |
| Boolean fields use `is_` or flag `INTEGER 0/1` | `is_loanword`, `is_ai_generated`, `is_active`, `is_lifetime` |
| JSON array fields are named as plurals | `synonyms`, `antonyms`, `tags`, `noun_plural_forms` |
| FK columns end in `_id` | `entry_id`, `root_id`, `pattern_id`, `user_id` |
| Timestamps use `_at` suffix | `created_at`, `updated_at`, `generated_at`, `last_used_at` |
| Verb-specific fields prefixed `verb_` | `verb_class`, `verb_form`, `verb_perfective_3sgm` |
| Noun-specific fields prefixed `noun_` | `noun_gender`, `noun_singular`, `noun_plural_forms` |
| Adjective-specific fields prefixed `adj_` | `adj_masculine`, `adj_feminine`, `adj_plural` |

---

## Root ID Convention

Root IDs default to the consonant string (e.g. `k-t-b`). When two roots share the same consonants (homographic roots with different meanings), a numeric suffix is appended:

```
k-t-b       ← first root with these consonants
k-t-b-2     ← second root with same consonants
k-t-b-3     ← third, etc.
```

This collision-avoidance logic lives in `functions/api/admin/roots.js` (POST handler).

---

## TypeScript Type Naming

| Convention | Examples |
|---|---|
| Interfaces: PascalCase nouns | `Entry`, `Root`, `ConjugationRow`, `VerbMorphology` |
| Type aliases: PascalCase | `VerbStrength`, `WeakClass`, `LinguisticMode`, `POS` |
| Enums: string union types (no `enum` keyword) | `type Tier = 'basic' \| 'pro' \| 'enterprise'` |
| Internal admin types prefixed `Root*` | `RootFormData`, `RootGloss`, `RootEtymology` |
| Private UI-only fields prefixed `_` | `_rootConsonants`, `_formLabel`, `_hasDual`, `_weakClass` |

---

## Component Prop Naming

| Pattern | Meaning |
|---|---|
| `on*` | Event callback from parent | 
| `is*` / `has*` | Boolean state flags |
| `initial*` | Default values for form fields |
| `mode` | Rendering variation (`'standard' \| 'arabised'`) |
