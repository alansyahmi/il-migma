-- Migration: 005_performance_indexes.sql
-- Create performance indexes for common query filtering patterns

CREATE INDEX IF NOT EXISTS idx_entries_created_at
ON entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_status_created
ON entries(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_source_created
ON entries(source_language, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_relationships_entry_type
ON entry_relationships(entry_id, relationship_type);

CREATE INDEX IF NOT EXISTS idx_audio_entry
ON audio_files(entry_id);

CREATE INDEX IF NOT EXISTS idx_phonetics_entry_dialect
ON phonetics(entry_id, dialect);

CREATE INDEX IF NOT EXISTS idx_diminutives_entry
ON entry_diminutives(entry_id);
