-- Migration: Normalize entries table by removing POS-specific morphology columns
-- Date: 2026-04-27

-- 1. Ensure all morphology tables exist (though they should already)
CREATE TABLE IF NOT EXISTS verb_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  form                  TEXT,
  class                 TEXT,
  weak_class            TEXT,
  transitivity          TEXT,
  perfective_3sgm       TEXT,
  imperfective_3sgm     TEXT,
  verbal_noun           TEXT,
  active_participle     TEXT,
  passive_participle    TEXT,
  vowel_set_perf        TEXT,
  vowel_set_impf        TEXT,
  vowel_set_impv        TEXT,
  type                  TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS noun_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  gender                TEXT,
  noun_type             TEXT,
  singular_form         TEXT,
  plural_forms          TEXT,
  sound_plural          TEXT,
  dual_form             TEXT,
  diminutive_form       TEXT,
  collective_form       TEXT,
  singulative_form      TEXT,
  paucal_form           TEXT,
  augmentative_form     TEXT,
  paucal_pattern        TEXT,
  augmentative_pattern  TEXT,
  feminine_form         TEXT,
  masculine_form        TEXT,
  is_collective         BOOLEAN NOT NULL DEFAULT false,
  is_singulative        BOOLEAN NOT NULL DEFAULT false,
  is_singular           BOOLEAN NOT NULL DEFAULT false,
  is_inflectable_singular BOOLEAN NOT NULL DEFAULT false,
  is_inflectable_plural BOOLEAN NOT NULL DEFAULT false,
  vowel_set_sg          TEXT,
  vowel_set_pl          TEXT,
  vowel_set_opp         TEXT,
  vowel_set_dual        TEXT,
  form_plural_pattern   TEXT,
  form_fem_pattern      TEXT,
  form_masc_pattern     TEXT,
  dual_pattern          TEXT,
  diminutive_pattern    TEXT,
  morph_pattern         TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS adj_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  masculine_form        TEXT,
  feminine_form         TEXT,
  plural_form           TEXT,
  elative_form          TEXT,
  elative_pattern       TEXT,
  pattern               TEXT,
  gender                TEXT,
  vowel_set_sg          TEXT,
  vowel_set_pl          TEXT,
  vowel_set_opp         TEXT,
  form_plural_pattern   TEXT,
  form_fem_pattern      TEXT,
  form_masc_pattern     TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS participle_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  type                  TEXT,
  gender                TEXT,
  is_inflectable        BOOLEAN NOT NULL DEFAULT false,
  form_plural_pattern   TEXT,
  form_fem_pattern      TEXT,
  form_masc_pattern     TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS numeral_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  numeral_type          TEXT,
  form_attributive_short TEXT,
  form_attributive_long TEXT,
  feminine_form         TEXT,
  masculine_form         TEXT,
  ordinal_form          TEXT,
  adverbial_form        TEXT,
  fractional_form       TEXT,
  multiplier_form       TEXT,
  distributive_form     TEXT,
  is_inflectable        BOOLEAN NOT NULL DEFAULT false,
  vowel_set_sg          TEXT,
  vowel_set_pl          TEXT,
  vowel_set_opp         TEXT,
  vowel_set_dual        TEXT,
  form_plural_pattern   TEXT,
  form_fem_pattern      TEXT,
  form_masc_pattern     TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 2. Backfill from entries to morphology tables (safely)
INSERT OR IGNORE INTO noun_morphology (
  entry_id, gender, singular_form, plural_forms, feminine_form, masculine_form, 
  dual_form, diminutive_form, is_collective, is_singulative, is_inflectable_singular, is_inflectable_plural, noun_type, 
  vowel_set_sg, vowel_set_pl, vowel_set_opp, vowel_set_dual,
  form_plural_pattern, form_fem_pattern, form_masc_pattern,
  dual_pattern, diminutive_pattern, morph_pattern,
  created_at, updated_at
)
SELECT 
  id, gender, headword, inflections_pl, form_fem, form_masc, 
  dual_form, diminutive_form, is_collective, is_singulative, 0, 0, noun_type, 
  vowel_set_sg, vowel_set_pl, vowel_set_opp, vowel_set_dual,
  form_plural_pattern, form_fem_pattern, form_masc_pattern,
  dual_pattern, diminutive_pattern, morph_pattern,
  created_at, updated_at
FROM entries
WHERE pos = 'noun' OR pos = 'pronoun';

INSERT OR IGNORE INTO adj_morphology (
  entry_id, masculine_form, feminine_form, plural_form, elative_form, 
  vowel_set_sg, vowel_set_pl, vowel_set_opp, 
  form_plural_pattern, form_fem_pattern, form_masc_pattern, elative_pattern, pattern,
  created_at, updated_at
)
SELECT 
  id, form_masc, form_fem, inflections_pl, elative_form, 
  vowel_set_sg, vowel_set_pl, vowel_set_opp, 
  form_plural_pattern, form_fem_pattern, form_masc_pattern, elative_pattern, cv_pattern,
  created_at, updated_at
FROM entries
WHERE pos = 'adjective';

INSERT OR IGNORE INTO verb_morphology (
  entry_id, form, class, weak_class, transitivity, perfective_3sgm, imperfective_3sgm, 
  verbal_noun, active_participle, passive_participle, vowel_set_perf, vowel_set_impf, vowel_set_impv, type, created_at, updated_at
)
SELECT 
  id, verb_form, verb_class, verb_weak_class, verb_transitivity, verb_perfective_3sgm, verb_imperfective_3sgm,
  verb_verbal_noun, verb_active_ptcp, verb_passive_ptcp, verb_vowel_perf, verb_vowel_impf, verb_vowel_impv, verb_type, created_at, updated_at
FROM entries
WHERE pos = 'verb';

INSERT OR IGNORE INTO participle_morphology (
  entry_id, type, gender, 
  form_plural_pattern, form_fem_pattern, form_masc_pattern,
  created_at, updated_at
)
SELECT 
  id, participle_type, gender, 
  form_plural_pattern, form_fem_pattern, form_masc_pattern,
  created_at, updated_at
FROM entries
WHERE pos = 'participle';

INSERT OR IGNORE INTO numeral_morphology (
  entry_id, numeral_type, form_attributive_short, form_attributive_long, feminine_form, masculine_form, 
  vowel_set_sg, vowel_set_pl, vowel_set_opp, vowel_set_dual,
  form_plural_pattern, form_fem_pattern, form_masc_pattern,
  created_at, updated_at
)
SELECT 
  id, numeral_type, form_attributive_short, form_attributive_long, form_fem, form_masc, 
  vowel_set_sg, vowel_set_pl, vowel_set_opp, vowel_set_dual,
  form_plural_pattern, form_fem_pattern, form_masc_pattern,
  created_at, updated_at
FROM entries
WHERE pos = 'numeral';

-- 3. Perform the entries table normalization (dropping columns)
-- SQLite requires recreating the table to drop columns safely across all versions
DROP TABLE IF EXISTS entries_new;
CREATE TABLE entries_new (
  id                    TEXT PRIMARY KEY,
  headword              TEXT NOT NULL,
  pos                   TEXT NOT NULL,
  gender                TEXT CHECK(gender IN ('masculine','feminine','neutral')),
  root_consonants       TEXT,
  stem                  TEXT,
  is_loanword           BOOLEAN NOT NULL DEFAULT false,
  is_inflectable        BOOLEAN NOT NULL DEFAULT false,
  source_language       TEXT,
  source_id             TEXT REFERENCES lexical_sources(id),
  source_citation       TEXT,
  source_title          TEXT,
  source_year           TEXT,
  source_page           TEXT,
  source_publisher      TEXT,
  etymology_chain       TEXT,
  etymology_notes       TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO entries_new (
  id, headword, pos, gender, root_consonants, stem, is_loanword, is_inflectable,
  source_language, source_id, source_citation, source_title, source_year, source_page, source_publisher,
  etymology_chain, etymology_notes, created_at, updated_at
)
SELECT 
  id, headword, pos, gender, root_consonants, stem, is_loanword, COALESCE(is_inflectable, 1),
  source_language, source_id, source_citation, source_title, source_year, source_page, source_publisher,
  etymology_chain, etymology_notes, created_at, updated_at
FROM entries;

DROP TABLE entries;
ALTER TABLE entries_new RENAME TO entries;

-- 4. Re-create indexes and triggers
CREATE INDEX idx_entries_headword ON entries(headword);
CREATE INDEX idx_entries_pos ON entries(pos);
CREATE INDEX idx_entries_gender ON entries(gender);

-- Re-create FTS trigger (assuming entries_fts exists)
DROP TRIGGER IF EXISTS entries_ai;
DROP TRIGGER IF EXISTS entries_ad;
DROP TRIGGER IF EXISTS entries_au;

CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword); END;

CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword); END;

CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword); INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword); END;
