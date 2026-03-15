-- Migration: Add missing columns for EntryFormModal refactor
-- Run with: turso db shell <db-name> < db/migrations/20240314_add_missing_entry_fields.sql

ALTER TABLE entries ADD COLUMN noun_diminutive TEXT;
ALTER TABLE entries ADD COLUMN noun_collective TEXT;
ALTER TABLE entries ADD COLUMN noun_singulative TEXT;
ALTER TABLE entries ADD COLUMN is_collective INTEGER DEFAULT 0;
ALTER TABLE entries ADD COLUMN is_singulative INTEGER DEFAULT 0;
ALTER TABLE entries ADD COLUMN vowel_set_sg TEXT;
ALTER TABLE entries ADD COLUMN vowel_set_pl TEXT;
ALTER TABLE entries ADD COLUMN verb_active_ptcp TEXT;
ALTER TABLE entries ADD COLUMN verb_vowel_impv TEXT;
ALTER TABLE entries ADD COLUMN participle_gender TEXT;
