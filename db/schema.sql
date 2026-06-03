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
  is_hybrid       BOOLEAN NOT NULL DEFAULT false,
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
  is_active       BOOLEAN DEFAULT false,
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
  etymology_chain       TEXT, -- JSON array of EtymologyNode objects
  etymology_notes       TEXT,
  definitions           TEXT NOT NULL DEFAULT '[]', -- JSON array of sense objects
  usage_examples        TEXT NOT NULL DEFAULT '[]', -- JSON array of entry-level examples
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_headword ON entries(headword);
CREATE INDEX IF NOT EXISTS idx_entries_pos ON entries(pos);
CREATE INDEX IF NOT EXISTS idx_entries_gender ON entries(gender);

-- ─── Tags ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  category      TEXT, -- e.g. 'Register', 'Status', 'Dialect'
  description   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id        TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);

-- ─── Relationships ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entry_relationships (
  id                TEXT PRIMARY KEY,
  entry_id          TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  target_entry_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK(relationship_type IN ('synonym', 'antonym', 'related')),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(entry_id, target_entry_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_relationships_entry ON entry_relationships(entry_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON entry_relationships(target_entry_id);

-- ─── Alternative Forms ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alternative_forms (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  headword      TEXT NOT NULL,
  type          TEXT, -- e.g. 'orthographic', 'dialectal', 'archaic'
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_alt_forms_entry ON alternative_forms(entry_id);

-- ─── Verb Morphology ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verb_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  form                  TEXT,  -- I, II, III ...
  class                 TEXT,  -- strong, weak, loan, etc.
  weak_class            TEXT,  -- defective, hollow, assimilative
  transitivity          TEXT,  -- transitive, intransitive, both
  perfective_3sgm       TEXT,
  imperfective_3sgm     TEXT,
  verbal_noun           TEXT,
  active_participle     TEXT,
  passive_participle    TEXT,
  vowel_set_perf        TEXT,
  vowel_set_impf        TEXT,
  vowel_set_impv        TEXT,
  type                  TEXT,  -- root, loan, derived, etc.
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_verb_morphology_type ON verb_morphology(type);

-- ─── Noun Morphology ──────────────────────────────────────────────────────
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
  is_inflectable_plural  BOOLEAN NOT NULL DEFAULT false,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Adjective Morphology ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS adj_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  masculine_form        TEXT,
  feminine_form         TEXT,
  plural_form           TEXT,
  elative_form          TEXT,
  elative_pattern       TEXT,
  pattern               TEXT,
  gender                TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Participle Morphology ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participle_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  type                  TEXT,
  gender                TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Numeral Morphology ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS numeral_morphology (
  entry_id              TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  numeral_type          TEXT,
  form_attributive_short TEXT,
  form_attributive_long TEXT,
  feminine_form         TEXT,
  masculine_form        TEXT,
  ordinal_form          TEXT,
  adverbial_form        TEXT,
  fractional_form       TEXT,
  multiplier_form       TEXT,
  distributive_form     TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─── Full-Text Search ──────────────────────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  headword,
  content='entries',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword);
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword);
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword);
  INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword);
END;

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
  is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
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
  publisher          TEXT,
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

-- Etymology data is now stored on the `entries` table in `etymology_chain` and `etymology_notes`.

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
  is_lifetime               BOOLEAN NOT NULL DEFAULT false
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
  is_active             BOOLEAN NOT NULL DEFAULT false,
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
