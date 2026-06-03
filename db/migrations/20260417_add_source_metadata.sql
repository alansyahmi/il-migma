-- Migration: add structured source metadata fields to entries
-- Run with: turso db shell <db-name> < db/migrations/20260417_add_source_metadata.sql

ALTER TABLE entries ADD COLUMN source_title TEXT;
ALTER TABLE entries ADD COLUMN source_year TEXT;
ALTER TABLE entries ADD COLUMN source_page TEXT;
ALTER TABLE entries ADD COLUMN source_publisher TEXT;
