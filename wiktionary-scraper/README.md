# Wiktionary Maltese Scraper

This folder contains the utility scraper for extracting Maltese dictionary entries from Wiktionary, mapping them to the current database schema structure.

## Overview

The scraper extracts Maltese lemmas (nouns, verbs, adjectives, proper nouns, etc.) beginning with the letter **A** (by default, utilizing seeds from `Category:Maltese_lemmas`). 

It collects:
- Word definition/gloss. 
  > **⚠️ IMPORTANT UI LIMITATION:** The gloss UI throughout the Il-Migma website **still does not split glosses by `;`**. It relies on `firstSenseText()` which simply truncates the string at the first semicolon. It is critical that during AI refinement, any multi-sense glosses separated by `;` are fully split into separate definition objects.
- Etymology text, built into a structured etymology relationship chain.
- Loanword status detection.
- Associated tags (e.g. archaic, register, status).

## Usage

Run the scraper using Python:

```bash
# Basic usage, outputs directly to a single consolidated JSONL file:
python wiktionary-scraper/scraper.py --output tmp/wiktionary_maltese_A.jsonl

# DB-shaped output mode:
# This generates entries, tags, and entry_tags tables matching our Turso/SQLite schema.
python wiktionary-scraper/scraper.py --db-output-prefix tmp/wik_A
```

### Options

- `--seed-url`: Specific category URL to scan (can be passed multiple times).
- `--output`: File path for default JSONL output (defaults to `tmp/wiktionary_maltese_A.jsonl`).
- `--db-output-prefix`: File path prefix for producing DB-compatible import files:
  - `<prefix>-entries.jsonl`: Contains the primary entries table records with definitions embedded as an inline JSON array of objects.
  - `<prefix>-tags.jsonl`: Unique tags found during parsing.
  - `<prefix>-entry_tags.jsonl`: Entry ID to Tag ID mapping.
- `--limit`: Stop scraping after processing $N$ entries (useful for quick testing).
- `--sleep`: Float delay in seconds between successive page fetches (e.g. `--sleep 1.0`).
- `--all-letters`: Scrapes all letter pages in the category instead of filtering and stopping at words starting with 'a'. Required when scraping smaller POS categories such as `Category:Maltese_pronouns`.
- `--no-overwrite`: Prevents overwriting any entries that already exist in the output files. Use this to protect manual edits you made directly in the JSONL files.

## Incremental Merge & Conflict Resolution

If you run the scraper successively with different categories (e.g., pronouns followed by J-lemmas) and output them to the same file or `--db-output-prefix` path, the scraper automatically handles conflict resolution:
1. It reads any existing output files (`*-entries.jsonl`, `*-tags.jsonl`, `*-entry_tags.jsonl`) at startup.
2. It merges newly scraped entries into the existing set in-memory.
3. **Overwriting / Preservation**:
   - By default, newly scraped data will overwrite any existing entry with the same ID.
   - If the `--no-overwrite` flag is active, or if an entry in the output file contains `"curated": true` or `"manual": true` in its JSON line, the entry is **always preserved** (not overwritten), keeping any manual edits.
4. Tag mappings are updated (old tag mappings for overwritten/updated entries are removed and replaced with new ones, while mappings for preserved entries remain untouched).
5. The consolidated result is written back to the output files, preventing data loss or duplicates.

## Database Schema Integration

The script matches the database table layouts specified in `db/schema.sql`:
1. **Entries**: The definitions are stored directly on the `entries` table within the `definitions` column as a JSON array of `EntryDefinition` structures (`text_en`, `text_mt`, `register`, `nuance`).
2. **Tags**: Unique tags are mapped into the `tags` table (`id`, `name`, `category`, `description`).
3. **Entry Tags**: Junction records mapping `entry_id` to `tag_id`.

## Uploading Entries to the Database

You have two convenient methods to import/upload the scraped JSONL entries into the Il-Migma database:

### 1. Upload via Admin Dashboard UI (Recommended)
1. Start the development server (`npm run dev` and `npm run dev:api`).
2. Open your web browser and navigate to the **Admin Dashboard** (`/admin`).
3. Click on the **Database Tools (Db Tools)** tab.
4. Go to the **Bulk Operations (Bulk Ops)** section.
5. Click on **Upload JSONL Entries**.
6. Select your scraped `.jsonl` file (e.g. `wiktionary-scraper/scraped-results/pronouns.jsonl`) and click **Upload & Import**.
7. You will see a real-time progress bar, stats (total, inserted, updated, failed), and live log stream outputting details of each entry's processing.

### 2. Upload via Python Script
Alternatively, you can run the provided upload Python utility from the command line:

```bash
# Upload to local development server (localhost:8788):
python wiktionary-scraper/upload.py --file wiktionary-scraper/scraped-results/pronouns.jsonl

# Upload to production server with Clerk Admin Token:
python wiktionary-scraper/upload.py \
  --file wiktionary-scraper/scraped-results/pronouns.jsonl \
  --url https://your-production-domain.com \
  --token YOUR_CLERK_ADMIN_JWT
```

