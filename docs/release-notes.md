# Release Notes

## 2026-03-31

Follow-up notes for commit `d582f9c`:

- Added a full community submission pipeline with public feedback/suggestion forms, server validation, and persisted records in `site_submissions`.
- Added an admin inbox for reviewing submissions, updating status, deleting items, and running bulk actions.
- Refactored etymology handling so root, stem, and entry chains share normalization and display helpers.
- Added plural-form normalization helpers and related tests to support legacy and structured plural data.
- Updated the entry, root, stem, browse, search, dashboard, and admin surfaces to use the new morphology and etymology model.
- Added verification coverage for stem forms, etymology contracts, and plural-form parsing.
