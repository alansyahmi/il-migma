-- Migration: add canonical gender index for search filtering
-- Run with: turso db shell <db-name> < db/migrations/20260316_backfill_entries_gender.sql
-- Data backfill from legacy noun_gender / noun_morphology sources is handled by:
--   node scripts/backfill-entries-gender.mjs

CREATE INDEX IF NOT EXISTS idx_entries_gender ON entries(gender);
