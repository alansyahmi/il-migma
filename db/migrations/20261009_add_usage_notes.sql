-- Migration: add usage_notes column to entries table
-- Date: 2026-10-09
-- Supports bilingual grammatical and syntactic usage notes across all entry categories

ALTER TABLE entries ADD COLUMN usage_notes TEXT;
