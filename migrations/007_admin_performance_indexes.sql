-- Migration: 007_admin_performance_indexes.sql
-- Creates performance indexes to optimize admin table list queries, entry detail lookups,
-- search queries, stem queries, and prevent full table scans across all tables.

CREATE INDEX IF NOT EXISTS idx_entries_root
ON entries(root_consonants);

CREATE INDEX IF NOT EXISTS idx_entries_created_at
ON entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_source_created
ON entries(source_language, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_stem
ON entries(stem);

CREATE INDEX IF NOT EXISTS idx_phonetics_entry
ON phonetics(entry_id);

CREATE INDEX IF NOT EXISTS idx_phonetics_entry_dialect
ON phonetics(entry_id, dialect);

CREATE INDEX IF NOT EXISTS idx_alt_forms_entry
ON alternative_forms(entry_id);

CREATE INDEX IF NOT EXISTS idx_diminutives_entry
ON entry_diminutives(entry_id);

CREATE INDEX IF NOT EXISTS idx_audio_entry
ON audio_files(entry_id);

CREATE INDEX IF NOT EXISTS idx_relationships_entry
ON entry_relationships(entry_id);

CREATE INDEX IF NOT EXISTS idx_relationships_target
ON entry_relationships(target_entry_id);

CREATE INDEX IF NOT EXISTS idx_relationships_entry_type
ON entry_relationships(entry_id, relationship_type);

CREATE INDEX IF NOT EXISTS idx_entry_tags_entry
ON entry_tags(entry_id);

CREATE INDEX IF NOT EXISTS idx_entry_tags_entry_tag
ON entry_tags(entry_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_roots_consonants
ON roots(consonants);
