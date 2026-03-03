# Database Management & Manual Manipulation

> This guide explains how the *Il-Miġma'* data layer is hosted, how to access it, and how to safely perform manual data operations.

---

## 1. Hosting & Infrastructure

- **Engine**: [Turso](https://turso.tech) (libSQL), an edge-hosted SQLite fork.
- **Backend API**: Cloudflare Pages Functions (`functions/api/`).
- **Connection**: Managed via `@libsql/client/web` in the API and `@libsql/client` in scripts.

### Environment Variables
To connect to the database, you need the following (usually in a `.env` file or Cloudflare dashboard):
- `VITE_TURSO_URL`: The `libsql://...` connection string.
- `VITE_TURSO_AUTH_TOKEN`: The JWT access token.

---

## 2. Manual Access

### Remote (Production/Staging)
The primary way to interact with the remote database is via the **Turso CLI**:

```bash
# Enter interactive shell
turso db shell il-migma-db

# Run a SQL script
turso db shell il-migma-db < db/schema.sql
```

### Local Development
For local development, the app often uses a local SQLite file (e.g., `local.db` in the root). You can use any standard SQLite client:

```bash
sqlite3 local.db
```

---

## 3. Data Ingestion (Import Scripts)

The project includes custom scripts to import data from Excel (`.xlsx`) files. These are defined in `package.json`.

| Script | Purpose |
|---|---|
| `npm run import:dry` | Validate the spreadsheet data without writing to the DB. |
| `npm run import:all` | Import everything (roots, entries, nouns, verbs). |
| `npm run import:roots` | Import only the `roots` sheet. |
| `npm run import:nouns` | Import only the `nouns` sheet. |

**Source File**: These scripts typically look for a file named `data.xlsx` or similar in a `data/` or `scripts/` folder. Check `scripts/import-xls.mjs` for the exact path.

---

## 4. Manual Manipulation Rules

If you are writing `INSERT` or `UPDATE` statements manually, you **must** follow these three golden rules:

### Rule 1: NFC Normalisation
Maltese characters like `ċ`, `ġ`, `ħ`, `ż` must be in **NFC (Normalisation Form Composed)**.
- **Visual Check**: If you paste text from some sources, it might be in NFD (decomposed), which breaks search.
- **SQL Tip**: Most SQLite tools don't auto-normalise. Use the Admin Dashboard whenever possible as it normalises everything on save.

### Rule 2: JSON Fields
Many columns in `roots` and `entries` are actually JSON strings stored in `TEXT` columns.
- **Don't**: `UPDATE roots SET gloss = 'writing' WHERE id = 'k-t-b';`
- **Do**: `UPDATE roots SET gloss = '[{"en":"writing","mt":"isawwar kliem fuq superfiċje"}]' WHERE id = 'k-t-b';`

### Rule 3: ID Suffixing
The `id` is the primary key and must be unique. If you add a homographic root, you must suffix the ID:
1. `b-għ-d` (distance)
2. `b-għ-d-2` (hating)

---

## 5. Migrating the Schema

Since Turso is SQLite-based, it does not have a formal migration system like Prisma or Knex. Migrations are performed manually:

1. **Backup**: `turso db backup il-migma-db`
2. **Plan**: Write a SQL script (e.g., `db/migrations/001_add_stems.sql`).
3. **Execute**: Run via `turso db shell`.

> [!IMPORTANT]
> Because SQLite does not support `DROP COLUMN` in older versions or easy `ALTER TABLE` for complex changes (like removing UNIQUE constraints), you often have to follow the "Create-Copy-Swap" pattern:
> 1. Create `new_table` with the desired schema.
> 2. `INSERT INTO new_table SELECT * FROM old_table;`
> 3. `DROP TABLE old_table;`
> 4. `ALTER TABLE new_table RENAME TO old_table;`

---

## 6. Planned: Stem-Pattern Logic

As of current development, we are introducing **Stems** (e.g., `-skriv-`). These will likely reside in a planned `stems` and `stem_pattern_forms` table, mirroring the `roots` logic but for non-Semitic words that behave morphologically like roots.
