# Security & Architecture Audit and Fixlist

This document details the critical security vulnerabilities, API key exposures, lifecycle race conditions, logic regressions, and performance leaks identified in the codebase, along with specific remediation instructions.

---

## 🚨 1. [CRITICAL] Admin Authentication Bypass via Query String

### Vulnerability Summary
* **Affected Files**:
  - `functions/api/admin/config.js`
  - `functions/api/admin/db-tools.js`
  - `functions/api/admin/roots.js`
  - `functions/api/admin/roots/[id].js`
  - `functions/api/admin/roots/[id]/hidden-forms.js`
  - `functions/api/admin/stems.js`
  - `functions/api/admin/stems/[id].js`
  - `functions/api/admin/submissions.js`
  - `functions/api/admin/submissions/[id].js`
  - `functions/api/admin/submissions/bulk.js`
  - `functions/api/admin/suffix-catalog.js`
  - `functions/api/admin/sync-roots.js`
  - `functions/api/admin/sync-stems.js`
  - `functions/api/admin/sources.js`
* **Root Cause**:
  In 14 admin Cloudflare Pages Functions endpoints, local development bypass logic inspects the raw URL string:
  ```javascript
  const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
  if (isLocal || !env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') return true;
  ```
  Because `request.url` includes query parameters (e.g. `https://il-migma.pages.dev/api/admin/db-tools?localhost`), any external unauthenticated request with `?localhost` passes this check.
  - In `config.js`, this check runs *before* checking the `Authorization` header, granting unauthenticated write access.
  - In `db-tools.js`, passing any dummy bearer token with `?localhost` allows running arbitrary SQL statements (`handleQuery`) against the production database.

### Remediation Plan
1. Standardize `verifyAdmin` across all admin endpoints by importing a single shared guard or updating the check to verify the actual parsed URL hostname:
   ```javascript
   const url = new URL(request.url);
   const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
   ```
2. Ensure token verification always precedes local bypass unless strictly in an automated dev environment.

---

## 🚨 2. [CRITICAL] Client-Side Gemini API Key Leak

### Vulnerability Summary
* **Affected Files**:
  - `src/lib/gemini.ts`
  - `src/pages/Chatbot.tsx`
  - `src/pages/IsSemmej.tsx`
* **Root Cause**:
  `src/lib/gemini.ts` accesses `import.meta.env.VITE_GEMINI_API_KEY` directly and initializes `@google/generative-ai` in the browser client. Vite automatically statically replaces all `VITE_*` environment variables directly into the client-side JavaScript bundles (`dist/assets/*.js`).
  Consequently, anyone inspecting browser DevTools or network payloads can extract the raw Google AI Studio API key.

### Remediation Plan
1. Route all Gemini AI requests through the serverless Cloudflare Functions proxy (`functions/api/chat.js` and an endpoint for `is-semmej`).
2. Remove `VITE_GEMINI_API_KEY` from `.env` and `src/lib/gemini.ts`; store `GEMINI_API_KEY` strictly in server-side environment variables (`.dev.vars` / Cloudflare Dashboard).
3. Update `Chatbot.tsx` and `IsSemmej.tsx` to communicate exclusively via `fetch('/api/chat', ...)` and `fetch('/api/semmej', ...)`.

---

## ⚠️ 3. [HIGH] Terminology Key Shadowing & Test Assertion Failure

### Vulnerability Summary
* **Affected Files**:
  - `src/lib/terminology.ts` (lines 232 & 846, 235 & 852)
  - `scripts/terminologyLocalization.test.mjs`
* **Root Cause**:
  `'archaic'` and `'dialectal'` are defined twice in `src/lib/terminology.ts`:
  - Line 232 defines `'archaic'` as `{ en: 'Archaic', standard: 'Arkajka', arabised: 'Arkajka' }` (feminine agreement for *Forma Arkajka*).
  - Line 846 redefines `'archaic'` as `{ en: 'Archaic', standard: 'Arkajku', arabised: 'Qadim' }` (masculine agreement for *Reġistru Arkajku*).
  Because registers already use the prefix `'reg-archaic'` via `resolveRegisterTerm`, the duplicate unprefixed key at line 846 clobbers line 232, causing `npm run test:terminology-localization` to fail.

### Remediation Plan
1. Delete redundant unprefixed duplicate keys (`archaic` and `dialectal`) in the register definition block of `src/lib/terminology.ts`.
2. Ensure `resolveRegisterTerm` relies on the explicit `reg-` prefixed entries.

---

## ⚠️ 4. [HIGH] Entry & Pattern View Race Conditions / Unmounted State Updates

### Vulnerability Summary
* **Affected Files**:
  - `src/pages/Entry.tsx` (`EntryPage` lines 6434–6446)
  - `src/pages/Pattern.tsx` (lines 113–125)
* **Root Cause**:
  `apiGetEntry(id)` and `apiGetPattern(id)` fetch asynchronously within `useEffect` without an `isMounted` or cancellation flag or `AbortController`.
  Rapidly navigating between words (e.g. searching or clicking related entries) leads to out-of-order resolution where older slow requests overwrite newer entry data, while triggering state updates on unmounted components.

### Remediation Plan
1. Introduce cancellation tokens or `isMounted` checks matching the pattern already used in `src/pages/Home.tsx`:
   ```tsx
   useEffect(() => {
       let cancelled = false;
       setLoading(true);
       apiGetEntry(id)
           .then(res => { if (!cancelled) setEntry(res.entry); })
           .catch(() => { if (!cancelled) setEntry(null); })
           .finally(() => { if (!cancelled) setLoading(false); });
       return () => { cancelled = true; };
   }, [id]);
   ```

---

## ⚠️ 5. [MEDIUM] Search Query Read Exhaustion via `PRAGMA table_info`

### Vulnerability Summary
* **Affected File**:
  - `functions/api/search.js` (lines 117–118)
* **Root Cause**:
  Every search query and debounced autocomplete keystroke issues a synchronous database query to inspect table schema:
  ```javascript
  const entryColumns = await db.execute('PRAGMA table_info(entries)');
  const hasEntryStatus = entryColumns.rows.some((column) => column.name === 'status');
  ```
  This adds network latency to every keystroke and burns Turso row-read quotas unnecessarily.

### Remediation Plan
1. Cache `hasEntryStatus` at the worker isolate module level:
   ```javascript
   let cachedHasEntryStatus = null;
   // In request:
   if (cachedHasEntryStatus === null) {
       const entryColumns = await db.execute('PRAGMA table_info(entries)');
       cachedHasEntryStatus = entryColumns.rows.some((column) => column.name === 'status');
   }
   ```

---

## ℹ️ 6. [LOW] Pruned Test Scripts in `package.json`

### Vulnerability Summary
* **Affected File**:
  - `package.json`
* **Root Cause**:
  37 test commands in `package.json` reference `.test.mjs` files that were removed in previous cleanup commits, failing with `MODULE_NOT_FOUND`.
  Additionally, existing active tests (such as `scripts/homographGrouping.test.mjs`) lack corresponding script entries in `package.json`.

### Remediation Plan
1. Prune missing test commands from `package.json`.
2. Add npm scripts for all verified test files currently in `scripts/`.
