-- Migration: Add 'common' gender and normalize existing 'neutral' / 'both' / 'mf' records to 'common'
-- Date: 2026-10-11

-- 1. Backfill entries table
UPDATE entries
SET gender = 'common'
WHERE LOWER(gender) IN ('neutral', 'neut', 'both', 'mf', 'c', 'comm');

-- 2. Backfill morphology tables if applicable
UPDATE noun_morphology
SET gender = 'common'
WHERE LOWER(gender) IN ('neutral', 'neut', 'both', 'mf', 'c', 'comm');

UPDATE adjective_morphology
SET gender = 'common'
WHERE LOWER(gender) IN ('neutral', 'neut', 'both', 'mf', 'c', 'comm');

UPDATE participle_morphology
SET gender = 'common'
WHERE LOWER(gender) IN ('neutral', 'neut', 'both', 'mf', 'c', 'comm');
