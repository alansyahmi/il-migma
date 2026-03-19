-- Migration: Add description and linguistic metadata to patterns
-- Date: 2026-03-18

-- Add description to the main patterns table
ALTER TABLE patterns ADD COLUMN description TEXT;

-- Add role and gender to the applicability table (where the context lives)
ALTER TABLE pattern_applicability ADD COLUMN linguistic_role TEXT;
ALTER TABLE pattern_applicability ADD COLUMN gender TEXT;

-- Optional: Indexing for faster filtering in the admin UI
CREATE INDEX idx_pattern_applicability_role ON pattern_applicability(linguistic_role);
