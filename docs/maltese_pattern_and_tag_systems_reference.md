# Technical Reference: Maltese Pattern & Tag Systems

This document details the technical implementation and findings for the Maltese morphological pattern synchronization and the improved tag prefix system.

## 1. Morphological Pattern Synchronization

### Background
The application uses two types of patterns for morphological analysis and entry management:
- **CV Patterns**: Consonant-Vowel notation (e.g., `CvCvC`).
- **Wiżen Patterns**: Root-based examples (e.g., `fagħal`).

### Data Sources
- **[patterns](file:///c:/Projects/il-migma/scripts/compare_patterns.py#25-29) table**: Canonical list of 13 primary patterns (uppercase notation: `CVCVC`).
- **[broken_plural.xlsx](file:///c:/Projects/il-migma/broken_plural.xlsx)**: External data containing 34 unique patterns with representative words.
- **`entries` table**: Existing database entries (`cv_pattern`, `lemma_pattern`) which some patterns weren't yet in the presets.

### Synchronization Logic ([sync_patterns.mjs](file:///c:/Projects/il-migma/scripts/sync_patterns.mjs))
The script performs the following:
1.  **Normalization**: Converts uppercase patterns (e.g., `CVCVC`) to the standard mixed-case notation (e.g., `CvCvC`) for consistency in the Admin Form.
2.  **Aggregation**: Merges patterns from the [patterns](file:///c:/Projects/il-migma/scripts/compare_patterns.py#25-29) table, the XLSX file, and actual usage in the `entries` table.
3.  **Deduplication**: Ensures unique patterns across two categories:
    - `cv_wizen_pattern`: Used for singular/generic patterns. (Expanded to 18 presets).
    - `broken_pattern`: Used for plural patterns. (Expanded to 37 presets).
4.  **Wiżen Generation**: Automatically generates a representative Wiżen (e.g., using roots f-għ-l) for new patterns that lacked an explicit example.

### Key Scripts
- [scripts/sync_patterns.mjs](file:///c:/Projects/il-migma/scripts/sync_patterns.mjs): The main synchronization entry point.
- [scripts/extract_xlsx_patterns.cjs](file:///c:/Projects/il-migma/scripts/extract_xlsx_patterns.cjs): Helper to parse unique patterns and example words from [broken_plural.xlsx](file:///c:/Projects/il-migma/broken_plural.xlsx).
- [scripts/compare_patterns.py](file:///c:/Projects/il-migma/scripts/compare_patterns.py): Diagnostic tool to identify discrepancies between database tables.

---

## 2. Tag Prefix & UI System

A new prefix-based system for tags was implemented to control their visibility and functionality without requiring complex database schema changes.

### Prefix Definitions
- `!` (**Notable**): 
  - **Visibility**: Displayed in the entry subtitle (e.g., `!RARE` -> `RARE`).
  - **Footer**: Hidden from the bottom [TagChips](file:///c:/Projects/il-migma/src/pages/Entry.tsx#139-167) to avoid redundancy.
  - **Use Case**: Important markers like dialect, rarity, or notable usage.
- `$` (**Internal/Logic**):
  - **Visibility**: Hidden from both subtitle and chips.
  - **Functionality**: Used for logic triggers. 
  - **Example**: `$invariable` suppresses the elative form generation in the Morphology Table.

### Implementation Details
- **[SubParts.tsx](file:///c:/Projects/il-migma/src/components/dictionary/SubParts.tsx)**: Updated `titleTags` filtering to only include tags starting with `!`.
- **[Entry.tsx](file:///c:/Projects/il-migma/src/pages/Entry.tsx)**: Updated [TagChips](file:///c:/Projects/il-migma/src/pages/Entry.tsx#139-167) to filter out both `!` and `$` prefixes.
- **[EntryFormModal.tsx](file:///c:/Projects/il-migma/src/components/admin/EntryFormModal.tsx)**:
  - Added checkboxes for **Notable (!)** and **No Elative** ($invariable).
  - Automatically manages the prefixes when these checkboxes are toggled.
- **[AdjectiveEntryView](file:///c:/Projects/il-migma/src/pages/Entry.tsx#2229-2548)**: Narrowed elative suppression logic to specifically check for the `$invariable` tag.

---

## 3. Search API Error Resilience

- **JSON Guard**: Implemented `try-catch` blocks around `JSON.parse` in the search API handlers. This prevents a single malformed entry (common in test/mock data like `testptcp`) from crashing the entire search result set (500 Internal Server Error).
- **Schema Mapping**: Corrected the SQL query logic for plural pattern searches, catering to the actual column names in the production schema (`form_plural_pattern` / `morph_pattern`).
