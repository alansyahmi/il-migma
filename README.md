# Il-Miġma’

**Il-Miġma’ is an AI-assisted Maltese lexical platform that combines a dictionary, morphology engine, root explorer, and learning workspace into one research-grade interface.**

Il-Miġma’ ("the collection") is built for people who need more than basic definitions: linguists, language learners, educators, lexicographers, and developers building Maltese language tools.

## Who it is for

- **Learners** who want dictionary entries with morphology, roots, IPA, and usage context.
- **Researchers and linguists** who need searchable Semitic root structure and derivational patterns.
- **Teachers and course builders** who need structured lexical data for drills and learning content.
- **Contributors and editors** who need an admin workflow for curating entries, roots, and suggestions.
- **Developers** who want to reuse lexical search and structured morphology through API endpoints.

## Core features

- **Dictionary search** with exact, full-text, gloss, and word-form dimensions.
- **Root explorer** for Semitic consonantal roots, patterns (wiżen), and derived forms.
- **Conjugation engine** that uses root class + vowel sets for generated verb paradigms.
- **Browse mode** for discovery-based exploration beyond direct search.
- **Learning surfaces** such as course/blog pages and scaffolded lexical navigation.
- **AI chatbot assistant** for guided lexical lookup and user support.
- **Admin workspace** for content curation, relationships, and database tooling.
- **Suggestion pipeline** for community contribution and moderation.

## Product surfaces at a glance

- `/search` — dictionary lookup
- `/root-search` and `/root/:id` — root and pattern exploration
- `/conjugator` — morphology/conjugation exploration
- `/chatbot` — AI assistant surface
- `/browse` — exploratory lexical browsing
- `/admin` — editorial + data maintenance workspace
- `/suggest` — suggestion intake

## Stack

- **Frontend:** React 19 + TypeScript + Vite + React Router + Tailwind CSS.
- **Auth:** Clerk.
- **Backend:** Cloudflare Pages Functions (`functions/api/*`).
- **Database:** Turso (libSQL / SQLite-compatible schema).
- **AI integration:** Gemini via `@google/generative-ai`.
- **Storage:** Cloudflare R2 integration support for audio and media workflows.

## Data model highlights

The linguistic model separates abstract morphology from surface forms:

- **`roots`** store consonantal skeletons (e.g. `k-t-b`) and class metadata.
- **`patterns`** store CV/wiżen templates.
- **`root_pattern_forms`** join roots + patterns into realizations.
- **`entries`** store the actual dictionary headwords and lexical attributes.
- **`definitions`, `phonetics`, `dialect_variants`** layer meaning and evidence; etymology is stored on `entries.etymology_chain` and `entries.etymology_notes`.

This makes Il-Miġma’ both searchable for end users and reusable as structured lexical infrastructure.

For contributor-level docs, see:

- [`docs/data-model.md`](./docs/data-model.md)
- [`docs/import-pipeline.md`](./docs/import-pipeline.md)
- [`docs/search-api.md`](./docs/search-api.md)

## Screenshots / demo tour

> Recommended: replace these with GIFs as workflows stabilize.

| Surface | Preview |
|---|---|
| Home | `public/screenshots/home.png` |
| Search | `public/screenshots/search.png` |
| Root Search | `public/screenshots/root-search.png` |
| Conjugator | `public/screenshots/conjugator.png` |
| Chatbot | `public/screenshots/chatbot.png` |
| Browse | `public/screenshots/browse.png` |
| Admin | `public/screenshots/admin.png` |
| Suggest | `public/screenshots/suggest.png` |

## Local setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env` in the project root:

```bash
VITE_TURSO_URL=libsql://<your-db>.turso.io
VITE_TURSO_AUTH_TOKEN=<token>
VITE_CLERK_PUBLISHABLE_KEY=<clerk_publishable_key>
GEMINI_API_KEY=<gemini_key_if_using_chat>
```

For `wrangler pages dev` (`npm run dev:api`), copy `.dev.vars.example` to `.dev.vars` and point it at a Turso clone of production:

```bash
TURSO_URL=libsql://<your-clone>.turso.io
TURSO_AUTH_TOKEN=<token>
CLERK_SECRET_KEY=dummy
```

`file://` database URLs are not supported by the Worker runtime. Use remote `libsql://` or `https://` when running the API locally with Wrangler.

If you want production-like data for testing, clone the live database into a separate Turso branch first and use that branch in `.dev.vars`. Keep the live production DB out of local Pages dev so inserts, deletes, and migrations stay isolated.
If you are also running the Vite frontend locally, set the matching `VITE_TURSO_URL` and `VITE_TURSO_AUTH_TOKEN` in `.env` to the same clone so the UI and Pages Functions read the same dataset.

### 3) Run the frontend

```bash
npm run dev
```

### 4) Run Cloudflare Pages Functions locally

```bash
npm run dev:api
```

### 5) Optional: import lexical data

```bash
npm run import:dry
npm run import:all
```

## Deploy to Cloudflare Pages

This repo is set up as a Cloudflare Pages app with Pages Functions, so the deployment path should stay in Pages mode.

- Build command: `npm run build`
- Output directory: `dist`
- Manual CLI deploy: `npm run deploy` or `npm run deploy:pages`

If a Cloudflare project is using `wrangler deploy`, switch it to Pages deploy instead. `wrangler deploy` targets Workers, which is why it can fail when the project only has a static `dist/` site plus `functions/api/*`.

## Docs index

- [`docs/README.md`](./docs/README.md) — full docs index
- [`docs/data-model.md`](./docs/data-model.md) — contributor-oriented schema and relationships
- [`docs/import-pipeline.md`](./docs/import-pipeline.md) — spreadsheet → DB pipeline
- [`docs/search-api.md`](./docs/search-api.md) — `/api/search` parameters and examples
- [`docs/test-entry-seeding.md`](./docs/test-entry-seeding.md) — test entry payloads and POS coverage
