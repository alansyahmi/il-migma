-- ============================================================
-- Il-Miġma' Database Schema
-- Engine: Turso (libSQL / SQLite-compatible)
-- Run via: turso db shell <db-name> < db/schema.sql
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─── Roots ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roots (
  id            TEXT PRIMARY KEY,
  consonants    TEXT NOT NULL,  -- e.g. "k-t-b"
  consonant_array TEXT NOT NULL,       -- JSON array e.g. ["k","t","b"]
  strength      TEXT DEFAULT 'strong', -- strong, weak, geminated, etc.
  weak_class    TEXT,                  -- hollow, assimilative, defective, etc.
  gloss         TEXT,                  -- general meaning
  etymology     TEXT,                  -- JSON string or plain text
  source        TEXT,                  -- e.g. dictionary citation
  hidden_forms    TEXT,                -- JSON array of hidden theoretic forms
  notes         TEXT,
  vowel_set_perf TEXT,
  vowel_set_impf TEXT,
  vowel_set_imp  TEXT,
  synonyms       TEXT,                  -- JSON array
  antonyms       TEXT,                  -- JSON array
  related_entries TEXT,                 -- JSON array
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_roots_consonants ON roots(consonants);

-- ─── Stems (Canonical) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stems (
  stem_string     TEXT PRIMARY KEY,
  class_type      TEXT NOT NULL DEFAULT 'ar' CHECK(class_type IN ('ar', 'ir')),
  is_hybrid       INTEGER NOT NULL DEFAULT 0,
  root            TEXT,
  agentive_suffix TEXT,
  tags            TEXT, -- JSON array
  source          TEXT,
  glosses         TEXT, -- JSON array [{ en, mt }]
  etymology       TEXT, -- JSON object
  synonyms        TEXT, -- JSON array of stem refs
  antonyms        TEXT, -- JSON array of stem refs
  related_stems   TEXT, -- JSON array of stem refs
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_stems_class_type ON stems(class_type);
CREATE INDEX IF NOT EXISTS idx_stems_hybrid ON stems(is_hybrid);

-- ─── Patterns ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patterns (
  id              TEXT PRIMARY KEY,
  cv_notation     TEXT NOT NULL,         -- e.g. "CaCaC"
  wizen_notation  TEXT NOT NULL,         -- e.g. "Fagħal" (Arabised)
  description     TEXT,                  -- linguistic notes
  example_word    TEXT,
  tags            TEXT,                  -- JSON array
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patterns_cv_wizen_unique
  ON patterns(cv_notation, wizen_notation);
CREATE INDEX IF NOT EXISTS idx_patterns_cv
  ON patterns(cv_notation);

-- ─── Pattern Applicability ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pattern_applicability (
  id              TEXT PRIMARY KEY,
  pattern_id      TEXT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,         -- e.g. "broken_plural", "sound_plural"
  pos             TEXT NOT NULL,         -- e.g. "noun", "adjective", "verb" or "all"
  stress          INTEGER,               -- syllable from end
  is_active       INTEGER DEFAULT 1,
  sort_order      INTEGER DEFAULT 0,
  linguistic_role TEXT,                  -- explicit role e.g. "feminine_singular"
  gender          TEXT,                  -- target gender e.g. "feminine"
  metadata        TEXT,                  -- JSON blob for forward-compatible extras
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_pa_pattern ON pattern_applicability(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pa_category ON pattern_applicability(category);
CREATE INDEX IF NOT EXISTS idx_pa_pos_role ON pattern_applicability(pos, linguistic_role);

-- ─── Root-Pattern Junction ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS root_pattern_forms (
  id            TEXT PRIMARY KEY,
  root_id       TEXT NOT NULL REFERENCES roots(id) ON DELETE CASCADE,
  pattern_id    TEXT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  derived_form  TEXT NOT NULL,  -- surface realisation
  UNIQUE(root_id, pattern_id, derived_form)
);

CREATE INDEX IF NOT EXISTS idx_rpf_root ON root_pattern_forms(root_id);
CREATE INDEX IF NOT EXISTS idx_rpf_pattern ON root_pattern_forms(pattern_id);

-- ─── Entries ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entries (
  id                    TEXT PRIMARY KEY,
  headword              TEXT NOT NULL,
  pos                   TEXT NOT NULL,
  gender                TEXT CHECK(gender IN ('masculine','feminine','neutral')), -- Replaces noun_gender, adj_gender, ptcp_gender
  lemma_base            TEXT, -- Replaces noun_singular, adj_masculine
  inflections_pl        TEXT, -- JSON array; Replaces noun_plural_forms, adj_plural
  form_fem              TEXT, -- Replaces noun_feminine, adj_feminine
  form_masc             TEXT, -- Replaces noun_masculine
  dual_form             TEXT, -- Replaces noun_dual
  diminutive_form       TEXT, -- Replaces noun_diminutive
  paucal_form           TEXT, -- Replaces noun_paucal
  augmentative_form     TEXT, -- Replaces noun_augmentative
  elative_form          TEXT, -- Replaces adj_elative
  is_collective         INTEGER NOT NULL DEFAULT 0,
  is_singulative        INTEGER NOT NULL DEFAULT 0,
  participle_type       TEXT,
  root_consonants       TEXT,
  cv_pattern            TEXT, -- e.g. "Fagħal" or "CCvC"
  morph_pattern         TEXT, -- Replaces plural_pattern, adj_pattern
  verb_form             TEXT, -- 'I', 'II', 'III' etc
  root_pattern_form_id  TEXT REFERENCES root_pattern_forms(id),
  is_loanword           INTEGER NOT NULL DEFAULT 0,
  is_inflectable        INTEGER NOT NULL DEFAULT 1,
  source_language       TEXT,
  zokk_morphology       TEXT, -- JSON object for stem-linked / loanword morphology
  tags                  TEXT,  -- JSON array
  sound_suffix          TEXT,
  vowel_set_sg          TEXT,
  vowel_set_pl          TEXT,
  vowel_set_opp         TEXT,
  vowel_set_dual        TEXT,
  lemma_pattern         TEXT,
  form_fem_pattern      TEXT,
  form_masc_pattern     TEXT,
  form_plural_pattern   TEXT,
  dual_pattern          TEXT,
  paucal_pattern        TEXT,
  augmentative_pattern  TEXT,
  numeral_type          TEXT,
  form_attributive_short TEXT,
  form_attributive_long TEXT,
  form_opposite         TEXT,

  -- Verb specific morphology (still relatively unique)
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
  
  -- Relationship metadata
  synonyms              TEXT,  -- JSON array
  antonyms              TEXT,  -- JSON array
  related_entries       TEXT,  -- JSON array
  source_citation       TEXT,
  usage_example         TEXT,
  usage_example_en      TEXT,

  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_headword ON entries(headword);
CREATE INDEX IF NOT EXISTS idx_entries_pos ON entries(pos);
CREATE INDEX IF NOT EXISTS idx_entries_gender ON entries(gender);

-- ─── Full-Text Search ──────────────────────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  headword,
  content='entries',
  content_rowid='rowid'
);

-- ─── Definitions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS definitions (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  subentry_id   TEXT,  -- NULL if directly under entry
  sense_number  INTEGER NOT NULL DEFAULT 1,
  text_mt       TEXT,
  text_en       TEXT NOT NULL,
  register      TEXT,
  nuance        TEXT,
  field         TEXT,  -- domain e.g. "Law", "Medicine"
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_defs_entry ON definitions(entry_id);

-- ─── Example Sentences ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS example_sentences (
  id            TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL REFERENCES definitions(id) ON DELETE CASCADE,
  maltese       TEXT NOT NULL,
  english       TEXT,
  source        TEXT
);

-- ─── Sub-Entries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subentries (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  headword      TEXT NOT NULL,
  pos           TEXT,
  tags          TEXT,  -- JSON array
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_subentries_entry ON subentries(entry_id);

-- ─── Phonetics ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phonetics (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT REFERENCES entries(id) ON DELETE CASCADE,
  subentry_id   TEXT REFERENCES subentries(id) ON DELETE CASCADE,
  ipa           TEXT NOT NULL,
  dialect       TEXT DEFAULT 'Standard',
  notes         TEXT,
  CHECK(entry_id IS NOT NULL OR subentry_id IS NOT NULL)
);

-- ─── Audio Files ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audio_files (
  id                TEXT PRIMARY KEY,
  entry_id          TEXT REFERENCES entries(id) ON DELETE CASCADE,
  subentry_id       TEXT REFERENCES subentries(id) ON DELETE CASCADE,
  r2_object_key     TEXT NOT NULL UNIQUE,
  dialect           TEXT DEFAULT 'standard',
  is_ai_generated   INTEGER NOT NULL DEFAULT 1,
  duration_seconds  REAL,
  generated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CHECK(entry_id IS NOT NULL OR subentry_id IS NOT NULL)
);

-- ─── Lexical Sources (Authority Weights) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS lexical_sources (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL UNIQUE,           -- short name e.g. "Aquilina"
  full_title         TEXT NOT NULL,
  author             TEXT,
  year               INTEGER,
  reliability_weight REAL NOT NULL CHECK(reliability_weight >= 0 AND reliability_weight <= 1),
  source_type        TEXT NOT NULL,
  url                TEXT
);

-- Seed authoritative sources
INSERT OR IGNORE INTO lexical_sources VALUES
  ('src-aquilina',   'Aquilina',           'Maltese-English Dictionary (2 vols)',                    'J. Aquilina',             1987, 0.92, 'academic',      NULL),
  ('src-kunsill',    'Kunsill tal-Malti',  'Official decisions of the Kunsill tal-Malti',            'Kunsill tal-Malti',       NULL, 0.88, 'official',      'https://kunsilltalmalti.gov.mt'),
  ('src-bartoli',    'Bartoli',            'Etymological studies on Maltese',                        'M. G. Bartoli',           1902, 0.80, 'historical',    NULL),
  ('src-borg',       'Borg & AA',          'Maltese: A Functional Grammar for Students',             'A. Borg, M. Azzopardi-Alexander', 1997, 0.78, 'academic', NULL),
  ('src-peer',       'Peer-Reviewed',      'Journal of Maltese Linguistics and related journals',   NULL,                      NULL, 0.70, 'peer_reviewed', NULL),
  ('src-crowd',      'Crowdsourced',       'Community-submitted entries (unverified)',               NULL,                      NULL, 0.25, 'crowdsourced',  NULL);

-- ─── Attestation Reliability ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attestation_reliability (
  id                TEXT PRIMARY KEY,
  entry_id          TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  reliability_index REAL NOT NULL CHECK(reliability_index >= 0 AND reliability_index <= 100),
  computed_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(entry_id)
);

CREATE TABLE IF NOT EXISTS attestation_scores (
  id                    TEXT PRIMARY KEY,
  attestation_id        TEXT NOT NULL REFERENCES attestation_reliability(id) ON DELETE CASCADE,
  source_id             TEXT NOT NULL REFERENCES lexical_sources(id),
  attested              INTEGER NOT NULL DEFAULT 1,  -- 1 = confirmed, 0 = rejected
  notes                 TEXT
);

-- ─── Etymologies ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS etymologies (
  id              TEXT PRIMARY KEY,
  entry_id        TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  chain           TEXT NOT NULL,  -- JSON array of EtymologyNode objects
  notes           TEXT
);

-- ─── Dialect Variants ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dialect_variants (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  region        TEXT NOT NULL,
  variant_form  TEXT NOT NULL,
  notes         TEXT
);

-- ─── Users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  clerk_id        TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT,
  tier            TEXT NOT NULL DEFAULT 'basic',
  ads_disabled    INTEGER NOT NULL DEFAULT 0,
  audio_unlocked  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Subscriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        TEXT PRIMARY KEY,
  user_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier                      TEXT NOT NULL,
  started_at                TEXT NOT NULL,
  expires_at                TEXT,
  stripe_subscription_id    TEXT UNIQUE,
  is_lifetime               INTEGER NOT NULL DEFAULT 0
);

-- ─── API Keys (Enterprise) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  key_hash              TEXT NOT NULL UNIQUE,   -- bcrypt hash, never store plain
  key_prefix            TEXT NOT NULL,          -- first 8 chars for display
  usage_count           INTEGER NOT NULL DEFAULT 0,
  rate_limit_per_month  INTEGER NOT NULL DEFAULT 10000,
  is_active             INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_used_at          TEXT
);

-- ─── Flashcard Lists ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcard_lists (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  entry_ids   TEXT NOT NULL DEFAULT '[]',  -- JSON array
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Suggested Entries ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suggested_entries (
  id                    TEXT PRIMARY KEY,
  submitted_by_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  headword              TEXT NOT NULL,
  notes                 TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending',
  vote_count            INTEGER NOT NULL DEFAULT 0,
  submitted_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Votes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggested_entry_id    TEXT NOT NULL REFERENCES suggested_entries(id) ON DELETE CASCADE,
  value                 INTEGER NOT NULL CHECK(value IN (1, -1)),
  reason                TEXT,
  voted_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, suggested_entry_id)
);

-- ─── Blog Posts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  excerpt         TEXT,
  content_md      TEXT NOT NULL,
  author          TEXT NOT NULL DEFAULT 'Il-Miġma''',
  published_at    TEXT,
  tags            TEXT,  -- JSON array
  cover_image_url TEXT
);
