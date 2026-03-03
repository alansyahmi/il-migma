# Il-Miġma' — Project Knowledge Base

> *Il-Miġma'* (lit. "The Collection") is a Maltese lexicographic engine. This `/docs` folder is the single source of truth for architectural decisions, linguistic rules, and hard-learned edge cases.

## Index

| Document | What it covers |
|---|---|
| [schema.md](./schema.md) | Data Schema — every table and field, with semantic explanations |
| [database.md](./database.md) | Database Management — hosting, CLI usage, and manual manipulation |
| [conventions.md](./conventions.md) | Naming Conventions — files, functions, DB columns, IDs |
| [edge-cases.md](./edge-cases.md) | Edge Case Encyclopedia — bugs we fixed, and how to never repeat them |
| [linguistic-rules.md](./linguistic-rules.md) | Linguistic & Logic Rules — the phonology baked into the conjugation engine |

## Quick Architecture Overview

```
src/
├── lib/              ← Pure logic: conjugation, suffixes, terminology, API, DB, AI
├── types/            ← Shared TypeScript interfaces (single index.ts)
├── hooks/            ← React hooks (useRootData)
├── components/       ← UI components (admin modals, widgets)
├── pages/            ← Route-level page components
├── contexts/         ← React context providers
└── data/             ← Static/mock data

functions/api/        ← Cloudflare Pages Functions (server-side HTTP handlers)
db/                   ← SQL schema definitions
```
