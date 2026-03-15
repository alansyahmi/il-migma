# Import Pipeline

This document explains how lexical spreadsheet data moves into the Il-Miġma’ database.

Primary importer: [`scripts/import-xls.mjs`](../scripts/import-xls.mjs).

## 1) Inputs

The importer reads two spreadsheet files from repo root:

- `roots.xls` (root inventory + verb form columns)
- `broken_plural.xlsx` (noun singular/plural and pattern metadata)

## 2) Execution modes

Use npm scripts:

```bash
npm run import:dry
npm run import:all
npm run import:roots
npm run import:nouns
```

Underlying flags:
- `--dry-run` (preview, no DB writes)
- `--execute` (write to DB)
- `--roots-only`
- `--nouns-only`

## 3) Pipeline stages

1. **Environment and DB client boot**
   - Loads `.env` via `dotenv`
   - Connects to Turso using `VITE_TURSO_URL` + `VITE_TURSO_AUTH_TOKEN`
2. **Schema bootstrap (`ensureSchema`)**
   - Reads `db/schema.sql`
   - Executes statements idempotently (best-effort)
3. **Roots import (`importRoots`)**
   - Normalizes raw roots into dash-separated radicals (`k-t-b`)
   - Upserts rows in `roots`
   - Reads Roman numeral columns (I…X) and seeds related verb entries
   - Adds placeholder definitions for searchability/FTS
4. **Noun import (`importBrokenPlurals`)**
   - Parses singular/plural/transcription/gender/gloss/CV pattern
   - Upserts `patterns` by `cv_notation`
   - Inserts noun `entries`
   - Inserts corresponding `definitions` and optional `phonetics`

## 4) Mapping highlights

## roots.xls

- `root` → normalized `roots.consonants`
- `I`, `II`, … `X` → derived verb rows in `entries`
- Verb form label is inferred from Roman numeral column name

## broken_plural.xlsx

- `singular (orthographic)` → `entries.headword`
- `plural (orthographic)` → `entries.noun_plural_forms` (JSON array)
- `gender` → normalized noun gender enum
- `gloss` → `definitions.text_en`
- `CV pattern` → `patterns.cv_notation` + `entries.cv_pattern`
- `singular/plural (transcribed)` → `phonetics` rows (when present)

## 5) Operational guidance

- Always run `npm run import:dry` before execute mode.
- Keep source spreadsheets NFC-normalized for Maltese characters.
- Expect partial legacy data; importer contains defensive normalization.
- For reproducibility, commit schema changes before import changes.

## 6) Troubleshooting

- **Missing env vars:** verify Turso credentials in `.env`.
- **Schema mismatch:** rerun import after syncing latest `db/schema.sql`.
- **Duplicate collisions:** importer uses `INSERT OR IGNORE` for idempotence.
- **Unexpected skipped rows:** check required fields (`root`, singular headword).

## 7) Related files

- [`scripts/import-xls.mjs`](../scripts/import-xls.mjs)
- [`db/schema.sql`](../db/schema.sql)
- [`docs/database.md`](./database.md)
