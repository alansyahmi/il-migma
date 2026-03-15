-- Migration: Add numeral-specific columns to entries table
-- Run with: turso db shell <db-name> < db/migrations/20260315_add_numeral_fields.sql

ALTER TABLE entries ADD COLUMN numeral_type TEXT;
ALTER TABLE entries ADD COLUMN form_attributive_short TEXT;
ALTER TABLE entries ADD COLUMN form_attributive_long TEXT;
ALTER TABLE entries ADD COLUMN form_opposite TEXT;
