-- Migration: Merge definitions into entries
-- Date: 2026-04-29
-- Canonical senses now live on `entries.definitions` and entry-level usage examples
-- live on `entries.usage_examples`.

ALTER TABLE entries ADD COLUMN definitions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE entries ADD COLUMN usage_examples TEXT NOT NULL DEFAULT '[]';

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  headword,
  content='entries',
  content_rowid='rowid'
);

WITH ordered_definitions AS (
  SELECT
    d.id,
    d.entry_id,
    d.subentry_id,
    d.sense_number,
    d.text_mt,
    d.text_en,
    d.register,
    d.nuance,
    d.field,
    d.sort_order
  FROM definitions d
  ORDER BY d.entry_id, COALESCE(d.sort_order, 0), COALESCE(d.sense_number, 1), d.id
),
definition_examples AS (
  SELECT
    x.definition_id,
    json_group_array(json_object(
      'id', x.id,
      'maltese', x.maltese,
      'english', x.english,
      'source', x.source,
      'sort_order', x.ord
    )) AS example_sentences
  FROM (
    SELECT
      ex.id,
      ex.definition_id,
      ex.maltese,
      ex.english,
      ex.source,
      ROW_NUMBER() OVER (PARTITION BY ex.definition_id ORDER BY ex.id) - 1 AS ord
    FROM example_sentences ex
    WHERE ex.definition_id IS NOT NULL
  ) x
  GROUP BY x.definition_id
),
entry_definitions AS (
  SELECT
    d.entry_id,
    json_group_array(json_object(
      'id', d.id,
      'entry_id', d.entry_id,
      'subentry_id', d.subentry_id,
      'sense_number', d.sense_number,
      'text_mt', d.text_mt,
      'text_en', d.text_en,
      'register', d.register,
      'nuance', d.nuance,
      'field', d.field,
      'sort_order', d.sort_order,
      'example_sentences', json(COALESCE(de.example_sentences, '[]'))
    )) AS definitions_json
  FROM ordered_definitions d
  LEFT JOIN definition_examples de ON de.definition_id = d.id
  GROUP BY d.entry_id
),
entry_usage_examples AS (
  SELECT
    x.entry_id,
    json_group_array(json_object(
      'id', x.id,
      'maltese', x.maltese,
      'english', x.english,
      'source', x.source,
      'sort_order', x.ord,
      'definition_id', x.definition_id
    )) AS usage_examples_json
  FROM (
    SELECT
      ex.id,
      ex.entry_id,
      ex.definition_id,
      ex.maltese,
      ex.english,
      ex.source,
      ROW_NUMBER() OVER (PARTITION BY ex.entry_id ORDER BY ex.id) - 1 AS ord
    FROM example_sentences ex
    LEFT JOIN definitions d ON d.id = ex.definition_id
    WHERE ex.definition_id IS NULL OR d.id IS NULL
  ) x
  GROUP BY x.entry_id
)
UPDATE entries
SET definitions = COALESCE(
      (SELECT definitions_json FROM entry_definitions WHERE entry_definitions.entry_id = entries.id),
      '[]'
    ),
    usage_examples = COALESCE(
      (SELECT usage_examples_json FROM entry_usage_examples WHERE entry_usage_examples.entry_id = entries.id),
      '[]'
    );

INSERT INTO entries_fts(entries_fts) VALUES('rebuild');

DROP TABLE IF EXISTS example_sentences;
DROP TABLE IF EXISTS definitions;
