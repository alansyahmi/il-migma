-- Migration: add entry metadata fields used by the refactored admin form
-- Date: 2026-04-26
-- These columns store the entry-level source metadata and etymology chain on `entries`.

ALTER TABLE entries ADD COLUMN source_citation TEXT;
ALTER TABLE entries ADD COLUMN source_title TEXT;
ALTER TABLE entries ADD COLUMN source_year TEXT;
ALTER TABLE entries ADD COLUMN source_page TEXT;
ALTER TABLE entries ADD COLUMN source_publisher TEXT;
ALTER TABLE entries ADD COLUMN etymology_chain TEXT;
ALTER TABLE entries ADD COLUMN etymology_notes TEXT;
