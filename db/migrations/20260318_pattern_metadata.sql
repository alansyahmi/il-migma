-- Migration: Add Pattern Metadata and Applicability
-- Date: 2026-03-18

-- 1. Update patterns table
ALTER TABLE patterns ADD COLUMN description TEXT;

-- 2. Update pattern_applicability table
ALTER TABLE pattern_applicability ADD COLUMN linguistic_role TEXT;
ALTER TABLE pattern_applicability ADD COLUMN gender TEXT;

-- 3. Update existing code-only indices if needed
CREATE INDEX IF NOT EXISTS idx_pa_pos_role ON pattern_applicability(pos, linguistic_role);
