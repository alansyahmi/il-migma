# Database — Access & Management

> How the *Il-Miġma'* data layer is hosted, how to access it locally, and how to safely perform manual data operations.

---

## 1. Hosting & Infrastructure

| Layer | Technology |
|---|---|
| Engine | [Turso](https://turso.tech) (libSQL — edge SQLite fork) |
| Backend API | Cloudflare Pages Functions (`functions/api/`) |
| Client library | `@libsql/client/web` (API functions) · `@libsql/client` (scripts) |

---

## 2. Local Development Access

### 2.1 Dev database target

`npm run dev:api` uses a remote Turso/libSQL database through Pages Functions. It does not use a repo-local SQLite file.

For safe testing, point `.dev.vars` at a **clone of production** rather than the live production database. That keeps real data shape available while isolating local inserts, deletes, and migrations.

| Target | Purpose |
|---|---|
| Production clone | Recommended target for `npm run dev:api` and UI testing |
| Live production DB | Use only when you explicitly want to exercise the real dataset |
| Repo-local SQLite files | Legacy/scratch artifacts; not used by Wrangler Pages dev |

### 2.2 Environment variables (`.dev.vars`)

Wrangler reads **`.dev.vars`** (not `.env`) for local secrets. It must contain:

```ini
TURSO_URL=libsql://il-migma-alansyahmi.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=<jwt>
CLERK_SECRET_KEY=dummy   # "dummy" skips Clerk auth locally
```

> [!NOTE]
> When `CLERK_SECRET_KEY` equals `"dummy"` **or** the request comes from `localhost`, the API auth guard passes without verifying the JWT. All admin endpoints are therefore open in local dev.

> [!TIP]
> To create a fresh clone of the live dataset, use Turso CLI first and then copy the clone URL and token into `.dev.vars`.
>
> ```bash
> turso db create il-migma-pages-dev --from-db il-migma-alansyahmi
> turso db tokens create il-migma-pages-dev
> ```
>
> Keep the production URL/token out of `.dev.vars` when you want a disposable testing workspace.

For the Vite frontend (`.env`), the equivalent keys are prefixed with `VITE_`:

```ini
VITE_TURSO_URL=libsql://...
VITE_TURSO_AUTH_TOKEN=<jwt>
```

### 2.3 Starting the local API server

The API runs on a separate port via Wrangler:

```bash
npm run dev:api   # → http://localhost:8788
npm run dev       # → Vite frontend at http://localhost:5173
```

Both must be running together for the admin UI to work.

### 2.4 Direct database access

For the clone or production database, use the Turso CLI:

```bash
turso db shell il-migma-alansyahmi
```

If you are inspecting a clone, replace the database name with the clone's name. You can also run a SQL file against a specific database:

```bash
turso db shell <clone-name> < db/schema.sql
```

For local scratch work, any SQLite client can still open exported `.sqlite` files, but those files are not the runtime database used by `npm run dev:api`.

---

## 3. In-Browser Admin DB Tools

When both dev servers are running, the **Admin DB Tools** panel is available in the app at `/admin` → *DB Tools* tab.

It provides the following actions, all backed by `functions/api/admin/db-tools.js`:

| Action | Description |
|---|---|
| **SQL Console** | Run arbitrary `SELECT` statements. Enable *Write Mode* to allow `INSERT` / `UPDATE` / `DELETE`. |
| **Table Info** | Lists all tables with column definitions and row counts. |
| **Data Export** | Dumps up to 50,000 rows from a chosen table as JSON. |
| **Integrity Check** | Scans for orphaned rows, unlinked root consonants, malformed JSON fields, and duplicate roots. |
| **Bulk Update** | Sets a single field to a value across a list of IDs in one operation. |
| **Merge Roots** | Reassigns all entries and forms from a source root to a target root, then deletes the source. Supports a dry-run preview. |
| **Check ID** | Tests whether a given ID already exists in a table (useful before inserting). |

> [!IMPORTANT]
> Write operations in the SQL Console are blocked by default. You must explicitly tick **"Enable write mode"** before running `INSERT`, `UPDATE`, `DELETE`, etc.

#### Calling the API directly (curl / scripts)

```bash
# Table info
curl -X POST http://localhost:8788/api/admin/db-tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy" \
  -d '{"action":"table-info"}'

# Custom SELECT
curl -X POST http://localhost:8788/api/admin/db-tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy" \
  -d '{"action":"query","sql":"SELECT id, headword, pos FROM entries LIMIT 5"}'

# Integrity check
curl -X POST http://localhost:8788/api/admin/db-tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy" \
  -d '{"action":"integrity-check"}'
```

---

## 4. Remote Database Access

Use the **Turso CLI**:

```bash
# Interactive shell
turso db shell il-migma-alansyahmi

# Run a SQL file
turso db shell il-migma-alansyahmi < db/schema.sql
```

The production DB URL is `libsql://il-migma-alansyahmi.aws-ap-northeast-1.turso.io`.
For Pages dev, prefer a clone of that database instead of the live URL.

---

## 5. Data Ingestion (Import Scripts)

| Script | Purpose |
|---|---|
| `npm run import:dry` | Validate the spreadsheet without writing to DB |
| `npm run import:all` | Import everything (roots, entries, nouns, verbs) |
| `npm run import:roots` | Import only the `roots` sheet |
| `npm run import:nouns` | Import only the `nouns` sheet |
| `npm run validate:api` | Smoke-test the Pages dev API and create/delete sample test rows on the clone |

Source file is `roots.xls` / similarly named in the repo root. See `scripts/import-xls.mjs` for exact path handling.

For a full test-entry seed pack with one example for every POS, see [`docs/test-entry-seeding.md`](./test-entry-seeding.md).

---

## 6. Manual Manipulation Rules

### NFC Normalisation
Maltese characters (`ċ`, `ġ`, `ħ`, `ż`) must be in **NFC**. Use the Admin Dashboard when possible — it normalises text on save. Raw SQL inserts may produce NFD text from some editors, breaking search.

### JSON Fields
Several `TEXT` columns store JSON arrays/objects (e.g., `gloss`, `noun_plural_forms`, `tags`):

```sql
-- ❌ Wrong
UPDATE roots SET gloss = 'writing' WHERE id = 'k-t-b';

-- ✅ Correct
UPDATE roots SET gloss = '[{"en":"writing","mt":"kitba"}]' WHERE id = 'k-t-b';
```

### ID Uniqueness
Primary keys must be unique. For homographic roots, suffix with `-2`, `-3`, etc.:
- `b-għ-d` (distance)
- `b-għ-d-2` (hating)

---

## 7. Schema Migration

Migrations are manual (no Prisma/Knex). Workflow:

1. **Backup** — `turso db backup il-migma-alansyahmi`
2. **Write** — Add a script to `db/migrations/` or `scripts/` (e.g. `scripts/add-missing-columns.mjs`)
3. **Apply** — Run migration for both local and remote:
   - `node scripts/add-missing-columns.mjs local`
   - `node scripts/add-missing-columns.mjs remote`

### Database Synchronization (New Strategy)
When local and remote schemas drift (missing columns):
- Use the `/sync-db-schema` workflow (stored in `.agents/workflows/sync-db-schema.md`).
- This workflow helps identify missing columns and applies them to both environments using the automated script.


> [!IMPORTANT]
> For destructive `ALTER TABLE` changes (e.g., dropping a column, changing a constraint), use the **Create-Copy-Swap** pattern:
> ```sql
> CREATE TABLE entries_new (...);
> INSERT INTO entries_new SELECT ... FROM entries;
> DROP TABLE entries;
> ALTER TABLE entries_new RENAME TO entries;
> ```
