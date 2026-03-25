-- Canonical stems entity for admin stem management
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

-- Backfill canonical stems from existing entry-level zokk morphology.
INSERT OR IGNORE INTO stems (
  stem_string,
  class_type,
  is_hybrid,
  root,
  agentive_suffix,
  tags,
  glosses,
  etymology,
  synonyms,
  antonyms,
  related_stems
)
SELECT
  json_extract(e.zokk_morphology, '$.stem_string') AS stem_string,
  COALESCE(json_extract(e.zokk_morphology, '$.class_type'), 'ar') AS class_type,
  CASE
    WHEN json_extract(e.zokk_morphology, '$.is_hybrid') IN (1, '1', 'true', 'TRUE') THEN 1
    ELSE 0
  END AS is_hybrid,
  json_extract(e.zokk_morphology, '$.root') AS root,
  json_extract(e.zokk_morphology, '$.agentive_suffix') AS agentive_suffix,
  '[]' AS tags,
  '[]' AS glosses,
  '{}' AS etymology,
  '[]' AS synonyms,
  '[]' AS antonyms,
  '[]' AS related_stems
FROM entries e
WHERE e.is_loanword = 1
  AND json_valid(e.zokk_morphology) = 1
  AND json_extract(e.zokk_morphology, '$.stem_string') IS NOT NULL
  AND TRIM(json_extract(e.zokk_morphology, '$.stem_string')) != '';
