-- Migration: 006_app_stats.sql
-- Creates the app_stats table to cache precomputed aggregate counts
-- and ensures indexes for fast ordered queries without full-table scans.

CREATE TABLE IF NOT EXISTS app_stats (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at
ON entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_source_created
ON entries(source_language, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_root
ON entries(root_consonants);

CREATE INDEX IF NOT EXISTS idx_roots_consonants
ON roots(consonants);

CREATE INDEX IF NOT EXISTS idx_entries_stem
ON entries(stem);

-- Seed initial home_summary stats if entries exists
INSERT OR REPLACE INTO app_stats (key, value, updated_at)
SELECT 
    'home_summary',
    json_object(
        'total', COUNT(*),
        'semitic', COUNT(CASE WHEN source_language IS NULL OR source_language IN ('Arabic', 'Berber') THEN 1 END),
        'romance', COUNT(CASE WHEN source_language IN ('Sicilian', 'Italian', 'Latin', 'French', 'Spanish') THEN 1 END)
    ),
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
FROM entries;
