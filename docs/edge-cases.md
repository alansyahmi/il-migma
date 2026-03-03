# Edge Case Encyclopedia

> A living catalogue of bugs we have already fixed. Before touching these areas, **read the relevant entry** to avoid reintroducing the same issue.

---

## EC-001 · `[consonants].js` vs `[id].js` — The Great Parameter Mismatch

**When:** Root page showed "Root not found" despite valid data.

**Root cause:** Cloudflare Pages Functions populate route params from the filename. The files were named `[consonants].js` but the code destructured `const { id } = params`, so `id` was always `undefined`.

**Fix:** Renamed all server function files from `[consonants].js` to `[id].js`. Also updated frontend links to use `root.id` instead of `root.consonants`.

**Rule:** The filename bracket parameter (`[xxx].js`) **must exactly match** the destructured variable name in the handler code.

---

## EC-002 · `is_geminate` Boolean vs `strength: 'geminated'` — Dual Classification

**When:** Geminated verbs required both `is_geminate = true` AND `strength = 'strong'`, creating a confusing dual classification.

**Root cause:** `is_geminate` was added as a legacy flag before `strength` was expanded. The conjugation engine checked both independently, leading to missed cases.

**Fix:** Removed `is_geminate` from the entire stack (types, DB, engine, UI, APIs). Geminated verbs are now exclusively identified by `strength = 'geminated'`. The `VerbStrength` type union was updated to include `'geminated'`.

**Rule:** Never reintroduce a boolean flag for a classification that already exists as an enum value. One source of truth.

---

## EC-003 · JSON Gloss Parsing Crash — Legacy Plain-String Data

**When:** Admin dashboard crashed when opening a root whose `gloss` field contained a plain string like `"to write"` instead of JSON.

**Root cause:** Direct `JSON.parse(root.gloss)` without a try-catch. Legacy rows had plain strings, not the expected `[{en: "...", mt: "..."}]` format.

**Fix:** Created `normalizeRootGloss()` in `adminUtils.ts` that handles: JSON arrays of objects, JSON arrays of strings, single JSON objects, plain strings, `null`, and `undefined`. Same pattern was applied for `normalizeRootEtymology()` and `normalizeRootRelationships()`.

**Rule:** **Never raw-`JSON.parse()` a field that might contain legacy data.** Always use the `normalize*` helpers.

---

## EC-004 · `consonants` UNIQUE Constraint — Homographic Roots

**When:** Attempting to create a second root with the same consonants (e.g. two different meanings of `ħ-r-ġ`) threw a UNIQUE constraint violation.

**Root cause:** The original schema had `UNIQUE(consonants)` on the `roots` table. Linguistically, multiple roots can share the same consonant skeleton.

**Fix:** Removed the UNIQUE constraint via a migration script that: (1) reads existing data, (2) creates a new table without the constraint, (3) copies data preserving defaults, (4) swaps table names. Added ID collision avoidance with numeric suffixes (`k-t-b-2`, `k-t-b-3`).

**Rule:** Root IDs, not consonants, are the primary key. Consonants are searchable but not unique.

---

## EC-005 · Unicode NFC Normalisation — Maltese Character Ghosts

**When:** Searching for `għ` (the Maltese digraph) sometimes failed to match database rows, or roots appeared duplicated.

**Root cause:** The `għ` digraph can be encoded in multiple Unicode forms (NFC vs NFD). User input from the browser may arrive in a different normalisation form than what's stored in the DB.

**Fix:** Added `.normalize('NFC')` to every data insertion point: the `n()` null normaliser, the `decodeURIComponent(id).normalize('NFC')` in GET handlers, and the `consonants.trim().toLowerCase().normalize('NFC')` in POST handlers.

**Rule:** **Every string entering the database must be NFC-normalised.** Check both the insertion path AND the query path.

---

## EC-006 · Dynamic Column Discovery — Schema-Code Desync

**When:** Adding a new column to the `roots` table caused the Admin API to silently ignore it.

**Root cause:** The original PUT handler had a hardcoded list of columns. Any column not in the list was skipped.

**Fix:** Replaced the hardcoded list with `PRAGMA table_info(roots)` at runtime, dynamically building the SET clause from actual database columns. A `mapping` object handles special-case serialisation (JSON fields). The `search.js` endpoint also has a hotfix that runs `ALTER TABLE ... ADD COLUMN` with `.catch(() => {})` to ensure new columns exist on out-of-sync databases.

**Rule:** Never hardcode column lists in CRUD handlers. Use `PRAGMA table_info()` for dynamic discovery.

---

## EC-007 · Relationship Reciprocity — One-Way Synonyms

**When:** Adding root A as a synonym of root B did not automatically add root B as a synonym of root A.

**Root cause:** The `onRequestPut` handler only updated the *current* root's `synonyms` array. The target root was unaware of the relationship.

**Fix:** Added reciprocal update logic in both POST and PUT handlers: after saving the current root's relationships, the server iterates over each synonym/antonym and adds the current root to the target's corresponding array (if not already present).

**Rule:** Relationship changes must be bidirectional. When modifying synonyms/antonyms, always update both sides.

> [!WARNING]
> The current reciprocal logic only **adds** — it does not **remove** from old targets when a relationship is deleted. This is a known limitation. A future improvement should diff old vs new arrays and remove stale references.

---

## EC-008 · `now is not defined` — Server-Side ReferenceError

**When:** Creating or updating a root via the admin API threw `ReferenceError: now is not defined`.

**Root cause:** The `now()` helper function was defined in `roots.js` but not in `[id].js`. Both files needed it for timestamp generation.

**Fix:** Added `const now = () => new Date().toISOString();` to each file that needed it. Also replaced some instances with SQLite's `datetime('now')` for consistency.

**Rule:** Server-side functions are **isolated modules** — they do not share helpers. If a utility is needed in multiple files, it must be defined or imported in each one.

---

## EC-009 · Root Page Mock Data Fallback — Stale Display

**When:** The root page continued to display mock/hardcoded data even after the database had been populated with real entries.

**Root cause:** `Root.tsx` had a `MOCK_ENTRIES` constant and fallback logic that was triggered whenever the API returned fewer results than expected. The fallback silently hid API errors.

**Fix:** Removed all mock data dependencies from `Root.tsx`. Created the `useRootData` hook to centralise fetching with proper error states. API failures now surface as visible error messages.

**Rule:** Never use mock data as a silent fallback in production code. Development mocks belong in `src/data/` only and should be guarded by `import.meta.env.DEV`.

---

## EC-010 · Admin Thesaurus Invisibility — Unparsed JSON in Modal

**When:** The RootFormModal showed empty relationship fields even for roots that had synonyms/antonyms in the database.

**Root cause:** The `Admin.tsx` component was passing the raw JSON string from the API to the modal without parsing it first. The modal expected an array.

**Fix:** Added `normalizeRootRelationships()` parsing in the Admin page before passing data to the modal. Also added a "Teżawru" column to the roots table for at-a-glance visibility.

**Rule:** Always parse JSON fields **before** passing to React components. Components should receive typed objects, never raw JSON strings.

---

## EC-011 · `window.location.reload()` — The Anti-Pattern

**When:** After saving a root from the admin panel on the root page, the browser did a full page reload, losing scroll position and React state.

**Root cause:** The save handler called `window.location.reload()` instead of triggering a data refetch.

**Fix:** Replaced with `refetch()` from the `useRootData` hook, which re-calls the API and updates state without a navigation event.

**Rule:** Never use `window.location.reload()` for data refresh. Always use hook-level refetch functions.
