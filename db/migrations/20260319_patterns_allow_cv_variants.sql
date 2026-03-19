-- Migration: Allow multiple pattern variants with same CV notation
-- Date: 2026-03-19
--
-- Why:
-- 1) patterns.cv_notation was UNIQUE, blocking legitimate variants.
-- 2) We now key pattern uniqueness by (cv_notation, wizen_notation).

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

CREATE TABLE patterns_new (
  id              TEXT PRIMARY KEY,
  cv_notation     TEXT NOT NULL,
  wizen_notation  TEXT NOT NULL,
  description     TEXT,
  example_word    TEXT,
  tags            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO patterns_new (id, cv_notation, wizen_notation, description, example_word, tags, created_at)
SELECT id, cv_notation, wizen_notation, description, example_word, tags, created_at
FROM patterns;

DROP TABLE patterns;
ALTER TABLE patterns_new RENAME TO patterns;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patterns_cv_wizen_unique
  ON patterns(cv_notation, wizen_notation);
CREATE INDEX IF NOT EXISTS idx_patterns_cv
  ON patterns(cv_notation);

COMMIT;
PRAGMA foreign_keys = ON;
