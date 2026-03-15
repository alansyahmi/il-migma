-- Migration: Unify Morphology Columns
-- Date: 2026-03-15
-- This version is customized based on the actual columns found in the local database.

-- 1. Create temporary table with new schema
DROP TABLE IF EXISTS entries_new;
CREATE TABLE entries_new (
  id                    TEXT PRIMARY KEY,
  headword              TEXT NOT NULL,
  pos                   TEXT NOT NULL,
  gender                TEXT CHECK(gender IN ('masculine','feminine','neutral')),
  lemma_base            TEXT,
  inflections_pl        TEXT,
  form_fem              TEXT,
  form_masc             TEXT,
  dual_form             TEXT,
  diminutive_form       TEXT,
  elative_form          TEXT,
  is_collective         INTEGER NOT NULL DEFAULT 0,
  is_singulative        INTEGER NOT NULL DEFAULT 0,
  participle_type       TEXT,
  root_consonants       TEXT,
  cv_pattern            TEXT,
  morph_pattern         TEXT,
  verb_form             TEXT,
  root_pattern_form_id  TEXT REFERENCES root_pattern_forms(id),
  is_loanword           INTEGER NOT NULL DEFAULT 0,
  is_inflectable        INTEGER NOT NULL DEFAULT 1,
  source_language       TEXT,
  tags                  TEXT,
  sound_suffix          TEXT,
  vowel_set_sg          TEXT,
  vowel_set_pl          TEXT,
  verb_class            TEXT,
  verb_weak_class       TEXT,
  verb_transitivity     TEXT,
  verb_perfective_3sgm  TEXT,
  verb_imperfective_3sgm TEXT,
  verb_verbal_noun      TEXT,
  verb_active_ptcp      TEXT,
  verb_passive_ptcp     TEXT,
  verb_vowel_perf       TEXT,
  verb_vowel_impf       TEXT,
  verb_vowel_impv       TEXT,
  verb_type             TEXT,
  synonyms              TEXT,
  antonyms              TEXT,
  related_entries       TEXT,
  source_citation       TEXT,
  usage_example         TEXT,
  usage_example_en      TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 2. Migrate data
INSERT INTO entries_new (
  id, headword, pos, gender, lemma_base, inflections_pl, form_fem, form_masc, 
  dual_form, diminutive_form, elative_form, is_collective, is_singulative,
  participle_type, root_consonants, cv_pattern, morph_pattern, verb_form,
  root_pattern_form_id, is_loanword, is_inflectable, source_language, tags,
  sound_suffix, vowel_set_sg, vowel_set_pl, verb_class, verb_weak_class,
  verb_transitivity, verb_perfective_3sgm, verb_imperfective_3sgm,
  verb_verbal_noun, verb_active_ptcp, verb_passive_ptcp, verb_vowel_perf,
  verb_vowel_impf, verb_vowel_impv, verb_type, synonyms, antonyms,
  related_entries, source_citation, usage_example, usage_example_en,
  created_at, updated_at
)
SELECT 
  id, headword, pos,
  noun_gender,
  COALESCE(noun_singular, adj_masculine),
  COALESCE(noun_plural_forms, adj_plural),
  COALESCE(noun_feminine, adj_feminine),
  noun_masculine,
  noun_dual,
  noun_diminutive,
  adj_elative,
  0, -- is_collective
  0, -- is_singulative
  participle_type, root_consonants, cv_pattern,
  COALESCE(plural_pattern, adj_pattern),
  verb_form, root_pattern_form_id, is_loanword,
  COALESCE(is_inflectable, 1),
  source_language, tags, sound_suffix,
  NULL, -- vowel_set_sg
  NULL, -- vowel_set_pl
  verb_class, verb_weak_class, verb_transitivity,
  verb_perfective_3sgm, verb_imperfective_3sgm,
  verb_verbal_noun, 
  NULL, -- verb_active_ptcp
  verb_passive_ptcp,
  verb_vowel_perf, verb_vowel_impf,
  NULL, -- verb_vowel_impv
  NULL, -- verb_type
  synonyms, antonyms, related_entries,
  source_citation, usage_example, usage_example_en,
  created_at, updated_at
FROM entries;

-- 3. Drop old table and rename new one
DROP TABLE entries;
ALTER TABLE entries_new RENAME TO entries;

-- 4. Recreate indices
CREATE INDEX IF NOT EXISTS idx_entries_headword ON entries(headword);
CREATE INDEX IF NOT EXISTS idx_entries_pos ON entries(pos);
CREATE INDEX IF NOT EXISTS idx_entries_gender ON entries(gender);
